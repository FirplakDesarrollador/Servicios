'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    X, 
    Building2, 
    MapPin, 
    Phone, 
    Loader2, 
    Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalEditarUbicacionProps {
    isOpen?: boolean;
    onClose?: () => void;
    onSuccess: (updatedData?: any) => void;
    initialData: any;
}

export default function ModalEditarUbicacion({ isOpen = true, onClose, onSuccess, initialData }: ModalEditarUbicacionProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Data lists
    const [ciudades, setCiudades] = useState<any[]>([]);
    const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
    const [citySearch, setCitySearch] = useState('');
    const cityDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
                setIsCityDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [formData, setFormData] = useState({
        id: initialData?.id,
        nombre: initialData?.nombre || '',
        ciudad_id: (initialData?.ciudad_id || '').toString(),
        direccion: initialData?.direccion || '',
        telefono1: initialData?.telefono1 || initialData?.telefono || initialData?.celular || '',
    });

    useEffect(() => {
        if (isOpen) {
            fetchCiudades();
        }
    }, [isOpen]);

    const fetchCiudades = async () => {
        try {
            const { data } = await supabase.from('query_ciudades').select('*').order('ciudad');
            setCiudades(data || []);
        } catch (err) {
            console.error('Error fetching cities:', err);
        }
    };

    const selectedCityData = ciudades.find(c => c.id.toString() === formData.ciudad_id);
    const filteredCiudades = useMemo(() => {
        const query = citySearch.trim().toLowerCase();
        if (!query) return ciudades;
        return ciudades.filter(city => String(city.ciudad || '').toLowerCase().includes(query));
    }, [ciudades, citySearch]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!formData.nombre || !formData.ciudad_id || !formData.telefono1) {
            setError('Por favor complete los campos obligatorios (*)');
            setLoading(false);
            return;
        }

        try {
            const payload = {
                nombre: formData.nombre.toUpperCase(),
                telefono1: formData.telefono1,
                direccion: formData.direccion.toUpperCase(),
                ciudad_id: parseInt(formData.ciudad_id),
            };

            const { data, error: updateError } = await supabase
                .from('Ubicaciones')
                .update(payload)
                .eq('id', formData.id)
                .select('id')
                .single();
                
            if (updateError) throw updateError;

            // Fetch the FULL record with city names from the view to mimic query_ubicaciones
            const { data: fullRecord } = await supabase
                .from('query_ubicaciones_fast')
                .select('*')
                .eq('id', formData.id)
                .single();

            onSuccess(fullRecord || { ...formData, ...payload });
            if (onClose) onClose();
        } catch (err: any) {
            console.error('Error saving data:', err);
            setError(err.message || 'Error al guardar los datos');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />
                
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="px-8 py-6 bg-brand text-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                                <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-widest">
                                    Editar Datos
                                </h2>
                                <p className="text-brand-100 text-[10px] font-bold uppercase tracking-widest opacity-80">
                                    Canal de Venta
                                </p>
                            </div>
                        </div>
                        {onClose && (
                            <button 
                                onClick={onClose}
                                className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                        <form id="editUbicacionForm" onSubmit={handleSubmit} className="space-y-6">
                            
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                        <X className="w-4 h-4 text-red-600" />
                                    </div>
                                    <div className="flex-1 pt-1.5 text-sm font-medium text-red-600">
                                        {error}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-1.5 sm:col-span-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                                        Nombre / Razón Social <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                                        placeholder="Nombre del distribuidor o sala"
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-brand font-semibold text-slate-700 text-sm"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 flex justify-between">
                                        <span>Ciudad <span className="text-red-500">*</span></span>
                                    </label>
                                    <div className="relative" ref={cityDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                                            className={`w-full px-4 py-3 bg-slate-50 border-none rounded-2xl font-semibold text-sm flex items-center justify-between
                                                ${formData.ciudad_id ? 'text-slate-700' : 'text-slate-400'}`}
                                        >
                                            <span className="truncate pr-4">
                                                {selectedCityData ? selectedCityData.ciudad : 'Seleccionar ciudad...'}
                                            </span>
                                            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                        </button>

                                        <AnimatePresence>
                                            {isCityDropdownOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="absolute z-[120] top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
                                                >
                                                    <div className="p-2 border-b border-slate-100">
                                                        <div className="relative">
                                                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                            <input
                                                                autoFocus
                                                                type="text"
                                                                placeholder="Buscar ciudad..."
                                                                value={citySearch}
                                                                onChange={(e) => setCitySearch(e.target.value)}
                                                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                                                        {filteredCiudades.length > 0 ? (
                                                            filteredCiudades.map(city => (
                                                                <button
                                                                    key={city.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setFormData(prev => ({ ...prev, ciudad_id: city.id.toString() }));
                                                                        setIsCityDropdownOpen(false);
                                                                        setCitySearch('');
                                                                    }}
                                                                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                                                                        formData.ciudad_id === city.id.toString()
                                                                            ? 'bg-brand/10 text-brand font-bold'
                                                                            : 'hover:bg-slate-50 text-slate-600 font-medium'
                                                                    }`}
                                                                >
                                                                    {city.ciudad}
                                                                </button>
                                                            ))
                                                        ) : (
                                                            <div className="p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                                No se encontraron ciudades
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                                        Teléfono <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="tel"
                                            value={formData.telefono1}
                                            onChange={(e) => setFormData(prev => ({ ...prev, telefono1: e.target.value }))}
                                            placeholder="Ej. 3001234567"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-brand font-semibold text-slate-700 text-sm"
                                            required
                                        />
                                        <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                    </div>
                                </div>

                                <div className="space-y-1.5 sm:col-span-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                                        Dirección
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={formData.direccion}
                                            onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                                            placeholder="Dirección exacta"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-brand font-semibold text-slate-700 text-sm"
                                        />
                                        <MapPin className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-end gap-3">
                        {onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50 text-sm"
                            >
                                Cancelar
                            </button>
                        )}
                        <button
                            type="submit"
                            form="editUbicacionForm"
                            disabled={loading}
                            className="px-8 py-3 bg-brand hover:bg-brand/90 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-brand/25 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                'Guardar Cambios'
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
