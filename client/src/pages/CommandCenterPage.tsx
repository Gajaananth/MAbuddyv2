import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { LayoutDashboard, Loader2, CheckCircle2, CircleDashed, AlertOctagon, XCircle, User, Bird } from 'lucide-react';

interface Task {
    id: string;
    task_id_str: string;
    task_name: string;
    assigned_to: string;
    status: 'TODO' | 'IN-PROGRESS' | 'COMPLETED' | 'BLOCKED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    notes: string;
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

const CommandCenterPage: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const res = await api.get('/api/tasks');
                setTasks(res.data.data || []);
            } catch (err) {
                console.error('Failed to fetch tasks', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTasks();
    }, []);

    const stats = {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        active: tasks.filter(t => t.status === 'TODO' || t.status === 'IN-PROGRESS').length,
        blocked: tasks.filter(t => t.status === 'BLOCKED').length
    };

    return (
        <div className="w-full max-w-6xl mx-auto pb-24">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-white uppercase flex items-center gap-3">
                        <LayoutDashboard className="text-nova-accent" size={32} />
                        Command Center
                    </h1>
                    <p className="text-nova-text-dim text-sm tracking-widest uppercase mt-1">Zium Nova Operational Tracker</p>
                </div>
            </header>

            <div className="mb-6 space-y-2">
                <h2 className="text-lg font-black text-white uppercase tracking-wider">Mission Progress</h2>
            </div>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="glass p-4 rounded-2xl border-2 border-nova-border/50">
                    <p className="text-[10px] text-nova-text-dim font-black uppercase tracking-wider mb-1">Total Tasks</p>
                    <p className="text-2xl font-black text-white">{stats.total}</p>
                </div>
                <div className="glass p-4 rounded-2xl border-2 border-green-500/20 bg-green-500/5">
                    <p className="text-[10px] text-green-400/70 font-black uppercase tracking-wider mb-1">Completed</p>
                    <p className="text-2xl font-black text-green-400">{stats.completed}</p>
                </div>
                <div className="glass p-4 rounded-2xl border-2 border-nova-accent/20 bg-nova-accent/5">
                    <p className="text-[10px] text-nova-accent/70 font-black uppercase tracking-wider mb-1">Active</p>
                    <p className="text-2xl font-black text-nova-accent">{stats.active}</p>
                </div>
                <div className="glass p-4 rounded-2xl border-2 border-red-500/20 bg-red-500/5">
                    <p className="text-[10px] text-red-500/70 font-black uppercase tracking-wider mb-1">Blocked</p>
                    <p className="text-2xl font-black text-red-500 flex items-center gap-2">
                        {stats.blocked} {stats.blocked > 0 && <AlertOctagon size={18} className="animate-pulse" />}
                    </p>
                </div>
            </div>

            {/* Task Board */}
            <div className="glass rounded-2xl border-2 border-nova-border overflow-hidden">
            {/* Task Boards - Split by Assignee */}
            <div className="space-y-12">
                {/* Operator Missions */}
                <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <User size={16} className="text-nova-accent" />
                        Operator Missions (BUDDY)
                        <span className="text-[10px] text-nova-text-dim lowercase font-normal">(Tasks that require your manual action)</span>
                    </h3>
                    <div className="glass rounded-2xl border-2 border-nova-border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-nova-border/50 bg-white/[0.02]">
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase whitespace-nowrap">ID</th>
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase w-full">Objective</th>
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase whitespace-nowrap">Status</th>
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase whitespace-nowrap">Priority</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-nova-border/30">
                                    {loading ? (
                                        <SkeletonRow />
                                    ) : tasks.filter(t => t.assigned_to === 'BUDDY').length === 0 ? (
                                        <EmptyRow message="No manual missions assigned." />
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
                <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Bird size={16} className="text-nova-accent" />
                        Agentic Missions (ZIUM NOVA)
                        <span className="text-[10px] text-nova-accent lowercase font-normal animate-pulse">(Autonomous background processing)</span>
                    </h3>
                    <div className="glass rounded-2xl border-2 border-nova-accent/10 overflow-hidden bg-nova-accent/[0.01]">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-nova-accent/10 bg-nova-accent/[0.02]">
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase whitespace-nowrap">ID</th>
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase w-full text-nova-accent/70">Zium Objective</th>
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase whitespace-nowrap">Grid State</th>
                                        <th className="p-4 text-[10px] font-black text-nova-text-dim tracking-widest uppercase whitespace-nowrap">Risk</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-nova-accent/5">
                                    {loading ? (
                                        <SkeletonRow />
                                    ) : tasks.filter(t => t.assigned_to !== 'BUDDY').length === 0 ? (
                                        <EmptyRow message="No agentic background cycles active." />
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
            </div>
        </div>

            {/* Helper Instructions */}
            <div className="mt-8 glass p-6 rounded-2xl border-2 border-nova-border/50">
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Command Center Logistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <p className="text-[10px] font-black text-nova-text-dim uppercase tracking-widest mb-2 border-b border-nova-border/50 pb-2">Allowed Status Values</p>
                        <ul className="space-y-2">
                            <li className="flex items-center gap-2 text-xs font-mono text-white bg-white/5 px-3 py-1.5 rounded border border-white/10"><CircleDashed size={12} className="text-nova-text-dim" /> TODO</li>
                            <li className="flex items-center gap-2 text-xs font-mono text-white bg-blue-500/10 px-3 py-1.5 rounded border border-blue-500/30"><Loader2 size={12} className="text-blue-400" /> IN-PROGRESS</li>
                            <li className="flex items-center gap-2 text-xs font-mono text-white bg-green-500/10 px-3 py-1.5 rounded border border-green-500/30"><CheckCircle2 size={12} className="text-green-400" /> COMPLETED</li>
                            <li className="flex items-center gap-2 text-xs font-mono text-white bg-red-500/10 px-3 py-1.5 rounded border border-red-500/30"><XCircle size={12} className="text-red-400" /> BLOCKED</li>
                        </ul>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-nova-text-dim uppercase tracking-widest mb-2 border-b border-nova-border/50 pb-2">Available Actions</p>
                        <ul className="space-y-2">
                            <li className="text-xs font-mono text-nova-accent bg-nova-accent/10 px-3 py-1.5 rounded border border-nova-accent/30">ADD TASK – [description]</li>
                            <li className="text-xs font-mono text-nova-accent bg-nova-accent/10 px-3 py-1.5 rounded border border-nova-accent/30">UPDATE TASK – [task id]</li>
                            <li className="text-xs font-mono text-nova-accent bg-nova-accent/10 px-3 py-1.5 rounded border border-nova-accent/30">COMPLETE TASK – [task id]</li>
                            <li className="text-xs font-mono text-nova-accent bg-nova-accent/10 px-3 py-1.5 rounded border border-nova-accent/30">SHOW TASK BOARD</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SkeletonRow = () => (
    <tr>
        <td colSpan={6} className="p-8 text-center text-nova-text-dim">
            <Loader2 className="animate-spin mx-auto mb-2" size={24} />
            <span className="text-xs uppercase tracking-widest font-bold">Syncing Grid...</span>
        </td>
    </tr>
);

const EmptyRow = ({ message }: { message: string }) => (
    <tr>
        <td colSpan={6} className="p-12 text-center text-nova-text-dim font-bold uppercase tracking-widest text-sm">
            {message}
        </td>
    </tr>
);

const TaskRow = ({ task, isAgentic }: { task: Task; isAgentic?: boolean }) => (
    <tr className="hover:bg-white/[0.02] transition-colors group">
        <td className="p-4">
            <span className={`font-mono font-bold text-xs px-2 py-1 rounded-md border ${isAgentic ? 'text-nova-accent bg-nova-accent/10 border-nova-accent/20' : 'text-white bg-white/5 border-white/10'}`}>
                {task.task_id_str}
            </span>
        </td>
        <td className="p-4">
            <p className="font-bold text-white text-sm mb-0.5">{task.task_name}</p>
            <p className="text-[10px] text-nova-text-dim/60 font-medium line-clamp-1">{task.notes || '-'}</p>
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

export default CommandCenterPage;
