'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    X, 
    Building2, 
    Hash, 
    MapPin, 
    User, 
    Phone, 
    Loader2, 
    CheckCircle2,
    AlertCircle,
    PlusCircle,
    Building,
    UserCheck,
    Globe,
    Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalCrearSalaProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ModalCrearSala({ isOpen, onClose, onSuccess }: ModalCrearSalaProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Data lists
    const [clientes, setClientes] = useState<any[]>([]);
    const [ciudades, setCiudades] = useState<any[]>([]);
    const [asesores, setAsesores] = useState<any[]>([]);

    // Form states
    const [formData, setFormData] = useState({
        tipo_de_cliente: '',
        cliente_id: '',
        nombre: '',
        ciudad_id: '',
        direccion: '',
        contacto: '',
        telefono: '',
        asesor_id: '',
        nit: '', // Stored nit from selected client
    });

    // Geographic detailed info (computed/auto-filled)
    const [geoInfo, setGeoInfo] = useState({
        pais: '',
        departamento: '',
        zona: '',
        coordinador: ''
    });

    // Fetch initial data
    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
        }
    }, [isOpen]);

    const fetchInitialData = async () => {
        try {
            // Fetch Ciudades
            const { data: cities } = await supabase
                .from('query_ciudades')
                .select('*')
                .order('ciudad');
            setCiudades(cities || []);

            // Fetch Asesores
            const { data: users } = await supabase
                .from('Usuarios')
                .select('id, display_name')
                .in('rol', ['comercial', 'coordinador_comercial'])
                .order('display_name');
            setAsesores(users || []);
        } catch (err) {
            console.error('Error fetching initial data:', err);
        }
    };

    // Fetch clients when type changes
    useEffect(() => {
        if (formData.tipo_de_cliente) {
            fetchClientes(formData.tipo_de_cliente);
        } else {
            setClientes([]);
        }
        // Reset dependent fields
        setFormData(prev => ({ ...prev, cliente_id: '', nit: '' }));
    }, [formData.tipo_de_cliente]);

    const fetchClientes = async (tipo: string) => {
        try {
            const { data } = await supabase
                .from('Clientes')
                .select('id, nombre, nit')
                .eq('tipo_de_cliente', tipo)
                .order('nombre');
            setClientes(data || []);
        } catch (err) {
            console.error('Error fetching clients:', err);
        }
    };

    const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        const selected = clientes.find(c => c.id.toString() === id);
        setFormData(prev => ({ 
            ...prev, 
            cliente_id: id,
            nit: selected ? selected.nit : ''
        }));
    };

    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        const selected = ciudades.find(c => c.id.toString() === id);
        
        setFormData(prev => ({ ...prev, ciudad_id: id }));
        
        if (selected) {
            setGeoInfo({
                pais: selected.pais || '',
                departamento: selected.departamento || '',
                zona: selected.zona || '',
                coordinador: selected.coordinador_nombre || ''
            });
        } else {
            setGeoInfo({ pais: '', departamento: '', zona: '', coordinador: '' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validations
        if (!formData.tipo_de_cliente || !formData.cliente_id || !formData.ciudad_id || !formData.asesor_id) {
            setError('Por favor complete todos los campos obligatorios');
            setLoading(false);
            return;
        }

        try {
            // Get current user UUID
            const { data: { user } } = await supabase.auth.getUser();
            
            // Get the BIGINT ID from Usuarios table for this UUID
            let usuarioId = null;
            if (user) {
                const { data: userData } = await supabase
                    .from('Usuarios')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();
                if (userData) usuarioId = userData.id;
            }

            const { error: insertError } = await supabase
                .from('Ubicaciones')
                .insert([{
                    cliente_id: parseInt(formData.cliente_id),
                    nombre: formData.nombre,
                    direccion: formData.direccion,
                    ciudad_id: parseInt(formData.ciudad_id),
                    nit: formData.nit,
                    nombre_contacto: formData.contacto,
                    telefono: formData.telefono,
                    asesor_id: parseInt(formData.asesor_id),
                    activo: true,
                    pop_banos: false,
                    pop_cocinas: false,
                    pop_labores: false,
                    pop_hidros: false,
                    pop_no_aplica: false,
                    permite_exhibir: false,
                    created_at: new Date().toISOString(),
                    modified_at: new Date().toISOString(),
                    modified_by: usuarioId,
                    fotos: []
                }]);

            if (insertError) throw insertError;

            onSuccess();
            onClose();
            // Reset form
            setFormData({
                tipo_de_cliente: '',
                cliente_id: '',
                nombre: '',
                ciudad_id: '',
                direccion: '',
                contacto: '',
                telefono: '',
                asesor_id: '',
                nit: '',
            });
            setGeoInfo({ pais: '', departamento: '', zona: '', coordinador: '' });
        } catch (err: any) {
            console.error('Error creating sala:', err);
            setError(err.message || 'Error al crear la sala/obra');
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
                        className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="bg-indigo-600 p-8 text-white relative flex-shrink-0">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                        <PlusCircle className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase tracking-tighter">Crear Almacén u Obra</h2>
                                        <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Nuevo Registro de Ubicación</p>
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

                        {/* Form Body - Scrollable */}
                        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-8">
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left Column: Client & Basic Info */}
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 border-b border-indigo-50 pb-2">Información del Cliente</h3>
                                        
                                        {/* Tipo de Cliente */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tipo de Cliente</label>
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
                                        </div>

                                        {/* Cliente */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center ml-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</label>
                                                {formData.nit && (
                                                    <span className="text-[10px] font-bold text-indigo-600">NIT: {formData.nit}</span>
                                                )}
                                            </div>
                                            <select 
                                                value={formData.cliente_id}
                                                onChange={handleClientChange}
                                                disabled={!formData.tipo_de_cliente}
                                                required
                                                className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all appearance-none disabled:opacity-50"
                                            >
                                                <option value="">{formData.tipo_de_cliente ? 'Seleccione el cliente...' : 'Primero elija tipo'}</option>
                                                {clientes.map(c => (
                                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Nombre de la Sala/Obra */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                                {formData.tipo_de_cliente === 'Constructor' ? 'Nombre de la Obra' : 'Nombre del Almacén'}
                                            </label>
                                            <div className="relative group">
                                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                                <input 
                                                    type="text"
                                                    value={formData.nombre}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value.toUpperCase() }))}
                                                    required
                                                    className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all"
                                                    placeholder="EJ: SALA NORTE"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 border-b border-indigo-50 pb-2">Ubicación Geográfica</h3>
                                        
                                        {/* Ciudad */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Ciudad</label>
                                            <select 
                                                value={formData.ciudad_id}
                                                onChange={handleCityChange}
                                                required
                                                className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all appearance-none"
                                            >
                                                <option value="">Seleccione ciudad...</option>
                                                {ciudades.map(c => (
                                                    <option key={c.id} value={c.id}>{c.ciudad}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Auto-filled Info */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-tighter text-slate-400 ml-1">País</label>
                                                <div className="h-10 bg-slate-50 border border-slate-100 rounded-lg px-3 flex items-center text-xs font-bold text-slate-500 italic">
                                                    {geoInfo.pais || '---'}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-tighter text-slate-400 ml-1">Zona</label>
                                                <div className="h-10 bg-slate-50 border border-slate-100 rounded-lg px-3 flex items-center text-xs font-bold text-slate-500 italic">
                                                    {geoInfo.zona || '---'}
                                                </div>
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-tighter text-slate-400 ml-1">Departamento</label>
                                                <div className="h-10 bg-slate-50 border border-slate-100 rounded-lg px-3 flex items-center text-xs font-bold text-slate-500 italic">
                                                    {geoInfo.departamento || '---'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Details & Contact */}
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 border-b border-indigo-50 pb-2">Detalles de Contacto</h3>
                                        
                                        {/* Dirección */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Dirección</label>
                                            <div className="relative group">
                                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                                <input 
                                                    type="text"
                                                    value={formData.direccion}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                                                    required
                                                    className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all"
                                                    placeholder="Calle 123 # 45-67"
                                                />
                                            </div>
                                        </div>

                                        {/* Persona Contacto */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Persona de Contacto</label>
                                            <div className="relative group">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                                <input 
                                                    type="text"
                                                    value={formData.contacto}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, contacto: e.target.value }))}
                                                    required
                                                    className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all"
                                                    placeholder="Nombre del contacto"
                                                />
                                            </div>
                                        </div>

                                        {/* Teléfono */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Teléfono</label>
                                            <div className="relative group">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                                <input 
                                                    type="tel"
                                                    value={formData.telefono}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                                                    required
                                                    className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all"
                                                    placeholder="3001234567"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 border-b border-indigo-50 pb-2">Asignación</h3>
                                        
                                        {/* Asesor */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Asesor(a) Comercial</label>
                                            <select 
                                                value={formData.asesor_id}
                                                onChange={(e) => setFormData(prev => ({ ...prev, asesor_id: e.target.value }))}
                                                required
                                                className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all appearance-none"
                                            >
                                                <option value="">Seleccione asesor...</option>
                                                {asesores.map(a => (
                                                    <option key={a.id} value={a.id}>{a.display_name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Coordinador (Display only) */}
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase tracking-tighter text-slate-400 ml-1 text-right block">Coordinador de Servicios (Asignado por Ciudad)</label>
                                            <div className="h-10 bg-slate-50 border border-slate-100 rounded-lg px-3 flex items-center justify-end text-xs font-black text-indigo-600 italic">
                                                {geoInfo.coordinador || '---'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 pt-8 sticky bottom-0 bg-white pb-4 border-t border-slate-50 mt-auto">
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
                                            Crear Sala / Obra
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

