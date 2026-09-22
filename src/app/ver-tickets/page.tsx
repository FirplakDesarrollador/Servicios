'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, LayoutList, Search, Database } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function VerTicketsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-800 font-sans p-4 md:p-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-brand tracking-tight flex items-center gap-3">
              <LayoutList className="w-7 h-7 md:w-8 md:h-8 text-sky-500 hidden sm:block" />
              Ver Tickets
            </h1>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">Listado y gestión de tickets existentes</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar tickets..."
              className="w-full sm:w-64 pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm"
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[2rem] p-8 md:p-16 shadow-xl shadow-slate-200/50 border border-white flex flex-col items-center justify-center text-center mt-4"
        >
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <Database className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No hay tickets registrados</h3>
          <p className="text-slate-500 max-w-md">
            El listado de tickets se mostrará aquí una vez que se implemente la conexión con la base de datos.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
