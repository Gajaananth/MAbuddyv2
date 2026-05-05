import api, { intelligenceService } from '../services/api';
import { Terminal, ScrollText, Database, Loader2, Clock } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatTimestamp } from '../utils/formatUtils';

interface Report {
    id: string;
    ride_type: string;
    topic_focus?: string;
    summary: string;
    status: string;
    opportunity_score: number;
    created_at: string;
}

interface Raid {
    id: string;
    source_platform?: string; // Unified naming
    category: string;
    summary: string;
    risk_level: string;
    monetization_potential: string;
    created_at: string;
}

const ReportsPage: React.FC = () => {
    const [reports, setReports] = useState<Report[]>([]);
    const [raids, setRaids] = useState<Raid[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'reports' | 'raids'>('reports');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const highlightId = searchParams.get('id');
    const highlightRaidId = searchParams.get('raidId');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [reportsRes, raidsRes] = await Promise.all([
                    api.get('/intelligence/reports'),
                    api.get('/intelligence/raids')
                ]);
                
                let allReports = reportsRes.data.data || [];
                let allRaids = raidsRes.data.data || [];

                // No longer filtering. Instead, we highlight and scroll.
                if (highlightRaidId) {
                    setActiveTab('raids');
                }

                setReports(allReports);
                setRaids(allRaids);
            } catch (err) {
                console.error('Failed to fetch data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [highlightId, highlightRaidId]);

        if (!loading) {
            const targetId = highlightId || highlightRaidId;
            if (targetId) {
                setTimeout(() => {
                    const el = document.getElementById(`item-${targetId}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('ring-2', 'ring-nova-accent', 'ring-offset-2');
                        setTimeout(() => el.classList.remove('ring-2', 'ring-nova-accent', 'ring-offset-2'), 4000);
                    }
                }, 600);
            }
        }
    }, [loading, activeTab, highlightId, highlightRaidId]);

    const isHighlightMissing = (highlightId && !reports.some(r => r.id === highlightId)) || 
                              (highlightRaidId && !raids.some(r => r.id === highlightRaidId));

    const handleExport = (id: string, format: string, type: 'reports' | 'raids') => {
        intelligenceService.downloadReport(id, format as any, type);
    };

    return (
        <div className="w-full max-w-6xl mx-auto pb-24">
            <header className="mb-8 sm:mb-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tighter text-white uppercase flex items-center gap-3">
                        <Terminal className="text-nova-accent shrink-0" size={28} />
                        {highlightId || highlightRaidId ? 'Targeted Signal' : 'Intelligence Archive'}
                    </h1>
                    <p className="text-nova-text-dim text-[10px] sm:text-xs tracking-[0.3em] uppercase mt-2 font-bold opacity-70">Strategic Information Repository</p>
                </div>
                {(highlightId || highlightRaidId) && (
                    <button
                        onClick={() => { navigate('/reports'); window.location.reload(); }}
                        className="btn-premium text-[10px] sm:text-[11px] font-black tracking-widest uppercase text-nova-accent bg-nova-accent/10 px-4 sm:px-5 py-2.5 rounded-xl border border-nova-accent/30 hover:bg-nova-accent/20 transition-all whitespace-nowrap"
                    >
                        VIEW FULL ARCHIVE
                    </button>
                )}
            </header>

            {/* Nova Performance Dashboard Widgets */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
                <div className="glass p-4 rounded-xl border border-nova-border flex flex-col justify-between">
                    <span className="text-[10px] uppercase text-nova-text-dim tracking-widest font-black">Opportunity Pipeline</span>
                    <span className="text-xl font-black text-white mt-2">12 Active</span>
                    <span className="text-[10px] text-green-400 mt-1">+3 this week</span>
                </div>
                <div className="glass p-4 rounded-xl border border-nova-border flex flex-col justify-between">
                    <span className="text-[10px] uppercase text-nova-text-dim tracking-widest font-black">Earnings Insights</span>
                    <span className="text-xl font-black text-white mt-2">$2,450</span>
                    <span className="text-[10px] text-green-400 mt-1">Estimated +15%</span>
                </div>
                <div className="glass p-4 rounded-xl border border-nova-border flex flex-col justify-between">
                    <span className="text-[10px] uppercase text-nova-text-dim tracking-widest font-black">Learning Trends</span>
                    <span className="text-xl font-black text-white mt-2">8 Patterns</span>
                    <span className="text-[10px] text-nova-accent mt-1">High Accuracy</span>
                </div>
                <div className="glass p-4 rounded-xl border border-nova-border flex flex-col justify-between">
                    <span className="text-[10px] uppercase text-nova-text-dim tracking-widest font-black">Decision Confidence</span>
                    <span className="text-xl font-black text-white mt-2">94%</span>
                    <span className="text-[10px] text-nova-accent mt-1">Based on 50+ actions</span>
                </div>
                <div className="glass p-4 rounded-xl border border-nova-border flex flex-col justify-between">
                    <span className="text-[10px] uppercase text-nova-text-dim tracking-widest font-black">Resource Allocation</span>
                    <span className="text-xl font-black text-white mt-2">Optimized</span>
                    <span className="text-[10px] text-nova-text-dim mt-1">4h Focus Saved</span>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-4 sm:gap-8 border-b border-nova-border mb-8 sm:mb-10 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`text-xs font-black tracking-[0.2em] uppercase transition-all flex items-center gap-2 pb-4 border-b-2 whitespace-nowrap shrink-0 ${activeTab === 'reports' ? 'text-nova-accent border-nova-accent' : 'text-nova-text-dim border-transparent hover:text-white'}`}
                >
                    <ScrollText size={16} />
                    Weekly Intel ({reports.length})
                </button>
                <button
                    onClick={() => setActiveTab('raids')}
                    className={`text-xs font-black tracking-[0.2em] uppercase transition-all flex items-center gap-2 pb-4 border-b-2 whitespace-nowrap shrink-0 ${activeTab === 'raids' ? 'text-nova-accent border-nova-accent' : 'text-nova-text-dim border-transparent hover:text-white'}`}
                >
                    <Database size={16} />
                    Internet Raids ({raids.length})
                </button>
            </div>
 
            {!loading && reports.length === 0 && raids.length === 0 && (
                <div className="text-center py-20">
                    <p className="text-nova-text-dim text-sm font-bold">No intelligence data yet.</p>
                    <p className="text-nova-text-dim/50 text-xs mt-2">Trigger a Network Ride to start generating reports.</p>
                </div>
            )}

            {loading ? (
                <div className="p-20 text-center text-nova-text-dim">
                    <Loader2 className="animate-spin mx-auto mb-4 text-nova-accent" size={32} />
                    <span className="text-[10px] uppercase tracking-[0.3em] font-black">Decrypting Archive...</span>
                </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:gap-6">
                        {isHighlightMissing && activeTab === 'reports' && (
                            <div className="glass p-6 rounded-2xl border border-nova-accent/30 bg-nova-accent/5 mb-4 animate-pulse">
                                <p className="text-nova-accent text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={14} />
                                    This intelligence finding may still be processing. Here are the latest findings:
                                </p>
                            </div>
                        )}
                        {reports.length === 0 && (
                            <div className="glass p-16 rounded-3xl border-2 border-dashed border-nova-border text-center text-nova-text-dim font-black uppercase tracking-[0.2em] text-sm">
                                No Reports Found
                            </div>
                        )}
                        {reports.map((report) => (
                            <div key={report.id} id={`item-${report.id}`} className={`card-intelligence glass p-5 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all relative overflow-hidden group ${highlightId === report.id ? 'border-nova-accent bg-nova-accent/[0.03] shadow-[0_0_40px_rgba(0,242,255,0.15)] ring-1 ring-nova-accent' : 'border-nova-border/50'}`}>
                                <div className={`absolute top-0 left-0 w-1.5 h-full opacity-60 ${highlightId === report.id ? 'bg-nova-accent' : 'bg-nova-accent/30'}`}></div>
                                
                                <div className="space-y-5">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                                            <span className="text-[9px] sm:text-[10px] font-black text-nova-accent bg-nova-accent/10 px-2 sm:px-2.5 py-1 rounded-md tracking-tighter border border-nova-accent/20 whitespace-nowrap">
                                                R-{report.id.substring(0, 8).toUpperCase()}
                                            </span>
                                            <span className="text-[9px] sm:text-[10px] font-black text-white/40 uppercase tracking-widest">
                                                {formatTimestamp(report.created_at)}
                                            </span>
                                        </div>
                                        <div className="flex gap-1 sm:gap-2 shrink-0">
                                            <button onClick={() => handleExport(report.id, 'pdf', 'reports')} className="p-2 hover:bg-white/10 rounded-lg text-nova-text-dim hover:text-nova-accent transition-all" title="PDF"><ScrollText size={16} /></button>
                                            <button onClick={() => handleExport(report.id, 'word', 'reports')} className="p-2 hover:bg-white/10 rounded-lg text-nova-text-dim hover:text-white transition-all" title="Word"><Database size={16} /></button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-base sm:text-xl font-black text-white leading-tight">Weekly Intelligence Briefing</h3>
                                        <p className="text-sm sm:text-base text-nova-text-dim leading-relaxed font-medium">
                                            {report.summary}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 pt-2">
                                        <button 
                                            onClick={() => navigate(`/intelligence?id=${report.id}`)} 
                                            className="flex-1 sm:flex-none btn-premium px-4 sm:px-6 py-2.5 bg-nova-accent text-nova-bg rounded-xl text-[10px] sm:text-[11px] font-black tracking-[0.2em] shadow-[0_4px_15px_rgba(0,242,255,0.3)] hover:shadow-[0_4px_25px_rgba(0,242,255,0.5)] transition-all text-center"
                                        >
                                            OPEN FULL REPORT
                                        </button>
                                        <div className="px-3 sm:px-4 py-2 bg-yellow-400/10 border border-yellow-400/30 rounded-xl">
                                            <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">
                                                {report.opportunity_score >= 80 ? 'CRITICAL' : 'ROUTINE'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
                )
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:gap-6">
                    {isHighlightMissing && activeTab === 'raids' && (
                        <div className="glass p-6 rounded-2xl border border-red-500/30 bg-red-500/5 mb-4 animate-pulse">
                            <p className="text-red-400 text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                                <Clock size={14} />
                                This intelligence finding may still be processing. Here are the latest findings:
                            </p>
                        </div>
                    )}
                    {raids.length === 0 && (
                        <div className="glass p-16 rounded-3xl border-2 border-dashed border-nova-border text-center text-nova-text-dim font-black uppercase tracking-[0.2em] text-sm">
                            No Internet Raid Data
                        </div>
                    )}
                    {raids.map((raid) => (
                        <div key={raid.id} id={`item-${raid.id}`} className={`card-intelligence glass p-5 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all relative overflow-hidden group ${highlightRaidId === raid.id ? 'border-red-500 bg-red-500/[0.03] shadow-[0_0_40px_rgba(239,68,68,0.15)] ring-1 ring-red-500' : 'border-nova-border/50'}`}>
                            <div className="absolute top-0 left-0 w-1.5 h-full opacity-60 bg-red-500/30"></div>
                            
                            <div className="space-y-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                                        <span className="text-[9px] sm:text-[10px] font-black text-red-400 bg-red-400/10 px-2 sm:px-2.5 py-1 rounded-md tracking-tighter border border-red-400/20 whitespace-nowrap">
                                            RAID-{raid.id.substring(0, 8).toUpperCase()}
                                        </span>
                                        <span className="text-[9px] sm:text-[10px] font-black text-white/40 uppercase tracking-widest">
                                            {formatTimestamp(raid.created_at)}
                                        </span>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <button onClick={() => handleExport(raid.id, 'pdf', 'raids')} className="p-2 hover:bg-white/10 rounded-lg text-nova-text-dim hover:text-red-400 transition-all" title="PDF"><ScrollText size={16} /></button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-base sm:text-xl font-black text-white leading-tight">Raid: {raid.category || raid.source_platform || 'Unknown Target'}</h3>
                                    <p className="text-sm sm:text-base text-nova-text-dim leading-relaxed font-medium">
                                        {raid.summary}
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 pt-2">
                                    <button 
                                        onClick={() => navigate(`/intelligence?id=${raid.id}`)} 
                                        className="flex-1 sm:flex-none btn-premium px-4 sm:px-6 py-2.5 bg-red-500 text-white rounded-xl text-[10px] sm:text-[11px] font-black tracking-[0.2em] shadow-[0_4px_15px_rgba(239,68,68,0.2)] hover:shadow-[0_4px_25px_rgba(239,68,68,0.4)] transition-all text-center"
                                    >
                                        VIEW RAPID SIGNAL
                                    </button>
                                    <div className={`px-3 sm:px-4 py-2 rounded-xl border ${raid.risk_level === 'High' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
                                        <span className="text-[9px] font-black uppercase tracking-widest">
                                            RISK: {raid.risk_level.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReportsPage;
