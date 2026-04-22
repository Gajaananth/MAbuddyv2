import React, { useState, useEffect } from 'react';
import { Bird, AlertCircle, CheckCircle2, Search, Zap, BarChart3, Trash2, TrendingUp, Activity, Globe } from 'lucide-react';
import { trendService } from '../services/api';
import api from '../services/api';
import type { TrendAnalysis } from '../types';
import { formatTimestamp } from '../utils/formatUtils';

interface TrendCluster {
    cluster: string;
    avg_score: number;
    frequency: number;
    last_detected: string;
}

const scoreBand = (score: number) => {
    if (score >= 75) return { color: 'text-green-400', bar: 'bg-green-400', label: 'Strong' };
    if (score >= 45) return { color: 'text-nova-accent', bar: 'bg-nova-accent', label: 'Active' };
    return { color: 'text-red-400', bar: 'bg-red-400', label: 'Weak' };
};

const TrendsPage: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [trends, setTrends] = useState<TrendAnalysis[]>([]);
    const [clusters, setClusters] = useState<TrendCluster[]>([]);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [activeTab, setActiveTab] = useState<'briefs' | 'aggregation'>('aggregation');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [trendsRes, clustersRes] = await Promise.all([
                trendService.getTrends(),
                api.get('/trends/aggregation')
            ]);
            setTrends(trendsRes.data.data || []);
            setClusters(clustersRes.data.data || []);
        } catch (error) {
            console.error('Load Trends Error:', error);
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
            await loadData();
        } catch (error) {
            console.error('Analyze Trend Error:', error);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this intelligence brief?')) return;
        try {
            await trendService.deleteTrend(id);
            await loadData();
        } catch (error) {
            console.error('Delete Trend Error:', error);
        }
    };

    const avgScore = trends.length > 0
        ? Math.round(trends.reduce((s, t) => s + t.score, 0) / trends.length)
        : 0;

    return (
        <div className="flex-1 flex flex-col min-w-0 max-w-7xl mx-auto w-full animate-in fade-in duration-700">
            {/* Header */}
            <header className="mb-8 lg:mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-nova-border/30 pb-8 px-1">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-nova-accent">
                        <BarChart3 size={12} className="animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Market Pulse v5.0</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tighter uppercase leading-none">
                        Trend <span className="text-nova-accent">Intelligence</span>
                    </h1>
                    <p className="text-nova-text-dim text-[11px] lg:text-xs font-medium max-w-xl leading-relaxed opacity-60">
                        Real-time market signal aggregation & strategic cluster intelligence.
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-nova-accent/5 px-4 py-2 rounded-2xl border border-nova-accent/20 shadow-lg shadow-nova-accent/5 shrink-0">
                    <div className="text-right">
                        <p className="text-[8px] font-black text-nova-accent uppercase tracking-widest opacity-60">Avg. Yield</p>
                        <p className="text-lg font-black text-white leading-none">{avgScore}/100</p>
                    </div>
                    <Zap size={20} className="text-nova-accent animate-pulse" />
                </div>
            </header>

            {/* Scan Input */}
            <section className="glass p-6 lg:p-10 rounded-[2.5rem] border-2 border-nova-border bg-nova-accent/[0.02] shadow-2xl mb-10">
                <h3 className="text-sm font-black text-white mb-6 flex items-center gap-3 uppercase tracking-widest">
                    <Search size={18} className="text-nova-accent" /> New Signal Scan
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
                    <button type="submit" disabled={analyzing || !topic.trim()}
                        className="px-8 py-4 bg-nova-accent text-nova-bg font-black rounded-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 text-[10px] uppercase tracking-widest shadow-xl shadow-nova-accent/20 shrink-0">
                        {analyzing ? 'Scanning...' : 'Execute Scan'}
                    </button>
                </form>
            </section>

            {/* Tabs */}
            <div className="flex bg-white/[0.03] p-1.5 rounded-[1.5rem] border border-white/10 shadow-inner mb-10 w-full sm:w-auto">
                {[
                    { id: 'aggregation', label: `Cluster Grid (${clusters.length})`, icon: <Globe size={14} /> },
                    { id: 'briefs', label: `Intel Briefs (${trends.length})`, icon: <Activity size={14} /> }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 sm:px-10 py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-nova-bg text-nova-accent border border-nova-accent/20 shadow-lg shadow-nova-accent/5' : 'text-nova-text-dim hover:text-white'}`}>
                        {tab.icon}{tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-6 opacity-40">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 border-4 border-nova-accent/20 rounded-full" />
                        <div className="absolute inset-0 border-4 border-t-nova-accent rounded-full animate-spin" />
                    </div>
                    <span className="text-[10px] font-black text-nova-accent uppercase tracking-[0.4em]">Synchronizing Grid...</span>
                </div>
            ) : activeTab === 'aggregation' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                    {clusters.length === 0 ? (
                        <div className="col-span-full py-24 text-center glass border-2 border-dashed border-nova-border/30 rounded-[3rem] opacity-30">
                            <TrendingUp size={56} className="mx-auto mb-6 text-nova-accent" />
                            <p className="text-lg font-black text-white uppercase tracking-[0.2em]">No Clusters Detected</p>
                            <p className="text-xs text-nova-text-dim mt-2">Run a scan to begin building your intelligence mesh.</p>
                        </div>
                    ) : clusters.map((cluster, i) => {
                        const band = scoreBand(Number(cluster.avg_score));
                        return (
                            <div key={i} className="glass p-6 lg:p-8 rounded-[2rem] border border-nova-border/50 hover:border-nova-accent/30 transition-all flex flex-col group shadow-xl hover:shadow-nova-accent/5">
                                <div className="flex justify-between items-start mb-5">
                                    <span className="px-3 py-1 rounded-lg bg-nova-accent/10 border border-nova-accent/20 text-[9px] font-black text-nova-accent uppercase tracking-widest">
                                        Cluster
                                    </span>
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${band.color}`}>
                                        {band.label}
                                    </span>
                                </div>

                                <h4 className="text-base lg:text-lg font-black text-white mb-2 group-hover:text-nova-accent transition-colors uppercase tracking-tight">{cluster.cluster}</h4>

                                <div className="flex gap-4 text-[10px] font-black text-nova-text-dim uppercase tracking-widest mb-5">
                                    <span>{cluster.frequency} scans</span>
                                    <span>Last: {formatTimestamp(cluster.last_detected)}</span>
                                </div>

                                <div className="mt-auto space-y-3 pt-4 border-t border-nova-border/20">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-nova-text-dim flex items-center gap-2"><BarChart3 size={12} className="text-nova-accent/50" /> Avg. Yield</span>
                                        <span className={band.color}>{Math.round(Number(cluster.avg_score))}/100</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                        <div className={`h-full ${band.bar} shadow-[0_0_10px_rgba(0,242,255,0.4)] transition-all duration-1000`}
                                            style={{ width: `${Math.round(Number(cluster.avg_score))}%` }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                    {trends.length === 0 ? (
                        <div className="col-span-full py-24 text-center glass border-2 border-dashed border-nova-border/30 rounded-[3rem] opacity-30">
                            <Bird size={48} className="mx-auto mb-6 text-nova-accent animate-bounce" />
                            <p className="text-lg font-black text-white uppercase tracking-[0.3em]">No Pulse Detected</p>
                        </div>
                    ) : trends.map((trend) => (
                        <div key={trend.id} className="glass p-6 lg:p-8 rounded-[2rem] border border-nova-border/50 hover:border-nova-accent/30 transition-all flex flex-col group shadow-xl hover:shadow-nova-accent/5">
                            <div className="flex justify-between items-start mb-6">
                                <div className="px-2.5 py-1 rounded-lg bg-nova-accent/10 border border-nova-accent/20 text-[9px] font-black text-nova-accent uppercase tracking-widest">Report Brief</div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[9px] text-nova-text-dim/40 font-mono italic">{formatTimestamp(trend.created_at)}</span>
                                    <button onClick={() => handleDelete(trend.id)} className="p-1 px-1.5 rounded-lg text-nova-text-dim/20 hover:text-red-500 hover:bg-red-500/10 transition-all"><Trash2 size={12} /></button>
                                </div>
                            </div>
                            <h4 className="text-base lg:text-lg font-black text-white mb-3 group-hover:text-nova-accent transition-colors uppercase tracking-tight truncate">{trend.topic}</h4>
                            <div className="flex-1 overflow-hidden relative mb-6">
                                <p className="text-[11px] lg:text-xs text-nova-text-dim line-clamp-4 leading-relaxed italic opacity-70">
                                    {trend.analysis.summary.replace(/##/g, '').replace(/\*\*/g, '')}
                                </p>
                            </div>
                            <div className="space-y-4 pt-6 border-t border-nova-border/20">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-nova-text-dim flex items-center gap-2"><BarChart3 size={14} className="text-nova-accent/50" />Strategic Yield</span>
                                    <span className={trend.score > 70 ? 'text-green-400' : 'text-nova-accent'}>{trend.score}/100</span>
                                </div>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <div className={`h-full ${trend.score > 70 ? 'bg-green-400' : 'bg-nova-accent shadow-[0_0_10px_rgba(0,242,255,0.4)]'}`} style={{ width: `${trend.score}%` }} />
                                </div>
                            </div>
                            <div className="mt-6 flex flex-wrap gap-2">
                                {trend.analysis.scam_indicators.length > 0 ? (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-[8px] font-black text-red-500 uppercase tracking-[0.2em]">
                                        <AlertCircle size={10} /> Manipulation High
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-[8px] font-black text-green-500 uppercase tracking-[0.2em]">
                                        <CheckCircle2 size={10} /> Trusted Signal
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TrendsPage;
