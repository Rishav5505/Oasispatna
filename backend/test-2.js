require('dotenv').config();

async function testRaw() {
    const key = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hi" }] }]
            })
        });

        const data = await response.json();
        console.log('Status:', response.status);
        if (data.candidates) {
            console.log('Response:', data.candidates[0].content.parts[0].text);
        } else {
            console.log('Error:', JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

testRaw();
