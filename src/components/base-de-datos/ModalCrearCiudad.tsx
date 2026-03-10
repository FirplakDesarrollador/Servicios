'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    X, 
    Building2, 
    MapPin, 
    User, 
    Loader2, 
    CheckCircle2,
    AlertCircle,
    PlusCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalCrearCiudadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ModalCrearCiudad({ isOpen, onClose, onSuccess }: ModalCrearCiudadProps) {
    const [loading, setLoading] = useState(false);
    const [zonas, setZonas] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        pais: 'Colombia',
        departamento: '',
        ciudad: '',
        zona_id: '',
    });

    const [coordinadorNombre, setCoordinadorNombre] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchZonas();
        }
    }, [isOpen]);

    const fetchZonas = async () => {
        const { data, error } = await supabase
            .from('query_zonas')
            .select('*')
            .order('zona');
        
        if (error) {
            console.error('Error fetching zonas:', error);
            return;
        }
        setZonas(data || []);
    };

    const handleZonaChange = (zonaId: string) => {
        setFormData(prev => ({ ...prev, zona_id: zonaId }));
        const selectedZona = zonas.find(z => z.id.toString() === zonaId);
        setCoordinadorNombre(selectedZona ? selectedZona.coordinador_nombre : '');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!formData.zona_id) {
            setError('Por favor seleccione una zona');
            setLoading(false);
            return;
        }

        try {
            const { error: insertError } = await supabase
                .from('Ciudades')
                .insert([{
                    pais: formData.pais,
                    departamento: formData.departamento,
                    ciudad: formData.ciudad,
                    zona_id: parseInt(formData.zona_id),
                    created_at: new Date().toISOString()
                }]);

            if (insertError) throw insertError;

            onSuccess();
            onClose();
            // Reset form
            setFormData({
                pais: 'Colombia',
                departamento: '',
                ciudad: '',
                zona_id: '',
            });
            setCoordinadorNombre('');
        } catch (err: any) {
            console.error('Error creating city:', err);
            setError(err.message || 'Error al crear la ciudad');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20"
                    >
                        {/* Header */}
                        <div className="bg-brand p-8 text-white relative">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                        <PlusCircle className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase tracking-tighter">Crear Ciudad</h2>
                                        <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Nuevo Registro Base</p>
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

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
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
                                {/* País */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">País</label>
                                    <div className="relative group">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand transition-colors" />
                                        <input 
                                            type="text"
                                            value={formData.pais}
                                            onChange={(e) => setFormData(prev => ({ ...prev, pais: e.target.value }))}
                                            required
                                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-brand/30 focus:bg-white transition-all"
                                            placeholder="Colombia"
                                        />
                                    </div>
                                </div>

                                {/* Departamento */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Departamento</label>
                                    <div className="relative group">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand transition-colors" />
                                        <input 
                                            type="text"
                                            value={formData.departamento}
                                            onChange={(e) => setFormData(prev => ({ ...prev, departamento: e.target.value }))}
                                            required
                                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-brand/30 focus:bg-white transition-all"
                                            placeholder="Antioquia"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Ciudad */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre de la Ciudad</label>
                                <div className="relative group">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand transition-colors" />
                                    <input 
                                        type="text"
                                        value={formData.ciudad}
                                        onChange={(e) => setFormData(prev => ({ ...prev, ciudad: e.target.value }))}
                                        required
                                        className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-brand/30 focus:bg-white transition-all"
                                        placeholder="Medellín"
                                    />
                                </div>
                            </div>

                            {/* Zona */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Zona Operativa</label>
                                <select 
                                    value={formData.zona_id}
                                    onChange={(e) => handleZonaChange(e.target.value)}
                                    required
                                    className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-brand/30 focus:bg-white transition-all appearance-none"
                                >
                                    <option value="">Seleccione una zona...</option>
                                    {zonas.map(zona => (
                                        <option key={zona.id} value={zona.id}>{zona.zona}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Coordinador (Read Only) */}
                            {coordinadorNombre && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200"
                                >
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Coordinador de Servicio</label>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-brand/10 rounded-full flex items-center justify-center">
                                            <User className="w-4 h-4 text-brand" />
                                        </div>
                                        <span className="text-sm font-black text-slate-700 uppercase">{coordinadorNombre}</span>
                                    </div>
                                </motion.div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-4 pt-4">
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
                                    className="flex-[2] h-14 bg-brand text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-brand/20 hover:shadow-brand/40 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-5 h-5" />
                                            Crear Ciudad
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
