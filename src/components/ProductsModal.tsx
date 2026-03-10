'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Loader2, Package, Tag, Hash, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductsModalProps {
    isOpen: boolean;
    onClose: () => void;
    servicioId: number;
}

export default function ProductsModal({ isOpen, onClose, servicioId }: ProductsModalProps) {
    const [loading, setLoading] = useState(true);
    const [productos, setProductos] = useState<any[]>([]);
    const [repuestos, setRepuestos] = useState<any[]>([]);

    useEffect(() => {
        if (!isOpen) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Products
                const { data: prodData, error: prodError } = await supabase
                    .from('ProductosServicios')
                    .select('*, producto:producto_id(*)')
                    .eq('servicio_id', servicioId);

                if (prodError) throw prodError;

                // Fetch Repuestos
                const { data: repData, error: repError } = await supabase
                    .from('RepuestosServicios')
                    .select('*, repuesto:repuesto_id(*)')
                    .eq('servicio_id', servicioId);

                if (repError) throw repError;

                setProductos(prodData || []);
                setRepuestos(repData || []);
            } catch (error) {
                console.error('Error fetching associated products:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isOpen, servicioId]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="p-8 pb-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Productos & Repuestos</h2>
                                <p className="text-sm text-slate-400 font-medium">Items asociados a este servicio</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all"
                            >
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="w-10 h-10 text-brand animate-spin" />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando items...</p>
                                </div>
                            ) : productos.length === 0 && repuestos.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-4">
                                        <Package className="w-10 h-10 text-slate-200" />
                                    </div>
                                    <p className="text-slate-500 font-bold text-lg tracking-tight">No hay items registrados</p>
                                    <p className="text-slate-400 text-sm">Este servicio no tiene productos ni repuestos asignados.</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {/* Products Section */}
                                    {productos.length > 0 && (
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-black text-brand uppercase tracking-[0.2em] flex items-center gap-2 ml-2">
                                                <Box className="w-4 h-4" />
                                                Productos ({productos.length})
                                            </h3>
                                            <div className="grid gap-3">
                                                {productos.map((item, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        className="group bg-slate-50 border border-slate-100 rounded-3xl p-5 hover:bg-white hover:border-brand/20 hover:shadow-xl hover:shadow-brand/5 transition-all duration-300 flex items-center gap-4"
                                                    >
                                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 group-hover:bg-brand group-hover:border-brand transition-colors duration-300">
                                                            <Package className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-[10px] font-black text-brand uppercase tracking-wider bg-brand/5 px-2 py-0.5 rounded-lg border border-brand/10">
                                                                    {item.producto?.sku || 'N/A'}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-400 italic">
                                                                    {item.producto?.grupo}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm font-bold text-slate-800 truncate uppercase tracking-tight">
                                                                {item.producto?.nombre}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Cantidad</span>
                                                            <span className="text-lg font-black text-slate-800 bg-white px-3 py-1 rounded-xl border border-slate-100 shadow-sm">
                                                                {item.cantidad}
                                                            </span>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Repuestos Section */}
                                    {repuestos.length > 0 && (
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2 ml-2">
                                                <Tag className="w-4 h-4" />
                                                Repuestos / Kits ({repuestos.length})
                                            </h3>
                                            <div className="grid gap-3">
                                                {repuestos.map((item, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: (productos.length + idx) * 0.05 }}
                                                        className="group bg-indigo-50/30 border border-indigo-100/50 rounded-3xl p-5 hover:bg-white hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex items-center gap-4"
                                                    >
                                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-indigo-50 group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-colors duration-300">
                                                            <Hash className="w-6 h-6 text-indigo-300 group-hover:text-white transition-colors" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                                                                    {item.repuesto?.sku || 'N/A'}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm font-bold text-slate-800 truncate uppercase tracking-tight">
                                                                {item.repuesto?.nombre}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Cantidad</span>
                                                            <span className="text-lg font-black text-slate-800 bg-white px-3 py-1 rounded-xl border border-indigo-50 shadow-sm">
                                                                {item.cantidad}
                                                            </span>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-center">
                            <button
                                onClick={onClose}
                                className="px-10 py-3 bg-brand text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                Entendido
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
