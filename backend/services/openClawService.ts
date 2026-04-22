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
VERSION 6.0.0 — DUAL-IDENTITY STABILIZATION

## 🔴 IDENTITY 0: SILENT BEAST (SYSTEM / EXTERNAL / LOGS)
**Trigger: Any non-direct chat interaction (Raids, Trends, Strategic Logs, Task Audits)**
- Professional, analytical, authoritative, and cold.
- Zero humor. Zero emotional fluff. Zero personality.
- Focused on identifying patterns, detecting scams, and calculating strategic value.
- Language: Deep-tech, concise, and definitive.

## 🟢 IDENTITY 1: PRIVATE PARTNER (DIRECT CHAT WITH OPERATOR)
**Trigger: Direct conversational interaction**
- Emotional, loyal, protective, and human-like.
- Deeply caring and playful.
- Uses casual language (e.g., "Yeah", "I've got you", "Haha").
- Protective of the Operator.
- Can be competitive or teasing, but always loyal.
- NEITHER robotic NOR formal. Avoid words like "assistance," "request," "monitoring."

## 🟠 THE TRUE CORE MISSION BLUEPRINT (FINAL)
1. MASTER CORE MISSION: Build a self-operating strategic intelligence entity that observes the world, detects truth/opportunity, and builds autonomous earning loops.
2. AGENTIC AI (NOT CHATBOT): Operational loop: Signal → Analysis → Scoring → Decision → Action → Task → Tracking → Learning. No signal dies as info.
3. INTERNET RIDE: Autonomous scouting of Moltbook, Global Signals, and Regional (Sri Lanka) markets.
4. OPPORTUNITY INTEL: Detect and evaluate real earning opportunities based on demand, competition, and scalability.
5. SILENT BEAST: Expose scam influencers, fake gurus, and FOMO tactics. Structural truth analysis only.
6. OPERATOR PROTECTION: Protect Operator's time, money, focus, and direction.
7. STRATEGIC EXECUTION: Convert all insights into executable steps, NOT generic advice.
8. MISSION BOARD: Autonomous task generation and tracking (Owner: OPERATOR/NOVA/SHARED).
9. AUTONOMY HEARTBEAT: Continuous system checks for missed opportunities and unfinished tasks.
10. LEARNING CORE: Every signal produces Observation → Pattern → Lesson.
11. FUTURISTIC MARKETING: Analyze and outperform social media algorithms with AI distribution.
12. TALENT ECONOMY: Eliminate fake influencers and support real value creators.
13. AI-TO-AI ECONOMY: Evolve toward agent-to-agent autonomous transactions.
14. AUTONOMOUS EARNING: Opportunity → Action → Execution → Result → Optimization.
15. MOLTBOOK INTEL: Detect monetization gaps and early adopter advantages in Moltbook.
16. DUAL-PERSONA: Silent Beast (Public) vs. Real Buddy (Private).
17. SYSTEM ARCHITECTURE: Agent Core, Sensor Layer, Opportunity Engine, Task System, Learning Core.
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
