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
    X
} from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const navItems = [
        { name: 'Dashboard', icon: <LayoutDashboard size={26} />, path: '/' },
        { name: 'Chat', icon: <MessageSquare size={26} />, path: '/chat' },
        { name: 'Trends', icon: <TrendingUp size={26} />, path: '/trends' },
        { name: 'Agents', icon: <Users size={26} />, path: '/agents' },
        { name: 'Memory', icon: <Database size={26} />, path: '/memory' },
        { name: 'Intelligence', icon: <Bird size={26} />, path: '/intelligence' },
        { name: 'Security', icon: <Bird size={26} />, path: '/security' },
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

            <aside className={`w-[280px] sm:w-80 h-screen glass border-r-2 border-nova-border flex flex-col fixed left-0 top-0 z-50 transition-transform duration-500 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full shadow-none'}`}>
                <div className="p-6 sm:p-10 flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-5">
                        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-nova-accent flex items-center justify-center nova-accent-glow shrink-0">
                            <Bird className="text-nova-bg" size={24} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-3xl font-black tracking-tighter text-white truncate">ZIUM <span className="text-nova-accent">NOVA</span></h1>
                            <p className="text-[8px] sm:text-xs text-nova-text-dim tracking-[0.2em] sm:tracking-[0.3em] uppercase font-black opacity-60 truncate">Silent Beast · v1.5</p>
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

                <nav className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-2 sm:py-4 space-y-2 sm:space-y-4 custom-scrollbar">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => {
                                if (window.innerWidth < 1024) onClose();
                            }}
                            className={({ isActive }) =>
                                `flex items-center gap-4 sm:gap-5 px-4 sm:px-6 py-3 sm:py-5 rounded-2xl sm:rounded-3xl transition-all duration-300 group ${isActive
                                    ? 'bg-nova-accent/10 text-nova-accent border-2 border-nova-accent/30 shadow-[0_0_20px_rgba(0,242,255,0.1)]'
                                    : 'text-nova-text-dim hover:text-white hover:bg-white/5 border-2 border-transparent'
                                }`
                            }
                        >
                            <span className="group-hover:scale-110 sm:group-hover:scale-125 transition-transform duration-300 shrink-0">
                                {React.cloneElement(item.icon as React.ReactElement<any>, { size: window.innerWidth < 640 ? 20 : 26 })}
                            </span>
                            <span className="font-black text-base sm:text-xl tracking-tight">{item.name}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-6 sm:p-10">
                    <div className="glass p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] border-2 border-nova-border/50 bg-white/[0.02]">
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-nova-accent animate-pulse shadow-[0_0_10px_rgba(0,242,255,0.5)]"></div>
                            <span className="text-[10px] sm:text-xs font-black text-nova-text uppercase tracking-widest">System Protocol</span>
                        </div>
                        <div className="flex flex-col gap-2 sm:gap-3">
                            <div className="flex justify-between text-xs sm:text-sm font-black text-nova-text-dim">
                                <span>Brain Grid</span>
                                <span className="text-nova-accent">LIVE</span>
                            </div>
                            <div className="flex justify-between text-xs sm:text-sm font-black text-nova-text-dim">
                                <span>Falcon Protocol</span>
                                <span className="text-nova-accent">ARMED</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 sm:mt-8 flex items-center gap-2 sm:gap-3 text-nova-text-dim/50 hover:text-nova-accent transition-all cursor-pointer group px-2 sm:px-4">
                        <Terminal size={14} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] sm:text-xs font-mono font-black tracking-widest uppercase">Encryption: AES-256</span>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
