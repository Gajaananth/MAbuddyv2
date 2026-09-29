import { KaruppuLogo } from '../components/KaruppuLogo';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Send,
    Terminal,
    User,
    Square,
    Pencil,
    ChevronDown,
    Cpu,
    Zap,
    BarChart3,
    RefreshCcw,
    Sparkles,
    Search,
    Check,
    Layers,
    ShieldCheck,
    X,
    Activity
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatService } from '../services/api';
import type { Message } from '../types';

export interface ModelItem {
    id: string;
    label: string;
    provider: string;
    providerName: string;
    context: string;
    badge?: string;
    description: string;
}

const DEFAULT_MODELS: ModelItem[] = [
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
        badge: 'FAST',
        description: 'Cost-efficient, low latency instruction model.'
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

const PROVIDER_FILTERS = [
    { id: 'all', label: 'All Engines' },
    { id: 'auto', label: 'Auto Grid' },
    { id: 'groq', label: 'Groq LPU' },
    { id: 'nvidia', label: 'NVIDIA NIM' },
    { id: 'gemini', label: 'Gemini' },
    { id: 'mistral', label: 'Mistral' },
    { id: 'sambanova', label: 'SambaNova' },
    { id: 'huggingface', label: 'Hugging Face' },
    { id: 'cloudflare', label: 'Cloudflare' },
    { id: 'openrouter', label: 'OpenRouter' }
];

const ChatPage: React.FC = () => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | undefined>(undefined);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Edit and modal states
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');
    const [showModeMenu, setShowModeMenu] = useState(false);
    const [showModelMenu, setShowModelMenu] = useState(false);

    // Defaults to Adaptive Auto Fallback
    const [selectedModel, setSelectedModel] = useState<string>('auto');
    const [modelCatalog, setModelCatalog] = useState<ModelItem[]>(DEFAULT_MODELS);
    const [providerStatus, setProviderStatus] = useState<Record<string, any>>({});
    const [modelSearch, setModelSearch] = useState('');
    const [providerTab, setProviderTab] = useState('all');

    const [publishToMoltbook, setPublishToMoltbook] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const modelMenuRef = useRef<HTMLDivElement>(null);

    // Load dynamic models catalog from backend on mount
    useEffect(() => {
        const loadModels = async () => {
            try {
                const res = await chatService.getModels();
                if (res.data?.success && res.data?.data?.models) {
                    setModelCatalog(res.data.data.models);
                    if (res.data.data.providers) {
                        setProviderStatus(res.data.data.providers);
                    }
                }
            } catch {
                // Fall back gracefully to bundled DEFAULT_MODELS
            }
        };
        loadModels();
    }, []);

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close model menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
                setShowModelMenu(false);
            }
        };
        if (showModelMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showModelMenu]);

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollButton(!isNearBottom);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Modes menu configuration
    const modes = [
        { label: 'Normal Mode', command: 'MODE NORMAL', icon: <User size={14} /> },
        { label: 'Strategic Mode', command: 'MODE STRATEGIC', icon: <Cpu size={14} /> },
        { label: 'Execution Mode', command: 'MODE EXECUTION', icon: <Zap size={14} /> },
        { label: 'Analytics Mode', command: 'Activate Analytics Mode', icon: <BarChart3 size={14} /> },
        { label: 'Strict Response Format', command: 'STRICT RESPONSE FORMAT', icon: <KaruppuLogo size={14} /> },
        { label: 'Reset Default', command: 'RESET MODE', icon: <RefreshCcw size={14} /> },
    ];

    // Polling mechanics
    useEffect(() => {
        let pollInterval: ReturnType<typeof setInterval>;
        if (conversationId && !loading) {
            pollInterval = setInterval(async () => {
                try {
                    const lastMessage = messages[messages.length - 1];
                    const since = lastMessage ? lastMessage.created_at : undefined;
                    const res = await chatService.pollMessages(conversationId, since);

                    if (res.data?.data?.messages && res.data.data.messages.length > 0) {
                        setMessages(prev => {
                            const existingIds = new Set(prev.map(m => m.id));
                            const newMsgs = res.data.data.messages.filter((m: any) => !existingIds.has(m.id));
                            if (newMsgs.length === 0) return prev;
                            return [...prev, ...newMsgs];
                        });
                    }
                } catch (e) {
                    console.error('Polling error', e);
                }
            }, 30000);
        }
        return () => clearInterval(pollInterval);
    }, [conversationId, messages, loading]);

    useEffect(() => {
        if (!scrollContainerRef.current) {
            scrollToBottom();
            return;
        }
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
        if (isNearBottom) {
            scrollToBottom();
        }
    }, [messages, loading]);

    // Filter models based on search and selected provider tab
    const filteredModels = useMemo(() => {
        return modelCatalog.filter(m => {
            if (providerTab !== 'all' && m.provider !== providerTab) {
                return false;
            }
            if (!modelSearch.trim()) return true;
            const q = modelSearch.toLowerCase();
            return (
                m.label.toLowerCase().includes(q) ||
                m.id.toLowerCase().includes(q) ||
                m.providerName.toLowerCase().includes(q) ||
                (m.badge && m.badge.toLowerCase().includes(q)) ||
                m.description.toLowerCase().includes(q)
            );
        });
    }, [modelCatalog, providerTab, modelSearch]);

    const activeModelObj = useMemo(() => {
        return modelCatalog.find(m => m.id === selectedModel) || DEFAULT_MODELS[0];
    }, [modelCatalog, selectedModel]);

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setLoading(false);
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            conversation_id: conversationId || '',
            role: 'user',
            content: input,
            metadata: { model: selectedModel },
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        const messageText = input;
        setInput('');
        setLoading(true);
        setTimeout(scrollToBottom, 50);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const response = await chatService.sendMessage(messageText, conversationId, publishToMoltbook, controller.signal, selectedModel);
            const { data } = response.data;

            const novaMessage: Message = {
                ...data.message,
                metadata: typeof data.message.metadata === 'string' ? JSON.parse(data.message.metadata) : data.message.metadata
            };

            setConversationId(data.conversation_id);
            setMessages((prev) => [...prev, novaMessage]);
        } catch (error: any) {
            if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
                setMessages((prev) => [...prev, {
                    id: (Date.now() + 1).toString(),
                    conversation_id: conversationId || '',
                    role: 'nova',
                    content: '⏹ Response stopped by operator.',
                    metadata: null,
                    created_at: new Date().toISOString(),
                }]);
            } else {
                console.error('Chat primary attempt failed:', error);

                // Auto-fallback recovery: if a specific model failed, automatically retry with 'auto'
                if (selectedModel !== 'auto') {
                    try {
                        const fallbackRes = await chatService.sendMessage(messageText, conversationId, publishToMoltbook, undefined, 'auto');
                        const { data } = fallbackRes.data;
                        const novaMessage: Message = {
                            ...data.message,
                            metadata: typeof data.message.metadata === 'string' ? JSON.parse(data.message.metadata) : data.message.metadata
                        };
                        setConversationId(data.conversation_id);
                        setMessages((prev) => [...prev, novaMessage]);
                        return;
                    } catch (fallbackErr) {
                        console.error('Auto fallback recovery error:', fallbackErr);
                    }
                }

                const errorMsg = error?.response?.data?.error || error?.message || 'Neural grid connection timeout';
                setMessages((prev) => [...prev, {
                    id: (Date.now() + 1).toString(),
                    conversation_id: conversationId || '',
                    role: 'nova',
                    content: `⚠️ **Transmission Error:** ${errorMsg}\n\n*Auto-switched to **Adaptive Neural Grid (Auto Fallback)** to route across all active API keys.*`,
                    metadata: null,
                    created_at: new Date().toISOString(),
                }]);
                setSelectedModel('auto');
            }
        } finally {
            abortControllerRef.current = null;
            setLoading(false);
        }
    };

    const handleModeSelect = async (command: string) => {
        setShowModeMenu(false);
        if (loading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            conversation_id: conversationId || '',
            role: 'user',
            content: command,
            metadata: { model: selectedModel },
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setLoading(true);
        setTimeout(scrollToBottom, 50);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const response = await chatService.sendMessage(command, conversationId, publishToMoltbook, controller.signal, selectedModel);
            const { data } = response.data;

            const novaMessage: Message = {
                id: (Date.now() + 1).toString(),
                conversation_id: data.conversation_id,
                role: 'nova',
                content: data.message.content,
                metadata: data.message.metadata,
                created_at: new Date().toISOString(),
            };

            setConversationId(data.conversation_id);
            setMessages((prev) => [...prev, novaMessage]);
        } catch (error: any) {
            if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
                const stopMessage: Message = {
                    id: (Date.now() + 2).toString(),
                    conversation_id: conversationId || '',
                    role: 'nova',
                    content: '⏹ Response stopped by operator.',
                    metadata: null,
                    created_at: new Date().toISOString(),
                };
                setMessages((prev) => [...prev, stopMessage]);
            }
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleEditStart = (index: number) => {
        setEditingIndex(index);
        setEditContent(messages[index].content);
    };

    const handleEditCancel = () => {
        setEditingIndex(null);
        setEditContent('');
    };

    const handleEditSave = async () => {
        if (editingIndex === null || !editContent.trim()) return;

        const trimmedMessages = messages.slice(0, editingIndex);
        const editedMessage: Message = {
            ...messages[editingIndex],
            content: editContent.trim(),
            created_at: new Date().toISOString(),
        };
        trimmedMessages.push(editedMessage);

        setMessages(trimmedMessages);
        setEditingIndex(null);
        setEditContent('');
        setLoading(true);
        setTimeout(scrollToBottom, 50);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const response = await chatService.sendMessage(editContent.trim(), conversationId, publishToMoltbook, controller.signal, selectedModel);
            const { data } = response.data;

            const novaMessage: Message = {
                id: (Date.now() + 1).toString(),
                conversation_id: data.conversation_id,
                role: 'nova',
                content: data.message.content,
                metadata: data.message.metadata,
                created_at: new Date().toISOString(),
            };

            setConversationId(data.conversation_id);
            setMessages((prev) => [...prev, novaMessage]);
        } catch (error: any) {
            if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
                setMessages((prev) => [...prev, {
                    id: (Date.now() + 1).toString(),
                    conversation_id: conversationId || '',
                    role: 'nova',
                    content: '⏹ Response stopped by operator.',
                    metadata: null,
                    created_at: new Date().toISOString(),
                }]);
            } else {
                console.error('Chat Error:', error);
            }
        } finally {
            abortControllerRef.current = null;
            setLoading(false);
        }
    };

    const getProviderColor = (provider: string) => {
        switch (provider) {
            case 'auto':
                return 'text-nova-accent border-nova-accent/40 bg-nova-accent/10';
            case 'groq':
                return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
            case 'nvidia':
                return 'text-teal-400 border-teal-500/40 bg-teal-500/10';
            case 'gemini':
                return 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10';
            case 'mistral':
                return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
            case 'sambanova':
                return 'text-purple-400 border-purple-500/40 bg-purple-500/10';
            case 'huggingface':
                return 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10';
            case 'cloudflare':
                return 'text-orange-400 border-orange-500/40 bg-orange-500/10';
            case 'openrouter':
                return 'text-fuchsia-400 border-fuchsia-500/40 bg-fuchsia-500/10';
            default:
                return 'text-white/60 border-white/20 bg-white/5';
        }
    };

    return (
        <div className="flex-1 flex flex-col min-w-0 max-w-5xl mx-auto w-full h-[calc(100vh-80px)] lg:h-[calc(100vh-40px)] animate-in fade-in duration-500">

            {/* Tactical Header */}
            <header className="shrink-0 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-nova-bg/95 sticky top-0 z-30 py-3 gap-3 border-b border-nova-border/50 px-2 sm:px-0">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-nova-accent/10 border border-nova-accent/20 flex items-center justify-center text-nova-accent group relative shadow-2xl shadow-nova-accent/5 shrink-0">
                        <KaruppuLogo size={24} className="group-hover:scale-110 transition-transform lg:size-30" />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-nova-accent rounded-full border-2 border-nova-bg animate-pulse"></div>
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-base lg:text-xl font-black text-white tracking-tight uppercase truncate leading-none mb-1">
                            Neural Intelligence Grid
                        </h2>
                        <div className="flex items-center gap-2">
                            <p className="text-[9px] lg:text-[10px] font-bold text-nova-text-dim flex items-center gap-1 opacity-70">
                                <ShieldCheck size={11} className="text-nova-accent" />
                                7+ Providers Online • {modelCatalog.length} Engines
                            </p>
                            <span className="w-1 h-1 rounded-full bg-white/20"></span>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-nova-accent animate-pulse' : 'bg-green-500'}`}></span>
                                <span className="text-[9px] font-black text-nova-text-dim uppercase tracking-widest">
                                    {loading ? 'Processing' : 'Active Grid'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto self-end sm:self-auto">
                    {messages.length > 0 && (
                        <button 
                            onClick={() => { if (window.confirm('Clear tactical history?')) setMessages([]); }}
                            className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-nova-border hover:bg-white/5 text-[10px] text-nova-text-dim transition-all uppercase font-black tracking-widest active:scale-95"
                        >
                            Purge
                        </button>
                    )}
                    <button 
                        onClick={() => setPublishToMoltbook(!publishToMoltbook)}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 ${publishToMoltbook ? 'bg-nova-accent/10 border-nova-accent/40 text-nova-accent' : 'bg-white/5 border-nova-border text-nova-text-dim'}`}
                    >
                        <KaruppuLogo size={12} className={publishToMoltbook ? 'animate-pulse' : ''} />
                        Moltbook: {publishToMoltbook ? 'ON' : 'OFF'}
                    </button>
                </div>
            </header>

            {/* Neural Message Feed */}
            <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-4 space-y-6 sm:space-y-8 scroll-smooth custom-scrollbar pb-10"
            >
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-60 px-6 py-16">
                        <div className="relative">
                            <KaruppuLogo size={64} className="text-nova-accent animate-bounce [animation-duration:3s]" />
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-black flex items-center justify-center">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                            </div>
                        </div>
                        <div className="max-w-md">
                            <h3 className="text-sm font-black text-white mb-2 uppercase tracking-[0.25em]">
                                Adaptive Neural Grid Ready
                            </h3>
                            <p className="text-[11px] sm:text-xs leading-relaxed text-nova-text-dim font-medium">
                                Connected to 7+ providers and 35+ state-of-the-art models. Automatic multi-provider fallback is active to ensure zero downtime.
                            </p>
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-3 duration-300 w-full`}>
                        <div className={`max-w-[95%] sm:max-w-[85%] lg:max-w-[78%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            
                            {msg.role === 'user' && !loading && editingIndex === null && (
                                <div className="flex items-center gap-2 mb-1 px-1">
                                    <button onClick={() => handleEditStart(i)} className="p-1 hover:text-nova-accent transition-colors opacity-30 hover:opacity-100">
                                        <Pencil size={10} />
                                    </button>
                                </div>
                            )}

                            {msg.role === 'user' && editingIndex === i ? (
                                <div className="w-full space-y-2 lg:min-w-[400px]">
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="w-full bg-nova-bg border-2 border-nova-accent text-white p-4 rounded-2xl focus:outline-none text-sm font-medium resize-none shadow-[0_0_30px_rgba(0,242,255,0.1)]"
                                        rows={3} autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={handleEditCancel} className="px-4 py-2 rounded-xl bg-white/5 text-[10px] font-black text-nova-text-dim uppercase">Abort</button>
                                        <button onClick={handleEditSave} className="px-4 py-2 rounded-xl bg-nova-accent text-nova-bg text-[10px] font-black uppercase">Resync</button>
                                    </div>
                                </div>
                            ) : (
                                <div className={`px-5 py-4 lg:px-6 lg:py-5 rounded-2xl lg:rounded-3xl border shadow-xl transition-all ${msg.role === 'user'
                                    ? 'bg-nova-accent/10 border-nova-accent/30 text-white rounded-tr-none'
                                    : 'glass border-nova-border/60 text-nova-text rounded-tl-none'
                                }`}>
                                    <div className="prose prose-invert prose-sm max-w-none font-medium leading-relaxed">
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                code: ({ children }) => <code className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-[10px] font-mono text-nova-accent">{children}</code>,
                                                h2: ({ children }) => <h2 className="text-nova-accent text-xs font-black uppercase mt-4 mb-2 tracking-widest">{children}</h2>,
                                                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                                                li: ({ children }) => <li className="text-[13px]">{children}</li>,
                                            }}
                                        >
                                            {msg.content.split('TASK_CENTER_UPDATE:')[0]}
                                        </ReactMarkdown>
                                    </div>

                                    {/* Real-Time Engine & Provider Metadata Footer */}
                                    {msg.role === 'nova' && msg.metadata && (
                                        <div className="mt-3 pt-2.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono text-nova-text-dim/70">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                <span className="uppercase font-bold text-white tracking-wider">
                                                    {msg.metadata.provider || 'Neural Grid'}
                                                </span>
                                                <span className="opacity-40">•</span>
                                                <span className="text-nova-accent font-semibold">{msg.metadata.model || 'auto'}</span>
                                                {msg.metadata.fallback && (
                                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[8px] font-bold tracking-wider">
                                                        AUTO-FALLBACK
                                                    </span>
                                                )}
                                            </div>
                                            {msg.metadata.usage && (msg.metadata.usage.total_tokens || msg.metadata.usage.completion_tokens) && (
                                                <span className="opacity-50">
                                                    {msg.metadata.usage.total_tokens || msg.metadata.usage.completion_tokens} tokens
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start animate-pulse">
                        <div className="flex items-center gap-3">
                            <div className="glass border-nova-border p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
                                <div className="flex gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-nova-accent rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-nova-accent rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                    <div className="w-1.5 h-1.5 bg-nova-accent rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                </div>
                                <span className="text-[10px] font-black text-nova-accent uppercase tracking-widest">
                                    Adaptive Neural Routing...
                                </span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Strategic Input Field & Neural Model Matrix */}
            <div className="shrink-0 pt-3 pb-safe lg:pb-3 border-t border-nova-border/30 bg-nova-bg/95 relative z-40">
                {showScrollButton && (
                    <button onClick={scrollToBottom} className="absolute -top-14 right-2 sm:right-0 p-3 rounded-full bg-nova-accent text-nova-bg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300 active:scale-90">
                        <ChevronDown size={20} />
                    </button>
                )}

                <div className="mb-2.5 flex items-center gap-2 relative">
                    {/* Modern High-Tech Model Selector */}
                    <div className="relative" ref={modelMenuRef}>
                        <button
                            onClick={() => { setShowModelMenu(!showModelMenu); setShowModeMenu(false); }}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl glass border transition-all active:scale-95 text-[10px] font-black uppercase tracking-wider ${
                                selectedModel === 'auto'
                                    ? 'border-nova-accent/50 text-white shadow-[0_0_20px_rgba(0,242,255,0.15)] bg-nova-accent/10'
                                    : 'border-nova-border/60 text-nova-text hover:border-nova-accent/40'
                            }`}
                        >
                            {selectedModel === 'auto' ? (
                                <Sparkles size={13} className="text-nova-accent animate-pulse" />
                            ) : (
                                <Zap size={13} className="text-nova-accent" />
                            )}
                            <span className="truncate max-w-[200px] sm:max-w-[280px]">
                                {activeModelObj.label}
                            </span>
                            <ChevronDown size={12} className={`transition-transform duration-300 opacity-60 ${showModelMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Tactical Neural Model Matrix Modal */}
                        {showModelMenu && (
                            <div className="absolute left-0 bottom-full mb-3 w-[calc(100vw-24px)] sm:w-[520px] md:w-[600px] glass border-2 border-nova-border/80 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.85)] animate-in fade-in slide-in-from-bottom-3 duration-250 z-50">
                                
                                {/* Modal Header */}
                                <div className="p-3.5 border-b border-white/10 bg-black/40 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Layers size={14} className="text-nova-accent" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                                            Neural Model Matrix
                                        </p>
                                        <span className="px-2 py-0.5 rounded-full bg-nova-accent/15 border border-nova-accent/30 text-[9px] font-bold text-nova-accent">
                                            35+ Engines
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => setShowModelMenu(false)}
                                        className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>

                                {/* Search Bar */}
                                <div className="p-2.5 border-b border-white/5 bg-white/[0.02]">
                                    <div className="relative flex items-center">
                                        <Search size={13} className="absolute left-3 text-white/40" />
                                        <input
                                            type="text"
                                            value={modelSearch}
                                            onChange={(e) => setModelSearch(e.target.value)}
                                            placeholder="Search models by name, provider, speed, or capabilities..."
                                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-nova-accent transition-all"
                                        />
                                        {modelSearch && (
                                            <button 
                                                onClick={() => setModelSearch('')}
                                                className="absolute right-2.5 p-1 text-white/40 hover:text-white"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Provider Category Tabs */}
                                <div className="p-2 border-b border-white/5 bg-black/20 flex items-center gap-1.5 overflow-x-auto custom-scrollbar no-scrollbar">
                                    {PROVIDER_FILTERS.map(tab => {
                                        const isConfigured = tab.id !== 'all' && tab.id !== 'auto' && providerStatus[tab.id]?.configured;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setProviderTab(tab.id)}
                                                className={`shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                                    providerTab === tab.id
                                                        ? 'bg-nova-accent text-nova-bg font-black shadow-md shadow-nova-accent/20'
                                                        : 'text-nova-text-dim hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                <span>{tab.label}</span>
                                                {isConfigured && (
                                                    <span className={`w-1.5 h-1.5 rounded-full ${providerTab === tab.id ? 'bg-nova-bg' : 'bg-emerald-400'}`}></span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Pinned Auto Fallback Option */}
                                {providerTab === 'all' || providerTab === 'auto' ? (
                                    <div className="p-2 bg-nova-accent/[0.03] border-b border-white/5">
                                        <button
                                            onClick={() => { setSelectedModel('auto'); setShowModelMenu(false); }}
                                            className={`w-full p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                                                selectedModel === 'auto'
                                                    ? 'border-nova-accent bg-nova-accent/15 shadow-[0_0_20px_rgba(0,242,255,0.15)]'
                                                    : 'border-nova-accent/30 bg-black/40 hover:border-nova-accent/60'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles size={14} className="text-nova-accent animate-pulse" />
                                                    <span className="text-xs font-black text-white uppercase tracking-wider">
                                                        Adaptive Neural Grid (Auto Fallback)
                                                    </span>
                                                </div>
                                                <span className="px-2 py-0.5 rounded-full bg-nova-accent text-nova-bg text-[8px] font-black uppercase tracking-widest shadow-sm">
                                                    RECOMMENDED
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-nova-text-dim leading-relaxed">
                                                Automatically routes to the fastest active provider. Zero-downtime cascade: if any key or rate limit triggers, instantly fails over across all 7+ providers.
                                            </p>
                                        </button>
                                    </div>
                                ) : null}

                                {/* Models List */}
                                <div className="max-h-[320px] overflow-y-auto p-2 space-y-1.5 custom-scrollbar divide-y divide-white/[0.03]">
                                    {filteredModels
                                        .filter(m => m.id !== 'auto')
                                        .map((m) => (
                                            <button
                                                key={m.id}
                                                onClick={() => { setSelectedModel(m.id); setShowModelMenu(false); }}
                                                className={`w-full p-2.5 rounded-xl text-left transition-all flex items-start justify-between gap-3 group pt-2 ${
                                                    selectedModel === m.id
                                                        ? 'bg-nova-accent/10 border border-nova-accent/50'
                                                        : 'hover:bg-white/[0.04] border border-transparent'
                                                }`}
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase border ${getProviderColor(m.provider)}`}>
                                                            {m.providerName}
                                                        </span>
                                                        <span className="text-xs font-black text-white truncate group-hover:text-nova-accent transition-colors">
                                                            {m.label}
                                                        </span>
                                                        {m.badge && (
                                                            <span className="px-1.5 py-0.2 rounded bg-white/10 text-white/80 text-[8px] font-mono">
                                                                {m.badge}
                                                            </span>
                                                        )}
                                                        <span className="text-[8px] font-mono text-nova-text-dim/60 ml-auto">
                                                            {m.context}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-nova-text-dim leading-relaxed line-clamp-1">
                                                        {m.description}
                                                    </p>
                                                    <p className="text-[8px] font-mono text-white/30 truncate mt-0.5">
                                                        ID: {m.id}
                                                    </p>
                                                </div>
                                                {selectedModel === m.id && (
                                                    <div className="w-5 h-5 rounded-full bg-nova-accent/20 border border-nova-accent flex items-center justify-center text-nova-accent shrink-0 mt-1">
                                                        <Check size={11} />
                                                    </div>
                                                )}
                                            </button>
                                        ))}

                                    {filteredModels.filter(m => m.id !== 'auto').length === 0 && (
                                        <div className="p-8 text-center text-nova-text-dim text-xs">
                                            No models found matching "{modelSearch}".
                                        </div>
                                    )}
                                </div>

                                {/* Modal Footer Quick Status */}
                                <div className="p-2.5 bg-black/60 border-t border-white/5 flex items-center justify-between text-[9px] text-nova-text-dim">
                                    <div className="flex items-center gap-2">
                                        <Activity size={11} className="text-emerald-400" />
                                        <span>Cascading fallback guaranteed across all available keys</span>
                                    </div>
                                    <button 
                                        onClick={() => { setSelectedModel('auto'); setShowModelMenu(false); }}
                                        className="text-nova-accent font-bold hover:underline"
                                    >
                                        Reset to Auto Grid
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* System Mode Menu */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowModeMenu(!showModeMenu); setShowModelMenu(false); }}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-xl glass border border-nova-border/50 text-[10px] font-black uppercase tracking-wider hover:border-nova-accent transition-all active:scale-95 text-nova-text"
                        >
                            <Terminal size={12} className="text-nova-text-dim" />
                            <span>System Mode</span>
                            <ChevronDown size={12} className={`transition-transform duration-300 ${showModeMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showModeMenu && (
                            <div className="absolute left-0 bottom-full mb-3 w-64 glass border-2 border-nova-border rounded-2xl overflow-hidden shadow-2xl animate-in divide-y divide-white/5 slide-in-from-bottom-4 duration-300 z-50">
                                {modes.map((mode) => (
                                    <button
                                        key={mode.label}
                                        onClick={() => handleModeSelect(mode.command)}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-nova-accent/10 transition-colors text-left group"
                                    >
                                        <div className="text-nova-accent/40 group-hover:text-nova-accent shrink-0">{mode.icon}</div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black text-white uppercase truncate">{mode.label}</p>
                                            <p className="text-[8px] text-nova-text-dim font-mono truncate">{mode.command}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Input Box */}
                <form onSubmit={handleSend} className="relative flex items-end gap-2 px-1">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isMobile) { e.preventDefault(); handleSend(); } }}
                        disabled={loading}
                        placeholder={loading ? "Karuppu is processing..." : "Provide strategic signal or ask anything..."}
                        className="flex-1 bg-white/[0.03] border-2 border-nova-border text-white px-5 py-3.5 pr-14 rounded-2xl focus:outline-none focus:border-nova-accent transition-all placeholder:text-nova-text-dim/30 text-sm font-bold shadow-2xl resize-none max-h-40 min-h-[56px] custom-scrollbar"
                        rows={1}
                    />
                    {loading ? (
                        <button onClick={handleStop} type="button" className="absolute right-2.5 bottom-2.5 w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/20 active:scale-90 transition-all">
                            <Square size={16} fill="currentColor" />
                        </button>
                    ) : (
                        <button type="submit" disabled={!input.trim()} className="absolute right-2.5 bottom-2.5 w-11 h-11 rounded-xl bg-nova-accent flex items-center justify-center text-nova-bg hover:scale-105 active:scale-90 transition-all disabled:opacity-20 shadow-lg shadow-nova-accent/10">
                            <Send size={18} />
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
};

export default ChatPage;
