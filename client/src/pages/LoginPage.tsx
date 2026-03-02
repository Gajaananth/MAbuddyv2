import React, { useState } from 'react';
import { Bird, Fingerprint, HelpCircle, ChevronLeft } from 'lucide-react';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { startAuthentication } from '@simplewebauthn/browser';

const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isForgotMode, setIsForgotMode] = useState(false);

    // Forgot PIN State
    const [forgotData, setForgotData] = useState({
        dob: '',
        q1: '',
        q2: '',
        q3: 0,
        newPin: ''
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

    const handleLogin = async (finalPin: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await authService.login(finalPin);
            login(data.token, data.user);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Authentication denied.');
            setPin('');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotReset = async () => {
        setLoading(true);
        setError(null);
        try {
            await authService.forgotPin(forgotData);
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
            login(data.token, data.user);
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Biometric verification failed.');
        } finally {
            setLoading(false);
        }
    };

    // Keyboard support for PIN entry
    React.useEffect(() => {
        if (isForgotMode) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (loading) return;

            // Numeric keys
            if (/^[0-9]$/.test(e.key)) {
                handlePinInput(e.key);
            }
            // Backspace
            else if (e.key === 'Backspace') {
                setPin(prev => prev.slice(0, -1));
            }
            // Escape to clear
            else if (e.key === 'Escape') {
                setPin('');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pin, loading, isForgotMode]);

    if (isForgotMode) {
        return (
            <div className="min-h-screen bg-nova-bg flex items-center justify-center p-6 relative font-inter text-white">
                <div className="w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-[40px] backdrop-blur-xl shadow-2xl relative z-10">
                    <button onClick={() => setIsForgotMode(false)} className="flex items-center gap-2 text-nova-text-dim hover:text-white transition-colors mb-6 text-sm font-bold uppercase tracking-widest">
                        <ChevronLeft size={16} /> Back to Entry
                    </button>
                    <h2 className="text-2xl font-black uppercase tracking-tight mb-8">Protocol Recovery</h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-nova-text-dim uppercase tracking-[2px] mb-2 ml-2">Birth Cycle (DOB)</label>
                            <input type="date" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white"
                                value={forgotData.dob} onChange={e => setForgotData({ ...forgotData, dob: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-nova-text-dim uppercase tracking-[2px] mb-2 ml-2">Q1: Food</label>
                                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white"
                                    value={forgotData.q1} onChange={e => setForgotData({ ...forgotData, q1: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-nova-text-dim uppercase tracking-[2px] mb-2 ml-2">Q2: Inspiration</label>
                                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white"
                                    value={forgotData.q2} onChange={e => setForgotData({ ...forgotData, q2: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-nova-text-dim uppercase tracking-[2px] mb-2 ml-2">Q3: DOB Date - Month</label>
                            <input type="number" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white"
                                value={forgotData.q3 || ''} onChange={e => setForgotData({ ...forgotData, q3: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-nova-text-dim uppercase tracking-[2px] mb-2 ml-2">Select New Protocol PIN</label>
                            <input type="password" maxLength={6} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white"
                                value={forgotData.newPin} onChange={e => setForgotData({ ...forgotData, newPin: e.target.value })} />
                        </div>
                        {error && <p className="text-red-400 text-xs font-bold bg-red-500/10 p-3 rounded-xl">{error}</p>}
                        <button onClick={handleForgotReset} disabled={loading} className="w-full bg-red-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest shadow-xl shadow-red-500/20">
                            {loading ? 'Verifying...' : 'Restore Access'}
                        </button>
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

                <div className="space-y-8 text-center">
                    {/* PIN Display */}
                    <div className="flex justify-center gap-3 mb-10">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${pin.length > i ? 'bg-red-500 border-red-500 scale-125 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'border-white/20 bg-white/5'}`}></div>
                        ))}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-black uppercase tracking-widest mb-6 animate-shake">
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
                            <HelpCircle size={14} /> Forgot PIN?
                        </button>
                        <Link to="/register" className="text-[10px] font-black text-red-500 uppercase tracking-[2px] hover:text-red-400 transition-colors">
                            First Enrollment
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
