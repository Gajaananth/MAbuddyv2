import React, { useState } from 'react';
import { TrendingUp, Zap, Bird, Loader2 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useLiveTime } from '../hooks/useLiveTime';
import { trendService, intelligenceService } from '../services/api';
import NotificationActivationBanner from '../components/NotificationActivationBanner';

const Dashboard: React.FC = () => {
    const liveTime = useLiveTime();
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        // Artificial delay for "Brain Synchronization" effect
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsSyncing(false);
    };

    const [stats, setStats] = useState<any[]>([]);
    const [recentTrends, setRecentTrends] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = async () => {
        try {
            const [trendsRes, reportsRes] = await Promise.all([
                trendService.getTrends(),
                intelligenceService.getReports(3)
            ]);
            
            setRecentTrends(trendsRes.data?.data?.slice(0, 2) || []);
            
            // Derive some stats
            setStats([
                { label: 'Earning Sigals', value: reportsRes.data?.data?.length || 0, icon: <TrendingUp className="text-nova-accent" />, color: 'from-nova-accent/20' },
                { label: 'Trust Score', value: '98/100', icon: <Bird className="text-green-400" />, color: 'from-green-400/20' },
                { label: 'Agent Uptime', value: '100%', icon: <Zap className="text-yellow-400" />, color: 'from-yellow-400/20' },
            ]);
        } catch (err) {
            console.error('Failed to load dashboard data', err);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        loadData();
    }, []);

    return (
        <div className="flex flex-col items-start space-y-8 sm:space-y-16 animate-in fade-in duration-700 text-left w-full h-full pb-10 sm:pb-20 max-w-7xl mx-auto">
            {/* Push Notification Activation Banner */}
            <div className="w-full">
                <NotificationActivationBanner />
            </div>

            <header className="flex flex-col xl:flex-row justify-start items-start gap-6 sm:gap-10 xl:gap-20 w-full relative">
                <div className="space-y-2 sm:space-y-4 flex-shrink min-w-0">
                    <h2 className="text-2xl lg:text-xl font-black text-white tracking-tighter leading-[1.1] lg:leading-tight uppercase break-words flex items-center gap-3">
                        <Bird size={24} className="text-nova-accent hidden sm:block" />
                        <Bird size={20} className="text-nova-accent sm:hidden" />
                        <div>Command <br className="sm:hidden" /> <span className="nova-gradient-text">Dashboard</span></div>
                    </h2>


                    <p className="text-nova-text-dim max-w-xl text-xs sm:text-sm md:text-base leading-relaxed font-bold opacity-70">
                        Observe. Analyze. Act only when trust and fairness are guaranteed.
                    </p>
                </div>
                <div className="shrink-0 xl:pt-4 flex flex-col items-start">
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-nova-accent animate-pulse"></div>
                        <div className="text-[8px] sm:text-[10px] md:text-xs text-nova-text-dim uppercase tracking-[0.2em] font-black opacity-60">Local Intelligence</div>
                    </div>
                    <div className="text-xl sm:text-2xl md:text-3xl font-mono font-black text-nova-accent tracking-tighter">{liveTime.short}</div>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 md:gap-10 w-full">
                {stats.map((stat, i) => (stat &&
                    <div key={i} className="glass p-5 sm:p-6 sm:p-8 rounded-2xl sm:rounded-3xl border-2 border-nova-border hover:border-nova-accent/50 transition-all duration-500 group relative overflow-hidden shadow-2xl min-w-0">
                        <div className={`absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-gradient-to-br ${stat.color} to-transparent blur-[80px] sm:blur-[100px] -mr-24 sm:-mr-32 -mt-24 sm:-mt-32 opacity-20 group-hover:opacity-60 transition-opacity`}></div>
                        <div className="flex justify-between items-start relative z-10 w-full gap-4">
                            <div className="p-2 lg:p-3 bg-white/5 rounded-xl border border-white/10 group-hover:bg-nova-bg transition-colors shadow-inner shrink-0">{stat.icon}</div>
                            <div className="text-xl lg:text-lg font-black text-white tracking-tighter truncate">{stat.value}</div>
                        </div>


                        <div className="mt-4 sm:mt-6 text-[10px] sm:text-xs sm:text-sm font-black text-nova-text-dim uppercase tracking-[0.15em] relative z-10 text-left truncate">{stat.label}</div>
                    </div>
                ))}
            </div>

            <div className="w-full max-w-4xl mx-auto">
                {/* Unified Intelligence Section */}
                <div className="glass p-5 sm:p-10 rounded-2xl sm:rounded-3xl border-2 border-nova-border bg-nova-accent/[0.02]">
                    <div className="flex justify-between items-center mb-6 sm:mb-8">
                        <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 sm:gap-3">
                            <TrendingUp size={20} className="text-nova-accent" />
                            Global Pulse
                        </h3>
                        <NavLink to="/trends" className="text-[10px] sm:text-xs font-black text-nova-accent hover:underline uppercase tracking-widest shrink-0">Trends Analysis</NavLink>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        {isLoading ? (
                            <div className="col-span-2 flex items-center justify-center p-12">
                                <Loader2 size={32} className="animate-spin text-nova-accent opacity-50" />
                            </div>
                        ) : recentTrends.length === 0 ? (
                            <div className="col-span-2 text-center p-8 glass rounded-2xl border border-dashed border-nova-border">
                                <p className="text-nova-text-dim text-xs uppercase font-black tracking-widest">No signals detected in this cycle.</p>
                            </div>
                        ) : recentTrends.map((trend, i) => (
                            <div key={i} className="p-6 sm:p-8 bg-nova-bg/40 rounded-2xl sm:rounded-3xl border border-nova-border relative overflow-hidden group hover:border-nova-accent/20 transition-all">
                                <div className={`absolute inset-y-0 left-0 w-1.5 sm:w-2 ${trend.score > 70 ? 'bg-green-500' : 'bg-red-500'} shadow-[0_0_15px_rgba(0,0,0,0.5)]`}></div>
                                <div className="text-[8px] sm:text-[9px] font-black text-nova-text-dim uppercase tracking-wider mb-2 opacity-50">{trend.status || 'ANALYZING'}</div>
                                <div className="font-black text-white text-base sm:text-lg mb-3 sm:mb-4 tracking-tight group-hover:text-nova-accent transition-colors truncate">{trend.topic}</div>
                                <div className="w-full bg-white/5 h-1.5 sm:h-2 rounded-full overflow-hidden shadow-inner">
                                    <div className={`h-full ${trend.score > 70 ? 'bg-green-500' : 'bg-red-500'} shadow-[0_0_10px_rgba(0,242,255,0.3)] transition-all duration-1000`} style={{ width: `${trend.score}%` }}></div>
                                </div>
                                <div className="flex justify-between mt-3 sm:mt-4">
                                    <span className="text-[8px] sm:text-[10px] font-black text-nova-text-dim uppercase opacity-40">Trust Factor</span>
                                    <span className={`text-[10px] sm:text-xs font-black ${trend.score > 70 ? 'text-green-400' : 'text-red-400'}`}>{trend.score}%</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="w-full mt-8 sm:mt-12 py-4 sm:py-6 rounded-xl sm:rounded-2xl bg-nova-accent/10 text-nova-accent text-sm sm:text-base font-black border-2 border-nova-accent/30 hover:bg-nova-accent hover:text-nova-bg transition-all duration-300 uppercase tracking-[0.15em] sm:tracking-widest shadow-xl shadow-nova-accent/20 active:scale-95 shrink-0 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSyncing ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Syncing...
                            </>
                        ) : (
                            'Synchronize Brain'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
