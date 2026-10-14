'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, BarChart3, TrendingUp, PieChart } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function InformePage() {
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
              <BarChart3 className="w-7 h-7 md:w-8 md:h-8 text-sky-500 hidden sm:block" />
              Informe General
            </h1>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">Métricas y estadísticas de gestión</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-500">
            <PieChart className="w-8 h-8" />
          </div>
          <h3 className="text-3xl font-black text-slate-800">0</h3>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mt-1">Total Tickets</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 text-emerald-500">
            <TrendingUp className="w-8 h-8" />
          </div>
          <h3 className="text-3xl font-black text-slate-800">0%</h3>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mt-1">Resolución</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center text-center md:col-span-3 min-h-[300px] justify-center"
        >
          <BarChart3 className="w-12 h-12 text-slate-200 mb-4" />
          <h4 className="text-lg font-bold text-slate-700">Gráficos en construcción</h4>
          <p className="text-slate-500 text-sm max-w-sm mt-2">
            El panel interactivo de estadísticas estará disponible próximamente.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
