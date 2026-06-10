'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    ShieldCheck,
    ArrowLeft,
    Plus,
    X,
    Save,
    Search,
    ChevronDown,
    Loader2,
    LayoutGrid,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';

const ALL_MODULES = [
    'Solicitar servicio',
    'Servicios Abiertos',
    'Buscar servicio cerrado',
    'Aprobaciones',
    'Mi agenda',
    'Historial de servicios',
    'Ayuda',
    'Exhibiciones',
    'Base de datos',
    'Inventario Almacenes',
    'Agenda Tecnicos',
    'BI',
    'Indicador quejas',
    'Configuración'
];

export default function RolesManagementPage() {
    const router = useRouter();
    const [roles, setRoles] = useState<any[]>([]);
    const [selectedRole, setSelectedRole] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('Roles')
            .select('*')
            .order('nombre_rol', { ascending: true });

        if (error) {
            console.error('Error fetching roles:', error);
        } else {
            setRoles(data || []);
            if (data && data.length > 0 && !selectedRole) {
                setSelectedRole(data[0]);
            } else if (selectedRole) {
                const updatedSelected = data.find(r => r.id === selectedRole.id);
                if (updatedSelected) setSelectedRole(updatedSelected);
            }
        }
        setLoading(false);
    };

    const handleToggleModule = (moduleName: string) => {
        if (!selectedRole) return;

        const currentModules = selectedRole.modulos_defecto || [];
        let newModules;

        if (currentModules.includes(moduleName)) {
            newModules = currentModules.filter((m: string) => m !== moduleName);
        } else {
            newModules = [...currentModules, moduleName];
        }

        setSelectedRole({ ...selectedRole, modulos_defecto: newModules });
    };

    const handleSave = async () => {
        if (!selectedRole) return;

        setSaving(true);
        const { error } = await supabase
            .from('Roles')
            .update({ modulos_defecto: selectedRole.modulos_defecto })
            .eq('id', selectedRole.id);

        if (error) {
            console.error('Error saving roles:', error);
            alert('Error al guardar los cambios');
        } else {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
            fetchRoles();
        }
        setSaving(false);
    };

    if (loading && roles.length === 0) {
        return (
            <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-brand animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F1F5F9] text-slate-800 font-sans pb-20">
            <header className="fixed top-0 left-0 w-full bg-brand text-white z-50 h-[3.5rem] flex items-center px-6 shadow-lg justify-between">
                <div className="flex items-center">
                    <button
                        onClick={() => router.push('/configuracion')}
                        className="mr-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 opacity-70" />
                        <h1 className="font-black text-xl tracking-tight uppercase">Gestión de Roles</h1>
                    </div>
                </div>

                <AnimatePresence>
                    {showSuccess && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase flex items-center gap-2 shadow-lg"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Cambios Guardados
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            <main className="pt-24 px-4 max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Panel: Role List */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-1"
                    >
                        <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-white sticky top-24">
                            <h2 className="text-xl font-black text-brand mb-6 flex items-center gap-2 uppercase tracking-tight">
                                <ChevronDown className="w-5 h-5" />
                                Seleccionar Rol
                            </h2>
                            
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {roles.map((role) => (
                                    <button
                                        key={role.id}
                                        onClick={() => setSelectedRole(role)}
                                        className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group ${
                                            selectedRole?.id === role.id 
                                            ? 'bg-brand text-white shadow-lg shadow-brand/20 scale-[1.02]' 
                                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <span className="font-bold text-sm uppercase tracking-wider">{role.nombre_rol}</span>
                                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                                            selectedRole?.id === role.id ? 'bg-white/20' : 'bg-slate-200 text-slate-500'
                                        }`}>
                                            {role.modulos_defecto?.length || 0}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Panel: Permissions Management */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="lg:col-span-2"
                    >
                        {selectedRole ? (
                            <div className="space-y-6">
                                {/* Header Card */}
                                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-white relative overflow-hidden">
                                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand/5 rounded-full blur-3xl" />
                                    
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                        <div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block">Configurando permisos para</span>
                                            <h3 className="text-4xl font-black text-brand tracking-tighter uppercase">{selectedRole.nombre_rol}</h3>
                                        </div>
                                        
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="flex items-center justify-center gap-2 bg-brand text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand/20 disabled:opacity-50"
                                        >
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Guardar Cambios
                                        </button>
                                    </div>
                                </div>

                                {/* Modules Grid */}
                                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-white">
                                    <div className="flex items-center justify-between mb-8">
                                        <h4 className="text-xl font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                                            <LayoutGrid className="w-5 h-5 text-brand" />
                                            Módulos del Sistema
                                        </h4>
                                        <div className="relative">
                                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input 
                                                type="text"
                                                placeholder="Buscar módulo..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="pl-9 pr-4 py-2 bg-slate-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand/20 outline-none w-64"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {ALL_MODULES.filter(m => m.toLowerCase().includes(searchTerm.toLowerCase())).map((module) => {
                                            const isActive = selectedRole.modulos_defecto?.includes(module);
                                            return (
                                                <button
                                                    key={module}
                                                    onClick={() => handleToggleModule(module)}
                                                    className={`group flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                                                        isActive 
                                                        ? 'border-brand bg-brand/5 shadow-md' 
                                                        : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                                            isActive ? 'bg-brand text-white' : 'bg-slate-200 text-slate-400'
                                                        }`}>
                                                            {isActive ? <CheckCircle2 className="w-5 h-5" /> : <Plus className="w-4 h-4" />}
                                                        </div>
                                                        <span className={`text-sm font-bold tracking-tight ${isActive ? 'text-brand' : 'text-slate-600'}`}>
                                                            {module}
                                                        </span>
                                                    </div>
                                                    
                                                    {isActive && (
                                                        <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center text-brand opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <X className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {ALL_MODULES.filter(m => m.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                        <div className="text-center py-12">
                                            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                            <p className="text-slate-400 font-medium">No se encontraron módulos que coincidan.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 flex items-start gap-4">
                                    <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-amber-500/20">
                                        <AlertCircle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h5 className="font-black text-amber-800 uppercase text-xs tracking-wider mb-1">Nota Importante</h5>
                                        <p className="text-amber-700/80 text-sm leading-relaxed">
                                            Los cambios realizados aquí afectarán a todos los <strong>nuevos usuarios</strong> que se creen con este rol, o a usuarios actuales cuando se les <strong>cambie de cargo</strong>. Los ajustes manuales realizados directamente en el perfil de un usuario no serán alterados.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-[2.5rem] p-20 shadow-xl shadow-slate-200/50 border border-white text-center">
                                <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                    <ShieldCheck className="w-10 h-10 text-slate-300" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-400 tracking-tight uppercase">Selecciona un rol para comenzar</h3>
                                <p className="text-slate-400 font-medium mt-2">Elige un cargo del panel izquierdo para gestionar sus módulos de acceso.</p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </main>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #E2E8F0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #CBD5E1;
                }
            `}</style>
        </div>
    );
}
