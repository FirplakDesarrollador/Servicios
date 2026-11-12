'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Zap, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ModalEditPedidoProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    serviceId: string | number;
    initialData: {
        numero_de_pedido: string | null;
    };
}

export default function ModalEditPedido({
    isOpen,
    onClose,
    onSuccess,
    serviceId,
    initialData
}: ModalEditPedidoProps) {
    const [loading, setLoading] = useState(false);
    const [numeroPedido, setNumeroPedido] = useState(initialData.numero_de_pedido || '');

    useEffect(() => {
        if (isOpen) {
            setNumeroPedido(initialData.numero_de_pedido || '');
        }
    }, [isOpen, initialData]);

    const handleSave = async () => {
        try {
            setLoading(true);
            const { error } = await supabase
                .from('Servicios')
                .update({
                    numero_de_pedido: numeroPedido
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
                            Modificar Pedido / Factura
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Pedido / Factura */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Zap className="w-3 h-3" />
                                Pedido / Factura
                            </label>
                            <input
                                type="text"
                                value={numeroPedido}
                                onChange={(e) => setNumeroPedido(e.target.value)}
                                placeholder="Ingrese el pedido / factura..."
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
