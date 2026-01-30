'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { LogOut, User, Settings, LayoutDashboard, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
      }
      setLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200">
      {/* Sidebar - Simple version */}
      <nav className="fixed top-0 left-0 w-full bg-slate-900/50 backdrop-blur-md border-b border-white/5 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <LayoutDashboard className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-white tracking-tight">Supabase App</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{user.email}</p>
              <p className="text-xs text-slate-400">Usuario activo</p>
            </div>
            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-white/10">
              <User className="text-slate-400 w-6 h-6" />
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors text-slate-400"
            title="Cerrar Sesión"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </nav>

      <main className="pt-24 px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Welcome Card */}
          <div className="md:col-span-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <h2 className="text-4xl font-bold text-white mb-2">¡Hola, {user.email?.split('@')[0]}!</h2>
              <p className="text-blue-100 text-lg">Bienvenido de nuevo a tu panel de control.</p>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
          </div>

          {/* Quick Stats */}
          <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl hover:border-blue-500/50 transition-all group">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-all">
              <Settings className="text-blue-400 w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Configuración</h3>
            <p className="text-slate-400 text-sm">Gestiona la configuración de tu cuenta y preferencias.</p>
          </div>

          <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl hover:border-purple-500/50 transition-all group">
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-all">
              <User className="text-purple-400 w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Perfil</h3>
            <p className="text-slate-400 text-sm">Actualiza tu información personal y foto de perfil.</p>
          </div>

          <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl hover:border-green-500/50 transition-all group">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-all">
              <LayoutDashboard className="text-green-400 w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Actividad</h3>
            <p className="text-slate-400 text-sm">Revisa tu historial reciente y logs del sistema.</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
