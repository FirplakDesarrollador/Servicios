'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfWeek, addDays, subDays, isSameDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    getNextDays, 
    formatDateES, 
    filterVisitasByDate, 
    countVisitasByDate,
    Visita
} from '@/lib/dateUtils';
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
    Download,
    Pencil,
    XCircle,
    CheckCircle2,
    Mail,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    Paperclip,
    Trash2,
    Save,
    Square,
    CheckSquare,
    Search,
    ChevronDown,
    Check,
} from 'lucide-react';
import { InfoField, InfoSection } from '@/components/InfoField';
import ProductsModal from '@/components/ProductsModal';
import CommentModal from '@/components/CommentModal';
import ModalCrearClienteFinal from '@/components/base-de-datos/ModalCrearClienteFinal';
import ModalEditCondebe from '@/components/ModalEditCondebe';
import ModalCerrarServicio from '@/components/servicios-abiertos/ModalCerrarServicio';

type TabType = 'informacion' | 'observaciones' | 'agendamiento' | 'aprobaciones' | 'servicios_relacionados' | 'solicitud_repuesto';

export default function VerServicioPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [service, setService] = useState<any>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<TabType>('informacion');

    // Modal states
    const [showProductsModal, setShowProductsModal] = useState(false);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [showEditConsumerModal, setShowEditConsumerModal] = useState(false);
    const [showEditCondebeModal, setShowEditCondebeModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [loadingInvoice, setLoadingInvoice] = useState(false);
    const [refreshComments, setRefreshComments] = useState(0);
    const [technicians, setTechnicians] = useState<any[]>([]);

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
        
        const fetchTechs = async () => {
            const { data } = await supabase
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
            setTechnicians(data || []);
        };
        fetchTechs();
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
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-slate-100 rounded-md transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </button>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none mb-1">Servicios Profesionales</span>
                            <h1 className="text-base font-bold text-slate-900 leading-none">Detalle del Servicio</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex flex-col items-end mr-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{service.consecutivo}</span>
                            <span className="text-xs font-medium text-slate-600">ID: {service.id}</span>
                        </div>
                        <div className={`
                            px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-2
                            ${service.estado !== false
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }
                        `}>
                            <div className={`w-1.5 h-1.5 rounded-full ${service.estado !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {service.estado !== false ? 'Abierto' : 'Cerrado'}
                        </div>
                        {service.facturado && (
                            <div className="px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-bold uppercase tracking-wider flex items-center gap-2">
                                <Zap className="w-3.5 h-3.5" />
                                Facturado
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="max-w-7xl mx-auto px-4">
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
                                            ? 'border-blue-600 text-blue-600' 
                                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
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

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto p-6">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                    >
                        {activeTab === 'informacion' && (
                            <InformacionTab
                                service={service}
                                onShowProducts={() => setShowProductsModal(true)}
                                onEditConsumer={() => setShowEditConsumerModal(true)}
                                onEditCondebe={() => setShowEditCondebeModal(true)}
                                onCloseService={() => setShowCloseModal(true)}
                            />
                        )}
                        {activeTab === 'observaciones' && (
                            <ObservacionesTab
                                service={service}
                                refreshTrigger={refreshComments}
                                onAddComment={() => setShowCommentModal(true)}
                                currentUser={currentUser}
                            />
                        )}
                        {activeTab === 'agendamiento' && (
                            <AgendamientoTab 
                                service={service} 
                                technicians={technicians}
                                onRefresh={fetchService}
                            />
                        )}
                        {activeTab === 'aprobaciones' && (
                            <AprobacionesTab 
                                service={service} 
                                currentUser={currentUser} 
                                onRefresh={fetchService}
                            />
                        )}
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
                consecutivo={service.consecutivo}
                currentUser={currentUser}
                onSuccess={() => setRefreshComments(prev => prev + 1)}
            />
            <ModalCrearClienteFinal
                isOpen={showEditConsumerModal}
                onClose={() => setShowEditConsumerModal(false)}
                onSuccess={() => {
                    fetchService(); // Actualizar datos después de editar
                }}
                initialData={service}
                serviceId={id}
            />
            <ModalEditCondebe
                isOpen={showEditCondebeModal}
                onClose={() => setShowEditCondebeModal(false)}
                onSuccess={() => {
                    fetchService(); // Actualizar datos después de editar
                }}
                serviceId={service.id}
                initialData={{
                    consecutivo: service.consecutivo,
                    tipo_de_servicio: service.tipo_de_servicio,
                    facturado: service.facturado
                }}
            />
            <ModalCerrarServicio
                isOpen={showCloseModal}
                onClose={() => setShowCloseModal(false)}
                onSuccess={() => {
                    fetchService(); // Refresh service data to reflect closed status
                    setShowCloseModal(false);
                }}
                service={service}
                currentUser={currentUser}
            />
        </div>
    );
}

function InformacionTab({ 
    service, 
    onShowProducts,
    onEditConsumer,
    onEditCondebe,
    onCloseService
}: { 
    service: any, 
    onShowProducts: () => void,
    onEditConsumer: () => void,
    onEditCondebe: () => void,
    onCloseService: () => void
}) {
    const router = useRouter();
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    <InfoSection title="Información General">
                        <InfoField 
                            label="Consecutivo" 
                            value={service.consecutivo} 
                            icon={FileText} 
                            rightElement={
                                <button
                                    onClick={onEditCondebe}
                                    className="p-1.5 hover:bg-slate-100 text-blue-600 rounded-md transition-colors"
                                    title="Editar"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                            }
                        />
                        <InfoField
                            label="Fecha Solicitud"
                            value={service.created_at ? new Date(service.created_at).toLocaleDateString('es-CO', {
                                day: '2-digit', month: 'short', year: 'numeric'
                            }) : '---'}
                            icon={Calendar}
                        />
                        <InfoField label="Asesor Comercial" value={service.asesor_nombre} icon={User} />
                        <InfoField label="Canal de Venta" value={service.canal_de_venta} icon={Briefcase} />
                        <InfoField label="Tipo de Servicio" value={service.tipo_de_servicio} icon={Shield} editable />
                        <InfoField label="Pedido / Factura" value={service.numero_de_pedido} icon={Zap} editable />
                        <InfoField label="Coordinador" value={service.coordinador_nombre} icon={UserCheck} />
                        <InfoField label="Zona de Atención" value={service.consumidor_zona || service.ubicacion_zona || 'Sin asignar'} icon={MapPin} />
                    </InfoSection>

                    {/* Canal Data Section */}
                    <InfoSection title="Datos del Canal / Distribuidor">
                        <InfoField label="Nombre" value={service.ubicacion_nombre} />
                        <InfoField label="NIT" value={service.ubicacion_nit} />
                        <InfoField label="Departamento" value={service.ubicacion_departamento} />
                        <InfoField label="Ciudad" value={service.ubicacion_ciudad} />
                        <InfoField label="Dirección" value={service.ubicacion_direccion} fullWidth />
                        <InfoField label="Contacto" value={service.ubicacion_contacto} />
                        <InfoField label="Teléfono" value={service.ubicacion_telefono} icon={Phone} />
                    </InfoSection>

                    {/* Consumer Data Section */}
                    {service.consumidor_contacto && (
                        <InfoSection 
                            title="Datos del Cliente Final" 
                            rightElement={
                                <button
                                    onClick={onEditConsumer}
                                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1.5"
                                >
                                    <Pencil className="w-3 h-3" />
                                    Editar Información
                                </button>
                            }
                        >
                            <InfoField label="Nombre" value={service.consumidor_contacto} icon={User} />
                            <InfoField label="Cédula" value={service.consumidor_cedula} />
                            <InfoField label="Teléfono" value={service.consumidor_telefono} icon={Phone} />
                            <InfoField label="Correo Electrónico" value={service.consumidor_correo} icon={Mail} />
                            <InfoField label="Departamento" value={service.consumidor_departamento} />
                            <InfoField label="Ciudad" value={service.consumidor_ciudad} />
                            <InfoField label="Dirección" value={service.consumidor_direccion} fullWidth />
                            <InfoField label="Descripción de la direccion" value={service.consumidor_descripcion_direccion} fullWidth />
                        </InfoSection>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Acciones Rápidas</h4>
                        <button
                            onClick={onShowProducts}
                            className="w-full h-12 flex items-center justify-center gap-3 bg-slate-900 text-white rounded-md text-sm font-semibold hover:bg-slate-800 transition-colors mb-3"
                        >
                            <Package className="w-4 h-4" />
                            Ver Productos
                        </button>

                        {service.estado === false && (
                            <button
                                onClick={() => router.push(`/solicitar-servicio?parent_id=${service.id}`)}
                                className="w-full h-12 flex items-center justify-center gap-3 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-700 transition-colors"
                            >
                                <LinkIcon className="w-4 h-4" />
                                Crear servicio enlazado
                            </button>
                        )}

                        {service.estado === true && (
                            <button
                                onClick={onCloseService}
                                className="w-full h-12 flex items-center justify-center gap-3 bg-rose-600 text-white rounded-md text-sm font-semibold hover:bg-rose-700 transition-colors mt-3"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Cerrar Servicio
                            </button>
                        )}
                    </div>


                </div>
            </div>
        </div>
    );
}

function ObservacionesTab({ service, refreshTrigger, onAddComment, currentUser }: { service: any, refreshTrigger: number, onAddComment: () => void, currentUser: any }) {
    const [comentarios, setComentarios] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const fetchComentarios = useCallback(async () => {
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
    }, [service.id]);

    useEffect(() => {
        fetchComentarios();
    }, [fetchComentarios, refreshTrigger]);

    const [showLightbox, setShowLightbox] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [editAttachments, setEditAttachments] = useState<string[]>([]);
    const [newAttachments, setNewAttachments] = useState<File[]>([]);
    const editFileInputRef = useRef<HTMLInputElement>(null);

    const allGalleryImages = useMemo(() => {
        const images: string[] = [];
        comentarios.forEach(c => {
            (c.documentos || []).forEach((doc: string) => {
                if (/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(doc)) {
                    images.push(doc);
                }
            });
        });
        return images;
    }, [comentarios]);

    const handleOpenLightbox = (imageUrl: string) => {
        const index = allGalleryImages.indexOf(imageUrl);
        if (index !== -1) {
            setLightboxIndex(index);
            setShowLightbox(true);
        }
    };

    const handleNext = useCallback(() => {
        setLightboxIndex((prev) => (prev + 1) % allGalleryImages.length);
    }, [allGalleryImages.length]);

    const handlePrev = useCallback(() => {
        setLightboxIndex((prev) => (prev - 1 + allGalleryImages.length) % allGalleryImages.length);
    }, [allGalleryImages.length]);

    useEffect(() => {
        if (!showLightbox) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') setShowLightbox(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showLightbox, handleNext, handlePrev]);

    const handleStartEdit = (comentario: any) => {
        setEditingId(comentario.id);
        setEditContent(comentario.contenido);
        setEditAttachments(comentario.documentos || []);
        setNewAttachments([]);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditContent('');
        setEditAttachments([]);
        setNewAttachments([]);
    };

    const handleRemoveExistingAttachment = (url: string) => {
        setEditAttachments(prev => prev.filter(item => item !== url));
    };

    const handleFileChangeEditing = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setNewAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const handleUpdateComment = async (id: number) => {
        if (!editContent.trim() && editAttachments.length === 0 && newAttachments.length === 0) return;
        setIsSaving(true);
        try {
            // 1. Upload new files if any
            let finalUrls = [...editAttachments];
            
            if (newAttachments.length > 0) {
                const uploadPromises = newAttachments.map(async (file) => {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${crypto.randomUUID()}.${fileExt}`;
                    
                    const sanitizePath = (path: string) => {
                        return path
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "")
                            .replace(/ñ/g, "n")
                            .replace(/Ñ/g, "N")
                            .replace(/[^a-zA-Z0-9\/\-_.]/g, "_");
                    };

                    const folderPath = sanitizePath(service.consecutivo || service.id.toString());
                    const filePath = `${folderPath}/documentos/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('servicios')
                        .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('servicios')
                        .getPublicUrl(filePath);

                    return publicUrl;
                });

                const uploadedUrls = await Promise.all(uploadPromises);
                finalUrls = [...finalUrls, ...uploadedUrls];
            }

            // 2. Update Database
            const { error } = await supabase
                .from('Comentarios')
                .update({ 
                    contenido: editContent,
                    documentos: finalUrls
                })
                .eq('id', id);

            if (error) throw error;
            
            handleCancelEdit();
            fetchComentarios();
        } catch (error) {
            console.error('Error updating comment:', error);
            alert('Error al actualizar el comentario');
        } finally {
            setIsSaving(false);
        }
    };

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
                <button 
                    onClick={onAddComment}
                    className="bg-brand text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
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
                    {comentarios.map((comentario, index) => {
                        const isAuthor = comentario.usuario_id === currentUser?.id;
                        const isServiceOpen = service.estado !== false;
                        const canEdit = isAuthor && isServiceOpen;
                        const isEditing = editingId === comentario.id;

                        return (
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
                                            <div className="flex items-start gap-4">
                                                {canEdit && !isEditing && (
                                                    <button 
                                                        onClick={() => handleStartEdit(comentario)}
                                                        className="text-[10px] font-bold text-blue-600 uppercase hover:underline"
                                                    >
                                                        Editar
                                                    </button>
                                                )}
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
                                </div>

                                <div className="pl-0 md:pl-16">
                                    {isEditing ? (
                                        <div className="space-y-4">
                                            <textarea
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                className="w-full min-h-[120px] p-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand/20 transition-all font-medium text-slate-700 resize-none"
                                                placeholder="Edita tu observación..."
                                                autoFocus
                                            />

                                            {/* Gestión de Adjuntos en Edición */}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between px-2">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gestionar adjuntos</span>
                                                    <button 
                                                        onClick={() => editFileInputRef.current?.click()}
                                                        className="flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
                                                    >
                                                        <Paperclip className="w-3.5 h-3.5" />
                                                        Añadir
                                                    </button>
                                                </div>

                                                <input 
                                                    type="file" 
                                                    multiple 
                                                    hidden 
                                                    ref={editFileInputRef}
                                                    onChange={handleFileChangeEditing}
                                                    accept="image/*,.pdf"
                                                />

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {/* Existentes */}
                                                    {editAttachments.map((url, idx) => (
                                                        <div key={`exist-${idx}`} className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                                                            {/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url) ? (
                                                                <img src={url} className="w-full h-full object-cover" alt="" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <Package className="w-6 h-6 text-slate-200" />
                                                                </div>
                                                            )}
                                                            <button 
                                                                onClick={() => handleRemoveExistingAttachment(url)}
                                                                className="absolute top-1 right-1 p-1.5 bg-rose-500 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                            <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/40 backdrop-blur-sm">
                                                                <p className="text-[8px] text-white font-bold text-center uppercase tracking-tighter">Existente</p>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* Nuevos */}
                                                    {newAttachments.map((file, idx) => (
                                                        <div key={`new-${idx}`} className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-dashed border-brand/20 bg-brand/5 flex flex-col items-center justify-center p-2 text-center">
                                                            {file.type.startsWith('image/') ? (
                                                                <Zap className="w-5 h-5 text-brand/30" />
                                                            ) : (
                                                                <Package className="w-5 h-5 text-brand/30" />
                                                            )}
                                                            <p className="text-[8px] font-bold text-brand/60 truncate w-full mt-1">{file.name}</p>
                                                            <button 
                                                                onClick={() => setNewAttachments(prev => prev.filter((_, i) => i !== idx))}
                                                                className="absolute top-1 right-1 p-1.5 bg-rose-500 text-white rounded-lg shadow-lg"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                            <div className="absolute bottom-0 left-0 right-0 p-1 bg-brand">
                                                                <p className="text-[8px] text-white font-bold text-center uppercase tracking-tighter">Nuevo</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateComment(comentario.id)}
                                                    disabled={isSaving || (!editContent.trim() && editAttachments.length === 0 && newAttachments.length === 0)}
                                                    className="px-8 py-3 text-xs font-black text-white bg-brand rounded-2xl shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Cambios'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{comentario.contenido}</p>

                                            {comentario.tipo && (
                                                <div className="mt-4">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-100">
                                                        {comentario.tipo}
                                                    </span>
                                                </div>
                                            )}

                                            {comentario.documentos?.length > 0 && (
                                                <div className="mt-4 flex flex-wrap gap-4">
                                                    {comentario.documentos.map((doc: string, idx: number) => {
                                                        const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(doc);
                                                        return isImage ? (
                                                            <button 
                                                                key={idx} 
                                                                onClick={() => handleOpenLightbox(doc)}
                                                                className="relative group block"
                                                            >
                                                                <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm group-hover:border-brand/40 group-hover:shadow-md transition-all">
                                                                    <img 
                                                                        src={doc} 
                                                                        alt={`Adjunto ${idx + 1}`}
                                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                                    />
                                                                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                        <Zap className="w-4 h-4 text-white drop-shadow-md" />
                                                                    </div>
                                                                </div>
                                                                <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-brand text-[8px] font-black text-white rounded-lg shadow-lg border-2 border-white">
                                                                    IMG
                                                                </span>
                                                            </button>
                                                        ) : (
                                                            <a 
                                                                key={idx} 
                                                                href={doc} 
                                                                target="_blank" 
                                                                rel="noreferrer"
                                                                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-brand/5 hover:text-brand border border-slate-100 transition-all shadow-sm"
                                                            >
                                                                <Package className="w-4 h-4" />
                                                                DOC {idx + 1}
                                                                <ExternalLink className="w-3 h-3 opacity-40" />
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Lightbox UI */}
            <AnimatePresence>
                {showLightbox && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 md:p-12"
                    >
                        <button 
                            onClick={() => setShowLightbox(false)}
                            className="absolute top-8 right-8 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-[210]"
                        >
                            <XCircle className="w-8 h-8" />
                        </button>

                        <div className="relative w-full h-full flex items-center justify-center">
                            {allGalleryImages.length > 1 && (
                                <>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                        className="absolute left-0 md:-left-12 p-6 text-white/40 hover:text-white transition-all"
                                    >
                                        <ChevronLeft className="w-12 h-12" />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                        className="absolute right-0 md:-right-12 p-6 text-white/40 hover:text-white transition-all"
                                    >
                                        <ChevronRight className="w-12 h-12" />
                                    </button>
                                </>
                            )}

                            <motion.img 
                                key={lightboxIndex}
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                src={allGalleryImages[lightboxIndex]} 
                                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                            />
                        </div>

                        <div className="mt-8 text-center space-y-2">
                            <p className="text-white font-black uppercase tracking-[0.3em] text-xs">Visualizando evidencia</p>
                            <p className="text-white/40 font-bold text-[10px] uppercase tracking-widest">
                                Imagen {lightboxIndex + 1} de {allGalleryImages.length} • Use las flechas del teclado
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function AgendamientoTab({ service, technicians, onRefresh }: { service: any, technicians: any[], onRefresh: () => void }) {
    const [aplicaTecnico, setAplicaTecnico] = useState(service.aplica_tecnico ?? true);
    const [selectedTechId, setSelectedTechId] = useState<number | null>(null);
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFin, setFechaFin] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [loadingVisit, setLoadingVisit] = useState(true);

    // Estados para el calendario de disponibilidad
    const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
        const now = new Date();
        return startOfWeek(now, { weekStartsOn: 1 });
    });
    const [techVisitas, setTechVisitas] = useState<Visita[]>([]);
    const [loadingAvailability, setLoadingAvailability] = useState(false);

    useEffect(() => {
        const fetchCurrentVisit = async () => {
            const { data } = await supabase
                .from('Visitas')
                .select('*')
                .eq('servicio_id', service.id)
                .eq('estado', true)
                .limit(1)
                .single();
            
            if (data) {
                setSelectedTechId(data.tecnico_id);
                if (data.fecha_hora_inicio) {
                    // Supabase devuelve "timestamp without time zone" sin 'Z'
                    // Añadimos 'Z' para interpretarlo como UTC y convertir a local
                    const raw = data.fecha_hora_inicio.endsWith('Z') 
                        ? data.fecha_hora_inicio 
                        : data.fecha_hora_inicio + 'Z';
                    const date = new Date(raw);
                    const formatted = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                    setFechaInicio(formatted);
                }
                if (data.fecha_hora_fin) {
                    const raw = data.fecha_hora_fin.endsWith('Z') 
                        ? data.fecha_hora_fin 
                        : data.fecha_hora_fin + 'Z';
                    const date = new Date(raw);
                    const formatted = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                    setFechaFin(formatted);
                }
            }
            setLoadingVisit(false);
        };
        fetchCurrentVisit();
    }, [service.id]);

    useEffect(() => {
        if (!selectedTechId) {
            setTechVisitas([]);
            return;
        }

        const fetchAvailability = async () => {
            setLoadingAvailability(true);
            try {
                const startRange = subDays(selectedWeekStart, 7);
                const endRange = addDays(selectedWeekStart, 14);

                const { data, error } = await supabase
                    .from('Visitas')
                    .select('*')
                    .eq('tecnico_id', selectedTechId)
                    .eq('estado', true)
                    .gte('fecha_hora_inicio', startRange.toISOString())
                    .lte('fecha_hora_inicio', endRange.toISOString());
                
                if (error) throw error;
                setTechVisitas(data || []);
            } catch (error) {
                console.error('Error fetching technician availability:', error);
            } finally {
                setLoadingAvailability(false);
            }
        };

        fetchAvailability();
    }, [selectedTechId, selectedWeekStart]);

    const timeSlots = useMemo(() => {
        const slots = [];
        for (let h = 5; h <= 18; h++) {
            slots.push(`${h.toString().padStart(2, '0')}:00`);
            slots.push(`${h.toString().padStart(2, '0')}:30`);
        }
        return slots;
    }, []);

    const weekDays = useMemo(() => {
        const monday = startOfWeek(selectedWeekStart, { weekStartsOn: 1 });
        return getNextDays(monday, 7);
    }, [selectedWeekStart]);

    const displayedDays = useMemo(() => {
        return getNextDays(selectedWeekStart, 4);
    }, [selectedWeekStart]);

    const isSlotOccupied = (day: Date, timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        const slotStart = new Date(day);
        slotStart.setHours(h, m, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + 30 * 60000);

        const dayVisitas = filterVisitasByDate(techVisitas, day);
        return dayVisitas.some(v => {
            if (!v.fecha_hora_inicio || !v.fecha_hora_fin) return false;
            const vStart = new Date(v.fecha_hora_inicio);
            const vEnd = new Date(v.fecha_hora_fin);
            return (slotStart < vEnd && slotEnd > vStart);
        });
    };

    const handleSelectSlot = (day: Date, timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        const clickedTime = new Date(day);
        clickedTime.setHours(h, m, 0, 0);

        const formatForInput = (date: Date) => {
            return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        };

        if (!fechaInicio) {
            setFechaInicio(formatForInput(clickedTime));
            setFechaFin(formatForInput(new Date(clickedTime.getTime() + 60 * 60000))); // Default 1h
            return;
        }

        const currentStart = new Date(fechaInicio);
        const currentEnd = new Date(fechaFin);

        // Si es un día diferente, reinicia el rango en ese día
        if (format(new Date(currentStart), 'yyyy-MM-dd') !== format(day, 'yyyy-MM-dd')) {
            setFechaInicio(formatForInput(clickedTime));
            setFechaFin(formatForInput(new Date(clickedTime.getTime() + 60 * 60000)));
            return;
        }

        if (clickedTime < currentStart) {
            setFechaInicio(formatForInput(clickedTime));
        } else {
            setFechaFin(formatForInput(new Date(clickedTime.getTime() + 30 * 60000)));
        }
    };

    const handleSave = async () => {
        if (aplicaTecnico && !selectedTechId) {
            alert('Por favor seleccione un técnico.');
            return;
        }

        setIsSaving(true);
        try {
            // ─── 1. Resolver coordinador a partir de la zona del técnico ───
            let finalCoordinadorId = service.coordinador_id;
            
            if (aplicaTecnico && selectedTechId) {
                const { data: techZone } = await supabase
                    .from('Zonas_tecnicos')
                    .select(`zona:Zonas ( coordinador_id )`)
                    .eq('tecnico_id', selectedTechId)
                    .limit(1)
                    .single();
                
                const coordId = (techZone as any)?.zona?.coordinador_id;
                if (coordId) finalCoordinadorId = coordId;
            }

            // ─── 2. Actualizar el servicio ───
            const { error: servError } = await supabase
                .from('Servicios')
                .update({ 
                    aplica_tecnico: aplicaTecnico,
                    coordinador_id: finalCoordinadorId
                })
                .eq('id', service.id);
            
            if (servError) throw new Error(`Error actualizando servicio: ${servError.message}`);

            // ─── 3. Guardar la Visita ───
            if (aplicaTecnico && selectedTechId) {
                // Convertir fechas locales (yyyy-MM-ddTHH:mm) a ISO UTC para Supabase
                const toISOForDB = (localStr: string): string | null => {
                    if (!localStr) return null;
                    // El valor del input datetime-local ya viene sin offset, 
                    // lo tratamos como hora local de Colombia (UTC-5)
                    return new Date(localStr).toISOString();
                };

                const visitData = {
                    tecnico_id: selectedTechId,
                    fecha_hora_inicio: toISOForDB(fechaInicio),
                    fecha_hora_fin: toISOForDB(fechaFin),
                    servicio_id: service.id,
                    nombre: service.consecutivo || `Servicio-${service.id}`,
                    estado: true,
                    recurrente: false,
                    reagendado: false,
                    personal: false
                };

                console.log('[AgendamientoTab] Guardando visita:', visitData);

                // Buscar si ya existe una visita activa para este servicio
                const { data: existingVisit, error: fetchError } = await supabase
                    .from('Visitas')
                    .select('id')
                    .eq('servicio_id', service.id)
                    .eq('estado', true)
                    .limit(1);

                if (fetchError) throw new Error(`Error buscando visita existente: ${fetchError.message}`);

                if (existingVisit && existingVisit.length > 0) {
                    // ── UPDATE ──
                    const { error: updateError } = await supabase
                        .from('Visitas')
                        .update(visitData)
                        .eq('id', existingVisit[0].id);
                    
                    if (updateError) throw new Error(`Error actualizando visita: ${updateError.message}`);
                    console.log('[AgendamientoTab] Visita actualizada, id:', existingVisit[0].id);
                } else {
                    // ── INSERT ──
                    const { error: insertError } = await supabase
                        .from('Visitas')
                        .insert([visitData]);
                    
                    if (insertError) throw new Error(`Error creando visita: ${insertError.message}`);
                    console.log('[AgendamientoTab] Visita creada correctamente');
                }
            } else {
                // Si no aplica técnico, desactivar visitas activas
                await supabase
                    .from('Visitas')
                    .update({ estado: false })
                    .eq('servicio_id', service.id);
            }

            alert('Agendamiento guardado correctamente.');
            onRefresh();
        } catch (error: any) {
            console.error('[AgendamientoTab] Error en handleSave:', error);
            alert(`Error al guardar: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (loadingVisit) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 text-brand animate-spin" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cargando agenda...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12 px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-brand" />
                        Gestión de Agendamiento
                    </h3>
                    <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">Asignación de personal técnico y horarios</p>
                </div>
                
                <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">¿Aplica Técnico?</span>
                    <button
                        onClick={() => setAplicaTecnico(!aplicaTecnico)}
                        className={`relative w-14 h-7 rounded-full transition-all duration-300 ${aplicaTecnico ? 'bg-brand' : 'bg-slate-200'} flex items-center px-1`}
                    >
                        <div className={`w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 transform ${aplicaTecnico ? 'translate-x-7' : 'translate-x-0'}`} />
                        {aplicaTecnico ? (
                            <Zap className="w-3 h-3 text-white absolute left-2 opacity-100 transition-opacity" />
                        ) : (
                            <Lock className="w-3 h-3 text-slate-400 absolute right-2 opacity-100 transition-opacity" />
                        )}
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {aplicaTecnico ? (
                    <motion.div
                        key="active"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-white rounded-[2.5rem] border border-slate-100 p-8 md:p-12 premium-shadow space-y-10"
                    >
                        <div className="space-y-6">
                            <label className="flex items-center gap-2 text-[10px] font-black text-brand uppercase tracking-widest ml-1">
                                <UserCheck className="w-4 h-4" />
                                Técnico Responsable
                            </label>
                            
                            <div className="relative max-w-2xl group">
                                <DropdownSingleSelect 
                                    options={technicians.map(t => ({ 
                                        id: t.id, 
                                        label: `${t.display_name} ${t.cedula ? `(${t.cedula})` : ''} - ${t.rol?.toUpperCase()}`,
                                        url_foto: t.url_foto,
                                        display_name: t.display_name,
                                        rol: t.rol
                                    }))}
                                    selectedId={selectedTechId}
                                    onChange={(id) => setSelectedTechId(id)}
                                    placeholder="Seleccione un técnico del listado..."
                                />
                            </div>
                        </div>

                        {/* ── Resumen del rango agendado ── */}
                        {fechaInicio && (
                            <div className="flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl">
                                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                                    <Calendar className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Rango agendado</p>
                                    <p className="text-sm font-black text-slate-800">
                                        {format(new Date(fechaInicio), "EEEE d 'de' MMMM", { locale: es })}
                                    </p>
                                    <p className="text-xs font-bold text-slate-600">
                                        {format(new Date(fechaInicio), 'HH:mm', { locale: es })} 
                                        {' → '}
                                        {fechaFin ? format(new Date(fechaFin), 'HH:mm', { locale: es }) : '...'}
                                        {fechaFin && (
                                            <span className="ml-2 text-emerald-600 text-[10px] font-bold">
                                                ({Math.round((new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / 60000)} min)
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setFechaInicio(''); setFechaFin(''); }}
                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                    title="Limpiar rango"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        {/* ── Calendario de disponibilidad ── */}
                        {selectedTechId && (
                            <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2">
                                    <div>
                                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-brand" />
                                            Disponibilidad del técnico
                                        </h4>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                                            {weekDays.map((day, idx) => {
                                                const isSelected = isSameDay(day, selectedWeekStart);
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setSelectedWeekStart(day)}
                                                        className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center transition-all ${
                                                            isSelected ? 'bg-brand text-white shadow-md' : 'text-slate-400 hover:bg-white hover:text-slate-600'
                                                        }`}
                                                    >
                                                        <span className="text-[7px] font-bold uppercase">{format(day, 'EEE', { locale: es }).substring(0, 1)}</span>
                                                        <span className="text-xs font-black">{format(day, 'd')}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                        
                                        <button 
                                            onClick={() => { setFechaInicio(''); setFechaFin(''); }}
                                            className="px-4 py-2 bg-amber-500 text-white text-[9px] font-black uppercase rounded-lg shadow-lg shadow-amber-500/20 hover:scale-105 transition-all"
                                        >
                                            Sin fecha
                                        </button>
                                    </div>
                                </div>

                                {loadingAvailability ? (
                                    <div className="h-96 flex flex-col items-center justify-center bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200 gap-4">
                                        <Loader2 className="w-8 h-8 animate-spin text-brand" />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Consultando agenda...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        {displayedDays.map((day, dIdx) => (
                                            <div key={dIdx} className="bg-slate-50/50 rounded-[1.5rem] p-3 flex flex-col border border-slate-100">
                                                <div className="text-center py-2 bg-white border border-slate-200 text-slate-800 rounded-xl shadow-sm mb-3">
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#254153] mb-0">{format(day, 'EEEE', { locale: es })}</p>
                                                    <p className="text-xs font-black tracking-tighter">{format(day, 'd \'de\' MMMM', { locale: es })}</p>
                                                </div>

                                                <div className="flex-1 h-[320px] overflow-y-auto pr-2 space-y-1.5 custom-scrollbar">
                                                    {timeSlots.map((time, tIdx) => {
                                                        const occupied = isSlotOccupied(day, time);
                                                        const slotDate = new Date(day);
                                                        const [h, m] = time.split(':').map(Number);
                                                        slotDate.setHours(h, m, 0, 0);
                                                        
                                                        const isSelected = fechaInicio && fechaFin && 
                                                                         slotDate >= new Date(fechaInicio) && 
                                                                         slotDate < new Date(fechaFin);
                                                        
                                                        return (
                                                            <div key={tIdx} className="flex items-center gap-2">
                                                                <span className="text-[9px] font-bold text-slate-400 w-8 text-right">{time}</span>
                                                                <button
                                                                    disabled={occupied}
                                                                    onClick={() => handleSelectSlot(day, time)}
                                                                    className={`flex-1 py-1.5 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 transition-all ${
                                                                        occupied 
                                                                            ? 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed grayscale'
                                                                            : isSelected
                                                                                ? 'bg-brand text-white border-brand shadow-xl'
                                                                                : 'bg-white border-emerald-500/30 text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50'
                                                                    }`}
                                                                >
                                                                    {occupied ? (
                                                                        <span className="flex items-center justify-center gap-1.5">
                                                                            <XCircle className="w-2.5 h-2.5" />
                                                                            Ocupado
                                                                        </span>
                                                                    ) : isSelected ? 'Seleccionado' : 'Libre'}
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}


                    </motion.div>
                ) : (
                    <motion.div
                        key="inactive"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-slate-100/50 rounded-[2.5rem] border border-dashed border-slate-200 p-16 text-center space-y-4"
                    >
                        <div className="w-20 h-20 bg-slate-200/50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Briefcase className="w-10 h-10 text-slate-400" />
                        </div>
                        <h4 className="text-xl font-black text-slate-400 uppercase tracking-tight">Servicio sin técnico</h4>
                        <p className="text-sm font-medium text-slate-400 max-w-sm mx-auto">
                            Este servicio está marcado como "No requiere técnico". No es necesario agendar visitas para este tipo de atención.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex justify-end gap-4 pt-6">
                <button
                    onClick={handleSave}
                    disabled={isSaving || (aplicaTecnico && !selectedTechId)}
                    className="group relative h-16 px-12 bg-slate-900 text-white rounded-3xl text-sm font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-4"
                >
                    {isSaving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    )}
                    Guardar Agendamiento
                </button>
            </div>
        </div>
    );
}



function DropdownSingleSelect({ options, selectedId, onChange, placeholder }: { options: any[], selectedId: number | null, onChange: (id: number) => void, placeholder: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => 
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.id === selectedId);

    return (
        <div ref={containerRef} className="relative w-full">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-16 px-14 bg-slate-50 border-2 border-slate-100 rounded-3xl text-sm font-bold text-slate-700 text-left flex items-center justify-between focus:outline-none focus:border-brand/40 focus:ring-8 focus:ring-brand/5 transition-all cursor-pointer hover:bg-slate-100/50"
            >
                <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none">
                    {selectedOption?.url_foto ? (
                        <div className="w-6 h-6 rounded-lg overflow-hidden border border-slate-200">
                            <img src={selectedOption.url_foto} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <User className="w-5 h-5 text-brand/40" />
                    )}
                </div>
                
                <span className="truncate pr-4">
                    {selectedOption ? selectedOption.label.split(' - ')[0] : placeholder}
                </span>

                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 5, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute z-[100] top-full left-0 w-full bg-white border border-slate-100 rounded-[2rem] shadow-2xl p-4 space-y-4 overflow-hidden"
                    >
                        <div className="relative">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar técnico..."
                                className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 focus:outline-none focus:border-brand/20 transition-all"
                            />
                            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>

                        <div className="max-h-60 overflow-y-auto pr-2 space-y-1 custom-scrollbar">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt) => {
                                    const isSelected = selectedId === opt.id;
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onChange(opt.id);
                                                setIsOpen(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                                                isSelected 
                                                    ? 'bg-brand text-white shadow-lg' 
                                                    : 'text-slate-500 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden border-2 ${isSelected ? 'border-white/40' : 'border-slate-100'}`}>
                                                {opt.url_foto ? (
                                                    <img src={opt.url_foto} alt={opt.display_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className={`w-full h-full bg-gradient-to-br ${isSelected ? 'from-white/20 to-white/10' : 'from-blue-500 to-indigo-600'} flex items-center justify-center text-white text-[10px] font-black italic shadow-inner`}>
                                                        {(opt.display_name || 'U')[0].toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`text-[11px] font-bold ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                                                    {opt.display_name}
                                                </span>
                                                <span className={`text-[9px] font-medium uppercase tracking-widest ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                                                    {opt.rol?.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 ml-auto" />}
                                        </button>
                                    );
                                })
                            ) : (
                                <p className="text-center py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sin resultados</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function AprobacionesTab({ service, currentUser, onRefresh }: { service: any, currentUser: any, onRefresh: () => void }) {
    const [documento, setDocumento] = useState('');
    const [observacion, setObservacion] = useState('');
    const [ordenVenta, setOrdenVenta] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const logistica = service.aprobacion_logistica || {};
    const director = service.aprobacion_director || {};

    const canApproveLogistica = (currentUser?.rol === 'desarrollador' || currentUser?.rol === 'auxiliar_novedades') && logistica.estado === 'Pendiente';
    const canApproveDirector = (currentUser?.rol === 'desarrollador' || currentUser?.rol === 'director_comercial') && director.estado === 'Pendiente';

    const getDocumentLabel = () => {
        if (service.decision_cliente === 'Quiere Nota Credito y Dinero') return '# de Nota crédito';
        if (service.decision_cliente === 'Acepta Reposicion') return '# de Documento de devolución';
        return 'No aplica';
    };

    const handleLogisticaAction = async (estado: 'Aprobado' | 'Rechazado') => {
        if (estado === 'Aprobado' && !documento && getDocumentLabel() !== 'No aplica') {
            alert('Por favor ingrese el número de documento');
            return;
        }
        if (estado === 'Rechazado' && !observacion) {
            alert('Por favor ingrese una observación');
            return;
        }

        if (!window.confirm(`¿Está seguro que desea ${estado.toLowerCase()} esta solicitud?`)) return;

        setIsUpdating(true);
        try {
            const updateData: any = {
                estado,
                fecha: new Date().toISOString(),
                usuario: currentUser?.display_name || currentUser?.nombre || 'Usuario',
            };

            if (estado === 'Aprobado') updateData.documento = documento;
            else updateData.observacion = observacion;

            const { error } = await supabase
                .from('Servicios')
                .update({ aprobacion_logistica: updateData })
                .eq('id', service.id);

            if (error) throw error;
            
            alert(`Acción realizada con éxito: ${estado}`);
            onRefresh();
        } catch (error) {
            console.error('Error updating logistica approval:', error);
            alert('Error al procesar la aprobación');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDirectorAction = async (estado: 'Aprobado' | 'Rechazado') => {
        if (!window.confirm(`¿Está seguro que desea ${estado.toLowerCase()} esta solicitud?`)) return;

        setIsUpdating(true);
        try {
            const updateData = {
                estado,
                fecha: new Date().toISOString(),
                usuario: currentUser?.display_name || currentUser?.nombre || 'Usuario',
            };

            const { error } = await supabase
                .from('Servicios')
                .update({ aprobacion_director: updateData })
                .eq('id', service.id);

            if (error) throw error;
            
            alert(`Acción realizada con éxito: ${estado}`);
            onRefresh();
        } catch (error) {
            console.error('Error updating director approval:', error);
            alert('Error al procesar la aprobación');
        } finally {
            setIsUpdating(false);
        }
    };

    const StatusCard = ({ title, data, canApprove, onApprove, onReject }: any) => {
        const isAprobado = data.estado === 'Aprobado';
        const isRechazado = data.estado === 'Rechazado';
        const isPendiente = data.estado === 'Pendiente';

        return (
            <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-500">{title}</h3>

                {isPendiente && canApprove ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-sm">
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={onReject}
                                disabled={isUpdating}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-transparent border-rose-200 rounded-lg text-sm font-semibold transition-all shadow-sm"
                            >
                                <XCircle className="w-4 h-4" />
                                Rechazar
                            </button>
                            <button
                                onClick={onApprove}
                                disabled={isUpdating}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-lg text-sm font-semibold transition-all shadow-sm"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Aprobar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm min-h-[100px] flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                            {isAprobado ? (
                                <CheckCircle className="w-5 h-5 text-emerald-500" />
                            ) : isRechazado ? (
                                <XCircle className="w-5 h-5 text-rose-500" />
                            ) : isPendiente ? (
                                <Clock className="w-5 h-5 text-amber-500" />
                            ) : (
                                <span className="font-bold text-slate-400 text-lg">≠</span>
                            )}
                            <span className={`font-medium ${
                                isAprobado ? 'text-emerald-500' : 
                                isRechazado ? 'text-rose-500' : 
                                isPendiente ? 'text-amber-500' : 
                                'text-slate-500'
                            }`}>
                                {data.estado || 'No aplica'}
                            </span>
                        </div>
                        
                        {(isAprobado || isRechazado) && (
                            <div className="space-y-1">
                                {data.usuario && (
                                    <div className="text-xs">
                                        <span className="font-bold text-slate-700">Por: </span>
                                        <span className="text-slate-500">{data.usuario}</span>
                                    </div>
                                )}
                                {data.fecha && (
                                    <div className="text-xs">
                                        <span className="font-bold text-slate-700">Fecha: </span>
                                        <span className="text-slate-500">
                                            {new Date(data.fecha).toLocaleString('es-ES', {
                                                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-wrap items-start justify-start gap-8 px-4" style={{ maxWidth: '1200px' }}>
            {/* PRIMERA COLUMNA */}
            <div className="w-[300px] flex flex-col gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-500 block">
                        {getDocumentLabel()}
                    </label>
                    <input
                        type="text"
                        value={documento}
                        onChange={(e) => setDocumento(e.target.value)}
                        placeholder="Ingrese el número..."
                        readOnly={!canApproveLogistica}
                        className={`w-full border p-2.5 rounded-lg text-sm bg-slate-50 text-slate-700 transition-all ${
                            canApproveLogistica ? 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white' : 'border-slate-200 cursor-not-allowed opacity-80'
                        }`}
                    />
                </div>
                
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-500 block">
                        Observación
                    </label>
                    <input
                        type="text"
                        value={observacion}
                        onChange={(e) => setObservacion(e.target.value)}
                        placeholder="Observaciones..."
                        readOnly={!canApproveLogistica}
                        className={`w-full border p-2.5 rounded-lg text-sm bg-slate-50 text-slate-700 transition-all ${
                            canApproveLogistica ? 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white' : 'border-slate-200 cursor-not-allowed opacity-80'
                        }`}
                    />
                </div>

                <StatusCard 
                    title="Logistica" 
                    data={logistica}
                    canApprove={canApproveLogistica}
                    onApprove={() => handleLogisticaAction('Aprobado')}
                    onReject={() => handleLogisticaAction('Rechazado')}
                />
            </div>

            {/* SEGUNDA COLUMNA */}
            <div className="w-[300px] flex flex-col pt-3">
                <StatusCard 
                    title="Director comercial" 
                    data={director}
                    canApprove={canApproveDirector}
                    onApprove={() => handleDirectorAction('Aprobado')}
                    onReject={() => handleDirectorAction('Rechazado')}
                />
            </div>

            {/* TERCERA COLUMNA */}
            <div className="w-[300px] flex flex-col gap-2 pt-3">
                <label className="text-sm font-medium text-slate-500 block">
                    # de OV (Digitación - Ventas internas)
                </label>
                <div className="relative">
                    <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-slate-400 font-medium">Orden de venta...</span>
                    <input
                        type="text"
                        value={ordenVenta}
                        onChange={(e) => setOrdenVenta(e.target.value)}
                        placeholder="null"
                        className="w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all text-slate-700"
                    />
                </div>
            </div>
        </div>
    );
}

function ServiciosRelacionadosTab({ service }: { service: any }) {
    const [relacionados, setRelacionados] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchRelacionados = async () => {
            // First, make sure we have the service_parent_id (it might not be in the view)
            let parentId = service.service_parent_id;
            
            if (parentId === undefined) {
                const { data: sData } = await supabase
                    .from('Servicios')
                    .select('service_parent_id')
                    .eq('id', service.id)
                    .single();
                if (sData) parentId = sData.service_parent_id;
            }

            // Fetch both the parent and any children
            const query = supabase.from('Servicios').select('*');
            
            if (parentId && service.id) {
                query.or(`id.eq.${parentId},service_parent_id.eq.${service.id}`);
            } else if (service.id) {
                query.eq('service_parent_id', service.id);
            } else {
                setLoading(false);
                return;
            }

            const { data, error } = await query.neq('id', service.id);

            if (!error) {
                setRelacionados(data || []);
            }
            setLoading(false);
        };

        fetchRelacionados();
    }, [service.id, service.service_parent_id]);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-brand animate-spin" />
            </div>
        );
    }

    if (relacionados.length === 0) {
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">Servicios Relacionados</h3>
                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                    {relacionados.length} {relacionados.length === 1 ? 'vínculo' : 'vínculos'}
                </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relacionados.map((s) => (
                    <div 
                        key={s.id}
                        onClick={() => router.push(`/ver-servicio/${s.id}`)}
                        className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-brand hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
                    >
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-brand uppercase tracking-wider px-2 py-0.5 bg-brand/5 rounded-md">
                                    {s.consecutivo}
                                </span>
                                {s.id === service.service_parent_id && (
                                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider px-2 py-0.5 bg-amber-50 rounded-md">
                                        Principal
                                    </span>
                                )}
                            </div>
                            <span className="text-sm font-bold text-slate-700 mt-1">{s.tipo_de_servicio}</span>
                            <span className="text-[11px] text-slate-400 font-medium">
                                {new Date(s.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                        </div>
                        <div className="w-10 h-10 bg-slate-50 group-hover:bg-brand/10 rounded-xl flex items-center justify-center transition-colors">
                            <ExternalLink className="w-5 h-5 text-slate-300 group-hover:text-brand transition-colors" />
                        </div>
                    </div>
                ))}
            </div>
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
