'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, X, Loader2, MapPin, Phone, User as UserIcon, Building2, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ModalCrearClienteFinal from '../base-de-datos/ModalCrearClienteFinal';


interface BuscadorClienteFinalProps {
    onSelect: (cliente: any) => void;
    onClose: () => void;
}

type SearchCriteria = 'cedula' | 'nombre';

export default function BuscadorClienteFinal({ onSelect, onClose }: BuscadorClienteFinalProps) {
    const [criteria, setCriteria] = useState<SearchCriteria>('nombre');
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);



    useEffect(() => {
        const search = async () => {
            if (searchTerm.length < 3) {
                setResults([]);
                setSearchError(null);
                return;
            }

            setLoading(true);
            setSearchError(null);

            try {
                let response;
                const query = supabase.from('query_consumidores').select('*');
                const filteredQuery = criteria === 'cedula'
                    ? query.ilike('cedula', `%${searchTerm}%`)
                    : query.ilike('contacto', `%${searchTerm}%`);
                response = await filteredQuery.limit(20);


                if (response.error) throw response.error;
                setResults(response.data || []);
            } catch (err: any) {
                console.error('Error in search:', err);
                const errorMsg = err.message || (typeof err === 'string' ? err : 'Error desconocido al buscar datos');
                setSearchError(errorMsg);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(search, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, criteria]);


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
                <div className="p-6 bg-emerald-600 text-white flex items-center justify-between flex-shrink-0">
                    <h2 className="font-black uppercase tracking-widest text-lg flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        Buscar Cliente Final
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-4 flex-1 overflow-hidden">
                    {/* Search Field */}


                    {/* Criteria Selection (Only for Consumidor) */}
                    <div className="flex gap-4 px-2">
                        <button
                            onClick={() => setCriteria('cedula')}
                            className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${criteria === 'cedula' ? 'text-emerald-600' : 'text-slate-400'}`}
                        >
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${criteria === 'cedula' ? 'border-emerald-600' : 'border-slate-300'}`}>
                                {criteria === 'cedula' && <div className="w-2 h-2 bg-emerald-600 rounded-full" />}
                            </div>
                            Cédula
                        </button>
                        <button
                            onClick={() => setCriteria('nombre')}
                            className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${criteria === 'nombre' ? 'text-emerald-600' : 'text-slate-400'}`}
                        >
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${criteria === 'nombre' ? 'border-emerald-600' : 'border-slate-300'}`}>
                                {criteria === 'nombre' && <div className="w-2 h-2 bg-emerald-600 rounded-full" />}
                            </div>
                            Nombre
                        </button>
                    </div>


                    {/* Search Field */}
                    <div className="relative">
                        <input
                            autoFocus
                            type="text"
                            placeholder={`Buscar por ${criteria}...`}

                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-700"
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
                                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                                <span className="font-bold uppercase tracking-widest text-xs">Buscando...</span>
                            </div>
                        ) : results.length > 0 ? (
                            results.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onSelect({ ...item, _search_type: 'consumidor' })}

                                    className="flex flex-col p-4 bg-slate-50 hover:bg-emerald-50 border border-slate-100 rounded-2xl transition-all text-left group"
                                >
                                    <span className="font-black text-emerald-700 uppercase tracking-tight mb-2 group-hover:translate-x-1 transition-transform">
                                        {item.contacto}
                                    </span>


                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                        {(item.cedula || item.nit || item.cliente_nit) && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
                                                <CreditCard className="w-3 h-3 text-slate-400" />
                                                {item.cedula || item.nit || item.cliente_nit}
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
                                Ingrese al menos 3 caracteres para iniciar la búsqueda en Consumidores
                            </div>

                        )}
                    </div>

                    {/* Footer / Create Link */}
                    <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            ¿No encuentras el cliente?
                        </p>
                        <button 
                            onClick={() => setShowCreateModal(true)}
                            className="text-xs font-black text-emerald-600 uppercase tracking-widest hover:underline decoration-2 underline-offset-4"
                        >
                            Crear Nuevo Cliente
                        </button>
                    </div>
                </div>
            </motion.div>

            <ModalCrearClienteFinal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    setShowCreateModal(false);
                }}

            />
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
