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
    History,
    Package,
    Clock,
    CheckCircle2,
    Info,
    ChevronRight,
    MapPin,
    Hash,
    Check
} from 'lucide-react';

export default function ServiciosCerradosClientesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState<any[]>([]);
    const [filteredServices, setFilteredServices] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

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
                (s.tipo_de_servicio?.toLowerCase().includes(lowerSearch)) ||
                (s.ubicacion?.ciudad?.toLowerCase().includes(lowerSearch))
            );
        }

        if (filterDate) {
            result = result.filter(s => s.created_at?.startsWith(filterDate));
        }

        setFilteredServices(result);
        setCurrentPage(1);
    }, [searchTerm, filterDate, services]);

    const handleClearFilters = () => {
        setSearchTerm('');
        setFilterDate('');
        setCurrentPage(1);
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
                    <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Cargando tu historial...</p>
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
                        <div className="flex flex-col">
                            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight leading-none">
                                Servicios Cerrados
                            </h1>
                            <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">Historial del Distribuidor</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-8">
                {/* User Info Bar */}
                <div className="mb-6 flex items-center justify-between bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm opacity-80">
                    <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                            <User className="w-4 h-4 text-slate-300" />
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-300 uppercase leading-none mb-1">Distribuidor</span>
                            <span className="text-xs font-black text-slate-500 uppercase tracking-tight">{profile?.display_name || profile?.nombres}</span>
                         </div>
                    </div>
                    <div className="flex items-center gap-4">
                         <div className="text-right">
                            <span className="text-[9px] font-black text-slate-300 uppercase leading-none mb-1">Total Cerrados</span>
                            <div className="text-lg font-black text-slate-400 leading-none">{services.length}</div>
                         </div>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Search */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Buscar en el historial</label>
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

                        {/* Date & Actions */}
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1 flex flex-col gap-2">
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
                            <div className="flex items-end">
                                <button
                                    onClick={handleClearFilters}
                                    className="py-3 px-6 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-2xl transition-all flex items-center justify-center gap-2 group border border-dashed border-slate-200"
                                >
                                    <Eraser className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Limpiar</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Services List */}
                <div className="flex flex-col gap-6">
                    {filteredServices.length === 0 ? (
                        <div className="bg-white rounded-[2rem] p-16 text-center border border-dashed border-slate-200">
                             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <History className="w-8 h-8 text-slate-300" />
                             </div>
                             <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">No hay historial para mostrar</h3>
                             <p className="text-slate-300 text-xs font-bold mt-2">Aún no tienes servicios cerrados en tu historial</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            <AnimatePresence mode="popLayout">
                                {filteredServices
                                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                    .map((service) => (
                                        <ClientServiceCardHistorial key={service.id} service={service} />
                                    ))
                                }
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Pagination */}
                    {filteredServices.length > itemsPerPage && (
                        <div className="flex items-center justify-center gap-4 py-8">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-6 py-2 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand hover:text-white hover:border-brand transition-all shadow-sm"
                            >
                                Anterior
                            </button>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                Página {currentPage} / {Math.ceil(filteredServices.length / itemsPerPage)}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredServices.length / itemsPerPage), p + 1))}
                                disabled={currentPage >= Math.ceil(filteredServices.length / itemsPerPage)}
                                className="px-6 py-2 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand hover:text-white hover:border-brand transition-all shadow-sm"
                            >
                                Siguiente
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function ClientServiceCardHistorial({ service }: { service: any }) {
    const products = service.productos || [];
    
    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 opacity-90 transition-all hover:opacity-100 group relative grayscale-[0.5] hover:grayscale-0"
        >
            <div className="flex flex-col lg:flex-row">
                {/* Status Column */}
                <div className="lg:w-16 bg-slate-400 flex lg:flex-col items-center justify-center p-4 lg:py-6 gap-3 group-hover:bg-emerald-500 transition-colors">
                     <CheckCircle2 className="w-6 h-6 text-white/40 group-hover:text-white" />
                     <div className="lg:[writing-mode:vertical-lr] text-[10px] font-black text-white uppercase tracking-[0.3em] lg:rotate-180">
                        FINALIZADO
                     </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 lg:p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl font-black text-slate-700 tracking-tighter">
                                    {service.consecutivo}
                                </span>
                                <span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                                    COMPLETADO
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                <div className="flex items-center gap-2 text-slate-300 font-bold text-xs group-hover:text-emerald-300 transition-colors">
                                    <Clock className="w-3.5 h-3.5" />
                                    Finalizado el {new Date(service.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase italic">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {service.ubicacion?.ciudad}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Orden de Compra</span>
                             <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                <Hash className="w-3.5 h-3.5 text-slate-300" />
                                <span className="text-sm font-black text-slate-600">{service.numero_orden_compra || '---'}</span>
                             </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Info Column */}
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3">Resumen Servicio</h4>
                                <div className="space-y-4">
                                     <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-slate-400 uppercase mb-1">Tipo de Servicio</span>
                                        <span className="text-sm font-bold text-slate-600 uppercase">{service.tipo_de_servicio?.replace(/_/g, ' ')}</span>
                                     </div>
                                     <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-slate-400 uppercase mb-1">Cliente Solicitante</span>
                                        <span className="text-sm font-bold text-slate-600 italic">{service.ubicacion?.nombre}</span>
                                     </div>
                                </div>
                            </div>
                        </div>

                        {/* Products Column */}
                        <div className="md:col-span-2">
                             <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                    <Package className="w-3.5 h-3.5" />
                                    Productos Entregados
                                </h4>
                             </div>

                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                                {products.map((p: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between bg-slate-50/50 p-3 rounded-2xl border border-slate-100 border-dashed">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-slate-600 leading-tight mb-0.5">{p.grupo}</span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{p.medida}</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg shadow-sm border border-slate-50">
                                            <Check className="w-3 h-3 text-emerald-500" />
                                            <span className="text-xs font-black text-slate-500">{p.cantidad}</span>
                                        </div>
                                    </div>
                                ))}
                             </div>

                             {service.observaciones && (
                                <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                     <p className="text-[11px] text-slate-500 leading-relaxed italic line-clamp-2">{service.observaciones}</p>
                                </div>
                             )}
                        </div>
                    </div>
                </div>

                <div className="hidden lg:flex flex-col border-l border-slate-50 w-12 items-center justify-center p-4 bg-slate-50/10">
                    <CheckCircle2 className="w-6 h-6 text-emerald-100" />
                </div>
            </div>
        </motion.div>
    );
}

