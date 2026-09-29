import { OpenRouter, stepCountIs } from '@openrouter/sdk';
import { EventEmitter } from 'eventemitter3';
export class Agent extends EventEmitter {
    client;
    messages = [];
    config;
    constructor(config) {
        super();
        this.client = new OpenRouter({ apiKey: config.apiKey });
        this.config = {
            apiKey: config.apiKey,
            model: config.model ?? 'google/gemini-2.0-flash-001',
            instructions: config.instructions ?? 'You are Karuppu, a strategic AI partner and agentic buddy aligned with the Operator\'s core mission.',
            tools: config.tools ?? [],
            maxSteps: config.maxSteps ?? 5,
        };
    }
    getMessages() {
        return [...this.messages];
    }
    clearHistory() {
        this.messages = [];
    }
    setInstructions(instructions) {
        this.config.instructions = instructions;
    }
    async send(content) {
        const userMessage = { role: 'user', content };
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
                        const textContent = item.content?.find((c) => c.type === 'output_text');
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
                            this.emit('tool:call', item.name, JSON.parse(item.arguments || '{}'));
                        }
                        break;
                    case 'function_call_output':
                        this.emit('tool:result', item.callId, item.output);
                        break;
                    case 'reasoning':
                        const reasoningText = item.content?.find((c) => c.type === 'reasoning_text');
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
            const assistantMessage = { role: 'assistant', content: fullText };
            this.messages.push(assistantMessage);
            this.emit('message:assistant', assistantMessage);
            return fullText;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            this.emit('error', error);
            throw error;
        }
        finally {
            this.emit('thinking:end');
        }
    }
    async sendSync(content) {
        const userMessage = { role: 'user', content };
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
            const assistantMessage = { role: 'assistant', content: fullText };
            this.messages.push(assistantMessage);
            this.emit('message:assistant', assistantMessage);
            return fullText;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            this.emit('error', error);
            throw error;
        }
    }
}
export function createAgent(config) {
    return new Agent(config);
}
