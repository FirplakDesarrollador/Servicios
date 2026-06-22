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
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className="bg-white p-4 sm:p-5 rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-100 flex flex-col justify-between gap-4 group cursor-pointer transition-all hover:border-brand/30 hover:shadow-brand/10 w-full"
    >
      <div className="flex flex-col md:flex-row md:items-start gap-4 flex-1 w-full min-w-0">
        {/* Icon */}
        <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500 group-hover:bg-brand group-hover:text-white transition-colors shrink-0">
          <FileText className="w-6 h-6" />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Col 1: Title & Desc */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-bold text-slate-800 truncate text-base" title={consecutivo}>
                {consecutivo}
              </h3>
              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0 w-max ${status === 'Abierto' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {status}
              </span>
              {prioridad === 'Alta' && (
                <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0 w-max">
                  Prioridad Alta
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mb-2 text-sky-600">
              <Tag className="w-3.5 h-3.5" />
              <span className="text-xs font-bold uppercase tracking-wide">{tipoSolicitud}</span>
            </div>
            <p className="text-sm text-slate-500 line-clamp-2">
              {description}
            </p>
          </div>

          {/* Col 2: Clientes */}
          <div className="lg:col-span-4 flex flex-col gap-3 border-t lg:border-t-0 lg:border-l border-slate-100 pt-3 lg:pt-0 lg:pl-4">
            <div className="flex items-start gap-2">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                    {registro.canal_venta === 'canal_propio_ecommerce' ? 'Cliente Final' : 'Distribuidor / Obra'}
                </p>
                <p className="text-sm font-bold text-slate-700 leading-tight">
                    {registro.canal_venta === 'canal_propio_ecommerce' 
                        ? registro.cliente_final_nombre 
                        : registro.cliente_nombre || 'N/A'}
                </p>
                {/* Info Adicional Principal */}
                {registro.canal_venta !== 'canal_propio_ecommerce' && (ubi.direccion || ubi.telefono1 || ubi.telefono) && (
                    <div className="mt-1 space-y-0.5 text-xs text-slate-500 font-medium">
                        {(ubi.ciudad || ubi.direccion) && <p>{ubi.ciudad ? `${ubi.ciudad} - ` : ''}{ubi.direccion}</p>}
                        <p>{ubi.telefono1 || ubi.telefono || ubi.celular}</p>
                    </div>
                )}
                {registro.canal_venta === 'canal_propio_ecommerce' && (cons.direccion || cons.celular || cons.telefono1) && (
                    <div className="mt-1 space-y-0.5 text-xs text-slate-500 font-medium">
                        {(cons.ciudad || cons.direccion) && <p>{cons.ciudad ? `${cons.ciudad} - ` : ''}{cons.direccion}</p>}
                        <p>{cons.celular || cons.telefono1 || cons.telefono}</p>
                    </div>
                )}
              </div>
            </div>

            {/* Cliente Final Opcional */}
            {registro.cliente_final_id && registro.canal_venta !== 'canal_propio_ecommerce' && (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Cliente Final</p>
                  <p className="text-sm font-bold text-slate-700 leading-tight">{registro.cliente_final_nombre}</p>
                  {/* Info Adicional Final */}
                  {(cons.direccion || cons.celular || cons.telefono1) && (
                      <div className="mt-1 space-y-0.5 text-xs text-slate-500 font-medium">
                          {(cons.ciudad || cons.direccion) && <p>{cons.ciudad ? `${cons.ciudad} - ` : ''}{cons.direccion}</p>}
                          <p>{cons.celular || cons.telefono1 || cons.telefono}</p>
                      </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Col 3: Personal */}
          <div className="lg:col-span-4 flex flex-col gap-3 border-t lg:border-t-0 lg:border-l border-slate-100 pt-3 lg:pt-0 lg:pl-4">
            <div className="flex items-start gap-2">
              <UserCog className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block leading-none mb-1">
                  Tratado Por
                </span>
                <span className="text-xs font-bold text-slate-700 truncate block">
                  {tratadoPor}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <UserCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block leading-none mb-1">
                  Asignado A
                </span>
                <span className={`text-xs font-bold truncate block ${asignadoA === 'Sin asignar' ? 'text-slate-400 italic' : 'text-brand'}`}>
                  {asignadoA}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto mt-2 pt-4 border-t border-slate-100 shrink-0 self-end">
        <div className="flex flex-col items-start md:items-end gap-1 text-xs font-medium text-slate-400">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
            ID: {registro.id}
          </span>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {dateStr}
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-brand/10 transition-colors shrink-0">
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand transition-colors" />
        </div>
      </div>
    </motion.div>
  );
}
