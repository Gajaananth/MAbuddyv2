import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Terminal, ScrollText, Database, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
    target_name: string;
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

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [reportsRes, raidsRes] = await Promise.all([
                    api.get('/api/intelligence/reports'),
                    api.get('/api/intelligence/raids')
                ]);
                setReports(reportsRes.data.data || []);
                setRaids(raidsRes.data.data || []);
            } catch (err) {
                console.error('Failed to fetch data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleExport = (id: string, format: string, type: 'reports' | 'raids') => {
        window.open(`https://ma-buddy.vercel.app/api/intelligence/${type}/${id}/export?format=${format}`, '_blank');
    };

    return (
        <div className="w-full max-w-6xl mx-auto pb-24">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-white uppercase flex items-center gap-3">
                        <Terminal className="text-nova-accent" size={32} />
                        Important Reports
                    </h1>
                    <p className="text-nova-text-dim text-sm tracking-widest uppercase mt-1">Zium Nova Strategic Intelligence Archive</p>
                </div>
            </header>

            {/* Tab Navigation */}
            <div className="flex gap-4 border-b-2 border-nova-border/50 mb-8 pb-4">
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`text-sm font-black tracking-widest uppercase transition-all flex items-center gap-2 ${activeTab === 'reports' ? 'text-nova-accent border-b-2 border-nova-accent pb-1' : 'text-nova-text-dim hover:text-white pb-1'}`}
                >
                    <ScrollText size={16} />
                    Weekly Intelligence ({reports.length})
                </button>
                <button
                    onClick={() => setActiveTab('raids')}
                    className={`text-sm font-black tracking-widest uppercase transition-all flex items-center gap-2 ${activeTab === 'raids' ? 'text-nova-accent border-b-2 border-nova-accent pb-1' : 'text-nova-text-dim hover:text-white pb-1'}`}
                >
                    <Database size={16} />
                    Internet Raids ({raids.length})
                </button>
            </div>

            {loading ? (
                <div className="p-12 text-center text-nova-text-dim">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    <span className="text-xs uppercase tracking-widest font-bold">Accessing Archive...</span>
                </div>
            ) : activeTab === 'reports' ? (
                reports.length === 0 ? (
                    <div className="glass p-12 rounded-2xl border-2 border-nova-border text-center text-nova-text-dim font-bold uppercase tracking-widest text-sm">
                        No Weekly Reports Available
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reports.map((report) => (
                            <div key={report.id} className="glass p-6 rounded-2xl border-2 border-nova-border/50 hover:bg-white/[0.04] transition-colors relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-nova-accent opacity-50 shadow-[0_0_10px_rgba(0,242,255,0.8)]"></div>
                                <div className="space-y-3 font-mono text-sm">
                                    <div className="flex gap-2">
                                        <span className="text-nova-text-dim uppercase tracking-widest font-black w-36 shrink-0">REPORT ID:</span>
                                        <span className="text-nova-accent font-bold">R-{report.id.substring(0, 8).toUpperCase()}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-nova-text-dim uppercase tracking-widest font-black w-36 shrink-0">DATE:</span>
                                        <span className="text-white">{new Date(report.created_at).toISOString().split('T')[0]}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-nova-text-dim uppercase tracking-widest font-black w-36 shrink-0">CATEGORY:</span>
                                        <span className="text-white">Weekly Intelligence</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-nova-text-dim uppercase tracking-widest font-black w-36 shrink-0">SUMMARY:</span>
                                        <span className="text-white line-clamp-2">{report.summary}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-nova-text-dim uppercase tracking-widest font-black w-36 shrink-0">ACTION REQUIRED:</span>
                                        <span className="text-yellow-400 font-bold uppercase">{report.opportunity_score >= 80 ? 'CRITICAL REVIEW REQUIRED' : 'REVIEW OPPORTUNITIES'}</span>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span className="text-nova-text-dim uppercase tracking-widest font-black w-36 shrink-0">LINK:</span>
                                        <div className="flex gap-3">
                                            <button onClick={() => navigate(`/intelligence?id=${report.id}`)} className="text-nova-accent hover:text-white transition-colors underline decoration-nova-accent/50 underline-offset-4">[VIEW REPORT]</button>
                                            <button onClick={() => handleExport(report.id, 'pdf', 'reports')} className="text-nova-accent hover:text-white transition-colors underline decoration-nova-accent/50 underline-offset-4">[EXPORT PDF]</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : raids.length === 0 ? (
                <div className="glass p-12 rounded-2xl border-2 border-nova-border text-center text-nova-text-dim font-bold uppercase tracking-widest text-sm">
                    No Internet Raid Data Available
                </div>
            ) : (
                <div className="space-y-4">
                    {raids.map((raid) => (
                        <div key={raid.id} className="glass p-6 rounded-2xl border-2 border-nova-border/50 hover:bg-white/[0.04] transition-colors relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-nova-accent opacity-50 shadow-[0_0_10px_rgba(0,242,255,0.8)]"></div>
                            <div className="space-y-3 font-mono text-sm">
                                <div className="flex gap-2">
                                    <span className="text-nova-text-dim uppercase tracking-widest font-black w-36 shrink-0">REPORT ID:</span>
                                    <span className="text-nova-accent font-bold">R-{raid.id.substring(0, 8).toUpperCase()}</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-nova-text-dim uppercase tracking-widest font-black w-36 shrink-0">DATE:</span>
                                    <span className="text-white">{new Date(raid.created_at).toISOString().split('T')[0]}</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-nova-text-dim uppercase tracking-widest font-black w-36 shrink-0">CATEGORY:</span>
                                    <span className="text-white">Internet Raid Signal</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-nova-text-dim uppercase tracking-widest font-black w-36 shrink-0">SUMMARY:</span>
                                    <span className="text-white line-clamp-2">{raid.summary}</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-nova-text-dim uppercase tracking-widest font-black w-36 shrink-0">ACTION REQUIRED:</span>
                                    <span className="text-yellow-400 font-bold uppercase">{raid.risk_level === 'High' ? 'IMMEDIATE MITIGATION' : 'MONITOR FOR CHANGES'}</span>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <span className="text-nova-text-dim uppercase tracking-widest font-black w-36 shrink-0">LINK:</span>
                                    <div className="flex gap-3">
                                        <button onClick={() => navigate(`/intelligence?id=${raid.id}`)} className="text-nova-accent hover:text-white transition-colors underline decoration-nova-accent/50 underline-offset-4">[VIEW RAPID SIGNAL]</button>
                                        <button onClick={() => handleExport(raid.id, 'pdf', 'raids')} className="text-nova-accent hover:text-white transition-colors underline decoration-nova-accent/50 underline-offset-4">[EXPORT SIGNAL]</button>
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
