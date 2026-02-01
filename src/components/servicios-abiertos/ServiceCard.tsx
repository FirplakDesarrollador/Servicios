'use client';

import { motion } from 'framer-motion';
import {
    Calendar,
    User,
    MapPin,
    ChevronRight,
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
    Headset
} from 'lucide-react';

interface ServiceCardProps {
    service: any;
    onClick: (service: any) => void;
    onDelete?: (service: any) => void;
    onAssignMac?: (service: any) => void;
    currentUserRole?: string;
}

export default function ServiceCard({ service, onClick, onDelete, onAssignMac, currentUserRole }: ServiceCardProps) {
    // Normalization helper
    const getVal = (snake: string, camel: string) => service[snake] || service[camel];

    const estadoAgendamiento = getVal('estado_agendamiento', 'estadoAgendamiento');
    const tipoDeServicio = getVal('tipo_de_servicio', 'tipoDeServicio');
    const consecutivo = getVal('consecutivo', 'consecutivo');
    const createdAt = getVal('created_at', 'createdAt');
    const asesorMacNombre = getVal('asesor_mac_nombre', 'asesorMacNombre');
    const numeroDePedido = getVal('numero_de_pedido', 'numeroDePedido');
    const canalDeVenta = getVal('canal_de_venta', 'canalDeVenta');
    const asesorNombre = getVal('asesor_nombre', 'asesorNombre');
    const tecnicoNombre = getVal('tecnico_nombre', 'tecnicoNombre');

    const ubicacionNombre = getVal('ubicacion_nombre', 'ubicacionNombre');
    const ubicacionCiudad = getVal('ubicacion_ciudad', 'ubicacionCiudad');
    const ubicacionDepto = getVal('ubicacion_departamento', 'ubicacionDepartamento');
    const ubicacionDireccion = getVal('ubicacion_direccion', 'ubicacionDireccion');

    const consumidorContacto = getVal('consumidor_contacto', 'consumidorContacto');
    const consumidorTelefono = getVal('consumidor_telefono', 'consumidorTelefono');
    const consumidorCiudad = getVal('consumidor_ciudad', 'consumidorCiudad');
    const consumidorDepto = getVal('consumidor_departamento', 'consumidorDepartamento');
    const consumidorDireccion = getVal('consumidor_direccion', 'consumidorDireccion');

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'agendado': return 'bg-blue-500 text-white border-blue-600';
            case 'sin agendar': return 'bg-slate-400 text-white border-slate-500';
            case 'terminado': return 'bg-emerald-500 text-white border-emerald-600';
            case 'con pendientes': return 'bg-amber-500 text-white border-amber-600';
            case 'cancelado': return 'bg-rose-500 text-white border-rose-600';
            case 'preagendado': return 'bg-indigo-500 text-white border-indigo-600';
            case 'en progreso': return 'bg-green-700 text-white border-green-800';
            default: return 'bg-slate-500 text-white border-slate-600';
        }
    };

    const copyToClipboard = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
    };

    // Logical fields based on constructor canal
    const isConstructor = canalDeVenta === 'canal_constructor';
    const displayCiudad = (consumidorCiudad && !isConstructor) ? consumidorCiudad : ubicacionCiudad;
    const displayDepto = (consumidorDepto && !isConstructor) ? consumidorDepto : ubicacionDepto;
    const displayDireccion = (consumidorDireccion && !isConstructor) ? consumidorDireccion : ubicacionDireccion;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all flex flex-col gap-6"
        >
            {/* Header: Status and Consecutivo */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${service.estado ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {service.estado ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </div>

                    <button
                        onClick={() => copyToClipboard(consecutivo)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 transition-transform active:scale-95 ${getStatusColor(estadoAgendamiento)}`}
                    >
                        {consecutivo || 'SC-0000'}
                        <Copy className="w-3 h-3 opacity-60" />
                    </button>
                </div>

                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Solicitud</span>
                    <span className="text-xs font-bold text-brand italic">
                        {createdAt ? new Date(createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </span>
                </div>
            </div>

            {/* Asesor MAC Section */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400">
                        <Headset className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-0.5">Asesor MAC</span>
                        <span className="text-xs font-bold text-slate-700 capitalize">
                            {asesorMacNombre || 'Sin asignar'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-slate-300">
                    <Eye
                        onClick={() => onClick(service)}
                        className="w-5 h-5 cursor-pointer hover:text-brand transition-colors p-0.5"
                    />
                    {onDelete && (currentUserRole === 'desarrollador' || currentUserRole === 'mac') && (
                        <Trash2
                            onClick={() => onDelete(service)}
                            className="w-5 h-5 cursor-pointer hover:text-rose-500 transition-colors p-0.5"
                        />
                    )}
                </div>
            </div>

            {/* Details Grid (Wrap equivalent) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-5 gap-x-4">
                {/* Column 1: Service Info */}
                <div className="space-y-4">
                    <DetailItem label="Tipo de servicio" value={tipoDeServicio} icon={Settings} />
                    <DetailItem label="Canal de venta" value={canalDeVenta} icon={Briefcase} />
                    <DetailItem label="Asesor Comercial" value={asesorNombre} icon={User} />
                </div>

                {/* Column 2: Location */}
                <div className="space-y-4">
                    <DetailItem label="Ubicación" value={ubicacionNombre} icon={MapPin} />
                    <DetailItem label="Ciudad / Depto" value={`${displayCiudad || 'N/A'}, ${displayDepto || 'N/A'}`} icon={Map} />
                    <DetailItem label="Dirección" value={displayDireccion} icon={MapPin} />
                </div>

                {/* Column 3: Contact & Tech */}
                <div className="space-y-4">
                    <DetailItem label="Cliente Final" value={consumidorContacto} icon={User} />
                    <DetailItem label="Teléfono" value={consumidorTelefono} icon={Phone} />
                    <DetailItem label="Técnico" value={tecnicoNombre} icon={Settings} />
                </div>
            </div>

            {/* Footer: Order and Scheduled Date */}
            <div className="pt-4 border-t border-dashed border-slate-100 flex items-center justify-between">
                <div className="flex gap-4">
                    {numeroDePedido && (
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-300 uppercase">Pedido</span>
                            <span className="text-xs font-bold text-slate-500">#{numeroDePedido}</span>
                        </div>
                    )}
                    {service.visitaFechaHoraInicio && (
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-300 uppercase">Programado</span>
                            <span className="text-xs font-bold text-emerald-600">
                                {new Date(service.visitaFechaHoraInicio).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => onClick(service)}
                    className="flex items-center gap-1 text-brand font-black text-xs uppercase hover:gap-2 transition-all p-2"
                >
                    Detalles
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
}

function DetailItem({ label, value, icon: Icon }: { label: string, value: string | null | undefined, icon: any }) {
    return (
        <div className="flex items-start gap-3 group">
            <div className="shrink-0 w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter leading-none mb-1">{label}</span>
                <span className="text-[11px] font-bold text-slate-600 truncate opacity-80 group-hover:opacity-100 transition-opacity">
                    {value || '---'}
                </span>
            </div>
        </div>
    );
}
