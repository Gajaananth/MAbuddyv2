import React, { useState, useEffect } from 'react';
import { Database, Search, MessageSquare, Calendar, ChevronRight, Filter, Pencil, Trash2, Check, X } from 'lucide-react';
import { memoryService } from '../services/api';
import type { Conversation } from '../types';
import { useNavigate } from 'react-router-dom';

const MemoryPage: React.FC = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        setLoading(true);
        try {
            const response = await memoryService.getConversations();
            setConversations(response.data.data);
            
            // Auto-clear unread badge across all conversations when accessing the hub
            try {
                await memoryService.markAllRead();
            } catch (e) {
                console.error('[Memory] Background read-all failed', e);
            }
        } catch (error) {
            console.error('Fetch Conversations Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditStart = (conv: Conversation, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(conv.id);
        setEditTitle(conv.title);
    };

    const handleEditSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!editingId || !editTitle.trim()) return;
        try {
            await memoryService.updateTitle(editingId, editTitle.trim());
            setConversations(prev =>
                prev.map(c => c.id === editingId ? { ...c, title: editTitle.trim() } : c)
            );
        } catch (error) {
            console.error('Edit Error:', error);
        } finally {
            setEditingId(null);
            setEditTitle('');
        }
    };

    const handleEditCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(null);
        setEditTitle('');
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this conversation? It will be soft-deleted and can be recovered.')) return;
        try {
            await memoryService.deleteConversation(id);
            setConversations(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error('Delete Error:', error);
        }
    };

    const filtered = conversations.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex-1 flex flex-col min-w-0 max-w-5xl mx-auto w-full animate-in fade-in duration-700">
            <header className="mb-8 lg:mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-nova-border/30 pb-8 px-1">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-nova-accent">
                        <Database size={12} className="animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Knowledge Bank v3.1.5</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tighter uppercase leading-none">
                        Neural <span className="text-nova-accent">Memory</span>
                    </h1>
                    <p className="text-nova-text-dim text-[11px] lg:text-xs font-medium max-w-xl leading-relaxed opacity-60">
                        Compressed repositories of strategic decisions. Knowledge compounds over time.
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-nova-accent/5 px-4 py-2 rounded-2xl border border-nova-accent/20 shadow-lg shadow-nova-accent/5 shrink-0">
                    <div className="text-right">
                        <p className="text-[8px] font-black text-nova-accent uppercase tracking-widest opacity-60">Memory Cells</p>
                        <p className="text-lg font-black text-white leading-none">{conversations.length}</p>
                    </div>
                    <Database size={20} className="text-nova-accent" />
                </div>
            </header>

            <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-nova-text-dim/40 group-focus-within:text-nova-accent transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder="Search memory patterns..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/[0.03] border border-nova-border/50 text-white pl-12 pr-4 py-3.5 rounded-2xl focus:outline-none focus:border-nova-accent/50 transition-all font-bold text-xs"
                    />
                </div>
                <button className="p-3.5 rounded-2xl bg-white/5 border border-nova-border/50 text-nova-text-dim hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2 px-6 active:scale-95 uppercase text-[10px] font-black tracking-widest">
                    <Filter size={16} />
                    <span className="sm:hidden">Filters</span>
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 pb-20">
                {loading && [1, 2, 3].map(i => (
                    <div key={i} className="glass h-24 rounded-3xl animate-pulse border border-nova-border/30"></div>
                ))}

                {!loading && filtered.map((conv) => (
                    <div
                        key={conv.id}
                        onClick={() => editingId !== conv.id && navigate(`/chat?id=${conv.id}`)}
                        className="glass p-5 lg:p-6 rounded-3xl border border-nova-border/50 hover:border-nova-accent/40 hover:bg-nova-accent/[0.02] transition-all cursor-pointer group flex items-start lg:items-center gap-5 lg:gap-8 shadow-xl hover:shadow-nova-accent/5"
                    >
                        <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-nova-accent/10 border border-nova-accent/20 flex items-center justify-center text-nova-accent group-hover:scale-105 transition-all shrink-0 shadow-lg shadow-nova-accent/5">
                            <MessageSquare size={24} />
                        </div>

                        <div className="flex-1 min-w-0 py-1">
                            {editingId === conv.id ? (
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(e as any); if (e.key === 'Escape') handleEditCancel(e as any); }}
                                        autoFocus
                                        className="flex-1 bg-nova-bg border-2 border-nova-accent text-white px-4 py-2 rounded-xl focus:outline-none text-sm font-black"
                                    />
                                    <button onClick={handleEditSave} className="p-2.5 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-all">
                                        <Check size={18} />
                                    </button>
                                    <button onClick={handleEditCancel} className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all">
                                        <X size={18} />
                                    </button>
                                </div>
                            ) : (
                                <h4 className="text-sm lg:text-base text-white font-black uppercase tracking-tight mb-2 group-hover:text-nova-accent transition-colors truncate">{conv.title}</h4>
                            )}
                            
                            <div className="flex items-center gap-3 lg:gap-6">
                                <div className="flex items-center gap-1.5 text-[9px] lg:text-[10px] text-nova-text-dim font-black uppercase tracking-widest opacity-60">
                                    <Calendar size={12} className="text-nova-accent/50" />
                                    {new Date(conv.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                                <div className="hidden xs:flex items-center gap-1.5 text-[9px] lg:text-[10px] text-nova-accent/40 font-mono font-bold">
                                    REF: {conv.id.slice(0, 8)}
                                </div>
                            </div>
                        </div>

                        {/* Action Area */}
                        <div className="flex items-center gap-2 lg:gap-4 shrink-0 self-center">
                            <div className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                <button
                                    onClick={(e) => handleEditStart(conv, e)}
                                    className="p-2.5 rounded-xl bg-white/5 border border-nova-border/50 text-nova-text-dim hover:text-nova-accent hover:border-nova-accent/30 transition-all"
                                >
                                    <Pencil size={14} />
                                </button>
                                <button
                                    onClick={(e) => handleDelete(conv.id, e)}
                                    className="p-2.5 rounded-xl bg-white/5 border border-nova-border/50 text-nova-text-dim hover:text-red-400 hover:border-red-500/30 transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <ChevronRight className="text-nova-text-dim group-hover:text-nova-accent group-hover:translate-x-1 transition-all" size={20} />
                        </div>
                    </div>
                ))}

                {!loading && filtered.length === 0 && (
                    <div className="py-24 text-center glass border-2 border-dashed border-nova-border/30 rounded-[40px] opacity-40">
                        <Database size={48} className="mx-auto mb-6 text-nova-accent opacity-20" />
                        <p className="text-lg font-black text-white uppercase tracking-widest mb-2">Memory Bank Empty</p>
                        <p className="text-xs text-nova-text-dim font-medium">Initiate intelligence exchange to build neural memory.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MemoryPage;
