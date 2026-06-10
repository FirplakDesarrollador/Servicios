'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    X, 
    Users, 
    Hash, 
    Building, 
    Loader2, 
    CheckCircle2,
    AlertCircle,
    PlusCircle,
    Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalCrearClienteProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ModalCrearCliente({ isOpen, onClose, onSuccess }: ModalCrearClienteProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        tipo_de_cliente: '',
        nit: '',
        nombre: '',
    });

    const handleNitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, ''); // Only numbers
        setFormData(prev => ({ ...prev, nit: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!formData.tipo_de_cliente) {
            setError('Por favor seleccione el tipo de cliente');
            setLoading(false);
            return;
        }

        try {
            const { error: insertError } = await supabase
                .from('Clientes')
                .insert([{
                    tipo_de_cliente: formData.tipo_de_cliente,
                    nit: formData.nit,
                    nombre: formData.nombre,
                    created_at: new Date().toISOString()
                }]);

            if (insertError) throw insertError;

            onSuccess();
            onClose();
            // Reset form
            setFormData({
                tipo_de_cliente: '',
                nit: '',
                nombre: '',
            });
        } catch (err: any) {
            console.error('Error creating client:', err);
            setError(err.message || 'Error al crear el cliente');
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
                                        <PlusCircle className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase tracking-tighter">Crear Cliente</h2>
                                        <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Nuevo Registro Comercial</p>
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

                            {/* Tipo de Cliente */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tipo de Cliente</label>
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

                            {/* NIT */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">NIT / Identificación</label>
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
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Comercial / Razón Social</label>
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
                                            Crear Cliente
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
