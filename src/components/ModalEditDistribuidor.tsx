import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, ChevronDown, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ModalEditDistribuidorProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData: {
        ubicacion_id: number;
        ubicacion_direccion: string;
        ubicacion_ciudad: string;
        ubicacion_contacto: string;
        ubicacion_telefono: string;
    };
}

export default function ModalEditDistribuidor({
    isOpen,
    onClose,
    onSuccess,
    initialData
}: ModalEditDistribuidorProps) {
    const [formData, setFormData] = useState({
        direccion: initialData.ubicacion_direccion || '',
        ciudad_id: '',
        contacto: initialData.ubicacion_contacto || '',
        telefono: initialData.ubicacion_telefono || ''
    });

    const [ciudades, setCiudades] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // City Dropdown State
    const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
    const [citySearch, setCitySearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchCiudades = async () => {
            const { data } = await supabase.from('query_ciudades').select('*');
            if (data) {
                setCiudades(data);
                // Pre-select the existing city if possible
                const existing = data.find(c => c.ciudad === initialData.ubicacion_ciudad);
                if (existing) {
                    setFormData(prev => ({ ...prev, ciudad_id: existing.id.toString() }));
                }
            }
        };
        if (isOpen) {
            fetchCiudades();
            setFormData({
                direccion: initialData.ubicacion_direccion || '',
                ciudad_id: '',
                contacto: initialData.ubicacion_contacto || '',
                telefono: initialData.ubicacion_telefono || ''
            });
        }
    }, [isOpen, initialData]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsCityDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedCityData = ciudades.find(c => c.id.toString() === formData.ciudad_id);

    const filteredCiudades = useMemo(() => {
        const query = citySearch.trim().toLowerCase();
        if (!query) return ciudades;
        return ciudades.filter(city => 
            String(city.ciudad || '').toLowerCase().includes(query)
        );
    }, [ciudades, citySearch]);

    const handleCityChange = (id: string) => {
        setFormData(prev => ({ ...prev, ciudad_id: id }));
        setIsCityDropdownOpen(false);
        setCitySearch('');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!initialData.ubicacion_id) {
            setError('No hay un distribuidor/ubicación asociada a este servicio.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const updatePayload: any = {
                direccion: formData.direccion,
                nombre_contacto: formData.contacto,
                telefono: formData.telefono
            };
            if (formData.ciudad_id) {
                updatePayload.ciudad_id = parseInt(formData.ciudad_id);
            }

            const { error: updateError } = await supabase
                .from('Ubicaciones')
                .update(updatePayload)
                .eq('id', initialData.ubicacion_id);

            if (updateError) throw updateError;

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error updating distribuidor data:', err);
            setError(err.message || 'Error al actualizar la información del distribuidor.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                >
                    <div className="flex items-center justify-between p-6 border-b border-slate-100">
                        <div>
                            <h2 className="text-lg font-black text-slate-800">Editar Datos del Canal / Distribuidor</h2>
                            <p className="text-sm text-slate-500 mt-1">Actualice la información de ubicación y contacto</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto">
                        {error && (
                            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <form id="edit-distribuidor-form" onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    Dirección
                                </label>
                                <input
                                    type="text"
                                    name="direccion"
                                    value={formData.direccion}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                                    placeholder="Ej. Calle 123 #45-67"
                                />
                            </div>

                            <div ref={dropdownRef} className="relative">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Ciudad</label>
                                <div
                                    onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white text-left flex items-center justify-between cursor-pointer"
                                >
                                    <span className={selectedCityData ? 'text-slate-900' : 'text-slate-500'}>
                                        {selectedCityData ? selectedCityData.ciudad : 'Seleccionar ciudad...'}
                                    </span>
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                </div>

                                <AnimatePresence>
                                    {isCityDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden"
                                        >
                                            <div className="p-2 border-b border-slate-100 relative">
                                                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                                <input
                                                    type="text"
                                                    className="w-full pl-8 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                                                    placeholder="Buscar ciudad..."
                                                    value={citySearch}
                                                    onChange={(e) => setCitySearch(e.target.value)}
                                                />
                                            </div>
                                            <div className="max-h-60 overflow-y-auto">
                                                {filteredCiudades.length === 0 ? (
                                                    <div className="p-4 text-center text-slate-500 text-sm">
                                                        No se encontraron ciudades
                                                    </div>
                                                ) : (
                                                    filteredCiudades.map(city => (
                                                        <div
                                                            key={city.id}
                                                            onClick={() => handleCityChange(city.id.toString())}
                                                            className={`px-4 py-2 cursor-pointer text-sm transition-colors ${
                                                                formData.ciudad_id === city.id.toString()
                                                                    ? 'bg-brand/10 text-brand font-medium'
                                                                    : 'hover:bg-slate-50 text-slate-700'
                                                            }`}
                                                        >
                                                            {city.ciudad}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    Persona de Contacto
                                </label>
                                <input
                                    type="text"
                                    name="contacto"
                                    value={formData.contacto}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                                    placeholder="Nombre del contacto"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    Teléfono de Contacto
                                </label>
                                <input
                                    type="text"
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                                    placeholder="Ej. 3001234567"
                                />
                            </div>
                        </form>
                    </div>

                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="edit-distribuidor-form"
                            disabled={loading}
                            className="px-6 py-2.5 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
