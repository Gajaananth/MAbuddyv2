import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testBrain() {
    console.log('--- Karuppu NEURAL GRID DIAGNOSTICS ---');
    
    const keys = {
        GROQ: process.env.GROQ_API_KEY,
        GEMINI: process.env.GEMINI_API_KEY,
        QWEN: process.env.QWEN_API_KEY,
        OPENAI: process.env.OPENAI_API_KEY
    };

    for (const [name, key] of Object.entries(keys)) {
        console.log(`[ENV] ${name}_API_KEY: ${key ? 'PRESENT (Len: ' + key.length + ')' : 'MISSING'}`);
    }

    // 1. Test Groq (T0)
    if (keys.GROQ) {
        console.log('\n[AI] Testing Tier 0 (Groq - Llama 3.3 70B)...');
        try {
            const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: 'Respond with "GROQ_ONLINE"' }]
            }, { 
                headers: { 'Authorization': `Bearer ${keys.GROQ}` },
                timeout: 10000 
            });
            console.log(`[AI] Groq Response: ${res.data?.choices?.[0]?.message?.content || 'EMPTY'}`);
        } catch (err: any) {
            console.error(`[AI] Groq FAILURE: ${err.response?.data?.error?.message || err.message}`);
        }
    }

    // 2. Test Gemini (T1)
    if (keys.GEMINI) {
        console.log('\n[AI] Testing Tier 1 (Gemini 1.5 Flash)...');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keys.GEMINI}`;
        try {
            const res = await axios.post(url, {
                contents: [{ parts: [{ text: 'Respond with "GEMINI_ONLINE"' }] }]
            }, { timeout: 10000 });
            console.log(`[AI] Gemini Response: ${res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'EMPTY'}`);
        } catch (err: any) {
            console.error(`[AI] Gemini FAILURE: ${err.response?.data?.error?.message || err.message}`);
        }
    }

    // 3. Test Qwen (T2)
    if (keys.QWEN) {
        console.log('\n[AI] Testing Tier 2 (Qwen Max)...');
        try {
            const res = await axios.post('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
                model: 'qwen-max',
                messages: [{ role: 'user', content: 'Respond with "QWEN_ONLINE"' }]
            }, { 
                headers: { 'Authorization': `Bearer ${keys.QWEN}` },
                timeout: 10000 
            });
            console.log(`[AI] Qwen Response: ${res.data?.choices?.[0]?.message?.content || 'EMPTY'}`);
        } catch (err: any) {
            console.error(`[AI] Qwen FAILURE: ${err.response?.data?.error?.message || err.message}`);
        }
    }

    console.log('\n--- DIAGNOSTICS COMPLETE ---');
}

testBrain().catch(console.error);
