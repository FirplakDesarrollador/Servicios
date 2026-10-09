'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    X, 
    MapPin, 
    User, 
    Phone, 
    Loader2, 
    CheckCircle2,
    AlertCircle,
    Building2,
    Settings,
    UserCheck,
    ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalEditSalaProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData: any;
}

export default function ModalEditSala({ isOpen, onClose, onSuccess, initialData }: ModalEditSalaProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Data lists
    const [asesores, setAsesores] = useState<any[]>([]);

    // Form states (Only editable ones + ID)
    const [formData, setFormData] = useState({
        id: null as number | null,
        direccion: '',
        contacto: '',
        telefono: '',
        asesor_id: '',
    });

    // Fetch initial data
    useEffect(() => {
        if (isOpen) {
            fetchAsesores();
            if (initialData) {
                setFormData({
                    id: initialData.id,
                    direccion: initialData.direccion || '',
                    contacto: initialData.nombre_contacto || '',
                    telefono: initialData.telefono || '',
                    asesor_id: initialData.asesor_id?.toString() || '',
                });
            }
        }
    }, [isOpen, initialData]);

    const fetchAsesores = async () => {
        try {
            const { data: users, error: fetchError } = await supabase
                .from('Usuarios')
                .select('id, display_name')
                .in('rol', ['comercial', 'coordinador_comercial', 'director_comercial', 'asesor_tecnico', 'promotor_tecnico_comercial'])
                .order('display_name');
            
            if (fetchError) {
                console.error('Error fetching advisors:', fetchError);
                setError('Error cargando asesores: ' + fetchError.message);
                return;
            }
            
            setAsesores(users || []);
        } catch (err: any) {
            console.error('Exception in fetchAsesores:', err);
            setError('Error crítico: ' + err.message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!formData.direccion || !formData.contacto || !formData.telefono || !formData.asesor_id) {
            setError('Por favor complete todos los campos');
            setLoading(false);
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            let usuarioId = null;
            if (user) {
                const { data: userData } = await supabase
                    .from('Usuarios')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();
                if (userData) usuarioId = userData.id;
            }

            const { error: updateError } = await supabase
                .from('Ubicaciones')
                .update({
                    direccion: formData.direccion,
                    nombre_contacto: formData.contacto,
                    telefono: formData.telefono,
                    asesor_id: parseInt(formData.asesor_id),
                    modified_at: new Date().toISOString(),
                    modified_by: usuarioId
                })
                .eq('id', formData.id);

            if (updateError) throw updateError;

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error updating sala:', err);
            setError(err.message || 'Error al actualizar la ubicación');
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
                        className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 flex flex-col"
                    >
                        {/* Header */}
                        <div className="bg-brand p-8 text-white relative flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                        <Settings className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase tracking-tighter">Editar Ubicación</h2>
                                        <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Solo campos permitidos</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Read-only Context */}
                        <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cliente</p>
                                <p className="text-xs font-bold text-slate-600 truncate">{initialData?.cliente_nombre || '---'}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Almacén / Obra</p>
                                <p className="text-xs font-bold text-slate-600 truncate">{initialData?.nombre || '---'}</p>
                            </div>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            {error && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* Dirección */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Dirección</label>
                                    <div className="relative group">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand transition-colors pointer-events-none" />
                                        <input 
                                            type="text"
                                            value={formData.direccion}
                                            onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                                            required
                                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-brand/30 focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Persona Contacto */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Persona de Contacto</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand transition-colors pointer-events-none" />
                                        <input 
                                            type="text"
                                            value={formData.contacto}
                                            onChange={(e) => setFormData(prev => ({ ...prev, contacto: e.target.value }))}
                                            required
                                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-brand/30 focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Teléfono */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Teléfono</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand transition-colors pointer-events-none" />
                                        <input 
                                            type="tel"
                                            value={formData.telefono}
                                            onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                                            required
                                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-brand/30 focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Asesor */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Asesor(a) Comercial</label>
                                    <div className="relative group">
                                        <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand transition-colors z-10 pointer-events-none" />
                                        <select 
                                            value={formData.asesor_id}
                                            onChange={(e) => setFormData(prev => ({ ...prev, asesor_id: e.target.value }))}
                                            required
                                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-10 text-sm font-bold text-slate-700 focus:outline-none focus:border-brand/30 focus:bg-white transition-all appearance-none"
                                        >
                                            <option value="">Seleccione asesor...</option>
                                            {asesores.map(a => (
                                                <option key={a.id} value={a.id.toString()}>{a.display_name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 h-14 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] h-14 bg-brand text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-brand/20 hover:shadow-brand/40 transition-all flex items-center justify-center gap-2"
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
