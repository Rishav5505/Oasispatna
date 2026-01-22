require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // This is a hacky way to list models if it supports it, 
        // but easier just to try different names.
        // Let's try gemini-pro which is the most common.
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hi");
        console.log('gemini-pro works!');
    } catch (err) {
        console.log('gemini-pro failed:', err.message);
        try {
            const model2 = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
            const result2 = await model2.generateContent("Hi");
            console.log('gemini-1.0-pro works!');
        } catch (err2) {
            console.log('gemini-1.0-pro failed:', err2.message);
        }
    }
}

listModels();
