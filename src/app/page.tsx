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
} from 'lucide-react';
import { motion } from 'framer-motion';

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
    // Row 1
    { title: 'Solicitar servicio', icon: Briefcase },
    { title: 'Servicios Abiertos', icon: ClipboardList },
    { title: 'Buscar servicio cerrado', icon: Search },
    { title: 'Aprobaciones', icon: ClipboardCheck },
    { title: 'Mi agenda', icon: Calendar },
    { title: 'Administración', icon: ShieldAlert },
    { title: 'Historial de servicios', icon: History },
    // Row 2
    { title: 'Ayuda', icon: HelpCircle },
    { title: 'Exhibiciones', icon: ChefHat },
    { title: 'Base de datos', icon: Database },
    { title: 'Inventario Almacenes', icon: Warehouse },
    { title: 'Agenda Tecnicos', icon: BookOpen },
    { title: 'BI', icon: BarChart3 },
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
      {/* Dark Header matching image but more beautiful */}
      <header className="fixed top-0 left-0 w-full bg-brand text-white z-50 h-16 flex items-center px-4 md:px-8 justify-between shadow-2xl shadow-brand/20">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="font-black text-xl tracking-tight leading-none">FIRPLAK</span>
            <span className="text-[8px] italic opacity-60 font-medium tracking-wider">Inspirando hogares</span>
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-center">
          <span className="text-[10px] font-bold text-white/40 tracking-widest uppercase italic">V 3.6</span>
          <span className="text-sm font-bold text-white tabular-nums tracking-wide">Hora: {currentTime}</span>
        </div>

        <div className="flex items-center gap-2">
          <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white text-white hover:text-brand transition-all group shadow-sm">
            <BellPlus className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white text-white hover:text-brand transition-all group shadow-sm">
            <Bell className="w-5 h-5" />
          </button>
          <button
            onClick={handleSignOut}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-red-500 text-white transition-all group shadow-sm"
          >
            <LogOutIcon className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        </div>
      </header>

      <main className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
        {/* Centered Profile Section */}
        <section className="mb-14 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mb-6"
          >
            <div className="w-32 h-32 md:w-36 md:h-36 bg-slate-100/50 rounded-full flex items-center justify-center border-[6px] border-white shadow-2xl overflow-hidden group">
              <img
                src={userPhoto || defaultPhoto}
                alt={fullName}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                onError={(e: any) => { e.target.src = defaultPhoto; }}
              />
            </div>
            {/* Elegant online indicator */}
            <div className="absolute bottom-2 right-2 w-7 h-7 bg-emerald-500 rounded-full border-4 border-white shadow-lg animate-pulse" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-3xl md:text-4xl font-black text-brand tracking-tight mb-2 uppercase">¡Bienvenido!</h1>
            <p className="text-xl md:text-2xl font-bold text-slate-700 mb-1">{fullName}</p>
            <p className="text-sm font-medium text-slate-400 mb-3">{user.email}</p>
            <div className="inline-block px-4 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-[10px] font-black text-brand uppercase tracking-[0.2em] shadow-sm">
              {userRole}
            </div>
          </motion.div>
        </section>

        {/* Action Grid matching two-row structure from image */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* First Row: 7 items */}
          <div className="flex flex-wrap justify-center gap-4">
            {menuItems.slice(0, 7).map((item, index) => (
              <motion.button
                key={item.title}
                variants={itemVariants}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex flex-col items-center justify-center w-[calc(50%-8px)] sm:w-40 md:w-44 h-40 md:h-44 bg-white border border-slate-100 rounded-[2rem] premium-shadow hover:shadow-2xl hover:shadow-brand/10 transition-all group overflow-hidden"
              >
                <div className="mb-4 text-brand group-hover:scale-110 transition-transform duration-300">
                  <item.icon className="w-10 h-10 md:w-12 md:h-12" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-black text-slate-600 text-center uppercase tracking-tight leading-tight px-4 group-hover:text-brand transition-colors">
                  {item.title}
                </span>

                {/* Subtle highlight effect */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-brand/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </div>

          {/* Second Row: 6 items */}
          <div className="flex flex-wrap justify-center gap-4">
            {menuItems.slice(7).map((item, index) => (
              <motion.button
                key={item.title}
                variants={itemVariants}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex flex-col items-center justify-center w-[calc(50%-8px)] sm:w-40 md:w-44 h-40 md:h-44 bg-white border border-slate-100 rounded-[2rem] premium-shadow hover:shadow-2xl hover:shadow-brand/10 transition-all group overflow-hidden"
              >
                <div className="mb-4 text-brand group-hover:scale-110 transition-transform duration-300">
                  <item.icon className="w-10 h-10 md:w-12 md:h-12" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-black text-slate-600 text-center uppercase tracking-tight leading-tight px-4 group-hover:text-brand transition-colors">
                  {item.title}
                </span>

                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-brand/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Modern Footer */}
      <footer className="mt-auto py-8 text-center border-t border-slate-100 bg-white">
        <div className="flex justify-center items-center gap-4 mb-3">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-brand/20">F</div>
          <p className="text-xs font-black text-brand tracking-[0.2em] uppercase">FIRPLAK S.A.</p>
        </div>
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.3em]">
          &copy; 2026 Reservados todos los derechos.
        </p>
      </footer>
    </div>
  );
}
