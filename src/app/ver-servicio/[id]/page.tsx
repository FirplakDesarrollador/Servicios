'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Calendar,
    User,
    MessageSquare,
    CheckCircle,
    Link as LinkIcon,
    Settings as SettingsIcon,
    Info,
    Package,
    Loader2,
    AlertCircle,
    MapPin,
    Phone,
    FileText,
    Shield,
    Briefcase,
    Zap,
    Box,
    Clock,
    UserCheck,
    Lock,
    Unlock,
} from 'lucide-react';
import { InfoField, InfoSection } from '@/components/InfoField';
import ProductsModal from '@/components/ProductsModal';
import CommentModal from '@/components/CommentModal';

type TabType = 'informacion' | 'observaciones' | 'agendamiento' | 'aprobaciones' | 'servicios_relacionados' | 'solicitud_repuesto';

export default function VerServicioPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id;

    const [loading, setLoading] = useState(true);
    const [service, setService] = useState<any>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<TabType>('informacion');

    // Modal states
    const [showProductsModal, setShowProductsModal] = useState(false);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [refreshComments, setRefreshComments] = useState(0);

    const fetchService = useCallback(async () => {
        if (!id) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }

        // Fetch User Info
        const { data: userData } = await supabase
            .from('Usuarios')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
        setCurrentUser(userData);

        const { data, error } = await supabase
            .from('query_servicios')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching service:', error);
            alert('Error al cargar el servicio');
            router.push('/servicios-abiertos');
            return;
        }

        setService(data);
        setLoading(false);
    }, [id, router]);

    useEffect(() => {
        fetchService();
    }, [fetchService]);

    const tabs = useMemo(() => [
        { id: 'informacion' as TabType, label: 'Información', icon: Info },
        { id: 'observaciones' as TabType, label: 'Observaciones', icon: MessageSquare },
        { id: 'agendamiento' as TabType, label: 'Agendamiento', icon: Calendar },
        { id: 'aprobaciones' as TabType, label: 'Aprobaciones', icon: CheckCircle },
        { id: 'servicios_relacionados' as TabType, label: 'Servicios relacionados', icon: LinkIcon },
        { id: 'solicitud_repuesto' as TabType, label: 'Solicitud Repuesto', icon: SettingsIcon },
    ], []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <Loader2 className="w-12 h-12 text-brand animate-spin" />
                    <p className="text-slate-500 font-medium tracking-tight">Cargando detalles del servicio...</p>
                </motion.div>
            </div>
        );
    }

    if (!service) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
                <h2 className="text-2xl font-black text-slate-800 mb-2">Servicio no encontrado</h2>
                <button
                    onClick={() => router.push('/servicios-abiertos')}
                    className="text-brand hover:underline font-bold"
                >
                    Volver a servicios abiertos
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header */}
            <header className="bg-brand text-white shadow-xl px-4 py-4 md:py-6">
                <div className="max-w-7xl mx-auto flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2.5 hover:bg-white/10 active:bg-white/20 rounded-xl transition-all"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold tracking-tight">Detalles del servicio</h1>
                    <div className="hidden md:flex ml-auto items-center gap-3">
                        <span className="text-xs font-medium text-white/50 uppercase tracking-widest bg-white/5 py-1.5 px-3 rounded-lg border border-white/10">
                            {service.consecutivo}
                        </span>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs */}
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="flex overflow-x-auto scrollbar-hide px-4">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex items-center gap-2.5 px-5 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-all duration-300
                                        ${isActive
                                            ? 'border-brand text-brand bg-brand/[0.02]'
                                            : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                        }
                                    `}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-brand' : 'text-slate-400'}`} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto p-4 md:p-8">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'informacion' && (
                            <InformacionTab
                                service={service}
                                onShowProducts={() => setShowProductsModal(true)}
                            />
                        )}
                        {activeTab === 'observaciones' && (
                            <ObservacionesTab
                                service={service}
                                refreshTrigger={refreshComments}
                                onAddComment={() => setShowCommentModal(true)}
                            />
                        )}
                        {activeTab === 'agendamiento' && <AgendamientoTab service={service} />}
                        {activeTab === 'aprobaciones' && <AprobacionesTab service={service} />}
                        {activeTab === 'servicios_relacionados' && <ServiciosRelacionadosTab service={service} />}
                        {activeTab === 'solicitud_repuesto' && <SolicitudRepuestoTab service={service} />}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Modals */}
            <ProductsModal
                isOpen={showProductsModal}
                onClose={() => setShowProductsModal(false)}
                servicioId={service.id}
            />
            <CommentModal
                isOpen={showCommentModal}
                onClose={() => setShowCommentModal(false)}
                servicioId={service.id}
                currentUser={currentUser}
                onSuccess={() => setRefreshComments(prev => prev + 1)}
            />
        </div>
    );
}

