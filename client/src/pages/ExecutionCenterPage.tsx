import React, { useState, useEffect } from 'react';
import { Terminal, Globe, Shield, PlayCircle, Clock } from 'lucide-react';

const ExecutionCenterPage: React.FC = () => {
    const [activeSessions, setActiveSessions] = useState([
        { id: '1', type: 'BROWSER', target: 'Moltbook Market', status: 'ACTIVE', time: '10m ago' },
        { id: '2', type: 'TERMINAL', target: 'Git Sync', status: 'COMPLETED', time: '1h ago' }
    ]);

    const [pendingApprovals, setPendingApprovals] = useState([
        { id: 'A1', action: 'Deploy Production', risk: 'HIGH', time: '5m ago' }
    ]);

    return (
        <div className="w-full max-w-6xl mx-auto pb-24">
            <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-white uppercase flex items-center gap-3">
                        <Terminal className="text-nova-accent" size={28} />
                        Execution Center
                    </h1>
                    <p className="text-nova-text-dim text-xs tracking-widest uppercase mt-2 font-bold">Autonomous Control Interface</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Active Sessions Widget */}
                <div className="glass p-6 rounded-2xl border border-nova-border col-span-1 lg:col-span-2">
                    <h2 className="text-lg font-black text-white flex items-center gap-2 mb-4">
                        <Globe className="text-nova-accent" size={20} />
                        Active Sessions
                    </h2>
                    <div className="space-y-4">
                        {activeSessions.map(session => (
                            <div key={session.id} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/10">
                                <div>
                                    <span className="text-xs font-black text-nova-accent bg-nova-accent/10 px-2 py-1 rounded">{session.type}</span>
                                    <h3 className="text-white font-bold mt-2">{session.target}</h3>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs font-bold ${session.status === 'ACTIVE' ? 'text-green-400' : 'text-gray-400'}`}>{session.status}</span>
                                    <p className="text-xs text-nova-text-dim mt-1">{session.time}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-2 hover:bg-white/10 rounded-lg text-nova-text-dim hover:text-white transition-all"><PlayCircle size={18} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pending Approvals Widget */}
                <div className="glass p-6 rounded-2xl border border-nova-border">
                    <h2 className="text-lg font-black text-white flex items-center gap-2 mb-4">
                        <Shield className="text-yellow-400" size={20} />
                        Pending Approvals
                    </h2>
                    <div className="space-y-4">
                        {pendingApprovals.map(approval => (
                            <div key={approval.id} className="p-4 bg-yellow-400/10 rounded-xl border border-yellow-400/20">
                                <h3 className="text-white font-bold">{approval.action}</h3>
                                <p className="text-xs text-yellow-400 mt-1 uppercase tracking-widest font-black">RISK: {approval.risk}</p>
                                <div className="mt-4 flex gap-2">
                                    <button className="flex-1 bg-nova-accent text-black font-black text-xs py-2 rounded-lg">APPROVE</button>
                                    <button className="flex-1 bg-white/10 text-white font-black text-xs py-2 rounded-lg">REJECT</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Terminal Console Widget */}
            <div className="glass p-6 rounded-2xl border border-nova-border">
                <h2 className="text-lg font-black text-white flex items-center gap-2 mb-4">
                    <Terminal className="text-nova-accent" size={20} />
                    Terminal Console
                </h2>
                <div className="bg-black/50 p-4 rounded-xl font-mono text-sm text-green-400 h-64 overflow-y-auto border border-white/5">
                    <p>{'>'} System online.</p>
                    <p>{'>'} Awaiting execution commands...</p>
                </div>
            </div>
        </div>
    );
};

export default ExecutionCenterPage;
