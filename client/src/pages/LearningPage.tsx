import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { TrendingUp, Loader2 } from 'lucide-react';
import { formatTimestamp } from '../utils/formatUtils';

interface IntelligenceLog {
    id: string;
    category: string;
    lesson: string;
    source: string;
    created_at: string;
}

const LearningPage: React.FC = () => {
    const [logs, setLogs] = useState<IntelligenceLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/intelligence/logs');
            setLogs(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch intelligence logs', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleSync = async () => {
        try {
            setLoading(true);
            await api.post('/intelligence/raid/trigger', { type: 'mid-week' });
            // Wait a bit for the first log to appear
            setTimeout(fetchLogs, 5000);
        } catch (err) {
            console.error('Sync failed', err);
            setLoading(false);
        }
    };

    const categoryCounts = logs.reduce((acc, log) => {
        acc[log.category] = (acc[log.category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="w-full max-w-6xl mx-auto pb-24">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-white uppercase flex items-center gap-3">
                        <TrendingUp className="text-nova-accent" size={32} />
                        Intelligence <span className="text-nova-accent">Memory</span>
                    </h1>
                    <p className="text-nova-text-dim text-[10px] font-black tracking-[0.3em] uppercase mt-1 opacity-60">Strategic Learning Protocol v5.0</p>
                </div>
                <button 
                    onClick={handleSync}
                    disabled={loading}
                    className="px-6 py-3 rounded-2xl bg-nova-accent/10 border border-nova-accent/20 text-nova-accent text-[10px] font-black uppercase tracking-widest hover:bg-nova-accent hover:text-nova-bg transition-all shadow-lg shadow-nova-accent/5"
                >
                    {loading ? 'Syncing...' : 'Sync Intelligence'}
                </button>
            </header>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="glass p-4 rounded-2xl border-2 border-nova-border/50">
                    <p className="text-[10px] text-nova-text-dim font-black uppercase tracking-wider mb-1">Total Observations</p>
                    <p className="text-2xl font-black text-white">{logs.length}</p>
                </div>
                {Object.entries(categoryCounts).slice(0, 3).map(([category, count]) => (
                    <div key={category} className="glass p-4 rounded-2xl border-2 border-nova-border/30 bg-white/[0.02]">
                        <p className="text-[10px] text-nova-accent/70 font-black uppercase tracking-wider mb-1 truncate">{category}</p>
                        <p className="text-2xl font-black text-nova-accent">{count}</p>
                    </div>
                ))}
            </div>

            {/* Logs Timeline */}
            <div className="space-y-4">
                {loading ? (
                    <div className="p-12 text-center text-nova-text-dim">
                        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                        <span className="text-xs uppercase tracking-widest font-bold">Decoding Synapses...</span>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="glass p-12 rounded-2xl border-2 border-nova-border text-center text-nova-text-dim font-bold uppercase tracking-widest text-sm">
                        No continuous learning logs detected.
                    </div>
                ) : (
                    logs.map((log) => {
                        const isSuggestion = log.category === 'OPPORTUNITY_SUGGESTION';
                        return (
                            <div key={log.id} className={`glass p-6 rounded-2xl border-2 transition-all relative overflow-hidden group mb-4 ${isSuggestion ? 'border-nova-accent bg-nova-accent/5' : 'border-nova-border/50 hover:bg-white/[0.04]'}`}>
                                <div className={`absolute top-0 left-0 w-1.5 h-full ${isSuggestion ? 'bg-nova-accent animate-pulse' : 'bg-nova-text-dim opacity-50'} shadow-[0_0_10px_rgba(0,242,255,0.8)]`}></div>
                                
                                {isSuggestion && (
                                    <div className="absolute top-4 right-6 px-2 py-0.5 rounded-full bg-nova-accent text-nova-bg text-[8px] font-black uppercase tracking-widest">
                                        Potential Mission Signal
                                    </div>
                                )}

                                <div className="space-y-3 font-mono text-sm">
                                    <div className="text-white font-black tracking-widest uppercase border-b border-white/10 pb-2 mb-3 flex justify-between items-center">
                                        <span>{formatTimestamp(log.created_at)}</span>
                                        <span className="text-[10px] text-nova-text-dim/40 opacity-0 group-hover:opacity-100 transition-opacity">ID: {log.id.slice(0, 8)}</span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                                        <span className="text-nova-text-dim uppercase tracking-widest font-black w-full sm:w-24 shrink-0">Status:</span>
                                        <span className={isSuggestion ? 'text-nova-accent font-black' : 'text-white'}>
                                            {isSuggestion ? 'STRATEGIC_PROPOSAL' : 'INTEL_LOGGED'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                                        <span className="text-nova-text-dim uppercase tracking-widest font-black w-full sm:w-24 shrink-0">Source:</span>
                                        <span className="text-white">{log.source || 'Autonomous Inference'}</span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                                        <span className="text-nova-text-dim uppercase tracking-widest font-black w-full sm:w-24 shrink-0">Insight:</span>
                                        <span className="text-nova-accent/90">{log.lesson}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default LearningPage;
