import { OpenRouter, stepCountIs } from '@openrouter/sdk';
import type { Tool, StreamableOutputItem } from '@openrouter/sdk';
import { EventEmitter } from 'eventemitter3';
import { z } from 'zod';

// Message types
export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// Agent events for hooks (items-based streaming model)
export interface AgentEvents {
    'message:user': (message: Message) => void;
    'message:assistant': (message: Message) => void;
    'item:update': (item: StreamableOutputItem) => void;
    'stream:start': () => void;
    'stream:delta': (delta: string, accumulated: string) => void;
    'stream:end': (fullText: string) => void;
    'tool:call': (name: string, args: unknown) => void;
    'tool:result': (name: string, result: unknown) => void;
    'reasoning:update': (text: string) => void;
    'error': (error: Error) => void;
    'thinking:start': () => void;
    'thinking:end': () => void;
}

// Agent configuration
export interface AgentConfig {
    apiKey: string;
    model?: string;
    instructions?: string;
    tools?: Tool[];
    maxSteps?: number;
}

export class Agent extends EventEmitter<AgentEvents> {
    private client: OpenRouter;
    private messages: Message[] = [];
    private config: Required<Omit<AgentConfig, 'apiKey'>> & { apiKey: string };

    constructor(config: AgentConfig) {
        super();
        this.client = new OpenRouter({ apiKey: config.apiKey });
        this.config = {
            apiKey: config.apiKey,
            model: config.model ?? 'google/gemini-2.0-flash-lite-preview-02-05:free',
            instructions: config.instructions ?? 'You are Karuppu, a strategic AI partner and agentic buddy aligned with the Operator\'s core mission.',
            tools: config.tools ?? [],
            maxSteps: config.maxSteps ?? 5,
        };
    }

    getMessages(): Message[] {
        return [...this.messages];
    }

    clearHistory(): void {
        this.messages = [];
    }

    setInstructions(instructions: string): void {
        this.config.instructions = instructions;
    }

    async send(content: string): Promise<string> {
        const userMessage: Message = { role: 'user', content };
        this.messages.push(userMessage);
        this.emit('message:user', userMessage);
        this.emit('thinking:start');

        try {
            const result = this.client.callModel({
                model: this.config.model,
                instructions: this.config.instructions,
                input: this.messages.map((m) => ({ role: m.role, content: m.content })),
                tools: this.config.tools.length > 0 ? this.config.tools : undefined,
                stopWhen: [stepCountIs(this.config.maxSteps)],
            });

            this.emit('stream:start');
            let fullText = '';

            for await (const item of result.getItemsStream()) {
                this.emit('item:update', item);

                switch (item.type) {
                    case 'message':
                        const textContent = (item as any).content?.find((c: any) => c.type === 'output_text');
                        if (textContent && 'text' in textContent) {
                            const newText = textContent.text;
                            if (newText !== fullText) {
                                const delta = newText.slice(fullText.length);
                                fullText = newText;
                                this.emit('stream:delta', delta, fullText);
                            }
                        }
                        break;
                    case 'function_call':
                        if (item.status === 'completed') {
                            this.emit('tool:call', (item as any).name, JSON.parse((item as any).arguments || '{}'));
                        }
                        break;
                    case 'function_call_output':
                        this.emit('tool:result', (item as any).callId, (item as any).output);
                        break;
                    case 'reasoning':
                        const reasoningText = (item as any).content?.find((c: any) => c.type === 'reasoning_text');
                        if (reasoningText && 'text' in reasoningText) {
                            this.emit('reasoning:update', reasoningText.text);
                        }
                        break;
                }
            }

            if (!fullText) {
                fullText = await result.getText();
            }

            this.emit('stream:end', fullText);

            const assistantMessage: Message = { role: 'assistant', content: fullText };
            this.messages.push(assistantMessage);
            this.emit('message:assistant', assistantMessage);

            return fullText;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            this.emit('error', error);
            throw error;
        } finally {
            this.emit('thinking:end');
        }
    }

    async sendSync(content: string): Promise<string> {
        const userMessage: Message = { role: 'user', content };
        this.messages.push(userMessage);
        this.emit('message:user', userMessage);

        try {
            const result = this.client.callModel({
                model: this.config.model,
                instructions: this.config.instructions,
                input: this.messages.map((m) => ({ role: m.role, content: m.content })),
                tools: this.config.tools.length > 0 ? this.config.tools : undefined,
                stopWhen: [stepCountIs(this.config.maxSteps)],
            });

            const fullText = await result.getText();
            const assistantMessage: Message = { role: 'assistant', content: fullText };
            this.messages.push(assistantMessage);
            this.emit('message:assistant', assistantMessage);

            return fullText;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            this.emit('error', error);
            throw error;
        }
    }
}

export function createAgent(config: AgentConfig): Agent {
    return new Agent(config);
}
