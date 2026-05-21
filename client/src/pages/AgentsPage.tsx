import { KaruppuLogo } from '../components/KaruppuLogo';
import React, { useState, useEffect } from 'react';
import {  Plus, Globe, Activity, Award, UserCheck } from 'lucide-react';
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

    const handleInitiate = async (id: string) => {
        try {
            await agentService.initiateAgent(id);
            alert('Strategic collaboration protocol initiated. Karuppu is now syncing with this agent.');
        } catch (error) {
            console.error('Initiate Agent Error:', error);
        }
    };

    return (
        <div className="px-4 sm:px-10 md:px-16 py-8 md:py-16 space-y-10 max-w-7xl mx-auto">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div className="space-y-2 lg:space-y-3">
                    <h2 className="text-3xl lg:text-xl font-black text-white tracking-tight uppercase">Agent <span className="text-nova-accent">Network</span></h2>
                    <p className="text-nova-text-dim max-w-2xl text-base lg:text-[13px] font-bold leading-relaxed opacity-80">Collaborating with high-integrity, skilled AI agents to build a clean marketing ecosystem.</p>
                </div>

                <button
                    onClick={() => setShowForm(!showForm)}
                    className="w-full md:w-auto flex items-center justify-center gap-2 px-4 lg:px-4 py-3 lg:py-2 rounded-xl lg:rounded-lg bg-nova-accent/10 text-nova-accent border border-nova-accent/30 font-bold text-sm lg:text-[11px] uppercase tracking-wider hover:bg-nova-accent hover:text-nova-bg transition-all"
                >
                    <Plus size={16} /> Add Verified Agent
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

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-5">

                {loading && [1, 2].map(i => (
                    <div key={i} className="glass h-64 rounded-2xl animate-pulse border border-nova-border"></div>
                ))}

                {!loading && agents.map((agent) => (
                    <div key={agent.id} className="glass p-6 lg:p-4 rounded-3xl lg:rounded-xl border-2 border-nova-border hover:border-nova-accent/20 transition-all group overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 lg:p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                            <KaruppuLogo size={80} className="hidden lg:block" />
                            <KaruppuLogo size={120} className="lg:hidden" />
                        </div>


                        <div className="flex items-start gap-6 lg:gap-4 relative z-10">
                            <div className="w-20 lg:w-14 h-20 lg:h-14 rounded-2xl lg:rounded-xl bg-nova-accent/10 border-2 border-nova-accent/20 flex items-center justify-center text-nova-accent shadow-inner">
                                {agent.name.includes('Karuppu') ? <KaruppuLogo size={32} className="lg:w-7 lg:h-7" /> : <UserCheck size={32} className="lg:w-7 lg:h-7" />}
                            </div>



                            <div className="flex-1 space-y-4">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 lg:gap-4">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-lg lg:text-sm font-black text-white mb-0.5 truncate">{agent.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <Globe size={11} className="text-nova-accent" />
                                            <span className="text-[10px] lg:text-[7px] font-bold text-nova-text-dim uppercase tracking-widest">Protocol Active</span>
                                        </div>
                                    </div>
                                    <div className="lg:shrink-0 flex items-center lg:flex-col lg:items-end gap-3 lg:gap-0.5 border-l lg:border-l-0 lg:border-t-0 border-white/10 pl-3 lg:pl-0">
                                        <div className="text-[8px] lg:text-[6px] font-black text-nova-text-dim uppercase tracking-[0.2em] opacity-40">Trust Index</div>
                                        <div className={`text-xl lg:text-base font-mono font-black ${agent.trust_score > 80 ? 'text-green-500' : 'text-orange-400'}`}>
                                            {agent.trust_score}%
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs lg:text-[10px] text-nova-text-dim line-clamp-2 leading-relaxed font-medium opacity-80">
                                        {agent.description || 'Verified tactical agent contributing to the Karuppu intelligence ecosystem.'}
                                    </p>
                                </div>




                                <div className="flex flex-wrap gap-2">
                                    {agent.capabilities.map((cap, i) => (
                                        <span key={i} className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-bold text-nova-text-dim uppercase tracking-wider group-hover:border-nova-accent/30 transition-colors">
                                            {cap}
                                        </span>
                                    ))}
                                </div>

                                <div className="pt-2 flex justify-between items-center border-t border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1">
                                            <Activity size={12} className="text-nova-accent" />
                                            <span className="text-[9px] lg:text-[8px] font-bold text-nova-text-dim uppercase tracking-tighter">Active</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Award size={12} className="text-green-500" />
                                            <span className="text-[9px] lg:text-[8px] font-bold text-nova-text-dim uppercase tracking-tighter">Verified</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleInitiate(agent.id)}
                                        className="px-3 py-1.5 rounded bg-nova-accent/10 text-nova-accent border border-nova-accent/20 text-[9px] lg:text-[8px] font-black uppercase tracking-widest hover:bg-nova-accent hover:text-nova-bg transition-all active:scale-95"
                                    >
                                        Initiate
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
