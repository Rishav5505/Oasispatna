require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // There is no direct listModels in the SDK easily available like this without a different client,
        // but we can try common ones.
        const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];

        for (const m of models) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("test");
                console.log(`Model ${m} WORKS!`);
                return;
            } catch (e) {
                console.log(`Model ${m} FAILED: ${e.message}`);
                if (e.status) console.log(`Status: ${e.status}`);
            }
        }
    } catch (err) {
        console.error('Outer Error:', err);
    }
}

listModels();
