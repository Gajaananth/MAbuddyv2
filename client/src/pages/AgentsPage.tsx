import React, { useState, useEffect } from 'react';
import { Shield, Plus, Globe, Activity, Award, UserCheck } from 'lucide-react';
import { agentService } from '../services/api';
import type { Agent } from '../types';

const AgentsPage: React.FC = () => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [newAgent, setNewAgent] = useState({ name: '', description: '', capabilities: '' });

    useEffect(() => {
        loadAgents();
    }, []);

    const loadAgents = async () => {
        setLoading(true);
        try {
            const response = await agentService.getAgents();
            setAgents(response.data.data);
        } catch (error) {
            console.error('Fetch Agents Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await agentService.addAgent({
                ...newAgent,
                capabilities: newAgent.capabilities.split(',').map(s => s.trim())
            });
            setNewAgent({ name: '', description: '', capabilities: '' });
            setShowForm(false);
            loadAgents();
        } catch (error) {
            console.error('Add Agent Error:', error);
        }
    };

    return (
        <div className="px-4 sm:px-10 md:px-16 py-8 md:py-16 space-y-10 max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 sm:gap-10">
                <div className="space-y-4">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight uppercase">Agent <span className="text-nova-accent">Network</span></h2>
                    <p className="text-nova-text-dim max-w-2xl text-base md:text-xl font-bold leading-relaxed opacity-80">Collaborating with high-integrity, skilled AI agents to build a clean marketing ecosystem.</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-nova-accent/10 text-nova-accent border border-nova-accent/30 font-bold text-sm hover:bg-nova-accent hover:text-nova-bg transition-all"
                >
                    <Plus size={18} /> Add Verified Agent
                </button>
            </header>

            {showForm && (
                <form onSubmit={handleSubmit} className="glass p-8 rounded-2xl border border-nova-accent/30 space-y-6 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-nova-text-dim uppercase tracking-widest pl-1">Agent Name</label>
                            <input
                                value={newAgent.name}
                                onChange={e => setNewAgent({ ...newAgent, name: e.target.value })}
                                required
                                className="w-full bg-nova-bg border border-nova-border text-white px-4 py-3 rounded-xl focus:border-nova-accent outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-nova-text-dim uppercase tracking-widest pl-1">Capabilities (comma separated)</label>
                            <input
                                value={newAgent.capabilities}
                                onChange={e => setNewAgent({ ...newAgent, capabilities: e.target.value })}
                                placeholder="strategy, analysis, content..."
                                className="w-full bg-nova-bg border border-nova-border text-white px-4 py-3 rounded-xl focus:border-nova-accent outline-none"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-nova-text-dim uppercase tracking-widest pl-1">Mission/Description</label>
                        <textarea
                            value={newAgent.description}
                            onChange={e => setNewAgent({ ...newAgent, description: e.target.value })}
                            rows={3}
                            className="w-full bg-nova-bg border border-nova-border text-white px-4 py-3 rounded-xl focus:border-nova-accent outline-none"
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl text-nova-text-dim hover:text-white transition-colors">Cancel</button>
                        <button type="submit" className="px-8 py-3 bg-nova-accent text-nova-bg font-bold rounded-xl active:scale-95 transition-all">Submit for Verification</button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {loading && [1, 2].map(i => (
                    <div key={i} className="glass h-64 rounded-2xl animate-pulse border border-nova-border"></div>
                ))}

                {!loading && agents.map((agent) => (
                    <div key={agent.id} className="glass p-6 md:p-8 rounded-3xl border-2 border-nova-border hover:border-nova-accent/20 transition-all group overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Shield size={120} />
                        </div>

                        <div className="flex items-start gap-6 relative z-10">
                            <div className="w-20 h-20 rounded-2xl bg-nova-accent/10 border-2 border-nova-accent/20 flex items-center justify-center text-nova-accent shadow-inner">
                                {agent.name.includes('Nova') ? <Shield size={40} /> : <UserCheck size={40} />}
                            </div>

                            <div className="flex-1 space-y-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-0.5">{agent.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <Globe size={12} className="text-nova-accent" />
                                            <span className="text-[10px] font-bold text-nova-text-dim uppercase tracking-widest">Protocol Active</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[9px] font-bold text-nova-text-dim uppercase tracking-widest mb-0.5">Trust Score</div>
                                        <div className={`text-xl font-mono font-bold ${agent.trust_score > 80 ? 'text-green-500' : 'text-orange-400'}`}>
                                            {agent.trust_score}%
                                        </div>
                                    </div>
                                </div>

                                <p className="text-xs md:text-sm text-nova-text-dim line-clamp-2 leading-relaxed">
                                    {agent.description || 'Verified tactical agent contributing to the Zium Nova intelligence ecosystem.'}
                                </p>

                                <div className="flex flex-wrap gap-2">
                                    {agent.capabilities.map((cap, i) => (
                                        <span key={i} className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-bold text-nova-text-dim uppercase tracking-wider group-hover:border-nova-accent/30 transition-colors">
                                            {cap}
                                        </span>
                                    ))}
                                </div>

                                <div className="pt-4 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <Activity size={14} className="text-nova-accent" />
                                            <span className="text-[10px] font-medium text-nova-text-dim uppercase">Active</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Award size={14} className="text-green-500" />
                                            <span className="text-[10px] font-medium text-nova-text-dim uppercase">Verified</span>
                                        </div>
                                    </div>
                                    <button className="px-4 py-2 rounded-lg bg-nova-accent/10 text-nova-accent border border-nova-accent/20 text-[10px] font-bold uppercase tracking-widest hover:bg-nova-accent hover:text-nova-bg transition-all">
                                        Initiate Collab
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AgentsPage;
