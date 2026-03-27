import React, { useState, useEffect } from 'react';
import {
    Bird,
    Key,
    Fingerprint,
    Smartphone,
    Trash2,
    AlertTriangle,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { startRegistration } from '@simplewebauthn/browser';

const SecuritySettings: React.FC = () => {
    useAuth();
    const [activeTab, setActiveTab] = useState<'pin' | 'biometric' | 'devices'>('pin');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [devices, setDevices] = useState<any[]>([]);

    // PIN Form State
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
            fetchDevices(); // Refresh list to show biometric icon
        } catch (err: any) {
            const errorText = err.response?.data?.error || err.response?.data?.details || err.message || 'Enrollment failed.';
            setMessage({ type: 'error', text: `PROTOCOL_FAILURE: ${errorText}` });
            console.error('[Biometrics] Enrollment Error:', err.response?.data || err);
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

    return (
        <div className="security-settings p-4 sm:p-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 sm:gap-4 mb-8">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 relative shadow-2xl shrink-0">
                    <Bird className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white uppercase tracking-tighter leading-none">
                        Security <span className="text-red-400">Settings</span>
                    </h1>
                    <p className="text-nova-text-dim text-[9px] sm:text-[10px] font-black tracking-[0.2em] uppercase opacity-60 mt-1 flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse"></span>
                        v3.2.0 — Protocol Active
                    </p>
                </div>
            </div>

            {/* Risk Dashboard */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
                <div className="glass p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-green-500/30 bg-green-500/5">
                    <p className="text-[9px] sm:text-[10px] text-green-400/70 font-black uppercase tracking-wider mb-1">Threat Level</p>
                    <p className="text-xl sm:text-2xl font-black text-green-400">LOW</p>
                </div>
                <div className="glass p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-nova-border/50">
                    <p className="text-[9px] sm:text-[10px] text-nova-text-dim font-black uppercase tracking-wider mb-1">Active Warnings</p>
                    <p className="text-xl sm:text-2xl font-black text-white">0</p>
                </div>
                <div className="glass p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-nova-border/50">
                    <p className="text-[9px] sm:text-[10px] text-nova-text-dim font-black uppercase tracking-wider mb-1">Blocked</p>
                    <p className="text-xl sm:text-2xl font-black text-red-500">12</p>
                </div>
                <div className="glass p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-nova-border/50">
                    <p className="text-[9px] sm:text-[10px] text-nova-text-dim font-black uppercase tracking-wider mb-1">Risk Score</p>
                    <p className="text-xl sm:text-2xl font-black text-green-400">98/100</p>
                </div>
            </div>

            {/* Tabs — horizontal scroll on mobile, vertical sidebar on md+ */}
            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                <div className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-1 md:pb-0 md:w-48 shrink-0">
                    {[
                        { id: 'pin', label: 'PIN', icon: <Key className="w-4 h-4 shrink-0" /> },
                        { id: 'biometric', label: 'Biometrics', icon: <Fingerprint className="w-4 h-4 shrink-0" /> },
                        { id: 'devices', label: 'Hardware', icon: <Smartphone className="w-4 h-4 shrink-0" /> },
                    ].map(tab => (
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

                    {activeTab === 'pin' && (
                        <form onSubmit={handleChangePin} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Present PIN</label>
                                    <input
                                        type="password"
                                        maxLength={6}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={pinForm.oldPin}
                                        onChange={e => setPinForm({ ...pinForm, oldPin: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">New PIN (6+ Digits)</label>
                                    <input
                                        type="password"
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={pinForm.newPin}
                                        onChange={e => setPinForm({ ...pinForm, newPin: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Confirm New PIN</label>
                                    <input
                                        type="password"
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={pinForm.confirmPin}
                                        onChange={e => setPinForm({ ...pinForm, confirmPin: e.target.value })}
                                        required
                                    />
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
                                            <input
                                                type={field.type}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                value={field.value}
                                                onChange={e => field.onChange(e.target.value)}
                                                required
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex justify-center items-center gap-2"
                            >
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
                                        <p className="text-green-400 text-sm max-w-xs mx-auto font-semibold uppercase tracking-widest">
                                            Status: Protocol Hardware Bound
                                        </p>
                                        <div className="flex flex-col gap-3 max-w-xs mx-auto">
                                            <button onClick={handleEnrollBiometric} disabled={loading} className="w-full bg-white/10 border border-white/20 text-white font-bold py-3 rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2">
                                                <Loader2 className={`w-4 h-4 animate-spin ${loading ? 'block' : 'hidden'}`} />
                                                Update Biometrics
                                            </button>
                                            <button onClick={handleRevokeBiometric} disabled={loading} className="w-full bg-red-500/10 border border-red-500/20 text-red-500 font-bold py-3 rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2">
                                                <Loader2 className={`w-4 h-4 animate-spin ${loading ? 'block' : 'hidden'}`} />
                                                Revoke Access
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-gray-400 text-sm max-w-xs mx-auto">
                                            Secure your session with hardware-level biometric authentication. Enrollment requires platform support.
                                        </p>
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
                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30 uppercase tracking-widest whitespace-nowrap">
                                    {devices.length}/17 Protocol Assets
                                </span>
                            </div>
                            <div className="space-y-3">
                                {devices.map((dev) => (
                                    <div key={dev.id} className="flex items-start sm:items-center justify-between p-4 bg-black/40 border border-white/5 rounded-xl hover:border-white/20 transition-all group gap-3">
                                        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                                            <div className="p-2 bg-white/5 rounded-lg shrink-0">
                                                <Smartphone className="w-5 h-5 text-gray-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold flex flex-wrap items-center gap-2">
                                                    <span className="truncate">{dev.device_identifier.slice(0, 12)}...</span>
                                                    {dev.public_key && (
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[9px] text-green-400 uppercase tracking-wider font-bold whitespace-nowrap">
                                                            <Fingerprint className="w-2.5 h-2.5" />
                                                            Verified
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-gray-500 uppercase mt-1">{dev.os_type} — ID: {dev.id.slice(0, 8)}</div>
                                                {dev.credential_id && (
                                                    <div className="text-[9px] text-nova-text/30 font-mono">CRED: {dev.credential_id.slice(0, 16)}...</div>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveDevice(dev.id)}
                                            className="p-2 text-gray-500 hover:text-red-400 transition-colors shrink-0"
                                        >
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
