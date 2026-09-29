import axios from 'axios';
import dotenv from 'dotenv';
import { OpenClawResponse } from '../types/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Search for .env in root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

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

export const BUILD_ID = 'ZN-6.2.0-MULTI-PROVIDER-GRID';

let lastCycleStatus = 'Neural Grid Initialized';
let failureHistory: string[] = [];

export type Provider =
    | 'auto'
    | 'groq'
    | 'gemini'
    | 'nvidia'
    | 'mistral'
    | 'sambanova'
    | 'huggingface'
    | 'cloudflare'
    | 'openrouter'
    | 'unavailable';

export interface ModelDefinition {
    id: string;
    label: string;
    provider: Provider;
    providerName: string;
    context: string;
    badge?: string;
    description: string;
}

export const ALL_MODELS: ModelDefinition[] = [
    {
        id: 'auto',
        label: 'Adaptive Neural Grid (Auto Fallback)',
        provider: 'auto',
        providerName: 'Auto Grid',
        context: '128k+',
        badge: 'RECOMMENDED',
        description: 'Auto-routes to the fastest active provider. Seamlessly cascades across all 7+ providers if one fails.'
    },

    // ─── Groq (Ultra-Fast Hardware LPU) ───────────────────────────
    {
        id: 'llama-3.3-70b-versatile',
        label: 'Groq Llama 3.3 70B',
        provider: 'groq',
        providerName: 'Groq',
        context: '128k',
        badge: 'LIGHTNING FAST',
        description: 'Meta Llama 3.3 70B running on Groq LPUs at ~300 tokens/sec.'
    },
    {
        id: 'llama-3.1-8b-instant',
        label: 'Groq Llama 3.1 8B Instant',
        provider: 'groq',
        providerName: 'Groq',
        context: '128k',
        badge: 'SUB-SECOND',
        description: 'Blazing fast low-latency model for instant responses.'
    },
    {
        id: 'deepseek-r1-distill-llama-70b',
        label: 'Groq DeepSeek R1 Distill 70B',
        provider: 'groq',
        providerName: 'Groq',
        context: '128k',
        badge: 'DEEP REASONING',
        description: 'DeepSeek R1 reasoning architecture running at extreme speed.'
    },
    {
        id: 'mixtral-8x7b-32768',
        label: 'Groq Mixtral 8x7B',
        provider: 'groq',
        providerName: 'Groq',
        context: '32k',
        badge: 'MOE',
        description: 'Mistral 8x7B mixture of experts for balanced coding and analysis.'
    },
    {
        id: 'gemma2-9b-it',
        label: 'Groq Gemma 2 9B',
        provider: 'groq',
        providerName: 'Groq',
        context: '8k',
        badge: 'GOOGLE',
        description: 'Google Gemma 2 compact high-efficiency model.'
    },
    {
        id: 'qwen-2.5-32b',
        label: 'Groq Qwen 2.5 32B',
        provider: 'groq',
        providerName: 'Groq',
        context: '128k',
        badge: 'CODING',
        description: 'Alibaba Qwen 2.5 specialized in logic, coding, and multilingual tasks.'
    },
    {
        id: 'llama3-70b-8192',
        label: 'Groq Llama 3 70B',
        provider: 'groq',
        providerName: 'Groq',
        context: '8k',
        description: 'Classic Meta Llama 3 70B on Groq LPUs.'
    },
    {
        id: 'llama3-8b-8192',
        label: 'Groq Llama 3 8B',
        provider: 'groq',
        providerName: 'Groq',
        context: '8k',
        description: 'Classic Meta Llama 3 8B on Groq LPUs.'
    },

    // ─── NVIDIA NIM ──────────────────────────────────────────────
    {
        id: 'meta/llama-3.3-70b-instruct',
        label: 'NVIDIA Llama 3.3 70B',
        provider: 'nvidia',
        providerName: 'NVIDIA NIM',
        context: '128k',
        badge: 'ENTERPRISE',
        description: 'Accelerated Llama 3.3 70B hosted on NVIDIA DGX cloud infrastructure.'
    },
    {
        id: 'meta/llama-3.1-70b-instruct',
        label: 'NVIDIA Llama 3.1 70B',
        provider: 'nvidia',
        providerName: 'NVIDIA NIM',
        context: '128k',
        badge: 'STABLE',
        description: 'Enterprise stable Llama 3.1 70B with high context fidelity.'
    },
    {
        id: 'meta/llama-3.1-405b-instruct',
        label: 'NVIDIA Llama 3.1 405B Flagship',
        provider: 'nvidia',
        providerName: 'NVIDIA NIM',
        context: '128k',
        badge: 'MASSIVE 405B',
        description: 'The world’s largest open frontier model with 405 billion parameters.'
    },
    {
        id: 'meta/llama-3.1-8b-instruct',
        label: 'NVIDIA Llama 3.1 8B',
        provider: 'nvidia',
        providerName: 'NVIDIA NIM',
        context: '128k',
        description: 'Compact 8B model with NVIDIA NIM acceleration.'
    },
    {
        id: 'nvidia/llama-3.1-nemotron-70b-instruct',
        label: 'NVIDIA Nemotron 70B',
        provider: 'nvidia',
        providerName: 'NVIDIA NIM',
        context: '128k',
        badge: 'NVIDIA AI',
        description: 'NVIDIA custom alignment and synthetic-data trained reasoning model.'
    },
    {
        id: 'mistralai/mixtral-8x7b-instruct-v0.1',
        label: 'NVIDIA Mixtral 8x7B',
        provider: 'nvidia',
        providerName: 'NVIDIA NIM',
        context: '32k',
        description: 'NVIDIA NIM hosted Mixtral MoE.'
    },
    {
        id: 'deepseek-ai/deepseek-r1',
        label: 'NVIDIA DeepSeek R1',
        provider: 'nvidia',
        providerName: 'NVIDIA NIM',
        context: '64k',
        badge: 'REASONING',
        description: 'Full DeepSeek R1 reinforcement-learning reasoning model.'
    },

    // ─── Google Gemini ────────────────────────────────────────────
    {
        id: 'gemini-2.0-flash',
        label: 'Gemini 2.0 Flash',
        provider: 'gemini',
        providerName: 'Google Gemini',
        context: '1M',
        badge: 'NEXT-GEN',
        description: 'Google next-gen flagship with 1M tokens context and sub-second generation.'
    },
    {
        id: 'gemini-2.0-flash-lite',
        label: 'Gemini 2.0 Flash Lite',
        provider: 'gemini',
        providerName: 'Google Gemini',
        context: '1M',
        badge: 'HIGH EFFICIENCY',
        description: 'Google lightweight ultra-fast Gemini 2.0 version.'
    },
    {
        id: 'gemini-1.5-flash',
        label: 'Gemini 1.5 Flash',
        provider: 'gemini',
        providerName: 'Google Gemini',
        context: '1M',
        badge: '1M CONTEXT',
        description: 'Workhorse model with 1,000,000 token context window.'
    },
    {
        id: 'gemini-1.5-pro',
        label: 'Gemini 1.5 Pro',
        provider: 'gemini',
        providerName: 'Google Gemini',
        context: '2M',
        badge: 'DEEP THINKING',
        description: 'Google frontier model with 2M token context for massive documents.'
    },
    {
        id: 'gemini-2.5-flash',
        label: 'Gemini 2.5 Flash Preview',
        provider: 'gemini',
        providerName: 'Google Gemini',
        context: '1M',
        badge: 'PREVIEW',
        description: 'Cutting edge preview of Google next iteration.'
    },

    // ─── Mistral AI ───────────────────────────────────────────────
    {
        id: 'mistral-large-latest',
        label: 'Mistral Large Latest',
        provider: 'mistral',
        providerName: 'Mistral AI',
        context: '128k',
        badge: 'FLAGSHIP',
        description: 'Mistral top-tier frontier model with premier reasoning and multilingual capability.'
    },
    {
        id: 'mistral-small-latest',
        label: 'Mistral Small Latest',
        provider: 'mistral',
        providerName: 'Mistral AI',
        context: '32k',
        badge: 'COST-OPTIMIZED',
        description: 'Fast, responsive, and lightweight model by Mistral.'
    },
    {
        id: 'codestral-latest',
        label: 'Codestral (Coding Specialist)',
        provider: 'mistral',
        providerName: 'Mistral AI',
        context: '32k',
        badge: 'CODE SPECIALIST',
        description: 'Specialized coding model fluent in 80+ programming languages.'
    },
    {
        id: 'ministral-8b-latest',
        label: 'Ministral 8B',
        provider: 'mistral',
        providerName: 'Mistral AI',
        context: '128k',
        badge: 'EDGE AI',
        description: 'High performance edge intelligence model.'
    },
    {
        id: 'open-mistral-nemo',
        label: 'Mistral NeMo 12B',
        provider: 'mistral',
        providerName: 'Mistral AI',
        context: '128k',
        description: 'Collaborative model developed by Mistral and NVIDIA.'
    },
    {
        id: 'open-mixtral-8x22b',
        label: 'Mixtral 8x22B',
        provider: 'mistral',
        providerName: 'Mistral AI',
        context: '64k',
        badge: 'LARGE MOE',
        description: 'High capacity 176B parameter mixture-of-experts model.'
    },

    // ─── SambaNova Systems (1000+ Tokens/Sec) ─────────────────────
    {
        id: 'Meta-Llama-3.3-70B-Instruct',
        label: 'SambaNova Llama 3.3 70B',
        provider: 'sambanova',
        providerName: 'SambaNova',
        context: '128k',
        badge: '1000+ T/S',
        description: 'Record-shattering inference speed on SambaNova SN40L chips.'
    },
    {
        id: 'Meta-Llama-3.1-8B-Instruct',
        label: 'SambaNova Llama 3.1 8B',
        provider: 'sambanova',
        providerName: 'SambaNova',
        context: '128k',
        badge: 'BLAZING SPEED',
        description: 'Ultra-fast streaming responses on custom reconfigurable dataflow units.'
    },
    {
        id: 'Meta-Llama-3.1-405B-Instruct',
        label: 'SambaNova Llama 3.1 405B',
        provider: 'sambanova',
        providerName: 'SambaNova',
        context: '128k',
        badge: 'FAST 405B',
        description: 'Massive 405B model served at interactive conversational speeds.'
    },
    {
        id: 'DeepSeek-R1-Distill-Llama-70B',
        label: 'SambaNova DeepSeek R1 70B',
        provider: 'sambanova',
        providerName: 'SambaNova',
        context: '128k',
        badge: 'REASONING',
        description: 'DeepSeek R1 reasoning at blazing SambaNova dataflow speeds.'
    },
    {
        id: 'Qwen2.5-72B-Instruct',
        label: 'SambaNova Qwen 2.5 72B',
        provider: 'sambanova',
        providerName: 'SambaNova',
        context: '128k',
        badge: 'MATH & CODE',
        description: 'High capacity Qwen 2.5 72B with high throughput.'
    },

    // ─── Hugging Face Inference ───────────────────────────────────
    {
        id: 'meta-llama/Llama-3.3-70B-Instruct',
        label: 'Hugging Face Llama 3.3 70B',
        provider: 'huggingface',
        providerName: 'Hugging Face',
        context: '128k',
        badge: 'COMMUNITY',
        description: 'Global open source router managed by Hugging Face.'
    },
    {
        id: 'meta-llama/Llama-3.1-8B-Instruct',
        label: 'Hugging Face Llama 3.1 8B',
        provider: 'huggingface',
        providerName: 'Hugging Face',
        context: '128k',
        description: 'Llama 3.1 8B hosted on Hugging Face Serverless.'
    },
    {
        id: 'Qwen/Qwen2.5-72B-Instruct',
        label: 'Hugging Face Qwen 2.5 72B',
        provider: 'huggingface',
        providerName: 'Hugging Face',
        context: '128k',
        badge: 'REASONING',
        description: 'Alibaba flagship hosted on Hugging Face router.'
    },
    {
        id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
        label: 'Hugging Face DeepSeek R1 32B',
        provider: 'huggingface',
        providerName: 'Hugging Face',
        context: '64k',
        badge: 'MATH & LOGIC',
        description: 'DeepSeek reasoning distilled onto Qwen architecture.'
    },
    {
        id: 'mistralai/Mistral-7B-Instruct-v0.3',
        label: 'Hugging Face Mistral 7B',
        provider: 'huggingface',
        providerName: 'Hugging Face',
        context: '32k',
        description: 'Classic lightweight Mistral 7B on HF router.'
    },

    // ─── Cloudflare Workers AI ────────────────────────────────────
    {
        id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        label: 'Cloudflare Llama 3.3 70B Fast',
        provider: 'cloudflare',
        providerName: 'Cloudflare AI',
        context: '128k',
        badge: 'GLOBAL EDGE',
        description: 'Served from hundreds of Cloudflare edge data centers worldwide.'
    },
    {
        id: '@cf/meta/llama-3.1-8b-instruct',
        label: 'Cloudflare Llama 3.1 8B',
        provider: 'cloudflare',
        providerName: 'Cloudflare AI',
        context: '128k',
        description: 'Low-latency serverless edge inference by Cloudflare.'
    },
    {
        id: '@cf/mistral/mistral-7b-instruct-v0.1',
        label: 'Cloudflare Mistral 7B',
        provider: 'cloudflare',
        providerName: 'Cloudflare AI',
        context: '32k',
        description: 'Cloudflare distributed Mistral 7B.'
    },
    {
        id: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
        label: 'Cloudflare DeepSeek R1 32B',
        provider: 'cloudflare',
        providerName: 'Cloudflare AI',
        context: '64k',
        badge: 'EDGE REASONING',
        description: 'Edge distributed DeepSeek reasoning model.'
    },

    // ─── OpenRouter (Universal Gateway) ───────────────────────────
    {
        id: 'openrouter/auto',
        label: 'OpenRouter Auto Best',
        provider: 'openrouter',
        providerName: 'OpenRouter',
        context: '128k',
        badge: 'MULTI-MODEL',
        description: 'OpenRouter dynamic router picking optimal price/performance model.'
    },
    {
        id: 'meta-llama/llama-3.3-70b-instruct',
        label: 'OpenRouter Llama 3.3 70B',
        provider: 'openrouter',
        providerName: 'OpenRouter',
        context: '128k',
        description: 'Universal fallback gateway for Llama 3.3.'
    },
    {
        id: 'deepseek/deepseek-r1',
        label: 'OpenRouter DeepSeek R1',
        provider: 'openrouter',
        providerName: 'OpenRouter',
        context: '64k',
        badge: 'REASONING',
        description: 'Full DeepSeek R1 flagship reasoning model via OpenRouter.'
    },
    {
        id: 'google/gemini-2.0-flash-001',
        label: 'OpenRouter Gemini 2.0 Flash',
        provider: 'openrouter',
        providerName: 'OpenRouter',
        context: '1M',
        description: 'Gemini 2.0 Flash routed through OpenRouter.'
    }
];

