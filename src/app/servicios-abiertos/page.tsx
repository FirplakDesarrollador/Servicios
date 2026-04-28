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
    Filter,
    FileDown,
    Loader2,
    AlertCircle,
    Settings,
    Users,
    ChevronRight
} from 'lucide-react';
import ServiceCard from '@/components/servicios-abiertos/ServiceCard';
import ModalCerrarServicio from '@/components/servicios-abiertos/ModalCerrarServicio';

export default function ServiciosAbiertosPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState<any[]>([]);
    const [filteredServices, setFilteredServices] = useState<any[]>([]);
    const [technicians, setTechnicians] = useState<any[]>([]);
    const [macAdvisors, setMacAdvisors] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterTechnician, setFilterTechnician] = useState('');
    const [filterMacAdvisor, setFilterMacAdvisor] = useState('');
    const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
    const [assigningMacService, setAssigningMacService] = useState<any>(null);
    const [isUpdatingMac, setIsUpdatingMac] = useState(false);
    const [closingService, setClosingService] = useState<any>(null);

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    useEffect(() => {
        const init = async () => {
            const timeoutId = setTimeout(() => {
                setLoading(false);
            }, 6000); // 6 seconds security timeout for list pages

            try {
                const { data: { session }, error: authError } = await supabase.auth.getSession();
                if (authError) throw authError;

                if (!session) {
                    router.push('/login');
                    return;
                }

                // Parallel fetch for profile, services, techs and macs for efficiency
                const [profileRes, servicesRes, techRes, macRes] = await Promise.all([
                    supabase.from('Usuarios').select('*').eq('user_id', session.user.id).single(),
                    supabase.from('query_servicios').select('*').eq('estado', true).order('created_at', { ascending: false }),
                    supabase.from('Usuarios').select('*').in('rol', ['tecnico', 'coordinador_tecnico', 'asesor_tecnico', 'promotor_tecnico', 'promotor_tecnico_exhibiciones', 'promotor_tecnico_comercial']).order('display_name'),
                    supabase.from('Usuarios').select('*').eq('rol', 'mac').not('user_id', 'is', null).order('display_name')
                ]);

                // Handle Profile
                if (profileRes.data) setProfile(profileRes.data);

                // Handle Services
                if (servicesRes.error) console.error('Error fetching services:', servicesRes.error.message);
                if (servicesRes.data) {
                    const mappedServices = servicesRes.data.map((s: any) => ({
                        ...s,
                        ubicacionNombre: s.ubicacion_nombre || s.ubicacionNombre,
                        ubicacionCiudad: s.ubicacion_ciudad || s.ubicacionCiudad,
                        consumidorNombre: s.consumidor_nombre || s.consumidorNombre,
                        asesorNombre: s.asesor_nombre || s.asesorNombre,
                        coordinadorNombre: s.coordinador_nombre || s.coordinadorNombre,
                        macNombre: s.mac_nombre || s.macNombre || s.asesor_mac_nombre,
                        asesorMacNombre: s.mac_nombre || s.macNombre || s.asesor_mac_nombre,
                        asesorMacId: s.asesor_mac_id || s.asesorMacId,
                        tecnicoNombre: s.tecnico_nombre || s.tecnicoNombre,
                        tipoDeServicio: s.tipo_de_servicio || s.tipoDeServicio,
                        numeroDePedido: s.numero_de_pedido || s.numeroDePedido,
                        estadoAgendamiento: s.estado_visita || s.estadoVisita || 'Sin agendar',
                        fechaProgramada: s.visita_fecha_hora_inicio ? new Date(s.visita_fecha_hora_inicio).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Null'
                    }));
                    setServices(mappedServices);
                    setFilteredServices(mappedServices);
                }

                // Handle Technicians & MACs
                setTechnicians(techRes.data || []);
                setMacAdvisors(macRes.data || []);

            } catch (err) {
                console.error('Initialization error:', err);
                // Even on error, we must hide loading
            } finally {
                clearTimeout(timeoutId);
                setLoading(false);
            }
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
                (s.numero_de_pedido?.toLowerCase().includes(lowerSearch)) ||
                (s.ubicacion_nombre?.toLowerCase().includes(lowerSearch)) ||
                (s.consumidor_nombre?.toLowerCase().includes(lowerSearch)) ||
                (s.asesor_nombre?.toLowerCase().includes(lowerSearch)) ||
                (s.tecnico_nombre?.toLowerCase().includes(lowerSearch)) ||
                (s.macNombre?.toLowerCase().includes(lowerSearch)) ||
                (s.coordinador_nombre?.toLowerCase().includes(lowerSearch)) ||
                (s.ubicacion_ciudad?.toLowerCase().includes(lowerSearch)) ||
                (s.tipo_de_servicio?.toLowerCase().includes(lowerSearch)) ||
                (s.ubicacion_nit?.toLowerCase().includes(lowerSearch)) ||
                (s.consumidor_cedula?.toLowerCase().includes(lowerSearch)) ||
                (s.ubicacion_telefono?.toLowerCase().includes(lowerSearch)) ||
                (s.consumidor_telefono?.toLowerCase().includes(lowerSearch))
            );
        }

        if (filterDate) {
            result = result.filter(s => s.created_at?.startsWith(filterDate));
        }

        if (filterStatus) {
            result = result.filter(s =>
                (s.estadoAgendamiento || '').toLowerCase().trim() === filterStatus.toLowerCase().trim()
            );
        }

        if (filterTechnician) {
            result = result.filter(s =>
                (s.tecnicoNombre || '').toLowerCase().trim() === filterTechnician.toLowerCase().trim()
            );
        }

        if (filterMacAdvisor) {
            result = result.filter(s =>
                (s.asesor_mac_id || s.asesorMacId)?.toString() === filterMacAdvisor.toString()
            );
        }

        if (showUnassignedOnly) {
            // Filter by warranty/broken service types without MAC advisor assigned
            const warrantyTypes = [
                'garantia_sin_pedido',
                'garantia_con_repuesto_kit',
                'garantia_con_pedido_de_reposicion',
                'quebrados_logistica',
                'error_en_pedido_referencia'
            ];
            result = result.filter(s => {
                const serviceType = (s.tipoDeServicio || '').toLowerCase().trim();
                const hasType = warrantyTypes.includes(serviceType);
                const noMacAdvisor = !s.asesorMacNombre || s.asesorMacNombre.trim() === '';
                return hasType && noMacAdvisor;
            });
        }

        setFilteredServices(result);
        setCurrentPage(1); // Reset to first page on filter change
    }, [searchTerm, filterDate, filterStatus, filterTechnician, filterMacAdvisor, showUnassignedOnly, services]);

    const handleClearFilters = () => {
        setSearchTerm('');
        setFilterDate('');
        setFilterStatus('');
        setFilterTechnician('');
        setFilterMacAdvisor('');
        setShowUnassignedOnly(false);
        setCurrentPage(1);
    };

    const handleDeleteService = async (service: any) => {
        const confirmed = window.confirm('¿Seguro que desea eliminar este servicio? Se recomienda hablar con el coordinador en caso de que ya esté agendado.');
        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('Servicios')
                .delete()
                .eq('id', service.id);

            if (error) throw error;

            alert('¡Acción exitosa! Servicio eliminado correctamente');
            // Refresh list
            setServices(prev => prev.filter(s => s.id !== service.id));
        } catch (error: any) {
            console.error('Error deleting service:', error);
            alert('Error al eliminar: ' + error.message);
        }
    };

    const handleExportCSV = () => {
        // Simple CSV export
        const headers = ["Consecutivo", "Tipo", "Estado", "Cliente", "Ciudad", "Fecha", "Tecnico"];
        const rows = filteredServices.map(s => [
            s.consecutivo,
            s.tipoDeServicio,
            s.estadoAgendamiento,
            s.ubicacionNombre || s.consumidorNombre,
            s.ubicacionCiudad || s.consumidorCiudad,
            s.created_at,
            s.tecnicoNombre
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `servicios_abiertos_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleAssignMac = async (advisorId: string, advisorName: string) => {
        if (!assigningMacService) return;
        setIsUpdatingMac(true);
        try {
            const { error } = await supabase
                .from('Servicios')
                .update({ 
                    asesor_mac_id: advisorId,
                    asesor_mac_nombre: advisorName 
                })
                .eq('id', assigningMacService.id);

            if (error) throw error;

            // Update local state
            setServices(prev => prev.map(s => 
                s.id === assigningMacService.id 
                    ? { ...s, asesor_mac_id: advisorId, asesor_mac_nombre: advisorName, asesorMacNombre: advisorName }
                    : s
            ));
            
            setAssigningMacService(null);
            alert('Asesor MAC asignado correctamente');
        } catch (error: any) {
            console.error('Error assigning MAC:', error);
            alert('Error al asignar: ' + error.message);
        } finally {
            setIsUpdatingMac(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-slate-200 border-t-brand rounded-full animate-spin"></div>
                        <Settings className="w-6 h-6 text-brand absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Cargando servicios...</p>
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
                            Servicios Abiertos
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/solicitudes-clientes')}
                            className="bg-gradient-to-r from-brand to-brand/80 text-white px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand/20 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand/40 transition-all flex items-center gap-2.5 group border border-white/10 overflow-hidden relative"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                            <Users className="w-4 h-4 transition-transform group-hover:scale-110" />
                            <span>Solicitudes Clientes</span>
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="bg-white/10 hover:bg-white/20 p-2.5 rounded-2xl transition-all flex items-center gap-2 text-xs font-black uppercase border border-white/5"
                        >
                            <FileDown className="w-4 h-4" />
                            <span className="hidden md:inline">Exportar CSV</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-8">
                {/* Filters Section */}
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {/* Search */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Búsqueda avanzada</label>
                            <div className="relative group">
                                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Buscar por cliente, pedido, técnico..."
                                    className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-11 pr-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand/20 transition-all placeholder:text-slate-300"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Date */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Fecha solicitud</label>
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

                        {/* Status */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Estado agendamiento</label>
                            <select
                                className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand/20 transition-all appearance-none cursor-pointer"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="">Todos los estados</option>
                                <option value="Agendado">Agendado</option>
                                <option value="Sin agendar">Sin agendar</option>
                                <option value="Terminado">Terminado</option>
                                <option value="Con pendientes">Con pendientes</option>
                                <option value="Cancelado">Cancelado</option>
                                <option value="Preagendado">Preagendado</option>
                                <option value="En progreso">En progreso</option>
                            </select>
                        </div>

                        {/* Technician */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Filtrar por técnico</label>
                            <select
                                className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand/20 transition-all appearance-none cursor-pointer"
                                value={filterTechnician}
                                onChange={(e) => setFilterTechnician(e.target.value)}
                            >
                                <option value="">Todos los técnicos</option>
                                {technicians.map(tech => (
                                    <option key={tech.id} value={tech.display_name}>{tech.display_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* MAC Advisor */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Filtrar por asesor MAC</label>
                            <select
                                className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand/20 transition-all appearance-none cursor-pointer"
                                value={filterMacAdvisor}
                                onChange={(e) => setFilterMacAdvisor(e.target.value)}
                            >
                                <option value="">Todos los asesores MAC</option>
                                {macAdvisors.map(mac => (
                                    <option key={mac.id} value={mac.id}>{mac.display_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Actions */}
                        <div className="flex items-end gap-2">
                            <button
                                onClick={handleClearFilters}
                                className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-2xl py-3 transition-all flex items-center justify-center gap-2 group"
                            >
                                <Eraser className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                <span className="text-xs font-black uppercase">Limpiar</span>
                            </button>
                            <div className="flex-[1.5] bg-slate-50 rounded-2xl p-1 flex items-center justify-between px-3 h-[44px]">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Garantías sin asignar</span>
                                <button
                                    onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
                                    className={`w-10 h-5 rounded-full transition-all relative ${showUnassignedOnly ? 'bg-brand' : 'bg-slate-200'}`}
                                >
                                    <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${showUnassignedOnly ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results Summary & Legend */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-6 px-2 gap-4">
                    <p className="text-sm text-slate-500 font-bold">
                        Mostrando <span className="text-brand">{filteredServices.length}</span> de {services.length} servicios
                    </p>

                    <div className="flex flex-wrap items-center gap-4 bg-white/50 px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                        <StatusLegendItem color="#53B2EA" label="Agendado" />
                        <StatusLegendItem color="#94A3B8" label="Sin agendar" />
                        <StatusLegendItem color="#10B981" label="Terminado" />
                        <StatusLegendItem color="#F59E0B" label="Con pendientes" />
                        <StatusLegendItem color="#EF4444" label="Cancelado" />
                        <StatusLegendItem color="#3C26F3" label="Preagendado" />
                        <StatusLegendItem color="#5B693B" label="En progreso" />
                    </div>
                </div>

                {/* Services Grid */}
                {filteredServices.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[2rem] p-12 text-center shadow-sm border border-slate-100"
                    >
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 uppercase mb-2">No se encontraron servicios</h3>
                        <p className="text-slate-500 text-sm font-medium mb-6">Prueba ajustando los filtros o el término de búsqueda.</p>
                        <button
                            onClick={handleClearFilters}
                            className="text-brand font-black uppercase text-xs hover:underline"
                        >
                            Ver todos los servicios
                        </button>
                    </motion.div>
                ) : (
                    <div className="flex flex-col gap-6">
                        <div className="grid grid-cols-1 gap-2">
                            <AnimatePresence mode='popLayout'>
                                {filteredServices
                                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                    .map(service => (
                                        <ServiceCard
                                            key={service.id || service.consecutivo}
                                            service={service}
                                            currentUserRole={profile?.rol}
                                            onDelete={handleDeleteService}
                                            onClick={(s) => router.push(`/ver-servicio/${s.id}`)}
                                            onAssignMac={(s) => setAssigningMacService(s)}
                                            onCerrarService={(s) => setClosingService(s)}
                                        />
                                ))}
                            </AnimatePresence>
                        </div>
                        
                        {/* Pagination Controls */}
                        {filteredServices.length > itemsPerPage && (
                            <div className="flex items-center justify-center gap-4 py-4">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                                >
                                    Anterior
                                </button>
                                <span className="text-sm font-medium text-slate-500">
                                    Página {currentPage} de {Math.ceil(filteredServices.length / itemsPerPage)}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredServices.length / itemsPerPage), p + 1))}
                                    disabled={currentPage >= Math.ceil(filteredServices.length / itemsPerPage)}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                                >
                                    Siguiente
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Modal de Asignación MAC */}
            <AnimatePresence>
                {assigningMacService && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setAssigningMacService(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col"
                        >
                            <div className="p-8 pb-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
                                        <Users className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Asignar Asesor MAC</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{assigningMacService.consecutivo}</p>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                    Selecciona un asesor para el seguimiento de esta garantía.
                                </p>
                            </div>

                            <div className="flex-1 overflow-y-auto max-h-[400px] p-4 flex flex-col gap-2">
                                {macAdvisors.map(mac => (
                                    <button
                                        key={mac.id}
                                        onClick={() => handleAssignMac(mac.id, mac.display_name)}
                                        disabled={isUpdatingMac}
                                        className="flex items-center gap-4 p-4 rounded-3xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group text-left"
                                    >
                                        <div className="w-12 h-12 bg-slate-100 rounded-2xl overflow-hidden shadow-inner shrink-0">
                                            <img 
                                                src={mac.url_foto || 'https://lnphhmowklqiomownurw.supabase.co/storage/v1/object/public/publico/fotos/withoutphoto.png'} 
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-black text-slate-700 leading-tight">{mac.display_name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{mac.rol || 'Asesor MAC'}</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                                    </button>
                                ))}
                                {macAdvisors.length === 0 && (
                                    <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                        <p className="text-sm font-bold text-slate-400">No se encontraron usuarios mac</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-slate-50 flex items-center justify-center">
                                <button
                                    onClick={() => setAssigningMacService(null)}
                                    className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600 transition-colors"
                                >
                                    Cancelar operación
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ModalCerrarServicio
                isOpen={!!closingService}
                onClose={() => setClosingService(null)}
                onSuccess={() => {
                    // Update local state to remove closed service
                    setServices(prev => prev.filter(s => s.id !== closingService.id));
                    setClosingService(null);
                }}
                service={closingService}
                currentUser={profile}
            />
        </div>
    );
}

function StatusLegendItem({ color, label }: { color: string, label: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm shadow-sm" style={{ backgroundColor: color }} />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{label}</span>
        </div>
    );
}
