import React, { useState, useEffect } from 'react';
import { Bird, AlertCircle, CheckCircle2, Search, Zap, BarChart3, Trash2 } from 'lucide-react';
import { trendService } from '../services/api';
import type { TrendAnalysis } from '../types';
import { formatTimestamp } from '../utils/formatUtils';

const TrendsPage: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [trends, setTrends] = useState<TrendAnalysis[]>([]);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        loadTrends();
    }, []);

    const loadTrends = async () => {
        setLoading(true);
        try {
            const response = await trendService.getTrends();
            setTrends(response.data.data);
        } catch (error) {
            console.error('Fetch Trends Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyze = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim() || analyzing) return;

        setAnalyzing(true);
        try {
            await trendService.analyzeTrend(topic);
            setTopic('');
            await loadTrends();
        } catch (error) {
            console.error('Analyze Trend Error:', error);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this intelligence brief?')) return;
        try {
            await trendService.deleteTrend(id);
            await loadTrends();
        } catch (error) {
            console.error('Delete Trend Error:', error);
        }
    };

    return (
        <div className="flex-1 flex flex-col min-w-0 max-w-7xl mx-auto w-full animate-in fade-in duration-700">
            <header className="mb-8 lg:mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-nova-border/30 pb-8 px-1">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-nova-accent">
                        <BarChart3 size={12} className="animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Market Pulse v4.2.1</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tighter uppercase leading-none">
                        Trend <span className="text-nova-accent">Intelligence</span>
                    </h1>
                    <p className="text-nova-text-dim text-[11px] lg:text-xs font-medium max-w-xl leading-relaxed opacity-60">
                        Detecting algorithmic bias and identifying high-leverage ethical opportunities.
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-nova-accent/5 px-4 py-2 rounded-2xl border border-nova-accent/20 shadow-lg shadow-nova-accent/5 shrink-0">
                    <div className="text-right">
                        <p className="text-[8px] font-black text-nova-accent uppercase tracking-widest opacity-60">Scan Status</p>
                        <p className="text-lg font-black text-white leading-none">ACTIVE</p>
                    </div>
                    <Zap size={20} className="text-nova-accent animate-pulse" />
                </div>
            </header>

            <section className="glass p-6 lg:p-10 rounded-[2.5rem] border-2 border-nova-border bg-nova-accent/[0.02] shadow-2xl mb-10 lg:mb-16">
                <h3 className="text-sm font-black text-white mb-6 flex items-center gap-3 uppercase tracking-widest">
                    <Search size={18} className="text-nova-accent" />
                    New Intelligence Scan
                </h3>
                <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1 group">
                        <Zap className="absolute left-5 top-1/2 -translate-y-1/2 text-nova-text-dim/40 group-focus-within:text-nova-accent transition-colors" size={20} />
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Identify target pattern (e.g. AI-driven logistics)..."
                            className="w-full bg-white/[0.03] border-2 border-nova-border/50 text-white pl-14 pr-4 py-4 rounded-2xl focus:outline-none focus:border-nova-accent/50 transition-all text-xs font-bold placeholder:opacity-30"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={analyzing || !topic.trim()}
                        className="px-8 py-4 bg-nova-accent text-nova-bg font-black rounded-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 text-[10px] uppercase tracking-widest shadow-xl shadow-nova-accent/20 shrink-0"
                    >
                        {analyzing ? 'Scanning Mesh...' : 'Begin Execution'}
                    </button>
                </form>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {loading && [1, 2, 3].map(i => (
                    <div key={i} className="glass h-64 rounded-[2rem] animate-pulse border border-nova-border/30"></div>
                ))}

                {!loading && trends.map((trend) => (
                    <div key={trend.id} className="glass p-6 lg:p-8 rounded-[2rem] border border-nova-border/50 hover:border-nova-accent/30 transition-all flex flex-col group shadow-xl hover:shadow-nova-accent/5">
                        <div className="flex justify-between items-start mb-6">
                            <div className="px-2.5 py-1 rounded-lg bg-nova-accent/10 border border-nova-accent/20 text-[9px] font-black text-nova-accent uppercase tracking-widest">
                                Report Brief
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] text-nova-text-dim/40 font-mono italic">{formatTimestamp(trend.created_at)}</span>
                                <button
                                    onClick={() => handleDelete(trend.id)}
                                    className="p-1 px-1.5 rounded-lg text-nova-text-dim/20 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>

                        <h4 className="text-base lg:text-lg font-black text-white mb-3 group-hover:text-nova-accent transition-colors uppercase tracking-tight truncate">{trend.topic}</h4>

                        <div className="flex-1 overflow-hidden relative mb-6">
                            <p className="text-[11px] lg:text-xs text-nova-text-dim line-clamp-4 leading-relaxed italic opacity-70">
                                {trend.analysis.summary.replace(/##/g, '').replace(/\*\*/g, '')}
                            </p>
                            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-transparent via-nova-bg/20 to-transparent"></div>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-nova-border/20">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                <span className="text-nova-text-dim flex items-center gap-2">
                                    <BarChart3 size={14} className="text-nova-accent/50" />
                                    Strategic Yield
                                </span>
                                <span className={trend.score > 70 ? 'text-green-400' : 'text-nova-accent'}>{trend.score}/100</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <div
                                    className={`h-full ${trend.score > 70 ? 'bg-green-400' : 'bg-nova-accent shadow-[0_0_10px_rgba(0,242,255,0.4)]'}`}
                                    style={{ width: `${trend.score}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-2">
                            {trend.analysis.scam_indicators.length > 0 ? (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-[8px] font-black text-red-500 uppercase tracking-[0.2em] shadow-lg shadow-red-500/5">
                                    <AlertCircle size={10} /> Manipulation High
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-[8px] font-black text-green-500 uppercase tracking-[0.2em] shadow-lg shadow-green-500/5">
                                    <CheckCircle2 size={10} /> Trusted Signal
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {!loading && trends.length === 0 && (
                    <div className="col-span-full py-24 text-center glass border-2 border-dashed border-nova-border/30 rounded-[3rem] opacity-30">
                        <Bird size={48} className="mx-auto mb-6 text-nova-accent animate-bounce" />
                        <p className="text-lg font-black text-white uppercase tracking-[0.3em]">No Pulse Detected</p>
                        <p className="text-xs text-nova-text-dim font-medium">Coordinate a scan to begin intelligence mapping.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrendsPage;
