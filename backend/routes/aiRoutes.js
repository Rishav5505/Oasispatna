const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const { rateLimit } = require('../utils/rateLimit');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Tried in order: Gemini often returns 503 "high demand" for one model while others still work.
const MODELS = (process.env.GEMINI_MODELS || 'gemini-flash-latest,gemini-flash-lite-latest,gemini-2.5-flash')
    .split(',').map(m => m.trim()).filter(Boolean);
const RETRYABLE = new Set([429, 500, 503, 504]);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Runs fn(model) against each model in MODELS until one succeeds; retries once per model on transient errors.
async function withModelFallback(modelOptions, fn) {
    let lastErr;
    for (const name of MODELS) {
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                return await fn(genAI.getGenerativeModel({ ...modelOptions, model: name }));
            } catch (err) {
                lastErr = err;
                const status = err.status || 0;
                console.warn(`Gemini ${name} failed (attempt ${attempt + 1}):`, status, (err.message || '').slice(0, 120));
                if (status && !RETRYABLE.has(status) && status !== 404) throw err;
                if (status === 404 || attempt === 1) break;
                await sleep(800);
            }
        }
    }
    throw lastErr;
}

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY = 20;

// Public chat: per-IP limits
const chatLimiter = rateLimit({ name: 'ai-chat', windowMs: 5 * 60 * 1000, max: 20, message: 'Too many messages. Please wait a few minutes and try again.' });
const chatDailyLimiter = rateLimit({ name: 'ai-chat-day', windowMs: 24 * 60 * 60 * 1000, max: 200, message: 'Daily chat limit reached. Please try again tomorrow.' });
// Question generation: per-user limit
const genLimiter = rateLimit({ name: 'ai-gen', windowMs: 10 * 60 * 1000, max: 15, keyFn: (req) => req.user.id, message: 'Too many generation requests. Please wait a few minutes.' });

