'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Shield, Zap, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ModalEditCondebeProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    serviceId: string | number;
    initialData: {
        consecutivo: string;
        tipo_de_servicio: string;
        facturado: boolean;
    };
}

export default function ModalEditCondebe({
    isOpen,
    onClose,
    onSuccess,
    serviceId,
    initialData
}: ModalEditCondebeProps) {
    const [loading, setLoading] = useState(false);
    const [consecutivo, setConsecutivo] = useState(initialData.consecutivo || '');
    const [tipoServicio, setTipoServicio] = useState(initialData.tipo_de_servicio || '');
    const [facturado, setFacturado] = useState(initialData.facturado || false);

    useEffect(() => {
        if (isOpen) {
            setConsecutivo(initialData.consecutivo || '');
            setTipoServicio(initialData.tipo_de_servicio || '');
            setFacturado(initialData.facturado || false);
        }
    }, [isOpen, initialData]);

    const adjustConsecutivo = (targetType: string, targetFacturado: boolean) => {
        if (!initialData.consecutivo) return;

        // Limpiar el consecutivo base (quitar la F si existe)
        let base = initialData.consecutivo;
        if (base.startsWith('F')) base = base.substring(1);

        // Extraer el prefijo (primeros 6 caracteres, ej: NatGom)
        const prefix = base.substring(0, 6);
        
        // Extraer el número final (todos los dígitos al final de la cadena)
        const numberMatch = base.match(/\d+$/);
        const numberPart = numberMatch ? numberMatch[0] : '';

        // Crear la abreviatura del tipo (4 letras, primera en mayúscula)
        const typeAbbr = targetType.substring(0, 4);
        const capitalizedAbbr = typeAbbr.charAt(0).toUpperCase() + typeAbbr.slice(1).toLowerCase();

        // Construir el nuevo consecutivo
        let result = `${prefix}${capitalizedAbbr}${numberPart}`;
        
        // Añadir la F si es facturado
        if (targetFacturado) {
            result = 'F' + result;
        }

        setConsecutivo(result);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const { error } = await supabase
                .from('Servicios')
                .update({
                    consecutivo: consecutivo,
                    tipo_de_servicio: tipoServicio,
                    facturado: facturado
                })
                .eq('id', serviceId);

            if (error) throw error;

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating service:', error);
            alert('Error al actualizar el servicio');
        } finally {
            setLoading(false);
        }
    };

    const tipoOpciones = [
        'mantenimiento',
        'mantenimiento_con_kit',
        'instalacion',
        'visita_instalacion',
        'entrega',
        'garantia_sin_pedido',
        'garantia_con_repuesto_kit',
        'reparacion_atencion',
        'reparacion_atencion_con_repuesto_kit',
        'error_en_pedido_referencia',
        'quebrados_logistica',
        'garantia_con_pedido_de_reposicion',
        'atencion_con_pedido_de_reposicion',
        'reparacion_y_mantenimiento_(facturado)'
    ];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-[350px] bg-white rounded-3xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 pb-0 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-brand tracking-tight">
                            Modificar Consecutivo
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Tipo de Servicio */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Shield className="w-3 h-3" />
                                Tipo de servicio
                            </label>
                            <select
                                value={tipoServicio}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setTipoServicio(val);
                                    const isFact = val === 'reparacion_y_mantenimiento_(facturado)';
                                    setFacturado(isFact);
                                    adjustConsecutivo(val, isFact);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all appearance-none cursor-pointer text-slate-700"
                            >
                                <option value="">Seleccione una opción...</option>
                                {tipoOpciones.map((opcion) => (
                                    <option key={opcion} value={opcion}>
                                        {opcion.replace(/_/g, ' ')}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Facturado Switch */}
                        <div className="flex items-center justify-between bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-brand/60" />
                                ¿Es facturado?
                            </label>
                            <button
                                onClick={() => {
                                    const newVal = !facturado;
                                    setFacturado(newVal);
                                    adjustConsecutivo(tipoServicio, newVal);
                                }}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${facturado ? 'bg-brand' : 'bg-slate-200'}`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${facturado ? 'translate-x-6' : 'translate-x-1'}`}
                                />
                            </button>
                        </div>

                        {/* Consecutivo */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <FileText className="w-3 h-3" />
                                Consecutivo
                            </label>
                            <input
                                type="text"
                                value={consecutivo}
                                onChange={(e) => setConsecutivo(e.target.value)}
                                placeholder="Ingrese el consecutivo..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all text-slate-700 shadow-inner"
                            />
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="w-full bg-brand text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Guardar cambios
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
