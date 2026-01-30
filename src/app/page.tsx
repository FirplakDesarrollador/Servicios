'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  User,
  Wrench,
  ClipboardList,
  Search,
  ClipboardCheck,
  Calendar,
  ShieldCheck,
  Activity,
  HelpCircle,
  Database,
  Warehouse,
  BookOpen,
  BarChart3,
  LogOut as LogOutIcon,
  Bell,
  Loader2,
  ChevronRight,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        const { data: userData, error } = await supabase
          .from('Usuarios')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (!error && userData) {
          setProfile(userData);
        }
      }
      setLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        const { data: userData } = await supabase
          .from('Usuarios')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        if (userData) setProfile(userData);
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Loader2 className="w-12 h-12 text-brand" />
        </motion.div>
      </div>
    );
  }

  if (!user) return null;

  const fullName = profile?.nombres && profile?.apellidos
    ? `${profile.nombres} ${profile.apellidos}`
    : profile?.display_name || user.email?.split('@')[0];

  const userRole = profile?.rol || 'USUARIO';
  const userPhoto = profile?.url_foto || null;
  const defaultPhoto = 'https://lnphhmowklqiomownurw.supabase.co/storage/v1/object/public/publico/fotos/withoutphoto.png';

  const menuItems = [
    { title: 'Solicitar servicio', icon: Wrench, color: 'bg-emerald-50 text-emerald-600' },
    { title: 'Servicios Abiertos', icon: ClipboardList, color: 'bg-blue-50 text-blue-600' },
    { title: 'Buscar servicio cerrado', icon: Search, color: 'bg-slate-50 text-slate-600' },
    { title: 'Aprobaciones', icon: ClipboardCheck, color: 'bg-amber-50 text-amber-600' },
    { title: 'Mi agenda', icon: Calendar, color: 'bg-indigo-50 text-indigo-600' },
    { title: 'Administración', icon: ShieldCheck, color: 'bg-red-50 text-red-600' },
    { title: 'Historial de servicios', icon: Activity, color: 'bg-rose-50 text-rose-600' },
    { title: 'Ayuda', icon: HelpCircle, color: 'bg-cyan-50 text-cyan-600' },
    { title: 'Exhibiciones', icon: LayoutDashboard, color: 'bg-violet-50 text-violet-600' },
    { title: 'Base de datos', icon: Database, color: 'bg-orange-50 text-orange-600' },
    { title: 'Inventario Almacenes', icon: Warehouse, color: 'bg-teal-50 text-teal-600' },
    { title: 'Agenda Tecnicos', icon: BookOpen, color: 'bg-lime-50 text-lime-600' },
    { title: 'BI', icon: BarChart3, color: 'bg-fuchsia-50 text-fuchsia-600' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-brand/10 selection:text-brand">
      {/* Background Ornaments */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 w-full glass z-50 h-20 flex items-center px-8 justify-between border-b border-white/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand/20">
            <span className="text-white font-black text-xl">F</span>
          </div>
          <span className="font-black text-2xl tracking-tighter text-brand uppercase">FIRPLAK</span>
        </div>

        <div className="hidden md:flex flex-col items-center">
          <span className="text-[10px] font-bold text-brand/40 tracking-widest uppercase">Version 3.6</span>
          <span className="text-base font-bold text-brand tabular-nums">{currentTime}</span>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative w-11 h-11 flex items-center justify-center rounded-2xl hover:bg-white/50 transition-all group">
            <Bell className="w-6 h-6 text-slate-600 group-hover:text-brand transition-colors" />
            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <div className="h-8 w-px bg-slate-200 mx-1"></div>
          <button
            onClick={handleSignOut}
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-brand/5 hover:bg-brand text-brand hover:text-white transition-all group shadow-sm"
          >
            <LogOutIcon className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        </div>
      </header>

      <main className="relative pt-28 pb-20 px-6 max-w-7xl mx-auto z-10">
        {/* Welcome Block */}
        <section className="mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col md:flex-row items-center md:items-end gap-6 bg-white p-8 rounded-[2rem] premium-shadow border border-white/60 relative overflow-hidden"
          >
            {/* Absolute accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-bl-[4rem]" />

            <div className="relative">
              <div className="w-28 h-28 bg-slate-100 rounded-3xl flex items-center justify-center border-4 border-white shadow-xl overflow-hidden group">
                <img
                  src={userPhoto || defaultPhoto}
                  alt={fullName}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e: any) => { e.target.src = defaultPhoto; }}
                />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-brand rounded-xl border-4 border-white flex items-center justify-center flex-col scale-110">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-black text-brand tracking-tight mb-2">
                ¡Hola, {profile?.nombres || fullName.split(' ')[0]}!
              </h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <span className="text-lg font-medium text-slate-500">{user.email}</span>
                <span className="px-3 py-1 bg-brand text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
                  {userRole}
                </span>
              </div>
            </div>

            <div className="hidden lg:block h-20 w-px bg-slate-100 mx-4" />

            <div className="hidden lg:grid grid-cols-2 gap-8 pr-4">
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Empresa</p>
                <p className="font-bold text-brand">FIRPLAK S.A.</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estado</p>
                <p className="font-bold text-emerald-500 flex items-center gap-1 justify-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Activo
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Action Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-5"
        >
          {menuItems.map((item, index) => (
            <motion.button
              key={item.title}
              variants={itemVariants}
              whileHover={{
                y: -8,
                transition: { duration: 0.2, ease: "easeOut" }
              }}
              whileTap={{ scale: 0.95 }}
              className="group flex flex-col items-center justify-center p-8 bg-white border border-white rounded-[2.5rem] premium-shadow hover:shadow-2xl hover:shadow-brand/10 transition-all aspect-square relative overflow-hidden"
            >
              {/* Card Background Decoration */}
              <div className={`absolute top-0 right-0 w-16 h-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-bl-[2rem] ${item.color.split(' ')[0]}`} />

              <div className={`mb-5 p-4 rounded-[1.5rem] transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg ${item.color}`}>
                <item.icon className="w-10 h-10" strokeWidth={2} />
              </div>

              <span className="text-xs font-black text-slate-700 text-center uppercase tracking-tight leading-tight px-2 group-hover:text-brand transition-colors">
                {item.title}
              </span>

              <div className="absolute bottom-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <ChevronRight className="w-4 h-4 text-brand" />
              </div>
            </motion.button>
          ))}
        </motion.div>
      </main>

      {/* Footer Footer */}
      <footer className="fixed bottom-0 left-0 w-full glass h-10 flex items-center justify-center px-8 border-t border-white/20 z-50">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          &copy; 2026 Firplak. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
