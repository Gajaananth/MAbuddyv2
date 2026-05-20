import React, { useState, useEffect } from 'react';
import {
    
    Key,
    Fingerprint,
    Smartphone,
    Trash2,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    ShieldCheck,
    ShieldAlert,
    Activity,
    Lock
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { startRegistration } from '@simplewebauthn/browser';
import { formatTimestamp } from '../utils/formatUtils';
import { NovaLogo } from '../components/NovaLogo';

interface AuditLog {
    id: string;
    event_type: string;
    actor: string;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    details: string;
    created_at: string;
}

const riskColors: Record<string, string> = {
    LOW: 'text-green-400 border-green-500/20 bg-green-500/5',
    MEDIUM: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5',
    HIGH: 'text-red-400 border-red-500/20 bg-red-500/5',
};

const eventIcons: Record<string, React.ReactNode> = {
    LOGIN: <ShieldCheck className="w-4 h-4 text-green-400" />,
    LOGIN_BIOMETRIC: <Fingerprint className="w-4 h-4 text-blue-400" />,
    REGISTER: <Lock className="w-4 h-4 text-nova-accent" />,
    PIN_CHANGE: <Key className="w-4 h-4 text-yellow-400" />,
};

const SecuritySettings: React.FC = () => {
    useAuth();
    const [activeTab, setActiveTab] = useState<'pin' | 'biometric' | 'devices' | 'vault'>('vault');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [devices, setDevices] = useState<any[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [activeWarnings, setActiveWarnings] = useState(0);

    const [pinForm, setPinForm] = useState({
        oldPin: '',
        newPin: '',
        confirmPin: '',
        q1: '',
        q2: '',
        q3: 0
    });

    const fetchDevices = async () => {
        try {
            const res = await api.get('/auth/devices');
            setDevices(res.data.devices);
        } catch (err) {
            console.error('Failed to fetch devices', err);
        }
    };

    const fetchAuditLogs = async () => {
        setLogsLoading(true);
        try {
            const res = await api.get('/trends/security-logs');
            const logs: AuditLog[] = res.data.data || [];
            setAuditLogs(logs);
            setActiveWarnings(logs.filter(l => l.risk_level === 'MEDIUM' || l.risk_level === 'HIGH').length);
        } catch (err) {
            console.error('Failed to fetch audit logs', err);
        } finally {
            setLogsLoading(false);
        }
    };

    useEffect(() => {
        fetchAuditLogs();
    }, []);

    useEffect(() => {
        if (activeTab === 'devices' || activeTab === 'biometric') fetchDevices();
    }, [activeTab]);

    const handleChangePin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pinForm.newPin !== pinForm.confirmPin) {
            setMessage({ type: 'error', text: 'PIN mismatch.' });
            return;
        }
        setLoading(true);
        try {
            await api.post('/auth/change-pin', pinForm);
            setMessage({ type: 'success', text: 'PIN updated successfully.' });
            setPinForm({ oldPin: '', newPin: '', confirmPin: '', q1: '', q2: '', q3: 0 });
            fetchAuditLogs();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Update failed.' });
        } finally {
            setLoading(false);
        }
    };

    const handleEnrollBiometric = async () => {
        setLoading(true);
        try {
            const optionsRes = await api.get('/auth/biometrics/register-options');
            const attestationRes = await startRegistration({ optionsJSON: optionsRes.data });
            await api.post('/auth/biometrics/register-verify', attestationRes);
            setMessage({ type: 'success', text: 'Fingerprint enrolled.' });
            fetchDevices();
        } catch (err: any) {
            const errorText = err.response?.data?.error || err.response?.data?.details || err.message || 'Enrollment failed.';
            setMessage({ type: 'error', text: `PROTOCOL_FAILURE: ${errorText}` });
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeBiometric = async () => {
        if (!confirm('PROTOCOL REVOCATION: Disable biometric access for this device?')) return;
        setLoading(true);
        try {
            await api.delete('/auth/biometrics');
            setMessage({ type: 'success', text: 'Biometric access revoked.' });
            fetchDevices();
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Revocation failed.' });
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveDevice = async (id: string) => {
        if (!confirm('Remove this device? You will be logged out if it is the current one.')) return;
        try {
            await api.delete(`/auth/devices/${id}`);
            fetchDevices();
        } catch (err) {
            setMessage({ type: 'error', text: 'Removal failed.' });
        }
    };

    const tabs = [
        { id: 'vault', label: 'Audit Vault', icon: <Activity className="w-4 h-4 shrink-0" /> },
        { id: 'pin', label: 'PIN', icon: <Key className="w-4 h-4 shrink-0" /> },
        { id: 'biometric', label: 'Biometrics', icon: <Fingerprint className="w-4 h-4 shrink-0" /> },
        { id: 'devices', label: 'Hardware', icon: <Smartphone className="w-4 h-4 shrink-0" /> },
    ];

    const recentLogins = auditLogs.filter(l => l.event_type === 'LOGIN' || l.event_type === 'LOGIN_BIOMETRIC').length;
    const blockedEvents = activeWarnings;

    return (
        <div className="security-settings p-4 sm:p-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 sm:gap-4 mb-8">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 relative shadow-2xl shrink-0">
                    <NovaLogo className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white uppercase tracking-tighter leading-none">
                        Security <span className="text-red-400">Vault</span>
                    </h1>
                    <p className="text-nova-text-dim text-[9px] sm:text-[10px] font-black tracking-[0.2em] uppercase opacity-60 mt-1 flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse"></span>
                        v6.0.0 — Audit Trail Active
                    </p>
                </div>
            </div>

            {/* Live Risk Dashboard */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
                <div className="glass p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-green-500/30 bg-green-500/5">
                    <p className="text-[9px] sm:text-[10px] text-green-400/70 font-black uppercase tracking-wider mb-1">Threat Level</p>
                    <p className="text-xl sm:text-2xl font-black text-green-400">{blockedEvents > 5 ? 'HIGH' : blockedEvents > 2 ? 'MED' : 'LOW'}</p>
                </div>
                <div className="glass p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-nova-border/50">
                    <p className="text-[9px] sm:text-[10px] text-nova-text-dim font-black uppercase tracking-wider mb-1">Warnings</p>
                    <p className="text-xl sm:text-2xl font-black text-yellow-400">{activeWarnings}</p>
                </div>
                <div className="glass p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-nova-border/50">
                    <p className="text-[9px] sm:text-[10px] text-nova-text-dim font-black uppercase tracking-wider mb-1">Grid Access</p>
                    <p className="text-xl sm:text-2xl font-black text-nova-accent">{recentLogins}</p>
                </div>
                <div className="glass p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-nova-border/50">
                    <p className="text-[9px] sm:text-[10px] text-nova-text-dim font-black uppercase tracking-wider mb-1">Total Events</p>
                    <p className="text-xl sm:text-2xl font-black text-white">{auditLogs.length}</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                {/* Sidebar Tabs */}
                <div className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-1 md:pb-0 md:w-48 shrink-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all whitespace-nowrap text-sm font-bold shrink-0 ${activeTab === tab.id ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
                    {message && (
                        <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 animate-in zoom-in-95 duration-300 ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
                            <span className="text-sm font-medium">{message.text}</span>
                        </div>
                    )}

                    {/* VAULT TAB — Real Audit Trail */}
                    {activeTab === 'vault' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-nova-accent uppercase tracking-widest flex items-center gap-2">
                                    <Activity className="w-4 h-4" /> Live Audit Stream
                                </h3>
                                <button onClick={fetchAuditLogs} className="text-[10px] font-black text-nova-text-dim hover:text-white uppercase tracking-widest transition-all">
                                    Refresh
                                </button>
                            </div>
                            {logsLoading ? (
                                <div className="flex justify-center py-16">
                                    <Loader2 className="w-8 h-8 animate-spin text-nova-accent/40" />
                                </div>
                            ) : auditLogs.length === 0 ? (
                                <div className="py-16 text-center opacity-30">
                                    <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-green-400" />
                                    <p className="text-sm font-black uppercase tracking-widest">No Events Logged Yet</p>
                                    <p className="text-[10px] text-nova-text-dim mt-1">Grid is clean. Events will appear after grid access.</p>
                                </div>
                            ) : (
                                auditLogs.map(log => (
                                    <div key={log.id} className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${riskColors[log.risk_level]}`}>
                                        <div className="shrink-0 mt-0.5">
                                            {eventIcons[log.event_type] || <ShieldAlert className="w-4 h-4 text-nova-text-dim" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-wider">{log.event_type.replace(/_/g, ' ')}</span>
                                                <span className="text-[9px] opacity-50">via {log.actor}</span>
                                            </div>
                                            <p className="text-[11px] opacity-70 truncate">{log.details}</p>
                                        </div>
                                        <span className="text-[9px] opacity-40 shrink-0 font-mono">{formatTimestamp(log.created_at)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'pin' && (
                        <form onSubmit={handleChangePin} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Present PIN</label>
                                    <input type="password" maxLength={6} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={pinForm.oldPin} onChange={e => setPinForm({ ...pinForm, oldPin: e.target.value })} required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">New PIN (6+ Digits)</label>
                                    <input type="password" className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={pinForm.newPin} onChange={e => setPinForm({ ...pinForm, newPin: e.target.value })} required />
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Confirm New PIN</label>
                                    <input type="password" className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={pinForm.confirmPin} onChange={e => setPinForm({ ...pinForm, confirmPin: e.target.value })} required />
                                </div>
                            </div>
                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <h3 className="text-sm font-semibold text-blue-400 mb-2">Security Verification</h3>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Q1: Favorite Food', key: 'q1', type: 'text', value: pinForm.q1, onChange: (v: string) => setPinForm({ ...pinForm, q1: v }) },
                                        { label: 'Q2: Inspiration', key: 'q2', type: 'text', value: pinForm.q2, onChange: (v: string) => setPinForm({ ...pinForm, q2: v }) },
                                        { label: 'Q3: DOB Date - Month Math', key: 'q3', type: 'number', value: pinForm.q3, onChange: (v: string) => setPinForm({ ...pinForm, q3: parseInt(v) || 0 }) },
                                    ].map(field => (
                                        <div key={field.key} className="space-y-1">
                                            <label className="text-xs text-gray-500">{field.label}</label>
                                            <input type={field.type} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={field.value} onChange={e => field.onChange(e.target.value)} required />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex justify-center items-center gap-2">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Update Secret PIN</span>}
                            </button>
                        </form>
                    )}

                    {activeTab === 'biometric' && (
                        <div className="text-center py-10 space-y-6">
                            <div className="flex justify-center">
                                <div className="relative">
                                    <Fingerprint className="w-20 h-20 text-blue-400 animate-pulse" />
                                    <div className="absolute inset-0 bg-blue-400/20 blur-2xl rounded-full" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold">Biometric Vault</h3>
                                {devices.some(d => d.device_identifier === localStorage.getItem('zn_device_id') && d.public_key) ? (
                                    <div className="space-y-4">
                                        <p className="text-green-400 text-sm max-w-xs mx-auto font-semibold uppercase tracking-widest">Status: Protocol Hardware Bound</p>
                                        <div className="flex flex-col gap-3 max-w-xs mx-auto">
                                            <button onClick={handleEnrollBiometric} disabled={loading} className="w-full bg-white/10 border border-white/20 text-white font-bold py-3 rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2">
                                                <Loader2 className={`w-4 h-4 animate-spin ${loading ? 'block' : 'hidden'}`} />
                                                Update Biometrics
                                            </button>
                                            <button onClick={handleRevokeBiometric} disabled={loading} className="w-full bg-red-500/10 border border-red-500/20 text-red-500 font-bold py-3 rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2">
                                                Revoke Access
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-gray-400 text-sm max-w-xs mx-auto">Secure your session with hardware-level biometric authentication.</p>
                                        <button onClick={handleEnrollBiometric} disabled={loading} className="inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-3 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50 shadow-xl">
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
                                            <span>Enroll Fingerprint</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'devices' && (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Linked Assets</h3>
                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30 uppercase tracking-widest whitespace-nowrap">{devices.length}/17 Protocol Assets</span>
                            </div>
                            <div className="space-y-3">
                                {devices.map((dev) => (
                                    <div key={dev.id} className="flex items-start sm:items-center justify-between p-4 bg-black/40 border border-white/5 rounded-xl hover:border-white/20 transition-all group gap-3">
                                        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                                            <div className="p-2 bg-white/5 rounded-lg shrink-0"><Smartphone className="w-5 h-5 text-gray-400" /></div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold flex flex-wrap items-center gap-2">
                                                    <span className="truncate">{dev.device_identifier.slice(0, 12)}...</span>
                                                    {dev.public_key && (
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[9px] text-green-400 uppercase tracking-wider font-bold whitespace-nowrap">
                                                            <Fingerprint className="w-2.5 h-2.5" /> Verified
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-gray-500 uppercase mt-1">{dev.os_type} — ID: {dev.id.slice(0, 8)}</div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleRemoveDevice(dev.id)} className="p-2 text-gray-500 hover:text-red-400 transition-colors shrink-0">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SecuritySettings;
