'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, X, Loader2, Plus, Trash2, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BuscadorRepuestosProps {
    repuestosSeleccionados: any[];
    onAdd: (repuesto: any) => void;
    onRemove: (index: number) => void;
    onUpdateQuantity: (index: number, quantity: number) => void;
    onClose: () => void;
}

export default function BuscadorRepuestos({ repuestosSeleccionados, onAdd, onRemove, onUpdateQuantity, onClose }: BuscadorRepuestosProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    // Search effect
    useEffect(() => {
        const search = async () => {
            setLoading(true);
            try {
                let query = supabase
                    .from('Repuestos')
                    .select('*')
                    .limit(50);

                if (searchTerm) {
                    query = query.or(`nombre.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
                } else {
                    query = query.order('nombre', { ascending: true });
                }

                const { data, error } = await query;

                if (error) throw error;
                setResults(data || []);
                setSearchError(null);
            } catch (err: any) {
                console.error('Error searching repuestos:', err);
                setSearchError(err.message || 'Error al buscar repuestos');
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(search, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white w-full max-w-[95vw] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[85vh]"
            >
                {/* Header */}
                <div className="h-[60px] px-6 flex items-center justify-between border-b border-slate-100 bg-white">
                    <span className="text-xl font-bold text-slate-800">Buscar Repuestos</span>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-6 pb-2">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-slate-700 font-bold ml-1">Búsqueda</label>
                        <div className="relative">
                            <input
                                autoFocus
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="sku / descripcion"
                                className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-bold"
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        </div>
                    </div>
                </div>

                {/* Content - Two Columns */}
                <div className="flex-1 overflow-hidden p-6 pt-4 flex flex-col lg:flex-row gap-6">

                    {/* Left Column: Results */}
                    <div className="flex-1 basis-0 flex flex-col gap-3 min-h-0 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-sm font-bold text-slate-700">Repuestos encontrados:</span>
                            <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-full border border-slate-200">
                                {results.length}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2">
                            {loading ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 min-h-[200px]">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Buscando...</span>
                                </div>
                            ) : results.length > 0 ? (
                                results.map((item) => {
                                    // Check if item is already selected by comparing ID
                                    const isAlreadySelected = repuestosSeleccionados.some(r => r.id === item.id);

                                    return (
                                        <div
                                            key={item.id}
                                            className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 hover:shadow-sm transition-shadow"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-xs font-black text-indigo-600 uppercase tracking-wider bg-indigo-50 px-1.5 py-0.5 rounded">
                                                        {item.sku}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium text-slate-700 truncate" title={item.nombre}>
                                                    {item.nombre}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                    Stock: {item.stock || 0}
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => !isAlreadySelected && onAdd(item)}
                                                disabled={isAlreadySelected}
                                                className={`
                                                    w-9 h-9 rounded-lg flex items-center justify-center transition-all
                                                    ${isAlreadySelected
                                                        ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 shadow-sm shadow-indigo-200'}
                                                `}
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 min-h-[200px]">
                                    <Package className="w-10 h-10 opacity-20" />
                                    <span className="text-sm font-medium italic">
                                        {searchTerm ? 'No se encontraron resultados' : 'Cargando inventario...'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Divider for Desktop */}
                    <div className="hidden lg:block w-px bg-slate-200 my-4" />

                    {/* Right Column: Selected */}
                    <div className="flex-1 basis-0 flex flex-col gap-3 min-h-0 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-sm font-bold text-slate-700">Repuestos seleccionados:</span>
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100">
                                {repuestosSeleccionados.length}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2">
                            {repuestosSeleccionados.length > 0 ? (
                                repuestosSeleccionados.map((item, idx) => (
                                    <div
                                        key={`${item.id}-${idx}`}
                                        className="bg-indigo-50/30 border border-indigo-100 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-xs font-black text-indigo-600 uppercase tracking-wider bg-white px-1.5 py-0.5 rounded border border-indigo-100">
                                                    {item.sku}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-slate-700 line-clamp-2" title={item.nombre}>
                                                {item.nombre}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                                            {/* Quantity Control */}
                                            <div className="flex items-center bg-white rounded-lg border border-indigo-200 h-9">
                                                <button
                                                    onClick={() => {
                                                        const currentQty = item.cantidad || 1;
                                                        if (currentQty > 1) {
                                                            onUpdateQuantity(idx, currentQty - 1);
                                                        }
                                                    }}
                                                    className="w-8 h-full flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded-l-lg transition-colors font-bold"
                                                >
                                                    -
                                                </button>
                                                <span className="w-8 flex items-center justify-center text-sm font-bold text-slate-700 border-x border-indigo-100 px-1">
                                                    {item.cantidad || 1}
                                                </span>
                                                <button
                                                    onClick={() => onUpdateQuantity(idx, (item.cantidad || 1) + 1)}
                                                    className="w-8 h-full flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded-r-lg transition-colors font-bold"
                                                >
                                                    +
                                                </button>
                                            </div>

                                            {/* Delete Button */}
                                            <button
                                                onClick={() => onRemove(idx)}
                                                className="w-9 h-9 bg-white border border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 rounded-lg flex items-center justify-center transition-all shadow-sm"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 min-h-[200px] border-2 border-dashed border-slate-100 rounded-xl">
                                    <span className="text-sm font-medium italic">Sin repuestos seleccionados</span>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </motion.div>
        </motion.div>
    );
}
