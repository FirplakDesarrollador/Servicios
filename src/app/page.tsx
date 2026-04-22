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
  History,
  HelpCircle,
  ChefHat,
  Database,
  Warehouse,
  BookOpen,
  BarChart3,
  CheckCircle2,
  Settings,
  Link,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [portalType, setPortalType] = useState<string | null>(null);

  useEffect(() => {
    setPortalType(localStorage.getItem('portalType'));
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      // Security timeout to prevent getting stuck in loading state (5 seconds)
      const timeoutId = setTimeout(() => {
        setLoading(false);
      }, 5000);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session) {
          router.push('/login');
          return;
        }

        setUser(session.user);

        const { data: userData, error: profileError } = await supabase
          .from('Usuarios')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError.message);
        }

        if (userData) {
          setProfile(userData);

          // Grant all permissions to all users
          setPermissions(['Solicitar servicio', 'Servicios Abiertos', 'Buscar servicio cerrado', 'Aprobaciones', 'Mi agenda', 'Historial de servicios', 'Ayuda', 'Exhibiciones', 'Base de datos', 'Inventario Almacenes', 'Agenda Tecnicos', 'BI', 'Configuración']);
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
        // On error, we still need to stop loading so the user isn't stuck
        // They will likely be redirect by the auth listener if session is truly invalid
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        // Only fetch profile if we don't have it yet to avoid redundant loads
        if (!profile) {
          supabase.from('Usuarios')
            .select('*')
            .eq('user_id', session.user.id)
            .single()
            .then(({ data }) => { if (data) setProfile(data); });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, profile]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('portalType');
    router.push('/login');
  };

  const copyFormLink = async () => {
    const formUrl = `${window.location.origin}/formulario-cliente`;
    try {
      await navigator.clipboard.writeText(formUrl);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
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

  const isCliente = portalType === 'cliente';

  // Map of menu item title -> route (portal-aware)
  const routeMap: Record<string, string> = {
    'Solicitar servicio': isCliente ? '/solicitud-pedido-cliente' : '/solicitar-servicio',
    'Servicios Abiertos': isCliente ? '/servicios-abiertos-clientes' : '/servicios-abiertos',
    'Buscar servicio cerrado': isCliente ? '/servicios-cerrados-clientes' : '/servicios-cerrados',
    'Aprobaciones': '/aprobaciones',
    'Mi agenda': '/mi-agenda',
    'Historial de servicios': '/historial-servicios',
    'Ayuda': '/ayuda',
    'Exhibiciones': '/exhibiciones',
    'Base de datos': '/base-de-datos',
    'Inventario Almacenes': '/inventario',
    'Agenda Tecnicos': '/agenda-tecnicos',
    'BI': '/bi',
    'Indicador quejas': '/indicador-quejas',
    'Configuración': '/configuracion',
  };

  const allMenuItems = [
    { title: 'Solicitar servicio', icon: Briefcase, color: 'bg-brand' },
    { title: 'Servicios Abiertos', icon: ClipboardList, color: 'bg-emerald-500' },
    { title: 'Buscar servicio cerrado', icon: Search, color: 'bg-indigo-500' },
    { title: 'Aprobaciones', icon: ClipboardCheck, color: 'bg-orange-500' },
    { title: 'Mi agenda', icon: Calendar, color: 'bg-pink-600' },
    { title: 'Historial de servicios', icon: History, color: 'bg-indigo-700' },
    { title: 'Ayuda', icon: HelpCircle, color: 'bg-teal-600' },
    { title: 'Exhibiciones', icon: ChefHat, color: 'bg-orange-600' },
    { title: 'Base de datos', icon: Database, color: 'bg-brand' },
    { title: 'Inventario Almacenes', icon: Warehouse, color: 'bg-lime-600' },
    { title: 'Agenda Tecnicos', icon: BookOpen, color: 'bg-purple-600' },
    { title: 'BI', icon: BarChart3, color: 'bg-brand' },
    { title: 'Indicador quejas', icon: AlertTriangle, color: 'bg-rose-500' },
    { title: 'Configuración', icon: Settings, color: 'bg-slate-700' },
  ];

  const CLIENT_ITEMS = ['Solicitar servicio', 'Servicios Abiertos', 'Buscar servicio cerrado'];
  const filteredItems = isCliente
    ? allMenuItems.filter(item => CLIENT_ITEMS.includes(item.title))
    : allMenuItems;


  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-800 font-sans">
      <header className="fixed top-0 left-0 w-full bg-brand text-white z-50 h-[3.5rem] flex items-center px-6 justify-between shadow-lg">
        <div className="flex items-center">
          <img src="/logo-firplak.png" alt="FIRPLAK" className="h-8 w-auto invert brightness-0 underline-offset-4" style={{ filter: 'brightness(0) invert(1)' }} />
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
            <h1 className="text-3xl font-black text-brand tracking-tighter mb-0.5 leading-none">
              {isCliente ? '¡Bienvenido Cliente Firplak!' : '¡Bienvenido!'}
            </h1>
            <p className="text-lg font-bold text-slate-700 leading-tight mb-0.5">{fullName}</p>
            <p className="text-xs font-medium text-slate-400 mb-2">{user.email}</p>
            <span className="inline-block px-4 py-0.5 bg-brand text-white text-[9px] font-black uppercase tracking-[0.15em] rounded-full shadow-md">
              {userRole}
            </span>
          </div>
        </motion.section>

        {/* Share Form Button - Hidden for clients */}
        {!isCliente && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={copyFormLink}
            className="w-full max-w-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all mb-10 flex items-center justify-center gap-3 group"
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
              <Link className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="font-bold text-lg">Compartir Formulario de Cliente</div>
              <div className="text-xs text-white/80">Copiar enlace para enviar a clientes</div>
            </div>
          </motion.button>
        )}

        {/* Compact Action Grid */}
        <div className={`grid gap-6 w-full justify-center ${isCliente ? 'grid-cols-1 sm:grid-cols-3 max-w-2xl' : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7'}`}>
          {filteredItems.map((item, index) => (
            <motion.button
              key={item.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              whileHover={{ y: -5, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const route = routeMap[item.title];
                if (route) router.push(route);
              }}
              className={`group flex flex-col items-center p-3 bg-white border border-white rounded-3xl shadow-lg shadow-slate-200/30 hover:shadow-2xl hover:shadow-brand/20 transition-all aspect-[5/6] relative overflow-hidden ${portalType === 'cliente' ? 'max-w-[200px] w-full mx-auto' : ''}`}
            >
              {/* Decorative Corner Circle */}
              <div className="absolute top-[-20px] right-[-20px] w-16 h-16 bg-slate-50 rounded-full group-hover:bg-brand/5 transition-colors" />

              <div className={`mt-2 mb-3 p-3 rounded-2xl ${item.color} text-white shadow-lg transition-transform group-hover:rotate-6`}>
                <item.icon className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest text-center group-hover:text-brand transition-colors">
                  {isCliente && item.title === 'Buscar servicio cerrado' ? 'Servicios Cerrados' : item.title}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </main >

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">¡Enlace copiado al portapapeles!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="mt-auto py-4 text-center">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
          FIRPLAK S.A. &copy; 2026
        </p>
      </footer>
    </div >
  );
}
