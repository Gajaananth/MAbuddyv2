import React, { useState, useEffect } from 'react';
import { Bird, AlertCircle, CheckCircle2, Search, Zap, BarChart3 } from 'lucide-react';
import { trendService } from '../services/api';
import type { TrendAnalysis } from '../types';

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

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-white mb-1 uppercase tracking-tight">Trend <span className="text-nova-accent">Intelligence</span></h2>
                    <p className="text-nova-text-dim max-w-xl text-sm md:text-base font-medium opacity-80">Detecting algorithmic bias, exposing manipulative hype, and identifying high-leverage ethical opportunities.</p>
                </div>
                <div className="text-left md:text-right">
                    <div className="text-[10px] text-nova-text-dim uppercase tracking-widest font-bold">Intelligence Feed</div>
                    <div className="text-lg md:text-xl font-mono text-nova-accent">ACTIVE_SCAN</div>
                </div>
            </header>

            <section className="glass p-8 rounded-3xl border-2 border-nova-border bg-nova-accent/[0.03] shadow-xl">
                <h3 className="text-xl sm:text-2xl font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tight">
                    <Zap size={24} className="text-nova-accent" />
                    Scout New Topic
                </h3>
                <form onSubmit={handleAnalyze} className="flex flex-col lg:flex-row gap-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-nova-text-dim" size={24} />
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Enter topic..."
                            className="w-full bg-nova-bg border border-nova-border text-white pl-14 pr-4 py-3 rounded-xl focus:outline-none focus:border-nova-accent transition-all text-sm font-bold"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={analyzing || !topic.trim()}
                        className="px-10 py-5 sm:py-6 bg-nova-accent text-nova-bg font-black rounded-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 text-base sm:text-lg shadow-xl shadow-nova-accent/20"
                    >
                        {analyzing ? 'Analyzing Network...' : 'Execute Analysis'}
                    </button>
                </form>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading && [1, 2, 3].map(i => (
                    <div key={i} className="glass h-64 rounded-2xl animate-pulse border border-nova-border"></div>
                ))}

                {!loading && trends.map((trend) => (
                    <div key={trend.id} className="glass p-6 rounded-2xl border border-nova-border hover:border-nova-accent/30 transition-all flex flex-col group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="px-2 py-1 rounded bg-nova-accent/10 border border-nova-accent/20 text-[10px] font-bold text-nova-accent uppercase tracking-wider">
                                Intelligence Brief
                            </div>
                            <span className="text-[10px] text-nova-text-dim font-mono">{new Date(trend.created_at).toLocaleDateString()}</span>
                        </div>

                        <h4 className="text-lg font-bold text-white mb-2 group-hover:text-nova-accent transition-colors">{trend.topic}</h4>

                        <div className="flex-1 overflow-hidden relative mb-4">
                            <p className="text-xs text-nova-text-dim line-clamp-4 leading-relaxed italic">
                                {trend.analysis.summary.replace(/##/g, '').replace(/\*\*/g, '')}
                            </p>
                            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-nova-card to-transparent"></div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-nova-border/50">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-nova-text-dim font-medium uppercase tracking-tighter flex items-center gap-1.5">
                                    <BarChart3 size={14} className="text-nova-accent" />
                                    Fairness Score
                                </span>
                                <span className={`font-bold ${trend.score > 70 ? 'text-green-500' : 'text-orange-400'}`}>{trend.score}/100</span>
                            </div>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${trend.score > 70 ? 'bg-green-500' : 'bg-orange-400'}`}
                                    style={{ width: `${trend.score}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {trend.analysis.scam_indicators.length > 0 ? (
                                <div className="flex items-center gap-1 whitespace-nowrap px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[8px] font-bold text-red-500 uppercase tracking-widest">
                                    <AlertCircle size={10} /> Manipulation Detected
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 whitespace-nowrap px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-[8px] font-bold text-green-500 uppercase tracking-widest">
                                    <CheckCircle2 size={10} /> Trusted Strategy
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {!loading && trends.length === 0 && (
                    <div className="col-span-full py-20 text-center glass border-dashed border-nova-border rounded-3xl opacity-30">
                        <Bird size={48} className="mx-auto mb-4 text-nova-accent opacity-50" />
                        <p className="text-lg font-bold">No intelligence data yet.</p>
                        <p className="text-sm">Submit a topic to begin trend scanning.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrendsPage;
