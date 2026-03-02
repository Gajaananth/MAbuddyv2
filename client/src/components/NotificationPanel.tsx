import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Archive, Check, AlertTriangle, TrendingUp, Shield, Zap, Clock } from 'lucide-react';
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
    'SL Market Intelligence': <TrendingUp size={16} />,
    'Scam Detection': <Shield size={16} />,
    'Algorithm Analysis': <Zap size={16} />,
    'Ethical Earning': <TrendingUp size={16} />,
    'AI Agent Intelligence': <Zap size={16} />,
    'AI-Agent Ecosystem': <Zap size={16} />,
    'Marketing Intelligence': <TrendingUp size={16} />,
    'Strategic Intelligence': <AlertTriangle size={16} />,
};

interface NotificationPanelProps {
    className?: string;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const bellRef = useRef<HTMLButtonElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const res = await notificationService.getUnreadCount();
            setUnreadCount(res.data.count || 0);
        } catch {
            // Silent fail — don't break the UI
        }
    }, []);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await notificationService.getNotifications(30, true);
            setNotifications(res.data.data || []);
        } catch {
            // Silent fail
        } finally {
            setLoading(false);
        }
    }, []);

    // Poll unread count every 30 seconds
    useEffect(() => {
        fetchUnreadCount();
        pollRef.current = setInterval(fetchUnreadCount, 30000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [fetchUnreadCount]);

    // Fetch full list when panel opens
    useEffect(() => {
        if (isOpen) fetchNotifications();
    }, [isOpen, fetchNotifications]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
                bellRef.current && !bellRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    const handleToggle = () => {
        if (!isOpen && bellRef.current) {
            const rect = bellRef.current.getBoundingClientRect();
            const isDesktop = window.innerWidth >= 1024;
            if (isDesktop) {
                // Desktop: open panel to the right of the sidebar, below the bell
                setPanelPos({
                    top: rect.bottom + 8,
                    left: Math.min(rect.left, window.innerWidth - 400),
                });
            } else {
                // Mobile: open panel below the bell, anchored to the right edge
                setPanelPos({
                    top: rect.bottom + 8,
                    left: Math.max(8, window.innerWidth - 392),
                });
            }
        }
        setIsOpen(!isOpen);
    };

    const handleMarkRead = async (id: string) => {
        try {
            await notificationService.markRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            await fetchUnreadCount(); // Explicitly sync with server
        } catch { /* Silent */ }
    };

    const handleMarkAllRead = async () => {
        try {
            // Bulk mark all unread visible notifications as read locally
            const unreadIds = notifications.filter(n => !isRead(n)).map(n => n.id);
            if (unreadIds.length === 0) return;

            // Mark each as read on server (assuming no bulk endpoint yet, or we just trigger the first one and rely on unread-count)
            // For now, let's just mark the ones currently in state and refresh
            await Promise.all(unreadIds.map(id => notificationService.markRead(id)));

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            await fetchUnreadCount();
        } catch { /* Silent */ }
    };

    const handleArchive = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await notificationService.archive(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            await fetchUnreadCount();
        } catch { /* Silent */ }
    };

    const isRead = (n: Notification) => n.is_read === true || n.is_read === 1;

    return (
        <div className={`relative ${className}`}>
            {/* Bell Icon */}
            <button
                ref={bellRef}
                onClick={handleToggle}
                className="relative p-2.5 rounded-xl hover:bg-white/10 transition-all group"
                aria-label="Notifications"
            >
                <Bell size={22} className="text-nova-text-dim group-hover:text-nova-accent transition-colors" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 flex items-center justify-center px-1 text-[10px] font-black bg-red-500 text-white rounded-full shadow-lg shadow-red-500/50 animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Panel Dropdown — Fixed position to avoid sidebar overflow clipping */}
            {isOpen && panelPos && (
                <div
                    ref={panelRef}
                    style={{ position: 'fixed', top: panelPos.top, left: panelPos.left }}
                    className="w-[380px] max-h-[520px] glass rounded-2xl border-2 border-nova-border shadow-2xl shadow-black/40 z-[9999] overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-nova-border/50">
                        <div className="flex items-center gap-2">
                            <Bell size={18} className="text-nova-accent" />
                            <span className="text-sm font-black text-white uppercase tracking-wider">Intelligence Signals</span>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="ml-2 text-[10px] font-black text-nova-accent hover:text-white transition-colors uppercase tracking-widest border border-nova-accent/20 px-2 py-0.5 rounded"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                            <X size={16} className="text-nova-text-dim" />
                        </button>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading && (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-6 h-6 border-2 border-nova-accent/20 border-t-nova-accent rounded-full animate-spin" />
                            </div>
                        )}

                        {!loading && notifications.length === 0 && (
                            <div className="py-16 text-center">
                                <Bell size={32} className="mx-auto text-nova-text-dim/30 mb-3" />
                                <p className="text-sm text-nova-text-dim/50 font-bold">No intelligence signals detected.</p>
                                <p className="text-xs text-nova-text-dim/30 mt-1">Monitoring active. Awaiting strategic events.</p>
                            </div>
                        )}

                        {!loading && notifications.map((n) => (
                            <div
                                key={n.id}
                                onClick={() => !isRead(n) && handleMarkRead(n.id)}
                                className={`
                                    px-5 py-4 border-b border-nova-border/20 cursor-pointer
                                    hover:bg-white/[0.03] transition-all group
                                    ${!isRead(n) ? 'bg-nova-accent/[0.03]' : 'opacity-60'}
                                    ${PRIORITY_BADGES[n.priority] || ''}
                                `}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        {/* Title */}
                                        <div className="flex items-center gap-2 mb-1.5">
                                            {!isRead(n) && <div className="w-2 h-2 rounded-full bg-nova-accent flex-shrink-0 shadow-[0_0_8px_rgba(0,242,255,0.6)]" />}
                                            <span className={`text-sm font-bold truncate ${!isRead(n) ? 'text-white' : 'text-nova-text-dim'}`}>
                                                {n.title}
                                            </span>
                                        </div>

                                        {/* Category + Risk */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="flex items-center gap-1 text-[10px] font-black text-nova-accent uppercase tracking-wider">
                                                {CATEGORY_ICONS[n.category] || <Zap size={12} />}
                                                {n.category}
                                            </span>
                                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${RISK_COLORS[n.risk_level] || RISK_COLORS.Medium}`}>
                                                {n.risk_level}
                                            </span>
                                            {n.priority === 'critical' && (
                                                <span className="text-[9px] font-black text-red-400 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded uppercase">
                                                    PRIORITY
                                                </span>
                                            )}
                                        </div>

                                        {/* Content Preview */}
                                        <p className="text-xs text-nova-text-dim line-clamp-2 leading-relaxed font-medium">
                                            {n.content}
                                        </p>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="flex items-center gap-1 text-[10px] text-nova-text-dim/40 font-bold">
                                                <Clock size={10} />
                                                {new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="text-[10px] text-nova-text-dim/40 font-bold uppercase">
                                                Potential: {n.monetization_potential}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                        {!isRead(n) && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                                                className="p-1.5 hover:bg-green-500/20 rounded-lg transition-colors"
                                                title="Mark as read"
                                            >
                                                <Check size={14} className="text-green-400" />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => handleArchive(n.id, e)}
                                            className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                                            title="Archive"
                                        >
                                            <Archive size={14} className="text-nova-text-dim hover:text-red-400" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationPanel;
