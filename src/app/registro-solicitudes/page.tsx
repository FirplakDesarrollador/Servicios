'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, FileText, Search, Plus, Loader2, Database, ChevronDown, MessageCircle } from 'lucide-react';
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
  const isInitialized = useRef(false);

  useEffect(() => {
    // 0. Load filters from sessionStorage if they exist
    if (typeof window !== 'undefined') {
      const savedSearch = sessionStorage.getItem('mac_filter_search');
      if (savedSearch !== null) setSearchTerm(savedSearch);
      
      const savedEstado = sessionStorage.getItem('mac_filter_estado');
      if (savedEstado !== null) setFilterEstado(savedEstado);

      const savedPrioridad = sessionStorage.getItem('mac_filter_prioridad');
      if (savedPrioridad !== null) setFilterPrioridad(savedPrioridad);

      const savedAsesor = sessionStorage.getItem('mac_filter_asesor');
      if (savedAsesor !== null) setFilterAsesor(savedAsesor);
    }

    fetchRegistros();
    fetchAsesores();
    
    // Marcar como inicializado despues de cargar
    setTimeout(() => {
        isInitialized.current = true;
    }, 100);
  }, []);

  // Sync state to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && isInitialized.current) {
      sessionStorage.setItem('mac_filter_search', searchTerm);
      sessionStorage.setItem('mac_filter_estado', filterEstado);
      sessionStorage.setItem('mac_filter_prioridad', filterPrioridad);
      sessionStorage.setItem('mac_filter_asesor', filterAsesor);
    }
  }, [searchTerm, filterEstado, filterPrioridad, filterAsesor]);

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

  // Paleta FIRPLAK, igual que el módulo de WhatsApp
  const segmentClass = (active: boolean) =>
    `flex items-center gap-1.5 px-2.5 h-6 rounded-md text-[9px] font-semibold uppercase tracking-wider transition-colors ${
      active ? 'bg-white text-brand shadow-sm' : 'text-stone-500 hover:text-brand'
    }`;
  const filterControlClass = 'appearance-none h-7 bg-white border border-border rounded-lg pl-2.5 pr-6 text-[10px] font-medium text-brand-dark focus:outline-none focus:border-brand-light cursor-pointer hover:bg-cream-light transition-colors';

  return (
    <div className="min-h-screen bg-cream text-brand-dark font-sans p-3 md:p-5 pb-20">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 mb-3 w-full max-w-[96%] xl:max-w-[1800px] mx-auto border-b border-border pb-3">
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => router.push('/')}
            className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-border hover:bg-cream-light transition-colors shrink-0 text-stone-500 hover:text-brand"
            title="Volver al inicio"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
          </button>
          <div>
            <h1 className="text-sm md:text-base font-semibold text-brand-dark tracking-tight flex items-center gap-1.5 whitespace-nowrap">
              <FileText className="w-4 h-4 text-brand hidden sm:block" strokeWidth={1.75} />
              Registro Solicitudes
            </h1>
            <p className="text-[9px] font-medium text-brand-light uppercase tracking-[0.12em] whitespace-nowrap">Gestión y listado de solicitudes</p>
          </div>
        </div>

        <div className="flex flex-wrap lg:flex-nowrap items-center gap-1.5 lg:justify-end">
          {/* Segmented control for status */}
          <div className="bg-cream-light border border-border rounded-lg p-0.5 flex items-center shrink-0">
            <button onClick={() => setFilterEstado('Todos')} className={segmentClass(filterEstado === 'Todos')}>
              Todos
            </button>
            <button onClick={() => setFilterEstado('Abierto')} className={segmentClass(filterEstado === 'Abierto')}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Abiertos
            </button>
            <button onClick={() => setFilterEstado('Cerrado')} className={segmentClass(filterEstado === 'Cerrado')}>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-light"></span>
              Cerrados
            </button>
          </div>

          {/* Priority filter */}
          <div className="relative shrink-0">
            <select
              value={filterPrioridad}
              onChange={(e) => setFilterPrioridad(e.target.value)}
              className={filterControlClass}
            >
              <option value="Todas">Prioridad: Todas</option>
              <option value="Alta">Prioridad: Alta</option>
              <option value="Media">Prioridad: Media</option>
              <option value="Baja">Prioridad: Baja</option>
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400" />
          </div>

          {/* Advisor filter */}
          <div className="relative min-w-[110px] max-w-[180px] shrink-0">
            <select
              value={filterAsesor}
              onChange={(e) => setFilterAsesor(e.target.value)}
              className={`${filterControlClass} w-full truncate`}
            >
              <option value="Todos">Todos los Asesores</option>
              <option value="Sin Asignar">Sin Asignar</option>
              {asesores.map(a => (
                <option key={a.id} value={String(a.id)}>{a.nombres} {a.apellidos}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400" />
          </div>

          {/* Search input */}
          <div className="relative shrink-0">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" strokeWidth={1.75} />
            <input
              type="text"
              placeholder="Buscar registros"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-36 h-7 pl-7 pr-2.5 bg-white border border-border rounded-lg text-[10px] text-brand-dark placeholder:text-stone-400 focus:outline-none focus:border-brand-light transition-colors"
            />
          </div>

          {/* WP Button */}
          <button
            onClick={() => router.push('/whatsapp')}
            className="flex items-center justify-center gap-1.5 h-7 px-2.5 bg-white border border-border hover:border-brand-light hover:bg-cream-light text-brand rounded-lg font-semibold text-[10px] transition-colors whitespace-nowrap shrink-0"
            title="Abrir WhatsApp"
          >
            <MessageCircle className="w-3 h-3" strokeWidth={1.75} />
            WhatsApp
          </button>

          {/* Add button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-1 h-7 px-3 bg-brand hover:bg-brand-hover text-white rounded-lg font-semibold text-[10px] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3 h-3" />
            Nuevo registro
          </button>
        </div>
      </header>

      <main className="w-full max-w-[96%] xl:max-w-[1800px] mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-brand animate-spin mb-4" />
            <p className="text-stone-500 text-sm">Cargando registros...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredRegistros.length > 0 ? (
              <motion.div
                className="flex flex-col gap-2"
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
                className="bg-white rounded-xl p-8 md:p-16 border border-border flex flex-col items-center justify-center text-center mt-4"
              >
                <div className="w-14 h-14 bg-cream-light border border-border rounded-2xl flex items-center justify-center mb-5">
                  <Database className="w-6 h-6 text-brand-light" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-brand-dark mb-2">No hay registros</h3>
                <p className="text-stone-500 text-sm max-w-md">
                  {searchTerm
                    ? `No se encontraron resultados para "${searchTerm}". Intenta con otra búsqueda.`
                    : "Aún no hay ninguna solicitud registrada. Crea un nuevo registro para comenzar."}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-6 h-9 px-4 bg-white border border-border hover:bg-cream-light text-brand rounded-lg text-sm font-semibold transition-colors"
                  >
                    Limpiar búsqueda
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
