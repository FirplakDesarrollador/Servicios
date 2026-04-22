'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
    ArrowLeft,
    RefreshCw,
    Search,
    Users,
    Eraser,
    Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SolicitudCard from '@/components/solicitudes-clientes/SolicitudCard';

export default function SolicitudesClientesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [fetching, setFetching] = useState(false);
    const [solicitudes, setSolicitudes] = useState<any[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [userRole, setUserRole] = useState('');

    const fetchSolicitudes = useCallback(async (searchTerm = '') => {
        setFetching(true);
        try {
            let query = supabase.from('solicitudes_clientes').select('*');
            
            if (searchTerm) {
                query = query.or(`nombre_razon_social.ilike.%${searchTerm}%,consecutivo.ilike.%${searchTerm}%,ciudad.ilike.%${searchTerm}%,correo_electronico.ilike.%${searchTerm}%`);
            }
            
            const { data, error } = await query.order('fecha_creacion', { ascending: false });
            
            if (error) throw error;
            setSolicitudes(data || []);
        } catch (error) {
            console.error('Error fetching solicitudes:', error);
        } finally {
            setFetching(false);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const checkAccess = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            const { data: profile } = await supabase
                .from('Usuarios')
                .select('rol')
                .eq('user_id', session.user.id)
                .single();

            if (profile) {
                setUserRole(profile.rol);
            }
            
            fetchSolicitudes();
        };

        checkAccess();
    }, [router, fetchSolicitudes]);

    const handleSearch = () => {
        fetchSolicitudes(busqueda);
    };

    const handleClear = () => {
        setBusqueda('');
        fetchSolicitudes('');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-brand animate-spin" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cargando Solicitudes...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header Mirroring FlutterFlow: Height 50, Primary Color */}
            <header className="fixed top-0 left-0 w-full bg-brand text-white z-50 h-[50px] flex items-center px-4 shadow-md">
                <button 
                    onClick={() => router.push('/servicios-abiertos')} 
                    className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90"
                >
                    <ArrowLeft className="w-7 h-7" />
                </button>
                <div className="ml-4 flex items-center gap-4">
                    <h1 className="font-bold text-xl tracking-tight">Lista de solicitudes</h1>
                </div>

                <div className="ml-auto flex items-center gap-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60 bg-white/10 px-3 py-1 rounded-full">
                        {solicitudes.length} Registros
                    </span>
                </div>
            </header>

            <main className="pt-[50px] max-w-4xl mx-auto pb-20">
                {/* Advanced Search Section Mirroring FlutterFlow */}
                <div className="p-6">
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                             <h2 className="text-xs font-bold text-brand uppercase tracking-widest pl-1">Búsqueda avanzada</h2>
                             <div className="flex items-center gap-3">
                                <div className="flex-1 relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Search className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <input 
                                        type="text"
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        placeholder="Texto a buscar..."
                                        className="w-full h-11 bg-white border border-slate-200 rounded-lg pl-11 pr-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                                    />
                                    <label className="absolute -top-2 left-3 px-1 bg-white text-[10px] font-bold text-slate-400">Texto a buscar</label>
                                </div>
                                
                                <button 
                                    onClick={handleSearch}
                                    title="BUSCAR"
                                    className="p-2.5 text-brand hover:bg-brand/10 rounded-xl transition-all active:scale-90 flex items-center justify-center border border-slate-100"
                                >
                                    <Search className="w-7 h-7" />
                                </button>

                                <button 
                                    onClick={handleClear}
                                    title="LIMPIAR"
                                    className="p-2.5 text-brand hover:bg-brand/10 rounded-xl transition-all active:scale-90 flex items-center justify-center border border-slate-100"
                                >
                                    <Eraser className="w-7 h-7" />
                                </button>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Card List Vertical Container */}
                <div className="px-6 space-y-4">
                    <AnimatePresence mode="popLayout">
                        {solicitudes.length > 0 ? (
                            solicitudes.map((sol, idx) => (
                                <SolicitudCard 
                                    key={sol.id} 
                                    solicitud={sol} 
                                    onClick={(s) => alert(`Gestión de solicitud ${s.consecutivo} próximamente.`)} 
                                />
                            ))
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="py-20 text-center"
                            >
                                <div className="flex flex-col items-center gap-4 text-slate-300">
                                    <Users className="w-16 h-16 opacity-20" />
                                    <p className="font-bold text-slate-400">No se encontraron solicitudes</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Loading Overlay for Fetching */}
            <AnimatePresence>
                {fetching && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed bottom-8 right-8 bg-white shadow-2xl rounded-2xl border border-slate-100 p-4 flex items-center gap-3 z-50"
                    >
                        <RefreshCw className="w-5 h-5 text-brand animate-spin" />
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Buscando...</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
