'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  User,
  Settings,
  LayoutDashboard,
  Loader2,
  Bell,
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
  LogOut as LogOutIcon
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const [user, setUser] = useState<any>(null);
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-brand animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const menuItems = [
    { title: 'Solicitar servicio', icon: Wrench },
    { title: 'Servicios Abiertos', icon: ClipboardList },
    { title: 'Buscar servicio cerrado', icon: Search },
    { title: 'Aprobaciones', icon: ClipboardCheck },
    { title: 'Mi agenda', icon: Calendar },
    { title: 'Administración', icon: ShieldCheck },
    { title: 'Historial de servicios', icon: Activity },
    { title: 'Ayuda', icon: HelpCircle },
    { title: 'Exhibiciones', icon: LayoutDashboard },
    { title: 'Base de datos', icon: Database },
    { title: 'Inventario Almacenes', icon: Warehouse },
    { title: 'Agenda Tecnicos', icon: BookOpen },
    { title: 'BI', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">
      {/* Header matching Flutter layout */}
      <header className="fixed top-0 left-0 w-full bg-brand text-white shadow-md z-50 h-16 flex items-center px-6 justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {/* Logo placeholder - using text as per prompt logic if image not found */}
            <span className="font-bold text-xl tracking-tight uppercase">FIRPLAK</span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[10px] italic opacity-80">V 3.6</span>
          <span className="text-sm font-medium">Hora: {currentTime}</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors relative">
            <Bell className="w-6 h-6 text-slate-300" />
            <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-brand"></div>
          </button>
          <button
            onClick={handleSignOut}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <LogOutIcon className="w-5 h-5 text-slate-300" />
          </button>
        </div>
      </header>

      <main className="pt-20 pb-10 px-6 max-w-5xl mx-auto">
        {/* User Profile Section */}
        <section className="py-8 border-b border-slate-100 mb-10">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center border-4 border-slate-50 relative overflow-hidden group">
              <User className="w-12 h-12 text-slate-400 group-hover:scale-110 transition-transform" />
              {/* Optional: Add profile image if available */}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-brand mb-1 leading-tight">¡Bienvenido!</h2>
              <p className="text-lg font-semibold text-slate-700">{user.email?.split('@')[0]}</p>
              <p className="text-sm text-slate-500 leading-none mb-1">{user.email}</p>
              <div className="inline-block px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-brand uppercase tracking-wider">
                USUARIO
              </div>
            </div>
          </div>
        </section>

        {/* Action Grid (Excluding the status cards as per user instruction) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
        >
          {menuItems.map((item, index) => (
            <motion.button
              key={item.title}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-brand/30 transition-all aspect-square group"
            >
              <div className="mb-4 text-brand group-hover:scale-110 transition-transform">
                <item.icon className="w-10 h-10" strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium text-slate-600 text-center uppercase tracking-tight leading-tight">
                {item.title}
              </span>
            </motion.button>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
