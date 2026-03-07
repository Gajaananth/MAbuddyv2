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
        <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 italic">Neural <span className="text-nova-accent">Memory</span></h2>
                    <p className="text-nova-text-dim max-w-2xl text-sm md:text-base">Compressed repositories of all strategic decisions, market analyses, and scam audits. Knowledge compounds over time.</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-nova-accent uppercase tracking-widest bg-nova-accent/5 px-3 py-1 rounded-full border border-nova-accent/20">
                    <Database size={14} /> Total Cells: {conversations.length}
                </div>
            </header>

            <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-nova-text-dim" size={18} />
                    <input
                        type="text"
                        placeholder="Search memory patterns..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-nova-card border border-nova-border text-white pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:border-nova-accent transition-all"
                    />
                </div>
                <button className="p-4 rounded-xl bg-white/5 border border-nova-border text-nova-text-dim hover:text-white transition-all">
                    <Filter size={20} />
                </button>
            </div>

            <div className="space-y-4">
                {loading && [1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="glass h-20 rounded-2xl animate-pulse border border-nova-border"></div>
                ))}

                {!loading && filtered.map((conv) => (
                    <div
                        key={conv.id}
                        onClick={() => editingId !== conv.id && navigate(`/chat?id=${conv.id}`)}
                        className="glass p-4 sm:p-6 rounded-2xl border border-nova-border hover:border-nova-accent/40 hover:bg-nova-accent/[0.02] transition-all cursor-pointer group flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6"
                    >

                        <div className="w-12 h-12 rounded-xl bg-nova-accent/10 border border-nova-accent/20 flex items-center justify-center text-nova-accent group-hover:nova-accent-glow transition-all shrink-0">
                            <MessageSquare size={20} />
                        </div>

                        <div className="flex-1 min-w-0">
                            {editingId === conv.id ? (
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(e as any); if (e.key === 'Escape') handleEditCancel(e as any); }}
                                        autoFocus
                                        className="flex-1 bg-nova-bg border border-nova-accent text-white px-3 py-1.5 rounded-lg focus:outline-none text-sm font-bold"
                                    />
                                    <button onClick={handleEditSave} className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all">
                                        <Check size={16} />
                                    </button>
                                    <button onClick={handleEditCancel} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <h4 className="text-white font-bold mb-1 group-hover:text-nova-accent transition-colors truncate">{conv.title}</h4>
                            )}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                                <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-nova-text-dim uppercase tracking-wider">
                                    <Calendar size={11} />
                                    {new Date(conv.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                                <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-nova-accent/60 uppercase tracking-widest font-mono">
                                    <span className="opacity-40">REF:</span> {conv.id.slice(0, 8)}
                                </div>
                            </div>

                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto mt-2 sm:mt-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => handleEditStart(conv, e)}
                                    className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-nova-border text-nova-text-dim hover:text-nova-accent hover:border-nova-accent/30 transition-all focus:bg-nova-accent/10"
                                    title="Edit title"
                                >
                                    <Pencil size={14} />
                                </button>
                                <button
                                    onClick={(e) => handleDelete(conv.id, e)}
                                    className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-nova-border text-nova-text-dim hover:text-red-400 hover:border-red-500/30 transition-all focus:bg-red-500/10"
                                    title="Delete conversation"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <ChevronRight className="text-nova-text-dim group-hover:text-nova-accent group-hover:translate-x-1 transition-all shrink-0" size={20} />
                        </div>

                    </div>
                ))}

                {!loading && filtered.length === 0 && (
                    <div className="py-20 text-center glass border-dashed border-nova-border rounded-3xl opacity-30">
                        <Database size={48} className="mx-auto mb-4" />
                        <p className="text-lg font-bold">Memory bank empty or no matches found.</p>
                        <p className="text-sm">Initiate intelligence exchange to build memory.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MemoryPage;
