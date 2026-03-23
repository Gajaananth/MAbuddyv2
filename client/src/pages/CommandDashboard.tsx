import React, { useState, useEffect } from 'react';
import api, { intelligenceService } from '../services/api';
import { useLiveTime } from '../hooks/useLiveTime';
import { 
    Bird, TrendingUp, AlertOctagon, 
    CheckCircle2, CircleDashed, Loader2, XCircle, 
    Terminal, Shield, Zap, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { trendService } from '../services/api';
import { formatTimestamp } from '../utils/formatUtils';

interface Task {
    id: string;
    task_id_str: string;
    task_name: string;
    assigned_to: string;
    status: 'TODO' | 'IN-PROGRESS' | 'COMPLETED' | 'BLOCKED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    action_plan: string;
    notes: string;
}

interface IntelligenceLog {
    id: string;
    category: string;
    lesson: string;
    source: string;
    created_at: string;
}

interface Report {
    id: string;
    category: string;
    summary: string;
    created_at: string;
    risk_level: string;
    opportunity_score?: number;
}

const STATUS_ICONS = {
    'TODO': <CircleDashed size={14} className="text-nova-text-dim" />,
    'IN-PROGRESS': <Loader2 size={14} className="text-blue-400 animate-spin" />,
    'COMPLETED': <CheckCircle2 size={14} className="text-green-400" />,
    'BLOCKED': <XCircle size={14} className="text-red-400" />
};
const STATUS_COLORS = {
    'TODO': 'text-nova-text-dim bg-white/5 border-white/10',
    'IN-PROGRESS': 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    'COMPLETED': 'text-green-400 bg-green-500/10 border-green-500/30',
    'BLOCKED': 'text-red-400 bg-red-500/10 border-red-500/30'
};

const PRIORITY_COLORS = {
    'LOW': 'text-nova-text-dim',
    'MEDIUM': 'text-yellow-400',
    'HIGH': 'text-orange-400',
    'CRITICAL': 'text-red-500 font-bold animate-pulse'
};

const TaskRow = ({ task, isAgentic }: { task: Task; isAgentic?: boolean }) => (
    <tr className="hover:bg-white/[0.02] transition-colors group">
        <td className="p-4">
            <span className={`font-mono font-bold text-[10px] px-2 py-1 rounded-md border ${isAgentic ? 'text-nova-accent bg-nova-accent/10 border-nova-accent/20' : 'text-white bg-white/5 border-white/10'}`}>
                {task.task_id_str}
            </span>
        </td>
        <td className="p-4">
            <p className="font-bold text-white text-sm mb-0.5">{task.task_name}</p>
            <p className="text-[10px] text-nova-text-dim/60 font-medium line-clamp-1">{task.notes || '-'}</p>
        </td>
        <td className="p-4">
            <p className="text-xs text-nova-text-dim leading-relaxed whitespace-pre-wrap">{task.action_plan || 'No specific action plan logged.'}</p>
        </td>
        <td className="p-4">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black tracking-widest uppercase transition-all ${STATUS_COLORS[task.status]}`}>
                {STATUS_ICONS[task.status]}
                {task.status}
            </div>
        </td>
        <td className="p-4">
            <span className={`text-[10px] font-black tracking-wider uppercase ${PRIORITY_COLORS[task.priority]}`}>
                {task.priority}
            </span>
        </td>
    </tr>
);

const CommandDashboard: React.FC = () => {
    const liveTime = useLiveTime();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [logs, setLogs] = useState<IntelligenceLog[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [rideStatus, setRideStatus] = useState<any>(null);
    const [activeAlert, setActiveAlert] = useState<any>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [recentTrends, setRecentTrends] = useState<any[]>([]);
    const [isLoadingTrends, setIsLoadingTrends] = useState(true);

    const handleSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        // Synchronize via API if needed, otherwise artificial delay for effect
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            await loadAllData();
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        loadAllData();
        const interval = setInterval(loadAllData, 60000); // Poll every minute
        return () => clearInterval(interval);
    }, []);

    const loadAllData = async () => {
        try {
            const [tasksRes, logsRes, ridesRes, reportsRes, statusRes, trendsRes] = await Promise.all([
                api.get('/api/tasks'),
                api.get('/api/intelligence/logs?limit=5'),
                api.get('/api/intelligence/raids?limit=5'),
                api.get('/api/intelligence/reports?limit=5'),
                intelligenceService.getRideStatus(),
                trendService.getTrends()
            ]);

            setTasks(tasksRes.data.data || []);
            setLogs(logsRes.data.data || []);
            setRideStatus(statusRes.data.data);
            setRecentTrends(trendsRes.data?.data?.slice(0, 3) || []);
            setIsLoadingTrends(false);

            const allReports = [
                ...(ridesRes.data.data || []).map((r: any) => ({ ...r, category: r.category || 'Market Signal' })),
                ...(reportsRes.data.data || []).map((r: any) => ({ ...r, category: 'Weekly Report' }))
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setReports(allReports.slice(0, 5));

            // Check for urgent alerts
            const urgentLog = allReports.find((r: any) => r.risk_level === 'High' || r.opportunity_score >= 80);
            if (urgentLog) setActiveAlert(urgentLog);

        } catch (err) {
            console.error('Failed to sync dashboard', err);
        }
    };

    const stats = {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        active: tasks.filter(t => t.status === 'TODO' || t.status === 'IN-PROGRESS').length,
        pending: tasks.filter(t => t.status === 'TODO').length,
    };

    const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    return (
        <div className="w-full max-w-7xl mx-auto pb-24 space-y-8 animate-in fade-in duration-700">
            
            {/* SECTION 6 — ALERT & NOTIFICATION PANEL */}
            {activeAlert && (
                <div onClick={() => setActiveAlert(null)} className="cursor-pointer bg-red-500/10 border-2 border-red-500/50 p-6 rounded-3xl flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-4">
                        <AlertOctagon className="text-red-500" size={32} />
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter">NEW ALERT FROM ZIUM NOVA</h2>
                            <p className="text-red-400 text-xs font-bold uppercase tracking-widest">{activeAlert.summary}</p>
                        </div>
                    </div>
                    <span className="text-red-500 text-[10px] font-black uppercase tracking-widest">[CLICK TO DISMISS]</span>
                </div>
            )}

            {/* HEADER */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-nova-accent flex items-center justify-center nova-accent-glow shrink-0">
                        <Bird className="text-nova-bg w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tighter text-white uppercase leading-none">COMMAND <span className="text-nova-accent text-shadow-glow">DASHBOARD</span></h1>
                            <div className="px-1 py-0.5 rounded bg-nova-accent/10 border border-nova-accent/30 text-nova-accent text-[8px] font-black uppercase tracking-widest">v4.1.5</div>
                        </div>
                        <p className="text-nova-text-dim text-[9px] sm:text-[10px] font-black tracking-[0.2em] uppercase opacity-60 flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse"></span>
                            PROTOCOL ACTIVE
                        </p>
                    </div>
                </div>
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3">
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="flex-1 md:flex-none px-4 sm:px-6 py-2 rounded-xl bg-nova-accent/10 text-nova-accent text-[9px] sm:text-[10px] font-black border-2 border-nova-accent/30 hover:bg-nova-accent hover:text-nova-bg transition-all duration-300 uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                        {isSyncing ? 'Syncing...' : 'Sync Brain'}
                    </button>
                    <div className="text-right shrink-0">
                        <div className="text-lg sm:text-2xl font-mono font-black text-nova-accent tabular-nums tracking-tighter">{liveTime.short}</div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* SECTION 1 — INTERNET RIDE STATUS */}
                <div className="xl:col-span-1 glass p-8 rounded-3xl border-2 border-nova-border flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <Bird size={18} className="text-red-400" />
                                Internet Ride
                            </h3>
                            <div className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${rideStatus?.status !== 'idle' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-white/5 text-nova-text-dim border-white/10'}`}>
                                {rideStatus?.status !== 'idle' ? 'ACTIVE' : 'PAUSED'}
                            </div>
                        </div>
                        <div className="space-y-4 font-mono text-xs">
                            <div className="flex justify-between">
                                <span className="text-nova-text-dim uppercase tracking-tighter">Last Scan:</span>
                                <span className="text-white">{rideStatus?.lastScanTime || liveTime.short}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-nova-text-dim uppercase tracking-tighter">Signals Detected:</span>
                                <span className="text-nova-accent font-bold">12</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-nova-text-dim uppercase tracking-tighter">Verified Opportunities:</span>
                                <span className="truncate">{liveTime.full} — v4.1.2</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-8">
                        <p className="text-[8px] font-black text-nova-text-dim uppercase tracking-[0.2em] mb-3 opacity-40">Focus Areas</p>
                        <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase text-white">
                            <span className="px-2 py-1 bg-white/5 rounded border border-white/10">Moltbook</span>
                            <span className="px-2 py-1 bg-white/5 rounded border border-white/10">AI Market</span>
                            <span className="px-2 py-1 bg-white/5 rounded border border-white/10">Crypto</span>
                        </div>
                    </div>
                </div>

                {/* SECTION 3 — TASK PROGRESS SUMMARY */}
                <div className="xl:col-span-2 glass p-8 rounded-3xl border-2 border-nova-border flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-8">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <Shield size={18} className="text-nova-accent" />
                                Mission Progress
                            </h3>
                            <span className="text-2xl font-mono font-black text-nova-accent">{progress}%</span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                            <div>
                                <p className="text-[10px] text-nova-text-dim font-black uppercase tracking-wider mb-1">Total Tasks</p>
                                <p className="text-xl font-black text-white">{stats.total}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-green-400 font-black uppercase tracking-wider mb-1">Completed</p>
                                <p className="text-xl font-black text-green-400">{stats.completed}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1">Active</p>
                                <p className="text-xl font-black text-blue-400">{stats.active}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-nova-accent font-black uppercase tracking-wider mb-1">Pending</p>
                                <p className="text-xl font-black text-nova-accent">{stats.pending}</p>
                            </div>
                        </div>
                    </div>

                    <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden border-2 border-nova-border relative">
                        <div 
                            className="h-full bg-nova-accent shadow-[0_0_20px_rgba(0,242,255,0.5)] transition-all duration-1000 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>

            </div>

            {/* GLOBAL PULSE — MARKET TRENDS */}
            <section className="glass p-8 rounded-3xl border-2 border-nova-border">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={18} className="text-nova-accent" />
                        Global Pulse & Market Trends
                    </h3>
                    <button onClick={() => navigate('/trends')} className="text-[10px] font-black text-nova-accent uppercase tracking-widest hover:underline">Full Analysis</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {isLoadingTrends ? (
                        <div className="col-span-3 flex justify-center py-12"><Loader2 className="animate-spin text-nova-accent opacity-50" /></div>
                    ) : recentTrends.length === 0 ? (
                        <div className="col-span-3 text-center py-8 text-nova-text-dim text-[10px] uppercase font-black tracking-widest opacity-50">No active signals in current cycle.</div>
                    ) : recentTrends.map((trend, i) => (
                        <div key={i} className="p-6 bg-nova-bg/40 rounded-2xl border border-nova-border hover:border-nova-accent/20 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-[8px] font-black text-nova-text-dim uppercase tracking-wider opacity-50">{trend.status || 'STABLE'}</span>
                                <span className={`text-[10px] font-black ${trend.score > 70 ? 'text-green-400' : 'text-red-400'}`}>{trend.score}%</span>
                            </div>
                            <h4 className="text-white font-black text-sm uppercase tracking-tight mb-4 group-hover:text-nova-accent transition-colors truncate">{trend.topic}</h4>
                            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div className={`h-full ${trend.score > 70 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${trend.score}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* SECTION 2 — MISSION CONTROL (Split Board) */}
            <section className="space-y-12">
                {/* Operator Missions */}
                <div className="animate-in slide-in-from-left duration-700">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <User size={18} className="text-nova-accent" />
                        Operator Missions (BUDDY)
                        <span className="text-[10px] text-nova-text-dim lowercase font-normal">(Manual Tactical Action Required)</span>
                    </h3>
                    <div className="glass rounded-3xl border-2 border-nova-border overflow-hidden bg-white/[0.01]">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-nova-border/50 bg-white/[0.02]">
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase">ID</th>
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase w-1/3">Objective</th>
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase w-2/5">Action Plan</th>
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase">Status</th>
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase">Risk</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-nova-border/30">
                                    {tasks.filter(t => t.assigned_to === 'BUDDY').length === 0 ? (
                                        <tr><td colSpan={5} className="p-12 text-center text-nova-text-dim text-[10px] font-black uppercase tracking-widest opacity-50">No manual missions assigned.</td></tr>
                                    ) : (
                                        tasks.filter(t => t.assigned_to === 'BUDDY').map((task) => (
                                            <TaskRow key={task.id} task={task} />
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Agentic Missions */}
                <div className="animate-in slide-in-from-right duration-700">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Bird size={18} className="text-nova-accent" />
                        Agentic Missions (ZIUM NOVA)
                        <span className="text-[10px] text-nova-accent lowercase font-normal animate-pulse">(Autonomous Strategic Execution)</span>
                    </h3>
                    <div className="glass rounded-3xl border-2 border-nova-accent/10 overflow-hidden bg-nova-accent/[0.01]">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-nova-accent/10 bg-nova-accent/[0.02]">
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase">ID</th>
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase w-1/3">Zium Objective</th>
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase w-2/5 text-nova-accent/70">Grid Plan</th>
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase">Grid State</th>
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase">Priority</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-nova-accent/5">
                                    {tasks.filter(t => t.assigned_to !== 'BUDDY').length === 0 ? (
                                        <tr><td colSpan={5} className="p-12 text-center text-nova-text-dim text-[10px] font-black uppercase tracking-widest opacity-50">No agentic background cycles active.</td></tr>
                                    ) : (
                                        tasks.filter(t => t.assigned_to !== 'BUDDY').map((task) => (
                                            <TaskRow key={task.id} task={task} isAgentic={true} />
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* SECTION 4 — LEARNING OUTCOMES */}
                <section className="glass rounded-3xl border-2 border-nova-border overflow-hidden">
                    <div className="p-6 border-b-2 border-nova-border/50 bg-white/[0.02] flex justify-between items-center">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp size={18} className="text-nova-accent" />
                            Learning Outcomes
                        </h3>
                        <button onClick={() => navigate('/learning')} className="text-[9px] font-black text-nova-accent uppercase hover:underline">View All</button>
                    </div>
                    <div className="divide-y divide-nova-border/30">
                        {logs.map((log) => (
                            <div key={log.id} className="p-6 hover:bg-white/[0.02] transition-all">
                                <div className="flex justify-between mb-2">
                                    <span className="text-[10px] font-mono font-bold text-nova-text-dim">{formatTimestamp(log.created_at)}</span>
                                    <span className="text-[10px] font-black uppercase text-green-400">High Confidence</span>
                                </div>
                                <h4 className="text-white font-black uppercase tracking-tight text-sm mb-1">{log.category}</h4>
                                <p className="text-xs text-nova-text-dim italic leading-relaxed">"{log.lesson}"</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* SECTION 5 — IMPORTANT REPORTS */}
                <section className="glass rounded-3xl border-2 border-nova-border overflow-hidden">
                    <div className="p-6 border-b-2 border-nova-border/50 bg-white/[0.02] flex justify-between items-center">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Terminal size={18} className="text-nova-accent" />
                            Important Reports
                        </h3>
                        <button onClick={() => navigate('/reports')} className="text-[9px] font-black text-nova-accent uppercase hover:underline">View Archive</button>
                    </div>
                    <div className="divide-y divide-nova-border/30">
                        {reports.map((report) => (
                            <div key={report.id} className="p-6 hover:bg-white/[0.02] transition-all flex justify-between items-center">
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest ${report.risk_level === 'High' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-nova-accent/10 text-nova-accent border border-nova-accent/20'}`}>
                                            {report.category}
                                        </span>
                                        <span className="text-[9px] font-mono text-nova-text-dim opacity-50">{formatTimestamp(report.created_at)}</span>
                                    </div>
                                    <p className="text-xs font-bold text-white truncate">{report.summary}</p>
                                </div>
                                <button onClick={() => navigate(`/intelligence?id=${report.id}`)} className="text-[10px] font-black text-nova-accent uppercase whitespace-nowrap border-b border-nova-accent/30 hover:border-nova-accent transition-all">
                                    RESEARCH
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

            </div>

        </div>
    );
};

export default CommandDashboard;
