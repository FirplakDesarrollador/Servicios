'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    Users,
    ShieldCheck,
    ArrowLeft,
    ChevronRight,
    Settings,
    Lock
} from 'lucide-react';

export default function ConfigurationPage() {
    const router = useRouter();

    const options = [
        {
            title: 'Gestión de Usuarios',
            description: 'Administrar roles, perfiles y contraseñas de los usuarios del sistema.',
            icon: Users,
            path: '/configuracion/usuarios',
            color: 'bg-blue-500'
        },
        {
            title: 'Gestión de Roles y Permisos',
            description: 'Configurar qué módulos son visibles para cada rol de usuario.',
            icon: ShieldCheck,
            path: '/configuracion/roles',
            color: 'bg-emerald-500'
        },
        {
            title: 'Seguridad y Auditoría',
            description: 'Ver registros de acceso y configuraciones críticas del sistema.',
            icon: Lock,
            path: '#',
            color: 'bg-slate-600',
            disabled: true
        }
    ];

    return (
        <div className="min-h-screen bg-[#F1F5F9] text-slate-800 font-sans pb-10">
            <header className="fixed top-0 left-0 w-full bg-brand text-white z-50 h-[3.5rem] flex items-center px-6 shadow-lg">
                <button
                    onClick={() => router.push('/')}
                    className="mr-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 opacity-70" />
                    <h1 className="font-black text-xl tracking-tight uppercase">Configuración</h1>
                </div>
            </header>

            <main className="pt-24 px-4 max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h2 className="text-3xl font-black text-brand tracking-tighter mb-2">Panel de Control</h2>
                    <p className="text-slate-500 font-medium italic">Administración centralizada de accesos y permisos de la plataforma.</p>
                </motion.div>

                <div className="grid gap-4">
                    {options.map((option, index) => (
                        <motion.button
                            key={option.title}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            disabled={option.disabled}
                            onClick={() => !option.disabled && router.push(option.path)}
                            className={`group flex items-center p-6 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white hover:border-brand/20 transition-all text-left w-full ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.01]'}`}
                        >
                            <div className={`p-4 rounded-2xl ${option.color} text-white shadow-lg mr-6 transition-transform group-hover:rotate-6`}>
                                <option.icon className="w-8 h-8" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-black text-slate-800 tracking-tight group-hover:text-brand transition-colors">
                                    {option.title}
                                </h3>
                                <p className="text-slate-500 text-sm font-medium">
                                    {option.description}
                                </p>
                            </div>
                            {!option.disabled && (
                                <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-brand transition-all group-hover:translate-x-1" />
                            )}
                        </motion.button>
                    ))}
                </div>
            </main>
        </div>
    );
}
