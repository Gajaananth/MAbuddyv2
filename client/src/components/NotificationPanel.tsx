import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Archive, Check, AlertTriangle, TrendingUp, Bird, Zap, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../services/api';
import type { Notification } from '../types';

const RISK_COLORS: Record<string, string> = {
    Low: 'text-green-400 bg-green-500/10 border-green-500/30',
    Medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    High: 'text-red-400 bg-red-500/10 border-red-500/30',
};

const PRIORITY_BADGES: Record<string, string> = {
    normal: '',
    high: 'border-l-4 border-l-yellow-500',
    critical: 'border-l-4 border-l-red-500',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    'SL Market Intelligence': <TrendingUp size={13} />,
    'Scam Detection': <Bird size={13} />,
    'Algorithm Analysis': <Zap size={13} />,
    'Ethical Earning': <TrendingUp size={13} />,
    'AI Agent Intelligence': <Zap size={13} />,
    'AI-Agent Ecosystem': <Zap size={13} />,
    'Marketing Intelligence': <TrendingUp size={13} />,
    'Strategic Intelligence': <AlertTriangle size={13} />,
};

interface NotificationPanelProps {
    className?: string;
}



const MOBILE_BP = 768;

const NotificationPanel: React.FC<NotificationPanelProps> = ({ className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isUrgent, setIsUrgent] = useState(false);
    const [loading, setLoading] = useState(false);
    // Desktop dropdown position (fixed coords)
    const [dropPos, setDropPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const panelRef = useRef<HTMLDivElement>(null);
    const bellRef = useRef<HTMLButtonElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const navigate = useNavigate();

    const isMobile = () => window.innerWidth < MOBILE_BP;

    const fetchUnreadCount = useCallback(async () => {
        try {
            const res = await notificationService.getUnreadCount();
            setUnreadCount(res.data.count || 0);
            setIsUrgent(!!res.data.hasUrgent);
            if (res.data.hasUrgent) {
                console.log('[Notification] Urgent signal detected - ARMING BLINK');
            }
        } catch { /* silent */ }
    }, []);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await notificationService.getNotifications(30, true);
            setNotifications(res.data.data || []);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchUnreadCount();
        pollRef.current = setInterval(fetchUnreadCount, 30000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [fetchUnreadCount]);

    useEffect(() => {
        if (isOpen) fetchNotifications();
    }, [isOpen, fetchNotifications]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(e.target as Node) &&
                bellRef.current && !bellRef.current.contains(e.target as Node)
            ) setIsOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleOpen = () => {
        if (!isOpen && bellRef.current && !isMobile()) { // Changed isMobile to isMobile()
            // Calculate fixed position for desktop
            if (bellRef.current) {
                const rect = bellRef.current.getBoundingClientRect();
                const panelWidth = 340;
                // Anchor further right to clear sidebar
                let left = rect.left - (panelWidth - rect.width) + 20;
                if (left < 20) left = 20;
                if (left + panelWidth > window.innerWidth - 20) {
                    left = window.innerWidth - panelWidth - 20;
                }

                setDropPos({
                    top: rect.bottom + 12,
                    left: left
                });
            }

        }
        setIsOpen(v => !v);
    };

    const handleMarkRead = async (id: string) => {
        try {
            await notificationService.markRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            await fetchUnreadCount();
        } catch { /* silent */ }
    };

    const handleMarkAllRead = async () => {
        try {
            const ids = notifications.filter(n => !isRead(n)).map(n => n.id);
            if (!ids.length) return;
            await Promise.all(ids.map(id => notificationService.markRead(id)));
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            await fetchUnreadCount();
        } catch { /* silent */ }
    };

    const handleArchive = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await notificationService.archive(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            await fetchUnreadCount();
        } catch { /* silent */ }
    };

    const isRead = (n: Notification) => n.is_read === true || n.is_read === 1;


    /* ─── Shared Header ─────────────────────────────────────── */
    const Header = () => (
        <div className="flex items-center justify-between px-4 py-3 border-b border-nova-border/50 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
                <Bell size={15} className="text-nova-accent shrink-0" />
                <span className="text-[11px] font-black text-white uppercase tracking-widest truncate">
                    Signals
                </span>
                {unreadCount > 0 && (
                    <span className="shrink-0 text-[9px] font-black text-nova-bg bg-nova-accent px-1.5 py-0.5 rounded-full leading-none">
                        {unreadCount}
                    </span>
                )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        className="text-[9px] font-black text-nova-accent hover:text-white border border-nova-accent/30 px-2 py-1 rounded-lg hover:bg-nova-accent/10 transition-all uppercase tracking-wider whitespace-nowrap"
                    >
                        Clear all
                    </button>
                )}
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                    aria-label="Close notifications"
                >
                    <X size={14} className="text-nova-text-dim" />
                </button>
            </div>
        </div>
    );

    /* ─── Shared List ───────────────────────────────────────── */
    const List = () => (
        <>
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="w-5 h-5 border-2 border-nova-accent/20 border-t-nova-accent rounded-full animate-spin" />
                </div>
            )}
            {!loading && notifications.length === 0 && (
                <div className="py-14 text-center px-6">
                    <Bell size={28} className="mx-auto text-nova-text-dim/30 mb-3" />
                    <p className="text-xs text-nova-text-dim/50 font-bold">No intelligence signals.</p>
                    <p className="text-[10px] text-nova-text-dim/30 mt-1">Monitoring active.</p>
                </div>
            )}
            {!loading && notifications.map((n) => (
                <div
                    key={n.id}
                    onClick={() => {
                        if (!isRead(n)) handleMarkRead(n.id);
                        setIsOpen(false);
                        navigate(`/reports`);
                    }}
                    className={`
                        group flex items-start gap-2 px-3 py-3.5
                        border-b border-nova-border/20 cursor-pointer
                        hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors
                        ${!isRead(n) ? 'bg-nova-accent/[0.03]' : 'opacity-55'}
                        ${PRIORITY_BADGES[n.priority] || ''}
                    `}
                >
                    {/* Unread dot */}
                    <div className="pt-[7px] shrink-0 w-2">
                        {!isRead(n) && (
                            <div className={`w-2 h-2 rounded-full bg-nova-accent shadow-[0_0_6px_rgba(0,242,255,0.7)] ${n.metadata?.is_blinking ? 'animate-blink' : ''}`} />
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold leading-snug mb-1.5 ${!isRead(n) ? 'text-white' : 'text-nova-text-dim'}`}>
                            {n.title}
                        </p>

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <div className="flex items-center gap-1 min-w-0">
                                <span className="text-nova-accent shrink-0">
                                    {CATEGORY_ICONS[n.category] || <Zap size={11} />}
                                </span>
                                <span className="text-[9px] font-black text-nova-accent uppercase tracking-wider truncate">
                                    {n.category}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 ml-auto">
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border shadow-sm ${RISK_COLORS[n.risk_level] || RISK_COLORS.Medium}`}>
                                    {n.risk_level}
                                </span>
                                {n.priority === 'critical' && (
                                    <span className="text-[8px] font-black text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-md uppercase animate-pulse">
                                        CRITICAL
                                    </span>
                                )}
                            </div>
                        </div>


                        {/* Preview */}
                        <p className="text-[11px] text-nova-text-dim line-clamp-2 leading-relaxed mb-2">
                            {n.content}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1 text-[9px] text-nova-text-dim/40 font-medium shrink-0">
                                <Clock size={8} />
                                {new Date(n.created_at).toLocaleDateString([], {
                                    month: 'short', day: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                })}
                            </span>
                            <span className="text-[8px] text-nova-text-dim/40 font-bold uppercase truncate">
                                {n.monetization_potential}
                            </span>
                        </div>
                    </div>

                    {/* Action buttons — 
                        Desktop: hidden until group hover
                        Mobile:  always visible via .notification-actions CSS class + @media (hover:none) */}
                    <div className="notification-actions flex flex-col gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isRead(n) && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                                className="p-2.5 sm:p-2 hover:bg-green-500/20 active:bg-green-500/30 rounded-lg transition-colors touch-manipulation flex items-center justify-center shrink-0"
                                title="Mark read"
                            >
                                <Check size={14} className="text-green-400" />
                            </button>
                        )}
                        <button
                            onClick={(e) => handleArchive(n.id, e)}
                            className="p-2.5 sm:p-2 hover:bg-red-500/20 active:bg-red-500/30 rounded-lg transition-colors touch-manipulation flex items-center justify-center shrink-0"
                            title="Archive"
                        >
                            <Archive size={14} className="text-nova-text-dim/60 hover:text-red-400" />
                        </button>
                    </div>
                </div>
            ))}
        </>
    );

    return (
        <>
            {/* ─── Bell trigger ─────────────────────────────── */}
            <div className={`relative ${className}`}>
                <button
                    ref={bellRef}
                    onClick={handleOpen}
                    className={`relative p-2 rounded-xl hover:bg-white/10 active:scale-90 transition-all group ${isUrgent ? 'nova-urgent-blink' : ''}`}
                    aria-label="Notifications"
                >
                    <Bell size={21} className={`text-nova-text-dim group-hover:text-nova-accent transition-colors ${isUrgent ? 'animate-blink text-nova-accent' : ''}`} />
                    {unreadCount > 0 && (
                        <span className={`absolute top-1 right-1 min-w-[17px] h-[17px] flex items-center justify-center px-1 text-[8px] font-black bg-red-500 text-white rounded-full shadow-lg shadow-red-500/40 pointer-events-none border-2 border-nova-bg ${isUrgent ? 'animate-pulse' : 'animate-pulse'}`}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>

            </div>

            {isOpen && (
                <>
                    {/* ─── Backdrop (both mobile and desktop) ─ */}
                    <div
                        className="fixed inset-0 z-[9990] md:bg-transparent bg-black/60 md:backdrop-blur-none backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* ─── DESKTOP dropdown — fixed, right-anchored to bell ─
                        Hidden on mobile (<768px) */}
                    <div
                        ref={panelRef}
                        style={{
                            position: 'fixed',
                            top: `${dropPos.top}px`,
                            left: `${dropPos.left}px`,
                            width: '320px',
                            maxHeight: `calc(100dvh - ${dropPos.top + 12}px)`,
                        }}

                        className="
                            hidden md:flex flex-col
                            bg-nova-bg/98 backdrop-blur-3xl rounded-2xl border-2 border-nova-border
                            shadow-[0_0_50px_rgba(0,0,0,0.8)] z-[9999]
                            overflow-hidden
                        "

                    >
                        <Header />
                        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
                            <List />
                        </div>
                    </div>

                    {/* ─── MOBILE bottom-sheet — slides up from bottom ─
                        Only visible on mobile (<768px), purely CSS driven */}
                    <div
                        className="
                            fixed bottom-0 left-0 right-0 z-[9999] md:hidden
                            flex flex-col
                            max-h-[78dvh]
                            glass rounded-t-3xl border-t-2 border-x-2 border-nova-border
                            shadow-2xl shadow-black/60
                            overflow-hidden
                            animate-slide-up
                        "
                    >
                        {/* Drag handle */}
                        <div className="flex justify-center pt-3 pb-1 shrink-0">
                            <div className="w-10 h-1 rounded-full bg-white/20" />
                        </div>
                        <Header />
                        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
                            <List />
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default NotificationPanel;
