require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testAI() {
    console.log('Using Key:', process.env.GEMINI_API_KEY);
    if (!process.env.GEMINI_API_KEY) return;

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello!");
        const response = await result.response;
        console.log('SUCCESS:', response.text());
    } catch (err) {
        console.log('--- ERROR START ---');
        console.error(err);
        console.log('--- ERROR END ---');
    }
}

testAI();
