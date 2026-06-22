'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, FileText, Search, Plus, Loader2, Database } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import RegistroCard from './components/RegistroCard';
import ModalCrearRegistro from './components/ModalCrearRegistro';

export default function RegistroSolicitudesPage() {
  const router = useRouter();
  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    setLoading(true);
    try {
      // Intentamos cargar de la tabla registro_solicitudes
      const { data, error } = await supabase
        .from('registro_solicitudes')
        .select(`
          *,
          Usuarios!registro_solicitudes_tratado_por_id_fkey(nombres, apellidos),
          Ubicaciones:cliente_id(*),
          Consumidores:cliente_final_id(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistros(data || []);
    } catch (error) {
      console.error('Error fetching registros:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRegistros = registros.filter(r => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const title = (r.consecutivo || '').toLowerCase();
    const desc = (r.comentarios || r.cliente_nombre || r.cliente_final_nombre || '').toLowerCase();
    return title.includes(searchLower) || desc.includes(searchLower) || String(r.id).includes(searchLower);
  });

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
              <FileText className="w-7 h-7 md:w-8 md:h-8 text-sky-500 hidden sm:block" />
              Registro Solicitudes
            </h1>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">Gestión y listado de solicitudes</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar registros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 bg-brand text-white px-5 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nuevo Registro
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-brand animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Cargando registros...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredRegistros.length > 0 ? (
              <motion.div 
                layout
                className="flex flex-col gap-4"
              >
                {filteredRegistros.map((registro, index) => (
                  <RegistroCard 
                    key={registro.id || index} 
                    registro={registro} 
                    onClick={() => router.push(`/ver-registro/${registro.id}`)}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[2rem] p-8 md:p-16 shadow-xl shadow-slate-200/50 border border-white flex flex-col items-center justify-center text-center mt-4"
              >
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <Database className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No hay registros</h3>
                <p className="text-slate-500 max-w-md">
                  {searchTerm 
                    ? `No se encontraron resultados para "${searchTerm}". Intenta con otra búsqueda.` 
                    : "Aún no hay ninguna solicitud registrada. Crea un nuevo registro para comenzar."}
                </p>
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="mt-6 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-bold transition-colors"
                  >
                    Limpiar Búsqueda
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {showCreateModal && (
        <ModalCrearRegistro 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchRegistros();
          }}
        />
      )}
    </div>
  );
}
