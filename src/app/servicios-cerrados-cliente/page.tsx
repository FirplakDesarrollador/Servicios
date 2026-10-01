'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Search,
    Eraser,
    Calendar as CalendarIcon,
    ChevronDown,
    Filter,
    FileDown,
    Loader2,
    LayoutGrid,
    List,
    AlertCircle,
    User,
    Settings,
    Headphones,
    ChevronLeft,
    ChevronRight,
    Users,
    Package,
    Clock,
    CheckCircle2,
    Info,
    History
} from 'lucide-react';

export default function ServiciosCerradosClientePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState<any[]>([]);
    const [filteredServices, setFilteredServices] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            // Fetch current user details
            const { data: userData } = await supabase
                .from('Usuarios')
                .select('*')
                .eq('user_id', session.user.id)
                .single();
            
            if (!userData) {
                router.push('/login');
                return;
            }
            setProfile(userData);

            // Fetch Services from Servicios_Distribuidor
            // We join with Ubicaciones for the distributor name
            const { data: servicesData, error: servicesError } = await supabase
                .from('Servicios_Distribuidor')
                .select(`
                    *,
                    ubicacion:ubicacion_id(nombre, nit, ciudad, direccion, telefono),
                    consumidor:consumidor_id(*)
                `)
                .eq('comercial_id', userData.id)
                .eq('estado', 'Cerrado')
                .order('created_at', { ascending: false });

            if (servicesError) {
                console.error('Error fetching services:', servicesError);
            }

            if (servicesData) {
                setServices(servicesData);
                setFilteredServices(servicesData);
            }

            setLoading(false);
        };

        init();
    }, [router]);

    // Filtering logic
    useEffect(() => {
        let result = [...services];

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(s =>
                (s.consecutivo?.toLowerCase().includes(lowerSearch)) ||
                (s.numero_orden_compra?.toLowerCase().includes(lowerSearch)) ||
                (s.ubicacion?.nombre?.toLowerCase().includes(lowerSearch)) ||
                (s.consumidor?.nombre?.toLowerCase().includes(lowerSearch)) ||
                (s.tipo_de_servicio?.toLowerCase().includes(lowerSearch))
            );
        }

        if (filterDate) {
            result = result.filter(s => s.created_at?.startsWith(filterDate));
        }

        setFilteredServices(result);
    }, [searchTerm, filterDate, services]);

    const handleClearFilters = () => {
        setSearchTerm('');
        setFilterDate('');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-slate-200 border-t-brand rounded-full animate-spin"></div>
                        <History className="w-6 h-6 text-brand absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Cargando servicios cerrados...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header */}
            <header className="bg-brand text-white sticky top-0 z-40 shadow-lg px-4 py-4 md:px-8">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight">
                            Servicios Cerrados / Historial
                        </h1>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-8">
                {/* Filters Section */}
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Search */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Búsqueda rápida</label>
                            <div className="relative group">
                                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Buscar por consecutivo, orden de compra..."
                                    className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-11 pr-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand/20 transition-all placeholder:text-slate-300"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Date */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Filtrar por fecha</label>
                            <div className="relative group">
                                <CalendarIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="date"
                                    className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-11 pr-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand/20 transition-all"
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Services List */}
                <div className="flex flex-col gap-4">
                    {filteredServices.length === 0 ? (
                        <div className="bg-white rounded-[2rem] p-12 text-center border border-slate-100 italic text-slate-400">
                            No hay servicios cerrados para mostrar...
                        </div>
                    ) : (
                        filteredServices.map((service) => (
                            <ServiceItemCliente key={service.id} service={service} />
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}

function ServiceItemCliente({ service }: { service: any }) {
    const products = service.productos || [];
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all group grayscale-[0.6] opacity-90"
        >
            <div className="flex flex-col md:flex-row gap-6">
                {/* Left section: ID and Basic Info */}
                <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                {service.consecutivo}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                                <Clock className="w-3.5 h-3.5" />
                                {new Date(service.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="flex flex-col items-end">
                                <span className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">Estado Servicio</span>
                                <span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                                    Cerrado
                                </span>
                             </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Orden de Compra</p>
                            <p className="text-sm font-bold text-slate-700">{service.numero_orden_compra || '---'}</p>
                        </div>
                        <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipo de Servicio</p>
                            <p className="text-sm font-bold text-slate-700 uppercase">{service.tipo_de_servicio?.replace(/_/g, ' ')}</p>
                        </div>
                        <div className="sm:col-span-2">
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Sucursal / Distribuidor</p>
                             <p className="text-xs font-bold text-slate-600 italic">
                                {service.ubicacion?.nombre} - {service.ubicacion?.ciudad}
                             </p>
                        </div>
                    </div>
                </div>

                {/* Right section: Products list or summary */}
                <div className="md:w-[40%] bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Package className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Detalle de Productos</span>
                        <span className="ml-auto bg-slate-200 text-slate-600 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold">
                            {products.length}
                        </span>
                    </div>
                    
                    <div className="space-y-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar opacity-70">
                        {products.map((p: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-[11px] bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-700">{p.grupo}</span>
                                    <span className="text-slate-400 text-[9px]">{p.medida}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-slate-300">CANT.</span>
                                    <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md font-black">{p.cantidad}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {service.observaciones && (
                        <div className="mt-3 pt-3 border-t border-slate-200/50">
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Info className="w-2.5 h-2.5" />
                                Observaciones
                            </p>
                            <p className="text-[10px] text-slate-500 line-clamp-2">{service.observaciones}</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

