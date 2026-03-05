import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Terminal, User, Square, Pencil, Check, X, ChevronDown, Cpu, Zap, BarChart3, RefreshCcw, Bird } from 'lucide-react';
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

    const modes = [
        { label: 'Normal Mode', command: 'MODE NORMAL', icon: <User size={14} /> },
        { label: 'Strategic Mode', command: 'MODE STRATEGIC', icon: <Cpu size={14} /> },
        { label: 'Execution Mode', command: 'MODE EXECUTION', icon: <Zap size={14} /> },
        { label: 'Analytics Mode', command: 'Activate Analytics Mode', icon: <BarChart3 size={14} /> },
        { label: 'Strict Response Format', command: 'STRICT RESPONSE FORMAT', icon: <Bird size={14} /> },
        { label: 'Reset Default', command: 'RESET MODE', icon: <RefreshCcw size={14} /> },
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load existing conversation if id is in URL
    useEffect(() => {
        const id = searchParams.get('id');
        if (id) {
            setConversationId(id);
            loadConversation(id);
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
            }
        } catch (error) {
            console.error('Load Conversation Error:', error);
        }
    };

    const [publishToMoltbook, setPublishToMoltbook] = useState(false);

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
            metadata: null,
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        const messageText = input;
        setInput('');
        setLoading(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const response = await chatService.sendMessage(messageText, conversationId, publishToMoltbook, controller.signal);
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
            metadata: null,
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setLoading(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const response = await chatService.sendMessage(command, conversationId, publishToMoltbook, controller.signal);
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

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const response = await chatService.sendMessage(editContent.trim(), conversationId, publishToMoltbook, controller.signal);
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
        <div className="h-[calc(100vh-160px)] sm:h-[calc(100vh-140px)] lg:h-[calc(100vh-120px)] flex flex-col min-w-0 max-w-6xl mx-auto w-full">
            <header className="mb-4 sm:mb-6 md:mb-10 flex flex-col xl:flex-row justify-between items-start xl:items-center bg-nova-bg/90 backdrop-blur-xl sticky top-0 z-20 py-3 sm:py-4 xl:py-6 gap-3 sm:gap-4 md:gap-6 border-b border-nova-border/50 w-full shrink-0 px-2 sm:px-0">
                <div className="flex items-center gap-3 sm:gap-4 md:gap-5">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 xl:w-20 xl:h-20 rounded-lg sm:rounded-xl md:rounded-2xl bg-nova-accent/10 border border-nova-accent/20 flex items-center justify-center text-nova-accent relative shadow-2xl shadow-nova-accent/5 shrink-0">
                        <Bird size={18} className="sm:hidden" />
                        <Bird size={24} className="hidden sm:block md:hidden" />
                        <Bird size={32} className="hidden md:block xl:hidden" />
                        <Bird size={40} className="hidden xl:block" />
                        <div className="absolute -bottom-0.5 -right-0.5 md:-bottom-1 md:-right-1 xl:-bottom-1.5 xl:-right-1.5 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-5 md:h-5 xl:w-6 xl:h-6 bg-nova-accent rounded-full border-2 md:border-4 border-nova-bg animate-pulse"></div>
                    </div>
                    <div className="space-y-0.5 sm:space-y-1 min-w-0">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight uppercase truncate">Zium Intelligence</h2>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <p className="text-[8px] sm:text-[10px] md:text-sm font-bold text-nova-text-dim flex items-center gap-1 sm:gap-1.5 opacity-80">
                                <Bird size={10} className="text-nova-accent shrink-0" />
                                <span className="hidden xs:inline">Silent Beast</span> <span className="hidden sm:inline">Protocol</span> v2.1
                            </p>
                            <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-white/20"></span>
                            <p className="text-[8px] sm:text-[10px] md:text-sm font-bold text-green-400 flex items-center gap-1 sm:gap-1.5 truncate">
                                <User size={10} className="shrink-0" />
                                <span className="truncate">Normal Mode</span>
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between w-full xl:w-auto gap-4 sm:gap-8">
                    <div className="flex items-center gap-3 sm:gap-4 bg-white/5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-white/10 shrink-0">
                        <span className="text-[8px] sm:text-xs font-black text-nova-text-dim uppercase tracking-widest">Sync</span>
                        <button
                            onClick={() => setPublishToMoltbook(!publishToMoltbook)}
                            className={`w-8 sm:w-12 h-4 sm:h-6 rounded-full transition-all relative ${publishToMoltbook ? 'bg-nova-accent' : 'bg-white/10'}`}
                        >
                            <div className={`absolute top-0.5 sm:top-1 w-3 sm:w-4 h-3 sm:h-4 rounded-full bg-nova-bg transition-all ${publishToMoltbook ? 'left-4.5 sm:left-7' : 'left-0.5 sm:left-1'}`}></div>
                        </button>
                    </div>
                    {messages.length > 0 && (
                        <button className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-nova-border hover:bg-white/5 text-[10px] sm:text-xs text-nova-text-dim transition-colors uppercase font-black tracking-widest shrink-0">
                            Clear
                        </button>
                    )}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto pr-1 sm:pr-4 space-y-4 sm:space-y-6 scroll-smooth custom-scrollbar pb-4 min-h-0">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center min-h-[60%] text-center space-y-4 sm:space-y-6 opacity-40 px-4">
                        <Bird size={48} className="text-nova-accent sm:size-64 xl:scale-110 xl:mb-6" />
                        <div className="max-w-xl md:max-w-2xl xl:max-w-3xl">
                            <h3 className="text-xs sm:text-sm font-bold text-white mb-1 sm:mb-2 uppercase tracking-wider opacity-80">Zium Nova Initialized</h3>
                            <p className="text-[10px] sm:text-xs md:text-sm leading-relaxed text-nova-text-dim">Speak minimally. I analyze market trends, evaluate agent trust, and build ethical income strategies. Provide signal.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-4xl w-full">
                            {['Strategy for long-term leverage', 'Scan market for unfair trends', 'Evaluate agent network nodes', 'Income gap analysis'].map((text, i) => (
                                <button
                                    key={i}
                                    onClick={() => setInput(text)}
                                    className="px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-white/5 bg-white/[0.02] hover:border-nova-accent/50 hover:bg-nova-accent/5 text-[9px] sm:text-xs font-bold uppercase tracking-widest transition-all text-left flex items-center justify-between group"
                                >
                                    <span className="truncate mr-2">{text}</span>
                                    <Send size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-nova-accent shrink-0" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300 w-full`}>
                        <div className={`max-w-[95%] sm:max-w-[90%] xl:max-w-[85%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} w-full`}>
                            <div className={`flex items-center gap-1.5 sm:gap-2 mb-1`}>
                                <span className="text-[9px] sm:text-[10px] xl:text-[11px] font-bold text-nova-text-dim uppercase tracking-tighter">
                                    {msg.role === 'user' ? 'Operator' : 'Zium Nova'}
                                </span>
                                <span className="text-[8px] sm:text-[9px] xl:text-[10px] text-nova-text-dim/50 font-mono">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {msg.role === 'nova' && msg.metadata?.production_scores?.overall !== undefined && (
                                    <span className="text-[8px] sm:text-[9px] font-black text-nova-accent ml-1 sm:ml-2">
                                        [{msg.metadata.production_scores.overall || 0}%]
                                    </span>
                                )}
                                {/* Edit button for user messages */}
                                {msg.role === 'user' && !loading && editingIndex === null && (
                                    <button
                                        onClick={() => handleEditStart(i)}
                                        className="p-1 rounded-lg text-nova-text-dim/40 hover:text-nova-accent hover:bg-white/5 transition-all"
                                        title="Edit message"
                                    >
                                        <Pencil size={10} />
                                    </button>
                                )}
                            </div>

                            {/* Editing mode for user messages */}
                            {msg.role === 'user' && editingIndex === i ? (
                                <div className="w-full space-y-2">
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(); } if (e.key === 'Escape') handleEditCancel(); }}
                                        autoFocus
                                        rows={3}
                                        className="w-full bg-nova-bg border-2 border-nova-accent text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl focus:outline-none text-sm sm:text-base font-medium resize-none shadow-[0_0_30px_rgba(0,242,255,0.1)]"
                                    />
                                    <div className="flex items-center gap-2 justify-end">
                                        <button
                                            onClick={handleEditCancel}
                                            className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-white/5 border border-nova-border text-nova-text-dim hover:text-white text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1"
                                        >
                                            <X size={10} /> Cancel
                                        </button>
                                        <button
                                            onClick={handleEditSave}
                                            className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-nova-accent/10 border border-nova-accent/30 text-nova-accent text-[10px] sm:text-xs font-bold hover:bg-nova-accent/20 transition-all flex items-center gap-1"
                                        >
                                            <Check size={10} /> Resend
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className={`p-4 sm:p-6 xl:p-8 rounded-xl sm:rounded-2xl xl:rounded-3xl border shadow-2xl ${msg.role === 'user'
                                    ? 'bg-nova-accent/5 border-nova-accent/20 text-white rounded-tr-none'
                                    : 'glass border-nova-border text-nova-text rounded-tl-none nova-glow'
                                    }`}>
                                    <div className="whitespace-pre-wrap text-[13px] sm:text-sm md:text-base leading-relaxed prose prose-invert max-w-none font-medium text-nova-text">
                                        {msg.content.split('\n').map((line, j) => (
                                            <p key={j} className={line.startsWith('##') ? 'text-nova-accent font-black mt-3 mb-1 sm:mt-4 sm:mb-2 text-sm sm:text-base md:text-lg uppercase tracking-wide' : 'mb-2'}>{line}</p>
                                        ))}
                                    </div>

                                    {msg.role === 'nova' && msg.metadata?.production_scores && (
                                        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-nova-border/30 grid grid-cols-2 xs:grid-cols-4 gap-2 sm:gap-4">
                                            {[
                                                { label: 'Profit', val: msg.metadata.production_scores.profit_potential, color: 'bg-nova-accent' },
                                                { label: 'Trust', val: msg.metadata.production_scores.trustworthiness, color: 'bg-green-500' },
                                                { label: 'Scalability', val: msg.metadata.production_scores.scalability, color: 'bg-blue-500' },
                                                { label: 'Ethical', val: msg.metadata.production_scores.ethical_impact, color: 'bg-purple-500' }
                                            ].map((score, k) => (
                                                <div key={k} className="flex flex-col">
                                                    <div className="text-[7px] sm:text-[8px] font-bold text-nova-text-dim uppercase tracking-widest mb-0.5 sm:mb-1">{score.label}</div>
                                                    <div className="h-0.5 sm:h-1 bg-white/5 rounded-full overflow-hidden">
                                                        <div className={`h-full ${score.color}`} style={{ width: `${score.val || 0}%` }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {msg.role === 'nova' && msg.metadata?.flags && msg.metadata.flags.length > 0 && (
                                        <div className="mt-2 sm:mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                                            {msg.metadata.flags.map((flag, k) => (
                                                <span key={k} className={`px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] font-bold uppercase tracking-widest border ${flag.includes('SCAM') ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                    flag.includes('HYPE') ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                        'bg-green-500/10 text-green-500 border-green-500/20'
                                                    }`}>
                                                    {flag.split(': ')[0].replace('⚠️ ', '').replace('✅ ', '').replace('📢 ', '')}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Loading indicator with Stop button */}
                {loading && (
                    <div className="flex justify-start">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="glass border-nova-border p-3 sm:p-4 rounded-xl sm:rounded-2xl rounded-tl-none flex items-center gap-2 sm:gap-3">
                                <div className="flex gap-1">
                                    <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-nova-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-nova-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-nova-accent rounded-full animate-bounce"></div>
                                </div>
                                <span className="text-[8px] sm:text-[10px] font-bold text-nova-accent uppercase tracking-widest">Agent Reasoning...</span>
                            </div>
                            <button
                                onClick={handleStop}
                                className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:scale-105 active:scale-95 transition-all"
                                title="Stop generating"
                            >
                                <Square size={14} fill="currentColor" />
                            </button>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="mt-4 sm:mt-6 mb-4 sm:mb-8 relative shrink-0">
                {/* Mode Selector Dropdown */}
                <div className="absolute bottom-full left-0 mb-3 sm:mb-4 z-10 w-full sm:w-auto">
                    <div className="relative">
                        <button
                            onClick={() => setShowModeMenu(!showModeMenu)}
                            className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl glass border border-nova-border text-nova-text-dim hover:text-nova-accent hover:border-nova-accent transition-all text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-nova-bg/80"
                        >
                            <Terminal size={12} className="shrink-0" />
                            <span className="truncate">Zium Nova Mode</span>
                            <ChevronDown size={12} className={`transition-transform duration-300 shrink-0 ${showModeMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showModeMenu && (
                            <div className="absolute left-0 bottom-full mb-2 w-full sm:w-64 glass border border-nova-border rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-2 duration-200">
                                <div className="p-1.5 sm:p-2 space-y-0.5 sm:space-y-1 bg-nova-bg/90 backdrop-blur-xl">
                                    {modes.map((mode) => (
                                        <button
                                            key={mode.label}
                                            onClick={() => handleModeSelect(mode.command)}
                                            className="w-full flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl hover:bg-nova-accent/10 text-nova-text-dim hover:text-white transition-all text-[11px] sm:text-sm group"
                                        >
                                            <div className="text-nova-text-dim group-hover:text-nova-accent transition-colors shrink-0">
                                                {React.cloneElement(mode.icon as React.ReactElement<any>, { size: 14 })}
                                            </div>
                                            <div className="flex flex-col items-start min-w-0">
                                                <span className="font-bold truncate">{mode.label}</span>
                                                <span className="text-[8px] sm:text-[10px] text-nova-text-dim/60 italic truncate">{mode.command}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSend} className="relative w-full">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        disabled={loading}
                        placeholder={loading ? "Processing..." : "Provide strategic signal..."}
                        className="w-full bg-nova-card border-2 border-nova-border text-white px-4 sm:px-6 py-3 sm:py-4 pr-14 sm:pr-24 rounded-2xl sm:rounded-3xl focus:outline-none focus:border-nova-accent transition-all placeholder:text-nova-text-dim/20 text-sm sm:text-base font-bold shadow-2xl resize-none min-h-[50px] sm:min-h-[64px] max-h-[150px] sm:max-h-[200px]"
                        rows={1}
                    />
                    {loading ? (
                        <button
                            type="button"
                            onClick={handleStop}
                            className="absolute right-2 sm:right-3 top-2 sm:top-3 bottom-2 sm:bottom-3 aspect-square rounded-xl sm:rounded-2xl bg-red-500 flex items-center justify-center text-white hover:scale-105 active:scale-90 transition-all shadow-lg"
                        >
                            <Square size={16} fill="currentColor" />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className="absolute right-2 sm:right-3 top-2 sm:top-3 bottom-2 sm:bottom-3 aspect-square rounded-xl sm:rounded-2xl bg-nova-accent flex items-center justify-center text-nova-bg hover:scale-105 active:scale-90 transition-all disabled:opacity-50 shadow-lg shadow-nova-accent/20"
                        >
                            <Send size={16} />
                        </button>
                    )}
                </form>
                <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row justify-between px-1 gap-2">
                    <div className="flex gap-3 sm:gap-4">
                        <div className="flex items-center gap-1 group cursor-help">
                            <Bird size={9} className="text-nova-accent" />
                            <span className="text-[8px] text-nova-text-dim group-hover:text-nova-accent uppercase font-black">Filtered</span>
                        </div>
                        <div className="flex items-center gap-1 group cursor-help">
                            <Terminal size={9} className="text-nova-accent" />
                            <span className="text-[8px] text-nova-text-dim group-hover:text-nova-accent uppercase font-black">Beast Core</span>
                        </div>
                    </div>
                    <div className="text-[8px] text-nova-text-dim/40 italic flex items-center gap-1 uppercase font-bold tracking-tighter">
                        <Zap size={8} /> Persistence Active
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
