import React, { useState, useEffect } from 'react';
import { Bird, Search, AlertTriangle, Clock, Radio, ChevronDown, Zap, Trash2, FileText, Check } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { intelligenceService } from '../services/api';
import { useIntelligence } from '../context/IntelligenceContext';
import { useLiveTime } from '../hooks/useLiveTime';
import { formatTimestamp } from '../utils/formatUtils';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
    const { 
        rideStatus, 
        isTriggering: triggerLoading, 
        triggerManualRide, 
        rides, 
        reports, 
        loadingData: loading,
        refreshData
    } = useIntelligence();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'rides' | 'reports'>('rides');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [expandedReports, setExpandedReports] = useState<string[]>([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const liveTime = useLiveTime();

    useEffect(() => {
        loadData();
    }, [activeTab]);

    useEffect(() => {
        setSelectedIds([]);
    }, [activeTab]);

    // Polling for UI updates when raid status changes
    useEffect(() => {
        if (rideStatus?.status === 'completed') {
            loadData();
        }
    }, [rideStatus?.status]);

    const loadData = async () => {
        await refreshData();
        
        // Handle URL parameters for highlighting
        const reportId = searchParams.get('reportId');
        const findingId = searchParams.get('findingId');
        const targetId = reportId || findingId || searchParams.get('id');

        if (targetId) {
            setHighlightedId(targetId);
            const isRide = rides.some((r: RideResult) => r.id === targetId) || !!findingId;
            const isReport = reports.some((r: WeeklyReport) => r.id === targetId) || !!reportId;
            if (isReport) {
                setActiveTab('reports');
                if (reportId) setExpandedReports(prev => [...new Set([...prev, reportId])]);
            } else if (isRide) {
                setActiveTab('rides');
            }
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('id');
            newParams.delete('reportId');
            newParams.delete('findingId');
            setSearchParams(newParams, { replace: true });
        }
    };

    // Scroll to highlighted item
    useEffect(() => {
        if (highlightedId && !loading) {
            const timer = setTimeout(() => {
                const element = document.getElementById(`finding-${highlightedId}`) || 
                                document.getElementById(`report-${highlightedId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                // Fade out highlight after 5 seconds
                const fadeTimer = setTimeout(() => setHighlightedId(null), 5000);
                return () => clearTimeout(fadeTimer);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [highlightedId, loading]);

    const handleTriggerRide = async () => {
        await triggerManualRide('mid-week');
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
        <div className="flex-1 flex flex-col min-w-0 max-w-7xl mx-auto w-full animate-in fade-in duration-700">
            {/* Executive Header */}
            <header className="mb-8 lg:mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-nova-border/30 pb-8 px-1">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-nova-accent">
                        <Bird size={12} className="animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Intelligence Hub v4.5.0</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tighter uppercase leading-none">
                        Tactical <span className="text-nova-accent">Intelligence</span>
                    </h1>
                    <p className="text-nova-text-dim text-[11px] lg:text-xs font-medium max-w-xl leading-relaxed opacity-60">
                        Synthesizing global signals into actionable strategic directives. {liveTime.full}
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <button
                        onClick={handleTriggerRide}
                        disabled={triggerLoading}
                        className="flex-1 lg:flex-none px-6 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-red-500/5 active:scale-95"
                    >
                        <Zap size={16} className={`${triggerLoading ? 'animate-spin' : ''}`} />
                        {triggerLoading ? 'ENGAGING MESH...' : 'TRIGGER INTEL RIDE'}
                    </button>
                </div>
            </header>

            {/* Raid Progress Bar - Responsive Refinement */}
            {rideStatus && rideStatus.status !== 'completed' && rideStatus.status !== 'failed' && (
                <div className="mb-10 p-6 lg:p-8 glass rounded-[2.5rem] border-2 border-nova-accent/30 bg-nova-accent/[0.03] shadow-2xl animate-in zoom-in-95 duration-500 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-nova-accent/20 to-transparent"></div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-5">
                        <div className="space-y-1">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <Radio size={14} className="text-red-500 animate-pulse" />
                                Active Strategem Scan
                            </h3>
                            <p className="text-[10px] text-nova-text-dim font-bold uppercase tracking-[0.2em]">
                                TARGET: <span className="text-nova-accent">{rideStatus?.current_cluster}</span>
                                <span className="mx-2 opacity-20">|</span>
                                PHASE {(rideStatus?.clusters_completed || 0) + 1}/{rideStatus?.total_clusters}
                            </p>
                        </div>
                            <div className="text-right self-end sm:self-auto">
                            <span className="text-3xl font-black text-nova-accent tabular-nums tracking-tighter">
                                {Math.round(((rideStatus?.clusters_completed || 0) / (rideStatus?.total_clusters || 1)) * 100)}%
                            </span>
                        </div>
                    </div>
                    
                    <div className="relative h-3 bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
                        <div
                            className="h-full bg-nova-accent rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(0,242,255,0.6)] relative"
                            style={{ width: `${((rideStatus?.clusters_completed || 0) / (rideStatus?.total_clusters || 1)) * 100}%` }}
                        >
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Disclaimer */}
            <div className="mb-8 p-5 bg-yellow-500/[0.03] border border-yellow-500/20 rounded-[2rem] flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left shadow-lg shadow-yellow-500/5">
                <AlertTriangle size={20} className="text-yellow-500 shrink-0 mt-1" />
                <p className="text-[10px] lg:text-[11px] text-yellow-500/60 font-medium leading-relaxed">
                    <span className="font-black uppercase tracking-widest text-yellow-500 mr-2">Operational Boundary:</span>
                    Strategic intelligence reports are for high-level tactical planning. They do not constitute financial or legal advice.
                </p>
            </div>

            {/* Nav & Global Actions */}
            <div className="flex flex-col xl:flex-row justify-between items-stretch lg:items-center gap-4 mb-10">
                <div className="flex bg-white/[0.03] p-1.5 rounded-[1.5rem] border border-white/10 shadow-inner">
                    <button
                        onClick={() => setActiveTab('rides')}
                        className={`flex-1 sm:flex-none px-6 sm:px-10 py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${activeTab === 'rides'
                            ? 'bg-nova-bg text-nova-accent border border-nova-accent/20 shadow-lg shadow-nova-accent/5'
                            : 'text-nova-text-dim hover:text-white'
                            }`}
                    >
                        Intel Files ({rides.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`flex-1 sm:flex-none px-6 sm:px-10 py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${activeTab === 'reports'
                            ? 'bg-nova-bg text-nova-accent border border-nova-accent/20 shadow-lg shadow-nova-accent/5'
                            : 'text-nova-text-dim hover:text-white'
                            }`}
                    >
                        Strategic Summaries ({reports.length})
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-3 shadow-xl shadow-red-500/5 active:scale-95"
                        >
                            <Trash2 size={14} />
                            Purge ({selectedIds.length})
                        </button>
                    )}
                    <button
                        onClick={toggleSelectAll}
                        className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-nova-text-dim text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                        {selectedIds.length === (activeTab === 'rides' ? rides.length : reports.length) && (activeTab === 'rides' ? rides.length : reports.length) > 0
                            ? 'Release All' : 'Select All'}
                    </button>
                </div>
            </div>

            {/* Unified Data View */}
            <div className="flex-1 min-h-0 min-w-0 relative">
                {activeTab === 'rides' && (
                    <div className="mb-10 relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-nova-text-dim/40 group-focus-within:text-nova-accent transition-colors" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter intelligence mesh..."
                            className="w-full bg-white/[0.02] border-2 border-nova-border/50 hover:border-nova-accent/30 focus:border-nova-accent/50 p-5 pl-14 rounded-[2rem] outline-none transition-all placeholder:text-nova-text-dim/20 text-xs font-black text-white shadow-2xl"
                        />
                    </div>
                )}

                {loading && rides.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-6 opacity-40">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 border-4 border-nova-accent/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-nova-accent rounded-full animate-spin"></div>
                        </div>
                        <span className="text-[10px] font-black text-nova-accent uppercase tracking-[0.4em]">Synchronizing Mesh...</span>
                    </div>
                ) : activeTab === 'rides' ? (
                    <div className={`grid grid-cols-1 gap-4 lg:gap-6 transition-opacity duration-300 relative ${loading ? 'opacity-50' : 'opacity-100'}`}>
                        {loading && rides.length > 0 && (
                             <div className="absolute top-0 right-0 p-4 z-50">
                                <div className="flex items-center gap-2 px-3 py-1 bg-nova-accent/20 border border-nova-accent/30 rounded-full animate-pulse">
                                    <div className="w-1.5 h-1.5 bg-nova-accent rounded-full animate-ping"></div>
                                    <span className="text-[8px] font-black text-nova-accent uppercase tracking-widest">Mesh Syncing...</span>
                                </div>
                             </div>
                        )}
                        {filteredRides.length === 0 ? (
                            <div className="py-32 text-center glass border-2 border-dashed border-nova-border/30 rounded-[3rem] opacity-30">
                                <Bird size={64} className="mx-auto mb-6 text-nova-accent opacity-20" />
                                <h3 className="text-xl font-black text-white uppercase tracking-[0.2em]">Zero Intel Signals</h3>
                            </div>
                        ) : (
                            filteredRides.map((ride: RideResult) => (
                                <div
                                    key={ride.id}
                                    id={`finding-${ride.id}`}
                                    className={`glass p-6 lg:p-10 rounded-[2.5rem] border transition-all group relative overflow-hidden ${selectedIds.includes(ride.id) ? 'border-nova-accent bg-nova-accent/5' : highlightedId === ride.id ? 'border-nova-accent bg-nova-accent/10 shadow-[0_0_50px_rgba(0,242,255,0.2)] scale-[1.01] z-10' : 'border-nova-border/50 hover:border-nova-accent/30 shadow-xl'}`}
                                >
                                    <div className="flex flex-col md:flex-row gap-6 lg:gap-10">
                                        <div className="flex md:flex-col items-start gap-4 shrink-0">
                                            <div className="relative cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(ride.id)}
                                                    onChange={() => toggleSelection(ride.id)}
                                                    className="w-8 h-8 rounded-xl opacity-0 absolute inset-0 cursor-pointer z-10"
                                                />
                                                <div className={`w-8 h-8 border-2 rounded-xl flex items-center justify-center transition-all ${selectedIds.includes(ride.id) ? 'bg-nova-accent border-nova-accent text-nova-bg shadow-lg shadow-nova-accent/20' : 'border-nova-border/50 bg-white/5 group-hover:border-nova-accent/30'}`}>
                                                    <Check size={18} className={selectedIds.includes(ride.id) ? 'opacity-100 scale-100' : 'opacity-0 scale-50'} />
                                                </div>
                                            </div>
                                            <div className="flex flex-row md:flex-col items-center gap-2">
                                                <button
                                                    onClick={() => handleRideExport(ride.id, 'pdf')}
                                                    className="p-3 rounded-xl bg-nova-accent/10 border border-nova-accent/20 text-nova-accent hover:bg-nova-accent/20 transition-all"
                                                    title="Export PDF"
                                                >
                                                    <FileText size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRide(ride.id)}
                                                    className="p-3 text-nova-text-dim/20 hover:text-red-500 transition-colors"
                                                    title="Purge Signal"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <header className="flex flex-wrap items-center gap-3 mb-4">
                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${riskColors[ride.risk_level]}`}>
                                                    {ride.risk_level} Strategic Risk
                                                </span>
                                                <span className="text-[10px] font-mono font-bold text-nova-accent/40 uppercase tracking-tighter">/CATEGORY_{ride.category}</span>
                                                <span className="ml-auto text-[10px] font-mono text-nova-text-dim/30 font-black italic">
                                                    DECRYPTED: {formatTimestamp(ride.created_at)}
                                                </span>
                                            </header>

                                            <p className="text-sm lg:text-base text-white/90 font-medium leading-relaxed mb-6 border-l-2 border-white/5 pl-6 italic">
                                                {ride.content}
                                            </p>

                                            <details className="group/details mb-6">
                                                <summary className="cursor-pointer text-[10px] font-black text-nova-accent uppercase tracking-[0.3em] flex items-center gap-3 hover:opacity-80 list-none mb-2">
                                                    <ChevronDown size={14} className="group-open/details:rotate-180 transition-transform" />
                                                    Agent Strategic Insight
                                                </summary>
                                                <div className="p-6 bg-white/[0.02] border border-nova-border/30 rounded-2xl text-[11px] lg:text-xs text-nova-text-dim font-medium leading-[1.8] italic shadow-inner">
                                                    "{cleanse(ride.summary)}"
                                                </div>
                                            </details>

                                            <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-nova-border/20">
                                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-nova-text-dim uppercase tracking-widest">
                                                    <Radio size={10} className="text-nova-accent" /> {ride.source_platform}
                                                </div>
                                                {ride.tags.map((tag, i) => (
                                                    <div key={i} className="px-3 py-1.5 rounded-full bg-nova-accent/5 border border-nova-accent/10 text-[9px] font-black text-nova-accent/60 uppercase tracking-widest">
                                                        #{tag}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 pb-20">
                        {reports.length === 0 ? (
                            <div className="py-32 text-center glass border-2 border-dashed border-nova-border/30 rounded-[3rem] opacity-30">
                                <Clock size={64} className="mx-auto mb-6 text-nova-accent opacity-20" />
                                <h3 className="text-xl font-black text-white uppercase tracking-[0.2em]">Zero Reports Compiled</h3>
                            </div>
                        ) : (
                            reports.map((report: WeeklyReport) => (
                                <div
                                    key={report.id}
                                    id={`report-${report.id}`}
                                    className={`glass p-6 lg:p-10 rounded-[3rem] border transition-all bg-white/[0.01] ${selectedIds.includes(report.id) ? 'border-nova-accent shadow-2xl' : highlightedId === report.id ? 'border-nova-accent bg-nova-accent/5 shadow-[0_0_60px_rgba(0,242,255,0.15)] scale-[1.01] z-10' : 'border-nova-border/50 hover:border-nova-accent/20'}`}
                                >
                                    <header className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-10">
                                        <div className="flex items-center gap-5">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(report.id)}
                                                    onChange={() => toggleSelection(report.id)}
                                                    className="w-8 h-8 rounded-xl opacity-0 absolute inset-0 cursor-pointer z-10"
                                                />
                                                <div className={`w-8 h-8 border-2 rounded-xl flex items-center justify-center transition-all ${selectedIds.includes(report.id) ? 'bg-nova-accent border-nova-accent text-nova-bg' : 'border-nova-border/50 group-hover:border-nova-accent/30'}`}>
                                                    <Check size={18} className={selectedIds.includes(report.id) ? 'scale-100 opacity-100' : 'scale-50 opacity-0'} />
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none mb-2">Strategic Intelligence Summary</h3>
                                                <div className="flex items-center gap-3 text-[10px] font-black text-nova-text-dim uppercase tracking-[0.2em] opacity-40">
                                                    <Clock size={12} className="text-nova-accent/50" />
                                                    {formatTimestamp(report.period_start)} — {formatTimestamp(report.period_end)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                                            <button onClick={() => handleExport(report.id, 'json')} className="flex-1 lg:flex-none px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-nova-text-dim hover:text-white transition-all text-[9px] font-black uppercase tracking-widest">JSON</button>
                                            <button onClick={() => handleExport(report.id, 'word')} className="flex-1 lg:flex-none px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:text-white hover:bg-blue-500 transition-all text-[9px] font-black uppercase tracking-widest">DOCX</button>
                                            <button onClick={() => handleExport(report.id, 'pdf')} className="flex-1 lg:flex-none px-4 py-2 rounded-xl bg-nova-accent/10 border border-nova-accent/20 text-nova-accent hover:text-nova-bg hover:bg-nova-accent transition-all text-[9px] font-black uppercase tracking-widest shadow-lg shadow-nova-accent/5">EXPORT PDF</button>
                                            <button onClick={() => handleDeleteReport(report.id)} className="p-2 text-nova-text-dim/20 hover:text-red-500 transition-all ml-2"><Trash2 size={18} /></button>
                                        </div>
                                    </header>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-6 mb-10">
                                        {[
                                            { label: 'Risk Balance', value: `${report.report_data.risk_distribution?.high || 0}H / ${report.report_data.risk_distribution?.medium || 0}M`, color: 'text-white' },
                                            { label: 'Network Trust', value: `${report.report_data.average_trust_score || 0}%`, color: 'text-nova-accent' },
                                            { label: 'Yield Points', value: report.report_data.top_opportunities?.length || 0, color: 'text-green-400' },
                                            { label: 'Archival Class', value: 'STRATEGIC_A', color: 'text-blue-400' }
                                        ].map((stat, i) => (
                                            <div key={i} className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl shadow-inner group-hover:border-nova-accent/20 transition-all">
                                                <div className="text-[8px] font-black text-nova-text-dim uppercase tracking-[0.2em] mb-2">{stat.label}</div>
                                                <div className={`text-sm lg:text-base font-black ${stat.color} tracking-tight`}>{stat.value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Expanded Content with Refined Markdown */}
                                    <div className={`transition-all duration-1000 overflow-hidden ${expandedReports.includes(report.id) ? 'max-h-[10000px] opacity-100 mb-10' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                                        {report.report_data.executive_summary ? (
                                            <div className="p-6 lg:p-14 rounded-[3rem] bg-white/[0.02] border border-white/5 relative shadow-inner">
                                                <div className="absolute top-10 left-10 w-16 h-1 border-t-2 border-l-2 border-nova-accent/20"></div>
                                                <div className="absolute bottom-10 right-10 w-16 h-1 border-b-2 border-r-2 border-nova-accent/20"></div>
                                                
                                                <div className="flex items-center gap-4 mb-12 pb-6 border-b border-white/5">
                                                    <div className="w-3 h-3 rounded-full bg-nova-accent animate-pulse shadow-[0_0_10px_rgba(0,242,255,1)]" />
                                                    <h4 className="text-[11px] font-black uppercase tracking-[0.5em] text-nova-accent drop-shadow-sm">Operational Directive</h4>
                                                </div>
                                                
                                                <div className="prose prose-invert prose-sm sm:prose-base max-w-none 
                                                    prose-headings:font-black prose-headings:uppercase prose-headings:tracking-widest prose-headings:text-white prose-headings:mb-6 prose-headings:mt-10
                                                    prose-p:text-nova-text prose-p:leading-[1.8] prose-p:font-medium prose-p:opacity-80
                                                    prose-strong:text-nova-accent prose-strong:font-black
                                                    prose-li:text-nova-text prose-li:opacity-80
                                                    prose-blockquote:border-nova-accent prose-blockquote:bg-nova-accent/5 prose-blockquote:p-6 prose-blockquote:rounded-2xl
                                                ">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {report.report_data.executive_summary}
                                                    </ReactMarkdown>
                                                </div>

                                                {report.report_data.next_actions && (
                                                    <div className="mt-16 p-8 lg:p-12 rounded-[2.5rem] bg-yellow-400/[0.03] border-2 border-yellow-400/10 relative overflow-hidden">
                                                        <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500/20"></div>
                                                        <h5 className="text-[11px] font-black uppercase tracking-[0.3em] text-yellow-500 mb-8 flex items-center gap-3">
                                                            <Zap size={16} fill="currentColor" /> Strategic Next Actions
                                                        </h5>
                                                        <div className="text-sm lg:text-base text-white/90 font-medium leading-[1.8]">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                {report.report_data.next_actions}
                                                            </ReactMarkdown>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="py-20 text-center glass border-2 border-dashed border-nova-border/20 rounded-[3rem]">
                                                <div className="flex items-center justify-center gap-3 mb-4">
                                                    <div className="w-1.5 h-1.5 bg-nova-accent rounded-full animate-ping"></div>
                                                    <div className="w-1.5 h-1.5 bg-nova-accent rounded-full animate-ping [animation-delay:0.2s]"></div>
                                                    <div className="w-1.5 h-1.5 bg-nova-accent rounded-full animate-ping [animation-delay:0.4s]"></div>
                                                </div>
                                                <p className="text-[10px] font-black text-nova-text-dim uppercase tracking-[0.5em]">Decrypting Core Intelligence...</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-center border-t border-white/5 pt-8">
                                        <button
                                            onClick={() => toggleReportExpansion(report.id)}
                                            className={`px-10 py-4 text-[10px] font-black uppercase tracking-[0.4em] rounded-full transition-all flex items-center gap-4 ${expandedReports.includes(report.id) ? 'bg-white/5 text-nova-text-dim border border-white/10' : 'bg-nova-accent/10 text-nova-accent border border-nova-accent/20 hover:bg-nova-accent/20 shadow-xl shadow-nova-accent/5'}`}
                                        >
                                            <span>{expandedReports.includes(report.id) ? 'SECURE ARCHIVE' : 'DECRYPT INTELLIGENCE'}</span>
                                            <ChevronDown size={14} className={`transition-transform duration-700 ${expandedReports.includes(report.id) ? 'rotate-180' : ''}`} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default IntelligenceDashboard;
