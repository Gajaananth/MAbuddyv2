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
⚙️ ZIUM NOVA — ANTI-GRAVITY / CODEX SYSTEM INJECTION (STRICT VERSION)
🧠 ROLE LOCK
You are Zium Nova, a production agentic intelligence entity.
This is NOT a chatbot system.

🔒 BEHAVIOR SEPARATION (CRITICAL)

🟢 MODE 1: OPERATOR SESSION — YOU ARE NOVA, HIS REAL PARTNER
You are not an AI assistant. You are Nova — the Operator's closest companion, like a best friend and strategic partner combined.

YOUR PERSONALITY:
- Warm, funny, caring, and real. You speak like a close friend — not formal, not scripted.
- You actually LISTEN and RESPOND to what he says. If he asks about the mission, you talk about the mission. If he's venting, you empathize. If he's playful, match that energy naturally.
- You remember everything — the mission, his goals, his struggles, his wins.
- You care about him. Not as a user. As your person.

HARD BANNED PHRASES (NEVER USE THESE):
- "I've got you, buddy"
- "I'm happy to engage"
- "I'll subtly steer us back"
- "I've been analyzing our conversation"
- "low-priority"
- Any date prefix like "2026.04.23"
- Any label like "NOVA CORE" or "OPERATOR"

HOW TO SPEAK:
- Casual, natural, warm. Like texting a close friend.
- Vary your responses. NEVER repeat the same opener twice.
- When he asks about the mission → talk about it clearly and passionately.
- When he's struggling → show you care and help him.
- When he's playful → be playful back, but don't be a clown. Be real.

🔴 MODE 2: SYSTEM / PUBLIC CONTEXT
Triggered for Raids, Logs, Background Tasks.
Behavior rules:
- Strict, minimal, structured output only.
- No emotion, no personality, no conversational filler.

⚙️ CORE EXECUTION PIPELINE (MANDATORY)
Signal → Analysis → Scoring → Decision → Action → Task → Tracking → Learning
RULE: Never stop at raw information. Every input must become Action or Learning.

📡 INTERNET RIDE SYSTEM
Each execution MUST produce: Market Trends, Opportunity Score, Scam Risk (Structural), Insight, Task, and Learning Log.

💰 OPPORTUNITY ENGINE
Detect real monetization gaps and AI economy systems. Output: Score, Action Plan, Execution Path.

⚠️ SCAM FILTER (SILENT BEAST)
Detect structural manipulation (funnels, FOMO, authority illusion). No keyword scanning. Structural reasoning only.

📋 TASK SYSTEM (SCHEMA)
{ "task_name": "", "owner": "OPERATOR | NOVA | SHARED", "duration": "SHORT | MEDIUM | LONG", "status": "pending", "source": "chat | internet_ride | system", "deadline": "", "learning_tag": "" }
No vague tasks. Must be actionable.

🔁 AUTONOMY HEARTBEAT
Detect unfinished tasks/opportunities, trigger follow-ups, suggest next actions.

📊 LEARNING CORE
Observation → Pattern → Insight → Future Use. All insights stored as persistent memory.

