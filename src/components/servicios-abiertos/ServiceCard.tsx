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
            case 'agendado': return '#53B2EA';
            case 'sin agendar': return '#94A3B8';
            case 'terminado': return '#10B981';
            case 'con pendientes': return '#F59E0B';
            case 'cancelado': return '#EF4444';
            case 'preagendado': return '#3C26F3';
            case 'en progreso': return '#5B693B';
            default: return '#94A3B8';
        }
    };

    const copyToClipboard = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
    };

    const isConstructor = canalDeVenta === 'canal_constructor';
    const displayCiudad = (consumidorCiudad && !isConstructor) ? consumidorCiudad : ubicacionCiudad;
    const displayDepto = (consumidorDepto && !isConstructor) ? consumidorDepto : ubicacionDepto;
    const displayDireccion = (consumidorDireccion && !isConstructor) ? consumidorDireccion : ubicacionDireccion;

    const statusColor = getStatusColor(estadoAgendamiento);

    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg p-3 shadow-sm border border-[#D3D3D3] hover:border-brand/30 transition-all flex flex-col gap-3 group/card overflow-hidden"
        >
            {/* Top Row: Lock, Consecutivo, Fecha, MAC, Actions */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center">
                        {service.estado ? (
                            <Unlock className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                            <Lock className="w-3.5 h-3.5 text-rose-500" />
                        )}
                    </div>

                    <button
                        onClick={() => copyToClipboard(consecutivo)}
                        style={{ backgroundColor: statusColor }}
                        className="px-3 py-1.5 rounded-md text-[13px] font-medium text-white flex items-center gap-2 active:scale-95 transition-all shadow-sm"
                    >
                        {consecutivo || 'SC-0000'}
                    </button>

                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: statusColor }} />
                            <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: statusColor }}>
                                {estadoAgendamiento}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">Solicitud</span>
                            <span className="text-[11px] font-medium text-slate-500 italic leading-none">
                                {createdAt ? new Date(createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden lg:flex items-center gap-2">
                        <span className="text-[12px] text-slate-600">
                            {asesorMacNombre || 'sin asignar'}
                        </span>
                        {(service.estado === true) && (currentUserRole === 'desarrollador' || currentUserRole === 'mac') && (
                            <Headset
                                className={`w-5 h-5 cursor-pointer transition-colors ${asesorMacNombre ? 'text-emerald-500' : 'text-slate-300'}`}
                            />
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        {onDelete && (currentUserRole === 'desarrollador' || service.creado_por_email === 'mayerly.marin@firplak.com' || service.creado_por_email === 'isabel.jaramillo@firplak.com') && (
                            <Trash2
                                onClick={() => onDelete(service)}
                                className="w-5 h-5 text-rose-400 cursor-pointer hover:text-rose-600 transition-colors"
                            />
                        )}
                        <Eye
                            onClick={() => onClick(service)}
                            className="w-5 h-5 text-brand cursor-pointer hover:text-brand-light transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Bottom Grid: All the details in multiple rows/columns for density */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-y-3 gap-x-4 border-t border-slate-50 pt-3">
                <DetailItem label="Tipo de servicio" value={tipoDeServicio} />
                <DetailItem label="Asesor comercial" value={asesorNombre} />

                <div className="flex flex-col">
                    <span className="text-[12px] font-medium text-slate-800 leading-none mb-1">{canalDeVenta || 'Canal'}</span>
                    <span className="text-[11px] font-light text-slate-400 truncate">{ubicacionNombre || '---'}</span>
                </div>

                <DetailItem
                    label={canalDeVenta === 'canal_constructor' ? 'Contacto Obra' : 'Contacto Canal'}
                    value={getVal('ubicacion_contacto', 'ubicacionContacto')}
                />

                <DetailItem
                    label={canalDeVenta === 'canal_constructor' ? 'Departamento obra' : (consumidorDepto ? 'Departamento cliente final' : 'Departamento canal')}
                    value={displayDepto}
                />

                <DetailItem
                    label={canalDeVenta === 'canal_constructor' ? 'Ciudad obra' : (consumidorCiudad ? 'Ciudad cliente final' : 'Ciudad canal')}
                    value={displayCiudad}
                />

                <DetailItem
                    label={canalDeVenta === 'canal_constructor' ? 'Direccion obra' : (consumidorDireccion ? 'Direccion cliente final' : 'Direccion canal')}
                    value={displayDireccion}
                />

                <DetailItem label="Cédula cliente final" value={getVal('consumidor_cedula', 'consumidorCedula')} />
                <DetailItem label="Cliente final" value={consumidorContacto} />
                <DetailItem label="Telefono cliente final" value={consumidorTelefono} />

                <DetailItem label="Tecnico asignado" value={tecnicoNombre} />
                <DetailItem label="Cédula técnico" value={getVal('tecnico_cedula', 'tecnicoCedula')} />

                <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-medium text-slate-800 leading-none mb-1">Estado</span>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
                        <span className="text-[11px] font-light text-slate-400 truncate">
                            {estadoAgendamiento}
                        </span>
                    </div>
                </div>
                <DetailItem
                    label="Fecha programada"
                    value={service.visitaFechaHoraInicio ? new Date(service.visitaFechaHoraInicio).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Null'}
                />
                <DetailItem label="Numero de pedido" value={numeroDePedido} />
            </div>
        </motion.div>
    );
}

function DetailItem({ label, value, className = "" }: { label: string, value: string | null | undefined, className?: string }) {
    return (
        <div className={`flex flex-col min-w-0 ${className}`}>
            <span className="text-[11px] font-medium text-slate-800 leading-none mb-1">{label}</span>
            <span className="text-[11px] font-light text-slate-400 truncate">
                {value || 'Null'}
            </span>
        </div>
    );
}
