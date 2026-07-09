import { motion } from 'framer-motion';
import { FileText, Calendar, ChevronRight, User, Building2, UserCog, UserCheck, Tag } from 'lucide-react';

export default function RegistroCard({ registro, onClick }: { registro: any, onClick?: () => void }) {
  // Mapear campos reales de public.registro_solicitudes
  const consecutivo = registro.consecutivo || `REG-${registro.id || 'N/A'}`;
  const tipoSolicitud = registro.tipo_solicitud || 'Solicitud';
  const description = registro.comentarios || 'Sin comentarios adicionales.';
  
  // Clientes
  const distribuidorObra = registro.cliente_nombre || 'N/A';
  const clienteFinal = registro.cliente_final_nombre || null;
  
  // Personal
  const tratadoPor = registro.Usuarios 
    ? `${registro.Usuarios.nombres || ''} ${registro.Usuarios.apellidos || ''}`.trim() || 'Usuario'
    : (registro.tratado_por_id ? `Usuario ID: ${registro.tratado_por_id}` : 'N/A');

  const ubi = registro.Ubicaciones || {};
  const cons = registro.Consumidores || {};
  
  const ubiCiudad = ubi.ciudades?.ciudad || ubi.ciudad;
  const consCiudad = cons.ciudades?.ciudad || cons.ciudad;

  const asignadoA = 'Sin asignar'; // Por ahora en blanco

  // Formatear fecha
  let dateStr = 'Sin fecha';
  const rawDate = registro.created_at;
  if (rawDate) {
    try {
      const d = new Date(rawDate);
      dateStr = d.toLocaleDateString();
    } catch(e) {}
  }

  const status = registro.estado || 'Abierto';
  const prioridad = registro.prioridad || 'Media';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-start gap-4 group cursor-pointer transition-all hover:border-brand/40 hover:shadow-md w-full"
    >
      {/* Icon */}
      <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-brand/10 group-hover:text-brand transition-colors shrink-0">
        <FileText className="w-5 h-5" />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* Col 1: Title & Desc */}
        <div className="lg:col-span-3 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <h3 className="font-bold text-slate-800 truncate text-base group-hover:text-brand transition-colors" title={consecutivo}>
              {consecutivo}
            </h3>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 w-max border ${status === 'Abierto' ? 'bg-amber-50 text-amber-700 border-amber-200/60' : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'}`}>
              {status}
            </span>
            {prioridad === 'Alta' && (
              <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 w-max border border-red-200/60">
                Alta
              </span>
            )}
            {/* Alerta de nuevo comentario de otra persona */}
            {registro._newCommentAlert && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse border border-blue-200 shrink-0" title="Nueva actividad o comentarios de otro usuario">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                Actividad
              </span>
            )}
            {/* Alerta de servicio enlazado agendado */}
            {registro._serviceAgendadoAlert && (
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-indigo-200 shrink-0" title="Servicio enlazado ya agendado">
                <Calendar className="w-3 h-3 text-indigo-600" />
                Agendado
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mb-2 text-slate-400">
            <Tag className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{tipoSolicitud}</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
            {description}
          </p>
        </div>
 
        {/* Col 2: Clientes */}
        <div className="lg:col-span-4 flex flex-col justify-center gap-3 border-t lg:border-t-0 lg:border-l border-gray-100 pt-3 lg:pt-0 lg:pl-4">
          <div className={`grid gap-4 w-full ${registro.cliente_final_id && registro.canal_venta !== 'canal_propio_ecommerce' ? 'grid-cols-1 xl:grid-cols-2 xl:divide-x xl:divide-gray-100' : 'grid-cols-1'}`}>
            <div className="flex items-start gap-2">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    {registro.canal_venta === 'canal_propio_ecommerce' ? 'Cliente Final' : 'Distribuidor / Obra'}
                </p>
                <p className="text-xs font-bold text-slate-700 leading-tight">
                    {registro.canal_venta === 'canal_propio_ecommerce' 
                        ? registro.cliente_final_nombre 
                        : registro.cliente_nombre || 'N/A'}
                </p>
                {/* Info Adicional Principal */}
                {registro.canal_venta !== 'canal_propio_ecommerce' && (ubi.direccion || ubi.telefono1 || ubi.telefono) && (
                    <div className="mt-1 space-y-0.5 text-xs text-slate-500 font-medium">
                        {(ubiCiudad || ubi.direccion) && <p>{ubiCiudad ? `${ubiCiudad} - ` : ''}{ubi.direccion}</p>}
                        <p>{ubi.telefono1 || ubi.telefono || ubi.celular}</p>
                    </div>
                )}
                {registro.canal_venta === 'canal_propio_ecommerce' && (cons.direccion || cons.celular || cons.telefono1) && (
                    <div className="mt-1 space-y-0.5 text-xs text-slate-500 font-medium">
                        {(consCiudad || cons.direccion) && <p>{consCiudad ? `${consCiudad} - ` : ''}{cons.direccion}</p>}
                        <p>{cons.celular || cons.telefono1 || cons.telefono}</p>
                    </div>
                )}
              </div>
            </div>
 
            {/* Cliente Final Opcional */}
            {registro.cliente_final_id && registro.canal_venta !== 'canal_propio_ecommerce' && (
              <div className="flex items-start gap-3 pt-2 xl:pt-0 xl:pl-4 border-t border-gray-100 xl:border-t-0">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Cliente Final</p>
                  <p className="text-xs font-bold text-slate-700 leading-tight">{registro.cliente_final_nombre}</p>
                  {/* Info Adicional Final */}
                  {(cons.direccion || cons.celular || cons.telefono1) && (
                      <div className="mt-1 space-y-0.5 text-xs text-slate-500 font-medium">
                          {(consCiudad || cons.direccion) && <p>{consCiudad ? `${consCiudad} - ` : ''}{cons.direccion}</p>}
                          <p>{cons.celular || cons.telefono1 || cons.telefono}</p>
                      </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
 
        {/* Col 3: Personal */}
        <div className="lg:col-span-3 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-gray-100 pt-3 lg:pt-0 lg:pl-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full xl:divide-x xl:divide-gray-100">
            <div className="flex items-start gap-2">
              <UserCog className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-none mb-1">
                  Solicitado Por
                </span>
                <span className="text-xs font-bold text-slate-600 truncate block">
                  {tratadoPor}
                </span>
              </div>
            </div>
 
            <div className="flex items-start gap-2 pt-2 xl:pt-0 xl:pl-4 border-t border-gray-100 xl:border-t-0">
              <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-none mb-1">
                  Asignado A
                </span>
                <span className={`text-xs font-bold truncate block ${asignadoA === 'Sin asignar' ? 'text-slate-400/70 italic font-medium' : 'text-brand'}`}>
                  {asignadoA}
                </span>
              </div>
            </div>
          </div>
        </div>
 
        {/* Col 4: ID, Fecha & Detalle */}
        <div className="lg:col-span-2 flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 lg:border-l border-gray-100 pt-3 lg:pt-0 lg:pl-4 lg:self-center w-full">
          <div className="flex flex-col items-start lg:items-end gap-1 text-xs font-semibold text-slate-500">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              ID: {registro.id}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] whitespace-nowrap text-slate-400">
              <Calendar className="w-3 h-3" />
              {dateStr}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-brand/10 transition-colors shrink-0">
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand transition-colors" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