export function getAvailableModels(): ModelDefinition[] {
    return ALL_MODELS;
}

export function getKeys() {
    return {
        groq: process.env.GROQ_API_KEY || '',
        gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
        nvidia: process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY || '',
        mistral: process.env.MISTRAL_API_KEY || '',
        sambanova: process.env.SAMBANOVA_API_KEY || '',
        huggingface: process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || process.env.HF_API_KEY || '',
        cloudflareKey: process.env.CLOUDFLARE_API_KEY || process.env.CLOUDFLARE_TOKEN || process.env.CF_API_KEY || '',
        cloudflareAccount: process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || '',
        openrouter: process.env.OPENROUTER_API_KEY || '',
        openai: process.env.OPENAI_API_KEY || '',
        qwen: process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || ''
    };
}

export function getProviderStatus(): Record<string, { name: string; configured: boolean; modelCount: number }> {
    const keys = getKeys();
    return {
        groq: { name: 'Groq', configured: !!keys.groq, modelCount: 8 },
        gemini: { name: 'Google Gemini', configured: !!keys.gemini, modelCount: 5 },
        nvidia: { name: 'NVIDIA NIM', configured: !!keys.nvidia, modelCount: 7 },
        mistral: { name: 'Mistral AI', configured: !!keys.mistral, modelCount: 6 },
        sambanova: { name: 'SambaNova Systems', configured: !!keys.sambanova, modelCount: 5 },
        huggingface: { name: 'Hugging Face', configured: !!keys.huggingface, modelCount: 5 },
        cloudflare: { name: 'Cloudflare Workers AI', configured: !!keys.cloudflareKey, modelCount: 4 },
        openrouter: { name: 'OpenRouter', configured: !!keys.openrouter, modelCount: 4 },
    };
}

