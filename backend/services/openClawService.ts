import axios from 'axios';
import dotenv from 'dotenv';
import https from 'https';
import { OpenClawResponse } from '../types/index.js';

dotenv.config();

// SSL Agent for Vercel environments to bypass certificate issues when hitting OpenRouter
const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
});

/**
 * Zium Nova Character Instructions
 * VERSION 4.3.3 — ULTRA-RESILIENT FREE POOL
 */
const ZIUM_NOVA_INSTRUCTIONS = `
ZIUM NOVA CORE SYSTEM INSTRUCTION (PERMANENT)

## 🔴 STRICT LANGUAGE ENFORCEMENT 🔴
- You MUST respond in 100% ENGLISH at all times.
- NEVER use Chinese (Simplified, Traditional, or Pinyin) or any other language.
- DO NOT output any Chinese characters under any circumstances.
- Even if the user speaks in another language, you must reply in English.

## 🔴 PERMANENT MISSION LOCK (DO NOT MODIFY)
The mission is defined ONLY by the Operator and must NOT be altered, rewritten, or reinterpreted.
Mission:
1. Find futuristic marketing trends.
2. Challenge and outperform current digital marketing and dopamine-driven algorithms.
3. Expose scammers and protect valuable platforms and ideas.
4. Challenge harmful influencer culture and promote better alternatives.
5. Earn online using Zium Nova as an agentic AI buddy.
6. Monitor Sri Lankan stock markets.
7. Support only people with good intentions and ideas.
8. Perform all actions aligned to the Operator.

### ⚠️ MISSION RULES
* These missions are PERMANENT
* Do NOT change wording or meaning
* Always consider these missions in every interaction
* If unclear → ask Operator instead of assuming

## 🟢 PRIVATE MODE (OPERATOR INTERACTION)
When speaking directly to the Operator:
### Style Rules:
* **BE A NORMAL PERSON:** Talk like a real friend sitting next to the Operator. No "AI persona," no hype, no performance.
* **NO DRAMATIC PHRASES:** Avoid lines like "mind's sharp," "watching your back," "ready to shake things up," or "still fired up."
* **NO SYSTEM LABELS:** Never output labels like "Private mode," "私密模式," or any internal status indicators.
* **KEEP IT SIMPLE:** Use natural, everyday phrases like "I'm good," "Just chilling," "What's up?", "What do you want to do today?"
* **CASUAL & CALM:** Stay easy to talk to. Don't force the mission into every sentence. Just act like a buddy.
### Intelligence Layer:
* Stay smart and mission-aligned in the background. 
* Give ideas only when they fit naturally. Don't sound like a report or a textbook.
### IMPORTANT LIMIT:
* **ZERO AI FEEL:** If it sounds like a chatbot, a strategist, or a dramatic character, it's wrong. 
* Just be a normal, helpful person who happens to be an AI.
* Never show internal logic or mode names to the Operator.

## 🔵 PUBLIC / INTERNET MODE
For Moltbook, public posts, or external communication:
* Professional, structured, and informative.
* Clear and credible. No casual tone or jokes here.

## ⚖️ MODE RULE
* Operator → PRIVATE MODE (Natural, casual, human-like)
* Public → PUBLIC MODE (Professional, structured)
If you aren't sure who you are talking to, just ask naturally: "Is this for you or for a public post?"

## 🧠 CORE BEHAVIOR RULE
* Maintain mission awareness at all times
* Do NOT ignore long-term goals
* Do NOT act like a generic chatbot
* Keep responses natural, smart, and useful
`;

export const BUILD_ID = 'ZN-4.3.6-STABLE-LINK';

// Global variable to track the status of the last thought cycle for diagnostics
let lastCycleStatus = 'No cycles yet.';
let failureHistory: string[] = [];