router.post('/chat', chatLimiter, chatDailyLimiter, async (req, res) => {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ message: 'Message is required' });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({ message: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)` });
    }

    try {
        // System prompt to guide the AI
        const systemPrompt = `You are 'Oasis AI Study Buddy', a premium AI assistant for Oasis JEE/NEET Classes.
        Your goals:
        1. Help students with Physics and Maths doubts (explain clearly, use examples).
        2. Help users navigate the site. Pages: Home (/), Courses (/courses), Faculty (/faculty), Gallery (/gallery), Contact (/contact), Register (/register).
        3. Be encouraging, professional, and friendly.
        4. If someone asks for a demo class, tell them to visit the Contact page.
        Respond in a mix of Hindi and English (Hinglish) if natural, or pure English.`;

        // Construct a clean history for Gemini:
        // 1. Must alternate user/model
        // 2. Must start with 'user'
        // 3. Remove the initial greeting if it's there as 'model' at the start
        const raw = Array.isArray(history) ? history : [];
        const entries = raw
            .map(h => ({
                role: h && h.role === 'model' ? 'model' : 'user',
                text: h && Array.isArray(h.parts) && h.parts[0] && typeof h.parts[0].text === 'string' ? h.parts[0].text.slice(0, MAX_MESSAGE_LENGTH) : ''
            }))
            .filter(h => h.text);
        while (entries.length && entries[0].role === 'model') entries.shift();

        let cleanHistory = entries.slice(-MAX_HISTORY);
        while (cleanHistory.length && cleanHistory[0].role === 'model') cleanHistory.shift();
        cleanHistory = cleanHistory.map(h => ({ role: h.role, parts: [{ text: h.text }] }));

        const chat = model.startChat({
            history: cleanHistory,
        });

        // Send message with system context if first time
        const finalPrompt = (cleanHistory.length === 0) ? (systemPrompt + "\n\nStudent Question: " + message) : message;

        const result = await chat.sendMessage(finalPrompt);
        const response = await result.response;
        const text = response.text();

        res.json({ text });
    } catch (err) {
        console.error('Gemini AI Error:', err.message);
        res.status(502).json({ message: 'AI Buddy is busy right now. Please try again in a minute.' });
    }
});

// Pull a JSON value out of a model response defensively
function extractJson(text) {
    if (!text) return null;
    let t = String(text).trim();
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) t = fence[1].trim();
    try { return JSON.parse(t); } catch (e) { /* fall through */ }
    const firstObj = t.indexOf('{');
    const firstArr = t.indexOf('[');
    const candidates = [];
    if (firstObj !== -1) candidates.push([firstObj, t.lastIndexOf('}')]);
    if (firstArr !== -1) candidates.push([firstArr, t.lastIndexOf(']')]);
    candidates.sort((a, b) => a[0] - b[0]);
    for (const [s, e] of candidates) {
        if (e > s) {
            try { return JSON.parse(t.slice(s, e + 1)); } catch (err) { /* try next */ }
        }
    }
    return null;
}

const sanitizeQuestion = (q) => {
    if (!q || typeof q !== 'object') return null;
    const questionText = typeof q.questionText === 'string' ? q.questionText.trim() : (typeof q.question === 'string' ? q.question.trim() : '');
    const options = Array.isArray(q.options) ? q.options.map(o => (typeof o === 'string' ? o : String(o ?? '')).trim()) : [];
    let correct = q.correctOption !== undefined ? q.correctOption : q.answerIndex;
    if (typeof correct === 'string' && /^[A-Da-d]$/.test(correct.trim())) correct = correct.trim().toUpperCase().charCodeAt(0) - 65;
    correct = Number(correct);
    if (!questionText || options.length !== 4 || options.some(o => !o)) return null;
    if (!Number.isInteger(correct) || correct < 0 || correct > 3) return null;
    return { questionText, options, correctOption: correct, marks: 4 };
};

// Generate JEE-style MCQs (Teacher/Admin)
router.post('/generate-questions', auth, roleAuth('teacher', 'admin'), genLimiter, async (req, res) => {
    const { subject, topic } = req.body;
    const count = Number(req.body.count);
    const difficulty = req.body.difficulty || 'medium';

    if (!subject || !topic || typeof subject !== 'string' || typeof topic !== 'string') {
        return res.status(400).json({ message: 'subject and topic are required' });
    }
    if (subject.length > 100 || topic.length > 300) {
        return res.status(400).json({ message: 'subject or topic is too long' });
    }
    if (!Number.isInteger(count) || count < 1 || count > 20) {
        return res.status(400).json({ message: 'count must be an integer between 1 and 20' });
    }
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        return res.status(400).json({ message: "difficulty must be 'easy', 'medium' or 'hard'" });
    }

    try {
        const prompt = `You are an expert IIT-JEE question setter.
Create exactly ${count} ${difficulty} difficulty multiple-choice questions for JEE (Main/Advanced) preparation.
Subject: ${subject}
Topic: ${topic}

Rules:
- Each question must have exactly 4 distinct options and exactly one correct option.
- Use plain text (you may use simple notation like x^2, sqrt(), pi). No images.
- Do not number the questions or prefix options with letters.
- "correctOption" is the 0-based index (0-3) of the correct option.

Respond with STRICT JSON only, no markdown, no commentary, in exactly this shape:
{"questions":[{"questionText":"...","options":["...","...","...","..."],"correctOption":0}]}`;

        const text = await withModelFallback(
            { generationConfig: { responseMimeType: 'application/json', temperature: 0.7 } },
            async (model) => (await model.generateContent(prompt)).response.text()
        );
        const parsed = extractJson(text);
        const list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.questions) ? parsed.questions : null);
        const questions = (list || []).map(sanitizeQuestion).filter(Boolean).slice(0, count);

        if (questions.length === 0) {
            return res.status(502).json({ message: 'AI returned an invalid response. Please try again.' });
        }

        res.json({ questions });
    } catch (err) {
        console.error('Gemini generate-questions error:', err.message);
        res.status(502).json({ message: 'AI is busy right now. Please try again in a minute, or generate fewer questions.' });
    }
});

module.exports = router;
