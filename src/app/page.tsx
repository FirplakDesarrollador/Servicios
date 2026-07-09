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
  AlertTriangle,
  Users,
  FileText,
  PieChart
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

          // Usar los permisos definidos en la base de datos para este usuario
          setPermissions(userData.acceso_a_modulos || []);
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
            .then(({ data }) => { 
              if (data) {
                setProfile(data);
                setPermissions(data.acceso_a_modulos || []);
              }
            });
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
    'Solicitudes Clientes': '/solicitudes-clientes',
    'BI': '/bi',
    'Indicadores MAC': '/indicadores-mac',
    'Registro Solicitudes': '/registro-solicitudes',
    'Configuración': '/configuracion',
  };

  const allMenuItems = [
    { title: 'Solicitar servicio', icon: Briefcase, color: 'bg-[#254153]/10 text-[#254153]' },
    { title: 'Servicios Abiertos', icon: ClipboardList, color: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
    { title: 'Buscar servicio cerrado', icon: Search, color: 'bg-indigo-50 text-indigo-700 border border-indigo-100' },
    { title: 'Aprobaciones', icon: ClipboardCheck, color: 'bg-amber-50 text-amber-700 border border-amber-100' },
    { title: 'Mi agenda', icon: Calendar, color: 'bg-rose-50 text-rose-700 border border-rose-100' },
    { title: 'Historial de servicios', icon: History, color: 'bg-indigo-50 text-indigo-700 border border-indigo-100' },
    { title: 'Ayuda', icon: HelpCircle, color: 'bg-teal-50 text-teal-700 border border-teal-100' },
    { title: 'Exhibiciones', icon: ChefHat, color: 'bg-amber-50 text-amber-700 border border-amber-100' },
    { title: 'Base de datos', icon: Database, color: 'bg-[#254153]/10 text-[#254153]' },
    { title: 'Inventario Almacenes', icon: Warehouse, color: 'bg-lime-50 text-lime-700 border border-lime-100' },
    { title: 'Agenda Tecnicos', icon: BookOpen, color: 'bg-purple-50 text-purple-700 border border-purple-100' },
    { title: 'Solicitudes Clientes', icon: Users, color: 'bg-blue-50 text-blue-700 border border-blue-100' },
    { title: 'BI', icon: BarChart3, color: 'bg-[#254153]/10 text-[#254153]' },
    { title: 'Indicadores MAC', icon: PieChart, color: 'bg-[#254153]/10 text-[#254153]' },
    { title: 'Registro Solicitudes', icon: FileText, color: 'bg-sky-50 text-sky-700 border border-sky-100' },
    { title: 'Configuración', icon: Settings, color: 'bg-slate-100 text-slate-700 border border-slate-200' },
  ];

  const CLIENT_ITEMS = ['Solicitar servicio', 'Servicios Abiertos', 'Buscar servicio cerrado'];
  const filteredItems = isCliente
    ? allMenuItems.filter(item => CLIENT_ITEMS.includes(item.title))
    : allMenuItems.filter(item => permissions.includes(item.title));


  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 font-sans flex flex-col">
      <header className="fixed top-0 left-0 w-full bg-white border-b border-slate-200/80 text-slate-800 z-50 h-14 flex items-center px-6 justify-between shadow-sm">
        <div className="flex items-center">
          <img src="/logo-firplak.png" alt="FIRPLAK" className="h-6 w-auto" />
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <span className="text-xs font-bold text-slate-500 tabular-nums tracking-wide">{currentTime}</span>
        </div>

        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-150 hover:bg-slate-100 text-slate-600 transition-all shadow-none">
            <BellPlus className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-150 hover:bg-slate-100 text-slate-600 transition-all shadow-none">
            <Bell className="w-4 h-4" />
          </button>
          <button
            onClick={handleSignOut}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-150 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all shadow-none"
          >
            <LogOutIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="pt-24 pb-10 px-4 sm:px-8 w-full max-w-[96%] xl:max-w-[1800px] mx-auto flex flex-col items-stretch">
        {/* Compact Profile Card */}
        <motion.section
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl mx-auto bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm mb-6 flex flex-col items-center text-center relative overflow-hidden"
        >
          {/* Decorative Background Blob */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand/5 rounded-full blur-3xl animate-pulse" />

          <div className="relative group mb-3">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center border-2 border-slate-100 shadow-sm overflow-hidden">
              <img
                src={userPhoto || defaultPhoto}
                alt={fullName}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                onError={(e: any) => { e.target.src = defaultPhoto; }}
              />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-3 text-white" />
            </div>
          </div>

          <div className="flex flex-col items-center">
            <h1 className="text-xl font-black text-[#254153] tracking-tight leading-none mb-1">
              {isCliente ? '¡Bienvenido Cliente Firplak!' : '¡Bienvenido!'}
            </h1>
            <p className="text-sm font-semibold text-slate-700 leading-tight mb-0.5">{fullName}</p>
            <p className="text-xs font-semibold text-slate-400 mb-2.5">{user.email}</p>
            <span className="inline-block px-3 py-0.5 bg-brand/10 border border-brand/20 text-brand text-[9px] font-black uppercase tracking-[0.12em] rounded-full shadow-none">
              {userRole}
            </span>
          </div>
        </motion.section>

        {/* Share Form Button - Hidden for clients */}
        {!isCliente && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -1 }}
            onClick={copyFormLink}
            className="w-full max-w-4xl mx-auto bg-white border border-gray-200/80 p-4 rounded-xl shadow-sm hover:border-brand/40 hover:shadow-md hover:shadow-brand/5 transition-all mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 group cursor-pointer"
          >
            <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mx-auto sm:mx-0">
                <Link className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-bold text-slate-800 text-sm leading-tight">Compartir Formulario de Cliente</div>
                <div className="text-xs text-slate-400 font-medium">Copiar enlace para enviar a clientes</div>
              </div>
            </div>
            <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors shrink-0">
              Copiar enlace
            </button>
          </motion.div>
        )}

        {/* Compact Action Grid */}
        <div className="grid gap-4 w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 min-[1700px]:grid-cols-12 justify-center">
          {filteredItems.map((item, index) => (
            <motion.button
              key={item.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.02 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                const route = routeMap[item.title];
                if (route) router.push(route);
              }}
              className="group flex flex-col items-center justify-center p-4 bg-white border border-gray-200/80 rounded-xl shadow-sm hover:shadow-md hover:border-brand/45 transition-all aspect-square w-full max-w-[150px] mx-auto relative overflow-hidden"
            >
              <div className={`mb-3 p-3 rounded-xl ${item.color} shadow-none transition-transform group-hover:scale-105 flex items-center justify-center`}>
                <item.icon className="w-5 h-5" strokeWidth={2.2} />
              </div>
              <div className="flex flex-col items-center justify-center w-full">
                <span className="text-[11px] font-semibold text-slate-600 tracking-wide text-center leading-snug group-hover:text-brand transition-colors">
                  {isCliente && item.title === 'Buscar servicio cerrado' ? 'Servicios Cerrados' : item.title}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </main>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2.5 z-50 text-xs font-bold border border-emerald-500 animate-in fade-in"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>¡Enlace copiado al portapapeles!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="mt-auto py-6 text-center border-t border-slate-100 bg-white">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          FIRPLAK S.A. &copy; 2026
        </p>
      </footer>
    </div>
  );
}
