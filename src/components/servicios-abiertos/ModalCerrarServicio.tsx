'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ModalCerrarServicioProps {
    isOpen: boolean;
    onClose: () => void;
    service: any;
    onSuccess?: () => void;
    currentUser?: any;
}

export default function ModalCerrarServicio({ isOpen, onClose, service, onSuccess, currentUser }: ModalCerrarServicioProps) {
    const [razonCierre, setRazonCierre] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isSavingRef = useRef(false);

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setError(null);
            setRazonCierre('');
            isSavingRef.current = false;
        }
    }, [isOpen]);

    const handleSave = async () => {
        if (isSavingRef.current) return;

        if (!razonCierre.trim()) {
            setError('Las observaciones son obligatorias');
            return;
        }

        isSavingRef.current = true;
        setIsSaving(true);
        setError(null);

        try {
            // 1. Cerrar servicio
            const { error: updateError } = await supabase
                .from('Servicios')
                .update({
                    estado: false,
                    razon_cierre: razonCierre,
                    fecha_cierre: new Date().toISOString()
                })
                .eq('id', service.id);

            if (updateError) throw updateError;

            // 2. Registrar comentario de cierre
            const { error: commentError } = await supabase
                .from('Comentarios')
                .insert([{
                    servicio_id: service.id,
                    contenido: razonCierre,
                    tipo: 'observacion_general',
                    usuario_id: currentUser?.id
                }]);

            if (commentError) throw commentError;

            onSuccess?.();
            onClose();
        } catch (err: any) {
            console.error('Error al cerrar servicio:', err);
            setError(err.message || 'Error al procesar el cierre');
        } finally {
            setIsSaving(false);
            isSavingRef.current = false;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-[40px] overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="px-10 py-8 flex items-center justify-between border-b border-slate-50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                            Cierre de Servicio
                        </h2>
                        <p className="text-[10px] font-bold text-brand uppercase tracking-[0.2em] mt-1">
                            {service?.codigo_servicio || 'Servicio'}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center hover:bg-slate-100 transition-colors">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <div className="p-10 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600"
                        >
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
                        </motion.div>
                    )}

                    <div className="space-y-8">
                        {/* Observaciones Finales */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Observaciones del servicio</label>
                            <textarea
                                value={razonCierre}
                                onChange={(e) => setRazonCierre(e.target.value)}
                                placeholder="Observaciones finales o recomendaciones..."
                                rows={4}
                                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[24px] focus:outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand/20 transition-all font-medium text-slate-700 resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center gap-3 shadow-xl bg-brand text-white hover:bg-brand-dark shadow-brand/20"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                Finalizar Servicio
                                <CheckCircle className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
