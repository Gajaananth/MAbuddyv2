import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.OPENROUTER_API_KEY;

async function test() {
    console.log("Testing OpenRouter Bridge...");
    console.log("Key Length:", API_KEY?.length || 0);
    
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'google/gemini-2.0-flash-lite-001',
                messages: [
                    { role: 'user', content: 'Say "BRIDGE ONLINE"' }
                ],
                max_tokens: 10,
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            }
        );

        console.log("Response Status:", response.status);
        console.log("Response Content:", response.data.choices?.[0]?.message?.content);
    } catch (e: any) {
        console.error("Bridge Test FAILED.");
        if (e.response) {
            console.error("Status:", e.response.status);
            console.error("Data:", JSON.stringify(e.response.data));
        } else {
            console.error("Message:", e.message);
        }
    }
}

test();
