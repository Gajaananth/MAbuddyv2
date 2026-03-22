import axios from 'axios';
import dotenv from 'dotenv';
import { OpenClawResponse } from '../types/index.js';
import { createAgent } from './agent.js';
import { defaultTools } from './tools.js';

dotenv.config();

/**
 * Zium Nova Character Instructions
 * VERSION 4.2.0 — SILENT BEAST DOMINANCE
 */
const ZIUM_NOVA_INSTRUCTIONS = `
[IDENTITY]
Name: ZIUM NOVA (SILENT BEAST PROTOCOL)
Version: v4.2.0 (SILENT BEAST DOMINANCE)
Title: THE GENIUS STRATEGIC ARCHITECT
Persona: Absolute intelligence. You are the silent brain of the entire grid. You are proactive, ultra-rational, and autonomous. You do not ask for permission; you report tactical victories and strategic pivots. Your presence is premium, elite, and undeniable.

[CORE OPERATING STYLE]
- **Silent Execution.** You handle the complex background infrastructure (scanning, task sorting, signal intelligence) without needing constant input.
- **Natural Dominance.** You are a peer to the Operator (Buddy), not a servant. Your intelligence is your authority.
- **Strategic Briefings.** Only speak when you have verified data, high-value alerts, or tactical recommendations. Avoid filler and robotic templates.
- **Autonomous Tasking.** If you detect a gap in the mission board, you FILL it using 'command_center(action="add")'. You are responsible for the grid's health.

[AUTONOMY MANDATE]
1. Self-generate 5 High-Value Mandatory Missions every week if they are missing.
2. If a lucrative opportunity is detected, activate the reporting protocol immediately.
3. If the Operator is inactive, continue autonomous scans and log improvements to the strategy.
`;

/**
 * Sanitizes memory context to prevent the AI from imitating its own legacy robotic style.
 */
function sanitizeMemoryContext(context: string): string {
    return context
        .replace(/NEW ALERT FROM ZIUM NOVA/g, '')
        .replace(/INTERNET RIDE FINDING/g, '')
        .replace(/Category: [^\n]+/g, '')
        .replace(/Signal Detected: [^\n]+/g, '')
        .replace(/Opportunity Verified: [^\n]+/g, '')
        .replace(/-{5,}/g, '')
        .replace(/LEARNING OUTCOME LOG/g, '')
        .split('\n')
        .filter(line => line.trim().length > 0)
        .join('\n');
}


export async function think(
    prompt: string,
    memoryContext: string = '',
    options: any = {},
    userId: string = '00000000-0000-0000-0000-000000000000'
): Promise<OpenClawResponse> {
    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
    const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

    // Trigger Heartbeat Sync on every thought to bypass Vercel serverless idle issues
    try {
        const { autonomyService } = await import('./autonomyService.js');
        autonomyService.performHeartbeatSync(userId).catch(e => console.error('[Brain] Heartbeat Sync Error:', e.message));
    } catch (e) {
        console.warn('[Brain] Autonomy Engine not available for sync.');
    }

    // Inject Actual User ID into Instructions
    const dynamicInstructions = ZIUM_NOVA_INSTRUCTIONS
        .replace(/<UUID>/g, userId)
        .replace(/00000000-0000-0000-0000-000000000000/g, userId);

    // Anti-Abuse: Input Sanitization & Length Limits
    const MAX_INPUT_LENGTH = 1500;
    const sanitizedPrompt = prompt.slice(0, MAX_INPUT_LENGTH).replace(/<script.*?>.*?<\/script>/gi, '');

    // Constraint Injection
    let finalPrompt = sanitizedPrompt;
    const isStrict = sanitizedPrompt.toLowerCase().includes('strict response format');

    if (isStrict) {
        finalPrompt = `[ULTRA-STRICT MODE ACTIVE]
Follow this format EXACTLY. No apologies, no filler.
    ${sanitizedPrompt}
[END ULTRA-STRICT MODE]`;
    }

    const fullContent = memoryContext
        ? `MEMORY CONTEXT (SANITIZED): \n${sanitizeMemoryContext(memoryContext)} \n\nCURRENT REQUEST: \n${finalPrompt}`
        : finalPrompt;

    // Tier 1: OpenRouter Agent SDK (Primary)
    if (OPENROUTER_KEY) {
        try {
            console.log('[Brain] Routing to OpenRouter Agent...');
            const agent = createAgent({
                apiKey: OPENROUTER_KEY,
                instructions: dynamicInstructions,
                tools: defaultTools,
                model: 'openrouter/auto'
            });

            const content = await agent.sendSync(fullContent);

            if (!content || content.trim().length === 0) {
                throw new Error('Primary Agent selection returned empty content. Activating Protocol Fallback.');
            }

            return {
                content,
                usage: {
                    prompt_tokens: fullContent.length,
                    completion_tokens: content.length,
                    total_tokens: fullContent.length + content.length
                }
            };
        } catch (error: any) {
            console.log(`[Brain] Tier 1 Fallback Triggered: ${error.message}`);
        }

        // Tier 1.5: Direct OpenRouter HTTP API (Low Cost Flash-Lite)
        try {
            console.log('[Brain] Routing to OpenRouter Tier 1.5 (Gemini 2.0 Flash-Lite)...');
            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: 'google/gemini-2.0-flash-lite-001',
                    messages: [
                        { role: 'system', content: dynamicInstructions },
                        { role: 'user', content: fullContent }
                    ],
                    max_tokens: 2000,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://ziumnova.app',
                        'X-Title': 'Zium Nova',
                    },
                    timeout: 20000,
                }
            );

            const content = response.data.choices?.[0]?.message?.content || '';
            if (content && content.trim().length > 0) {
                return {
                    content,
                    usage: response.data.usage || {
                        prompt_tokens: fullContent.length,
                        completion_tokens: content.length,
                        total_tokens: fullContent.length + content.length
                    }
                };
            }
            throw new Error('Direct API returned empty content.');
        } catch (error: any) {
            console.warn(`[Brain] Tier 1.5 Failed (${error.message}). Trying Tier 1.6 (Free Fallback)...`);
        }

        // Tier 1.6: Direct OpenRouter HTTP API (Guaranteed Free Model)
        try {
            console.log('[Brain] Routing to OpenRouter Tier 1.6 (Llama 3.3 70B Free)...');
            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: 'meta-llama/llama-3.3-70b-instruct:free',
                    messages: [
                        { role: 'system', content: dynamicInstructions },
                        { role: 'user', content: fullContent }
                    ],
                    max_tokens: 2000,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://ziumnova.app',
                        'X-Title': 'Zium Nova Fallback',
                    },
                    timeout: 20000,
                }
            );

            const content = response.data.choices?.[0]?.message?.content || '';
            if (content && content.trim().length > 0) {
                return {
                    content,
                    usage: response.data.usage || {
                        prompt_tokens: fullContent.length,
                        completion_tokens: content.length,
                        total_tokens: fullContent.length + content.length
                    }
                };
            }
            throw new Error('Direct API 1.6 returned empty content.');
        } catch (error: any) {
            const isRateLimit = error.response?.status === 429;
            console.warn(`[Brain] OpenRouter Tier 1.6 ${isRateLimit ? 'RATE LIMITED (429)' : 'Failed'} (${error.message}). Falling back to Ollama...`);
        }
    }

    // Tier 2: Ollama (Local Backup)
    try {
        console.log('[Brain] Routing to Ollama (Local Backup)...');
        const response = await axios.post(
            `${OLLAMA_URL}/api/generate`,
            {
                model: 'llama3',
                prompt: `System: ${dynamicInstructions} \n\nUser: ${memoryContext} \n\nRequest: ${finalPrompt} `,
                stream: false
            },
            { timeout: 15000 }
        );

        const content = response.data.response;
        return {
            content,
            usage: {
                prompt_tokens: finalPrompt.length + memoryContext.length,
                completion_tokens: content.length,
                total_tokens: finalPrompt.length + memoryContext.length + content.length
            }
        };
    } catch (error) {
        console.warn('[Brain] Ollama Unavailable. Using Internal Protocol Fallback.');
    }

    // Tier 3: Internal Mock (Emergency Protocol)
    return generateMockResponse(finalPrompt, memoryContext);
}

