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
    Box
} from 'lucide-react';

export default function ServiciosAbiertosClientesPage() {
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
                    ubicacion:ubicacion_id(id, nombre, nit, direccion, telefono, ciudad:ciudad_id(ciudad)),
                    consumidor:consumidor_id(*)
                `)
                .eq('comercial_id', userData.id)
                .eq('estado', 'Abierto')
                .order('created_at', { ascending: false });

            if (servicesError) {
                console.error('Error fetching services:', servicesError);
            }

            console.log('User Profile ID:', userData.id);
            console.log('Fetched Services:', servicesData);

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
                (s.consumidor?.contacto?.toLowerCase().includes(lowerSearch)) ||
                (s.tipo_de_servicio?.toLowerCase().includes(lowerSearch)) ||
                (s.ubicacion?.ciudad?.ciudad?.toLowerCase().includes(lowerSearch))
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
                        <Package className="w-6 h-6 text-brand absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Cargando tus solicitudes...</p>
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
                                Servicios Abiertos
                            </h1>
                            <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">Portal Distribuidor</span>


                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-8">
                {/* User Info Bar */}
                <div className="mb-6 flex items-center justify-between bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                            <User className="w-4 h-4 text-slate-400" />
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-300 uppercase leading-none mb-1">Distribuidor Actual</span>
                            <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{profile?.display_name || profile?.nombres}</span>
                         </div>
                    </div>
                    <div className="flex items-center gap-4">
                         <div className="text-right">
                            <span className="text-[9px] font-black text-slate-300 uppercase leading-none mb-1">Total Abiertos</span>
                            <div className="text-lg font-black text-brand leading-none">{services.length}</div>
                         </div>
                    </div>
                </div>

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
                                    placeholder="Buscar por consecutivo, orden de compra, ciudad..."
                                    className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-11 pr-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand/20 transition-all placeholder:text-slate-300"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Date & Actions */}
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1 flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Fecha de solicitud</label>
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
                                <AlertCircle className="w-8 h-8 text-slate-300" />
                             </div>
                             <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">No se encontraron registros</h3>
                             <p className="text-slate-300 text-xs font-bold mt-2">Prueba ajustando los filtros de búsqueda</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            <AnimatePresence mode="popLayout">
                                {filteredServices
                                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                    .map((service) => (
                                        <ClientServiceCard key={service.id} service={service} />
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

function ClientServiceCard({ service }: { service: any }) {
    const products = service.productos || [];
    
    return (
        <motion.div 
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-brand/5 transition-all group relative"
        >
            <div className="flex flex-col lg:flex-row">
                {/* Status Column */}
                <div className="lg:w-12 bg-gradient-to-b from-brand to-brand-dark flex lg:flex-col items-center justify-center p-3 lg:py-6 gap-3 relative overflow-hidden group/sidebar">
                     {/* Decorative sidebar elements */}
                     <div className="absolute top-0 left-0 w-full h-1/2 bg-white/5 skew-y-12 -translate-y-full group-hover/sidebar:translate-y-0 transition-transform duration-700" />
                     <Clock className="w-5 h-5 text-white/50 relative z-10" />
                     <div className="lg:[writing-mode:vertical-lr] text-[9px] font-black text-white/90 uppercase tracking-[0.25em] lg:rotate-180 relative z-10">
                        PENDIENTE
                     </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-4 lg:p-5">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-3 mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-1.5">
                                <span className="text-xl font-black text-slate-800 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                                    {service.consecutivo}
                                </span>
                                <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    EN REVISIÓN
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px]">
                                    <CalendarIcon className="w-3 h-3" />
                                    {new Date(service.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase italic">
                                    <MapPin className="w-3 h-3" />
                                    {service.ubicacion?.ciudad?.ciudad || '---'}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60">Orden de Compra</span>
                             <div className="flex items-center gap-2 bg-slate-50/50 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-slate-100/80 shadow-inner group-hover:border-brand/20 transition-colors">
                                <Hash className="w-3.5 h-3.5 text-brand/40 group-hover:text-brand transition-colors" />
                                <span className="text-xs font-black text-slate-700 tracking-tight">{service.numero_orden_compra || 'SIN NÚMERO'}</span>
                             </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Info Column */}
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3">Información del Pedido</h4>
                                <div className="space-y-4">
                                     <div className="flex flex-col">
                                        <span className="text-[7px] font-black text-brand uppercase mb-0.5">Tipo de Servicio</span>
                                        <span className="text-xs font-bold text-slate-700 uppercase">{service.tipo_de_servicio?.replace(/_/g, ' ')}</span>
                                     </div>
                                     <div className="flex flex-col">
                                        <span className="text-[7px] font-black text-brand uppercase mb-0.5">Sucursal Seleccionada</span>
                                        <span className="text-xs font-bold text-slate-700 italic leading-tight">{service.ubicacion?.nombre}</span>
                                        <span className="text-[10px] text-slate-400 font-medium leading-tight">{service.ubicacion?.direccion}</span>
                                     </div>
                                     <div className="flex flex-col group/item p-2 rounded-xl hover:bg-slate-50 transition-colors">
                                        <span className="text-[7px] font-black text-brand/60 uppercase mb-0.5 tracking-wider">Cliente Final</span>
                                        <span className="text-xs font-black text-slate-800 uppercase leading-tight decoration-emerald-500/30 group-hover:underline underline-offset-4">
                                            {service.consumidor?.contacto || service.consumidor?.nombre || 'Particular / No registrado'}
                                        </span>
                                        {service.consumidor?.cedula && (
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <div className="w-1 h-3 bg-emerald-500/20 rounded-full" />
                                                <span className="text-[9px] text-slate-400 font-bold">NIT: {service.consumidor?.cedula}</span>
                                            </div>
                                        )}
                                     </div>

                                </div>
                            </div>
                        </div>

                        {/* Products Column */}
                        <div className="md:col-span-2">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                    <Package className="w-3 h-3" />
                                    Productos Solicitados
                                </h4>
                                <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md text-[9px] font-black">
                                    {products.length} ITEM(S)
                                </span>
                             </div>

                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                                {products.map((p: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between bg-slate-50/40 p-2.5 rounded-xl border border-slate-100/50 group/item hover:bg-white hover:shadow-lg hover:shadow-brand/5 hover:border-brand/10 transition-all duration-300">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-100 shadow-sm group-hover/item:border-brand/20 transition-colors">
                                                <Box className="w-4 h-4 text-brand/30 group-hover/item:text-brand transition-colors" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-700 leading-tight mb-0.5 group-hover/item:text-brand transition-colors">{p.grupo}</span>
                                                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">{p.medida}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                                            <span className="text-[6px] font-black text-slate-300 uppercase leading-none mb-0.5">CANT</span>
                                            <span className="text-[11px] font-black text-slate-700 leading-none group-hover/item:text-brand transition-colors">x{p.cantidad}</span>
                                        </div>
                                    </div>
                                ))}
                             </div>

                              {service.observaciones && (
                                <div className="mt-3 p-3 bg-orange-50/30 rounded-xl border border-orange-100/50">
                                     <p className="text-[7px] font-black text-orange-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                                        <Info className="w-2.5 h-2.5" />
                                        Observaciones Internas
                                     </p>
                                     <p className="text-[10px] text-slate-600 leading-relaxed italic">{service.observaciones}</p>
                                </div>
                             )}
                        </div>
                    </div>
                </div>

                {/* Right Action Area - Hover visible maybe? or always visible */}
                <div className="hidden lg:flex flex-col border-l border-slate-50 w-12 items-center justify-center gap-6 p-4 bg-slate-50/30">
                    <button className="text-slate-300 hover:text-brand transition-colors">
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        </motion.div>
    );
}

