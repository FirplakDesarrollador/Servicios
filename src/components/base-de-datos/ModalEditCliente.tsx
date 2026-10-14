'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    X, 
    Hash, 
    Building, 
    Loader2, 
    CheckCircle2,
    AlertCircle,
    Store,
    Globe,
    Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalEditClienteProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData: any;
}

export default function ModalEditCliente({ isOpen, onClose, onSuccess, initialData }: ModalEditClienteProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        id: null as number | null,
        tipo_de_cliente: '',
        mercado: '',
        nit: '',
        nombre: '',
    });

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                id: initialData.id,
                tipo_de_cliente: initialData.tipo_de_cliente || '',
                mercado: initialData.mercado || initialData.Mercado || '',
                nit: initialData.nit || '',
                nombre: initialData.nombre || '',
            });
            setError(null);
        }
    }, [isOpen, initialData]);

    const handleNitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, ''); // Solo dígitos numéricos
        setFormData(prev => ({ ...prev, nit: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!formData.tipo_de_cliente) {
            setError('Por favor seleccione el tipo de cliente (Canal)');
            setLoading(false);
            return;
        }

        if (!formData.mercado) {
            setError('Por favor seleccione el mercado (Nacional o Internacional)');
            setLoading(false);
            return;
        }

        if (!formData.nombre.trim()) {
            setError('Por favor ingrese el nombre comercial / razón social');
            setLoading(false);
            return;
        }

        if (!formData.nit.trim()) {
            setError('Por favor ingrese el NIT / identificación');
            setLoading(false);
            return;
        }

        try {
            const { error: updateError } = await supabase
                .from('Clientes')
                .update({
                    tipo_de_cliente: formData.tipo_de_cliente,
                    Mercado: formData.mercado,
                    nit: formData.nit,
                    nombre: formData.nombre.trim(),
                })
                .eq('id', formData.id);

            if (updateError) throw updateError;

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error updating client:', err);
            setError(err.message || 'Error al actualizar el cliente');
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
                        <div className="bg-indigo-600 p-8 text-white relative">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                        <Pencil className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase tracking-tighter">Editar Cliente</h2>
                                        <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                                            ID #{formData.id} · Actualizar Clasificación y Datos
                                        </p>
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
                        <form onSubmit={handleSubmit} className="p-8 space-y-5">
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

                            {/* Tipo de Cliente (Canal Comercial) */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                    Canal Comercial / Tipo de Cliente *
                                </label>
                                <div className="relative group">
                                    <select 
                                        value={formData.tipo_de_cliente}
                                        onChange={(e) => setFormData(prev => ({ ...prev, tipo_de_cliente: e.target.value }))}
                                        required
                                        className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all appearance-none"
                                    >
                                        <option value="">Seleccione el tipo...</option>
                                        <option value="Distribuidor">Distribuidor</option>
                                        <option value="Constructor">Constructor</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Building className="w-4 h-4 text-slate-400" />
                                    </div>
                                </div>
                            </div>

                            {/* Mercado (Nacional / Internacional) */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Mercado *
                                    </label>
                                    {!formData.mercado && (
                                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded-md">
                                            Sin clasificar
                                        </span>
                                    )}
                                </div>
                                <div className="relative group">
                                    <select 
                                        value={formData.mercado}
                                        onChange={(e) => setFormData(prev => ({ ...prev, mercado: e.target.value }))}
                                        required
                                        className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all appearance-none"
                                    >
                                        <option value="">Seleccione el mercado...</option>
                                        <option value="Nacional">Nacional</option>
                                        <option value="Internacional">Internacional</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Globe className="w-4 h-4 text-slate-400" />
                                    </div>
                                </div>
                                <p className="text-[9px] text-slate-400 font-medium ml-1">
                                    Indica si las operaciones de este cliente corresponden a mercado Nacional o Internacional.
                                </p>
                            </div>

                            {/* NIT */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                    NIT / Identificación *
                                </label>
                                <div className="relative group">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                    <input 
                                        type="text"
                                        value={formData.nit}
                                        onChange={handleNitChange}
                                        required
                                        className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all"
                                        placeholder="Ej: 900123456"
                                        inputMode="numeric"
                                    />
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest ml-1">Solo dígitos numéricos</p>
                            </div>

                            {/* Nombre */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                    Nombre Comercial / Razón Social *
                                </label>
                                <div className="relative group">
                                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                    <input 
                                        type="text"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                                        required
                                        className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all"
                                        placeholder="Nombre de la empresa"
                                    />
                                </div>
                            </div>

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
                                    className="flex-[2] h-14 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-200 hover:shadow-indigo-400 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-5 h-5" />
                                            Guardar Cambios
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
