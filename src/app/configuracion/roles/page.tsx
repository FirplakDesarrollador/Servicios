'use client';

import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowLeft, Info } from 'lucide-react';

export default function RolesPage() {
    const router = useRouter();

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

            <main className="pt-24 px-4 max-w-4xl mx-auto text-center">
                <div className="bg-white rounded-[2.5rem] p-12 shadow-2xl shadow-slate-200/50 border border-white">
                    <div className="w-20 h-20 bg-brand/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck className="w-10 h-10 text-brand" />
                    </div>
                    <h2 className="text-3xl font-black text-brand tracking-tighter mb-4 uppercase">Módulo Deshabilitado</h2>
                    <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-2xl mx-auto">
                        La gestión de permisos individuales ha sido eliminada. Ahora todos los usuarios tienen acceso completo a todos los módulos de la plataforma de forma predeterminada.
                    </p>
                    
                    <div className="mt-10 p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3 text-left">
                        <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                        <p className="text-slate-500 text-sm">
                            Esta página ya no cumple ninguna función administrativa. Si necesitas gestionar usuarios, utiliza el módulo de <strong>Gestión de Usuarios</strong>.
                        </p>
                    </div>

                    <button
                        onClick={() => router.push('/configuracion')}
                        className="mt-10 px-8 py-4 bg-brand text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:scale-105 transition-all shadow-xl shadow-brand/20"
                    >
                        Volver a Configuración
                    </button>
                </div>
            </main>
        </div>
    );
}
