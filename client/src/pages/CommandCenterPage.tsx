import React, { useState, useEffect } from 'react';
import { 
    Bird, User, Search, Circle, CheckCircle2, 
    Terminal, Activity, Shield,
    Trash2, Archive, ArchiveRestore, ArrowLeftRight, Clock,
    FileText, ListTodo
} from 'lucide-react';
import { missionService } from '../services/api';
import { formatTimestamp } from '../utils/formatUtils';

const OWNER_CONFIG = {
    'OPERATOR': { label: 'Operator (You)', icon: User, color: 'text-amber-400 border-amber-400/30 bg-amber-400/10' },
    'NOVA': { label: 'Nova (AI)', icon: Bird, color: 'text-nova-accent border-nova-accent/30 bg-nova-accent/10' },
    'SHARED': { label: 'Shared Mission', icon: ArrowLeftRight, color: 'text-purple-400 border-purple-400/30 bg-purple-400/10' }
};

const DURATION_LABELS = {
    'SHORT': '1-2 Hours',
    'MEDIUM': '1-3 Days',
    'LONG': '4-7 Days'
};

const STATUS_CONFIG = {
    'TODO': { icon: Circle, color: 'text-amber-500 border-amber-500/30' },
    'PENDING': { icon: Clock, color: 'text-amber-500 border-amber-500/30' },
    'PROCESS': { icon: Activity, color: 'text-nova-accent border-nova-accent/30' },
    'IN_PROGRESS': { icon: Activity, color: 'text-nova-accent border-nova-accent/30' },
    'DONE': { icon: CheckCircle2, color: 'text-green-500 border-green-500/30' },
    'COMPLETED': { icon: CheckCircle2, color: 'text-green-500 border-green-500/30' },
    'BLOCKED': { icon: Shield, color: 'text-red-500 border-red-500/30' }
};

const PRIORITY_COLORS = {
    'LOW': 'text-blue-400 border-blue-400/30 bg-blue-400/10',
    'MEDIUM': 'text-amber-400 border-amber-400/30 bg-amber-400/10',
    'HIGH': 'text-red-500 border-red-500/30 bg-red-500/10'
};

