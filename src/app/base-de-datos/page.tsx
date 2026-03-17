'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
    ArrowLeft, 
    RefreshCw, 
    Search, 
    Plus, 
    Building2, 
    Users as UsersIcon, 
    Warehouse, 
    UserCheck,
    Loader2,
    Database,
    MapPin,
    Calendar,
    Hash,
    MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ModalCrearCiudad from '@/components/base-de-datos/ModalCrearCiudad';
import ModalCrearCliente from '@/components/base-de-datos/ModalCrearCliente';
import ModalCrearSala from '@/components/base-de-datos/ModalCrearSala';
import ModalCrearClienteFinal from '@/components/base-de-datos/ModalCrearClienteFinal';

export default function BaseDatosPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [fetching, setFetching] = useState(false);
    const [activeTab, setActiveTab] = useState('Ciudades');
    const [busqueda, setBusqueda] = useState('');
    const [userRole, setUserRole] = useState('');
    const [isModalCiudadOpen, setIsModalCiudadOpen] = useState(false);
    const [isModalClienteOpen, setIsModalClienteOpen] = useState(false);
    const [isModalSalaOpen, setIsModalSalaOpen] = useState(false);
    const [isModalClienteFinalOpen, setIsModalClienteFinalOpen] = useState(false);

    // Data states
    const [data, setData] = useState<{
        Ciudades: any[];
        Clientes: any[];
        'Salas / Obras': any[];
        'Clientes Finales': any[];
    }>({
        Ciudades: [],
        Clientes: [],
        'Salas / Obras': [],
        'Clientes Finales': [],
    });

    const [hasMore, setHasMore] = useState<Record<string, boolean>>({
        Ciudades: true,
        Clientes: true,
        'Salas / Obras': true,
        'Clientes Finales': true,
    });

    const [loaded, setLoaded] = useState<Record<string, boolean>>({
        Ciudades: false,
        Clientes: false,
        'Salas / Obras': false,
        'Clientes Finales': false,
    });

    const isFetching = useRef(false);
    const dataRef = useRef(data);

    // Keep dataRef in sync
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    const PAGE_SIZE = 100;

    const fetchData = useCallback(async (tab: string, append = false, searchTerm = '') => {
        if (isFetching.current && !append) return;
        
        isFetching.current = true;
        setFetching(true);
        
        try {
            const currentData = dataRef.current[tab as keyof typeof data] || [];
            const from = append ? currentData.length : 0;
            const to = from + PAGE_SIZE - 1;

            let query;
            switch (tab) {
                case 'Ciudades':
                    query = supabase.from('query_ciudades').select('*', { count: 'exact' });
                    if (searchTerm) {
                        query = query.or(`ciudad.ilike.%${searchTerm}%,departamento.ilike.%${searchTerm}%,zona.ilike.%${searchTerm}%,coordinador_nombre.ilike.%${searchTerm}%`);
                    }
                    query = query.order('ciudad').range(from, to);
                    break;
                case 'Clientes':
                    query = supabase.from('Clientes').select('*', { count: 'exact' });
                    if (searchTerm) {
                        query = query.or(`nombre.ilike.%${searchTerm}%,nit.ilike.%${searchTerm}%`);
                    }
                    query = query.order('nombre').range(from, to);
                    break;
                case 'Salas / Obras':
                    query = supabase.from('query_ubicaciones_fast').select('*', { count: 'exact' });
                    if (searchTerm) {
                        query = query.or(`nombre.ilike.%${searchTerm}%,cliente_nombre.ilike.%${searchTerm}%,nit.ilike.%${searchTerm}%,direccion.ilike.%${searchTerm}%`);
                    }
                    query = query.order('cliente_nombre').range(from, to);
                    break;
                case 'Clientes Finales':
                    query = supabase.from('query_consumidores').select('*', { count: 'exact' });
                    if (searchTerm) {
                        query = query.or(`contacto.ilike.%${searchTerm}%,cedula.ilike.%${searchTerm}%,correo_electronico.ilike.%${searchTerm}%,telefono.ilike.%${searchTerm}%`);
                    }
                    query = query.order('contacto').range(from, to);
                    break;
                default:
                    isFetching.current = false;
                    setFetching(false);
                    return;
            }

            const { data: result, error, count } = await query;
            if (error) throw error;
            
            setData(prev => ({ 
                ...prev, 
                [tab]: append ? [...prev[tab as keyof typeof data], ...(result || [])] : (result || []) 
            }));

            if (count !== null) {
                setHasMore(prev => ({ ...prev, [tab]: (from + (result?.length || 0)) < count }));
            }
            setLoaded(prev => ({ ...prev, [tab]: true }));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            isFetching.current = false;
            setFetching(false);
        }
    }, []);

    useEffect(() => {
        const checkAccessAndLoad = async () => {
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

            if (!profile) {
                router.push('/');
                return;
            }

            setUserRole(profile.rol);

            await fetchData('Ciudades');
            setLoading(false);
        }

        checkAccessAndLoad();
    }, []);

    // Fetch data when switching tabs (initial load)
    useEffect(() => {
        if (!loading && !loaded[activeTab]) {
            fetchData(activeTab);
        }
    }, [activeTab, loading, loaded, fetchData]);

    // Handle Search with Debounce
    useEffect(() => {
        if (loading) return;

        const timer = setTimeout(() => {
            fetchData(activeTab, false, busqueda);
        }, 500);

        return () => clearTimeout(timer);
    }, [busqueda, activeTab, loading, fetchData]);

    const filteredData = useMemo(() => {
        return data[activeTab as keyof typeof data];
    }, [data, activeTab]);

    const tabs = [
        { name: 'Ciudades', icon: Building2 },
        { name: 'Clientes', icon: UsersIcon },
        { name: 'Salas / Obras', icon: Warehouse },
        { name: 'Clientes Finales', icon: UserCheck },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="relative w-16 h-16"
                >
                    <div className="absolute inset-0 border-4 border-brand/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-brand border-t-transparent rounded-full" />
                </motion.div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cargando Base de Datos...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header Premium */}
            <header className="fixed top-0 left-0 w-full bg-slate-900 text-white z-50 h-[4rem] flex items-center px-8 shadow-2xl border-b border-white/5">
                <button 
                    onClick={() => router.push('/')} 
                    className="mr-6 p-2.5 bg-white/5 hover:bg-brand rounded-xl transition-all active:scale-90"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand/20">
                        <Database className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-black text-lg tracking-tighter uppercase leading-none">Base de Datos</h1>
                        <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-1">Administración Central</p>
                    </div>
                </div>

                <div className="ml-auto flex items-center gap-4 text-white/40">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">Rol Actual</span>
                        <span className="text-xs text-brand font-bold uppercase tracking-tight">{userRole}</span>
                    </div>
                </div>
            </header>

            <main className="pt-24 px-6 max-w-[1600px] mx-auto pb-20">
                {/* Search & Actions Bar */}
                <div className="flex flex-col md:flex-row gap-6 mb-8 items-end justify-between bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200/50">
                    <div className="w-full md:max-w-md space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 flex items-center gap-2">
                            <Search className="w-3 h-3" />
                            Búsqueda Avanzada
                        </label>
                        <div className="relative group">
                            <input 
                                type="text"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Escribe para filtrar resultados..."
                                className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 text-slate-800 font-semibold placeholder:text-slate-400 focus:outline-none focus:border-brand/30 focus:bg-white transition-all group-hover:bg-white"
                            />
                            {fetching && (
                                <RefreshCw className="absolute right-4 top-4 w-6 h-6 text-brand animate-spin" />
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button 
                            onClick={() => fetchData(activeTab)}
                            className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                            title="Refrescar datos"
                        >
                            <RefreshCw className={`w-5 h-5 ${fetching ? 'animate-spin text-brand' : ''}`} />
                        </button>
                        <button 
                            onClick={() => {
                                if (activeTab === 'Ciudades') {
                                    setIsModalCiudadOpen(true);
                                } else if (activeTab === 'Clientes') {
                                    setIsModalClienteOpen(true);
                                } else if (activeTab === 'Salas / Obras') {
                                    setIsModalSalaOpen(true);
                                } else if (activeTab === 'Clientes Finales') {
                                    setIsModalClienteFinalOpen(true);
                                }
                            }}
                            className="flex-1 md:flex-none h-14 bg-brand text-white px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-brand/20 shadow-brand/40 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
                        >
                            <Plus className="w-5 h-5" />
                            Crear {activeTab.slice(0, -1)}
                        </button>
                    </div>
                </div>

                {/* Tabs Interface */}
                <div className="flex flex-wrap gap-2 mb-8 bg-slate-100/50 p-2 rounded-[2rem] w-fit border border-slate-200/50">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.name;
                        return (
                            <button
                                key={tab.name}
                                onClick={() => setActiveTab(tab.name)}
                                className={`
                                    relative px-8 py-4 rounded-[1.5rem] flex items-center gap-3 transition-all
                                    ${isActive ? 'text-white font-black' : 'text-slate-500 font-bold hover:text-slate-800'}
                                `}
                            >
                                {isActive && (
                                    <motion.div 
                                        layoutId="activeTabBase"
                                        className="absolute inset-0 bg-brand rounded-[1.5rem] shadow-lg shadow-brand/20"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <Icon className={`w-5 h-5 relative z-10 transition-transform ${isActive ? 'scale-110' : ''}`} />
                                <span className="relative z-10 text-xs uppercase tracking-widest">{tab.name}</span>
                                {isActive && (
                                    <span className="relative z-10 bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
                                        {filteredData.length}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Data Grid */}
                <div className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-200/50 overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="p-2"
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-separate border-spacing-y-2 px-6">
                                    <thead>
                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest h-16">
                                            {renderTableHeaders(activeTab)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredData.length > 0 ? (
                                            filteredData.map((item, idx) => (
                                                <motion.tr 
                                                    key={item.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className="group hover:bg-slate-50 transition-colors"
                                                >
                                                    {renderTableRows(activeTab, item)}
                                                </motion.tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={10} className="py-20 text-center">
                                                    <div className="flex flex-col items-center gap-4 text-slate-300">
                                                        <Search className="w-16 h-16 opacity-20" />
                                                        <p className="font-black uppercase tracking-tighter text-2xl">No se encontraron resultados</p>
                                                        <p className="text-sm font-medium">Intenta buscando con otra palabra clave</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Load More Button */}
                            {hasMore[activeTab] && (
                                <div className="p-8 flex justify-center border-t border-slate-100">
                                    <button
                                        onClick={() => fetchData(activeTab, true, busqueda)}
                                        disabled={fetching}
                                        className="px-10 h-14 bg-slate-100 hover:bg-brand hover:text-white text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3 group"
                                    >
                                        {fetching ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                                                Cargar más resultados
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Modals */}
            <ModalCrearCiudad 
                isOpen={isModalCiudadOpen}
                onClose={() => setIsModalCiudadOpen(false)}
                onSuccess={() => fetchData('Ciudades')}
            />

            <ModalCrearCliente 
                isOpen={isModalClienteOpen}
                onClose={() => setIsModalClienteOpen(false)}
                onSuccess={() => fetchData('Clientes')}
            />

            <ModalCrearSala 
                isOpen={isModalSalaOpen}
                onClose={() => setIsModalSalaOpen(false)}
                onSuccess={() => fetchData('Salas / Obras')}
            />

            <ModalCrearClienteFinal
                isOpen={isModalClienteFinalOpen}
                onClose={() => setIsModalClienteFinalOpen(false)}
                onSuccess={() => fetchData('Clientes Finales')}
            />
        </div>
    );
}

function renderTableHeaders(tab: string) {
    switch (tab) {
        case 'Ciudades':
            return (
                <>
                    <th className="pl-6 w-16">ID</th>
                    <th>Ciudad</th>
                    <th>País</th>
                    <th>Departamento</th>
                    <th>Zona</th>
                    <th>Coordinador</th>
                    <th>Creado</th>
                    <th className="pr-6 text-right">Acciones</th>
                </>
            );
        case 'Clientes':
            return (
                <>
                    <th className="pl-6 w-16">ID</th>
                    <th>Nombre</th>
                    <th>NIT</th>
                    <th>Tipo</th>
                    <th>Creado</th>
                    <th className="pr-6 text-right">Acciones</th>
                </>
            );
        case 'Salas / Obras':
            return (
                <>
                    <th className="pl-6 w-16">ID</th>
                    <th>Sala / Obra</th>
                    <th>Cliente</th>
                    <th>Ciudad</th>
                    <th>Creado</th>
                    <th className="pr-6 text-right">Acciones</th>
                </>
            );
        case 'Clientes Finales':
            return (
                <>
                    <th className="pl-6 w-16">ID</th>
                    <th>Nombre</th>
                    <th>Documento</th>
                    <th>Correo</th>
                    <th>Teléfono</th>
                    <th>Ciudad</th>
                    <th className="pr-6 text-right">Acciones</th>
                </>
            );
        default:
            return null;
    }
}

function renderTableRows(tab: string, item: any) {
    const cellClass = "py-5 text-sm font-bold text-slate-700 bg-white/50 first:rounded-l-2xl last:rounded-r-2xl border-y border-slate-100 first:border-l last:border-r transition-colors group-hover:bg-white group-hover:border-brand/10 group-hover:shadow-lg group-hover:shadow-slate-200/50 group-hover:-translate-y-0.5";
    
    const formatDate = (date: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    switch (tab) {
        case 'Ciudades':
            return (
                <>
                    <td className={`${cellClass} pl-6 font-black text-slate-400 text-xs`}>#{item.id}</td>
                    <td className={cellClass}>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-slate-400" />
                            </div>
                            <span className="text-slate-900">{item.ciudad}</span>
                        </div>
                    </td>
                    <td className={cellClass}>{item.pais}</td>
                    <td className={cellClass}>{item.departamento}</td>
                    <td className={cellClass}>
                        <span className="px-3 py-1 bg-brand/5 text-brand rounded-full text-[10px] font-black uppercase tracking-widest italic">
                            {item.zona}
                        </span>
                    </td>
                    <td className={cellClass}>
                        <div className="flex flex-col">
                            <span className="text-xs uppercase font-black">{item.coordinador_nombre}</span>
                            <span className="text-[10px] text-slate-400 font-bold">{item.coordinador_correo}</span>
                        </div>
                    </td>
                    <td className={cellClass}>
                        <div className="flex items-center gap-2 text-slate-400">
                            <Calendar className="w-3 h-3" />
                            <span className="text-xs">{formatDate(item.created_at)}</span>
                        </div>
                    </td>
                    <td className={`${cellClass} pr-6 text-right`}>
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand transition-colors">
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                    </td>
                </>
            );
        case 'Clientes':
            return (
                <>
                    <td className={`${cellClass} pl-6 font-black text-slate-400 text-xs`}>#{item.id}</td>
                    <td className={cellClass}>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                                <UsersIcon className="w-4 h-4 text-indigo-400" />
                            </div>
                            <span className="text-slate-900 uppercase font-black tracking-tight">{item.nombre}</span>
                        </div>
                    </td>
                    <td className={`${cellClass} font-mono text-xs tracking-widest`}>{item.nit}</td>
                    <td className={cellClass}>
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                            {item.tipo_de_cliente}
                        </span>
                    </td>
                    <td className={cellClass}>
                        <div className="flex items-center gap-2 text-slate-400">
                            <Calendar className="w-3 h-3" />
                            <span className="text-xs">{formatDate(item.created_at)}</span>
                        </div>
                    </td>
                    <td className={`${cellClass} pr-6 text-right`}>
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                    </td>
                </>
            );
        case 'Salas / Obras':
            return (
                <>
                    <td className={`${cellClass} pl-6 font-black text-slate-400 text-xs`}>#{item.id}</td>
                    <td className={cellClass}>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                                <Warehouse className="w-4 h-4 text-emerald-400" />
                            </div>
                            <span className="text-slate-900 font-bold">{item.nombre || item.cliente_nombre || 'SALA/OBRA SIN NOMBRE'}</span>
                        </div>
                    </td>
                    <td className={cellClass}>
                        <div className="flex items-center gap-2">
                            <UsersIcon className="w-3 h-3 text-slate-300" />
                            <span className="text-xs font-bold text-slate-500 uppercase">{item.cliente_nombre}</span>
                        </div>
                    </td>
                    <td className={cellClass}>
                        <div className="flex items-center gap-2">
                             <MapPin className="w-3 h-3 text-emerald-400" />
                             <span>{item.ciudad}</span>
                        </div>
                    </td>
                    <td className={cellClass}>
                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(item.created_at)}</span>
                        </div>
                    </td>
                    <td className={`${cellClass} pr-6 text-right`}>
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors">
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                    </td>
                </>
            );
        case 'Clientes Finales':
            return (
                <>
                    <td className={`${cellClass} pl-6 font-black text-slate-400 text-xs`}>#{item.id}</td>
                    <td className={cellClass}>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center">
                                <UserCheck className="w-4 h-4 text-rose-400" />
                            </div>
                            <span className="text-slate-900 font-bold uppercase">{item.contacto || item.nombre}</span>
                        </div>
                    </td>
                    <td className={`${cellClass} font-mono text-xs tracking-widest`}>{item.cedula}</td>
                    <td className={cellClass}>
                        <span className="text-slate-500 font-medium text-xs">{item.correo_electronico}</span>
                    </td>
                    <td className={cellClass}>
                        <span className="text-slate-800 font-bold text-xs">{item.telefono}</span>
                    </td>
                    <td className={cellClass}>
                        <div className="flex items-center gap-2">
                             <MapPin className="w-3 h-3 text-rose-400" />
                             <span>{item.ciudad}</span>
                        </div>
                    </td>
                    <td className={`${cellClass} pr-6 text-right`}>
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors">
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                    </td>
                </>
            );
        default:
            return null;
    }
}
