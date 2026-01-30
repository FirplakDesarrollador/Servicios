'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  LogOut as LogOutIcon,
  Bell,
  BellPlus,
  Loader2,
  Briefcase,
  ClipboardList,
  Search,
  ClipboardCheck,
  Calendar,
  ShieldAlert,
  History,
  HelpCircle,
  ChefHat,
  Database,
  Warehouse,
  BookOpen,
  BarChart3,
  CheckCircle2
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
    { title: 'Solicitar servicio', icon: Briefcase, color: 'bg-blue-600' },
    { title: 'Servicios Abiertos', icon: ClipboardList, color: 'bg-emerald-500' },
    { title: 'Buscar servicio cerrado', icon: Search, color: 'bg-indigo-500' },
    { title: 'Aprobaciones', icon: ClipboardCheck, color: 'bg-orange-500' },
    { title: 'Mi agenda', icon: Calendar, color: 'bg-pink-600' },
    { title: 'Administración', icon: ShieldAlert, color: 'bg-cyan-600' },
    { title: 'Historial de servicios', icon: History, color: 'bg-indigo-700' },
    { title: 'Ayuda', icon: HelpCircle, color: 'bg-teal-600' },
    { title: 'Exhibiciones', icon: ChefHat, color: 'bg-orange-600' },
    { title: 'Base de datos', icon: Database, color: 'bg-blue-700' },
    { title: 'Inventario Almacenes', icon: Warehouse, color: 'bg-lime-600' },
    { title: 'Agenda Tecnicos', icon: BookOpen, color: 'bg-purple-600' },
    { title: 'BI', icon: BarChart3, color: 'bg-blue-800' },
  ];

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-800 font-sans">
      <header className="fixed top-0 left-0 w-full bg-brand text-white z-50 h-[3.5rem] flex items-center px-6 justify-between shadow-lg">
        <div className="flex flex-col">
          <span className="font-black text-xl tracking-tight leading-none">FIRPLAK</span>
          <span className="text-[7px] italic opacity-60 font-medium tracking-widest">Inspirando hogares</span>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <span className="text-xs font-bold text-white tabular-nums tracking-wide">{currentTime}</span>
        </div>

        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-all shadow-sm">
            <BellPlus className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-all shadow-sm">
            <Bell className="w-4 h-4" />
          </button>
          <button
            onClick={handleSignOut}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-red-500 transition-all shadow-sm"
          >
            <LogOutIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="pt-20 pb-10 px-4 max-w-6xl mx-auto flex flex-col items-center">
        {/* Compact Profile Card */}
        <motion.section
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white mb-10 flex items-center gap-6 relative overflow-hidden"
        >
          {/* Decorative Background Blob */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand/5 rounded-full blur-3xl" />

          <div className="relative group shrink-0">
            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center border-4 border-slate-50 shadow-inner overflow-hidden">
              <img
                src={userPhoto || defaultPhoto}
                alt={fullName}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                onError={(e: any) => { e.target.src = defaultPhoto; }}
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-lg border-2 border-white flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-black text-brand tracking-tighter mb-0.5 leading-none">¡Bienvenido!</h1>
            <p className="text-lg font-bold text-slate-700 leading-tight mb-0.5">{fullName}</p>
            <p className="text-xs font-medium text-slate-400 mb-2">{user.email}</p>
            <span className="inline-block px-4 py-0.5 bg-brand text-white text-[9px] font-black uppercase tracking-[0.15em] rounded-full shadow-md">
              {userRole}
            </span>
          </div>
        </motion.section>

        {/* Compact Action Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3 w-full">
          {menuItems.map((item, index) => (
            <motion.button
              key={item.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              whileHover={{ y: -5, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group flex flex-col items-center p-3 bg-white border border-white rounded-3xl shadow-lg shadow-slate-200/30 hover:shadow-2xl hover:shadow-brand/20 transition-all aspect-[5/6] relative overflow-hidden"
            >
              {/* Decorative Corner Circle */}
              <div className="absolute top-[-20px] right-[-20px] w-16 h-16 bg-slate-50 rounded-full group-hover:bg-brand/5 transition-colors" />

              <div className={`mt-2 mb-3 p-3 rounded-2xl ${item.color} text-white shadow-lg transition-transform group-hover:rotate-6`}>
                <item.icon className="w-6 h-6" strokeWidth={2.5} />
              </div>

              <span className="text-[10px] font-extrabold text-slate-600 text-center uppercase tracking-tight leading-tight px-1 group-hover:text-brand transition-colors relative z-10 h-8 flex items-center">
                {item.title}
              </span>
            </motion.button>
          ))}
        </div>
      </main>

      <footer className="mt-auto py-4 text-center">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
          FIRPLAK S.A. &copy; 2026
        </p>
      </footer>
    </div>
  );
}
