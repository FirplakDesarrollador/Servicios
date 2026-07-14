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
  const [filterEstado, setFilterEstado] = useState('Abierto');
  const [filterPrioridad, setFilterPrioridad] = useState('Todas');
  const [filterAsesor, setFilterAsesor] = useState('Todos');
  const [asesores, setAsesores] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchRegistros();
    fetchAsesores();
  }, []);

  const fetchAsesores = async () => {
    try {
      const { data, error } = await supabase.from('Usuarios').select('id, nombres, apellidos, rol');
      if (data) {
        setAsesores(data.filter(u => u.rol && u.rol.toLowerCase() === 'mac'));
      }
    } catch (e) {
      console.error('Error fetching asesores', e);
    }
  };

  const fetchRegistros = async () => {
    setLoading(true);
    try {
      // 1. Get logged in user from supabase auth and match in Usuarios table
      const userRes = await supabase.auth.getUser();
      const authId = userRes.data?.user?.id;
      let currentUserProfile = null;
      if (authId) {
        try {
          const { data: ud } = await supabase.from('Usuarios').select('id, nombres, apellidos').eq('user_id', authId).single();
          if (ud) currentUserProfile = ud;
        } catch (e) {
          console.warn("Could not fetch current user profile from Usuarios table", e);
        }
      }

      // 2. Load registrations
      const { data, error } = await supabase
        .from('registro_solicitudes')
        .select(`
          *,
          Usuarios!registro_solicitudes_tratado_por_id_fkey(nombres, apellidos),
          Ubicaciones:cliente_id(*, ciudades:ciudad_id(ciudad)),
          Consumidores:cliente_final_id(*, ciudades:ciudad_id(ciudad))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const registrosList = data || [];

      // 3. Fetch comments in parallel with authors
      const radicados = registrosList.map(r => r.consecutivo).filter(Boolean);
      let commentsGrouped: Record<string, any[]> = {};
      if (radicados.length > 0) {
        const { data: commentsData } = await supabase
          .from('Comentarios_RegistroMAC')
          .select('*, Usuarios!fk_autor(id, nombres, apellidos)')
          .in('numero_radicado', radicados)
          .order('created_at', { ascending: false });
        
        if (commentsData) {
          commentsData.forEach(c => {
            if (!commentsGrouped[c.numero_radicado]) {
              commentsGrouped[c.numero_radicado] = [];
            }
            commentsGrouped[c.numero_radicado].push(c);
          });
        }
      }

      // 4. Fetch services in parallel
      const serviceCodes = registrosList
        .flatMap(r => String(r.servicio_creado_consecutivo || '').split(','))
        .map(s => s.trim())
        .filter(Boolean);

      let servicesMap: Record<string, any> = {};
      if (serviceCodes.length > 0) {
        const { data: svcs } = await supabase
          .from('query_servicios')
          .select('consecutivo, estado_visita, estadoVisita')
          .in('consecutivo', serviceCodes);
        
        if (svcs) {
          svcs.forEach(s => {
            servicesMap[s.consecutivo] = s;
          });
        }
      }

      // 5. Enrich records with new comment alert and service agendado alert
      const enriched = registrosList.map(r => {
        const rComments = commentsGrouped[r.consecutivo] || [];
        
        // Show alert ONLY when there is actually follow-up comments
        // AND the author of the last comment is different from the current logged-in user
        let hasNewCommentAlert = false;
        if (rComments.length > 0) {
          const lastComment = rComments[0]; // latest comment
          
          if (currentUserProfile) {
            // Compare author ID with current user ID
            if (lastComment.autor_id && String(lastComment.autor_id) !== String(currentUserProfile.id)) {
              hasNewCommentAlert = true;
            }
          } else {
            // Fallback to comparing with registration creator
            if (lastComment.autor_id && r.tratado_por_id && String(lastComment.autor_id) !== String(r.tratado_por_id)) {
              hasNewCommentAlert = true;
            }
          }
        }

        // Check if any of the linked services is agendado
        const rServiceCodes = String(r.servicio_creado_consecutivo || '')
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
        
        const hasServiceAgendadoAlert = rServiceCodes.some((code: string) => {
          const svc = servicesMap[code];
          if (!svc) return false;
          const status = svc.estado_visita || svc.estadoVisita;
          return status && status.toLowerCase() !== 'sin agendar';
        });

        return {
          ...r,
          _newCommentAlert: hasNewCommentAlert,
          _serviceAgendadoAlert: hasServiceAgendadoAlert,
          _commentsCount: rComments.length
        };
      });

      setRegistros(enriched);
    } catch (error) {
      console.error('Error fetching registros:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRegistros = registros.filter(r => {
    const estadoReal = r.estado || 'Abierto';
    if (filterEstado !== 'Todos' && estadoReal !== filterEstado) return false;

    const prioridadReal = r.prioridad || 'Media';
    if (filterPrioridad !== 'Todas' && prioridadReal !== filterPrioridad) return false;

    if (filterAsesor === 'Sin Asignar' && r.asesor_mac_id) return false;
    if (filterAsesor !== 'Todos' && filterAsesor !== 'Sin Asignar' && String(r.asesor_mac_id) !== String(filterAsesor)) return false;

    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const tratadoPor = r.Usuarios ? `${r.Usuarios.nombres || ''} ${r.Usuarios.apellidos || ''}` : '';
    const ubi = r.Ubicaciones || {};
    const cons = r.Consumidores || {};
    const searchString = `
      ${r.consecutivo || ''} 
      ${r.comentarios || ''} 
      ${r.cliente_nombre || ''} 
      ${r.cliente_final_nombre || ''} 
      ${r.id || ''}
      ${r.tipo_solicitud || ''}
      ${r.canal_venta || ''}
      ${tratadoPor}
      ${ubi.nit || ''}
      ${ubi.cedula || ''}
      ${ubi.direccion || ''}
      ${ubi.telefono || ''}
      ${ubi.telefono1 || ''}
      ${ubi.celular || ''}
      ${cons.nit || ''}
      ${cons.cedula || ''}
      ${cons.direccion || ''}
      ${cons.telefono || ''}
      ${cons.telefono1 || ''}
      ${cons.celular || ''}
      ${r.servicio_creado_consecutivo || ''}
    `.toLowerCase();
    
    return searchString.includes(searchLower);
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 font-sans p-4 md:p-8 pb-20">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-4 w-full max-w-[96%] xl:max-w-[1800px] mx-auto border-b border-gray-100 pb-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="p-2.5 bg-white rounded-full shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors shrink-0 text-slate-600 hover:text-slate-800"
            title="Volver al inicio"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <FileText className="w-5 h-5 text-brand hidden sm:block" />
              Registro Solicitudes
            </h1>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Gestión y listado de solicitudes</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented control for status */}
          <div className="bg-slate-100 border border-slate-200 rounded-lg p-0.5 flex items-center shadow-sm shrink-0">
            <button
              onClick={() => setFilterEstado('Todos')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${filterEstado === 'Todos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterEstado('Abierto')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${filterEstado === 'Abierto' ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-slate-500 hover:text-amber-800'}`}
            >
              Abiertos
            </button>
            <button
              onClick={() => setFilterEstado('Cerrado')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${filterEstado === 'Cerrado' ? 'bg-emerald-100 text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-emerald-800'}`}
            >
              Cerrados
            </button>
          </div>
          
          {/* Priority filter */}
          <div className="relative">
            <select
              value={filterPrioridad}
              onChange={(e) => setFilterPrioridad(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand shadow-sm pr-8 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <option value="Todas">Prioridad: Todas</option>
              <option value="Alta">Prioridad: Alta</option>
              <option value="Media">Prioridad: Media</option>
              <option value="Baja">Prioridad: Baja</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
          
          {/* Advisor filter */}
          <div className="relative min-w-[180px]">
            <select
              value={filterAsesor}
              onChange={(e) => setFilterAsesor(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 w-full text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand shadow-sm pr-8 cursor-pointer hover:bg-slate-50 transition-colors truncate"
            >
              <option value="Todos">Todos los Asesores</option>
              <option value="Sin Asignar">Sin Asignar</option>
              {asesores.map(a => (
                <option key={a.id} value={String(a.id)}>{a.nombres} {a.apellidos}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar registros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-56 pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm"
            />
          </div>

          {/* Add button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 bg-brand hover:bg-[#1d3342] text-white px-4 py-2.5 rounded-lg font-bold uppercase text-[10px] tracking-wider transition-all shadow-md shadow-brand/10 hover:shadow-lg whitespace-nowrap active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo Registro
          </button>
        </div>
      </header>

      <main className="w-full max-w-[96%] xl:max-w-[1800px] mx-auto">
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
                className="bg-white rounded-xl p-8 md:p-16 shadow-sm border border-gray-200/80 flex flex-col items-center justify-center text-center mt-4"
              >
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <Database className="w-8 h-8 text-slate-300" />
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
