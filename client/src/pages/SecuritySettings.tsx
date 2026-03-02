import React, { useState, useEffect } from 'react';
import {
    Shield,
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
        if (activeTab === 'devices') fetchDevices();
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
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Enrollment failed.' });
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
        <div className="security-settings p-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                    <Shield className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Security Protocol
                    </h1>
                    <p className="text-gray-400 text-sm">Manage access keys and authorized hardware</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Tabs */}
                <div className="space-y-2">
                    <button
                        onClick={() => setActiveTab('pin')}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${activeTab === 'pin' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}
                    >
                        <Key className="w-5 h-5" />
                        <span>PIN Management</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('biometric')}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${activeTab === 'biometric' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}
                    >
                        <Fingerprint className="w-5 h-5" />
                        <span>Biometrics</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('devices')}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${activeTab === 'devices' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}
                    >
                        <Smartphone className="w-5 h-5" />
                        <span>Authorized Hardware</span>
                    </button>
                </div>

                {/* Content Area */}
                <div className="md:col-span-3 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                    {message && (
                        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in zoom-in-95 duration-300 ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                            <span className="text-sm font-medium">{message.text}</span>
                        </div>
                    )}

                    {activeTab === 'pin' && (
                        <form onSubmit={handleChangePin} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
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
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <h3 className="text-sm font-semibold text-blue-400 mb-2">Security Verification</h3>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-500">Q1: Favorite Food</label>
                                        <input
                                            type="text"
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none"
                                            value={pinForm.q1}
                                            onChange={e => setPinForm({ ...pinForm, q1: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-500">Q2: Inspiration</label>
                                        <input
                                            type="text"
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none"
                                            value={pinForm.q2}
                                            onChange={e => setPinForm({ ...pinForm, q2: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-500">Q3: DOB Date - Month Math</label>
                                        <input
                                            type="number"
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none"
                                            value={pinForm.q3}
                                            onChange={e => setPinForm({ ...pinForm, q3: parseInt(e.target.value) || 0 })}
                                            required
                                        />
                                    </div>
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
                                <p className="text-gray-400 text-sm max-w-xs mx-auto">
                                    Secure your session with hardware-level biometric authentication. Enrollment requires platform support.
                                </p>
                            </div>
                            <button
                                onClick={handleEnrollBiometric}
                                disabled={loading}
                                className="inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-3 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50 shadow-xl"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
                                <span>Enroll Fingerprint</span>
                            </button>
                        </div>
                    )}

                    {activeTab === 'devices' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Linked Assets</h3>
                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full border border-blue-500/30">
                                    {devices.length}/10 LIMIT
                                </span>
                            </div>
                            <div className="space-y-3">
                                {devices.map((dev) => (
                                    <div key={dev.id} className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-xl hover:border-white/20 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-white/5 rounded-lg">
                                                <Smartphone className="w-5 h-5 text-gray-400" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold flex items-center gap-2">
                                                    {dev.device_identifier.slice(0, 8)}...
                                                    {dev.public_key && <Fingerprint className="w-3 h-3 text-green-400" />}
                                                </div>
                                                <div className="text-[10px] text-gray-500 uppercase">{dev.os_type} — ID: {dev.id.slice(0, 4)}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveDevice(dev.id)}
                                            className="p-2 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
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
