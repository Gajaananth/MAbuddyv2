import React, { useState, useEffect } from 'react';
import { 
    Bird, User, Search, Circle, CheckCircle2, AlertCircle, 
    Terminal, Activity, Shield, TrendingUp, Loader2
} from 'lucide-react';
import { missionService, trendService } from '../services/api';
import { formatTimestamp } from '../utils/formatUtils';

const STATUS_COLORS = {
    'TODO': 'text-nova-text-dim border-nova-border bg-white/5',
    'IN-PROGRESS': 'text-nova-accent border-nova-accent/30 bg-nova-accent/10',
    'COMPLETED': 'text-green-500 border-green-500/30 bg-green-500/10',
    'BLOCKED': 'text-red-500 border-red-500/30 bg-red-500/10'
};

const PRIORITY_COLORS = {
    'LOW': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'MEDIUM': 'bg-nova-accent/10 text-nova-accent border-nova-accent/30',
    'HIGH': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'CRITICAL': 'bg-red-500/20 text-red-500 border-red-500/30 animate-pulse'
};

const TaskRow: React.FC<{ task: any; isAgentic?: boolean }> = ({ task, isAgentic }) => (
    <tr className={`group hover:bg-white/[0.02] transition-all border-b border-nova-border/30 last:border-0 ${isAgentic ? 'border-l-2 border-l-nova-accent/20' : ''}`}>
        <td className="p-4">
            <span className="text-[10px] font-mono font-bold text-nova-text-dim opacity-40 group-hover:opacity-100 transition-opacity">
                {task.task_id_str}
            </span>
        </td>
        <td className="p-4">
            <div className="flex flex-col">
                <span className="text-xs font-black text-white uppercase tracking-tight group-hover:text-nova-accent transition-colors">
                    {task.task_name}
                </span>
                <span className="text-[8px] text-nova-text-dim/60 font-mono mt-0.5">
                    {formatTimestamp(task.created_at)}
                </span>
            </div>
        </td>
        <td className="p-4">
            <p className="text-[10px] text-nova-text-dim leading-relaxed line-clamp-2 max-w-xs group-hover:text-nova-text transition-colors">
                {task.action_plan || 'Strategic plan initialization pending...'}
            </p>
        </td>
        <td className="p-4">
            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-widest ${STATUS_COLORS[task.status as keyof typeof STATUS_COLORS]}`}>
                {task.status === 'COMPLETED' ? <CheckCircle2 size={10} /> : 
                 task.status === 'IN-PROGRESS' ? <Activity size={10} className="animate-pulse" /> :
                 task.status === 'BLOCKED' ? <AlertCircle size={10} /> : <Circle size={10} />}
                {task.status}
            </div>
        </td>
        <td className="p-4 text-right">
            <div className={`inline-block px-2 py-0.5 rounded-full border text-[8px] font-black tracking-tighter ${PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]}`}>
                {task.priority || 'MEDIUM'}
            </div>
        </td>
    </tr>
);

const CommandCenterPage: React.FC = () => {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [recentTrends, setRecentTrends] = useState<any[]>([]);
    const [isLoadingTrends, setIsLoadingTrends] = useState(true);

    useEffect(() => {
        const loadAllData = async () => {
            try {
                const [tasksRes, trendsRes] = await Promise.all([
                    missionService.getTasks(),
                    trendService.getTrends()
                ]);
                setTasks(tasksRes.data.data || []);
                setRecentTrends(trendsRes.data?.data?.slice(0, 3) || []);
            } catch (e) {
                console.error('Data fetch error', e);
            } finally {
                setLoading(false);
                setIsLoadingTrends(false);
            }
        };
        loadAllData();
    }, []);

    const stats = {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        active: tasks.filter(t => t.status === 'TODO' || t.status === 'IN-PROGRESS').length,
        pending: tasks.filter(t => t.status === 'TODO').length,
    };
    const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    const filteredTasks = tasks.filter(t => 
        t.task_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.action_plan && t.action_plan.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const MobileTaskCard: React.FC<{ task: any }> = ({ task }) => (
        <div className="glass p-5 rounded-2xl border-2 border-nova-border/50 bg-white/[0.01] space-y-4">
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <span className="text-[10px] font-mono text-nova-text-dim/40 mb-1">{task.task_id_str}</span>
                    <h4 className="text-xs font-black text-white uppercase tracking-tight">{task.task_name}</h4>
                </div>
                <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black ${PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]}`}>
                    {task.priority || 'MEDIUM'}
                </div>
            </div>
            
            <p className="text-[10px] text-nova-text-dim leading-relaxed">
                {task.action_plan || 'Strategic plan initialization pending...'}
            </p>

            <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <span className="text-[8px] text-nova-text-dim/40 font-mono italic">{formatTimestamp(task.created_at)}</span>
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-black uppercase ${STATUS_COLORS[task.status as keyof typeof STATUS_COLORS]}`}>
                    {task.status}
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex-1 flex flex-col min-w-0 max-w-6xl mx-auto w-full animate-in fade-in duration-700">
            {/* Header Strategy */}
            <header className="mb-8 lg:mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-nova-border/30 pb-8 px-1">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-nova-accent">
                        <Terminal size={12} className="animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Protocol Support v4.2.0</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tighter uppercase leading-none">
                        Tactical <span className="text-nova-accent">Grid</span>
                    </h1>
                    <p className="text-nova-text-dim text-[11px] lg:text-xs font-medium max-w-xl leading-relaxed opacity-60">
                        Synchronized mission center for operator and autonomous agent cycles.
                    </p>
                </div>

                <div className="relative w-full lg:w-80 shrink-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-nova-text-dim/40" size={14} />
                    <input 
                        type="text"
                        placeholder="Filter objectives..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/[0.03] border border-nova-border/50 rounded-xl py-3 pl-11 pr-4 text-[11px] font-bold text-white focus:outline-none focus:border-nova-accent/50 transition-all placeholder:opacity-30"
                    />
                </div>
            </header>

            {loading ? (
                <div className="flex-1 flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-2 border-nova-accent/20 border-t-nova-accent rounded-full animate-spin"></div>
                        <span className="text-[9px] font-black text-nova-accent uppercase tracking-widest">Decoding Grid...</span>
                    </div>
                </div>
            ) : (
                <div className="space-y-12 lg:space-y-16 pb-20">
                    {/* STRATEGIC OVERVIEW */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                        {/* Progress Tracker */}
                        <div className="lg:col-span-8 glass p-6 lg:p-8 rounded-3xl border-2 border-nova-border flex flex-col justify-between shadow-2xl">
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    <Shield size={16} className="text-nova-accent" />
                                    Mission Completion
                                </h3>
                                <span className="text-xl font-mono font-black text-nova-accent">{progress}%</span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6 mb-8">
                                <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5">
                                    <p className="text-[8px] text-nova-text-dim font-black uppercase tracking-wider mb-1">Total</p>
                                    <p className="text-lg font-black text-white">{stats.total}</p>
                                </div>
                                <div className="p-3 bg-green-500/[0.02] rounded-2xl border border-green-500/10">
                                    <p className="text-[8px] text-green-400 font-black uppercase tracking-wider mb-1">Resolved</p>
                                    <p className="text-lg font-black text-green-400">{stats.completed}</p>
                                </div>
                                <div className="p-3 bg-blue-500/[0.02] rounded-2xl border border-blue-500/10">
                                    <p className="text-[8px] text-blue-400 font-black uppercase tracking-wider mb-1">Active</p>
                                    <p className="text-lg font-black text-blue-400">{stats.active}</p>
                                </div>
                                <div className="p-3 bg-nova-accent/[0.02] rounded-2xl border border-nova-accent/10">
                                    <p className="text-[8px] text-nova-accent font-black uppercase tracking-wider mb-1">Pending</p>
                                    <p className="text-lg font-black text-nova-accent">{stats.pending}</p>
                                </div>
                            </div>

                            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-nova-border">
                                <div 
                                    className="h-full bg-nova-accent shadow-[0_0_15px_rgba(0,242,255,0.4)] transition-all duration-1000 ease-out"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Recent Trends Quick-View */}
                        <div className="lg:col-span-4 glass p-6 lg:p-8 rounded-3xl border-2 border-nova-border flex flex-col">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 mb-6">
                                <TrendingUp size={16} className="text-nova-accent" />
                                Market Pulse
                            </h3>
                            <div className="space-y-3 flex-1 overflow-y-auto max-h-40 lg:max-h-full scrollbar-none">
                                {isLoadingTrends ? (
                                    <div className="py-4 flex justify-center"><Loader2 className="animate-spin text-nova-accent/20" /></div>
                                ) : (
                                    recentTrends.length > 0 ? recentTrends.map((trend, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 group hover:border-nova-accent/30 transition-all">
                                            <span className="text-[10px] font-bold text-nova-text group-hover:text-white uppercase truncate pr-4">{trend.topic}</span>
                                            <span className={`text-[10px] font-black ${trend.score > 70 ? 'text-green-400' : 'text-nova-accent'}`}>{trend.score}%</span>
                                        </div>
                                    )) : <p className="text-[9px] text-nova-text-dim italic text-center opacity-40">No pulse detected.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Operator Section */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-3">
                                <div className="p-2 bg-nova-accent/10 rounded-lg text-nova-accent">
                                    <User size={16} />
                                </div>
                                Operator Objectives
                            </h3>
                            <span className="text-[10px] font-bold text-nova-text-dim uppercase tracking-widest opacity-40">
                                {filteredTasks.filter(t => t.assigned_to === 'BUDDY').length} ACTIVE
                            </span>
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block glass rounded-3xl border-2 border-nova-border overflow-hidden bg-white/[0.01] shadow-2xl">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-nova-border/50 bg-white/[0.03]">
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase">ID</th>
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase w-1/4">Objective</th>
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase w-1/3">Execution</th>
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase text-center">Protocol</th>
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase text-right">Tier</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-nova-border/30">
                                    {filteredTasks.filter(t => t.assigned_to === 'BUDDY').length === 0 ? (
                                        <tr><td colSpan={5} className="p-16 text-center text-nova-text-dim text-[10px] font-black uppercase tracking-widest opacity-30 italic">No tactical objectives.</td></tr>
                                    ) : (
                                        filteredTasks.filter(t => t.assigned_to === 'BUDDY').map((task) => (
                                            <TaskRow key={task.id} task={task} />
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden grid grid-cols-1 gap-4">
                            {filteredTasks.filter(t => t.assigned_to === 'BUDDY').map((task) => (
                                <MobileTaskCard key={task.id} task={task} />
                            ))}
                        </div>
                    </div>

                    {/* Agentic Section */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-3">
                                <div className="p-2 bg-nova-accent/10 rounded-lg text-nova-accent">
                                    <Bird size={16} />
                                </div>
                                Autonomous Cycles
                            </h3>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-nova-accent rounded-full animate-pulse shadow-[0_0_8px_rgba(0,242,255,0.6)]"></div>
                                <span className="text-[10px] font-black text-nova-accent uppercase tracking-widest">LIVE SYNC</span>
                            </div>
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block glass rounded-3xl border-2 border-nova-accent/10 overflow-hidden bg-nova-accent/[0.01] shadow-2xl">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-nova-accent/20 bg-nova-accent/[0.03]">
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase">ID</th>
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase w-1/4">Objective</th>
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase w-1/3">Execution</th>
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase text-center">Protocol</th>
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase text-right">Tier</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-nova-accent/10">
                                    {filteredTasks.filter(t => t.assigned_to !== 'BUDDY').length === 0 ? (
                                        <tr><td colSpan={5} className="p-16 text-center text-nova-text-dim text-[10px] font-black uppercase tracking-widest opacity-30 italic">No active agentic cycles.</td></tr>
                                    ) : (
                                        filteredTasks.filter(t => t.assigned_to !== 'BUDDY').map((task) => (
                                            <TaskRow key={task.id} task={task} isAgentic />
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden grid grid-cols-1 gap-4">
                            {filteredTasks.filter(t => t.assigned_to !== 'BUDDY').map((task) => (
                                <MobileTaskCard key={task.id} task={task} />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommandCenterPage;