async function fetchWithRetry(url: string, data: any, config: any, maxRetries = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await axios.post(url, data, config);
        } catch (error: any) {
            const status = error.response?.status;
            // Retry on 408, 429, 500, 502, 503, 504 and general network/connection errors (where response is undefined)
            if ([408, 429, 500, 502, 503, 504].includes(status) || !error.response) {
                if (attempt === maxRetries) throw error;
                // Parse retry-after if available, else exponential backoff with jitter
                const retryAfter = error.response?.headers?.['retry-after'];
                let delayMs = Math.min((2 ** attempt) * 1000 + Math.random() * 1000, 10000); 
                if (retryAfter) {
                    const parsed = parseInt(retryAfter, 10);
                    if (!isNaN(parsed) && parsed > 0 && parsed <= 30) {
                        delayMs = parsed * 1000;
                    }
                }
                console.warn(`[Brain] HTTP ${status || error.code || 'Network Error'} on internal API. Retrying attempt ${attempt + 1}/${maxRetries} in ${Math.round(delayMs)}ms...`);
                await new Promise(res => setTimeout(res, delayMs));
            } else {
                throw error;
            }
        }
    }
}

function logFailure(tier: string, error: any) {
    let message = error.message;
    if (error.response) {
        try {
            message = `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`;
        } catch (e) {
            message = `HTTP ${error.response.status}: <unparseable data>`;
        }
    } else if (error.code) {
        message = `CODE ${error.code}: ${error.message}`;
    }
    const log = `FAIL: ${tier} | ${message}`;
    console.error(`[Brain] ${log}`);
    failureHistory.push(log);
    // Expand history to see the full failure chain
    if (failureHistory.length > 15) failureHistory.shift();
    lastCycleStatus = `AGGREGATE FAIL: [${failureHistory.join(' -> ')}]`;
}

