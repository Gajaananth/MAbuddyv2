import axios from 'axios';
import dotenv from 'dotenv';
import https from 'https';

dotenv.config();

const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
});

async function testKeys() {
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
    const QWEN_KEY = process.env.QWEN_API_KEY;

    console.log(`--- KEY DIAGNOSTICS ---`);
    console.log(`GEMINI_KEY: ${GEMINI_KEY ? 'Present' : 'MISSING'}`);
    console.log(`OPENROUTER_KEY: ${OPENROUTER_KEY ? 'Present' : 'MISSING'}`);
    console.log(`QWEN_KEY: ${QWEN_KEY ? 'Present' : 'MISSING'}`);

    if (GEMINI_KEY) {
        console.log(`\nTesting Gemini (v1beta)...`);
        try {
            const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
                contents: [{ parts: [{ text: "hi" }] }]
            });
            console.log(`✅ Gemini v1beta: SUCCESS`);
        } catch (e: any) {
            console.log(`❌ Gemini v1beta: FAIL - ${e.response?.status} ${JSON.stringify(e.response?.data)}`);
            
            console.log(`Testing Gemini (v1)...`);
            try {
                const res = await axios.post(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
                    contents: [{ parts: [{ text: "hi" }] }]
                });
                console.log(`✅ Gemini v1: SUCCESS`);
            } catch (e2: any) {
                console.log(`❌ Gemini v1: FAIL - ${e2.response?.status} ${JSON.stringify(e2.response?.data)}`);
            }
        }
    }

    if (OPENROUTER_KEY) {
        console.log(`\nTesting OpenRouter...`);
        try {
            const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', 
                { model: 'meta-llama/llama-3.2-3b-instruct:free', messages: [{role:'user', content:'hi'}] },
                { headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' }, httpsAgent }
            );
            console.log(`✅ OpenRouter: SUCCESS`);
        } catch (e: any) {
            console.log(`❌ OpenRouter: FAIL - ${e.response?.status} ${JSON.stringify(e.response?.data)}`);
        }
    }

    if (QWEN_KEY) {
        console.log(`\nTesting Qwen...`);
        try {
            const res = await axios.post('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
                { model: 'qwen-turbo', input: { messages: [{role:'user', content:'hi'}] } },
                { headers: { 'Authorization': `Bearer ${QWEN_KEY}`, 'Content-Type': 'application/json' } }
            );
            console.log(`✅ Qwen: SUCCESS`);
        } catch (e: any) {
            console.log(`❌ Qwen: FAIL - ${e.response?.status} ${JSON.stringify(e.response?.data)}`);
        }
    }
}

testKeys();
