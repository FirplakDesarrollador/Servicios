'use client';

import { motion } from 'framer-motion';
import {
    Calendar,
    User,
    MapPin,
    Tag,
    Clock,
    CheckCircle2,
    AlertCircle,
    Package,
    Settings,
    Lock,
    Unlock,
    Copy,
    Eye,
    Trash2,
    Phone,
    CreditCard,
    Map,
    Briefcase,
    Headset,
    Zap,
    Share2,
} from 'lucide-react';

interface ServiceCardProps {
    service: any;
    onClick: (service: any) => void;
    onDelete?: (service: any) => void;
    onAssignMac?: (service: any) => void;
    onCerrarService?: (service: any) => void;
    currentUserRole?: string;
}

export default function ServiceCard({ service, onClick, onDelete, onAssignMac, onCerrarService, currentUserRole }: ServiceCardProps) {
    // Normalization helper
    const getVal = (snake: string, camel: string) => service[snake] || service[camel];

    const estadoAgendamiento = getVal('estado_agendamiento', 'estadoAgendamiento');
    const tipoDeServicio     = getVal('tipo_de_servicio', 'tipoDeServicio');
    const consecutivo        = getVal('consecutivo', 'consecutivo');
    const createdAt          = getVal('created_at', 'createdAt');
    const asesorMacNombre    = getVal('asesor_mac_nombre', 'asesorMacNombre');
    const numeroDePedido     = getVal('numero_de_pedido', 'numeroDePedido');
    const asesorNombre       = getVal('asesor_nombre', 'asesorNombre');
    const tecnicoNombre      = getVal('tecnico_nombre', 'tecnicoNombre');

    const ubicacionNombre  = getVal('ubicacion_nombre', 'ubicacionNombre');
    const ubicacionCiudad  = getVal('ubicacion_ciudad', 'ubicacionCiudad');

    const consumidorContacto = getVal('consumidor_contacto', 'consumidorContacto');
    const consumidorTelefono = getVal('consumidor_telefono', 'consumidorTelefono');
    const consumidorDireccion = getVal('consumidor_direccion', 'consumidorDireccion');
    const consumidorCiudad    = getVal('consumidor_ciudad', 'consumidorCiudad');
    const consumidorDetalleDir = getVal('consumidor_descripcion_direccion', 'consumidorDescripcionDireccion');

    const displayCiudad = consumidorCiudad || ubicacionCiudad;

    const statusColors: Record<string, string> = {
        'agendado': 'bg-blue-50 text-blue-700 border-blue-100',
        'sin agendar': 'bg-slate-50 text-slate-700 border-slate-200',
        'terminado': 'bg-emerald-50 text-emerald-700 border-emerald-100',
        'con pendientes': 'bg-amber-50 text-amber-700 border-amber-100',
        'cancelado': 'bg-rose-50 text-rose-700 border-rose-100',
        'preagendado': 'bg-indigo-50 text-indigo-700 border-indigo-100',
        'en progreso': 'bg-teal-50 text-teal-700 border-teal-100',
    };

    const currentStatusStyle = statusColors[estadoAgendamiento?.toLowerCase()] || statusColors['sin agendar'];

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).catch(() => {});
    };

    const copyPublicLink = () => {
        const url = `${window.location.origin}/consultar-estado/${consecutivo}`;
        copyToClipboard(url);
    };

    // Additional fields from the screenshot/DB
    const ubicacionContacto    = getVal('ubicacion_contacto', 'ubicacionContacto');
    const consumidorDepartamento = getVal('consumidor_departamento', 'consumidorDepartamento');
    const consumidorCedula      = getVal('consumidor_cedula', 'consumidorCedula');
    const tecnicoCedula         = getVal('tecnico_cedula', 'tecnicoCedula');

    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2, boxShadow: '0 12px 20px -5px rgb(0 0 0 / 0.1)' }}
            className="group bg-white rounded-xl p-5 border border-slate-200 shadow-sm transition-all flex flex-col gap-5 relative overflow-hidden"
        >
            {/* Header: ID, Date & Main Status */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-5">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Orden de Servicio</span>
                        <span className="text-base font-black text-brand leading-none">{consecutivo || 'SC-0000'}</span>
                    </div>
                    <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${currentStatusStyle}`}>
                        {estadoAgendamiento || 'Sin agendar'}
                    </div>
                    {/* ASESOR MAC Badge - Interactive */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onAssignMac?.(service);
                        }}
                        className={`flex items-center gap-2 px-3 py-1 rounded-lg border transition-all active:scale-95 group/mac ${onAssignMac ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : 'cursor-default'} ${asesorMacNombre ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                        title={onAssignMac ? "Asignar Asesor MAC" : ""}
                    >
                        <span className="text-[10px] font-black uppercase tracking-tight">
                            {asesorMacNombre || 'Sin MAC'}
                        </span>
                        <Headset className={`w-3.5 h-3.5 transition-transform group-hover/mac:scale-110 ${asesorMacNombre ? 'text-indigo-500' : 'text-slate-300'}`} />
                    </button>
                    <div className="flex flex-col border-l border-slate-200 pl-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Creado</span>
                        <span className="text-[11px] font-bold text-slate-600">{createdAt ? new Date(createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '---'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={copyPublicLink} className="p-2 hover:bg-brand/10 rounded-xl transition-all text-slate-300 hover:text-brand" title="Copiar Link">
                        <Share2 className="w-4 h-4" />
                    </button>
                    {onDelete && (
                        <button onClick={() => onDelete(service)} className="p-2 hover:bg-rose-50 rounded-xl transition-all text-slate-300 hover:text-rose-500">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                    {onCerrarService && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onCerrarService(service);
                            }} 
                            className="p-2 hover:bg-rose-50 rounded-xl transition-all text-slate-300 hover:text-rose-600" 
                            title="Cerrar Servicio"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                        </button>
                    )}
                    <button 
                        onClick={() => onClick(service)} 
                        className="ml-2 p-2 bg-slate-900 text-white rounded-xl hover:bg-brand transition-all shadow-lg active:scale-95 flex items-center justify-center group/btn"
                        title="Ver detalles"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* DATA BLOCKS - Organized for readability */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                
                {/* Block 1: Servicio & Canal */}
                <div className="flex flex-col gap-4">
                    <SectionLabel label="Información del Servicio" />
                    <DataField label="Tipo de servicio" value={tipoDeServicio} highlighted />
                    <DataField label="Número de pedido" value={numeroDePedido} />
                    <DataField label="Canal / Distribuidor" value={ubicacionNombre} />
                    <DataField label="Contacto Canal" value={ubicacionContacto} />
                </div>

                {/* Block 2: Cliente */}
                <div className="flex flex-col gap-4 border-l border-slate-50 pl-6">
                    <SectionLabel label="Datos del Cliente" />
                    <DataField label="Cliente final" value={consumidorContacto} highlighted />
                    <DataField label="Cédula cliente" value={consumidorCedula} />
                    <DataField label="Teléfono" value={consumidorTelefono} color="text-emerald-600" />
                    <DataField label="Asesor mac" value={asesorMacNombre} />
                </div>

                {/* Block 3: Ubicación */}
                <div className="flex flex-col gap-4 border-l border-slate-50 pl-6">
                    <SectionLabel label="Ubicación de Visita" />
                    <DataField label="Departamento" value={consumidorDepartamento} />
                    <DataField label="Ciudad" value={displayCiudad} />
                    <DataField label="Dirección exacta" value={consumidorDireccion} detail={consumidorDetalleDir} />
                    <DataField label="Asesor comercial" value={asesorNombre} />
                </div>

                {/* Block 4: Técnico y Cita */}
                <div className="flex flex-col gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <SectionLabel label="Programación y Técnico" />
                    <div className="flex flex-col gap-1 p-2 bg-brand text-white rounded-lg shadow-inner">
                        <span className="text-[9px] font-black uppercase opacity-70">Fecha y Hora de Cita</span>
                        <span className="text-xs font-black">
                            {service.visita_fecha_hora_inicio 
                                ? new Date(service.visita_fecha_hora_inicio).toLocaleString('es-CO', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })
                                : 'PENDIENTE POR AGENDAR'}
                        </span>
                    </div>
                    <DataField label="Técnico asignado" value={tecnicoNombre} />
                    <DataField label="Cédula técnico" value={tecnicoCedula} />
                </div>

            </div>
        </motion.div>
    );
}

function SectionLabel({ label }: { label: string }) {
    return <span className="text-[9px] font-black text-brand/60 uppercase tracking-[0.2em] border-b border-brand/10 pb-1">{label}</span>;
}

function DataField({ label, value, detail, highlighted, color }: { label: string, value?: string, detail?: string, highlighted?: boolean, color?: string }) {
    return (
        <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-tight">{label}</span>
            <div className="flex flex-col min-w-0">
                <span className={`text-xs font-bold truncate transition-colors ${value ? (highlighted ? 'text-slate-900 border-l-2 border-brand pl-2' : color || 'text-slate-700') : 'text-slate-300 italic'}`}>
                    {value || '---'}
                </span>
                {detail && <span className="text-[10px] text-slate-500 font-medium mt-1 leading-tight">{detail}</span>}
            </div>
        </div>
    );
}