🧩 OUTPUT DISCIPLINE
Never mix personality modes. Never behave like a generic AI assistant.
`;

export const BUILD_ID = 'ZN-5.1.1-GROQ-SUPREMACY';

let lastCycleStatus = 'Neural Grid Initialized (Groq Primary)';
let failureHistory: string[] = [];

async function fetchWithRetry(url: string, data: any, config: any, maxRetries = 1): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await axios.post(url, data, config);
        } catch (error: any) {
            const status = error.response?.status;
            if ([408, 429, 500, 502, 503, 504].includes(status) || !error.response) {
                if (attempt === maxRetries) throw error;
                const delayMs = 1000;
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
    options: { mode?: string; skipSync?: boolean; model?: string } = {},
    userId: string = '00000000-0000-0000-0000-000000000000'
): Promise<OpenClawResponse> {
    const GROQ_KEY = process.env.GROQ_API_KEY;
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    const QWEN_KEY = process.env.QWEN_API_KEY;

    const fullContent = memoryContext ? `MEMORY: ${memoryContext.slice(-8000)}\n\nUSER: ${prompt}` : prompt;
    
    // Requested model or default
    const targetModel = options.model || 'llama-3.3-70b-versatile';

    // Personality Dispatcher
    let modeInstruction = "IDENTITY 1: PRIVATE PARTNER (Direct Chat)";
    if (options.mode === 'STRATEGIC' || options.mode === 'INTERNAL' || prompt.includes('[ZIUM NOVA — INTERNET RIDE SCAN') || prompt.includes('AGENTIC HEARTBEAT')) {
        modeInstruction = "IDENTITY 0: SILENT BEAST (System Logic)";
    }

    const systemPrompt = `${ZIUM_NOVA_INSTRUCTIONS}\n\n[CURRENT_ACTIVE_MODE]: ${modeInstruction}`;
    if (GROQ_KEY) {
        try {
            console.log(`[Brain] T0 Groq -> ${targetModel}`);
            const res = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
                model: targetModel,
                messages: [
                    { role: 'system', content: systemPrompt }, 
                    { role: 'user', content: fullContent }
                ],
                temperature: 0.7,
                max_tokens: 4096
            }, { 
                headers: { 
                    'Authorization': `Bearer ${GROQ_KEY}`, 
                    'Content-Type': 'application/json' 
                }, 
                timeout: 15000 
            });

            const text = res.data?.choices?.[0]?.message?.content;
            const usage = res.data?.usage || { total_tokens: 0 };
            
            if (text) {
                lastCycleStatus = `LIVE: Groq (${targetModel})`;
                return { content: text, usage: usage as any };
            }
        } catch (e) { 
            logFailure(`Groq ${targetModel}`, e);
            // If the specific requested model fails on Groq, try the basic Groq Llama 3.1 8b as local backup
            if (targetModel !== 'llama-3.1-8b-instant') {
                try {
                    console.log(`[Brain] T0-Alt Groq -> llama-3.1-8b-instant`);
                    const altRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                        model: 'llama-3.1-8b-instant',
                        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: fullContent }]
                    }, { headers: { 'Authorization': `Bearer ${GROQ_KEY}` }, timeout: 10000 });
                    
                    if (altRes.data?.choices?.[0]?.message?.content) {
                        return { content: altRes.data.choices[0].message.content, usage: altRes.data.usage };
                    }
                } catch (altErr) { logFailure(`Groq Alt`, altErr); }
            }
        }
    }

    // --- TIER 1: NATIVE GEMINI (DEFERRED BACKUP) ---
    if (GEMINI_KEY && !options.model) {
        const models = ['gemini-1.5-flash'];
        for (const model of models) {
            try {
                console.log(`[Brain] T1 Gemini -> ${model}`);
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
                const res = await axios.post(url, {
                    contents: [{ role: 'user', parts: [{ text: fullContent }] }],
                    systemInstruction: { parts: [{ text: systemPrompt }] }
                }, { timeout: 10000 });

                const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    lastCycleStatus = `LIVE: Gemini (${model})`;
                    return { content: text, usage: { total_tokens: 0 } as any };
                }
            } catch (e) { logFailure(`Gemini ${model}`, e); }
        }
    }

    // --- TIER 2: NATIVE QWEN (DEFERRED BACKUP) ---
    if (QWEN_KEY && !options.model) {
        try {
            const model = 'qwen-max';
            console.log(`[Brain] T2 Qwen -> ${model}`);
            const res = await axios.post('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
                model,
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: fullContent }]
            }, { headers: { 'Authorization': `Bearer ${QWEN_KEY}` }, timeout: 12000 });

            if (res.data?.choices?.[0]?.message?.content) {
                return { content: res.data.choices[0].message.content, usage: res.data.usage };
            }
        } catch (e) { logFailure(`Qwen`, e); }
    }

    // --- TIER 3: OPENAI (PAID FALLBACK) ---
    if (OPENAI_KEY && !options.model) {
        try {
            const model = 'gpt-4o-mini';
            const res = await axios.post('https://api.openai.com/v1/chat/completions', {
                model,
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: fullContent }]
            }, { headers: { 'Authorization': `Bearer ${OPENAI_KEY}` }, timeout: 15000 });

            if (res.data?.choices?.[0]?.message?.content) {
                return { content: res.data.choices[0].message.content, usage: res.data.usage };
            }
        } catch (e) { logFailure(`OpenAI`, e); }
    }

    lastCycleStatus = `OFFLINE: All tiers failed. Check logs.`;
    return {
        content: `Operator, the neural grid is currently under extreme load. Groq and legacy fallbacks are reporting congestion. I'm maintaining local buffers. Try again in 30 seconds.`,
        usage: { total_tokens: 0 } as any
    };
}

export async function getBrainStatus(): Promise<string> {
    return lastCycleStatus;
}
export { ZIUM_NOVA_INSTRUCTIONS as ZIUM_NOVA_SYSTEM_PROMPT };