const TaskCard: React.FC<{ 
    task: any; 
    onStatus: (id: string, s: string) => void;
    onArchive: (id: string, a: boolean) => void;
    onDelete: (id: string) => void;
    onAssign: (id: string, to: string) => void;
}> = ({ task, onStatus, onArchive, onDelete, onAssign }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const StatusIcon = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG]?.icon || Circle;
    const ownerInfo = OWNER_CONFIG[task.owner as keyof typeof OWNER_CONFIG] || OWNER_CONFIG['NOVA'];
    const OwnerIcon = ownerInfo.icon;

    return (
        <div className={`glass p-5 rounded-2xl border-2 transition-all duration-300 ${task.is_archived ? 'border-nova-border/20 opacity-60' : 'border-nova-border/50 hover:border-nova-accent/30'} bg-white/[0.01] space-y-4 group relative overflow-hidden`}>
            {/* Owner Indicator Side */}
            <div className={`absolute top-0 right-0 w-1 h-full ${ownerInfo.color.split(' ')[0].replace('text-', 'bg-')}`}></div>
            
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-mono text-nova-text-dim/40 tracking-widest">{task.task_id_str}</span>
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border ${ownerInfo.color} text-[7px] font-black uppercase`}>
                            <OwnerIcon size={8} />
                            {ownerInfo.label}
                        </div>
                    </div>
                    <h4 className="text-xs font-black text-white uppercase tracking-tight group-hover:text-nova-accent transition-colors">
                        {task.task_name}
                    </h4>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black ${PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]}`}>
                        {task.priority || 'MEDIUM'}
                    </div>
                    {task.duration && (
                        <div className="flex items-center gap-1 text-[7px] font-bold text-nova-text-dim/60 uppercase">
                            <Clock size={8} />
                            {task.duration}: {DURATION_LABELS[task.duration as keyof typeof DURATION_LABELS]}
                        </div>
                    )}
                </div>
            </div>
            
            <p className="text-[10px] text-nova-text-dim leading-relaxed">
                {task.action_plan || 'Strategic plan initialization pending...'}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                <button 
                    onClick={() => onStatus(task.task_id_str, 'PENDING')}
                    className={`p-1.5 rounded-lg border transition-all ${task.status === 'PENDING' ? 'bg-amber-400/20 border-amber-400/50 text-amber-400' : 'bg-white/5 border-white/10 text-nova-text-dim hover:text-amber-400'}`}
                    title="Mark Pending"
                >
                    <Clock size={12} />
                </button>
                <button 
                    onClick={() => onStatus(task.task_id_str, 'PROCESS')}
                    className={`p-1.5 rounded-lg border transition-all ${task.status === 'PROCESS' ? 'bg-nova-accent/20 border-nova-accent/50 text-nova-accent' : 'bg-white/5 border-white/10 text-nova-text-dim hover:text-nova-accent'}`}
                    title="Mark Processing"
                >
                    <Activity size={12} />
                </button>
                <button 
                    onClick={() => onStatus(task.task_id_str, 'DONE')}
                    className={`p-1.5 rounded-lg border transition-all ${task.status === 'DONE' ? 'bg-green-500/20 border-green-500/50 text-green-500' : 'bg-white/5 border-white/10 text-nova-text-dim hover:text-green-500'}`}
                    title="Mark Done"
                >
                    <CheckCircle2 size={12} />
                </button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button 
                    onClick={() => onArchive(task.task_id_str, !task.is_archived)}
                    className="p-1.5 rounded-lg border bg-white/5 border-white/10 text-nova-text-dim hover:text-blue-400 hover:border-blue-400/50 transition-all"
                    title={task.is_archived ? "Unarchive" : "Archive"}
                >
                    {task.is_archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                </button>
                
                {/* Switch between OPERATOR / NOVA / SHARED */}
                <button 
                    onClick={() => {
                        const nextOwner = task.owner === 'OPERATOR' ? 'NOVA' : task.owner === 'NOVA' ? 'SHARED' : 'OPERATOR';
                        onAssign(task.task_id_str, nextOwner);
                    }}
                    className="p-1.5 rounded-lg border bg-white/5 border-white/10 text-nova-text-dim hover:text-purple-400 hover:border-purple-400/50 transition-all"
                    title="Rotate Ownership"
                >
                    <ArrowLeftRight size={12} />
                </button>
                
                <button 
                    onClick={() => onDelete(task.task_id_str)}
                    className="p-1.5 rounded-lg border bg-white/5 border-white/10 text-nova-text-dim hover:text-red-500 hover:border-red-500/50 transition-all ml-auto"
                    title="Terminal Delete"
                >
                    <Trash2 size={12} />
                </button>
            </div>

            <div className="pt-2">
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 text-[9px] font-black uppercase text-nova-text-dim hover:text-nova-accent transition-colors"
                >
                    <FileText size={10} />
                    {isExpanded ? 'Hide Intelligence' : 'Show Strategic Notes'}
                </button>
                {isExpanded && (
                    <div className="mt-3 p-3 rounded-xl bg-nova-accent/5 border border-nova-accent/10">
                        <p className="text-[10px] text-nova-text-dim leading-relaxed italic whitespace-pre-wrap">
                            {task.notes || "No additional intelligence logs attached."}
                        </p>
                    </div>
                )}
            </div>
            
            <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <span className="text-[8px] text-nova-text-dim/40 font-mono italic">{formatTimestamp(task.created_at)}</span>
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-black uppercase ${STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG]?.color || 'text-nova-text-dim'}`}>
                    <StatusIcon size={10} className={task.status === 'PROCESS' ? 'animate-pulse' : ''} />
                    {task.status}
                </div>
            </div>
        </div>
    );
};

const CommandCenterPage: React.FC = () => {
    const [tasks, setTasks] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const loadData = async () => {
        try {
            const [tasksRes, archivedRes] = await Promise.all([
                missionService.getTasks(),
                missionService.getTasks(true)
            ]);
            
            // Merge or handle based on tab
            const allTasks = [...tasksRes.data.data, ...archivedRes.data.data.filter((t: any) => t.is_archived)];
            // Removing duplicates if any
            const uniqueTasks = Array.from(new Map(allTasks.map((t: any) => [t.id, t])).values());
            setTasks(uniqueTasks);
            
        } catch (e) {
            console.error('Grid Sync Error', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleStatus = async (id: string, status: string) => {
        try {
            await missionService.updateTask(id, { status });
            loadData();
        } catch (e) { console.error(e); }
    };

    const handleArchive = async (id: string, is_archived: boolean) => {
        try {
            await missionService.archiveTask(id, is_archived);
            loadData();
        } catch (e) { console.error(e); }
    };

    const handleAssign = async (id: string, owner: string) => {
        try {
            await missionService.assignTask(id, owner);
            loadData();
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('PERMANENT DELETION: Are you sure you want to scrub this objective from the grid?')) return;
        try {
            await missionService.deleteTask(id);
            loadData();
        } catch (e) { console.error(e); }
    };

    const stats = {
        total: tasks.filter(t => !t.is_archived).length,
        completed: tasks.filter(t => t.status === 'DONE' || t.status === 'COMPLETED').length,
    };
    const progress = stats.total > 0 ? Math.round((stats.completed / (tasks.filter((t: any) => !t.is_archived).length || 1)) * 100) : 0;

    const filteredTasks = tasks.filter((t: any) => 
        (activeTab === 'active' ? !t.is_archived : t.is_archived) &&
        (t.task_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         t.task_id_str.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="flex-1 flex flex-col min-w-0 max-w-6xl mx-auto w-full animate-in fade-in duration-700">
            {/* Tactical Header */}
            <header className="mb-8 lg:mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-nova-border/30 pb-8 px-1">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-nova-accent">
                        <Terminal size={12} className="animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Grid Protocol v4.3.0</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tighter uppercase leading-none">
                        Tactical <span className="text-nova-accent">Grid</span>
                    </h1>
                    <p className="text-nova-text-dim text-[11px] lg:text-xs font-medium max-w-xl leading-relaxed opacity-60">
                        Synchronized mission center. Operator controls highlighted.
                    </p>
                </div>

                <div className="relative w-full lg:w-80 shrink-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-nova-text-dim/40" size={14} />
                    <input 
                        type="text"
                        placeholder="Trace intelligence code or name..."
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
                        <span className="text-[9px] font-black text-nova-accent uppercase tracking-widest">Accessing Tactical Grid...</span>
                    </div>
                </div>
            ) : (
                <div className="space-y-10 pb-20">
                    {/* STATS & TABS */}
                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1 glass p-6 rounded-3xl border-2 border-nova-border flex items-center gap-8">
                            <div className="relative w-16 h-16 shrink-0">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/5" />
                                    <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={`${progress * 1.76} 176`} className="text-nova-accent transition-all duration-1000" />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-black text-white">{progress}%</span>
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 mb-1">
                                    <Shield size={14} className="text-nova-accent" />
                                    Grid Status
                                </h3>
                                <p className="text-[10px] text-nova-text-dim font-bold uppercase tracking-tighter opacity-60">
                                    {stats.completed} Mission Objectives Resolved
                                </p>
                            </div>
                        </div>

                        <div className="flex p-1.5 glass rounded-2xl border border-nova-border/50 bg-white/5">
                            <button 
                                onClick={() => setActiveTab('active')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-nova-accent text-nova-bg shadow-lg' : 'text-nova-text-dim hover:text-white'}`}
                            >
                                <ListTodo size={14} />
                                Active
                            </button>
                            <button 
                                onClick={() => setActiveTab('archived')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'archived' ? 'bg-white/10 text-white shadow-lg' : 'text-nova-text-dim hover:text-white'}`}
                            >
                                <Archive size={14} />
                                Archived
                            </button>
                        </div>
                    </div>

                    {/* OPERATOR TASKS */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-3">
                                <div className="p-2 bg-nova-accent/10 rounded-lg text-nova-accent">
                                    <User size={16} />
                                </div>
                                Operator Objectives (Manual Control)
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredTasks.filter((t: any) => t.owner === 'OPERATOR' || t.owner === 'SHARED').length === 0 ? (
                                <div className="col-span-full py-16 text-center text-nova-text-dim text-[10px] font-black uppercase tracking-widest opacity-20 italic">No assigned objectives.</div>
                            ) : (
                                filteredTasks.filter((t: any) => t.owner === 'OPERATOR' || t.owner === 'SHARED').map((task: any) => (
                                    <TaskCard 
                                        key={task.id} 
                                        task={task} 
                                        onStatus={handleStatus}
                                        onArchive={handleArchive}
                                        onDelete={handleDelete}
                                        onAssign={handleAssign}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* AGENT TASKS */}
                    <div className="space-y-6 pt-6">
                        <div className="flex items-center justify-between mb-2 px-1 border-t border-white/5 pt-10">
                            <h3 className="text-xs font-black text-nova-text-dim uppercase tracking-widest flex items-center gap-3">
                                <div className="p-2 bg-white/5 rounded-lg text-nova-text-dim">
                                    <Bird size={16} />
                                </div>
                                Autonomous Cycles (Zium Nova)
                            </h3>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-nova-accent rounded-full animate-pulse shadow-[0_0_8px_rgba(0,242,255,0.6)]"></div>
                                <span className="text-[10px] font-black text-nova-accent uppercase tracking-widest tracking-widest">Live Sync</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredTasks.filter((t: any) => t.owner === 'NOVA').length === 0 ? (
                                <div className="col-span-full py-16 text-center text-nova-text-dim text-[10px] font-black uppercase tracking-widest opacity-20 italic">No active agentic cycles.</div>
                            ) : (
                                filteredTasks.filter((t: any) => t.owner === 'NOVA').map((task: any) => (
                                    <TaskCard 
                                        key={task.id} 
                                        task={task} 
                                        onStatus={handleStatus}
                                        onArchive={handleArchive}
                                        onDelete={handleDelete}
                                        onAssign={handleAssign}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommandCenterPage;
