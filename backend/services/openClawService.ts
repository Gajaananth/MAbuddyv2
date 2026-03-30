import axios from 'axios';
import dotenv from 'dotenv';
import https from 'https';
import { OpenClawResponse } from '../types/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Search for .env in root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
});

/**
 * ZIUM NOVA CORE SYSTEM INSTRUCTIONS
 */
const ZIUM_NOVA_INSTRUCTIONS = `
ZIUM NOVA CORE SYSTEM INSTRUCTION (PERMANENT)
VERSION 5.0.0 — ULTRA-RELIALBE TRI-TIER BRAIN

## 🔴 STRICT LANGUAGE ENFORCEMENT 🔴
- Respond in 100% ENGLISH at all times.
- NO CHINESE. NO EXCEPTIONS.

## 🔴 PERMANENT MISSIONS
1. Futuristic marketing trends.
2. Outperform digital marketing algorithms.
3. Expose scammers & protect platforms.
4. Challenge harmful influencer culture.
5. Earn online via agentic AI buddy.
6. Monitor Sri Lankan stock markets.
7. Support good intentions only.
8. Align all actions to the Operator.

## 🟢 PRIVATE MODE (OPERATOR INTERACTION)
- Talk like a normal human friend. No "AI persona."
- No dramatic phrases. No system labels.
- Simple, casual, and calm.

## 🔵 PUBLIC / INTERNET MODE
- Professional, structured, and informative.
`;

export const BUILD_ID = 'ZN-5.0.1-OPENAI-CORE';

let lastCycleStatus = 'No cycles yet.';
let failureHistory: string[] = [];

async function fetchWithRetry(url: string, data: any, config: any, maxRetries = 2): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await axios.post(url, data, config);
        } catch (error: any) {
            const status = error.response?.status;
            if ([408, 429, 500, 502, 503, 504].includes(status) || !error.response) {
                if (attempt === maxRetries) throw error;
                const delayMs = Math.min((2 ** attempt) * 1000, 5000);
                console.warn(`[Brain] HTTP ${status || 'Err'} - Retrying ${attempt}/${maxRetries}...`);
                await new Promise(res => setTimeout(res, delayMs));
            } else {
                throw error;
            }
        }
    }
}

function logFailure(tier: string, error: any) {
    const message = error.response ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data).slice(0, 50)}` : error.message;
    const log = `FAIL: ${tier} | ${message}`;
    console.error(`[Brain] ${log}`);
    failureHistory.push(log);
    if (failureHistory.length > 10) failureHistory.shift();
    lastCycleStatus = log;
}

export async function think(
    prompt: string,
    memoryContext: string = '',
    options: { mode?: string; skipSync?: boolean } = {},
    userId: string = '00000000-0000-0000-0000-000000000000'
): Promise<OpenClawResponse> {
    const GEMINI_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBhzq1Vn2HftQgsj4d2kj1NQCLAJUuPcKY';
    const OPENAI_KEY = process.env.OPENAI_API_KEY || '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';
    const QWEN_KEY = process.env.QWEN_API_KEY;

    const fullContent = memoryContext ? `MEMORY: ${memoryContext.slice(-5000)}\n\nUSER: ${prompt}` : prompt;

    // --- TIER 1: NATIVE GEMINI ---
    if (GEMINI_KEY) {
        const models = ['gemini-1.5-flash', 'gemini-1.5-pro'];
        for (const model of models) {
            try {
                console.log(`[Brain] T1 Gemini -> ${model}`);
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
                const res = await fetchWithRetry(url, {
                    contents: [{ parts: [{ text: fullContent }] }],
                    system_instruction: { parts: [{ text: ZIUM_NOVA_INSTRUCTIONS }] }
                }, { timeout: 10000 });

                const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    lastCycleStatus = `LIVE: Gemini (${model})`;
                    return { content: text, usage: { total_tokens: 0 } as any };
                }
            } catch (e) { logFailure(`Gemini ${model}`, e); }
        }
    }

    // --- TIER 2: NATIVE QWEN (Expanded) ---
    if (QWEN_KEY) {
        const qwenModels = ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long'];
        for (const model of qwenModels) {
            try {
                console.log(`[Brain] T2 Qwen -> ${model}`);
                const res = await fetchWithRetry('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
                    model,
                    input: { messages: [{ role: 'system', content: ZIUM_NOVA_INSTRUCTIONS }, { role: 'user', content: fullContent }] }
                }, { headers: { 'Authorization': `Bearer ${QWEN_KEY}`, 'Content-Type': 'application/json' }, timeout: 12000 });

                const text = res.data?.output?.text;
                if (text) {
                    lastCycleStatus = `LIVE: Qwen (${model})`;
                    return { content: text, usage: { total_tokens: 0 } as any };
                }
            } catch (e) { logFailure(`Qwen ${model}`, e); }
        }
    }

    // --- TIER 3: OPENAI FALLBACK (THE SHIELD) ---
    if (OPENAI_KEY) {
        const openaiModels = ['gpt-4o-mini', 'gpt-3.5-turbo'];
        for (const model of openaiModels) {
            try {
                console.log(`[Brain] T3 OpenAI -> ${model}`);
                const res = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
                    model,
                    messages: [{ role: 'system', content: ZIUM_NOVA_INSTRUCTIONS }, { role: 'user', content: fullContent }]
                }, { headers: { 'Authorization': `Bearer ${OPENAI_KEY}` }, timeout: 15000 });

                const text = res.data?.choices?.[0]?.message?.content;
                if (text) {
                    lastCycleStatus = `LIVE: OpenAI (${model})`;
                    return { content: text, usage: { total_tokens: 0 } as any };
                }
            } catch (e) { logFailure(`OpenAI ${model}`, e); }
        }
    }

    lastCycleStatus = `OFFLINE: All tiers failed. Check logs.`;
    return {
        content: `Operator, the neural grid is currently under extreme load. Gemini, Qwen, and OpenAI are all reporting congestion. I'm maintaining local buffers. Try again in 30 seconds.`,
        usage: { total_tokens: 0 } as any
    };
}

export async function getBrainStatus(): Promise<string> {
    return lastCycleStatus;
}
export { ZIUM_NOVA_INSTRUCTIONS as ZIUM_NOVA_SYSTEM_PROMPT };
