'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, X, Loader2, MapPin, Phone, User as UserIcon, Building2, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BuscadorClientesProps {
    canalVenta: string;
    onSelect: (cliente: any) => void;
    onClose: () => void;
}

export default function BuscadorClientes({ canalVenta, onSelect, onClose }: BuscadorClientesProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    useEffect(() => {
        const search = async () => {
            if (searchTerm.length < 3) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                // Search in query_ubicaciones view as requested
                // Criteria: cliente_nombre, nit, cliente_nit, direccion
                const { data, error } = await supabase
                    .from('query_ubicaciones')
                    .select('*')
                    .or(`cliente_nombre.ilike.%${searchTerm}%,nit.ilike.%${searchTerm}%,direccion.ilike.%${searchTerm}%`)
                    .limit(20);

                if (error) throw error;
                setResults(data || []);
                setSearchError(null);
            } catch (err: any) {
                console.error('Error searching clients:', err);
                setSearchError(err.message || 'Error al buscar datos');
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
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative"
            >
                <div className="p-6 bg-brand text-white flex items-center justify-between flex-shrink-0">
                    <h2 className="font-black uppercase tracking-widest text-lg flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        Buscar {canalVenta === 'canal_constructor' ? 'Obra / Proyecto' : 'Distribuidor'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-4 flex-1 overflow-hidden">
                    {/* Search Field */}
                    <div className="relative">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Buscar por nombre, NIT, contacto o dirección..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-brand transition-all font-bold text-slate-700"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <Eraser className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Results Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3 min-h-[150px]">
                        {searchError ? (
                            <div className="text-center py-10 bg-red-50 text-red-600 rounded-2xl border border-red-100 p-4">
                                <p className="font-bold text-xs uppercase tracking-widest mb-1">Error de Búsqueda</p>
                                <p className="text-[10px] opacity-80">{searchError}</p>
                            </div>
                        ) : loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-brand" />
                                <span className="font-bold uppercase tracking-widest text-xs">Buscando...</span>
                            </div>
                        ) : results.length > 0 ? (
                            results.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onSelect(item)}
                                    className="flex flex-col p-4 bg-slate-50 hover:bg-brand/5 border border-slate-100 rounded-2xl transition-all text-left group"
                                >
                                    <span className="font-black text-brand uppercase tracking-tight mb-2 group-hover:translate-x-1 transition-transform">
                                        {item.nombre || item.cliente_nombre}
                                    </span>

                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                        {(item.nit || item.cliente_nit) && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
                                                <CreditCard className="w-3 h-3 text-slate-400" />
                                                NIT: {item.nit || item.cliente_nit}
                                            </div>
                                        )}
                                        {item.nombre_contacto && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
                                                <UserIcon className="w-3 h-3 text-slate-400" />
                                                {item.nombre_contacto}
                                            </div>
                                        )}
                                        {item.telefono && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
                                                <Phone className="w-3 h-3 text-slate-400" />
                                                {item.telefono}
                                            </div>
                                        )}
                                        {item.ciudad && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
                                                <MapPin className="w-3 h-3 text-slate-400" />
                                                {item.ciudad}
                                            </div>
                                        )}
                                        {item.direccion && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase col-span-2">
                                                <MapPin className="w-3 h-3 text-slate-400 opacity-50" />
                                                {item.direccion}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))
                        ) : searchTerm.length >= 3 ? (
                            <div className="text-center py-20 text-slate-400 font-bold italic">
                                No se encontraron resultados
                            </div>
                        ) : (
                            <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-[10px] opacity-50 px-10 leading-relaxed">
                                Ingrese al menos 3 caracteres para buscar {canalVenta === 'canal_constructor' ? 'obras' : 'distribuidores'}
                            </div>
                        )}
                    </div>

                    {/* Footer / Create Link */}
                    <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            ¿No encuentras el registro?
                        </p>
                        <button className="text-xs font-black text-brand uppercase tracking-widest hover:underline decoration-2 underline-offset-4 flex items-center gap-2">
                            <Building2 className="w-3 h-3" />
                            Crear {canalVenta === 'canal_constructor' ? 'Nueva Obra' : 'Nuevo Distribuidor'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

function Eraser(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
            <path d="m22 21-14 0" />
            <path d="m18 11-4.7 4.7" />
        </svg>
    )
}
