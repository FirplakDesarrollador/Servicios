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
    Headset,
    Share2
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

    const statusColors: any = {
        'agendado': 'bg-blue-50 text-blue-700 border-blue-100',
        'sin agendar': 'bg-slate-50 text-slate-700 border-slate-200',
        'terminado': 'bg-emerald-50 text-emerald-700 border-emerald-100',
        'con pendientes': 'bg-amber-50 text-amber-700 border-amber-100',
        'cancelado': 'bg-rose-50 text-rose-700 border-rose-100',
        'preagendado': 'bg-indigo-50 text-indigo-700 border-indigo-100',
        'en progreso': 'bg-teal-50 text-teal-700 border-teal-100',
    };

    const currentStatusStyle = statusColors[estadoAgendamiento?.toLowerCase()] || statusColors['sin agendar'];

    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col gap-4"
        >
            {/* Top Row: Meta & Actions */}
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                            {service.estado ? (
                                <Unlock className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                                <Lock className="w-3.5 h-3.5 text-rose-500" />
                            )}
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Servicio</span>
                        </div>
                        <button
                            onClick={() => copyToClipboard(consecutivo)}
                            className="text-sm font-bold text-slate-900 flex items-center gap-2 hover:text-blue-600 transition-colors"
                        >
                            {consecutivo || 'SC-0000'}
                            <Copy className="w-3 h-3 opacity-0 group-hover/card:opacity-100" />
                        </button>
                    </div>

                    <div className="h-8 w-px bg-slate-100 mx-1" />

                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fecha</span>
                        <span className="text-xs font-semibold text-slate-600">
                            {createdAt ? new Date(createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : 'N/A'}
                        </span>
                    </div>

                    <div className="flex flex-col ml-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estado</span>
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${currentStatusStyle}`}>
                            {estadoAgendamiento || 'Sin estado'}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-md border border-slate-100">
                        <span className="text-[11px] font-medium text-slate-500">
                            {asesorMacNombre || 'Sin MAC'}
                        </span>
                        {(service.estado === true) && (
                            <Headset className={`w-3.5 h-3.5 ${asesorMacNombre ? 'text-blue-500' : 'text-slate-300'}`} />
                        )}
                    </div>
                    <div className="flex items-center gap-2 border-l border-slate-100 pl-4">
                        <button onClick={copyPublicLink} className="p-2 hover:bg-slate-50 rounded-md transition-colors text-slate-400 hover:text-blue-500" title="Copiar Link Cliente">
                            <Share2 className="w-4 h-4" />
                        </button>
                        {onDelete && (
                            <button onClick={() => onDelete(service)} className="p-2 hover:bg-rose-50 rounded-md transition-colors text-slate-400 hover:text-rose-500">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        <button onClick={() => onClick(service)} className="p-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors">
                            <Eye className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Mid: Principal Subject */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-1">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Canal / Distribuidor</span>
                    <span className="text-sm font-semibold text-slate-800 line-clamp-1">{ubicacionNombre || '---'}</span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" />
                        {displayCiudad || '---'}
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente Final</span>
                    <span className="text-sm font-semibold text-slate-800 line-clamp-1">{consumidorContacto || '---'}</span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Phone className="w-3 h-3" />
                        {consumidorTelefono || '---'}
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Servicio</span>
                    <span className="text-sm font-semibold text-slate-800">{tipoDeServicio || '---'}</span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 uppercase font-bold tracking-tighter">
                        <Zap className="w-3 h-3 text-amber-500" />
                        Pedido: {numeroDePedido || '---'}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Additional Meta */}
            <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] font-medium text-slate-500">Asesor: {asesorNombre}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Settings className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] font-medium text-slate-500">Técnico: {tecnicoNombre || 'Pendiente'}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium italic">
                        {service.visitaFechaHoraInicio 
                            ? new Date(service.visitaFechaHoraInicio).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) 
                            : 'Cita pendiente'}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

function DetailItem({ label, value, className = "" }: { label: string, value: string | null | undefined, className?: string }) {
    return (
        <div className={`flex flex-col min-w-0 ${className}`}>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</span>
            <span className="text-xs font-semibold text-slate-700 truncate">
                {value || '---'}
            </span>
        </div>
    );
}

