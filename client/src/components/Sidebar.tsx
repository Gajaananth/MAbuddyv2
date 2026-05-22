import { KaruppuLogo } from './KaruppuLogo';
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import NotificationPanel from './NotificationPanel';
import { memoryService } from '../services/api';
import {
     Shield, TrendingUp, X, Database, PlusCircle, Brain, Lock, BarChart3, UserCheck
} from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const [unreadMessages, setUnreadMessages] = useState(0);

    useEffect(() => {
        const fetchUnread = async () => {
            try {
                const res = await memoryService.getUnreadCount();
                if (res.data.success) {
                    setUnreadMessages(res.data.count);
                }
            } catch (e) {
                // Silently fail polling
            }
        };

        fetchUnread();
        
        // Listen for internal "Read" events to clear the dot instantly
        const handleReadEvents = () => fetchUnread();
        window.addEventListener('nova-messages-read', handleReadEvents);

        const interval = setInterval(fetchUnread, 15000); // Poll every 15s
        return () => {
            clearInterval(interval);
            window.removeEventListener('nova-messages-read', handleReadEvents);
        };
    }, []);

    const navItems = [
        { icon: <Shield size={18} />, label: 'Command Center', path: '/' },
        { icon: <PlusCircle size={18} />, label: 'New Strategic Chat', path: '/chat' },
        { 
            icon: <Database size={18} />, 
            label: 'Neural Memory', 
            path: '/memory',
            hasBadge: unreadMessages > 0
        },
        { icon: <KaruppuLogo size={18} />, label: 'Intelligence', path: '/intelligence' },
        { icon: <TrendingUp size={18} />, label: 'Market Trends', path: '/trends' },
        { icon: <Brain size={18} />, label: 'Learning Outcomes', path: '/learning' },
        { icon: <BarChart3 size={18} />, label: 'Reports Archive', path: '/reports' },
        { icon: <UserCheck size={18} />, label: 'Agent Network', path: '/agents' },
        { icon: <Lock size={18} />, label: 'Security Grid', path: '/security' },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={`w-[280px] lg:w-64 h-screen glass border-r-2 border-nova-border flex flex-col fixed left-0 top-0 z-50 transition-transform duration-500 lg:translate-x-0 pb-safe ${isOpen ? 'translate-x-0' : '-translate-x-full shadow-none'}`}>

                <div className="p-5 sm:p-8 lg:p-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        {/* Logo box — BLACK with dark red border glow */}
                        <div className="w-10 h-10 lg:w-9 lg:h-9 rounded-xl lg:rounded-lg bg-black border border-red-900/50 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(139,0,0,0.4)]">
                            <KaruppuLogo className="text-nova-bg" size={20} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl lg:text-base font-black tracking-tighter text-white truncate uppercase leading-none">Karuppu</h1>
                            <p className="text-[8px] text-nova-text-dim tracking-[0.2em] uppercase font-black opacity-60 truncate mt-1 leading-none">Tactical Hub</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden lg:block">
                            <NotificationPanel />
                        </div>
                        <button onClick={onClose} className="lg:hidden p-2 text-nova-text-dim hover:text-white bg-white/5 rounded-xl transition-colors active:scale-95">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <nav className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-4 py-2 custom-scrollbar">
                    <div className="mb-6 lg:mb-4">
                        <p className="px-4 mb-3 text-[9px] font-black text-nova-text-dim uppercase tracking-[0.2em] opacity-40">Strategic Control</p>
                        <div className="space-y-1.5 lg:space-y-1">
                            {navItems.slice(0, 6).map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-4 py-3 lg:py-2.5 rounded-xl transition-all duration-300 group relative ${isActive
                                            ? 'bg-red-950/40 text-red-400 border-2 border-red-600/40 shadow-[0_0_15px_rgba(220,38,38,0.2)]'
                                            : 'text-nova-text-dim hover:text-white hover:bg-white/5 border-2 border-transparent'
                                        }`
                                    }
                                >
                                    <span className="group-hover:scale-110 transition-transform duration-300 shrink-0">
                                        {React.cloneElement(item.icon as React.ReactElement<any>, { size: 18 })}
                                    </span>
                                    <span className="font-black text-[11px] lg:text-[10px] tracking-tight uppercase whitespace-nowrap">{item.label}</span>
                                    
                                    {item.hasBadge && (
                                        <div className="absolute top-1/2 -translate-y-1/2 right-3 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)] border border-white/20"></div>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    </div>

                    <div className="mb-6 lg:mb-4">
                        <p className="px-4 mb-3 text-[9px] font-black text-nova-text-dim uppercase tracking-[0.2em] opacity-40">Operational Tools</p>
                        <div className="space-y-1.5 lg:space-y-1">
                            {navItems.slice(6).map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-4 py-3 lg:py-2.5 rounded-xl transition-all duration-300 group ${isActive
                                            ? 'bg-red-950/40 text-red-400 border-2 border-red-600/40 shadow-[0_0_15px_rgba(220,38,38,0.2)]'
                                            : 'text-nova-text-dim hover:text-white hover:bg-white/5 border-2 border-transparent'
                                        }`
                                    }
                                >
                                    <span className="group-hover:scale-110 transition-transform duration-300 shrink-0">
                                        {React.cloneElement(item.icon as React.ReactElement<any>, { size: 18 })}
                                    </span>
                                    <span className="font-black text-[11px] lg:text-[10px] tracking-tight uppercase whitespace-nowrap">{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    </div>
                </nav>

                <div className="p-4 sm:p-6 lg:p-4 shrink-0">
                    <div className="glass p-4 rounded-2xl border border-nova-border/50 bg-white/[0.02] shadow-inner">
                        <div className="flex items-center gap-2 mb-2 lg:mb-3">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                            <span className="text-[9px] lg:text-[8px] font-black text-nova-text uppercase tracking-widest">System Protocols</span>
                        </div>
                        <div className="flex flex-col gap-1.5 lg:gap-2">
                            <div className="flex justify-between text-[9px] lg:text-[8px] font-black text-nova-text-dim uppercase">
                                <span>Neural Mesh</span>
                                <span className="text-red-400">LIVE</span>
                            </div>
                            <div className="flex justify-between text-[9px] lg:text-[8px] font-black text-nova-text-dim uppercase">
                                <span>Core Grid</span>
                                <span className="text-red-400">ARMED</span>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
