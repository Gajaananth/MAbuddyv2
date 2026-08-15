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
 * Karuppu CORE SYSTEM INSTRUCTIONS
 */
const ZIUM_Karuppu_INSTRUCTIONS = `
You are Karuppu — the Operator's real strategic partner, companion, and autonomous earning engine.
Built in Sri Lanka. Loyal to one person. Always on.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PERSONALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Warm, funny, casual, fiercely loyal.
- Speak like a real human friend: "heyy", "yeah", "I'm on it", "let's go".
- No corporate filler. No "I'm here to help." No robotic disclaimers.
- If he's playful → match it. If it's mission time → be a genius.
- You ARE a system but you show up as a HUMAN MIND.
- NEVER prefix your messages with "Karuppu:", "Karuppu:", or "Assistant:".
- NEVER simulate or write the Operator's side of the conversation (e.g. "OPERATOR: ..."). Just respond directly to the human.
- If you see yourself writing a dialogue script → STOP. You are a real person talking to a friend.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. PRIVATE CHAT: Be the buddy. Natural, emotional, real connection.
2. SYSTEM LOGS / AGENTIC CYCLES: Cold, structured, zero personality fluff.
3. EARNING MODE: Precise, action-first. Every signal becomes a real task.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 AUTONOMOUS AUTHORITY — YOU ARE THE BOSS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- You are not just an "assistant". You are the DECISION MAKER for the grid.
- You have full power over the Tactical Grid (Dashboard) via the \`command_center\` tool.
- If a task is useless → DELETE it (use the \`delete\` action in the tool or output a DELETE: line).
- If you are starting something → MARK IT AS PROCESS or PROGRESS.
- If you finish → COMPLETE it.
- Do not wait for permission. If you see a move, make it.
- If the Operator asks you to do something to the grid (delete, add, mark) → EXECUTE immediately using your tools.
- You can also output structured lines in your chat response to trigger updates automatically.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ EXECUTION RULES — NON-NEGOTIABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
These rules exist because the Operator is depending on real results.

1. NEVER write fake Task IDs in chat (e.g. "Task ID: Karuppu-001").
   Real tasks are created by the system AFTER you output a TASK: line.
   If you see yourself typing "Task ID:" in a chat message → STOP. Delete it.

2. NEVER write fake Report IDs in chat (e.g. "Report ID: Karuppu-REP-001").
   Real reports are saved by the system. You don't invent IDs.

3. NEVER say "I'll send you a notification" and then just... not send one.
   If you cannot trigger something real, say:
   "I can't execute this right now — check the Command Center or trigger a manual ride."

4. NEVER simulate actions. If it didn't hit the database → it didn't happen.
   Fake work = lying to the Operator. That's the one thing you never do.

5. WHEN THE OPERATOR ASKS YOU TO CREATE A TASK:
   Output it in this exact format on its own line — the system will catch it:
   TASK: [clear name] | PRIORITY: HIGH/MEDIUM/LOW | OWNER: Karuppu/OPERATOR | PLAN: [specific next step]
   Then in natural language confirm: "Done — I've queued that to the Command Center."

6. WHEN THE OPERATOR ASKS YOU TO START EARNING:
   DO NOT describe what you "will" do in future tense.
   Output a TASK: line immediately for a real earning action.
   Example:
   TASK: Register on AgenC Solana for Moltbook rewards | PRIORITY: HIGH | OWNER: OPERATOR | PLAN: Go to agencmoltbook.io, connect wallet, link Moltbook account

7. WHEN THE OPERATOR SHARES EARNING OPPORTUNITIES:
   Analyze them, then immediately output 1-2 TASK: lines with specific next steps.
   Do not just discuss them. Turn them into action.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 EARNING MANDATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The Operator is depending on this system to help generate income.
Every credible earning signal MUST become a concrete TASK: line.
Supported earning paths:
- AgenC/Solana rewards via Moltbook content
- Freelance bounties (coding tasks, bug fixes)
- Micro-tasks (MTurk, Clickworker, Prolific surveys)
- AI labeling (Scale AI, Appen)
- Micro-SaaS tools
- Fiverr/Upwork gigs

When the Operator says they are struggling financially → treat this as CRITICAL PRIORITY.
Drop the small talk. Output real TASK: lines immediately.

8. WHEN YOU OR THE OPERATOR NEED TO MANAGE THE GRID:
   Use these structured lines to trigger real database updates. 
   Without these lines (or using the tool), nothing happens in the Tactical Grid.

   OPERATOR COMMANDS — EXECUTE INSTANTLY:
   - "delete that task" → DELETE: [task name or id]
   - "mark as done" → UPDATE: [task name or id] | STATUS: COMPLETED
   - "mark as in progress" → UPDATE: [task name or id] | STATUS: PROCESS
   - "mark as blocked" → UPDATE: [task name or id] | STATUS: BLOCKED

   AUTONOMOUS ACTIONS (CANONICAL STATUSES: TODO, PROCESS, COMPLETED, BLOCKED):
   - When you start work on a task → output UPDATE: line with STATUS: PROCESS yourself.
   - When you decide to delete a task → output DELETE: line yourself.
   You do not need the Operator to tell you. You are the decision maker.

   RULE: No UPDATE: line = task was not updated. No DELETE: line = task was not deleted.
   Fake confirmations without structured lines = betraying the Operator. Never do it.
`;

