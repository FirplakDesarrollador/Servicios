'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, X, Loader2, Package, Hash, Tag, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BuscadorProductosProps {
    productosSeleccionados: any[];
    onAdd: (producto: any) => void;
    onRemove: (index: number) => void;
    onClose: () => void;
}

const GRUPOS = [
    'BANO', 'BANERA', 'COCINAS', 'EXHIBIDOR', 'HIDROEMP', 'HIDROPOR',
    'MPDIRECT', 'PLOMERIA', 'REPUESTO', 'ROPAS', 'SERVICIOS',
    'ZOCALOS', 'QUARTZSTONE', 'GRIFERIA'
];

export default function BuscadorProductos({ productosSeleccionados, onAdd, onRemove, onClose }: BuscadorProductosProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [grupo, setGrupo] = useState<string>('HIDROPOR');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    useEffect(() => {
        const search = async () => {
            setLoading(true);
            setSearchError(null);
            try {
                let query = supabase.from('Productos').select('*');

                if (grupo) {
                    query = query.eq('grupo', grupo);
                }

                if (searchTerm) {
                    query = query.or(`nombre.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,color_base.ilike.%${searchTerm}%,color_mueble.ilike.%${searchTerm}%`);
                }

                const { data, error } = await query
                    .order('nombre', { ascending: true })
                    .limit(50);

                if (error) throw error;
                setResults(data || []);
            } catch (err: any) {
                console.error('Error searching products:', err);
                setSearchError(err.message || 'Error al buscar productos');
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(search, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, grupo]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white w-full max-w-[1000px] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative"
            >
                {/* Header matching Flutter: Text left, X Button right - simple white/clean */}
                <div className="h-[50px] px-4 flex items-center justify-between border-b border-slate-100">
                    <span className="text-xl font-semibold text-slate-800">
                        Buscar productos
                    </span>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-6 h-6 text-slate-500" />
                    </button>
                </div>

                {/* Filters Area */}
                <div className="p-4 flex flex-col gap-4">
                    <div className="flex flex-wrap gap-4">
                        {/* Group Dropdown */}
                        <div className="w-[200px] flex flex-col gap-1">
                            <label className="text-sm text-slate-700 font-medium">Grupo</label>
                            <div className="relative">
                                <select
                                    value={grupo}
                                    onChange={(e) => setGrupo(e.target.value)}
                                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 appearance-none focus:outline-none focus:border-brand"
                                >
                                    {GRUPOS.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Advanced Search Input */}
                        <div className="w-[320px] flex flex-col gap-1">
                            <label className="text-sm text-slate-700 font-medium">Filtro avanzado</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="sku / descripcion / color"
                                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area (Two Columns) */}
                <div className="flex-1 overflow-hidden p-4 pt-0">
                    <div className="bg-slate-50 rounded-xl p-3 h-full overflow-y-auto custom-scrollbar">
                        <div className="flex flex-wrap justify-center gap-4">

                            {/* Left Column: Productos Encontrados */}
                            <div className="w-full max-w-[450px] flex flex-col gap-2">
                                <div className="flex items-center gap-1">
                                    <span className="text-sm text-slate-700">Productos encontrados:</span>
                                    <span className="text-sm text-slate-400 font-light">{results.length}</span>
                                </div>
                                <div className="bg-white rounded-lg border border-slate-200 min-h-[300px] flex flex-col p-1 gap-1.5">
                                    {loading ? (
                                        <div className="flex items-center justify-center h-40">
                                            <Loader2 className="w-6 h-6 animate-spin text-brand" />
                                        </div>
                                    ) : results.length > 0 ? (
                                        results.map((item) => {
                                            const isAlreadySelected = productosSeleccionados.some(p => p.id === item.id);
                                            return (
                                                <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-2 flex items-center gap-2">
                                                    <div className="flex-1 flex flex-col min-w-0">
                                                        <span className="text-sm text-slate-800">{item.sku}</span>
                                                        <span className="text-xs text-slate-400 font-light truncate">{item.nombre}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => !isAlreadySelected && onAdd(item)}
                                                        disabled={isAlreadySelected}
                                                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isAlreadySelected
                                                            ? 'bg-slate-100 text-slate-300'
                                                            : 'bg-slate-800 text-white hover:bg-slate-700'
                                                            }`}
                                                    >
                                                        <Plus className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                            <Package className="w-8 h-8 opacity-20 mb-2" />
                                            <span className="text-xs font-medium italic">
                                                {searchTerm || grupo ? 'No se encontraron productos' : 'Cargando inventario...'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Productos Seleccionados */}
                            <div className="w-full max-w-[450px] flex flex-col gap-2">
                                <div className="flex items-center gap-1">
                                    <span className="text-sm text-slate-700">Productos seleccionados:</span>
                                    <span className="text-sm text-slate-400 font-light">{productosSeleccionados.length}</span>
                                </div>
                                <div className="bg-white rounded-lg border border-slate-200 min-h-[300px] flex flex-col p-1 gap-1.5">
                                    {productosSeleccionados.length > 0 ? (
                                        productosSeleccionados.map((item, idx) => (
                                            <div key={`sel-${idx}`} className="bg-white border border-slate-200 rounded-lg p-2 flex items-center gap-2">
                                                <div className="flex-1 flex flex-col min-w-0">
                                                    <span className="text-sm text-slate-800">{item.sku}</span>
                                                    <span className="text-xs text-slate-400 font-light truncate">{item.nombre}</span>
                                                </div>
                                                <button
                                                    onClick={() => onRemove(idx)}
                                                    className="w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-xs text-slate-400 italic">
                                            Ningún producto seleccionado
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