function InformacionTab({ service, onShowProducts }: { service: any, onShowProducts: () => void }) {
    const isFacturado = service.facturado || false;
    const isAbierto = service.estado !== false; // Assuming state can be boolean as per flutter code

    return (
        <div className="space-y-8">
            {/* Action Bar / Status */}
            <div className="flex flex-wrap items-center gap-3">
                <div className={`
                    flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all duration-300
                    ${isAbierto
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700 shadow-sm shadow-emerald-700/5'
                        : 'bg-rose-50 border-rose-100 text-rose-700 shadow-sm shadow-rose-700/5'
                    }
                `}>
                    {isAbierto ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    <span className="text-sm font-bold tracking-tight">
                        {isAbierto ? 'Servicio abierto' : 'Servicio cerrado'}
                    </span>
                </div>

                {isFacturado && (
                    <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-2 rounded-2xl shadow-sm shadow-indigo-700/5 transition-all duration-300">
                        <Zap className="w-4 h-4" />
                        <span className="text-sm font-bold tracking-tight">Servicio facturado</span>
                    </div>
                )}

                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={onShowProducts}
                        className="flex items-center gap-2 hover:bg-slate-100 px-4 py-2 rounded-2xl transition-all group overflow-hidden relative"
                    >
                        <span className="text-sm font-bold text-slate-600">Productos</span>
                        <Package className="w-5 h-5 text-slate-400 group-hover:text-brand transition-colors" />
                        <motion.div className="absolute inset-0 bg-brand/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                </div>
            </div>

            {/* General Information */}
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <InfoField label="Consecutivo" value={service.consecutivo} icon={FileText} />
                    <InfoField
                        label="Fecha de creación"
                        value={service.created_at ? new Date(service.created_at).toLocaleDateString('es-ES', {
                            day: '2-digit', month: 'short', year: 'numeric'
                        }) : 'N/A'}
                        icon={Clock}
                    />
                    <InfoField label="Asesor comercial" value={service.asesor_nombre} icon={User} />
                    <InfoField label="Canal de venta" value={service.canal_de_venta} icon={Briefcase} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <InfoField label="Tipo de servicio" value={service.tipo_de_servicio} icon={Shield} editable />
                    <InfoField label="# de pedido o factura" value={service.numero_de_pedido} icon={Zap} editable />
                    <InfoField label="Coordinador de servicio" value={service.coordinador_nombre} icon={UserCheck} />
                    <InfoField label="Zona" value={service.zona || 'Suroccidente'} icon={MapPin} />
                </div>
            </div>

            {/* Canal Data Section */}
            <InfoSection title="Datos del canal" className="premium-shadow">
                <InfoField label={`Cliente ${service.canal_de_venta || ''}`} value={service.ubicacion_nombre} />
                <InfoField label="NIT" value={service.ubicacion_nit} />
                <InfoField label="Almacén" value={service.ubicacion_almacen} />
                <InfoField label="Departamento" value={service.ubicacion_departamento} />

                <InfoField label="Ciudad" value={service.ubicacion_ciudad} />
                <InfoField label="Dirección del almacén" value={service.ubicacion_direccion} fullWidth className="lg:col-span-1" />
                <InfoField label="Contacto del almacén" value={service.ubicacion_contacto} />
                <InfoField label="Teléfono contacto" value={service.ubicacion_telefono} icon={Phone} />
            </InfoSection>

            {/* Consumer Data Section */}
            {service.consumidor_contacto && (
                <InfoSection title="Datos del cliente final" className="premium-shadow bg-brand/[0.01]">
                    <InfoField label="Nombre" value={service.consumidor_contacto} icon={User} />
                    <InfoField label="Cédula" value={service.consumidor_cedula} />
                    <InfoField label="Teléfono" value={service.consumidor_telefono} icon={Phone} />
                    <InfoField label="Departamento" value={service.consumidor_departamento} />

                    <InfoField label="Ciudad" value={service.consumidor_ciudad} />
                    <InfoField label="Dirección" value={service.consumidor_direccion} fullWidth />
                </InfoSection>
            )}
        </div>
    );
}

function ObservacionesTab({ service, refreshTrigger, onAddComment }: { service: any, refreshTrigger: number, onAddComment: () => void }) {
    const [comentarios, setComentarios] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchComentarios = async () => {
            const { data, error } = await supabase
                .from('query_comentarios')
                .select('*')
                .eq('servicio_id', service.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching comentarios:', error);
            } else {
                setComentarios(data || []);
            }
            setLoading(false);
        };

        fetchComentarios();
    }, [service.id, refreshTrigger]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-brand animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-brand" />
                    Observaciones
                    <span className="ml-2 text-sm font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {comentarios.length}
                    </span>
                </h3>
                <button className="bg-brand text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                    Añadir observación
                </button>
            </div>

            {comentarios.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-slate-200" />
                    </div>
                    <p className="text-slate-500 font-medium tracking-tight">No hay observaciones registradas para este servicio.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {comentarios.map((comentario, index) => (
                        <motion.div
                            key={comentario.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white rounded-3xl border border-slate-100 p-6 premium-shadow"
                        >
                            <div className="flex items-start gap-4 mb-4">
                                {comentario.url_foto ? (
                                    <img src={comentario.url_foto} alt="" className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-50" />
                                ) : (
                                    <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center">
                                        <User className="w-6 h-6 text-brand" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="font-bold text-slate-800 tracking-tight">{comentario.display_name}</p>
                                            <p className="text-[11px] font-bold text-brand uppercase tracking-widest">{comentario.rol}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-semibold text-slate-400">
                                                {new Date(comentario.created_at).toLocaleDateString('es-ES', {
                                                    day: '2-digit', month: 'short'
                                                })}
                                            </p>
                                            <p className="text-[11px] font-medium text-slate-300">
                                                {new Date(comentario.created_at).toLocaleTimeString('es-ES', {
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pl-0 md:pl-16">
                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{comentario.contenido}</p>

                                {comentario.tipo && (
                                    <div className="mt-4">
                                        <span className="inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-100">
                                            {comentario.tipo}
                                        </span>
                                    </div>
                                )}

                                {comentario.documentos?.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {comentario.documentos.map((doc: string, idx: number) => (
                                            <a key={idx} href={doc} target="_blank" rel="noreferrer"
                                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 text-xs font-bold text-brand hover:bg-brand/5 border border-slate-100 transition-all">
                                                <Package className="w-3.5 h-3.5" />
                                                Adjunto {idx + 1}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

function AgendamientoTab({ service }: { service: any }) {
    return (
        <InfoSection title="Información de Agendamiento">
            <InfoField label="Estado" value={service.estado_visita || 'Sin agendar'} icon={Shield} />
            <InfoField label="Técnico asignado" value={service.tecnico_nombre || 'Sin asignar'} icon={UserCheck} />
            {service.visita_fecha_hora_inicio && (
                <InfoField
                    label="Fecha programada"
                    value={new Date(service.visita_fecha_hora_inicio).toLocaleString('es-ES', {
                        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                    icon={Calendar}
                    fullWidth
                />
            )}
        </InfoSection>
    );
}

function AprobacionesTab({ service }: { service: any }) {
    return (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center premium-shadow">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Aprobaciones</h3>
            <p className="text-slate-500 font-medium">No hay aprobaciones pendientes para este servicio.</p>
        </div>
    );
}

function ServiciosRelacionadosTab({ service }: { service: any }) {
    return (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center premium-shadow">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <LinkIcon className="w-8 h-8 text-slate-200" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Servicios Relacionados</h3>
            <p className="text-slate-500 font-medium">No hay servicios relacionados registrados.</p>
        </div>
    );
}

function SolicitudRepuestoTab({ service }: { service: any }) {
    return (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center premium-shadow">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <SettingsIcon className="w-8 h-8 text-slate-200" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Solicitud de Repuesto</h3>
            <p className="text-slate-500 font-medium">No hay solicitudes de repuesto para este servicio.</p>
        </div>
    );
}
