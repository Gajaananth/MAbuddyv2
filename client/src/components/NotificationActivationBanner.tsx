import React, { useState, useEffect } from 'react';
import { BellRing, BellOff, Bird, Smartphone, AlertTriangle } from 'lucide-react';
import {
    isPushSupported,
    isIOS,
    isIOSPushReady,
    getPermissionStatus,
    requestPermission,
    subscribeToPush,
    showLocalNotification,
} from '../services/pushService';

type BannerState = 'checking' | 'unsupported' | 'ios-pwa-required' | 'ready' | 'denied' | 'enabled' | 'hidden';

const NotificationActivationBanner: React.FC = () => {
    const [state, setState] = useState<BannerState>('checking');
    const [loading, setLoading] = useState(false);
    const [dismissedThisSession, setDismissedThisSession] = useState(false);

    useEffect(() => {
        // Check session dismissal
        if (sessionStorage.getItem('zn-notif-dismissed')) {
            setDismissedThisSession(true);
        }

        evaluateState();
    }, []);

    function evaluateState() {
        if (!isPushSupported()) {
            setState('unsupported');
            return;
        }

        if (isIOS() && !isIOSPushReady()) {
            setState('ios-pwa-required');
            return;
        }

        const permission = getPermissionStatus();
        if (permission === 'granted') {
            setState('enabled');
        } else if (permission === 'denied') {
            setState('denied');
        } else {
            setState('ready');
        }
    }

    async function handleEnable() {
        setLoading(true);
        try {
            const permission = await requestPermission();

            if (permission === 'granted') {
                const success = await subscribeToPush();
                if (success) {
                    setState('enabled');
                    // Trigger confirmation notification
                    showLocalNotification(
                        'ZIUM NOVA Activated',
                        'Intelligence monitoring is now active.'
                    );
                } else {
                    setState('denied');
                }
            } else if (permission === 'denied') {
                setState('denied');
            }
        } catch (err) {
            console.error('[Banner] Enable failed:', err);
        } finally {
            setLoading(false);
        }
    }

    function handleDismiss() {
        setDismissedThisSession(true);
        sessionStorage.setItem('zn-notif-dismissed', 'true');
    }

    // Don't show if already enabled or dismissed
    if (state === 'enabled' || state === 'hidden' || state === 'checking') return null;
    if (dismissedThisSession && state === 'denied') return null;

    return (
        <div className="mb-6 rounded-2xl border-2 border-nova-border/50 overflow-hidden">
            {/* Unsupported Browser */}
            {state === 'unsupported' && (
                <div className="px-6 py-4 flex items-center gap-4 bg-yellow-500/5 border-l-4 border-l-yellow-500/50">
                    <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-yellow-300">Push notifications are not supported on this browser.</p>
                        <p className="text-xs text-nova-text-dim mt-0.5">Use Chrome, Edge, or Firefox for full intelligence alerts.</p>
                    </div>
                </div>
            )}

            {/* iOS — Needs Add to Home Screen */}
            {state === 'ios-pwa-required' && (
                <div className="px-6 py-4 flex items-center gap-4 bg-blue-500/5 border-l-4 border-l-blue-500/50">
                    <Smartphone size={20} className="text-blue-400 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-blue-300">Add Zium Nova to your Home Screen for push notifications.</p>
                        <p className="text-xs text-nova-text-dim mt-0.5">Tap Share → "Add to Home Screen" → reopen the app.</p>
                    </div>
                </div>
            )}

            {/* Denied — Subtle Reminder */}
            {state === 'denied' && (
                <div className="px-6 py-4 flex items-center justify-between bg-red-500/5 border-l-4 border-l-red-500/30">
                    <div className="flex items-center gap-3">
                        <BellOff size={18} className="text-red-400/60 flex-shrink-0" />
                        <p className="text-xs text-red-300/60 font-bold">
                            Notifications blocked. Enable in browser settings to receive intelligence alerts.
                        </p>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="text-xs text-nova-text-dim/40 hover:text-nova-text-dim ml-4 flex-shrink-0"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Ready — Main Activation Banner */}
            {state === 'ready' && (
                <div className="px-6 py-5 flex items-center justify-between glass bg-nova-accent/[0.03]">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-nova-accent/10 border border-nova-accent/20 flex items-center justify-center">
                            <Bird size={20} className="text-nova-accent" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Intelligence alerts are disabled.</p>
                            <p className="text-xs text-nova-text-dim mt-0.5">Enable push notifications to receive high-value signals in real time.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleEnable}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-nova-accent/10 hover:bg-nova-accent/20 border-2 border-nova-accent/30 text-nova-accent text-sm font-black uppercase tracking-wider rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,242,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-nova-accent/20 border-t-nova-accent rounded-full animate-spin" />
                        ) : (
                            <BellRing size={16} />
                        )}
                        <span>{loading ? 'Activating...' : 'Enable ZIUM NOVA Alerts'}</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationActivationBanner;
