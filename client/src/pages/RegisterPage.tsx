import React, { useState } from 'react';
import { Bird, Calculator, ArrowRight, UserPlus, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        dob: '',
        pin: '',
        q1: '',
        q2: '',
        q3: 0
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'q3' ? parseInt(value) : value }));
    };

    const handleRegister = async () => {
        setLoading(true);
        setError(null);
        try {
            await authService.register(formData);
            navigate('/login');
        } catch (err: any) {
            const serverError = err.response?.data?.error;
            setError(serverError || `Connection Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-nova-bg flex items-center justify-center p-6 relative overflow-hidden font-inter">
            {/* Background Aesthetics */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-red-500 rounded-full blur-[160px]"></div>
                <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-nova-accent rounded-full blur-[160px]"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-6 shadow-2xl">
                        <Bird size={44} />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Protocol Enrollment</h1>
                    <p className="text-nova-text-dim font-bold text-sm tracking-widest uppercase">Silent Beast Domain Entrance</p>
                </div>

                <div className="bg-white/5 border border-white/10 p-8 rounded-[40px] backdrop-blur-xl shadow-2xl">
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold animate-shake">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        {step === 1 && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <label className="block text-[10px] font-black text-nova-text-dim uppercase tracking-[2px] mb-3 ml-2">Identify Birth Cycle (DOB)</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            name="dob"
                                            value={formData.dob}
                                            onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium focus:ring-2 focus:ring-red-500/50 outline-none transition-all placeholder:text-white/20"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-nova-text-dim uppercase tracking-[2px] mb-3 ml-2">Establish 6-Digit Protocol PIN</label>
                                    <div className="relative">
                                        <Bird className="absolute left-4 top-1/2 -translate-y-1/2 text-nova-text-dim" size={18} />
                                        <input
                                            type="password"
                                            name="pin"
                                            maxLength={6}
                                            placeholder="••••••"
                                            value={formData.pin}
                                            onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-white font-medium focus:ring-2 focus:ring-red-500/50 outline-none transition-all placeholder:text-white/20"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => setStep(2)}
                                    disabled={!formData.dob || formData.pin.length < 6}
                                    className="w-full bg-red-500 text-white font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 flex items-center justify-center gap-2 group disabled:opacity-50"
                                >
                                    Proceed to Questions <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <label className="block text-[10px] font-black text-nova-text-dim uppercase tracking-[2px] mb-3 ml-2">Security Q1: Favourite Food (lowercase)</label>
                                    <input
                                        type="text"
                                        name="q1"
                                        placeholder="e.g. kottu"
                                        value={formData.q1}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium focus:ring-2 focus:ring-red-500/50 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-nova-text-dim uppercase tracking-[2px] mb-3 ml-2">Security Q2: Inspiration (Single word)</label>
                                    <input
                                        type="text"
                                        name="q2"
                                        placeholder="One word, no spaces"
                                        value={formData.q2}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium focus:ring-2 focus:ring-red-500/50 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-nova-text-dim uppercase tracking-[2px] mb-3 ml-2">Security Q3: (DOB Date - DOB Month)</label>
                                    <div className="relative">
                                        <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 text-nova-text-dim" size={18} />
                                        <input
                                            type="number"
                                            name="q3"
                                            placeholder="Integer result"
                                            value={formData.q3}
                                            onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-white font-medium focus:ring-2 focus:ring-red-500/50 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="flex-1 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-white/10 transition-all"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleRegister}
                                        disabled={loading || !formData.q1 || !formData.q2}
                                        className="flex-[2] bg-red-500 text-white font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 flex items-center justify-center gap-2 group disabled:opacity-50"
                                    >
                                        {loading ? 'Submitting...' : 'Finalize Profile'} <UserPlus size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <p className="mt-8 text-center text-nova-text-dim text-[10px] font-bold uppercase tracking-widest">
                    Authorized Access Only — All activity is logged via Protocol 2.1
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;
