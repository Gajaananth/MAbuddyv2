import React, { useState } from 'react';
import { Bird, Fingerprint, HelpCircle, ChevronLeft } from 'lucide-react';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { startAuthentication } from '@simplewebauthn/browser';

const LoginPage: React.FC = () => {
    const { login: setAuth } = useAuth();
    const navigate = useNavigate();
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isForgotMode, setIsForgotMode] = useState(false);
    const [isEnrollMode, setIsEnrollMode] = useState(false);

    // Identity Data for Enrollment/Forgot
    const [identityData, setIdentityData] = useState({
        dob: '',
        q1: '',
        q2: '',
        q3: 0,
        newPin: '' // used for forgot
    });

    const handlePinInput = (digit: string) => {
        if (pin.length < 6) {
            const newPin = pin + digit;
            setPin(newPin);
            if (newPin.length === 6) {
                handleLogin(newPin);
            }
        }
    };

    const handleLogin = async (finalPin: string, identity?: any) => {
        setLoading(true);
        setError(null);
        try {
            const data = await authService.login(finalPin, identity);
            setAuth(data.token, data.user);
            navigate('/');
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Authentication denied.';
            if (msg.includes('DEVICE_UNRECOGNIZED')) {
                setError('NEW DEVICE DETECTED: Identify yourself to establish binding.');
                setIsEnrollMode(true);
            } else {
                setError(msg);
                setPin('');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleIdentitySubmit = () => {
        if (!identityData.dob || !identityData.q1 || !identityData.q2) {
            setError('All identity fields are mandatory.');
            return;
        }
        handleLogin(pin, identityData);
    };

    const handleForgotReset = async () => {
        setLoading(true);
        setError(null);
        try {
            await authService.forgotPin(identityData);
            setIsForgotMode(false);
            setError(null);
            alert('PIN reset successful. Authenticate with new PIN.');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleBiometric = async () => {
        setLoading(true);
        setError(null);
        try {
            const options = await authService.getBiometricOptions();
            const asseRes = await startAuthentication({ optionsJSON: options });

            const data = await authService.loginBiometric(asseRes, options.challenge);
            setAuth(data.token, data.user);
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Biometric verification failed.');
        } finally {
            setLoading(false);
        }
    };

    // Keyboard support
    React.useEffect(() => {
        if (isForgotMode || isEnrollMode) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (loading) return;
            if (/^[0-9]$/.test(e.key)) handlePinInput(e.key);
            else if (e.key === 'Backspace') setPin(prev => prev.slice(0, -1));
            else if (e.key === 'Escape') setPin('');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pin, loading, isForgotMode, isEnrollMode]);

    if (isForgotMode || isEnrollMode) {
        return (
            <div className="min-h-screen bg-nova-bg flex items-center justify-center p-6 relative font-inter text-white">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500 rounded-full blur-[150px]"></div>
                </div>

                <div className="w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-[40px] backdrop-blur-xl shadow-2xl relative z-10 transition-all">
                    <button onClick={() => { setIsForgotMode(false); setIsEnrollMode(false); setError(null); }} className="flex items-center gap-2 text-nova-text-dim hover:text-white transition-colors mb-6 text-sm font-bold uppercase tracking-widest">
                        <ChevronLeft size={16} /> Back to Entry
                    </button>
                    <h2 className="text-2xl font-black uppercase tracking-tight mb-2">
                        {isForgotMode ? 'Protocol Recovery' : 'Identify Operator'}
                    </h2>
                    <p className="text-nova-text-dim text-[10px] uppercase font-black tracking-widest mb-8">
                        {isForgotMode ? 'Verify identity to reset protocol PIN' : 'Unrecognized hardware. Establish identity to bind.'}
                    </p>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-nova-text-dim uppercase tracking-[2px] mb-2 ml-2">Birth Cycle (DOB)</label>
                            <input type="date" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:ring-2 focus:ring-red-500/50"
                                value={identityData.dob} onChange={e => setIdentityData({ ...identityData, dob: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-nova-text-dim uppercase tracking-[2px] mb-2 ml-2">Q1: Food</label>
                                <input type="text" placeholder="lower-case" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:ring-2 focus:ring-red-500/50"
                                    value={identityData.q1} onChange={e => setIdentityData({ ...identityData, q1: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-nova-text-dim uppercase tracking-[2px] mb-2 ml-2">Q2: Inspiration</label>
                                <input type="text" placeholder="one-word" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:ring-2 focus:ring-red-500/50"
                                    value={identityData.q2} onChange={e => setIdentityData({ ...identityData, q2: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-nova-text-dim uppercase tracking-[2px] mb-2 ml-2">Q3: DOB Date - Month</label>
                            <input type="number" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:ring-2 focus:ring-red-500/50"
                                placeholder="Positive or negative integer"
                                value={identityData.q3 || ''} onChange={e => setIdentityData({ ...identityData, q3: parseInt(e.target.value) || 0 })} />
                        </div>

                        {isForgotMode && (
                            <div>
                                <label className="block text-[10px] font-black text-nova-text-dim uppercase tracking-[2px] mb-2 ml-2">Select New Protocol PIN</label>
                                <input type="password" maxLength={6} placeholder="••••••" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:ring-2 focus:ring-red-500/50"
                                    value={identityData.newPin} onChange={e => setIdentityData({ ...identityData, newPin: e.target.value })} />
                            </div>
                        )}

                        {error && <p className="text-red-400 text-[10px] font-black uppercase tracking-widest bg-red-500/10 p-4 rounded-2xl border border-red-500/20">{error}</p>}

                        <div className="space-y-4">
                            <button onClick={isForgotMode ? handleForgotReset : handleIdentitySubmit} disabled={loading}
                                className="w-full bg-red-500 text-white font-black py-5 rounded-2xl uppercase tracking-widest shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all flex items-center justify-center gap-2">
                                {loading ? 'Verifying...' : (isForgotMode ? 'Restore Access' : 'Establish Binding')}
                            </button>

                            {isEnrollMode && (
                                <p className="text-center text-[10px] font-black text-nova-text-dim uppercase tracking-widest">
                                    Not enrolled? <Link to="/register" className="text-red-500 hover:text-red-400 transition-colors">Register here</Link>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-nova-bg flex items-center justify-center p-6 relative overflow-hidden font-inter">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-500 rounded-full blur-[200px]"></div>
            </div>

            <div className="w-full max-w-sm relative z-10">
                <div className="text-center mb-12">
                    <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6 shadow-2xl">
                        <Bird size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Protocol Entry</h1>
                    <p className="text-nova-text-dim font-bold text-xs tracking-widest uppercase">Verified Access Mandatory</p>
                </div>

                <div className="space-y-8 text-center bg-white/[0.02] border border-white/5 p-8 rounded-[40px] backdrop-blur-md">
                    {/* PIN Display */}
                    <div className="flex justify-center gap-3 mb-10">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${pin.length > i ? 'bg-red-500 border-red-500 scale-125 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'border-white/20 bg-white/5'}`}></div>
                        ))}
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-black uppercase tracking-widest mb-6 animate-shake">
                            {error}
                        </div>
                    )}

                    {/* Numeric Keypad */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                            <button key={num} onClick={() => handlePinInput(num)} disabled={loading}
                                className="w-full aspect-square bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-2xl font-black text-white hover:bg-white/10 active:scale-95 transition-all outline-none">
                                {num}
                            </button>
                        ))}
                        <button onClick={handleBiometric} className="w-full aspect-square bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-red-400 hover:bg-white/10 transition-all outline-none">
                            <Fingerprint size={32} />
                        </button>
                        <button onClick={() => handlePinInput('0')} className="w-full aspect-square bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-2xl font-black text-white hover:bg-white/10 transition-all outline-none">
                            0
                        </button>
                        <button onClick={() => setPin('')} className="w-full aspect-square bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-nova-text-dim text-[10px] font-black uppercase tracking-widest hover:text-white transition-all outline-none">
                            Clear
                        </button>
                    </div>

                    <div className="flex justify-between items-center px-4">
                        <button onClick={() => setIsForgotMode(true)} className="text-[10px] font-black text-nova-text-dim uppercase tracking-[2px] hover:text-white transition-colors flex items-center gap-1">
                            <HelpCircle size={14} /> Recovery
                        </button>
                        <Link to="/register" className="text-[10px] font-black text-red-500 uppercase tracking-[2px] hover:text-red-400 transition-colors">
                            Enrollment
                        </Link>
                    </div>
                </div>

                <p className="mt-12 text-center text-nova-text-dim text-[10px] font-bold uppercase tracking-widest opacity-50">
                    Sovereign Intelligence Protected
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
