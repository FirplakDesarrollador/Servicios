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
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className="bg-white p-4 rounded-2xl shadow-md shadow-[#749094]/10 border border-[#e8e2d5] flex flex-col md:flex-row md:items-start gap-4 group cursor-pointer transition-all hover:border-[#254153]/30 hover:shadow-lg hover:shadow-[#254153]/5 w-full"
    >
      {/* Icon */}
      <div className="w-12 h-12 bg-[#254153]/5 rounded-xl flex items-center justify-center text-[#254153] group-hover:bg-[#254153] group-hover:text-white transition-colors shrink-0">
        <FileText className="w-6 h-6" />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* Col 1: Title & Desc */}
        <div className="lg:col-span-3 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-extrabold text-[#1d1d1b] truncate text-base" title={consecutivo}>
              {consecutivo}
            </h3>
            <span className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider shrink-0 w-max ${status === 'Abierto' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {status}
            </span>
            {prioridad === 'Alta' && (
              <span className="px-2.5 py-1 bg-red-100 text-red-600 rounded-md text-[11px] font-black uppercase tracking-wider shrink-0 w-max">
                Prioridad Alta
              </span>
            )}
            {/* Alerta de nuevo comentario de otra persona */}
            {registro._newCommentAlert && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse border border-blue-200 shrink-0" title="Nueva actividad o comentarios de otro usuario">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                Actividad
              </span>
            )}
            {/* Alerta de servicio enlazado agendado */}
            {registro._serviceAgendadoAlert && (
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-indigo-200 shrink-0" title="Servicio enlazado ya agendado">
                <Calendar className="w-3 h-3 text-indigo-600" />
                Agendado
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mb-2 text-[#749094]">
            <Tag className="w-3.5 h-3.5" />
            <span className="text-xs font-bold uppercase tracking-wide">{tipoSolicitud}</span>
          </div>
          <p className="text-sm text-[#1d1d1b]/70 line-clamp-3">
            {description}
          </p>
        </div>

        {/* Col 2: Clientes */}
        <div className="lg:col-span-4 flex flex-col justify-center gap-3 border-t lg:border-t-0 lg:border-l border-[#e8e2d5] pt-3 lg:pt-0 lg:pl-4">
          <div className={`grid gap-4 w-full ${registro.cliente_final_id && registro.canal_venta !== 'canal_propio_ecommerce' ? 'grid-cols-1 xl:grid-cols-2 xl:divide-x xl:divide-dashed xl:divide-[#e8e2d5]' : 'grid-cols-1'}`}>
            <div className="flex items-start gap-2">
              <Building2 className="w-4 h-4 text-[#749094] shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#749094] mb-0.5">
                    {registro.canal_venta === 'canal_propio_ecommerce' ? 'Cliente Final' : 'Distribuidor / Obra'}
                </p>
                <p className="text-sm font-bold text-[#1d1d1b] leading-tight">
                    {registro.canal_venta === 'canal_propio_ecommerce' 
                        ? registro.cliente_final_nombre 
                        : registro.cliente_nombre || 'N/A'}
                </p>
                {/* Info Adicional Principal */}
                {registro.canal_venta !== 'canal_propio_ecommerce' && (ubi.direccion || ubi.telefono1 || ubi.telefono) && (
                    <div className="mt-1 space-y-0.5 text-xs text-[#1d1d1b]/70 font-medium">
                        {(ubiCiudad || ubi.direccion) && <p>{ubiCiudad ? `${ubiCiudad} - ` : ''}{ubi.direccion}</p>}
                        <p>{ubi.telefono1 || ubi.telefono || ubi.celular}</p>
                    </div>
                )}
                {registro.canal_venta === 'canal_propio_ecommerce' && (cons.direccion || cons.celular || cons.telefono1) && (
                    <div className="mt-1 space-y-0.5 text-xs text-[#1d1d1b]/70 font-medium">
                        {(consCiudad || cons.direccion) && <p>{consCiudad ? `${consCiudad} - ` : ''}{cons.direccion}</p>}
                        <p>{cons.celular || cons.telefono1 || cons.telefono}</p>
                    </div>
                )}
              </div>
            </div>

            {/* Cliente Final Opcional */}
            {registro.cliente_final_id && registro.canal_venta !== 'canal_propio_ecommerce' && (
              <div className="flex items-start gap-3 pt-2 xl:pt-0 xl:pl-4 border-t border-dashed border-[#e8e2d5] xl:border-t-0">
                <User className="w-4 h-4 text-[#749094] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#749094] mb-0.5">Cliente Final</p>
                  <p className="text-sm font-bold text-[#1d1d1b] leading-tight">{registro.cliente_final_nombre}</p>
                  {/* Info Adicional Final */}
                  {(cons.direccion || cons.celular || cons.telefono1) && (
                      <div className="mt-1 space-y-0.5 text-xs text-[#1d1d1b]/70 font-medium">
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
        <div className="lg:col-span-3 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-[#e8e2d5] pt-3 lg:pt-0 lg:pl-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full xl:divide-x xl:divide-dashed xl:divide-[#e8e2d5]">
            <div className="flex items-start gap-2">
              <UserCog className="w-4 h-4 text-[#749094] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#749094] block leading-none mb-1">
                  Solicitado Por
                </span>
                <span className="text-xs font-bold text-[#1d1d1b]/90 truncate block">
                  {tratadoPor}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 pt-2 xl:pt-0 xl:pl-4 border-t border-dashed border-[#e8e2d5] xl:border-t-0">
              <UserCheck className="w-4 h-4 text-[#749094] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#749094] block leading-none mb-1">
                  Asignado A
                </span>
                <span className={`text-xs font-bold truncate block ${asignadoA === 'Sin asignar' ? 'text-[#1d1d1b]/50 italic' : 'text-[#254153]'}`}>
                  {asignadoA}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Col 4: ID, Fecha & Detalle */}
        <div className="lg:col-span-2 flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 lg:border-l border-[#e8e2d5] pt-3 lg:pt-0 lg:pl-4 lg:self-center w-full">
          <div className="flex flex-col items-start lg:items-end gap-1 text-xs font-medium text-[#1d1d1b]/60">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#749094]">
              ID: {registro.id}
            </span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5" />
              {dateStr}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#f5f1ea] flex items-center justify-center group-hover:bg-[#254153]/10 transition-colors shrink-0">
            <ChevronRight className="w-5 h-5 text-[#749094] group-hover:text-[#254153] transition-colors" />
          </div>
        </div>

      </div>
    </motion.div>
  );
}
