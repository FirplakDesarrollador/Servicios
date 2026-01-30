'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            router.push('/');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 relative overflow-hidden font-sans">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-brand/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-brand/5 rounded-full blur-[150px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-lg bg-white p-12 rounded-[3rem] premium-shadow border border-white/60 relative z-10"
            >
                <div className="flex flex-col items-center mb-12">
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="w-20 h-20 bg-brand rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-brand/30"
                    >
                        <LogIn className="text-white w-10 h-10" strokeWidth={2.5} />
                    </motion.div>
                    <motion.h1
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-5xl font-black text-brand tracking-tighter uppercase mb-2"
                    >
                        FIRPLAK
                    </motion.h1>
                    <p className="text-slate-400 font-bold tracking-widest uppercase text-[10px]">Portal de Servicios</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-8">
                    <div className="space-y-3">
                        <label className="text-xs font-black text-brand uppercase tracking-widest ml-1 opacity-60">Correo Electrónico</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand transition-colors w-5 h-5" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-100 text-brand pl-12 pr-4 py-4 rounded-2xl focus:border-brand focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium"
                                placeholder="tu@email.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-black text-brand uppercase tracking-widest ml-1 opacity-60">Contraseña</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand transition-colors w-5 h-5" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-100 text-brand pl-12 pr-4 py-4 rounded-2xl focus:border-brand focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-red-50 border-2 border-red-100 text-red-600 p-5 rounded-2xl flex items-center gap-4 text-sm font-bold"
                        >
                            <AlertCircle className="w-6 h-6 shrink-0" />
                            <span>{error}</span>
                        </motion.div>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brand hover:bg-brand-dark disabled:bg-brand/50 text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand/20 group uppercase tracking-widest text-sm"
                    >
                        {loading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                Iniciar Sesión
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </motion.button>
                </form>

                <div className="mt-12 text-center">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                        ¿No tienes una cuenta? <span className="text-brand hover:underline cursor-pointer">Soporte IT</span>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
