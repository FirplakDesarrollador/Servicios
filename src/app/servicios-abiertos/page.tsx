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
    Headphones
} from 'lucide-react';
import ServiceCard from '@/components/servicios-abiertos/ServiceCard';

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
            setProfile(userData);

            // Fetch Services
            console.log('Fetching services from Servicios table...');

            // Query query_servicios view as it contains all joined data
            const { data: servicesData, error: servicesError } = await supabase
                .from('query_servicios')
                .select('*')
                .eq('estado', true)
                .order('created_at', { ascending: false });

            if (servicesError) {
                console.error('Error fetching services:', JSON.stringify(servicesError, null, 2));
            }

            if (servicesData) {
                console.log('Data found:', servicesData.length, 'records');
                // console.log('Raw services data:', servicesData); // Debug log removed
                // console.log('First record sample:', servicesData[0]); // Debug log removed

                // Map view fields for UI compatibility
                const mappedServices = servicesData.map((s: any) => ({
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
                    // Add formatted scheduled date for easier display
                    fechaProgramada: s.visita_fecha_hora_inicio ? new Date(s.visita_fecha_hora_inicio).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Null'
                }));

                setServices(mappedServices);
                setFilteredServices(mappedServices);
            }

            // Fetch Technicians
            const { data: techData } = await supabase
                .from('Usuarios')
                .select('*')
                .in('rol', [
                    'tecnico',
                    'coordinador_tecnico',
                    'asesor_tecnico',
                    'promotor_tecnico',
                    'promotor_tecnico_exhibiciones',
                    'promotor_tecnico_comercial'
                ])
                .order('display_name');
            setTechnicians(techData || []);

            // Fetch MAC Advisors
            const { data: macData } = await supabase
                .from('Usuarios')
                .select('*')
                .eq('rol', 'mac')
                .not('user_id', 'is', null)
                .order('display_name');
            setMacAdvisors(macData || []);

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
                (s.numeroDePedido?.toLowerCase().includes(lowerSearch)) ||
                (s.ubicacionNombre?.toLowerCase().includes(lowerSearch)) ||
                (s.consumidorNombre?.toLowerCase().includes(lowerSearch)) ||
                (s.asesorNombre?.toLowerCase().includes(lowerSearch)) ||
                (s.tecnicoNombre?.toLowerCase().includes(lowerSearch)) ||
                (s.macNombre?.toLowerCase().includes(lowerSearch)) ||
                (s.coordinadorNombre?.toLowerCase().includes(lowerSearch)) ||
                (s.ubicacionCiudad?.toLowerCase().includes(lowerSearch)) ||
                (s.tipoDeServicio?.toLowerCase().includes(lowerSearch))
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
    }, [searchTerm, filterDate, filterStatus, filterTechnician, filterMacAdvisor, showUnassignedOnly, services]);

    const handleClearFilters = () => {
        setSearchTerm('');
        setFilterDate('');
        setFilterStatus('');
        setFilterTechnician('');
        setFilterMacAdvisor('');
        setShowUnassignedOnly(false);
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

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportCSV}
                            className="bg-white/10 hover:bg-white/20 p-2.5 rounded-2xl transition-all flex items-center gap-2 text-xs font-black uppercase"
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
                            <div className="flex-1 bg-slate-50 rounded-2xl p-1 flex items-center justify-between px-3 h-[44px]">
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
                    <div className="grid grid-cols-1 gap-2">
                        <AnimatePresence mode='popLayout'>
                            {filteredServices.map(service => (
                                <ServiceCard
                                    key={service.id || service.consecutivo}
                                    service={service}
                                    currentUserRole={profile?.rol}
                                    onDelete={handleDeleteService}
                                    onClick={(s) => router.push(`/ver-servicio/${s.id}`)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </main>
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
