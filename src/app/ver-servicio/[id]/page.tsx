'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
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
    AlertCircle
} from 'lucide-react';

type TabType = 'informacion' | 'observaciones' | 'agendamiento' | 'aprobaciones' | 'servicios_relacionados' | 'solicitud_repuesto';

export default function VerServicioPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id;

    const [loading, setLoading] = useState(true);
    const [service, setService] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<TabType>('informacion');

    useEffect(() => {
        const fetchService = async () => {
            if (!id) return;

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

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
        };

        fetchService();
    }, [id, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <Loader2 className="w-12 h-12 text-brand animate-spin" />
                    <p className="text-slate-500 font-medium">Cargando servicio...</p>
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

    const tabs = [
        { id: 'informacion' as TabType, label: 'Información', icon: Info },
        { id: 'observaciones' as TabType, label: 'Observaciones', icon: MessageSquare },
        { id: 'agendamiento' as TabType, label: 'Agendamiento', icon: Calendar },
        { id: 'aprobaciones' as TabType, label: 'Aprobaciones', icon: CheckCircle },
        { id: 'servicios_relacionados' as TabType, label: 'Servicios relacionados', icon: LinkIcon },
        { id: 'solicitud_repuesto' as TabType, label: 'Solicitud Repuesto', icon: SettingsIcon },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header */}
            <header className="bg-[#455A64] text-white shadow-md px-4 py-3">
                <div className="max-w-7xl mx-auto flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-medium">Detalles del servicio</h1>
                </div>
            </header>

            {/* Tabs */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto">
                    <div className="flex overflow-x-auto scrollbar-hide">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                                        ? 'border-brand text-brand'
                                        : 'border-transparent text-slate-600 hover:text-slate-900'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Content */}
            <main className="max-w-7xl mx-auto p-4 md:p-6">
                {activeTab === 'informacion' && <InformacionTab service={service} />}
                {activeTab === 'observaciones' && <ObservacionesTab service={service} />}
                {activeTab === 'agendamiento' && <AgendamientoTab service={service} />}
                {activeTab === 'aprobaciones' && <AprobacionesTab service={service} />}
                {activeTab === 'servicios_relacionados' && <ServiciosRelacionadosTab service={service} />}
                {activeTab === 'solicitud_repuesto' && <SolicitudRepuestoTab service={service} />}
            </main>
        </div>
    );
}

