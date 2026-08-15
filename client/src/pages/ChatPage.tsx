import { KaruppuLogo } from '../components/KaruppuLogo';
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Terminal, User, Square, Pencil, ChevronDown, Cpu, Zap, BarChart3, RefreshCcw, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatService, memoryService } from '../services/api';
import type { Message } from '../types';

const ChatPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | undefined>(undefined);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Edit state
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');
    const [showModeMenu, setShowModeMenu] = useState(false);
    const [showModelMenu, setShowModelMenu] = useState(false);
    const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash-lite-preview-02-05');
    const [publishToMoltbook, setPublishToMoltbook] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollButton(!isNearBottom);
    };

    const liveModels = [
        { label: 'Gemini 2.0 Flash', id: 'gemini-2.0-flash-lite-preview-02-05', provider: 'gemini', icon: <Sparkles size={14} /> },
        { label: 'Groq Llama 3.3 70B', id: 'llama-3.3-70b-versatile', provider: 'groq', icon: <Cpu size={14} /> },
        { label: 'NVIDIA Llama 3.1 70B', id: 'meta/llama-3.1-70b-instruct', provider: 'nvidia', icon: <Zap size={14} /> },
    ];

    const modes = [
        { label: 'Normal Mode', command: 'MODE NORMAL', icon: <User size={14} /> },
        { label: 'Strategic Mode', command: 'MODE STRATEGIC', icon: <Cpu size={14} /> },
        { label: 'Execution Mode', command: 'MODE EXECUTION', icon: <Zap size={14} /> },
        { label: 'Analytics Mode', command: 'Activate Analytics Mode', icon: <BarChart3 size={14} /> },
        { label: 'Strict Response Format', command: 'STRICT RESPONSE FORMAT', icon: <KaruppuLogo size={14} /> },
        { label: 'Reset Default', command: 'RESET MODE', icon: <RefreshCcw size={14} /> },
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Polling mechanics
    useEffect(() => {
        let pollInterval: ReturnType<typeof setInterval>;
        if (conversationId && !loading) {
            pollInterval = setInterval(async () => {
                try {
                    const lastMessage = messages[messages.length - 1];
                    const since = lastMessage ? lastMessage.created_at : undefined;
                    const res = await chatService.pollMessages(conversationId, since);
                    
                    if (res.data.data.messages && res.data.data.messages.length > 0) {
                        setMessages(prev => {
                            // Merge ensuring no duplicates
                            const existingIds = new Set(prev.map(m => m.id));
                            const newMsgs = res.data.data.messages.filter((m: any) => !existingIds.has(m.id));
                            if (newMsgs.length === 0) return prev;
                            return [...prev, ...newMsgs];
                        });
                    }
                } catch (e) {
                    console.error('Polling error', e);
                }
            }, 30000); // Poll every 30 seconds
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
    }, [messages]);

    // Load existing conversation if id is in URL
    useEffect(() => {
        const id = searchParams.get('id');
        if (id) {
            setConversationId(id);
            loadConversation(id);
        } else {
            // NEW CHAT: Reset all states if no ID is present
            setConversationId(undefined);
            setMessages([]);
            setLoading(false);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        }
    }, [searchParams]);

    const loadConversation = async (id: string) => {
        try {
            const response = await memoryService.getConversationDetail(id);
            const { messages: loadedMessages } = response.data.data;
            if (loadedMessages && loadedMessages.length > 0) {
                setMessages(loadedMessages.map((m: any) => ({
                    ...m,
                    metadata: typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata,
                })));
                // Mark conversation as read
                await memoryService.markRead(id);
                // Trigger global UI refresh for unread badge
                window.dispatchEvent(new CustomEvent('nova-messages-read'));
            }
        } catch (error) {
            console.error('Load Conversation Error:', error);
        }
    };



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

            // Use the real message object from the database (includes permanent UUID)
            const novaMessage: Message = {
                ...data.message,
                metadata: typeof data.message.metadata === 'string' ? JSON.parse(data.message.metadata) : data.message.metadata
            };

            setConversationId(data.conversation_id);
            setMessages((prev) => [...prev, novaMessage]);
        } catch (error: any) {
            if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
                // User stopped — add a system note
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
                    metadata: { stopped: true },
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

        // Remove all messages from the edited one onwards (user msg + nova reply + everything after)
        const trimmedMessages = messages.slice(0, editingIndex);

        // Add the edited user message
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
                        <h2 className="text-base lg:text-xl font-black text-white tracking-tight uppercase truncate leading-none mb-1">Intelligence Stream</h2>
                        <div className="flex items-center gap-2">
                             <p className="text-[9px] lg:text-[10px] font-bold text-nova-text-dim flex items-center gap-1 opacity-70">
                                <KaruppuLogo size={10} className="text-nova-accent" />
                                Protocol 4.2.1
                            </p>
                            <span className="w-1 h-1 rounded-full bg-white/20"></span>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-nova-accent animate-pulse' : 'bg-green-500'}`}></span>
                                <span className="text-[9px] font-black text-nova-text-dim uppercase tracking-widest">{loading ? 'Processing' : 'Standby'}</span>
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
                className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-4 space-y-8 sm:space-y-16 lg:space-y-20 scroll-smooth custom-scrollbar pb-10"
            >
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-40 px-6 py-20">
                        <KaruppuLogo size={64} className="text-nova-accent animate-bounce [animation-duration:3s]" />
                        <div className="max-w-md">
                            <h3 className="text-sm font-black text-white mb-2 uppercase tracking-[0.3em]"><span className="font-karuppu">Karuppu</span> Ready</h3>
                            <p className="text-[11px] sm:text-xs leading-relaxed text-nova-text-dim font-medium">Neural link established. Provide strategic signals or select a protocol mode to begin the takeover.</p>
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500 w-full`}>
                        <div className={`max-w-[92%] sm:max-w-[85%] lg:max-w-[75%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            
                            {msg.role === 'user' && !loading && editingIndex === null && (
                                <div className="flex items-center gap-2 mb-2 px-1">
                                    <button onClick={() => handleEditStart(i)} className="p-1 hover:text-nova-accent transition-colors opacity-30 hover:opacity-100"><Pencil size={10} /></button>
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
                                <div className={`px-5 py-4 lg:px-7 lg:py-6 rounded-2xl lg:rounded-3xl border shadow-xl transition-all ${msg.role === 'user'
                                    ? 'bg-nova-accent/5 border-nova-accent/20 text-white rounded-tr-none'
                                    : 'glass border-nova-border/50 text-nova-text rounded-tl-none active:bg-white/[0.02]'
                                }`}>
                                    <div className="prose prose-invert prose-sm max-w-none font-medium leading-relaxed">
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                code: ({ children }) => <code className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-nova-accent">{children}</code>,
                                                h2: ({ children }) => <h2 className="text-nova-accent text-xs font-black uppercase mt-4 mb-2 tracking-widest">{children}</h2>,
                                                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                                                li: ({ children }) => <li className="text-[13px]">{children}</li>,
                                            }}
                                        >
                                            {msg.content.split('TASK_CENTER_UPDATE:')[0]}
                                        </ReactMarkdown>
                                    </div>
                                    
                                    {/* Task Update Box - Logic Intact */}
                                    {msg.content.includes('TASK_CENTER_UPDATE:') && (
                                        <div className="mt-4 p-4 rounded-xl bg-black/40 border border-nova-accent/10">
                                            <div className="flex items-center gap-2 mb-3 border-b border-nova-border/30 pb-2">
                                                <Zap size={12} className="text-nova-accent" />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-nova-accent">System Sync</span>
                                            </div>
                                            {/* ... UI logic for task rows ... */}
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
                                <span className="text-[10px] font-black text-nova-accent uppercase tracking-widest">Reasoning...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Strategic Input Field */}
            <div className="shrink-0 pt-4 pb-safe lg:pb-4 border-t border-nova-border/30 bg-nova-bg/95 relative z-40">
                {showScrollButton && (
                    <button onClick={scrollToBottom} className="absolute -top-14 right-2 sm:right-0 p-3 rounded-full bg-nova-accent text-nova-bg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300 active:scale-90">
                        <ChevronDown size={20} />
                    </button>
                )}

                <div className="mb-3 flex items-center gap-2 relative">
                    {/* Model Switcher Menu */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowModelMenu(!showModelMenu); setShowModeMenu(false); }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl glass border border-nova-accent/30 text-[10px] font-black uppercase tracking-widest hover:border-nova-accent transition-all active:scale-95 shadow-[0_0_20px_rgba(0,242,255,0.05)]"
                        >
                            <Zap size={12} className="text-nova-accent" />
                            <span>{liveModels.find(m => m.id === selectedModel)?.label || 'Select Model'}</span>
                            <ChevronDown size={12} className={`transition-transform duration-300 ${showModelMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showModelMenu && (
                            <div className="absolute left-0 bottom-full mb-3 w-64 glass border-2 border-nova-border rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 z-50">
                                <div className="p-3 border-b border-white/5 bg-white/5">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-nova-text-dim">Active Neural Engines</p>
                                </div>
                                <div className="divide-y divide-white/5">
                                    {liveModels.map((model) => (
                                        <button
                                            key={model.id}
                                            onClick={() => { setSelectedModel(model.id); setShowModelMenu(false); }}
                                            className={`w-full flex items-center justify-between px-4 py-3 hover:bg-nova-accent/10 transition-colors text-left group ${selectedModel === model.id ? 'bg-nova-accent/5' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`${selectedModel === model.id ? 'text-nova-accent' : 'text-nova-accent/40'} group-hover:text-nova-accent shrink-0`}>{model.icon}</div>
                                                <div className="min-w-0">
                                                    <p className={`text-[10px] font-black uppercase truncate ${selectedModel === model.id ? 'text-white' : 'text-nova-text-dim'}`}>{model.label}</p>
                                                    <p className="text-[8px] text-nova-text-dim/40 font-mono truncate">{model.id}</p>
                                                </div>
                                            </div>
                                            {selectedModel === model.id && <div className="w-1.5 h-1.5 rounded-full bg-nova-accent animate-pulse" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => { setShowModeMenu(!showModeMenu); setShowModelMenu(false); }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl glass border border-nova-border/50 text-[10px] font-black uppercase tracking-widest hover:border-nova-accent transition-all active:scale-95"
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

                <form onSubmit={handleSend} className="relative flex items-end gap-2 px-1">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isMobile) { e.preventDefault(); handleSend(); } }}
                        disabled={loading}
                        placeholder={loading ? "Karuppu is processing..." : "Provide strategic signal..."}
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
