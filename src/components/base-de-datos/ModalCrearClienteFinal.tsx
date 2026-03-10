'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    X, 
    User, 
    Hash, 
    MapPin, 
    Phone, 
    Mail, 
    Loader2, 
    CheckCircle2,
    AlertCircle,
    UserPlus,
    Building2,
    Compass,
    AtSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalCrearClienteFinalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ModalCrearClienteFinal({ isOpen, onClose, onSuccess }: ModalCrearClienteFinalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Data lists
    const [ciudades, setCiudades] = useState<any[]>([]);

    // Form states
    const [formData, setFormData] = useState({
        cedula: '',
        contacto: '',
        ciudad_id: '',
        direccion: '',
        descripcion_direccion: '',
        telefono: '',
        correo_electronico: '',
    });

    // Geographic info (auto-filled)
    const [geoInfo, setGeoInfo] = useState({
        departamento: '',
    });

    useEffect(() => {
        if (isOpen) {
            fetchCiudades();
        }
    }, [isOpen]);

    const fetchCiudades = async () => {
        try {
            const { data } = await supabase
                .from('query_ciudades')
                .select('*')
                .order('ciudad');
            setCiudades(data || []);
        } catch (err) {
            console.error('Error fetching cities:', err);
        }
    };

    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        const selected = ciudades.find(c => c.id.toString() === id);
        
        setFormData(prev => ({ ...prev, ciudad_id: id }));
        
        if (selected) {
            setGeoInfo({
                departamento: selected.departamento || '',
            });
        } else {
            setGeoInfo({ departamento: '' });
        }
    };

    const handleNoEmail = () => {
        setFormData(prev => ({ ...prev, correo_electronico: 'notiene@correo.com' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validations
        if (!formData.cedula || !formData.contacto || !formData.ciudad_id || !formData.telefono) {
            setError('Por favor complete los campos obligatorios (*)');
            setLoading(false);
            return;
        }

        try {
            const { error: insertError } = await supabase
                .from('Consumidores')
                .insert([{
                    cedula: formData.cedula,
                    contacto: formData.contacto.toUpperCase(),
                    telefono: formData.telefono,
                    direccion: formData.direccion.toUpperCase(),
                    descripcion_direccion: formData.descripcion_direccion.toUpperCase(),
                    ciudad_id: parseInt(formData.ciudad_id),
                    correo_electronico: formData.correo_electronico.toLowerCase(),
                    created_at: new Date().toISOString()
                }]);

            if (insertError) throw insertError;

            onSuccess();
            onClose();
            // Reset form
            setFormData({
                cedula: '',
                contacto: '',
                ciudad_id: '',
                direccion: '',
                descripcion_direccion: '',
                telefono: '',
                correo_electronico: '',
            });
            setGeoInfo({ departamento: '' });
        } catch (err: any) {
            console.error('Error creating consumer:', err);
            setError(err.message || 'Error al crear el cliente final');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="bg-rose-500 p-8 text-white relative flex-shrink-0">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                        <UserPlus className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase tracking-tighter">Crear Cliente Final</h2>
                                        <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Consumidor Directo</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6">
                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold"
                                >
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    {error}
                                </motion.div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Cédula */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cédula / Identificación *</label>
                                    <div className="relative group">
                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                                        <input 
                                            type="text"
                                            value={formData.cedula}
                                            onChange={(e) => setFormData(prev => ({ ...prev, cedula: e.target.value }))}
                                            required
                                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-rose-300 focus:bg-white transition-all"
                                            placeholder="Ej: 10203040"
                                        />
                                    </div>
                                </div>

                                {/* Nombre */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Completo *</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                                        <input 
                                            type="text"
                                            value={formData.contacto}
                                            onChange={(e) => setFormData(prev => ({ ...prev, contacto: e.target.value }))}
                                            required
                                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-rose-300 focus:bg-white transition-all"
                                            placeholder="Nombre del cliente"
                                        />
                                    </div>
                                </div>

                                {/* Ciudad */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Ciudad *</label>
                                    <div className="relative group">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-rose-500 transition-colors z-10" />
                                        <select 
                                            value={formData.ciudad_id}
                                            onChange={handleCityChange}
                                            required
                                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-rose-300 focus:bg-white transition-all appearance-none"
                                        >
                                            <option value="">Seleccione ciudad...</option>
                                            {ciudades.map(c => (
                                                <option key={c.id} value={c.id}>{c.ciudad}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Departamento (Auto) */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Departamento</label>
                                    <div className="h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 flex items-center text-sm font-bold text-slate-400 italic">
                                        {geoInfo.departamento || 'Seleccione una ciudad'}
                                    </div>
                                </div>

                                {/* Dirección */}
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Dirección de Residencia</label>
                                    <div className="relative group">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                                        <input 
                                            type="text"
                                            value={formData.direccion}
                                            onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-rose-300 focus:bg-white transition-all"
                                            placeholder="Calle, Carrera, Barrio..."
                                        />
                                    </div>
                                </div>

                                {/* Referencia */}
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Punto de Referencia</label>
                                    <div className="relative group">
                                        <Compass className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                                        <input 
                                            type="text"
                                            value={formData.descripcion_direccion}
                                            onChange={(e) => setFormData(prev => ({ ...prev, descripcion_direccion: e.target.value }))}
                                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-rose-300 focus:bg-white transition-all"
                                            placeholder="Ej: Frente al parque principal"
                                        />
                                    </div>
                                </div>

                                {/* Teléfono */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Teléfono / WhatsApp *</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                                        <input 
                                            type="tel"
                                            value={formData.telefono}
                                            onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                                            required
                                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-rose-300 focus:bg-white transition-all"
                                            placeholder="3001234567"
                                        />
                                    </div>
                                </div>

                                {/* Correo */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Correo Electrónico</label>
                                        <button 
                                            type="button" 
                                            onClick={handleNoEmail}
                                            className="text-[9px] font-black text-rose-500 uppercase hover:underline"
                                        >
                                            No tiene correo
                                        </button>
                                    </div>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                                        <input 
                                            type="email"
                                            value={formData.correo_electronico}
                                            onChange={(e) => setFormData(prev => ({ ...prev, correo_electronico: e.target.value }))}
                                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-rose-300 focus:bg-white transition-all"
                                            placeholder="cliente@ejemplo.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 pt-4 sticky bottom-0 bg-white pb-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 h-14 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all active:scale-95"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] h-14 bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-rose-200 hover:shadow-rose-400 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-5 h-5" />
                                            Crear Cliente Final
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