function InformacionTab({ service }: { service: any }) {
    const isFacturado = service.es_facturado || false;
    const isConstructor = service.canal_de_venta === 'canal_constructor';

    return (
        <div className="space-y-6">
            {/* Status Badges */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg">
                    <Package className="w-4 h-4" />
                    <span className="text-sm font-medium">Servicio abierto</span>
                </div>
                {isFacturado && (
                    <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Es un servicio facturado</span>
                    </div>
                )}
                <div className="ml-auto flex items-center gap-2 text-slate-600">
                    <span className="text-sm font-medium">Productos</span>
                    <Package className="w-5 h-5" />
                </div>
            </div>

            {/* Main Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <InfoField label="Consecutivo" value={service.consecutivo} />
                <InfoField label="Fecha de creación" value={service.created_at ? new Date(service.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'} />
                <InfoField label="Asesor comercial" value={service.asesor_nombre} />
                <InfoField label="Canal de venta" value={service.canal_de_venta} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <InfoField label="Tipo de servicio" value={service.tipo_de_servicio} editable />
                <InfoField label="# de pedido o factura" value={service.numero_de_pedido} editable />
                <InfoField label="Coordinador de servicio" value={service.coordinador_nombre} />
                <InfoField label="Zona" value={service.zona || 'Suroccidente'} />
            </div>

            {/* Canal Data Section */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-base font-semibold text-slate-800 mb-4">Datos del canal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <InfoField label={`Cliente ${service.canal_de_venta || ''}`} value={service.ubicacion_nombre} />
                    <InfoField label="NIT" value={service.ubicacion_nit} />
                    <InfoField label="Almacén" value={service.ubicacion_almacen} />
                    <InfoField label="Departamento" value={service.ubicacion_departamento} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    <InfoField label="Ciudad" value={service.ubicacion_ciudad} />
                    <InfoField label="Dirección del almacén" value={service.ubicacion_direccion} />
                    <InfoField label="Contacto del almacén" value={service.ubicacion_contacto} />
                    <InfoField label="Teléfono contacto" value={service.ubicacion_telefono} />
                </div>
            </div>

            {/* Consumer Data Section (if available) */}
            {service.consumidor_contacto && (
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <h3 className="text-base font-semibold text-slate-800 mb-4">Datos del cliente final</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <InfoField label="Nombre" value={service.consumidor_contacto} />
                        <InfoField label="Cédula" value={service.consumidor_cedula} />
                        <InfoField label="Teléfono" value={service.consumidor_telefono} />
                        <InfoField label="Departamento" value={service.consumidor_departamento} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                        <InfoField label="Ciudad" value={service.consumidor_ciudad} />
                        <InfoField label="Dirección" value={service.consumidor_direccion} />
                    </div>
                </div>
            )}
        </div>
    );
}

function ObservacionesTab({ service }: { service: any }) {
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
    }, [service.id]);

    if (loading) {
        return (
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-brand animate-spin" />
                </div>
            </div>
        );
    }

    if (comentarios.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-base font-semibold text-slate-800 mb-4">Observaciones</h3>
                <p className="text-slate-600">No hay observaciones registradas para este servicio.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-base font-semibold text-slate-800">Observaciones ({comentarios.length})</h3>
            {comentarios.map((comentario) => (
                <div key={comentario.id} className="bg-white rounded-lg border border-slate-200 p-4">
                    {/* User Info Header */}
                    <div className="flex items-start gap-3 mb-3">
                        {comentario.url_foto ? (
                            <img
                                src={comentario.url_foto}
                                alt={comentario.display_name}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
                                <User className="w-5 h-5 text-brand" />
                            </div>
                        )}
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-slate-800">{comentario.display_name}</p>
                                    <p className="text-xs text-slate-500">{comentario.rol}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500">
                                        {new Date(comentario.created_at).toLocaleDateString('es-ES', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {new Date(comentario.created_at).toLocaleTimeString('es-ES', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Comment Content */}
                    <div className="pl-13">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{comentario.contenido}</p>

                        {/* Type Badge */}
                        {comentario.tipo && (
                            <div className="mt-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                                    {comentario.tipo}
                                </span>
                            </div>
                        )}

                        {/* Documents (if any) */}
                        {comentario.documentos && comentario.documentos.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {comentario.documentos.map((doc: string, idx: number) => (
                                    <a
                                        key={idx}
                                        href={doc}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs text-brand hover:underline"
                                    >
                                        <Package className="w-3 h-3" />
                                        Documento {idx + 1}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function AgendamientoTab({ service }: { service: any }) {
    return (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Información de Agendamiento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoField label="Estado" value={service.estado_visita || 'Sin agendar'} />
                <InfoField label="Técnico asignado" value={service.tecnico_nombre || 'Sin asignar'} />
                {service.visita_fecha_hora_inicio && (
                    <InfoField
                        label="Fecha programada"
                        value={new Date(service.visita_fecha_hora_inicio).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    />
                )}
            </div>
        </div>
    );
}

function AprobacionesTab({ service }: { service: any }) {
    return (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Aprobaciones</h3>
            <p className="text-slate-600">No hay aprobaciones pendientes para este servicio.</p>
        </div>
    );
}

function ServiciosRelacionadosTab({ service }: { service: any }) {
    return (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Servicios Relacionados</h3>
            <p className="text-slate-600">No hay servicios relacionados.</p>
        </div>
    );
}

function SolicitudRepuestoTab({ service }: { service: any }) {
    return (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Solicitud de Repuesto</h3>
            <p className="text-slate-600">No hay solicitudes de repuesto para este servicio.</p>
        </div>
    );
}

interface InfoFieldProps {
    label: string;
    value: string | null | undefined;
    editable?: boolean;
}

function InfoField({ label, value, editable = false }: InfoFieldProps) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">{label}</label>
            <div className={`bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-700 ${editable ? 'border border-slate-200' : ''}`}>
                {value || 'N/A'}
            </div>
        </div>
    );
}
