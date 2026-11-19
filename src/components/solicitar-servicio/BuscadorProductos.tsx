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
    'TODOS', 'BANO', 'BANERA', 'COCINAS', 'EXHIBIDOR', 'HIDROEMP', 'HIDROPOR',
    'MPDIRECT', 'PLOMERIA', 'REPUESTO', 'ROPAS', 'SERVICIOS',
    'ZOCALOS', 'QUARTZSTONE', 'GRIFERIA', 'WELLNESS'
];

function getSearchVariants(token: string): string[] {
    const raw = token.trim();
    if (!raw) return [];
    
    // Normalization removing accents: á->a, é->e, í->i, ó->o, ú->u
    const unaccented = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const variants = new Set<string>();
    variants.add(raw);
    variants.add(unaccented);

    // Common Spanish word variations: bano <-> baño
    if (/bano/i.test(raw)) {
        variants.add(raw.replace(/bano/gi, 'baño'));
    }
    if (/baño/i.test(raw)) {
        variants.add(raw.replace(/baño/gi, 'bano'));
    }
    if (raw.includes('ñ') || raw.includes('Ñ')) {
        variants.add(raw.replace(/ñ/gi, 'n'));
        variants.add(raw.replace(/Ñ/gi, 'N'));
    }

    return Array.from(variants).filter(Boolean);
}

function sanitizeToken(str: string): string {
    return str.replace(/[,()%.]/g, '').trim();
}

function rankProduct(item: any, rawQuery: string, tokens: string[]): number {
    const rawLower = rawQuery.toLowerCase().trim();
    const rawNoAccent = rawLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const sku = (item.sku || '').toLowerCase();
    const skuNoAccent = sku.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const nombre = (item.nombre || '').toLowerCase();
    const nombreNoAccent = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 1. Exact SKU match
    if (sku === rawLower || skuNoAccent === rawNoAccent) return 1000;
    
    // 2. SKU starts with exact search query
    if (sku.startsWith(rawLower) || skuNoAccent.startsWith(rawNoAccent)) return 800;

    // 3. Exact full phrase in nombre
    if (nombre.includes(rawLower) || nombreNoAccent.includes(rawNoAccent)) return 600;

    // 4. Nombre starts with any search token
    if (tokens.some(t => nombre.startsWith(t) || nombreNoAccent.startsWith(t))) return 400;

    // 5. SKU contains query
    if (sku.includes(rawLower) || skuNoAccent.includes(rawNoAccent)) return 300;

    // 6. Default score
    return 100;
}

export default function BuscadorProductos({ productosSeleccionados, onAdd, onRemove, onClose }: BuscadorProductosProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [grupo, setGrupo] = useState<string>('TODOS');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    useEffect(() => {
        const search = async () => {
            setLoading(true);
            setSearchError(null);
            try {
                let query = supabase.from('Productos').select('*');

                if (grupo && grupo !== 'TODOS') {
                    query = query.eq('grupo', grupo);
                }

                const tokens = searchTerm.trim().split(/\s+/).filter(Boolean);

                if (tokens.length > 0) {
                    tokens.forEach(token => {
                        const variants = getSearchVariants(token).map(sanitizeToken).filter(Boolean);
                        if (variants.length > 0) {
                            const orClauses: string[] = [];
                            variants.forEach(v => {
                                orClauses.push(
                                    `nombre.ilike.%${v}%`,
                                    `sku.ilike.%${v}%`,
                                    `color_base.ilike.%${v}%`,
                                    `color_mueble.ilike.%${v}%`,
                                    `sku_base.ilike.%${v}%`,
                                    `codigo_barras.ilike.%${v}%`
                                );
                            });
                            query = query.or(orClauses.join(','));
                        }
                    });
                }

                const { data, error } = await query
                    .order('nombre', { ascending: true })
                    .limit(150);

                if (error) throw error;
                
                let sortedData = data || [];
                if (searchTerm.trim() && sortedData.length > 0) {
                    const cleanTokens = tokens.map(t => t.toLowerCase());
                    sortedData.sort((a, b) => {
                        const scoreA = rankProduct(a, searchTerm, cleanTokens);
                        const scoreB = rankProduct(b, searchTerm, cleanTokens);
                        if (scoreB !== scoreA) {
                            return scoreB - scoreA;
                        }
                        return (a.nombre || '').localeCompare(b.nombre || '');
                    });
                }

                setResults(sortedData);
            } catch (err: any) {
                console.error('Error searching products:', err);
                setSearchError(err.message || 'Error al buscar productos');
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(search, 350);
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
                        <div className="flex-1 min-w-[280px] flex flex-col gap-1">
                            <label className="text-sm text-slate-700 font-medium">Filtro avanzado</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar por palabras clave (ej: cocina agata 180, sikuani, sku...)"
                                    className="w-full h-10 pl-3 pr-9 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 transition-colors"
                                        title="Limpiar búsqueda"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area (Two Columns) */}
                <div className="flex-1 overflow-hidden p-4 pt-0">
                    <div className="bg-slate-50 rounded-xl p-3 h-full overflow-hidden">
                        <div className="flex flex-wrap justify-center gap-4">

                            {/* Left Column: Productos Encontrados */}
                            <div className="w-full max-w-[450px] flex flex-col gap-2">
                                <div className="flex items-center gap-1">
                                    <span className="text-sm text-slate-700">Productos encontrados:</span>
                                    <span className="text-sm text-slate-400 font-light">{results.length}</span>
                                </div>
                                <div className="bg-white rounded-lg border border-slate-200 max-h-[450px] overflow-y-auto custom-scrollbar flex flex-col p-1 gap-1.5">
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
                                                        <span className="text-xs text-slate-400 font-light line-clamp-2 leading-tight">{item.nombre}</span>
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
                                <div className="bg-white rounded-lg border border-slate-200 max-h-[450px] overflow-y-auto custom-scrollbar flex flex-col p-1 gap-1.5">
                                    {productosSeleccionados.length > 0 ? (
                                        productosSeleccionados.map((item, idx) => (
                                            <div key={`sel-${idx}`} className="bg-white border border-slate-200 rounded-lg p-2 flex items-center gap-2">
                                                <div className="flex-1 flex flex-col min-w-0">
                                                    <span className="text-sm text-slate-800">{item.sku}</span>
                                                    <span className="text-xs text-slate-400 font-light line-clamp-2 leading-tight">{item.nombre}</span>
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
