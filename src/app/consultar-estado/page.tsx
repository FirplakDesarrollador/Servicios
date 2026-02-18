'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import {
    Search,
    Calendar,
    CheckCircle2,
    Clock,
    User,
    PhoneCall,
    ArrowLeft,
    X,
    Loader2,
    AlertCircle,
    ChevronRight,
    MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EstadoServicio {
    consecutivo: string;
    tipo_de_servicio: string;
    estado: string;
    sub_estado?: string | null;
    motivo?: string | null;
    fecha_hora_inicio: string | null;
    fecha_hora_fin: string | null;
    hora_fin_reagendada?: string | null;
    tecnico_nombre: string | null;
    reagendado: boolean | null;
    visita_id: number;
    fecha_solicitud: string;
}

type StatusKey = 'validando' | 'programado' | 'finalizado';

function ConsultarEstadoContent() {
    const searchParams = useSearchParams();
    const consecutivoParam = searchParams.get('consecutivo');

    const [consecutivo, setConsecutivo] = useState(consecutivoParam || '');
    const [estados, setEstados] = useState<EstadoServicio[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [vistaActual, setVistaActual] = useState<'buscador' | 'estados'>('buscador');
    const [moduloActivo, setModuloActivo] = useState<StatusKey>('validando');
    const [maxStepAlcanzado, setMaxStepAlcanzado] = useState(0); // 0: Validando, 1: Programado, 2: Finalizado

    useEffect(() => {
        if (consecutivoParam) {
            buscarEstados(consecutivoParam);
        }
    }, [consecutivoParam]);

    const buscarEstados = async (cons: string) => {
        if (!cons.trim()) {
            setError('Por favor ingrese un número de solicitud');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: queryError } = await supabase
                .from('query_servicios_info_cliente')
                .select('*')
                .eq('consecutivo', cons)
                .order('fecha_hora_inicio', { ascending: true });

            if (queryError) throw queryError;

            if (!data || data.length === 0) {
                setError('No se encontró ninguna solicitud con ese número');
                setEstados([]);
            } else {
                setEstados(data);

                // Mapeo preciso de estados
                let maxIndex = 0; // 0: Validando, 1: Programado, 2: Finalizado

                data.forEach((record: any) => {
                    const status = (record.estado || '').toLowerCase();

                    // Solo marcamos como finalizado si hay una palabra clave terminal CLARA
                    if (
                        status === 'terminado' ||
                        status === 'finalizado' ||
                        status === 'cerrado' ||
                        status.includes('servicio terminado') ||
                        status.includes('visita finalizada')
                    ) {
                        maxIndex = Math.max(maxIndex, 2);
                    }
                    // Programado si tiene agendamiento, técnico o está en proceso
                    else if (
                        status.includes('agendado') ||
                        status.includes('re-agendado') ||
                        status.includes('programado') ||
                        status.includes('fecha de agendamiento') ||
                        status.includes('en camino') ||
                        status.includes('en proceso')
                    ) {
                        maxIndex = Math.max(maxIndex, 1);
                    }
                });

                const stepKeys: StatusKey[] = ['validando', 'programado', 'finalizado'];
                setMaxStepAlcanzado(maxIndex);
                setModuloActivo(stepKeys[maxIndex]);
                setVistaActual('estados');
            }
        } catch (err) {
            console.error('Error al buscar estados:', err);
            setError('Error al consultar el estado. Por favor intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        buscarEstados(consecutivo);
    };

    const formatearFecha = (fecha: string | null) => {
        if (!fecha) return 'Pendiente';
        const date = new Date(fecha);
        return date.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatearHora = (fecha: string | null) => {
        if (!fecha) return '';
        const date = new Date(fecha);
        return date.toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const resetView = () => {
        setVistaActual('buscador');
        setConsecutivo('');
        setEstados([]);
        setError(null);
    };

    if (vistaActual === 'buscador') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
                >
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Search size={120} />
                        </div>
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="mb-6 bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                                <h1 className="text-3xl font-black tracking-tighter">FIRPLAK</h1>
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Estado de Solicitud</h2>
                            <p className="text-blue-100 text-center text-sm opacity-90">
                                Realiza el seguimiento en tiempo real de tu servicio técnico.
                            </p>
                        </div>
                    </div>

                    <div className="p-8 space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="consecutivo" className="text-sm font-semibold text-slate-700 ml-1">
                                    Número de Ticket
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                        <Search size={18} />
                                    </div>
                                    <input
                                        id="consecutivo"
                                        type="text"
                                        value={consecutivo}
                                        onChange={(e) => setConsecutivo(e.target.value)}
                                        className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-lg font-medium"
                                        placeholder="Ej: FR-12345"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 text-sm"
                                >
                                    <AlertCircle size={18} />
                                    {error}
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold py-4 px-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        <span>Buscando...</span>
                                    </>
                                ) : (
                                    <span>Consultar Estado</span>
                                )}
                            </button>
                        </form>

                        <div className="pt-4 border-t border-slate-100">
                            <p className="text-xs text-center text-slate-400">
                                ¿No tienes tu número de ticket? Revisa el correo de confirmación de tu solicitud.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    const currentEstado = estados[estados.length - 1];

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-4xl mx-auto"
            >
                {/* Header Navigation */}
                <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-2xl shadow-sm">
                    <button
                        onClick={resetView}
                        className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-medium transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span>Volver a buscar</span>
                    </button>
                    <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-bold border border-blue-100">
                        Ticket: {consecutivo}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Progress & Timeline */}
                    <div className="lg:col-span-2 space-y-6">
                        <section className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                            <div className="p-8 border-b border-slate-50">
                                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                        <Clock size={20} />
                                    </div>
                                    Línea de tiempo del servicio
                                </h2>

                                <div className="relative">
                                    {/* Progress line background */}
                                    <div className="absolute top-5 left-8 right-8 h-1 bg-slate-100 rounded-full hidden sm:block"></div>

                                    {/* Active segments line */}
                                    <div className="absolute top-5 left-8 right-8 h-1 rounded-full hidden sm:block">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-1000"
                                            style={{
                                                width: maxStepAlcanzado === 0 ? '0%' :
                                                    maxStepAlcanzado === 1 ? '50%' : '100%'
                                            }}
                                        ></div>
                                    </div>

                                    <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 sm:gap-4 px-2">
                                        {[
                                            { id: 'validando', icon: <Search size={22} />, label: 'Validando' },
                                            { id: 'programado', icon: <Calendar size={22} />, label: 'Programado' },
                                            { id: 'finalizado', icon: <CheckCircle2 size={22} />, label: 'Finalizado' }
                                        ].map((step, idx) => {
                                            const isActive = moduloActivo === step.id;
                                            const isPast = (moduloActivo === 'programado' && step.id === 'validando') ||
                                                (moduloActivo === 'finalizado' && (step.id === 'validando' || step.id === 'programado'));

                                            // El usuario solo puede seleccionar estados que ya se han alcanzado
                                            const canSelect = idx <= maxStepAlcanzado;

                                            return (
                                                <button
                                                    key={step.id}
                                                    onClick={() => canSelect && setModuloActivo(step.id as StatusKey)}
                                                    disabled={!canSelect}
                                                    className={`
                                                        group flex sm:flex-col items-center gap-4 sm:gap-3 outline-none transition-all
                                                        ${!canSelect ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                                                    `}
                                                >
                                                    <div className={`
                                                        w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 z-10
                                                        ${isActive ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 scale-110' :
                                                            isPast ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}
                                                    `}>
                                                        {isPast ? <CheckCircle2 size={22} /> : step.icon}
                                                    </div>
                                                    <div className="flex flex-col sm:items-center">
                                                        <span className={`text-sm font-bold ${isActive ? 'text-blue-600' : isPast ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                            {step.label}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Paso {idx + 1}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-slate-50/50 min-h-[300px]">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={moduloActivo}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="space-y-6"
                                    >
                                        {moduloActivo === 'validando' && (
                                            <div className="space-y-6">
                                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex gap-4">
                                                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                                        <Clock size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-bold text-slate-800">Solicitud Recibida</h3>
                                                        <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                                                            Hemos registrado tu solicitud exitosamente. Actualmente nuestro equipo de soporte está validando la información para asignarte el técnico más adecuado.
                                                        </p>
                                                        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg w-fit">
                                                            REGISTRO: {formatearFecha(currentEstado.fecha_solicitud)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-blue-600/5 p-4 rounded-xl border border-blue-100">
                                                    <p className="text-sm text-blue-700 italic">
                                                        "Te enviaremos una notificación en cuanto el servicio sea programado."
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {moduloActivo === 'programado' && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                                                <Calendar size={20} />
                                                            </div>
                                                            <h4 className="font-bold text-slate-800">Cita Programada</h4>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between text-sm py-2 border-b border-slate-50">
                                                                <span className="text-slate-500">Fecha</span>
                                                                <span className="font-bold text-slate-800">{formatearFecha(currentEstado.fecha_hora_inicio)}</span>
                                                            </div>
                                                            <div className="flex justify-between text-sm py-2">
                                                                <span className="text-slate-500">Horario estimado</span>
                                                                <span className="font-bold text-slate-800">{formatearHora(currentEstado.fecha_hora_inicio)} - {formatearHora(currentEstado.fecha_hora_fin)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                                                <User size={20} />
                                                            </div>
                                                            <h4 className="font-bold text-slate-800">Técnico Asignado</h4>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Profesional</p>
                                                            <p className="text-lg font-bold text-slate-800">{currentEstado.tecnico_nombre || 'Asignando...'}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex gap-4 items-start">
                                                    <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-200">
                                                        <PhoneCall size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-emerald-800">Próximos pasos</h4>
                                                        <p className="text-emerald-700 text-sm mt-1 leading-relaxed">
                                                            El técnico se comunicará contigo minutos antes de llegar a la dirección registrada. Por favor asegúrate de estar disponible en el número de teléfono proporcionado.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {moduloActivo === 'finalizado' && (
                                            <div className="flex flex-col items-center justify-center text-center p-8 space-y-6">
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 animate-pulse"></div>
                                                    <div className="w-24 h-24 bg-emerald-500 text-white rounded-3xl flex items-center justify-center shadow-2xl relative z-10">
                                                        <CheckCircle2 size={48} />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="text-2xl font-black text-slate-800">Servicio Completado</h3>
                                                    <p className="text-slate-500 max-w-sm mx-auto">
                                                        Tu solicitud ha sido finalizada con éxito el {formatearFecha(currentEstado.fecha_hora_fin)}.
                                                    </p>
                                                </div>

                                                {currentEstado.motivo && (
                                                    <div className="w-full bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative">
                                                        <div className="absolute -top-3 left-6 px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                                                            Comentario del técnico
                                                        </div>
                                                        <p className="text-slate-600 italic text-sm leading-relaxed">
                                                            "{currentEstado.motivo}"
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-white px-4 py-2 rounded-xl border border-slate-100">
                                                    <span>Estado final:</span>
                                                    <span className="text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-md">{currentEstado.estado}</span>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Sidebar info */}
                    <div className="space-y-6">
                        <section className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <AlertCircle size={18} className="text-blue-600" />
                                Detalle de Solicitud
                            </h3>
                            <div className="space-y-4">
                                <div className="p-3 bg-slate-50 rounded-xl relative overflow-hidden">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tipo de Servicio</p>
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-bold text-slate-700">{currentEstado.tipo_de_servicio}</p>
                                        <ChevronRight size={14} className="text-slate-300" />
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Consecutivo</p>
                                    <p className="text-sm font-black text-blue-600 tracking-widest">{currentEstado.consecutivo}</p>
                                </div>
                                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-1">Estado Actual</p>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-sm font-bold text-blue-700">{currentEstado.estado}</p>
                                        {currentEstado.sub_estado && (
                                            <p className="text-[11px] font-medium text-blue-500/80 bg-white/50 px-2 py-0.5 rounded-full w-fit">
                                                {currentEstado.sub_estado}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-gradient-to-br from-indigo-900 via-blue-900 to-blue-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <PhoneCall size={100} />
                            </div>
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <h3 className="text-xl font-bold mb-4">¿Necesitas Ayuda?</h3>
                                <p className="text-blue-100 text-sm mb-8 leading-relaxed opacity-80">
                                    Si tienes dudas sobre tu servicio o deseas realizar un cambio, nuestro equipo está listo para ayudarte.
                                </p>
                                <a
                                    href="https://wa.me/573000000000" // Cambiar por número real
                                    target="_blank"
                                    className="w-full bg-white text-blue-900 hover:bg-blue-50 active:scale-[0.98] font-black py-4 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-900/50"
                                >
                                    <PhoneCall size={20} />
                                    CHAT SOPORTE
                                </a>
                                <p className="mt-6 text-[10px] font-bold text-blue-300 uppercase tracking-[2px]">
                                    Disponible: Lunes a Viernes
                                </p>
                            </div>
                        </section>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default function ConsultarEstadoPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        }>
            <ConsultarEstadoContent />
        </Suspense>
    );
}