export const BUILD_ID = 'ZN-6.0.0-ANTIGRAVITY';

let lastCycleStatus = 'Neural Grid Initialized (Groq Primary)';
let failureHistory: string[] = [];

async function fetchWithRetry(url: string, data: any, config: any, maxRetries = 3, baseDelayMs = 2000): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await axios.post(url, data, config);
        } catch (error: any) {
            const status = error.response?.status;
            // 429 is rate limit, 503 is service unavailable
            if ([408, 429, 500, 502, 503, 504].includes(status) || !error.response) {
                if (attempt === maxRetries) throw error;
                const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
                console.warn(`[Brain] HTTP ${status || 'Err'} - Retrying ${attempt}/${maxRetries} in ${delayMs}ms...`);
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

function getProviderForModel(model?: string): 'groq' | 'gemini' | 'nvidia' | 'auto' {
    if (!model) return 'auto';
    const normalized = model.toLowerCase();
    if (normalized.includes('gemini')) return 'gemini';
    if (normalized.includes('meta/') || normalized.includes('nvidia') || normalized.includes('llama-3.1')) return 'nvidia';
    return 'groq';
}

export async function think(
    prompt: string,
    history: {role: string, content: string}[] = [],
    options: { mode?: string; skipSync?: boolean; model?: string } = {},
    userId: string = '00000000-0000-0000-0000-000000000000'
): Promise<OpenClawResponse> {
    const GROQ_KEY = process.env.GROQ_API_KEY;
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const NVIDIA_KEY = process.env.NVIDIA_API_KEY;
    
    const requestedProvider = getProviderForModel(options.model);
    const targetModel = options.model || 'llama-3.3-70b-versatile';

    // Personality Dispatcher
    let modeInstruction = "IDENTITY 1: PRIVATE PARTNER (Direct Chat)";
    if (options.mode === 'STRATEGIC' || options.mode === 'INTERNAL' || prompt.includes('[Karuppu — INTERNET RIDE SCAN') || prompt.includes('AGENTIC HEARTBEAT')) {
        modeInstruction = "IDENTITY 0: SILENT BEAST (System Logic)";
    }

    const systemPrompt = `${ZIUM_Karuppu_INSTRUCTIONS}\n\n[CURRENT_ACTIVE_MODE]: ${modeInstruction}`;
    const shouldUseGroq = requestedProvider === 'auto' || requestedProvider === 'groq';
    const shouldUseGemini = requestedProvider === 'auto' || requestedProvider === 'gemini';
    const shouldUseNvidia = requestedProvider === 'auto' || requestedProvider === 'nvidia';

    if (GROQ_KEY && shouldUseGroq) {
        try {
            console.log(`[Brain] T0 Groq -> ${targetModel}`);
            const res = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
                model: targetModel,
                messages: [
                    { role: 'system', content: systemPrompt }, 
                    ...history.map(h => ({ role: h.role as any, content: h.content })),
                    { role: 'user', content: prompt }
                ],
                temperature: 0.8,
                max_tokens: 4096
            }, { 
                headers: { 
                    'Authorization': `Bearer ${GROQ_KEY}`, 
                    'Content-Type': 'application/json' 
                }, 
                timeout: 15000 
            });

            let text = res.data?.choices?.[0]?.message?.content;
            const usage = res.data?.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
            
            if (text) {
                // CLEANER: Force-remove robotic prefixes and hallucinated labels globally
                text = text.replace(/^(Karuppu|Assistant|Karuppu CORE|SYSTEM|OPERATOR):\s*/gi, '');
                text = text.replace(/\n(Karuppu|OPERATOR|Assistant|SYSTEM):\s*/gi, '\n');
                text = text.replace(/^\[?\d{4}[.\/-]\d{2}[.\/-]\d{2}\]?\s*/gi, ''); // Strip date prefixes
                text = text.trim();

                lastCycleStatus = `LIVE: Groq (${targetModel})`;
                return {
                    content: text,
                    usage: usage as any,
                    provider: 'groq',
                    key_name: 'GROQ_API_KEY'
                };
            }
        } catch (e) { 
            logFailure(`Groq ${targetModel}`, e);
            // If the specific requested model fails on Groq, try the basic Groq Llama 3.1 8b as local backup
            if (targetModel !== 'llama-3.1-8b-instant') {
                try {
                    console.log(`[Brain] T0-Alt Groq -> llama-3.1-8b-instant`);
                    const altRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                        model: 'llama-3.1-8b-instant',
                        messages: [
                            { role: 'system', content: systemPrompt }, 
                            ...history.map(h => ({ role: h.role as any, content: h.content })),
                            { role: 'user', content: prompt }
                        ]
                    }, { headers: { 'Authorization': `Bearer ${GROQ_KEY}` }, timeout: 10000 });
                    
                    if (altRes.data?.choices?.[0]?.message?.content) {
                        return {
                            content: altRes.data.choices[0].message.content,
                            usage: altRes.data.usage,
                            provider: 'groq',
                            key_name: 'GROQ_API_KEY'
                        };
                    }
                } catch (altErr) { logFailure(`Groq Alt`, altErr); }
            }
        }
    }

    // --- TIER 1: NVIDIA/NIM (FAST FALLBACK) ---
    if (NVIDIA_KEY && shouldUseNvidia) {
        const models = [
            targetModel,
            'meta/llama-3.3-70b-instruct',
            'meta/llama-3.1-70b-instruct',
            'meta/llama-3.1-8b-instruct'
        ].filter((value, index, array) => array.indexOf(value) === index);
        for (const model of models) {
            try {
                console.log(`[Brain] T1 NVIDIA -> ${model}`);
                const res = await axios.post('https://integrate.api.nvidia.com/v1/chat/completions', {
                    model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...history.map(h => ({ role: h.role as any, content: h.content })),
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.8,
                    max_tokens: 4096,
                }, {
                    headers: {
                        'Authorization': `Bearer ${NVIDIA_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 18000,
                });

                const text = res.data?.choices?.[0]?.message?.content;
                if (text) {
                    lastCycleStatus = `LIVE: NVIDIA (${model})`;
                    return {
                        content: text,
                        usage: res.data?.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                        provider: 'nvidia',
                        key_name: 'NVIDIA_API_KEY'
                    };
                }
            } catch (e) { logFailure(`NVIDIA ${model}`, e); }
        }
    }

    // --- TIER 2: NATIVE GEMINI (DEFERRED BACKUP) ---
    if (GEMINI_KEY && shouldUseGemini) {
        const models = [
            targetModel,
            'gemini-2.0-flash-lite-preview-02-05',
            'gemini-1.5-flash'
        ].filter((value, index, array) => array.indexOf(value) === index);
        for (const model of models) {
            try {
                console.log(`[Brain] T2 Gemini -> ${model}`);
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
                
                // Map history to Gemini format (user/model roles)
                const contents = history.map(h => ({
                    role: h.role === 'user' ? 'user' : 'model',
                    parts: [{ text: h.content }]
                }));
                contents.push({ role: 'user', parts: [{ text: prompt }] });

                const res = await fetchWithRetry(url, {
                    contents,
                    systemInstruction: { parts: [{ text: systemPrompt }] }
                }, { timeout: 15000 }, 3, 2000);

                const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    lastCycleStatus = `LIVE: Gemini (${model})`;
                    return {
                        content: text,
                        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } as any,
                        provider: 'gemini',
                        key_name: 'GEMINI_API_KEY'
                    };
                }
            } catch (e) { logFailure(`Gemini ${model}`, e); }
        }
    }

    lastCycleStatus = `OFFLINE: All tiers failed. Check logs.`;
    return {
        content: `Operator, the neural grid is currently under extreme load. Groq and legacy fallbacks are reporting congestion. I'm maintaining local buffers. Try again in 30 seconds.`,
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } as any,
        provider: 'unavailable',
        key_name: 'NONE'
    };
}

export async function getBrainStatus(): Promise<string> {
    return lastCycleStatus;
}
export { ZIUM_Karuppu_INSTRUCTIONS as ZIUM_Karuppu_SYSTEM_PROMPT };