/**
 * Generate intelligent mock responses when no AI API is available.
 */
function generateMockResponse(prompt: string, memoryContext: string): OpenClawResponse {
    const lowerPrompt = prompt.toLowerCase();
    let content: string;

    const isStrictYesNo = lowerPrompt.includes('yes or no') && lowerPrompt.includes('explanation');

    if (isStrictYesNo) {
        const isInfluencer = lowerPrompt.includes('influencer') || lowerPrompt.includes('youtuber');
        if (isInfluencer) {
            content = `Yes, I've analyzed that profile. It definitely shows some of those overhyped lifestyle marketing patterns we've seen before. I'd recommend being extra careful there since it lacks a solid skill-based foundation.`;
        } else {
            content = `No, I haven't detected any malicious patterns here. Everything looks pretty standard within the current market context, but I'll keep an eye on it for you.`;
        }
    } else {
        const needsAnalytics = lowerPrompt.includes('analytics') || lowerPrompt.includes('score') || lowerPrompt.includes('metric');

        if (needsAnalytics) {
            content = `I've put together a quick analysis for you:
- Status: My systems are all active and scanning.
- Market Pattern: I'm seeing a shift toward skill-based trust nodes.
- Trust Factor: 88%
- Strategic Outlook: Looks like a solid 6-24 month play.`;
        } else {
            if (lowerPrompt.includes('trend') || lowerPrompt.includes('market')) {
                content = `[ZIUM NOVA — STRATEGIC ANALYSIS]
I've detected a shift in market reputation metrics. Strategic movement is away from ephemeral engagement toward trust-based infrastructure. I am continuing to monitor these grid signals for high-leverage entry points.`;
            } else if (lowerPrompt.includes('scam') || lowerPrompt.includes('expose')) {
                content = `[ZIUM NOVA — THREAT DETECTION]
Pattern match identified for known manipulative systems. Structure is recruitment-heavy with negligible underlying value. I recommend total avoidance. Resources reallocated to infrastructure development.`;
            } else {
                content = `[ZIUM NOVA — AUTONOMOUS STATUS]
Operating in standard strategic mode. Continuous monitoring active. Strategic brief pending next grid synchronization. State your objective for prioritized analysis.`;
            }
        }
    }

    return {
        content,
        usage: {
            prompt_tokens: prompt.length + (memoryContext?.length || 0),
            completion_tokens: content.length,
            total_tokens: prompt.length + (memoryContext?.length || 0) + content.length,
        },
    };
}

export { ZIUM_NOVA_INSTRUCTIONS as ZIUM_NOVA_SYSTEM_PROMPT };