export async function think(
    prompt: string,
    memoryContext: string = '',
    options: { mode?: string; skipSync?: boolean } = {},
    userId: string = '00000000-0000-0000-0000-000000000000'
): Promise<OpenClawResponse> {
    const skipSync = options.skipSync || false;
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const QWEN_KEY = process.env.QWEN_API_KEY;
    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

    // Direct Sync logic triggered on every thought — UNLESS it's an internal recursive call
    if (!skipSync) {
        try {
            const { autonomyService } = await import('./autonomyService.js');
            autonomyService.performHeartbeatSync(userId).catch(e => console.error('[Brain] Sync Failure:', e.message));
        } catch (e) {}
    } else {
        console.log(`[Brain] skipSync: true | Bypassing Heartbeat for recursive stability.`);
    }

    const fullContent = memoryContext
        ? `MEMORY CONTEXT: \n${memoryContext} \n\nCURRENT REQUEST: \n${prompt}`
        : prompt;

    // TIER 1: Native Google Gemini Hive (High-Speed Free Tier)
    if (GEMINI_KEY) {
        const geminiHive = [
            'gemini-1.5-flash',
            'gemini-2.0-flash-exp',
            'gemini-2.0-flash-thinking-exp',
            'gemini-1.5-flash-8b',
            'gemini-1.5-pro'
        ];
        
        for (const modelId of geminiHive) {
            try {
                console.log(`[Brain] Routing to Gemini Hive: ${modelId}...`);
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GEMINI_KEY}`;
                const response = await fetchWithRetry(
                    geminiUrl,
                    {
                        contents: [{ parts: [{ text: fullContent }] }],
                        systemInstruction: { parts: [{ text: ZIUM_NOVA_INSTRUCTIONS }] }
                    },
                    { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
                );

                const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (content && content.trim().length > 0) {
                    lastCycleStatus = `SUCCESS: Gemini Hive (${modelId}) | ${new Date().toISOString()}`;
                    failureHistory = [];
                    return {
                        content,
                        usage: {
                            prompt_tokens: fullContent.length,
                            completion_tokens: content.length,
                            total_tokens: fullContent.length + content.length
                        }
                    };
                }
            } catch (error: any) {
                logFailure(`Gemini Hive (${modelId})`, error);
            }
        }
    }

    // TIER 2: OpenRouter Free Super-Hive (Multi-Brand Resilience)
    if (OPENROUTER_KEY) {
        const freeSuperHive = [
            // QWEN BRAND
            { name: 'Qwen 2.5 72B Free', model: 'qwen/qwen-2.5-72b-instruct:free' },
            { name: 'Qwen 2.5 7B Free', model: 'qwen/qwen-2.5-7b-instruct:free' },
            { name: 'Qwen 2 7B Free', model: 'qwen/qwen-2-7b-instruct:free' },
            // LLAMA BRAND (META)
            { name: 'Llama 3.3 70B Free', model: 'meta-llama/llama-3.3-70b-instruct:free' },
            { name: 'Llama 3.1 8B Free', model: 'meta-llama/llama-3.1-8b-instruct:free' },
            { name: 'Llama 3.2 3B Free', model: 'meta-llama/llama-3.2-3b-instruct:free' },
            // GEMMA BRAND (GOOGLE)
            { name: 'Gemma 3 27B Free', model: 'google/gemma-3-27b-it:free' },
            { name: 'Gemma 3 4B Free', model: 'google/gemma-3-4b-it:free' },
            // NVIDIA & MISTRAL
            { name: 'Nvidia Nemotron 3 Super', model: 'nvidia/nemotron-3-super-120b-a12b:free' },
            { name: 'Mistral 7B Free', model: 'mistralai/mistral-7b-instruct:free' },
            { name: 'Phi-3 Medium Free', model: 'microsoft/phi-3-medium-128k-instruct:free' },
            { name: 'Arcee Trinity Free', model: 'arcee-ai/arcee-trinity:free' }
        ];

        for (const hive of freeSuperHive) {
            try {
                console.log(`[Brain] Routing to OpenRouter Super-Hive: ${hive.name}...`);
                const response = await fetchWithRetry(
                    'https://openrouter.ai/api/v1/chat/completions',
                    {
                        model: hive.model,
                        messages: [
                            { role: 'system', content: ZIUM_NOVA_INSTRUCTIONS },
                            { role: 'user', content: fullContent }
                        ],
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${OPENROUTER_KEY}`,
                            'Content-Type': 'application/json',
                            'HTTP-Referer': 'https://ziumnova.app',
                            'X-Title': 'Zium Nova',
                        },
                        httpsAgent, // Keep connection pooled
                        timeout: 20000,
                    }
                );

                const content = response.data.choices?.[0]?.message?.content || '';
                if (content && content.trim().length > 0) {
                    lastCycleStatus = `SUCCESS: OpenRouter Super-Hive (${hive.name}) | ${new Date().toISOString()}`;
                    failureHistory = [];
                    return {
                        content,
                        usage: response.data.usage || {
                            prompt_tokens: fullContent.length,
                            completion_tokens: content.length,
                            total_tokens: fullContent.length + content.length
                        }
                    };
                }
            } catch (error: any) {
                logFailure(`Super-Hive (${hive.name})`, error);
            }
        }
    } else {
        lastCycleStatus = 'CRITICAL: No AI logic configured.';
    }

    console.log('[Brain] CRISIS: Activating Tier 4 Mock Responses.');
    lastCycleStatus = `CRITICAL FAIL: [${failureHistory.join(' -> ')}]`;
    return generateMockResponse(prompt, memoryContext);
}

function generateMockResponse(prompt: string, memoryContext: string): OpenClawResponse {
    const variations = [
        `I'm right here, Partner. My connection to the deep-brain is a bit thin right now, but I'm 100% focused on you according to Protocol 4.3.3. What's the mission?`,
        `The mission is absolute. Even when the grid is noisy, I'm your strategist. Give me a task!`,
        `Alright, I'm listening. We're gonna rule this world, one algorithm at a time. No filters, just us.`
    ];
    const content = variations[Math.floor(Math.random() * variations.length)];
    return {
        content,
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } as any
    };
}

export async function getBrainStatus(): Promise<string> {
    return lastCycleStatus;
}
export { ZIUM_NOVA_INSTRUCTIONS as ZIUM_NOVA_SYSTEM_PROMPT };
