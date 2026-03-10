'use client';

import { motion } from 'framer-motion';
import { 
    Calendar, 
    User, 
    MapPin, 
    ChevronRight, 
    Clock, 
    FileText, 
    DollarSign,
    Package,
    Mail,
    Phone,
    ShieldCheck,
    CreditCard
} from 'lucide-react';

interface SolicitudCardProps {
    solicitud: any;
    onClick: (solicitud: any) => void;
}

export default function SolicitudCard({ solicitud, onClick }: SolicitudCardProps) {
    const formatDate = (date: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const hasDocuments = solicitud.factura_url || solicitud.rut_url || solicitud.soporte_pago_url;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            onClick={() => onClick(solicitud)}
            className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 hover:border-brand/30 hover:shadow-md transition-all cursor-pointer group"
        >
            {/* Top Row: Consecutivo & Status */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50">
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-xs font-black tracking-widest uppercase">
                        {solicitud.consecutivo}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter leading-none">Fecha de registro</span>
                        <span className="text-xs font-bold text-slate-600">{formatDate(solicitud.fecha_creacion)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {solicitud.soporte_pago_url && (
                        <div className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg" title="Pago Registrado">
                            <CreditCard className="w-4 h-4" />
                        </div>
                    )}
                    {solicitud.factura_url && (
                        <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg" title="Factura Adjunta">
                            <FileText className="w-4 h-4" />
                        </div>
                    )}
                </div>
            </div>

            {/* Middle Section: Client Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cliente</span>
                            <span className="text-sm font-black text-slate-800 uppercase truncate">
                                {solicitud.nombre_razon_social}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">{solicitud.numeroid} • {solicitud.tipo_persona}</span>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ubicación</span>
                            <span className="text-xs font-bold text-slate-700 uppercase">{solicitud.ciudad}</span>
                            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">{solicitud.direccion}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand/5 flex items-center justify-center flex-shrink-0">
                            <Package className="w-4 h-4 text-brand" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-brand/60 font-bold uppercase tracking-widest text-brand">Servicio</span>
                            <span className="text-xs font-black text-slate-700 uppercase">{solicitud.tipodeservicio}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{solicitud.grupo_producto} {solicitud.medidas && `• ${solicitud.medidas}`}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Valor Pagado</span>
                        </div>
                        <span className="text-xs font-black text-emerald-600">{formatCurrency(solicitud.valor_pagar || 0)}</span>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Contact & Detail Button */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 opacity-60">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500 truncate max-w-[120px]">{solicitud.correo_electronico}</span>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-60">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500">{solicitud.telefono}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-brand font-black text-[10px] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                    Ver Detalles
                    <ChevronRight className="w-4 h-4" />
                </div>
            </div>
        </motion.div>
    );
}
