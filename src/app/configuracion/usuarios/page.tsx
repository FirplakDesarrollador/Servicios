'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    Users,
    ArrowLeft,
    Search,
    UserCircle,
    MoreVertical,
    Key,
    Shield,
    Loader2,
    Check,
    X,
    UserPlus
} from 'lucide-react';

export default function UsuariosPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newRole, setNewRole] = useState('');
    const [isSaving, setIsSaving] = useState(false);
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

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('Usuarios')
            .select('*')
            .order('nombres', { ascending: true });

        if (!error && data) {
            setUsers(data);
        }
        setLoading(false);
    };

    const handleUpdateRole = async (userId: string, currentRole: string) => {
        setSelectedUser(users.find(u => u.user_id === userId));
        setNewRole(currentRole);
        setIsModalOpen(true);
    };

    const saveRoleUpdate = async () => {
        if (!selectedUser) return;
        setIsSaving(true);
        const { error } = await supabase
            .from('Usuarios')
            .update({ rol: newRole })
            .eq('user_id', selectedUser.user_id);

        if (!error) {
            await fetchUsers();
            setIsModalOpen(false);
        }
        setIsSaving(false);
    };

    const filteredUsers = users.filter(user =>
        `${user.nombres} ${user.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.rol?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    <Users className="w-5 h-5 opacity-70" />
                    <h1 className="font-black text-xl tracking-tight uppercase">Gestión de Usuarios</h1>
                </div>
            </header>

            <main className="pt-24 px-4 max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-brand tracking-tighter">Usuarios</h2>
                        <p className="text-slate-500 font-medium italic">Hay {users.length} usuarios registrados.</p>
                    </div>

                    <div className="flex gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o rol..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all w-full md:w-64 shadow-sm"
                            />
                        </div>
                        <button className="bg-brand text-white p-2 rounded-xl hover:bg-brand/90 transition-all shadow-md group">
                            <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-12 h-12 text-brand animate-spin mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando Usuarios...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredUsers.map((user, index) => (
                            <motion.div
                                key={user.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white p-5 rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 flex items-start gap-4 relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleUpdateRole(user.user_id, user.rol)} className="text-slate-400 hover:text-brand p-1">
                                        <MoreVertical className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="w-16 h-16 bg-slate-100 rounded-2xl shrink-0 flex items-center justify-center border-2 border-slate-50 overflow-hidden shadow-inner">
                                    {user.url_foto ? (
                                        <img src={user.url_foto} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <UserCircle className="w-10 h-10 text-slate-300" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-black text-slate-800 truncate leading-tight">
                                        {user.nombres} {user.apellidos}
                                    </h3>
                                    <p className="text-xs font-medium text-slate-400 truncate mb-3 italic">@{user.display_name || 'sin_usuario'}</p>

                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1 bg-slate-50 text-brand text-[10px] font-black uppercase rounded-full border border-slate-100 shadow-sm flex items-center gap-1">
                                            <Shield className="w-3 h-3" />
                                            {user.rol || 'USUARIO'}
                                        </span>
                                        <button
                                            onClick={() => handleUpdateRole(user.user_id, user.rol)}
                                            className="px-3 py-1 bg-brand/5 text-brand hover:bg-brand hover:text-white text-[10px] font-black uppercase rounded-full transition-all border border-brand/10 shadow-sm"
                                        >
                                            EDITAR ROL
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                                                    redirectTo: `${window.location.origin}/login`,
                                                });
                                                if (error) {
                                                    alert('Error: ' + error.message);
                                                } else {
                                                    alert('Correo de restablecimiento enviado a ' + user.email);
                                                }
                                            }}
                                            className="px-3 py-1 bg-slate-100 text-slate-500 hover:bg-slate-200 text-[10px] font-black uppercase rounded-full transition-all border border-slate-200 shadow-sm flex items-center gap-1"
                                        >
                                            <Key className="w-3 h-3" />
                                            RESET PASS
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>

            {/* Role Management Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
                        >
                            <div className="bg-brand p-8 text-white">
                                <h3 className="text-2xl font-black tracking-tighter mb-1">Cambiar Rol</h3>
                                <p className="text-white/60 text-sm font-medium">Actualizando permisos de {selectedUser?.nombres}</p>
                            </div>

                            <div className="p-8">
                                <div className="space-y-3">
                                    {ROLES.map((role) => (
                                        <button
                                            key={role}
                                            onClick={() => setNewRole(role)}
                                            className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${newRole === role
                                                ? 'border-brand bg-brand/5 text-brand'
                                                : 'border-slate-100 hover:border-slate-200 text-slate-600'
                                                }`}
                                        >
                                            <span className="font-extrabold uppercase text-xs tracking-widest">{role}</span>
                                            {newRole === role ? (
                                                <Check className="w-5 h-5" />
                                            ) : (
                                                <div className="w-5 h-5 border-2 border-slate-200 rounded-full group-hover:border-slate-300" />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex gap-3 mt-8">
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-4 bg-slate-100 text-slate-600 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        <X className="w-4 h-4" />
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={saveRoleUpdate}
                                        disabled={isSaving}
                                        className="flex-1 py-4 bg-brand text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-brand/90 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Guardar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
