'use client';

import { useRouter } from 'next/navigation';
import { Server, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ConsultasSapPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-[#F1F5F9] text-slate-800 font-sans pb-20">
            <header className="fixed top-0 left-0 w-full bg-brand text-white z-50 h-[3.5rem] flex items-center px-6 shadow-lg justify-between">
                <div className="flex items-center">
                    <button
                        onClick={() => router.push('/')}
                        className="mr-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Server className="w-5 h-5 opacity-70" />
                        <h1 className="font-black text-xl tracking-tight uppercase">Consultas SAP</h1>
                    </div>
                </div>
            </header>

            <main className="pt-24 px-4 max-w-6xl mx-auto">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2.5rem] p-12 shadow-xl shadow-slate-200/50 border border-white text-center"
                >
                    <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Server className="w-10 h-10 text-orange-400" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase mb-4">
                        Módulo en construcción
                    </h2>
                    <p className="text-slate-500 font-medium max-w-lg mx-auto">
                        La funcionalidad para Consultas SAP estará disponible próximamente en este espacio.
                    </p>
                </motion.div>
            </main>
        </div>
    );
}
