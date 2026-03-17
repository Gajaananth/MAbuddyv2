import React from 'react';
import { NavLink } from 'react-router-dom';
import NotificationPanel from './NotificationPanel';
import {
    LayoutDashboard,
    MessageSquare,
    TrendingUp,
    Users,
    Database,
    Terminal,
    Bird,
    Shield,
    Zap,
    X
} from 'lucide-react';



interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const navItems = [
        { name: 'Command Dashboard', icon: <LayoutDashboard size={26} />, path: '/' },
        { name: 'Internet Ride', icon: <Bird size={26} />, path: '/intelligence' },
        { name: 'Task Tracking Center', icon: <Terminal size={26} />, path: '/command-center' },
        { name: 'Learning Outcomes', icon: <TrendingUp size={26} />, path: '/learning' },
        { name: 'Important Reports', icon: <Database size={26} />, path: '/reports' },
        
        { name: 'Global Pulse', icon: <Zap size={26} />, path: '/pulse' },
        { name: 'Chat', icon: <MessageSquare size={26} />, path: '/chat' },
        { name: 'Trends', icon: <TrendingUp size={26} />, path: '/trends' },
        { name: 'Agents', icon: <Users size={26} />, path: '/agents' },
        { name: 'Security & Risk Monitor', icon: <Shield size={26} />, path: '/security' },
    ];


    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={`w-[280px] lg:w-60 h-screen glass border-r-2 border-nova-border flex flex-col fixed left-0 top-0 z-50 transition-transform duration-500 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full shadow-none'}`}>



                <div className="p-6 sm:p-10 flex items-center justify-between">
                    <div className="flex items-center gap-2 lg:gap-2">
                        <div className="w-10 h-10 lg:w-9 lg:h-9 rounded-xl lg:rounded-lg bg-nova-accent flex items-center justify-center nova-accent-glow shrink-0">
                            <Bird className="text-nova-bg lg:hidden" size={20} />
                            <Bird className="text-nova-bg hidden lg:block" size={18} />

                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl lg:text-base font-black tracking-tighter text-white truncate uppercase">ZIUM <span className="text-nova-accent">NOVA</span></h1>
                            <p className="text-[8px] lg:text-[7px] text-nova-text-dim tracking-[0.2em] lg:tracking-[0.2em] uppercase font-black opacity-60 truncate">Silent Beast - v3.1.0</p>
                        </div>
                    </div>




                    <div className="flex items-center gap-2">
                        {/* Desktop Notification Bell */}
                        <div className="hidden lg:block">
                            <NotificationPanel />
                        </div>
                        {/* Mobile Close Button */}
                        <button onClick={onClose} className="lg:hidden p-2 sm:p-3 text-nova-text-dim hover:text-white bg-white/5 rounded-2xl transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <nav className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-2 sm:py-4 custom-scrollbar">
                    <div className="mb-4">
                        <p className="px-4 mb-2 text-[10px] font-black text-nova-text-dim uppercase tracking-[0.2em] opacity-40">Strategic Control</p>
                        <div className="space-y-1">
                            {navItems.slice(0, 5).map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group ${isActive
                                            ? 'bg-nova-accent/10 text-nova-accent border-2 border-nova-accent/30 shadow-[0_0_15px_rgba(0,242,255,0.1)]'
                                            : 'text-nova-text-dim hover:text-white hover:bg-white/5 border-2 border-transparent'
                                        }`
                                    }
                                >
                                    <span className="group-hover:scale-110 transition-transform duration-300 shrink-0">
                                        {React.cloneElement(item.icon as React.ReactElement<any>, { size: 18 })}
                                    </span>
                                    <span className="font-black text-[11px] tracking-tight uppercase whitespace-nowrap">{item.name}</span>
                                </NavLink>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="px-4 mb-2 text-[10px] font-black text-nova-text-dim uppercase tracking-[0.2em] opacity-40">Operational Tools</p>
                        <div className="space-y-1">
                            {navItems.slice(5).map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group ${isActive
                                            ? 'bg-nova-accent/10 text-nova-accent border-2 border-nova-accent/30 shadow-[0_0_15px_rgba(0,242,255,0.1)]'
                                            : 'text-nova-text-dim hover:text-white hover:bg-white/5 border-2 border-transparent'
                                        }`
                                    }
                                >
                                    <span className="group-hover:scale-110 transition-transform duration-300 shrink-0">
                                        {React.cloneElement(item.icon as React.ReactElement<any>, { size: 18 })}
                                    </span>
                                    <span className="font-black text-[11px] tracking-tight uppercase whitespace-nowrap">{item.name}</span>
                                </NavLink>
                            ))}
                        </div>
                    </div>
                </nav>

                <div className="p-4 lg:p-6">
                    <div className="glass p-4 lg:p-5 rounded-2xl lg:rounded-2xl border-2 border-nova-border/50 bg-white/[0.02]">
                        <div className="flex items-center gap-2 mb-2 lg:mb-3">
                            <div className="w-2 lg:w-2.5 h-2 lg:h-2.5 rounded-full bg-nova-accent animate-pulse shadow-[0_0_8px_rgba(0,242,255,0.5)]"></div>
                            <span className="text-[9px] lg:text-[8px] font-black text-nova-text uppercase tracking-widest">System Protocol</span>
                        </div>
                        <div className="flex flex-col gap-1.5 lg:gap-2">
                            <div className="flex justify-between text-[10px] lg:text-[9px] font-black text-nova-text-dim uppercase">
                                <span>Brain Grid</span>
                                <span className="text-nova-accent">LIVE</span>
                            </div>
                            <div className="flex justify-between text-[10px] lg:text-[9px] font-black text-nova-text-dim uppercase">
                                <span>Falcon Protocol</span>
                                <span className="text-nova-accent">ARMED</span>
                            </div>
                        </div>
                    </div>

                    <div 
                        onClick={() => {
                            localStorage.clear();
                            window.location.reload();
                        }}
                        className="mt-4 lg:mt-5 flex items-center gap-2 text-nova-text-dim/50 hover:text-nova-accent transition-all cursor-pointer group px-2"
                    >
                        <Zap size={12} className="group-hover:scale-110 transition-transform animate-pulse" />
                        <span className="text-[9px] lg:text-[8px] font-mono font-black tracking-widest uppercase">PROTOCOL SYNC</span>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
