'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    X, 
    Building2, 
    MapPin, 
    User, 
    Phone, 
    Loader2, 
    CheckCircle2,
    AlertCircle,
    PlusCircle,
    Search,
    ChevronDown
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
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const [clientSearch, setClientSearch] = useState('');
    const clientDropdownRef = useRef<HTMLDivElement>(null);

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
        nit: '', 
    });

    // Geographic detailed info
    const [geoInfo, setGeoInfo] = useState({
        pais: '',
        departamento: '',
        zona: '',
        coordinador: ''
    });

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
            resetForm();
        }
    }, [isOpen]);

    const resetForm = () => {
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
    };

    const fetchInitialData = async () => {
        try {
            const { data: cities } = await supabase.from('query_ciudades').select('*').order('ciudad');
            setCiudades(cities || []);

            const { data: users } = await supabase
                .from('Usuarios')
                .select('id, display_name')
                .in('rol', ['comercial', 'coordinador_comercial', 'director_comercial', 'asesor_tecnico', 'promotor_tecnico_comercial'])
                .order('display_name');
            setAsesores(users || []);
        } catch (err) {
            console.error('Error fetching initial data:', err);
        }
    };

    useEffect(() => {
        if (formData.tipo_de_cliente) {
            fetchClientes(formData.tipo_de_cliente);
        } else {
            setClientes([]);
        }
        setFormData(prev => ({ ...prev, cliente_id: '', nit: '' }));
        setClientSearch('');
        setIsClientDropdownOpen(false);
    }, [formData.tipo_de_cliente]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
                setIsClientDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchClientes = async (tipo: string) => {
        try {
            const { data } = await supabase.from('Clientes').select('id, nombre, nit').eq('tipo_de_cliente', tipo).order('nombre');
            setClientes(data || []);
        } catch (err) {
            console.error('Error fetching clients:', err);
        }
    };

    const handleClientChange = (id: string) => {
        const selected = clientes.find(c => c.id.toString() === id);
        setFormData(prev => ({ ...prev, cliente_id: id, nit: selected ? selected.nit : '' }));
        setClientSearch('');
        setIsClientDropdownOpen(false);
    };

    const selectedClient = clientes.find(c => c.id.toString() === formData.cliente_id);
    const filteredClientes = useMemo(() => {
        const query = clientSearch.trim().toLowerCase();
        if (!query) return clientes.slice(0, 80);

        return clientes
            .filter((cliente) => {
                const nombre = String(cliente.nombre || '').toLowerCase();
                const nit = String(cliente.nit || '').toLowerCase();
                return nombre.includes(query) || nit.includes(query);
            })
            .slice(0, 80);
    }, [clientes, clientSearch]);

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

        if (!formData.tipo_de_cliente || !formData.cliente_id || !formData.ciudad_id || !formData.asesor_id) {
            setError('Por favor complete todos los campos obligatorios');
            setLoading(false);
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            let usuarioId = null;
            if (user) {
                const { data: userData } = await supabase.from('Usuarios').select('id').eq('user_id', user.id).single();
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" />
                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]">
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
                                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X className="w-6 h-6" /></button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-8">
                            {error && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 border-b border-indigo-50 pb-2">Información del Cliente</h3>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tipo de Cliente</label>
                                            <select value={formData.tipo_de_cliente} onChange={(e) => setFormData(prev => ({ ...prev, tipo_de_cliente: e.target.value }))} required className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all appearance-none">
                                                <option value="">Seleccione el tipo...</option>
                                                <option value="Distribuidor">Distribuidor</option>
                                                <option value="Constructor">Constructor</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center ml-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</label>
                                                {formData.nit && <span className="text-[10px] font-bold text-indigo-600">NIT: {formData.nit}</span>}
                                            </div>
                                            <div className="relative" ref={clientDropdownRef}>
                                                <button
                                                    type="button"
                                                    disabled={!formData.tipo_de_cliente}
                                                    onClick={() => setIsClientDropdownOpen(prev => !prev)}
                                                    className={`w-full min-h-14 rounded-2xl border-2 px-4 py-3 text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-between gap-3 text-left shadow-sm ${
                                                        selectedClient
                                                            ? 'bg-white border-indigo-100 shadow-indigo-100/60'
                                                            : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-indigo-100'
                                                    } focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50`}
                                                >
                                                    <span className="min-w-0 flex-1">
                                                        <span className={selectedClient ? 'block truncate text-slate-700 font-medium' : 'block truncate text-slate-400'}>
                                                            {selectedClient ? selectedClient.nombre : (formData.tipo_de_cliente ? 'Seleccione el cliente...' : 'Primero elija tipo')}
                                                        </span>
                                                    </span>
                                                    <span className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all ${
                                                        isClientDropdownOpen ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-100'
                                                    }`}>
                                                        <ChevronDown className={`w-4 h-4 transition-transform ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
                                                    </span>
                                                </button>

                                                {isClientDropdownOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                                        className="absolute z-50 mt-3 w-full overflow-hidden rounded-[1.5rem] border border-indigo-100 bg-white shadow-2xl shadow-indigo-950/10"
                                                    >
                                                        <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white p-3">
                                                            <div className="flex items-center justify-between gap-3 mb-3">
                                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">Buscar cliente</p>
                                                                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-slate-400 shadow-sm">
                                                                    {filteredClientes.length} de {clientes.length}
                                                                </span>
                                                            </div>
                                                            <div className="relative">
                                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                                                                <input
                                                                    autoFocus
                                                                    type="text"
                                                                    value={clientSearch}
                                                                    onChange={(e) => setClientSearch(e.target.value)}
                                                                    placeholder="Nombre, razón social o NIT..."
                                                                    className="w-full h-12 rounded-2xl border border-indigo-100 bg-white pl-10 pr-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100/60 placeholder:text-slate-300 shadow-sm"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="max-h-80 overflow-y-auto p-2 space-y-1.5">
                                                            {filteredClientes.length > 0 ? (
                                                                filteredClientes.map((cliente) => {
                                                                    const isSelected = formData.cliente_id === cliente.id.toString();
                                                                    return (
                                                                        <button
                                                                            key={cliente.id}
                                                                            type="button"
                                                                            onClick={() => handleClientChange(cliente.id.toString())}
                                                                            className={`w-full rounded-2xl px-3 py-3 text-left transition-all border ${
                                                                                isSelected
                                                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200'
                                                                                    : 'text-slate-700 border-transparent hover:bg-slate-50 hover:border-slate-100'
                                                                            }`}
                                                                        >
                                                                            <div className="flex items-center gap-3">
                                                                                <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${
                                                                                    isSelected ? 'bg-white/15 text-white' : 'bg-indigo-50 text-indigo-600'
                                                                                }`}>
                                                                                    <Building2 className="w-4 h-4" />
                                                                                </div>
                                                                                <div className="min-w-0 flex-1">
                                                                                    <p className="text-sm font-medium truncate">{cliente.nombre}</p>
                                                                                </div>
                                                                                {isSelected && <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />}
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })
                                                            ) : (
                                                                <div className="px-4 py-10 text-center">
                                                                    <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                                                                        <Search className="h-5 w-5 text-slate-300" />
                                                                    </div>
                                                                    <p className="text-sm font-black text-slate-500">Sin resultados</p>
                                                                    <p className="mt-1 text-xs font-bold text-slate-300">Intenta con otro nombre o NIT.</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {clientes.length > 80 && !clientSearch && (
                                                            <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-bold text-slate-400">
                                                                Mostrando los primeros 80. Escribe para filtrar la lista completa.
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{formData.tipo_de_cliente === 'Constructor' ? 'Nombre de la Obra' : 'Nombre del Almacén'}</label>
                                            <div className="relative group">
                                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                                <input type="text" value={formData.nombre} onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value.toUpperCase() }))} required className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all" placeholder="EJ: SALA NORTE" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4 pt-4">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 border-b border-indigo-50 pb-2">Ubicación Geográfica</h3>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Ciudad</label>
                                            <select value={formData.ciudad_id} onChange={handleCityChange} required className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all appearance-none">
                                                <option value="">Seleccione ciudad...</option>
                                                {ciudades.map(c => <option key={c.id} value={c.id.toString()}>{c.ciudad}</option>)}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1"><label className="text-[9px] font-black uppercase tracking-tighter text-slate-400 ml-1">País</label><div className="h-10 bg-slate-50 border border-slate-100 rounded-lg px-3 flex items-center text-xs font-bold text-slate-500 italic">{geoInfo.pais || '---'}</div></div>
                                            <div className="space-y-1"><label className="text-[9px] font-black uppercase tracking-tighter text-slate-400 ml-1">Zona</label><div className="h-10 bg-slate-50 border border-slate-100 rounded-lg px-3 flex items-center text-xs font-bold text-slate-500 italic">{geoInfo.zona || '---'}</div></div>
                                            <div className="col-span-2 space-y-1"><label className="text-[9px] font-black uppercase tracking-tighter text-slate-400 ml-1">Departamento</label><div className="h-10 bg-slate-50 border border-slate-100 rounded-lg px-3 flex items-center text-xs font-bold text-slate-500 italic">{geoInfo.departamento || '---'}</div></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 border-b border-indigo-50 pb-2">Detalles de Contacto</h3>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Dirección</label>
                                            <div className="relative group">
                                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                                <input type="text" value={formData.direccion} onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))} required className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all" placeholder="Calle 123 # 45-67" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Persona de Contacto</label>
                                            <div className="relative group">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                                <input type="text" value={formData.contacto} onChange={(e) => setFormData(prev => ({ ...prev, contacto: e.target.value }))} required className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all" placeholder="Nombre del contacto" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Teléfono</label>
                                            <div className="relative group">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                                <input type="tel" value={formData.telefono} onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))} required className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all" placeholder="3001234567" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4 pt-4">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 border-b border-indigo-50 pb-2">Asignación</h3>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Asesor(a) Comercial</label>
                                            <select value={formData.asesor_id} onChange={(e) => setFormData(prev => ({ ...prev, asesor_id: e.target.value }))} required className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all appearance-none">
                                                <option value="">Seleccione asesor...</option>
                                                {asesores.map(a => <option key={a.id} value={a.id.toString()}>{a.display_name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase tracking-tighter text-slate-400 ml-1 text-right block">Coordinador de Servicios (Asignado por Ciudad)</label>
                                            <div className="h-10 bg-slate-50 border border-slate-100 rounded-lg px-3 flex items-center justify-end text-xs font-black text-indigo-600 italic">{geoInfo.coordinador || '---'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-8 sticky bottom-0 bg-white pb-4 border-t border-slate-50 mt-auto">
                                <button type="button" onClick={onClose} className="flex-1 h-14 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all active:scale-95">Cancelar</button>
                                <button type="submit" disabled={loading} className="flex-[2] h-14 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-200 hover:shadow-indigo-400 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" />Crear Sala / Obra</>}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
