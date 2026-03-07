import React, { useState, useEffect } from 'react';
import { Bird, Search, Download, AlertTriangle, Clock, Radio, ChevronDown, Zap, Trash2, FileText, Check } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { intelligenceService } from '../services/api';
import { useLiveTime } from '../hooks/useLiveTime';

interface RideResult {
    id: string;
    category: string;
    risk_level: 'Low' | 'Medium' | 'High';
    source_platform: string;
    content: string;
    summary: string;
    tags: string[];
    created_at: string;
}

interface WeeklyReport {
    id: string;
    report_data: any;
    period_start: string;
    period_end: string;
    created_at: string;
}

const riskColors: Record<string, string> = {
    High: 'bg-red-500/10 text-red-400 border-red-500/30',
    Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    Low: 'bg-green-500/10 text-green-400 border-green-500/30',
};

const IntelligenceDashboard: React.FC = () => {
    const [rides, setRides] = useState<RideResult[]>([]);
    const [reports, setReports] = useState<WeeklyReport[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'rides' | 'reports'>('rides');
    const [loading, setLoading] = useState(true);
    const [triggerLoading, setTriggerLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [expandedReports, setExpandedReports] = useState<string[]>([]);
    const [rideStatus, setRideStatus] = useState<{
        status: string;
        currentCluster: string;
        clustersCompleted: number;
        totalClusters: number;
    } | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const liveTime = useLiveTime();

    useEffect(() => {
        loadData();
    }, [activeTab]);

    useEffect(() => {
        setSelectedIds([]);
    }, [activeTab]);

    // Polling for Ride Status
    // We always poll while triggerLoading=true so we don't stop
    // before the server has had time to register the ride as started.
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        let prevClustersCompleted = 0;

        const checkStatus = async () => {
            try {
                const res = await intelligenceService.getRideStatus();
                const data = res.data.data;

                if (data.status && data.status !== 'idle') {
                    setRideStatus(data);

                    // Reload data when a new cluster finishes
                    if (data.clustersCompleted > prevClustersCompleted) {
                        loadData();
                        prevClustersCompleted = data.clustersCompleted;
                    }

                    if (data.status === 'completed' || data.status === 'failed') {
                        setTriggerLoading(false);
                        setRideStatus(null);
                        loadData();
                    }
                }
                // If idle while triggerLoading is true, keep waiting —
                // the background raid may not have started yet.
            } catch (error) {
                console.error('[Intelligence] Status Poll Error:', error);
            }
        };

        if (triggerLoading || rideStatus) {
            interval = setInterval(checkStatus, 2500);
        }

        return () => clearInterval(interval);
    }, [triggerLoading, rideStatus]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [ridesRes, reportsRes] = await Promise.all([
                intelligenceService.getRides(),
                intelligenceService.getReports(),
            ]);
            const fetchedRides = ridesRes.data.data || [];
            const fetchedReports = reportsRes.data.data || [];
            setRides(fetchedRides);
            setReports(fetchedReports);

            // Check for highlighted ID from search params
            const targetId = searchParams.get('id');
            if (targetId) {
                setHighlightedId(targetId);
                // Determine if it's a ride or report
                const isRide = fetchedRides.some((r: RideResult) => r.id === targetId);
                const isReport = fetchedReports.some((r: WeeklyReport) => r.id === targetId);

                if (isRide) setActiveTab('rides');
                else if (isReport) setActiveTab('reports');

                // Clear search params to avoid persistent highlighting
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('id');
                setSearchParams(newParams, { replace: true });
            }
        } catch (error) {
            console.error('[Intelligence] Load Error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Scroll to highlighted item
    useEffect(() => {
        if (highlightedId && !loading) {
            const timer = setTimeout(() => {
                const element = document.getElementById(`finding-${highlightedId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                // Fade out highlight after 3 seconds
                const fadeTimer = setTimeout(() => setHighlightedId(null), 3000);
                return () => clearTimeout(fadeTimer);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [highlightedId, loading]);

    const handleTriggerRide = async () => {
        if (triggerLoading) return;
        setTriggerLoading(true);
        try {
            await intelligenceService.triggerRide('end-of-week');
            // Status effect will take over polling
        } catch (error: any) {
            console.error('[Intelligence] Trigger Error:', error);
            alert(error.response?.data?.error || 'Failed to trigger Internet Ride');
            setTriggerLoading(false);
        }
    };

    const handleExport = async (reportId: string, format: 'json' | 'pdf' | 'word' = 'json') => {
        try {
            const res = await intelligenceService.exportReport(reportId, format);
            const type = format === 'json' ? 'application/json' :
                format === 'pdf' ? 'application/pdf' :
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

            const blob = new Blob([res.data], { type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const ext = format === 'json' ? 'json' : format === 'pdf' ? 'pdf' : 'docx';
            a.download = `intelligence_report_${reportId}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('[Intelligence] Export Error:', error);
            alert('Export failed. Please try again.');
        }
    };

    const handleRideExport = async (raidId: string, format: 'pdf' = 'pdf') => {
        try {
            const res = await intelligenceService.exportRide(raidId, format);
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `intelligence_finding_${raidId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('[Intelligence] Internet Ride Export Error:', error);
            alert('Export failed. Please try again.');
        }
    };

    const handleDeleteRide = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this intelligence finding?')) return;
        try {
            await intelligenceService.deleteRide(id);
            loadData();
        } catch (error) {
            console.error('[Intelligence] Delete Internet Ride Error:', error);
        }
    };

    const handleDeleteReport = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this weekly report?')) return;
        try {
            await intelligenceService.deleteReport(id);
            loadData();
        } catch (error) {
            console.error('[Intelligence] Delete Report Error:', error);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        const type = activeTab === 'rides' ? 'intelligence findings' : 'weekly reports';
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} ${type}?`)) return;

        try {
            if (activeTab === 'rides') {
                await intelligenceService.bulkDeleteRides(selectedIds);
            } else {
                await intelligenceService.bulkDeleteReports(selectedIds);
            }
            setSelectedIds([]);
            loadData();
        } catch (error) {
            console.error('[Intelligence] Bulk Delete Error:', error);
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (activeTab === 'rides') {
            if (selectedIds.length === rides.length) {
                setSelectedIds([]);
            } else {
                setSelectedIds(rides.map(r => r.id));
            }
        } else {
            if (selectedIds.length === reports.length) {
                setSelectedIds([]);
            } else {
                setSelectedIds(reports.map(r => r.id));
            }
        }
    };

    const toggleReportExpansion = (id: string) => {
        setExpandedReports(prev =>
            prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
        );
    };

    const cleanse = (text: string) => {
        if (!text) return '';
        // Remove markdown symbols (**bold**, *italic*, # header, `code`)
        return text.replace(/(\*\*|\*|_|#|`)/g, '').replace(/\\n/g, '\n').trim();
    };

    const filteredRides = rides.filter(
        (r: RideResult) =>
            r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.tags.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="w-full max-w-7xl mx-auto pb-20 px-0 sm:px-0 flex flex-col">
            {/* Header */}
            <header className="mb-8 sm:mb-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div className="flex items-center gap-4 lg:gap-3">
                    <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 relative shadow-2xl shrink-0">
                        <Bird size={24} className="lg:hidden" />
                        <Bird size={30} className="hidden lg:block" />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 lg:w-3.5 lg:h-3.5 bg-red-500 rounded-full border-2 border-nova-bg animate-pulse"></div>
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-xl lg:text-base font-black text-white tracking-tight uppercase truncate">Intelligence Hub</h2>
                        <p className="text-[10px] lg:text-[10px] text-nova-text-dim font-bold flex items-center gap-1.5 lg:gap-1 truncate">
                            <Radio size={10} className="text-red-400 animate-pulse shrink-0" />
                            <span className="truncate">{liveTime.full} — {rides.length} findings</span>
                        </p>
                    </div>
                </div>


                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <button
                        onClick={handleTriggerRide}
                        disabled={triggerLoading}
                        className="flex-1 lg:flex-none px-4 lg:px-5 py-2.5 lg:py-2 rounded-xl lg:rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-black text-[10px] lg:text-xs uppercase tracking-widest hover:bg-red-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Zap size={14} className="shrink-0" />
                        <span className="truncate">{triggerLoading ? 'Riding...' : 'Trigger Internet Ride'}</span>
                    </button>
                </div>

            </header>

            {/* Raid Progress Bar */}
            {rideStatus && rideStatus.status !== 'completed' && rideStatus.status !== 'failed' && (
                <div className="mb-8 sm:mb-10 p-4 sm:p-6 glass rounded-xl sm:rounded-2xl border-2 border-nova-accent/30 bg-nova-accent/5 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex justify-between items-end mb-3">
                        <div className="space-y-0.5">
                            <h3 className="text-sm lg:text-[13px] font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                                <Zap size={15} className="text-nova-accent animate-pulse shrink-0" />
                                Strategic Internet Ride
                            </h3>
                            <p className="text-[9px] lg:text-[9px] text-nova-text-dim font-bold uppercase tracking-widest">
                                Phase: <span className="text-nova-accent">{rideStatus.currentCluster}</span>
                                ({rideStatus.clustersCompleted + 1}/{rideStatus.totalClusters})
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-xl lg:text-lg font-mono font-black text-nova-accent">
                                {Math.round((rideStatus.clustersCompleted / rideStatus.totalClusters) * 100)}%
                            </span>
                        </div>

                    </div>
                    <div className="w-full h-2 sm:h-3 bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
                        <div
                            className="h-full bg-nova-accent rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)]"
                            style={{ width: `${(rideStatus.clustersCompleted / rideStatus.totalClusters) * 100}%` }}
                        ></div>
                    </div>
                    <div className="mt-3 sm:mt-4 flex items-center gap-2 sm:gap-3 text-[8px] sm:text-[10px] font-black text-nova-text-dim uppercase tracking-[0.2em] opacity-60">
                        <div className="flex gap-1">
                            <div className="w-1 h-1 bg-nova-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1 h-1 bg-nova-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1 h-1 bg-nova-accent rounded-full animate-bounce"></div>
                        </div>
                        Engaging protocols...
                    </div>
                </div>
            )}

            {/* Security Notice / Disclaimer */}
            <div className="mb-6 sm:mb-8 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl flex items-center gap-4">
                <AlertTriangle size={20} className="text-yellow-500 shrink-0" />
                <p className="text-[10px] sm:text-xs text-yellow-500/80 font-medium leading-relaxed">
                    <span className="font-bold uppercase tracking-widest mr-2">Financial Disclaimer:</span>
                    This system provides tactical analytical insights based on strategic intelligence protocols. Information is for educational and strategic planning purposes only and does NOT constitute financial, investment, or legal advice.
                </p>
            </div>

            {/* Tabs & Bulk Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 sm:mb-8">
                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => setActiveTab('rides')}
                        className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-sm uppercase tracking-widest transition-all ${activeTab === 'rides'
                            ? 'bg-nova-accent/10 text-nova-accent border border-nova-accent/30 shadow-[0_0_15px_rgba(0,242,255,0.1)]'
                            : 'bg-white/5 text-nova-text-dim border border-transparent hover:border-white/10'
                            }`}
                    >
                        Internet Ride Findings ({rides.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-sm uppercase tracking-widest transition-all ${activeTab === 'reports'
                            ? 'bg-nova-accent/10 text-nova-accent border border-nova-accent/30 shadow-[0_0_15px_rgba(0,242,255,0.1)]'
                            : 'bg-white/5 text-nova-text-dim border border-transparent hover:border-white/10'
                            }`}
                    >
                        Reports ({reports.length})
                    </button>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            <Trash2 size={14} />
                            Delete ({selectedIds.length})
                        </button>
                    )}
                    <button
                        onClick={toggleSelectAll}
                        className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-nova-text-dim text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                        {selectedIds.length === (activeTab === 'rides' ? rides.length : reports.length) && (activeTab === 'rides' ? rides.length : reports.length) > 0
                            ? 'Deselect All' : 'Select All'}
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            {activeTab === 'rides' && (
                <div className="mb-6 sm:mb-8 relative">
                    <Search size={16} className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-nova-text-dim" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search intelligence archive..."
                        className="w-full bg-nova-card border-2 border-nova-border text-white pl-12 sm:pl-14 pr-4 sm:pr-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl focus:outline-none focus:border-nova-accent transition-all placeholder:text-nova-text-dim/30 text-sm sm:text-base font-bold"
                    />
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="flex gap-2">
                        <div className="w-2 h-2 bg-nova-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-nova-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-nova-accent rounded-full animate-bounce"></div>
                    </div>
                    <span className="text-[10px] sm:text-xs font-black text-nova-accent uppercase tracking-[0.2em]">Synchronizing Intelligence...</span>
                </div>
            ) : activeTab === 'rides' ? (
                <div className="space-y-4 sm:space-y-6">
                    {filteredRides.length === 0 ? (
                        <div className="text-center py-20 opacity-30 glass rounded-3xl border-2 border-dashed border-nova-border">
                            <Bird size={64} className="mx-auto mb-4 text-nova-accent" />
                            <h3 className="text-sm sm:text-lg font-black text-white uppercase tracking-widest">No Intelligence Data</h3>
                        </div>
                    ) : (
                        filteredRides.map((ride: RideResult) => (
                            <div
                                key={ride.id}
                                id={`finding-${ride.id}`}
                                className={`glass p-5 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all group relative overflow-hidden ${selectedIds.includes(ride.id) ? 'border-nova-accent bg-nova-accent/5' : highlightedId === ride.id ? 'border-nova-accent bg-nova-accent/10 shadow-[0_0_30px_rgba(0,242,255,0.2)] scale-[1.02] z-20' : 'border-nova-border hover:border-nova-accent/30'}`}
                            >
                                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                                    {/* Selection Checkbox - Moved inside flow */}
                                    <div className="flex items-center gap-4 sm:flex-col sm:justify-start">
                                        <div className="relative cursor-pointer shrink-0">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(ride.id)}
                                                onChange={() => toggleSelection(ride.id)}
                                                className="w-6 h-6 rounded-lg opacity-0 absolute inset-0 cursor-pointer z-10"
                                            />
                                            <div className={`w-6 h-6 border-2 rounded-lg flex items-center justify-center transition-all ${selectedIds.includes(ride.id) ? 'bg-nova-accent border-nova-accent text-nova-bg' : 'border-nova-border bg-white/5'}`}>
                                                <Check size={14} className={selectedIds.includes(ride.id) ? 'opacity-100' : 'opacity-0'} />
                                            </div>
                                        </div>
                                        <div className="flex sm:flex-col items-center gap-3 sm:gap-2">
                                            <button
                                                onClick={() => handleRideExport(ride.id, 'pdf')}
                                                className="p-2 rounded-lg bg-nova-accent/10 border border-nova-accent/30 text-nova-accent hover:bg-nova-accent/20 transition-all shadow-lg shadow-nova-accent/5"
                                                title="Export PDF"
                                            >
                                                <FileText size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRide(ride.id)}
                                                className="p-2 text-nova-text-dim hover:text-red-400 transition-colors"
                                                title="Delete Intelligence"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
                                            <span className={`px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-black uppercase tracking-widest border ${riskColors[ride.risk_level]}`}>
                                                {ride.risk_level} Risk
                                            </span>
                                            <span className="text-[9px] sm:text-xs font-mono text-nova-text-dim opacity-50">/{ride.category}</span>
                                        </div>

                                        <p className="text-sm sm:text-base text-nova-text font-medium leading-relaxed mb-4">{ride.content}</p>

                                        <details className="group/details mb-4">
                                            <summary className="cursor-pointer text-[10px] sm:text-xs font-black text-nova-accent uppercase tracking-widest flex items-center gap-2 hover:opacity-80 list-none">
                                                <ChevronDown size={14} className="group-open/details:rotate-180 transition-transform" />
                                                Agent Analysis Summary
                                            </summary>
                                            <div className="mt-3 p-4 bg-nova-accent/[0.03] border border-nova-accent/10 rounded-xl text-xs sm:text-sm text-nova-text-dim leading-relaxed whitespace-pre-wrap italic">
                                                "{cleanse(ride.summary)}"
                                            </div>
                                        </details>

                                        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                                            <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 text-[8px] sm:text-[9px] font-black text-nova-text-dim uppercase border border-white/10 uppercase tracking-tighter">
                                                <Radio size={8} className="text-nova-accent" /> {ride.source_platform}
                                            </span>
                                            {ride.tags.map((tag, i) => (
                                                <span key={i} className="px-2 py-1 rounded bg-nova-accent/5 text-[8px] sm:text-[9px] font-black text-nova-accent uppercase border border-nova-accent/10">
                                                    #{tag}
                                                </span>
                                            ))}
                                            <span className="ml-auto text-[8px] sm:text-[9px] font-mono text-nova-text-dim/40 self-center uppercase">
                                                {new Date(ride.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="space-y-4 sm:space-y-6">
                    {reports.length === 0 ? (
                        <div className="text-center py-20 opacity-30 glass rounded-3xl border-2 border-dashed border-nova-border">
                            <Clock size={64} className="mx-auto mb-4 text-nova-accent" />
                            <h3 className="text-sm sm:text-lg font-black text-white uppercase tracking-widest">No Reports Generated</h3>
                        </div>
                    ) : (
                        reports.map((report: WeeklyReport) => (
                            <div
                                key={report.id}
                                className={`glass p-5 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all group relative overflow-hidden ${selectedIds.includes(report.id) ? 'border-nova-accent bg-nova-accent/5' : 'border-nova-border hover:border-nova-accent/30'}`}
                            >
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-6 mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(report.id)}
                                                onChange={() => toggleSelection(report.id)}
                                                className="w-6 h-6 rounded-lg opacity-0 absolute inset-0 cursor-pointer z-10"
                                            />
                                            <div className={`w-6 h-6 border-2 rounded-lg flex items-center justify-center transition-all ${selectedIds.includes(report.id) ? 'bg-nova-accent border-nova-accent text-nova-bg' : 'border-nova-border bg-white/5'}`}>
                                                <Check size={14} className={selectedIds.includes(report.id) ? 'opacity-100' : 'opacity-0'} />
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-sm sm:text-lg font-black text-white uppercase tracking-tight">Intelligence Report</h3>
                                            <p className="text-[10px] sm:text-xs text-nova-text-dim font-bold uppercase tracking-widest opacity-60">
                                                {new Date(report.period_start).toLocaleDateString()} — {new Date(report.period_end).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                                        <button
                                            onClick={() => handleExport(report.id, 'json')}
                                            className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-nova-text-dim hover:text-white transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-2"
                                        >
                                            <Download size={12} /> JSON
                                        </button>
                                        <button
                                            onClick={() => handleExport(report.id, 'word')}
                                            className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-2"
                                        >
                                            <FileText size={12} /> DOCX
                                        </button>
                                        <button
                                            onClick={() => handleExport(report.id, 'pdf')}
                                            className="px-2.5 py-1.5 rounded-lg bg-nova-accent/10 border border-nova-accent/20 text-nova-accent hover:bg-nova-accent/20 transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-2"
                                        >
                                            <FileText size={12} /> PDF
                                        </button>
                                        <button
                                            onClick={() => handleDeleteReport(report.id)}
                                            className="p-2 text-nova-text-dim hover:text-red-400 transition-colors ml-2"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
                                    <div className="p-3 sm:p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                                        <div className="text-[7px] sm:text-[8px] font-black text-nova-text-dim uppercase tracking-[0.2em] mb-1">Risk Dist.</div>
                                        <div className="text-xs sm:text-sm font-black text-white">
                                            {report.report_data.risk_distribution?.high || 0}H / {report.report_data.risk_distribution?.medium || 0}M
                                        </div>
                                    </div>
                                    <div className="p-3 sm:p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                                        <div className="text-[7px] sm:text-[8px] font-black text-nova-text-dim uppercase tracking-[0.2em] mb-1">Trust Avg.</div>
                                        <div className="text-xs sm:text-sm font-black text-nova-accent">{report.report_data.average_trust_score || 0}%</div>
                                    </div>
                                    <div className="p-3 sm:p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                                        <div className="text-[7px] sm:text-[8px] font-black text-nova-text-dim uppercase tracking-[0.2em] mb-1">Opportunities</div>
                                        <div className="text-xs sm:text-sm font-black text-green-400">{report.report_data.top_opportunities?.length || 0}</div>
                                    </div>
                                    <div className="p-3 sm:p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                                        <div className="text-[7px] sm:text-[8px] font-black text-nova-text-dim uppercase tracking-[0.2em] mb-1">Status</div>
                                        <div className="text-xs sm:text-sm font-black text-blue-400">ARCHIVED</div>
                                    </div>
                                </div>

                                <div className={`prose prose-invert max-w-none transition-all duration-500 overflow-hidden ${expandedReports.includes(report.id) ? 'max-h-[5000px] opacity-100 mb-6' : 'max-h-0 opacity-0'}`}>
                                    {report.report_data.executive_summary ? (
                                        <div className="space-y-4">
                                            {cleanse(report.report_data.executive_summary)
                                                .split('\n\n')
                                                .map((para, i) => (
                                                    <p key={i} className="text-xs sm:text-sm text-nova-text-dim leading-relaxed italic">"{para}"</p>
                                                ))
                                            }
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-nova-text-dim italic text-center py-4">Detailed analysis not expanded.</p>
                                    )}
                                </div>

                                <div className="flex justify-center border-t border-white/5 pt-4">
                                    <button
                                        onClick={() => toggleReportExpansion(report.id)}
                                        className="text-[9px] sm:text-[10px] font-black text-nova-accent uppercase tracking-widest hover:opacity-80 transition-all flex items-center gap-2"
                                    >
                                        {expandedReports.includes(report.id) ? 'Collapse Analysis' : 'Expand Full Analysis'}
                                        <ChevronDown size={14} className={`transition-transform duration-300 ${expandedReports.includes(report.id) ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default IntelligenceDashboard;