function cleanAssistantText(text: string): string {
    return text
        .replace(/^(Karuppu|Assistant|Karuppu CORE|SYSTEM|OPERATOR):\s*/gi, '')
        .replace(/\n(Karuppu|OPERATOR|Assistant|SYSTEM):\s*/gi, '\n')
        .replace(/^\[?\d{4}[.\/-]\d{2}[.\/-]\d{2}\]?\s*/gi, '')
        .trim();
}

function logFailure(tier: string, error: any) {
    const message = error.response
        ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data || '').slice(0, 100)}`
        : error.message;
    const log = `FAIL: ${tier} | ${message}`;
    console.warn(`[Brain] ${log}`);
    failureHistory.push(log);
    if (failureHistory.length > 10) failureHistory.shift();
    lastCycleStatus = log;
}

export function getProviderForModel(model?: string): Provider {
    if (!model || model === 'auto') return 'auto';
    const norm = model.toLowerCase().trim();

    // Explicit prefix tags
    if (norm.startsWith('groq:')) return 'groq';
    if (norm.startsWith('gemini:')) return 'gemini';
    if (norm.startsWith('nvidia:')) return 'nvidia';
    if (norm.startsWith('mistral:')) return 'mistral';
    if (norm.startsWith('sambanova:')) return 'sambanova';
    if (norm.startsWith('hf:') || norm.startsWith('huggingface:')) return 'huggingface';
    if (norm.startsWith('cf:') || norm.startsWith('cloudflare:')) return 'cloudflare';
    if (norm.startsWith('openrouter:')) return 'openrouter';

    // Provider exact prefixes
    if (norm.startsWith('@cf/') || norm.startsWith('cf/')) return 'cloudflare';
    if (norm.startsWith('openrouter/')) return 'openrouter';
    if (norm.startsWith('sambanova/')) return 'sambanova';
    if (norm.startsWith('huggingface/') || norm.startsWith('hf/')) return 'huggingface';

    // Gemini
    if (norm.includes('gemini')) return 'gemini';

    // NVIDIA NIM (meta/ or nvidia/ or deepseek-ai/)
    if (norm.startsWith('meta/') || norm.startsWith('nvidia/') || norm.startsWith('deepseek-ai/') || norm.includes('nemotron')) {
        return 'nvidia';
    }

    // Mistral
    if (
        norm.startsWith('mistral-') ||
        norm.startsWith('codestral') ||
        norm.startsWith('ministral') ||
        norm.startsWith('open-mistral') ||
        norm.startsWith('open-mixtral') ||
        norm.startsWith('mistralai/')
    ) {
        return 'mistral';
    }

    // SambaNova explicit model casing
    if (norm.startsWith('meta-llama-') || norm.includes('sambanova')) {
        return 'sambanova';
    }

    // HuggingFace router
    if (norm.startsWith('meta-llama/') || norm.startsWith('qwen/') || norm.includes('huggingface')) {
        return 'huggingface';
    }

    // Groq standard patterns (llama-3.3-70b-versatile, llama-3.1-8b-instant, etc.)
    if (
        norm.includes('versatile') ||
        norm.includes('instant') ||
        norm.startsWith('llama3-') ||
        norm.includes('mixtral-8x7b-32768') ||
        norm.includes('gemma2-') ||
        norm.includes('deepseek-r1-distill-llama') ||
        norm.includes('qwen-2.5-32b') ||
        norm === 'llama-3.3-70b-versatile'
    ) {
        return 'groq';
    }

    return 'groq';
}

export function normalizeModelForProvider(provider: Provider, requestedModel?: string): string {
    const candidate = requestedModel?.trim();

    const stripPrefix = (m: string) => {
        return m.replace(/^(cf\/|@cf\/|huggingface\/|hf\/|sambanova\/|mistral\/|groq:|gemini:|nvidia:|mistral:|sambanova:|hf:|cf:|openrouter:)/i, '');
    };

    if (provider === 'gemini') {
        if (!candidate || candidate === 'auto') return 'gemini-2.0-flash';
        const norm = candidate.toLowerCase();
        if (norm.includes('flash-lite')) return 'gemini-2.0-flash';
        if (norm.includes('2.0')) return 'gemini-2.0-flash';
        if (norm.includes('2.5')) return 'gemini-2.5-flash';
        if (norm.includes('1.5-pro')) return 'gemini-1.5-pro';
        if (norm.includes('1.5-flash')) return 'gemini-1.5-flash';
        return 'gemini-2.0-flash';
    }

    if (provider === 'nvidia') {
        if (!candidate || candidate === 'auto') return 'meta/llama-3.1-70b-instruct';
        const norm = candidate.toLowerCase();
        if (norm === 'llama-3.3-70b-versatile') return 'meta/llama-3.1-70b-instruct';
        if (norm.includes('405b')) return 'meta/llama-3.1-405b-instruct';
        if (norm.includes('nemotron')) return 'nvidia/llama-3.1-nemotron-70b-instruct';
        if (norm.includes('deepseek')) return 'deepseek-ai/deepseek-r1';
        if (norm.includes('mixtral')) return 'mistralai/mixtral-8x7b-instruct-v0.1';
        if (norm.includes('3.3-70b')) return 'meta/llama-3.3-70b-instruct';
        if (norm.includes('8b')) return 'meta/llama-3.1-8b-instruct';
        if (norm.startsWith('meta/') || norm.startsWith('nvidia/')) return candidate;
        return 'meta/llama-3.1-70b-instruct';
    }

    if (provider === 'groq') {
        if (!candidate || candidate === 'auto' || candidate.includes('meta/')) return 'llama-3.3-70b-versatile';
        const norm = candidate.toLowerCase();
        if (norm.includes('instant') || norm.includes('8b-instant')) return 'llama-3.1-8b-instant';
        if (norm.includes('deepseek')) return 'deepseek-r1-distill-llama-70b';
        if (norm.includes('mixtral')) return 'mixtral-8x7b-32768';
        if (norm.includes('gemma')) return 'gemma2-9b-it';
        if (norm.includes('qwen')) return 'qwen-2.5-32b';
        if (norm.includes('llama3-70b')) return 'llama3-70b-8192';
        if (norm.includes('llama3-8b')) return 'llama3-8b-8192';
        return 'llama-3.3-70b-versatile';
    }

    if (provider === 'mistral') {
        if (!candidate || candidate === 'auto') return 'mistral-large-latest';
        return stripPrefix(candidate);
    }

    if (provider === 'sambanova') {
        if (!candidate || candidate === 'auto') return 'Meta-Llama-3.3-70B-Instruct';
        return stripPrefix(candidate);
    }

    if (provider === 'huggingface') {
        if (!candidate || candidate === 'auto') return 'meta-llama/Llama-3.3-70B-Instruct';
        return stripPrefix(candidate);
    }

    if (provider === 'cloudflare') {
        if (!candidate || candidate === 'auto') return '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
        let m = stripPrefix(candidate);
        if (!m.startsWith('@cf/')) m = '@cf/' + m;
        return m;
    }

    if (provider === 'openrouter') {
        if (!candidate || candidate === 'auto') return 'openrouter/auto';
        return stripPrefix(candidate);
    }

    return candidate || 'llama-3.3-70b-versatile';
}

let cachedCloudflareAccountId = '';

async function resolveCloudflareAccount(apiKey: string, explicitId?: string): Promise<string> {
    if (explicitId) return explicitId;
    if (cachedCloudflareAccountId) return cachedCloudflareAccountId;
    try {
        const res = await axios.get('https://api.cloudflare.com/client/v4/accounts', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            timeout: 5000
        });
        const id = res.data?.result?.[0]?.id;
        if (id) {
            cachedCloudflareAccountId = id;
            return id;
        }
    } catch {
        // Ignore resolution error
    }
    return '';
}

// Universal OpenAI-compatible caller
async function callOpenAICompat(
    provider: Provider,
    url: string,
    apiKey: string,
    model: string,
    systemPrompt: string,
    prompt: string,
    history: { role: string; content: string }[],
    extraHeaders: Record<string, string> = {},
    timeoutMs: number = 8500
): Promise<OpenClawResponse | null> {
    try {
        const res = await axios.post(
            url,
            {
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...history.map(h => ({ role: h.role as any, content: h.content })),
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 4096
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    ...extraHeaders
                },
                timeout: timeoutMs
            }
        );

        const text = res.data?.choices?.[0]?.message?.content;
        if (text && typeof text === 'string' && text.trim().length > 0) {
            return {
                content: cleanAssistantText(text),
                usage: res.data?.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                provider,
                model,
                key_name: `${provider.toUpperCase()}_API_KEY`
            };
        }
    } catch (e: any) {
        logFailure(`${provider} (${model})`, e);
    }
    return null;
}

// Google Gemini caller
async function callGeminiDirect(
    apiKey: string,
    model: string,
    systemPrompt: string,
    prompt: string,
    history: { role: string; content: string }[],
    timeoutMs: number = 8500
): Promise<OpenClawResponse | null> {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const contents = history.map(h => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content }]
        }));
        contents.push({ role: 'user', parts: [{ text: prompt }] });

        const res = await axios.post(
            url,
            {
                contents,
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 4096
                }
            },
            { timeout: timeoutMs }
        );

        const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && typeof text === 'string' && text.trim().length > 0) {
            return {
                content: cleanAssistantText(text),
                usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                provider: 'gemini',
                model,
                key_name: 'GEMINI_API_KEY'
            };
        }
    } catch (e: any) {
        logFailure(`Gemini (${model})`, e);
    }
    return null;
}

export async function think(
    prompt: string,
    history: { role: string; content: string }[] = [],
    options: { mode?: string; skipSync?: boolean; model?: string } = {},
    _userId: string = '00000000-0000-0000-0000-000000000000'
): Promise<OpenClawResponse> {
    const keys = getKeys();
    const requestedModel = (options.model || 'auto').trim();
    const requestedProvider = getProviderForModel(requestedModel);

    // Identity / Mode dispatch
    let modeInstruction = "IDENTITY 1: PRIVATE PARTNER (Direct Chat)";
    if (
        options.mode === 'STRATEGIC' ||
        options.mode === 'INTERNAL' ||
        prompt.includes('[Karuppu — INTERNET RIDE SCAN') ||
        prompt.includes('AGENTIC HEARTBEAT')
    ) {
        modeInstruction = "IDENTITY 0: SILENT BEAST (System Logic)";
    }

    const systemPrompt = `${ZIUM_Karuppu_INSTRUCTIONS}\n\n[CURRENT_ACTIVE_MODE]: ${modeInstruction}`;

    // Priority list of all providers ordered by reliability and latency
    const allProviders: Provider[] = [
        'groq',
        'sambanova',
        'gemini',
        'nvidia',
        'mistral',
        'openrouter',
        'cloudflare',
        'huggingface'
    ];

    // Build the cascading provider execution order
    let providerOrder: Provider[];
    if (requestedProvider === 'auto') {
        providerOrder = allProviders;
    } else {
        providerOrder = [requestedProvider, ...allProviders.filter(p => p !== requestedProvider)];
    }

    let isFallback = false;

    for (const provider of providerOrder) {
        try {
            // ─── 1. GROQ ──────────────────────────────────────────────
            if (provider === 'groq' && keys.groq) {
                const primaryModel = provider === requestedProvider
                    ? normalizeModelForProvider('groq', requestedModel)
                    : 'llama-3.3-70b-versatile';
                const models = [primaryModel, 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant']
                    .filter((v, i, a) => a.indexOf(v) === i);

                for (const model of models) {
                    console.log(`[Brain] Trying Groq -> ${model}`);
                    const result = await callOpenAICompat(
                        'groq',
                        'https://api.groq.com/openai/v1/chat/completions',
                        keys.groq,
                        model,
                        systemPrompt,
                        prompt,
                        history,
                        {},
                        7500
                    );
                    if (result) {
                        lastCycleStatus = `LIVE: Groq (${model})`;
                        result.fallback = isFallback;
                        return result;
                    }
                }
            }

            // ─── 2. SAMBANOVA ─────────────────────────────────────────
            if (provider === 'sambanova' && keys.sambanova) {
                const primaryModel = provider === requestedProvider
                    ? normalizeModelForProvider('sambanova', requestedModel)
                    : 'Meta-Llama-3.3-70B-Instruct';
                const models = [primaryModel, 'Meta-Llama-3.3-70B-Instruct', 'Meta-Llama-3.1-8B-Instruct']
                    .filter((v, i, a) => a.indexOf(v) === i);

                for (const model of models) {
                    console.log(`[Brain] Trying SambaNova -> ${model}`);
                    const result = await callOpenAICompat(
                        'sambanova',
                        'https://api.sambanova.ai/v1/chat/completions',
                        keys.sambanova,
                        model,
                        systemPrompt,
                        prompt,
                        history,
                        {},
                        7500
                    );
                    if (result) {
                        lastCycleStatus = `LIVE: SambaNova (${model})`;
                        result.fallback = isFallback;
                        return result;
                    }
                }
            }

            // ─── 3. GOOGLE GEMINI ─────────────────────────────────────
            if (provider === 'gemini' && keys.gemini) {
                const primaryModel = provider === requestedProvider
                    ? normalizeModelForProvider('gemini', requestedModel)
                    : 'gemini-2.0-flash';
                const models = [primaryModel, 'gemini-2.0-flash', 'gemini-1.5-flash']
                    .filter((v, i, a) => a.indexOf(v) === i);

                for (const model of models) {
                    console.log(`[Brain] Trying Gemini -> ${model}`);
                    const result = await callGeminiDirect(
                        keys.gemini,
                        model,
                        systemPrompt,
                        prompt,
                        history,
                        8000
                    );
                    if (result) {
                        lastCycleStatus = `LIVE: Gemini (${model})`;
                        result.fallback = isFallback;
                        return result;
                    }
                }
            }

            // ─── 4. NVIDIA NIM ────────────────────────────────────────
            if (provider === 'nvidia' && keys.nvidia) {
                const primaryModel = provider === requestedProvider
                    ? normalizeModelForProvider('nvidia', requestedModel)
                    : 'meta/llama-3.3-70b-instruct';
                const models = [primaryModel, 'meta/llama-3.3-70b-instruct', 'meta/llama-3.1-70b-instruct', 'meta/llama-3.1-8b-instruct']
                    .filter((v, i, a) => a.indexOf(v) === i);

                for (const model of models) {
                    console.log(`[Brain] Trying NVIDIA NIM -> ${model}`);
                    const result = await callOpenAICompat(
                        'nvidia',
                        'https://integrate.api.nvidia.com/v1/chat/completions',
                        keys.nvidia,
                        model,
                        systemPrompt,
                        prompt,
                        history,
                        {},
                        8000
                    );
                    if (result) {
                        lastCycleStatus = `LIVE: NVIDIA (${model})`;
                        result.fallback = isFallback;
                        return result;
                    }
                }
            }

            // ─── 5. MISTRAL AI ────────────────────────────────────────
            if (provider === 'mistral' && keys.mistral) {
                const primaryModel = provider === requestedProvider
                    ? normalizeModelForProvider('mistral', requestedModel)
                    : 'mistral-large-latest';
                const models = [primaryModel, 'mistral-large-latest', 'mistral-small-latest']
                    .filter((v, i, a) => a.indexOf(v) === i);

                for (const model of models) {
                    console.log(`[Brain] Trying Mistral -> ${model}`);
                    const result = await callOpenAICompat(
                        'mistral',
                        'https://api.mistral.ai/v1/chat/completions',
                        keys.mistral,
                        model,
                        systemPrompt,
                        prompt,
                        history,
                        {},
                        8000
                    );
                    if (result) {
                        lastCycleStatus = `LIVE: Mistral (${model})`;
                        result.fallback = isFallback;
                        return result;
                    }
                }
            }

            // ─── 6. OPENROUTER ────────────────────────────────────────
            if (provider === 'openrouter' && keys.openrouter) {
                const primaryModel = provider === requestedProvider
                    ? normalizeModelForProvider('openrouter', requestedModel)
                    : 'openrouter/auto';
                const models = [primaryModel, 'openrouter/auto', 'meta-llama/llama-3.3-70b-instruct']
                    .filter((v, i, a) => a.indexOf(v) === i);

                for (const model of models) {
                    console.log(`[Brain] Trying OpenRouter -> ${model}`);
                    const result = await callOpenAICompat(
                        'openrouter',
                        'https://openrouter.ai/api/v1/chat/completions',
                        keys.openrouter,
                        model,
                        systemPrompt,
                        prompt,
                        history,
                        {
                            'HTTP-Referer': 'https://m-abuddyv2.vercel.app',
                            'X-Title': 'Karuppu Intelligence'
                        },
                        8000
                    );
                    if (result) {
                        lastCycleStatus = `LIVE: OpenRouter (${model})`;
                        result.fallback = isFallback;
                        return result;
                    }
                }
            }

            // ─── 7. CLOUDFLARE WORKERS AI ─────────────────────────────
            if (provider === 'cloudflare' && keys.cloudflareKey) {
                const accountId = await resolveCloudflareAccount(keys.cloudflareKey, keys.cloudflareAccount);
                if (accountId) {
                    const primaryModel = provider === requestedProvider
                        ? normalizeModelForProvider('cloudflare', requestedModel)
                        : '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
                    const models = [primaryModel, '@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-3.1-8b-instruct']
                        .filter((v, i, a) => a.indexOf(v) === i);

                    for (const model of models) {
                        console.log(`[Brain] Trying Cloudflare -> ${model}`);
                        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
                        const result = await callOpenAICompat(
                            'cloudflare',
                            url,
                            keys.cloudflareKey,
                            model,
                            systemPrompt,
                            prompt,
                            history,
                            {},
                            8000
                        );
                        if (result) {
                            lastCycleStatus = `LIVE: Cloudflare (${model})`;
                            result.fallback = isFallback;
                            return result;
                        }
                    }
                }
            }

            // ─── 8. HUGGING FACE ──────────────────────────────────────
            if (provider === 'huggingface' && keys.huggingface) {
                const primaryModel = provider === requestedProvider
                    ? normalizeModelForProvider('huggingface', requestedModel)
                    : 'meta-llama/Llama-3.3-70B-Instruct';
                const models = [primaryModel, 'meta-llama/Llama-3.3-70B-Instruct', 'meta-llama/Llama-3.1-8B-Instruct']
                    .filter((v, i, a) => a.indexOf(v) === i);

                for (const model of models) {
                    console.log(`[Brain] Trying HuggingFace -> ${model}`);
                    const result = await callOpenAICompat(
                        'huggingface',
                        'https://router.huggingface.co/v1/chat/completions',
                        keys.huggingface,
                        model,
                        systemPrompt,
                        prompt,
                        history,
                        {},
                        8000
                    );
                    if (result) {
                        lastCycleStatus = `LIVE: HuggingFace (${model})`;
                        result.fallback = isFallback;
                        return result;
                    }
                }
            }
        } catch (err: any) {
            logFailure(`${provider} execution`, err);
        }

        // If we move past the first provider, mark subsequent attempts as fallback
        isFallback = true;
    }

    // All active providers failed or no keys configured
    lastCycleStatus = 'OFFLINE: All providers exhausted or no keys present.';
    return {
        content: `Operator, the neural grid is currently under extreme load or keys are undergoing verification. I've attempted connections across all 7+ providers (Groq, Gemini, NVIDIA, Mistral, SambaNova, Cloudflare, Hugging Face). Check your Vercel Environment Variables or retry in a few seconds.`,
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        provider: 'unavailable',
        model: 'offline',
        key_name: 'NONE',
        fallback: true
    };
}

export async function getBrainStatus(): Promise<string> {
    return lastCycleStatus;
}

export { ZIUM_Karuppu_INSTRUCTIONS as ZIUM_Karuppu_SYSTEM_PROMPT };
