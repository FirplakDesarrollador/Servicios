'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    ShieldCheck,
    ArrowLeft,
    Loader2,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Info
} from 'lucide-react';

export default function RolesPage() {
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState<any[]>([]);
    const [isInitializing, setIsInitializing] = useState(false);
    const router = useRouter();

    const ROLES = [
        'desarrollador',
        'gerente',
        'mac',
        'comercial',
        'coordinador_servicio',
        'coordinador_comercial',
        'tecnico',
        'director_comercial',
        'auxiliar_pedidos',
        'auxiliar_novedades',
        'visitante',
        'administrador_canal',
        'ecommerce',
        'coordinador_tecnico',
        'promotor',
        'asesor_tecnico',
        'calidad',
        'promotor_tecnico',
        'promotor_tecnico_comercial',
        'promotor_tecnico_exhibiciones',
        'supervisor_externo',
        'tecnico_externo',
        'distribuidores'
    ];
    const MODULOS = [
        'Solicitar servicio',
        'Servicios Abiertos',
        'Buscar servicio cerrado',
        'Aprobaciones',
        'Mi agenda',
        'Administración',
        'Historial de servicios',
        'Ayuda',
        'Exhibiciones',
        'Base de datos',
        'Inventario Almacenes',
        'Agenda Tecnicos',
        'BI'
    ];

    useEffect(() => {
        fetchPermissions();
    }, []);

    const fetchPermissions = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('PermisosModulos')
            .select('*');

        if (!error && data) {
            setPermissions(data);
        }
        setLoading(false);
    };

    const togglePermission = async (rol: string, modulo: string, currentState: boolean) => {
        // Optimistic UI update
        const updatedPerms = permissions.map(p =>
            (p.rol === rol && p.nombre_modulo === modulo)
                ? { ...p, esta_habilitado: !currentState }
                : p
        );
        setPermissions(updatedPerms);

        const { error } = await supabase
            .from('PermisosModulos')
            .upsert({
                rol,
                nombre_modulo: modulo,
                esta_habilitado: !currentState
            }, { onConflict: 'rol,nombre_modulo' });

        if (error) {
            // Revert if error
            fetchPermissions();
        }
    };

    const initializePermissions = async () => {
        setIsInitializing(true);
        const inserts = [];
        for (const rol of ROLES) {
            for (const modulo of MODULOS) {
                inserts.push({
                    rol,
                    nombre_modulo: modulo,
                    esta_habilitado: rol === 'desarrollador' || rol === 'admin'
                });
            }
        }

        const { error } = await supabase
            .from('PermisosModulos')
            .upsert(inserts, { onConflict: 'rol,nombre_modulo' });

        if (!error) {
            await fetchPermissions();
        }
        setIsInitializing(false);
    };

    const getPermStatus = (rol: string, modulo: string) => {
        const perm = permissions.find(p => p.rol === rol && p.nombre_modulo === modulo);
        return perm ? perm.esta_habilitado : false;
    };

    return (
        <div className="min-h-screen bg-[#F1F5F9] text-slate-800 font-sans pb-10">
            <header className="fixed top-0 left-0 w-full bg-brand text-white z-50 h-[3.5rem] flex items-center px-6 shadow-lg">
                <button
                    onClick={() => router.push('/configuracion')}
                    className="mr-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 opacity-70" />
                    <h1 className="font-black text-xl tracking-tight uppercase">Roles y Permisos</h1>
                </div>
            </header>

            <main className="pt-24 px-4 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-brand tracking-tighter">Matriz de Permisos</h2>
                        <p className="text-slate-500 font-medium italic">Define qué módulos son visibles para cada perfil.</p>
                    </div>

                    <button
                        onClick={initializePermissions}
                        disabled={isInitializing}
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-brand font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:bg-brand/5 transition-all shadow-xl shadow-slate-200/50 disabled:opacity-50"
                    >
                        {isInitializing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Inicializar Permisos
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-12 h-12 text-brand animate-spin mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Sincronizando Matriz...</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="p-6 text-left text-brand font-black uppercase text-xs tracking-widest sticky left-0 bg-slate-50 z-10 w-64">Módulo</th>
                                    {ROLES.map(role => (
                                        <th key={role} className="p-6 text-center text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">
                                            {role}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {MODULOS.map((modulo, idx) => (
                                    <tr key={modulo} className={`border-b border-slate-50 transition-colors hover:bg-slate-50/50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                        <td className="p-6 font-bold text-slate-700 text-sm sticky left-0 bg-inherit z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                            {modulo}
                                        </td>
                                        {ROLES.map(role => {
                                            const enabled = getPermStatus(role, modulo);
                                            return (
                                                <td key={`${role}-${modulo}`} className="p-4 text-center">
                                                    <button
                                                        onClick={() => togglePermission(role, modulo, enabled)}
                                                        className={`w-12 h-6 rounded-full p-1 transition-all flex items-center shadow-inner ${enabled ? 'bg-emerald-400' : 'bg-slate-200'
                                                            }`}
                                                    >
                                                        <motion.div
                                                            animate={{ x: enabled ? 24 : 0 }}
                                                            className="w-4 h-4 bg-white rounded-full shadow-md flex items-center justify-center"
                                                        >
                                                            {enabled ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> : <XCircle className="w-2.5 h-2.5 text-slate-300" />}
                                                        </motion.div>
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-8 flex items-start gap-3 bg-brand/5 p-6 rounded-[2rem] border border-brand/10">
                    <Info className="w-6 h-6 text-brand shrink-0" />
                    <p className="text-slate-600 text-sm font-medium leading-relaxed">
                        <span className="font-black text-brand uppercase text-[10px] tracking-widest block mb-1">Nota del Desarrollador</span>
                        Cualquier cambio realizado en esta matriz se reflejará instantáneamente en el Home de los usuarios pertenecientes al rol modificado. Si el usuario ya tiene la sesión abierta, deberá recargar la página para ver los cambios.
                    </p>
                </div>
            </main>
        </div>
    );
}
