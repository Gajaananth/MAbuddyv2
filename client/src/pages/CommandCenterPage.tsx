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

    return (
        <div className="flex-1 flex flex-col min-w-0 max-w-7xl mx-auto w-full animate-in fade-in duration-700">
            {/* Header Strategy */}
            <header className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-nova-border/50 pb-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-nova-accent mb-2">
                        <Terminal size={14} className="animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Protocol Support v4.1.8</span>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tighter uppercase flex items-center gap-4">
                        Task <span className="text-nova-accent">Tracking</span> Center
                    </h1>
                    <p className="text-nova-text-dim text-xs font-medium max-w-xl leading-relaxed">
                        Dedicated high-fidelity tactical grid for Operator and Agentic mission management. 
                        Every signal across the chat interface is hard-synchronized here.
                    </p>
                </div>

                <div className="relative w-full lg:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-nova-text-dim/40" size={16} />
                    <input 
                        type="text"
                        placeholder="Filter tactical objectives..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/[0.02] border border-nova-border/50 rounded-xl py-3 pl-12 pr-4 text-xs font-bold text-white focus:outline-none focus:border-nova-accent/50 focus:bg-white/[0.05] transition-all"
                    />
                </div>
            </header>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-2 border-nova-accent/20 border-t-nova-accent rounded-full animate-spin"></div>
                        <span className="text-[10px] font-black text-nova-accent uppercase tracking-widest">Residing Grid State...</span>
                    </div>
                </div>
            ) : (
                <div className="space-y-16 pb-20">
                    {/* STRATEGIC OVERVIEW (Merged from Dashboard) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-4">
                        {/* Progress Tracker */}
                        <div className="lg:col-span-8 glass p-8 rounded-3xl border-2 border-nova-border flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-8">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    <Shield size={18} className="text-nova-accent" />
                                    Mission Completion
                                </h3>
                                <span className="text-2xl font-mono font-black text-nova-accent">{progress}%</span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                                <div>
                                    <p className="text-[10px] text-nova-text-dim font-black uppercase tracking-wider mb-1">Total Signals</p>
                                    <p className="text-xl font-black text-white">{stats.total}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-green-400 font-black uppercase tracking-wider mb-1">Resolved</p>
                                    <p className="text-xl font-black text-green-400">{stats.completed}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1">Tactical</p>
                                    <p className="text-xl font-black text-blue-400">{stats.active}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-nova-accent font-black uppercase tracking-wider mb-1">Pending</p>
                                    <p className="text-xl font-black text-nova-accent">{stats.pending}</p>
                                </div>
                            </div>

                            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-nova-border relative">
                                <div 
                                    className="h-full bg-nova-accent shadow-[0_0_20px_rgba(0,242,255,0.4)] transition-all duration-1000 ease-out"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Recent Trends Quick-View */}
                        <div className="lg:col-span-4 glass p-8 rounded-3xl border-2 border-nova-border">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-6">
                                <TrendingUp size={18} className="text-nova-accent" />
                                Market Pulse
                            </h3>
                            <div className="space-y-4">
                                {isLoadingTrends ? (
                                    <div className="py-4 flex justify-center"><Loader2 className="animate-spin text-nova-accent/20" /></div>
                                ) : recentTrends.map((trend, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                        <span className="text-[10px] font-bold text-white uppercase truncate pr-4">{trend.topic}</span>
                                        <span className={`text-[10px] font-black ${trend.score > 70 ? 'text-green-400' : 'text-nova-accent'}`}>{trend.score}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* Operator Section */}
                    <div className="animate-in slide-in-from-left duration-700">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                                <div className="p-2 bg-nova-accent/10 rounded-lg text-nova-accent">
                                    <User size={18} />
                                </div>
                                Operator Missions (BUDDY)
                            </h3>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-nova-text-dim uppercase tracking-wider">
                                    {filteredTasks.filter(t => t.assigned_to === 'BUDDY').length} Active
                                </span>
                            </div>
                        </div>

                        <div className="glass rounded-3xl border-2 border-nova-border overflow-hidden bg-white/[0.01] shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b-2 border-nova-border/50 bg-white/[0.02]">
                                            <th className="p-10.5 text-[10px] font-black text-nova-text-dim tracking-widest uppercase p-4">ID</th>
                                            <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase w-1/4">Objective</th>
                                            <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase w-1/3">Action Plan</th>
                                            <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase">Grid State</th>
                                            <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase text-right">Priority</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-nova-border/30">
                                        {filteredTasks.filter(t => t.assigned_to === 'BUDDY').length === 0 ? (
                                            <tr><td colSpan={5} className="p-20 text-center text-nova-text-dim text-[10px] font-black uppercase tracking-widest opacity-30">No tactical objectives identified.</td></tr>
                                        ) : (
                                            filteredTasks.filter(t => t.assigned_to === 'BUDDY').map((task) => (
                                                <TaskRow key={task.id} task={task} />
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Agentic Section */}
                    <div className="animate-in slide-in-from-right duration-700">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                                <div className="p-2 bg-nova-accent/10 rounded-lg text-nova-accent">
                                    <Bird size={18} />
                                </div>
                                Agentic Missions (ZIUM NOVA)
                            </h3>
                            <div className="flex items-center gap-1.5 animate-pulse">
                                <div className="w-1.5 h-1.5 bg-nova-accent rounded-full"></div>
                                <span className="text-[10px] font-black text-nova-accent uppercase tracking-widest">Autonomous Sync: ACTIVE</span>
                            </div>
                        </div>

                        <div className="glass rounded-3xl border-2 border-nova-accent/10 overflow-hidden bg-nova-accent/[0.01] shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b-2 border-nova-accent/10 bg-nova-accent/[0.02]">
                                            <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase">ID</th>
                                            <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase w-1/4">Zium Objective</th>
                                            <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase w-1/3 text-nova-accent/70">Grid Plan</th>
                                            <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase">Grid State</th>
                                            <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase text-right">Priority</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-nova-accent/5">
                                        {filteredTasks.filter(t => t.assigned_to !== 'BUDDY').length === 0 ? (
                                            <tr><td colSpan={5} className="p-20 text-center text-nova-text-dim text-[10px] font-black uppercase tracking-widest opacity-30">No agentic background cycles detected.</td></tr>
                                        ) : (
                                            filteredTasks.filter(t => t.assigned_to !== 'BUDDY').map((task) => (
                                                <TaskRow key={task.id} task={task} />
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommandCenterPage;
