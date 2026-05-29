'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
    ArrowLeft,
    Loader2,
    AlertCircle,
    FileText,
    Calendar,
    User,
    MapPin,
    Package,
    Mail,
    Phone,
    DollarSign,
    CreditCard,
    ExternalLink,
    Image as ImageIcon,
    UserPlus,
    PlusCircle
} from 'lucide-react';
import { InfoField, InfoSection } from '@/components/InfoField';
import { motion, AnimatePresence } from 'framer-motion';
import ModalCrearClienteFinal from '@/components/base-de-datos/ModalCrearClienteFinal';
import SolicitarServicioPage from '@/app/solicitar-servicio/page';

type TabType = 'detalle' | 'crear_cliente' | 'solicitar_servicio';

export default function DetalleSolicitudClientePage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [solicitud, setSolicitud] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<TabType>('detalle');

    const tabs = [
        { id: 'detalle' as TabType, label: 'Detalle de Solicitud', icon: FileText },
        { id: 'crear_cliente' as TabType, label: 'Crear Cliente', icon: UserPlus },
        { id: 'solicitar_servicio' as TabType, label: 'Solicitar Servicio', icon: PlusCircle },
    ];

    const fetchSolicitud = useCallback(async () => {
        if (!id) return;
        
        try {
            const { data, error } = await supabase
                .from('solicitudes_clientes')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setSolicitud(data);
        } catch (error) {
            console.error('Error fetching solicitud:', error);
            alert('Error al cargar la solicitud');
            router.push('/solicitudes-clientes');
        } finally {
            setLoading(false);
        }
    }, [id, router]);

    useEffect(() => {
        fetchSolicitud();
    }, [fetchSolicitud]);

    const formatDate = (date: string) => {
        if (!date) return '---';
        return new Date(date).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount: number) => {
        if (!amount) return '---';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-brand animate-spin" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cargando detalle...</p>
            </div>
        );
    }

    if (!solicitud) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
                <h2 className="text-2xl font-black text-slate-800 mb-2">Solicitud no encontrada</h2>
                <button
                    onClick={() => router.push('/solicitudes-clientes')}
                    className="text-brand hover:underline font-bold"
                >
                    Volver a lista de solicitudes
                </button>
            </div>
        );
    }

    const DocumentViewer = ({ url, label, icon: Icon }: { url: string, label: string, icon: any }) => {
        if (!url) return null;
        
        const isImage = url.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/) != null;

        return (
            <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
                <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
                    <div className="w-10 h-10 rounded-xl bg-brand/5 flex items-center justify-center text-brand">
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-700 uppercase">{label}</h3>
                        <a 
                            href={url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[10px] font-black uppercase tracking-widest text-brand hover:underline flex items-center gap-1"
                        >
                            Ver en nueva pestaña <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
                {isImage ? (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                        <img 
                            src={url} 
                            alt={label} 
                            className="w-full h-full object-contain"
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                        <FileText className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-sm font-medium text-slate-500">Documento PDF o Archivo</p>
                        <a 
                            href={url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="mt-4 px-4 py-2 bg-brand text-white rounded-lg text-xs font-bold hover:bg-brand/90 transition-colors"
                        >
                            Abrir Documento
                        </a>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-4 h-[60px] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/solicitudes-clientes')}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors active:scale-90"
                        >
                            <ArrowLeft className="w-6 h-6 text-slate-600" />
                        </button>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none mb-1">
                                Solicitud Cliente Final
                            </span>
                            <h1 className="text-lg font-black text-brand leading-none">
                                Detalle de Solicitud #{solicitud.id}
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="max-w-4xl mx-auto px-4">
                    <div className="flex gap-8 overflow-x-auto scrollbar-hide">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex items-center gap-2 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap
                                        ${isActive 
                                            ? 'border-brand text-brand' 
                                            : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'}
                                    `}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 md:p-6 pb-20">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-6"
                    >
                        {activeTab === 'detalle' && (
                            <>
                                {/* General Information */}
                                <InfoSection title="Información General">
                                    <InfoField label="Fecha de Registro" value={formatDate(solicitud.created_at)} icon={Calendar} />
                                    <InfoField label="Tipo de Servicio" value={solicitud.tipodeservicio} icon={Package} />
                                    <InfoField label="Grupo de Producto" value={solicitud.grupo_producto} />
                                    <InfoField label="Medidas" value={solicitud.medidas} />
                                    <InfoField label="Valor Pagado" value={formatCurrency(solicitud.valor_pagar)} icon={DollarSign} />
                                </InfoSection>

                                {/* Client Information */}
                                <InfoSection title="Datos del Cliente">
                                    <InfoField label="Nombre / Razón Social" value={solicitud.nombre_razon_social} icon={User} fullWidth />
                                    <InfoField label="Tipo de Persona" value={solicitud.tipo_persona} />
                                    <InfoField label="Identificación (RUT/Cédula)" value={solicitud.numeroid} />
                                    <InfoField label="Persona de Contacto" value={solicitud.persona_contacto} />
                                    <InfoField label="Teléfono" value={solicitud.telefono} icon={Phone} />
                                    <InfoField label="Correo Electrónico" value={solicitud.correo_electronico} icon={Mail} />
                                    <InfoField label="Ciudad" value={solicitud.ciudad} icon={MapPin} />
                                    <InfoField label="Dirección" value={solicitud.direccion} fullWidth />
                                </InfoSection>

                                {/* Attachments Section */}
                                {(solicitud.rut_url || solicitud.factura_url || solicitud.soporte_pago_url) && (
                                    <div className="space-y-4">
                                        <h2 className="text-xs font-bold text-brand uppercase tracking-widest pl-1 mt-6">Documentos Adjuntos</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {solicitud.soporte_pago_url && (
                                                <DocumentViewer 
                                                    url={solicitud.soporte_pago_url} 
                                                    label="Soporte de Pago" 
                                                    icon={CreditCard} 
                                                />
                                            )}
                                            {solicitud.factura_url && (
                                                <DocumentViewer 
                                                    url={solicitud.factura_url} 
                                                    label="Factura" 
                                                    icon={FileText} 
                                                />
                                            )}
                                            {solicitud.rut_url && (
                                                <DocumentViewer 
                                                    url={solicitud.rut_url} 
                                                    label="RUT / Cédula" 
                                                    icon={ImageIcon} 
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === 'crear_cliente' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="max-w-2xl mx-auto"
                            >
                                <ModalCrearClienteFinal
                                    isInline={true}
                                    onSuccess={(nuevoCliente) => {
                                        alert('Cliente creado exitosamente');
                                        setActiveTab('detalle');
                                    }}
                                    initialData={{
                                        cedula: solicitud.numeroid,
                                        contacto: solicitud.nombre_razon_social,
                                        ciudad: solicitud.ciudad,
                                        direccion: solicitud.direccion,
                                        telefono: solicitud.telefono,
                                        correo_electronico: solicitud.correo_electronico,
                                    }}
                                />
                            </motion.div>
                        )}

                        {activeTab === 'solicitar_servicio' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 relative">
                                    <h2 className="text-sm font-black text-brand uppercase tracking-widest px-4 pt-2 pb-6 border-b border-slate-100 mb-4 flex items-center gap-2">
                                        <Package className="w-4 h-4" />
                                        Generar Nuevo Servicio
                                    </h2>
                                    <div className="bg-[#F1F5F9] rounded-[1.5rem] overflow-hidden">
                                        <SolicitarServicioPage 
                                            isInline={true} 
                                            defaultSolicitudId={solicitud.id} 
                                            onSuccess={() => {
                                                alert('Servicio generado exitosamente.');
                                                setActiveTab('detalle');
                                            }} 
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>

        </div>
    );
}
