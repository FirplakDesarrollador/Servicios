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
    Loader2,
    Plus,
    X,
    FileText,
    Tag,
    Hash,
    Globe,
    Check,
    Calendar,
    User as UserIcon,
    Pencil,
    Building2,
    MapPin,
    Phone,
    Package,
    Trash2,
    MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BuscadorClientes from '@/components/solicitar-servicio/BuscadorClientes';
import BuscadorProductos from '@/components/solicitar-servicio/BuscadorProductos';

export default function RegistroSolicitudPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [fetching, setFetching] = useState(false);
    const [solicitudes, setSolicitudes] = useState<any[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [userRole, setUserRole] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [radicado, setRadicado] = useState('');
    const [tipoSolicitud, setTipoSolicitud] = useState('');
    const [ordenVenta, setOrdenVenta] = useState('');
    const [canalVenta, setCanalVenta] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Client selection states
    const [primaryCliente, setPrimaryCliente] = useState<any>(null);
    const [finalCliente, setFinalCliente] = useState<any>(null);
    const [hasFinalCliente, setHasFinalCliente] = useState(false);
    const [showBuscador, setShowBuscador] = useState(false);
    const [buscadorType, setBuscadorType] = useState<'primary' | 'final'>('primary');

    // Product selection states
    const [productosCompra, setProductosCompra] = useState<any[]>([]);
    const [productosNovedad, setProductosNovedad] = useState<any[]>([]);
    const [showBuscadorCompra, setShowBuscadorCompra] = useState(false);
    const [showBuscadorNovedad, setShowBuscadorNovedad] = useState(false);
    const [comentarios, setComentarios] = useState('');

    const fetchSolicitudes = useCallback(async (searchTerm = '') => {
        setFetching(true);
        try {
            let query = supabase.from('registro_solicitudes').select('*');
            
            if (searchTerm) {
                query = query.or(`consecutivo.ilike.%${searchTerm}%,tipo_solicitud.ilike.%${searchTerm}%,orden_venta.ilike.%${searchTerm}%,canal_venta.ilike.%${searchTerm}%,cliente_nombre.ilike.%${searchTerm}%,cliente_final_nombre.ilike.%${searchTerm}%`);
            }
            
            const { data, error } = await query.order('created_at', { ascending: false });
            
            if (error) throw error;
            setSolicitudes(data || []);
        } catch (error: any) {
            console.error('Error fetching solicitudes:', error.message || error);
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

    const openModal = () => {
        let maxNum = 0;
        solicitudes.forEach(s => {
            if (s.consecutivo && s.consecutivo.startsWith('RAD-')) {
                const num = parseInt(s.consecutivo.replace('RAD-', ''), 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }
        });
        const nextConsecutivo = `RAD-${String(maxNum + 1).padStart(4, '0')}`;
        
        setRadicado(nextConsecutivo);
        setTipoSolicitud('');
        setOrdenVenta('');
        setCanalVenta('');
        setPrimaryCliente(null);
        setFinalCliente(null);
        setHasFinalCliente(false);
        setProductosCompra([]);
        setProductosNovedad([]);
        setComentarios('');
        setErrorMessage('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tipoSolicitud) {
            setErrorMessage('Por favor seleccione el Tipo de solicitud');
            return;
        }
        if (!ordenVenta) {
            setErrorMessage('Por favor ingrese la Orden de venta');
            return;
        }
        if (!canalVenta) {
            setErrorMessage('Por favor seleccione el Canal de venta');
            return;
        }

        // Validate client selections
        const needsPrimary = ['Canal Distribuidor', 'Canal Exportador', 'Canal Constructor'].includes(canalVenta);
        if (needsPrimary && !primaryCliente) {
            setErrorMessage(`Por favor seleccione el ${
                canalVenta === 'Canal Distribuidor' ? 'Cliente Distribuidor' : 
                canalVenta === 'Canal Exportador' ? 'Cliente Exportador' : 'Cliente Constructor'
            }`);
            return;
        }

        const needsFinal = ['Canal Propio Firplakhome', 'Canal Propio eCommerce'].includes(canalVenta) || hasFinalCliente;
        if (needsFinal && !finalCliente) {
            setErrorMessage('Por favor seleccione el Cliente Final');
            return;
        }

        setSubmitting(true);
        setErrorMessage('');

        try {
            const { error } = await supabase
                .from('registro_solicitudes')
                .insert({
                    consecutivo: radicado,
                    tipo_solicitud: tipoSolicitud,
                    orden_venta: ordenVenta,
                    canal_venta: canalVenta,
                    cliente_id: primaryCliente ? primaryCliente.id : null,
                    cliente_nombre: primaryCliente ? primaryCliente.cliente_nombre : null,
                    cliente_final_id: finalCliente ? finalCliente.id : null,
                    cliente_final_nombre: finalCliente ? finalCliente.cliente_nombre : null,
                    productos_compra: productosCompra,
                    productos_novedad: productosNovedad,
                    comentarios: comentarios,
                });

            if (error) throw error;

            await fetchSolicitudes();
            setIsModalOpen(false);
        } catch (err: any) {
            console.error('Error saving solicitud:', err);
            setErrorMessage(err.message || 'Error al guardar la solicitud');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (date: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTipoColor = (type: string) => {
        switch (type) {
            case 'Garantía': return 'bg-orange-500 text-white';
            case 'Documento Sagrilaft': return 'bg-indigo-500 text-white';
            case 'Reclamo': return 'bg-rose-500 text-white';
            case 'Atención': return 'bg-teal-500 text-white';
            default: return 'bg-slate-500 text-white';
        }
    };

    const showPrimarySearch = ['Canal Distribuidor', 'Canal Exportador', 'Canal Constructor'].includes(canalVenta);
    const showFinalSearchToggle = ['Canal Distribuidor', 'Canal Exportador', 'Canal Constructor'].includes(canalVenta);
    const showDirectFinalSearch = ['Canal Propio Firplakhome', 'Canal Propio eCommerce'].includes(canalVenta);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-brand animate-spin" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cargando Registro...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header: Height 50px, Dark Slate Brand Color */}
            <header className="fixed top-0 left-0 w-full bg-brand text-white z-50 h-[50px] flex items-center px-4 shadow-md">
                <button 
                    onClick={() => router.push('/')} 
                    className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90"
                >
                    <ArrowLeft className="w-7 h-7" />
                </button>
                <div className="ml-4 flex items-center gap-4">
                    <h1 className="font-bold text-xl tracking-tight">Registro de solicitudes</h1>
                </div>

                <div className="ml-auto flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60 bg-white/10 px-3 py-1 rounded-full">
                        {solicitudes.length} Radicados
                    </span>
                    <button 
                        onClick={openModal}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-md flex items-center gap-1.5"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Registrar Solicitud
                    </button>
                </div>
            </header>

            <main className="pt-[50px] max-w-4xl mx-auto pb-20">
                {/* Search Header */}
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
                                        placeholder="Buscar por radicado, tipo, orden, canal o cliente..."
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

                {/* List Container */}
                <div className="px-6 space-y-4">
                    <AnimatePresence mode="popLayout">
                        {solicitudes.length > 0 ? (
                            solicitudes.map((sol) => (
                                <motion.div
                                    key={sol.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 hover:border-brand/30 hover:shadow-md transition-all group relative overflow-hidden"
                                >
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand opacity-0 group-hover:opacity-100 transition-opacity" />

                                    {/* Top Row */}
                                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50">
                                        <div className="flex items-center gap-3">
                                            <div className="px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-xs font-black tracking-widest uppercase">
                                                {sol.consecutivo}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter leading-none">Fecha de Radicación</span>
                                                <span className="text-xs font-bold text-slate-600">{formatDate(sol.created_at)}</span>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getTipoColor(sol.tipo_solicitud)}`}>
                                            {sol.tipo_solicitud}
                                        </span>
                                    </div>

                                    {/* Fields Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                <Hash className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Orden de Venta</span>
                                                <span className="text-sm font-black text-slate-800">{sol.orden_venta}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                <Globe className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Canal de Venta</span>
                                                <span className="text-sm font-black text-slate-800 uppercase">{sol.canal_venta}</span>
                                            </div>
                                        </div>

                                        {sol.cliente_nombre && (
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                    <UserIcon className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                        {sol.canal_venta === 'Canal Distribuidor' && 'Distribuidor'}
                                                        {sol.canal_venta === 'Canal Exportador' && 'Exportador'}
                                                        {sol.canal_venta === 'Canal Constructor' && 'Constructor'}
                                                    </span>
                                                    <span className="text-sm font-black text-slate-800 uppercase leading-snug">{sol.cliente_nombre}</span>
                                                </div>
                                            </div>
                                        )}

                                        {sol.cliente_final_nombre && (
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                    <UserIcon className="w-4 h-4 text-emerald-500" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cliente Final</span>
                                                    <span className="text-sm font-black text-slate-800 uppercase leading-snug">{sol.cliente_final_nombre}</span>
                                                </div>
                                            </div>
                                        )}

                                        {sol.productos_compra && Array.isArray(sol.productos_compra) && sol.productos_compra.length > 0 && (
                                            <div className="flex items-start gap-3 col-span-1 md:col-span-2 border-t border-slate-50 pt-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                                                    <Package className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Productos de Compra ({sol.productos_compra.length})</span>
                                                    <span className="text-xs font-black text-slate-700 truncate uppercase mt-0.5">
                                                        {sol.productos_compra.map((p: any) => p.sku).join(', ')}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {sol.productos_novedad && Array.isArray(sol.productos_novedad) && sol.productos_novedad.length > 0 && (
                                            <div className="flex items-start gap-3 col-span-1 md:col-span-2 border-t border-slate-50 pt-3">
                                                <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                                                    <Package className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Productos con Novedad ({sol.productos_novedad.length})</span>
                                                    <span className="text-xs font-black text-slate-700 truncate uppercase mt-0.5">
                                                        {sol.productos_novedad.map((p: any) => p.sku).join(', ')}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {sol.comentarios && (
                                            <div className="flex items-start gap-3 col-span-1 md:col-span-2 border-t border-slate-50 pt-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                                    <MessageSquare className="w-4 h-4 text-slate-500" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Comentarios</span>
                                                    <span className="text-xs font-medium text-slate-600 mt-0.5 whitespace-pre-wrap leading-relaxed">
                                                        {sol.comentarios}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="py-20 text-center"
                            >
                                <div className="flex flex-col items-center gap-4 text-slate-300">
                                    <Calendar className="w-16 h-16 opacity-20" />
                                    <p className="font-bold text-slate-400">No se encontraron radicados registrados</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Fetching overlay */}
            <AnimatePresence>
                {fetching && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed bottom-8 right-8 bg-white shadow-2xl rounded-2xl border border-slate-100 p-4 flex items-center gap-3 z-50"
                    >
                        <RefreshCw className="w-5 h-5 text-brand animate-spin" />
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Actualizando...</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal Form */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !submitting && setIsModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-[2rem] w-full max-w-5xl p-8 shadow-2xl relative border border-slate-100 z-10 mx-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
                        >
                            <button
                                disabled={submitting}
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="mb-6">
                                <h3 className="text-2xl font-black text-brand tracking-tight">Registrar Solicitud</h3>
                                <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Mesa de ayuda Firplak</p>
                            </div>

                            {errorMessage && (
                                <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-600 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-rose-600 rounded-full shrink-0" />
                                    {errorMessage}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Radicado Field (Disabled) */}
                                    <div className="flex flex-col gap-1.5 relative">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 font-black">Número de Radicado (Consecutivo)</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <input
                                                type="text"
                                                value={radicado}
                                                disabled
                                                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 text-sm font-bold text-slate-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Tipo de Solicitud */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 font-black">Tipo de Solicitud *</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                                <Tag className="w-4 h-4" />
                                            </div>
                                            <select
                                                value={tipoSolicitud}
                                                onChange={(e) => setTipoSolicitud(e.target.value)}
                                                required
                                                className="w-full h-11 bg-white border border-slate-200 rounded-xl pl-11 pr-10 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="">Seleccione una opción...</option>
                                                <option value="Garantía">Garantía</option>
                                                <option value="Documento Sagrilaft">Documento Sagrilaft</option>
                                                <option value="Reclamo">Reclamo</option>
                                                <option value="Atención">Atención</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Orden de Venta */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 font-black">Orden de venta *</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                                <Hash className="w-4 h-4" />
                                            </div>
                                            <input
                                                type="text"
                                                value={ordenVenta}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (/^\d*$/.test(val)) setOrdenVenta(val);
                                                }}
                                                required
                                                placeholder="Digite el número de orden de venta..."
                                                className="w-full h-11 bg-white border border-slate-200 rounded-xl pl-11 pr-4 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Canal de Venta */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 font-black">Canal de venta *</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                                <Globe className="w-4 h-4" />
                                            </div>
                                            <select
                                                value={canalVenta}
                                                onChange={(e) => {
                                                    setCanalVenta(e.target.value);
                                                    setPrimaryCliente(null);
                                                    setFinalCliente(null);
                                                    setHasFinalCliente(false);
                                                }}
                                                required
                                                className="w-full h-11 bg-white border border-slate-200 rounded-xl pl-11 pr-10 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="">Seleccione una opción...</option>
                                                <option value="Canal Distribuidor">Canal Distribuidor</option>
                                                <option value="Canal Exportador">Canal Exportador</option>
                                                <option value="Canal Constructor">Canal Constructor</option>
                                                <option value="Canal Propio Firplakhome">Canal Propio Firplakhome</option>
                                                <option value="Canal Propio eCommerce">Canal Propio eCommerce</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Dynamic Client Fields based on selected channel */}
                                {canalVenta && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                        {/* Primary Client Search (Distributor / Exporter / Constructor) */}
                                        {showPrimarySearch && (
                                            <div className="flex flex-col gap-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                {primaryCliente ? (
                                                    <div className="mt-2 flex flex-col gap-3">
                                                        {/* Header with edit/plus */}
                                                        <div className="flex items-center justify-between">
                                                             <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">
                                                                 <UserIcon className="w-3.5 h-3.5 text-slate-800" />
                                                                 {canalVenta === 'Canal Distribuidor' && 'Cliente Distribuidor'}
                                                                 {canalVenta === 'Canal Exportador' && 'Cliente Exportador'}
                                                                 {canalVenta === 'Canal Constructor' && 'Cliente Constructor'}
                                                             </div>
                                                             <div className="flex items-center gap-1.5">
                                                                 <button
                                                                     type="button"
                                                                     onClick={() => {
                                                                         setBuscadorType('primary');
                                                                         setShowBuscador(true);
                                                                     }}
                                                                     className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all"
                                                                 >
                                                                     <Pencil className="w-3 h-3" />
                                                                     EDITAR
                                                                 </button>
                                                                 <button
                                                                     type="button"
                                                                     onClick={() => {
                                                                         setBuscadorType('primary');
                                                                         setShowBuscador(true);
                                                                     }}
                                                                     className="w-5 h-5 border border-slate-300 hover:border-slate-800 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-800 active:scale-90 transition-all"
                                                                 >
                                                                     <Plus className="w-3 h-3" />
                                                                 </button>
                                                             </div>
                                                        </div>

                                                         {/* Main client name */}
                                                         <div className="border-2 border-slate-900 bg-slate-50/20 rounded-xl p-3.5 text-center">
                                                             <span className="text-xs font-black text-slate-900 uppercase tracking-wide block truncate">
                                                                 {primaryCliente.cliente_nombre}
                                                             </span>
                                                         </div>

                                                         {/* Details box */}
                                                         <div className="bg-slate-100/50 rounded-xl p-3.5 space-y-2 border border-slate-100/80">
                                                             <div className="flex items-center justify-between text-[10px] font-bold py-0.5">
                                                                 <div className="flex items-center gap-1.5 text-slate-400 font-black uppercase tracking-widest">
                                                                     <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                                     DIRECCIÓN
                                                                 </div>
                                                                 <span className="text-slate-700 text-right truncate max-w-[60%] font-black uppercase">
                                                                     {primaryCliente.direccion || 'N/A'}
                                                                 </span>
                                                             </div>
                                                             <div className="flex items-center justify-between text-[10px] font-bold py-0.5">
                                                                 <div className="flex items-center gap-1.5 text-slate-400 font-black uppercase tracking-widest">
                                                                     <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                                     TELÉFONO
                                                                 </div>
                                                                 <span className="text-slate-700 text-right truncate max-w-[60%] font-black">
                                                                     {primaryCliente.telefono || 'N/A'}
                                                                 </span>
                                                             </div>
                                                             <div className="flex items-center justify-between text-[10px] font-bold py-0.5">
                                                                 <div className="flex items-center gap-1.5 text-slate-400 font-black uppercase tracking-widest">
                                                                     <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                                                     CONTACTO
                                                                 </div>
                                                                 <span className="text-slate-700 text-right truncate max-w-[60%] font-black uppercase">
                                                                     {primaryCliente.nombre_contacto || primaryCliente.contacto || 'N/A'}
                                                                 </span>
                                                             </div>
                                                         </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                                                            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                                            {canalVenta === 'Canal Distribuidor' && 'Cliente Distribuidor'}
                                                            {canalVenta === 'Canal Exportador' && 'Cliente Exportador'}
                                                            {canalVenta === 'Canal Constructor' && 'Cliente Constructor'}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setBuscadorType('primary');
                                                                setShowBuscador(true);
                                                            }}
                                                            className="mt-2 w-full py-4 border-2 border-dashed border-slate-200 hover:border-brand/40 hover:bg-brand/5 rounded-2xl transition-all font-bold text-xs text-slate-400 text-center flex items-center justify-center gap-1.5"
                                                        >
                                                            Presione para buscar cliente...
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Final Client Search (with toggle) */}
                                        {showFinalSearchToggle && (
                                            <div className="flex flex-col gap-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                {finalCliente ? (
                                                    <div className="flex flex-col gap-3">
                                                         <div className="flex items-center justify-between">
                                                             <div className="flex items-center gap-2">
                                                                 <div className="bg-emerald-50 w-7 h-7 rounded-full flex items-center justify-center shrink-0">
                                                                     <UserIcon className="w-4 h-4 text-emerald-500" />
                                                                 </div>
                                                                 <div className="flex flex-col">
                                                                     <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider leading-none">CLIENTE FINAL</span>
                                                                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-0.5">INFORMACIÓN DEL CONSUMIDOR</span>
                                                                 </div>
                                                             </div>
                                                             <div className="flex items-center gap-1.5">
                                                                 <button
                                                                     type="button"
                                                                     onClick={() => {
                                                                         setBuscadorType('final');
                                                                         setShowBuscador(true);
                                                                     }}
                                                                     className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all"
                                                                 >
                                                                     <Pencil className="w-3 h-3" />
                                                                     EDITAR
                                                                 </button>
                                                                 
                                                                 {/* Toggle Switch */}
                                                                 <button
                                                                     type="button"
                                                                     onClick={() => {
                                                                         const newVal = !hasFinalCliente;
                                                                         setHasFinalCliente(newVal);
                                                                         if (!newVal) setFinalCliente(null);
                                                                     }}
                                                                     className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${hasFinalCliente ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                                                 >
                                                                     <span
                                                                         className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${hasFinalCliente ? 'translate-x-4' : 'translate-x-0'}`}
                                                                     />
                                                                 </button>
                                                             </div>
                                                         </div>

                                                         {/* Main client name */}
                                                         <div className="border-2 border-emerald-500 bg-emerald-50/10 rounded-xl p-3.5 text-center">
                                                             <span className="text-xs font-black text-emerald-800 uppercase tracking-wide block truncate">
                                                                 {finalCliente.cliente_nombre}
                                                             </span>
                                                         </div>

                                                         {/* Details box */}
                                                         <div className="bg-emerald-50/20 rounded-xl p-3.5 space-y-2 border border-emerald-100/50">
                                                             <div className="flex items-center justify-between text-[10px] font-bold py-0.5">
                                                                 <div className="flex items-center gap-1.5 text-emerald-600 font-black uppercase tracking-widest">
                                                                     <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                                                                     CIUDAD
                                                                 </div>
                                                                 <span className="text-slate-700 text-right truncate max-w-[60%] font-black uppercase">
                                                                     {finalCliente.ciudad || 'N/A'}
                                                                 </span>
                                                             </div>
                                                             <div className="flex items-center justify-between text-[10px] font-bold py-0.5">
                                                                 <div className="flex items-center gap-1.5 text-emerald-600 font-black uppercase tracking-widest">
                                                                     <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                                                                     DIRECCIÓN
                                                                 </div>
                                                                 <span className="text-slate-700 text-right truncate max-w-[60%] font-black uppercase">
                                                                     {finalCliente.direccion || 'N/A'}
                                                                 </span>
                                                             </div>
                                                             <div className="flex items-center justify-between text-[10px] font-bold py-0.5">
                                                                 <div className="flex items-center gap-1.5 text-emerald-600 font-black uppercase tracking-widest">
                                                                     <Phone className="w-3.5 h-3.5 text-emerald-500" />
                                                                     TELÉFONO
                                                                 </div>
                                                                 <span className="text-slate-700 text-right truncate max-w-[60%] font-black">
                                                                     {finalCliente.telefono || 'N/A'}
                                                                 </span>
                                                             </div>
                                                         </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                                                                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                                                Cliente Final
                                                            </div>
                                                            
                                                            {/* Toggle Switch */}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newVal = !hasFinalCliente;
                                                                    setHasFinalCliente(newVal);
                                                                    if (!newVal) setFinalCliente(null);
                                                                }}
                                                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${hasFinalCliente ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                                            >
                                                                <span
                                                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${hasFinalCliente ? 'translate-x-4' : 'translate-x-0'}`}
                                                                />
                                                            </button>
                                                        </div>

                                                        <span className={`text-[9px] font-black uppercase tracking-wider mt-0.5 ${hasFinalCliente ? 'text-brand' : 'text-slate-400'}`}>
                                                            {hasFinalCliente ? 'CON CLIENTE FINAL' : 'SIN CLIENTE FINAL'}
                                                        </span>

                                                        {hasFinalCliente && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setBuscadorType('final');
                                                                    setShowBuscador(true);
                                                                }}
                                                                className="mt-2 w-full py-4 border-2 border-dashed border-slate-200 hover:border-brand/40 hover:bg-brand/5 rounded-2xl transition-all font-bold text-xs text-slate-400 text-center flex items-center justify-center gap-1.5"
                                                            >
                                                                Presione para buscar cliente...
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Direct Channels: always show Cliente Final search directly */}
                                        {showDirectFinalSearch && (
                                            <div className="flex flex-col gap-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100 col-span-2">
                                                {finalCliente ? (
                                                    <div className="flex flex-col gap-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="bg-emerald-50 w-7 h-7 rounded-full flex items-center justify-center shrink-0">
                                                                    <UserIcon className="w-4 h-4 text-emerald-500" />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider leading-none">CLIENTE FINAL</span>
                                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-0.5">INFORMACIÓN DEL CONSUMIDOR</span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setBuscadorType('final');
                                                                    setShowBuscador(true);
                                                                }}
                                                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all"
                                                            >
                                                                <Pencil className="w-3 h-3" />
                                                                EDITAR
                                                            </button>
                                                        </div>

                                                        {/* Main client name */}
                                                        <div className="border-2 border-emerald-500 bg-emerald-50/10 rounded-xl p-3.5 text-center">
                                                            <span className="text-xs font-black text-emerald-800 uppercase tracking-wide block truncate">
                                                                {finalCliente.cliente_nombre}
                                                            </span>
                                                        </div>

                                                        {/* Details box */}
                                                        <div className="bg-emerald-50/20 rounded-xl p-3.5 space-y-2 border border-emerald-100/50">
                                                            <div className="flex items-center justify-between text-[10px] font-bold py-0.5">
                                                                <div className="flex items-center gap-1.5 text-emerald-600 font-black uppercase tracking-widest">
                                                                    <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                                                                    CIUDAD
                                                                </div>
                                                                <span className="text-slate-700 text-right truncate max-w-[60%] font-black uppercase">
                                                                    {finalCliente.ciudad || 'N/A'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-[10px] font-bold py-0.5">
                                                                <div className="flex items-center gap-1.5 text-emerald-600 font-black uppercase tracking-widest">
                                                                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                                                                    DIRECCIÓN
                                                                </div>
                                                                <span className="text-slate-700 text-right truncate max-w-[60%] font-black uppercase">
                                                                    {finalCliente.direccion || 'N/A'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-[10px] font-bold py-0.5">
                                                                <div className="flex items-center gap-1.5 text-emerald-600 font-black uppercase tracking-widest">
                                                                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                                                                    TELÉFONO
                                                                </div>
                                                                <span className="text-slate-700 text-right truncate max-w-[60%] font-black">
                                                                    {finalCliente.telefono || 'N/A'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                                                            <UserIcon className="w-3.5 h-3.5 text-emerald-500" />
                                                            Cliente Final (Canal Directo)
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setBuscadorType('final');
                                                                setShowBuscador(true);
                                                            }}
                                                            className="mt-2 w-full py-4 border-2 border-dashed border-slate-200 hover:border-brand/40 hover:bg-brand/5 rounded-2xl transition-all font-bold text-xs text-slate-400 text-center flex items-center justify-center gap-1.5"
                                                        >
                                                            Presione para buscar cliente...
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Product Selection Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
                                    {/* Seleccionar productos de compra */}
                                    <div className="flex flex-col gap-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">
                                                Productos de Compra
                                            </span>
                                            {productosCompra.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowBuscadorCompra(true)}
                                                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                    EDITAR
                                                </button>
                                            )}
                                        </div>

                                        {productosCompra.length > 0 ? (
                                            <div className="mt-2 space-y-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                                                {productosCompra.map((item, idx) => (
                                                    <div key={`compra-${idx}`} className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center gap-2">
                                                        <div className="flex-1 flex flex-col min-w-0">
                                                            <span className="text-xs font-bold text-slate-800">{item.sku}</span>
                                                            <span className="text-[9px] text-slate-400 font-semibold truncate uppercase leading-none mt-0.5">{item.nombre}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setProductosCompra(prev => prev.filter((_, i) => i !== idx));
                                                            }}
                                                            className="text-rose-500 hover:text-rose-700 p-1 rounded transition-colors"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setShowBuscadorCompra(true)}
                                                className="mt-2 w-full py-4 border-2 border-dashed border-slate-200 hover:border-brand/40 hover:bg-brand/5 rounded-2xl transition-all font-bold text-xs text-slate-400 text-center flex items-center justify-center gap-1.5"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Seleccionar productos de compra...
                                            </button>
                                        )}
                                    </div>

                                    {/* Productos con novedad */}
                                    <div className="flex flex-col gap-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">
                                                Productos con Novedad
                                            </span>
                                            {productosNovedad.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowBuscadorNovedad(true)}
                                                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                    EDITAR
                                                </button>
                                            )}
                                        </div>

                                        {productosNovedad.length > 0 ? (
                                            <div className="mt-2 space-y-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                                                {productosNovedad.map((item, idx) => (
                                                    <div key={`novedad-${idx}`} className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center gap-2">
                                                        <div className="flex-1 flex flex-col min-w-0">
                                                            <span className="text-xs font-bold text-slate-800">{item.sku}</span>
                                                            <span className="text-[9px] text-slate-400 font-semibold truncate uppercase leading-none mt-0.5">{item.nombre}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setProductosNovedad(prev => prev.filter((_, i) => i !== idx));
                                                            }}
                                                            className="text-rose-500 hover:text-rose-700 p-1 rounded transition-colors"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setShowBuscadorNovedad(true)}
                                                className="mt-2 w-full py-4 border-2 border-dashed border-slate-200 hover:border-brand/40 hover:bg-brand/5 rounded-2xl transition-all font-bold text-xs text-slate-400 text-center flex items-center justify-center gap-1.5"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Productos con novedad...
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Comments Field */}
                                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 font-black">Comentarios / Observaciones</label>
                                    <div className="relative">
                                        <div className="absolute top-3.5 left-3.5 text-slate-400">
                                            <MessageSquare className="w-4 h-4" />
                                        </div>
                                        <textarea
                                            value={comentarios}
                                            onChange={(e) => setComentarios(e.target.value)}
                                            placeholder="Escriba algún comentario o detalle adicional sobre la solicitud..."
                                            rows={3}
                                            className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all resize-none custom-scrollbar"
                                        />
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div className="pt-2 flex gap-3">
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 h-11 border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 h-11 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Guardando...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" />
                                                Registrar
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Buscador de Clientes Modal Pop-up */}
            <AnimatePresence>
                {showBuscador && (
                    <BuscadorClientes
                        canalVenta={buscadorType === 'primary' && canalVenta === 'Canal Constructor' ? 'canal_constructor' : 'canal_distribuidor'}
                        clienteTipoFilter={
                            buscadorType === 'final' ? undefined : (
                                canalVenta === 'Canal Distribuidor' || canalVenta === 'Canal Exportador' ? 'Distribuidor' : (
                                    canalVenta === 'Canal Constructor' ? 'Constructor' : (
                                        canalVenta === 'Canal Propio Firplakhome' ? 'Propio' : undefined
                                    )
                                )
                            )
                        }
                        onlyFinal={buscadorType === 'final'}
                        onClose={() => setShowBuscador(false)}
                        onSelect={(cliente) => {
                            if (buscadorType === 'primary') {
                                setPrimaryCliente(cliente);
                            } else {
                                setFinalCliente(cliente);
                            }
                            setShowBuscador(false);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Buscador de Productos de Compra Modal Pop-up */}
            <AnimatePresence>
                {showBuscadorCompra && (
                    <BuscadorProductos
                        productosSeleccionados={productosCompra}
                        onAdd={(prod) => {
                            setProductosCompra(prev => [...prev, prod]);
                        }}
                        onRemove={(idx) => {
                            setProductosCompra(prev => prev.filter((_, i) => i !== idx));
                        }}
                        onClose={() => setShowBuscadorCompra(false)}
                    />
                )}
            </AnimatePresence>

            {/* Buscador de Productos con Novedad Modal Pop-up */}
            <AnimatePresence>
                {showBuscadorNovedad && (
                    <BuscadorProductos
                        productosSeleccionados={productosNovedad}
                        onAdd={(prod) => {
                            setProductosNovedad(prev => [...prev, prod]);
                        }}
                        onRemove={(idx) => {
                            setProductosNovedad(prev => prev.filter((_, i) => i !== idx));
                        }}
                        onClose={() => setShowBuscadorNovedad(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
