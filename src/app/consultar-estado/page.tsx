'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

interface EstadoServicio {
    consecutivo: string;
    tipo_de_servicio: string;
    estado: string;
    fecha_hora_inicio: string | null;
    fecha_hora_fin: string | null;
    tecnico_nombre: string | null;
    reagendado: boolean | null;
    visita_id: number;
    fecha_solicitud: string;
}

export default function ConsultarEstadoPage() {
    const searchParams = useSearchParams();
    const consecutivoParam = searchParams.get('consecutivo');

    const [consecutivo, setConsecutivo] = useState(consecutivoParam || '');
    const [estados, setEstados] = useState<EstadoServicio[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [vistaActual, setVistaActual] = useState<'buscador' | 'estados'>('buscador');
    const [moduloActivo, setModuloActivo] = useState<'validando' | 'programado' | 'finalizado'>('validando');

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
        if (!fecha) return '';
        const date = new Date(fecha);
        return date.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
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

    const estadosValidando = estados.filter(e =>
        e.estado?.toLowerCase().includes('agendado') ||
        e.estado?.toLowerCase().includes('preagendado')
    );
    const estadosProgramado = estados.filter(e =>
        e.estado?.toLowerCase().includes('cancelado') ||
        e.reagendado === true
    );
    const estadosFinalizado = estados.filter(e =>
        e.estado?.toLowerCase().includes('terminado') ||
        e.estado?.toLowerCase().includes('finalizado')
    );

    if (vistaActual === 'buscador') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
                    <div className="space-y-6">
                        {/* Logo */}
                        <div className="flex justify-center">
                            <div className="relative w-64 h-24">
                                <Image
                                    src="/logo-firplak.png"
                                    alt="Firplak Logo"
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        </div>

                        {/* Título */}
                        <div className="text-center space-y-2">
                            <h1 className="text-2xl font-bold text-gray-900">
                                Consulta el estado de su solicitud
                            </h1>
                            <p className="text-gray-600">
                                Ingrese su número de solicitud para conocer el estado actual
                            </p>
                        </div>

                        {/* Formulario */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="consecutivo" className="block text-sm font-medium text-gray-700 mb-1">
                                    Número de solicitud
                                </label>
                                <input
                                    id="consecutivo"
                                    type="text"
                                    value={consecutivo}
                                    onChange={(e) => setConsecutivo(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Ej: 12345"
                                    disabled={loading}
                                />
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Consultando...' : 'Consultar'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
                    {/* Header con botón cerrar */}
                    <div className="flex justify-end">
                        <button
                            onClick={() => {
                                setVistaActual('buscador');
                                setConsecutivo('');
                                setEstados([]);
                            }}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Logo */}
                    <div className="flex justify-center">
                        <div className="relative w-48 h-16">
                            <Image
                                src="/logo-firplak.png"
                                alt="Firplak Logo"
                                fill
                                className="object-contain"
                            />
                        </div>
                    </div>

                    {/* Título */}
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-bold text-gray-900">
                            Consulta el estado de su solicitud
                        </h1>
                        <p className="text-gray-600">
                            Ingrese su número de solicitud para conocer el estado actual
                        </p>
                    </div>

                    {/* Número de solicitud */}
                    <div>
                        <input
                            type="text"
                            value={consecutivo}
                            readOnly
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-center font-medium"
                        />
                    </div>

                    {/* Timeline de estados */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                        {moduloActivo === 'validando' && (
                            <div className="space-y-4">
                                {estadosValidando.map((estado, index) => (
                                    <div key={index}>
                                        {estado.estado === 'Solicitud ingresada' && (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center">
                                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                    <h3 className="font-bold text-gray-900">{estado.estado}</h3>
                                                </div>
                                                <p className="ml-12 text-gray-600">
                                                    La solicitud está siendo validada con las áreas encargadas, pronto recibirás una actualización.
                                                </p>
                                            </div>
                                        )}
                                        {estado.estado === 'Fecha de agendamiento' && (
                                            <div className="ml-12 space-y-2 mt-4">
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span>Fecha de Inicio: {formatearFecha(estado.fecha_hora_inicio)} a las {formatearHora(estado.fecha_hora_inicio)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span>Fecha de finalización: {formatearFecha(estado.fecha_hora_fin)} a las {formatearHora(estado.fecha_hora_fin)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    <span>Técnico agendado: {estado.tecnico_nombre}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {moduloActivo === 'programado' && (
                            <div className="space-y-4">
                                {estadosProgramado.map((estado, index) => (
                                    <div key={index}>
                                        {estado.estado === 'Cancelado' && (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-red-500 rounded-full flex items-center justify-center">
                                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </div>
                                                    <h3 className="font-bold text-gray-900">Cancelado</h3>
                                                </div>
                                                <p className="ml-12 text-gray-600">El servicio fue cancelado.</p>
                                            </div>
                                        )}
                                        {estado.estado === 'Re-agendado' && (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center">
                                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <h3 className="font-bold text-gray-900">Re-agendado</h3>
                                                </div>
                                                <p className="ml-12 text-gray-600">
                                                    Su servicio ha sido Re-agendado. Por favor, permanezca atento a las indicaciones del técnico y a cualquier comunicación adicional.
                                                </p>
                                                <div className="ml-12 space-y-2 mt-2">
                                                    <div className="flex items-center gap-2 text-gray-700">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span>Nueva Fecha de Inicio: {formatearFecha(estado.fecha_hora_inicio)} a las {formatearHora(estado.fecha_hora_inicio)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-gray-700">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span>Nueva Fecha Fin: {formatearFecha(estado.fecha_hora_fin)} a las {formatearHora(estado.fecha_hora_fin)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {moduloActivo === 'finalizado' && (
                            <div className="space-y-4">
                                {estadosFinalizado.map((estado, index) => (
                                    <div key={index} className="text-center space-y-3">
                                        <div className="flex justify-center">
                                            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
                                                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-gray-900 text-lg">Finalizado</h3>
                                        <p className="text-gray-600">El servicio ha sido completado exitosamente.</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Botón contactar soporte */}
                    <button className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-blue-600 font-medium py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Contactar soporte
                    </button>

                    {/* Indicador de estados */}
                    <div className="space-y-4">
                        <h3 className="text-center font-medium text-gray-900">Estado de la solicitud</h3>
                        <div className="flex items-center justify-center gap-2">
                            {/* Validando */}
                            <button
                                onClick={() => setModuloActivo('validando')}
                                className="flex flex-col items-center gap-2"
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${moduloActivo === 'validando' ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <span className={`text-xs font-medium ${moduloActivo === 'validando' ? 'text-blue-600' : 'text-gray-500'}`}>
                                    Validando
                                </span>
                            </button>

                            <div className="flex-1 h-0.5 bg-blue-600 max-w-[80px]"></div>

                            {/* Programado */}
                            <button
                                onClick={() => setModuloActivo('programado')}
                                className="flex flex-col items-center gap-2"
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${moduloActivo === 'programado' ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <span className={`text-xs font-medium ${moduloActivo === 'programado' ? 'text-blue-600' : 'text-gray-500'}`}>
                                    Programado
                                </span>
                            </button>

                            <div className="flex-1 h-0.5 bg-green-500 max-w-[80px]"></div>

                            {/* Finalizado */}
                            <button
                                onClick={() => setModuloActivo('finalizado')}
                                className="flex flex-col items-center gap-2"
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${moduloActivo === 'finalizado' ? 'bg-green-500' : 'bg-gray-300'}`}>
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className={`text-xs font-medium ${moduloActivo === 'finalizado' ? 'text-green-600' : 'text-gray-500'}`}>
                                    Finalizado
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
