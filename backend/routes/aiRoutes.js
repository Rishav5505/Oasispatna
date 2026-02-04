const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const auth = require('../middleware/auth');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/chat', async (req, res) => {
    const { message, history } = req.body;

    if (!message) {
        return res.status(400).json({ message: 'Message is required' });
    }

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest"
        });

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
        let cleanHistory = [];
        if (history && history.length > 0) {
            // Filter out the initial greeting if it's the very first message and from model
            let startIndex = (history[0].role === 'model') ? 1 : 0;

            for (let i = startIndex; i < history.length; i++) {
                cleanHistory.push({
                    role: history[i].role === 'model' ? 'model' : 'user',
                    parts: [{ text: history[i].parts[0].text }]
                });
            }
        }

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
        console.error('Gemini AI Error:', err);
        // Return a more descriptive error for debugging
        res.status(500).json({
            message: 'AI Error: ' + (err.message || 'Brain Freeze'),
            details: err.status || 'unknown'
        });
    }
});

module.exports = router;
