import { motion } from 'framer-motion';
import { FileText, Calendar, ChevronRight, User, Building2, UserCog, UserCheck, Tag } from 'lucide-react';

// Etiqueta pequeña de las columnas (paleta FIRPLAK)
const labelClass = 'text-[9px] font-semibold uppercase tracking-wider text-stone-400 block leading-none mb-1';

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
      onClick={onClick}
      className="relative bg-white px-3 py-3 rounded-xl border border-border flex flex-col md:flex-row md:items-start gap-3 group cursor-pointer transition-colors hover:border-brand-light hover:bg-cream-light/40 w-full"
    >
      {/* Barra de estado a la izquierda */}
      <span className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${status === 'Abierto' ? 'bg-amber-400' : 'bg-brand-light'}`}></span>

      {/* Icon */}
      <div className="w-8 h-8 ml-1 bg-brand-soft rounded-lg flex items-center justify-center text-brand group-hover:bg-brand group-hover:text-white transition-colors shrink-0">
        <FileText className="w-4 h-4" strokeWidth={1.75} />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">

        {/* Col 1: Title & Desc */}
        <div className="lg:col-span-3 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <h3 className="font-semibold text-brand-dark truncate text-xs group-hover:text-brand transition-colors" title={consecutivo}>
              {consecutivo}
            </h3>
            <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-semibold uppercase tracking-wider shrink-0 w-max ${status === 'Abierto' ? 'bg-amber-50 text-amber-700' : 'bg-sage-soft text-brand'}`}>
              {status}
            </span>
            {prioridad === 'Alta' && (
              <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded-md text-[8px] font-semibold uppercase tracking-wider shrink-0 w-max">
                Alta
              </span>
            )}
            {registro._newCommentAlert && (
              <span className="px-1.5 py-0.5 bg-brand text-white rounded-md text-[8px] font-semibold uppercase tracking-wider flex items-center gap-1 animate-pulse shrink-0" title="Nueva actividad o comentarios de otro usuario">
                <span className="w-1 h-1 rounded-full bg-white"></span>
                Actividad
              </span>
            )}
            {registro._serviceAgendadoAlert && (
              <span className="px-1.5 py-0.5 bg-brand-soft text-brand rounded-md text-[8px] font-semibold uppercase tracking-wider flex items-center gap-1 shrink-0" title="Servicio enlazado ya agendado">
                <Calendar className="w-2.5 h-2.5" />
                Agendado
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mb-1 text-brand-light">
            <Tag className="w-2.5 h-2.5" />
            <span className="text-[8px] font-semibold uppercase tracking-wider">{tipoSolicitud}</span>
          </div>
          <p className="text-[10px] text-stone-500 leading-tight line-clamp-1">
            {description}
          </p>
        </div>

        {/* Col 2: Clientes */}
        <div className="lg:col-span-4 flex flex-col justify-center gap-1.5 border-t lg:border-t-0 lg:border-l border-border pt-2 lg:pt-0 lg:pl-3">
          <div className={`grid gap-2 w-full ${registro.cliente_final_id && registro.canal_venta !== 'canal_propio_ecommerce' ? 'grid-cols-1 xl:grid-cols-2 xl:divide-x xl:divide-border' : 'grid-cols-1'}`}>
            <div className="flex items-start gap-1.5">
              <Building2 className="w-3 h-3 text-stone-400 shrink-0 mt-0.5" strokeWidth={1.75} />
              <div className="min-w-0">
                <p className={labelClass}>
                    {registro.canal_venta === 'canal_propio_ecommerce' ? 'Cliente Final' : 'Distribuidor / Obra'}
                </p>
                <p className="text-[10px] font-semibold text-brand-dark leading-tight truncate">
                    {registro.canal_venta === 'canal_propio_ecommerce'
                        ? registro.cliente_final_nombre
                        : registro.cliente_nombre || 'N/A'}
                </p>
                {registro.canal_venta !== 'canal_propio_ecommerce' && (ubi.direccion || ubi.telefono1 || ubi.telefono) && (
                    <div className="mt-0.5 space-y-0.5 text-[10px] text-stone-500">
                        {(ubiCiudad || ubi.direccion) && <p className="truncate">{ubiCiudad ? `${ubiCiudad} - ` : ''}{ubi.direccion}</p>}
                        <p>{ubi.telefono1 || ubi.telefono || ubi.celular}</p>
                    </div>
                )}
                {registro.canal_venta === 'canal_propio_ecommerce' && (cons.direccion || cons.celular || cons.telefono1) && (
                    <div className="mt-0.5 space-y-0.5 text-[10px] text-stone-500">
                        {(consCiudad || cons.direccion) && <p className="truncate">{consCiudad ? `${consCiudad} - ` : ''}{cons.direccion}</p>}
                        <p>{cons.celular || cons.telefono1 || cons.telefono}</p>
                    </div>
                )}
              </div>
            </div>

            {/* Cliente Final Opcional */}
            {registro.cliente_final_id && registro.canal_venta !== 'canal_propio_ecommerce' && (
              <div className="flex items-start gap-1.5 pt-1.5 xl:pt-0 xl:pl-3 border-t border-border xl:border-t-0">
                <User className="w-3 h-3 text-stone-400 shrink-0 mt-0.5" strokeWidth={1.75} />
                <div className="min-w-0">
                  <p className={labelClass}>Cliente Final</p>
                  <p className="text-[10px] font-semibold text-brand-dark leading-tight truncate">{registro.cliente_final_nombre}</p>
                  {(cons.direccion || cons.celular || cons.telefono1) && (
                      <div className="mt-0.5 space-y-0.5 text-[10px] text-stone-500">
                          {(consCiudad || cons.direccion) && <p className="truncate">{consCiudad ? `${consCiudad} - ` : ''}{cons.direccion}</p>}
                          <p>{cons.celular || cons.telefono1 || cons.telefono}</p>
                      </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Col 3: Personal */}
        <div className="lg:col-span-3 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-border pt-2 lg:pt-0 lg:pl-3">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 w-full xl:divide-x xl:divide-border">
            <div className="flex items-start gap-1.5">
              <UserCog className="w-3 h-3 text-stone-400 shrink-0 mt-0.5" strokeWidth={1.75} />
              <div className="min-w-0">
                <span className={labelClass}>
                  Solicitado Por
                </span>
                <span className="text-[10px] font-semibold text-brand-dark truncate block">
                  {tratadoPor}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-1.5 pt-1.5 xl:pt-0 xl:pl-3 border-t border-border xl:border-t-0">
              <UserCheck className="w-3 h-3 text-stone-400 shrink-0 mt-0.5" strokeWidth={1.75} />
              <div className="min-w-0">
                <span className={labelClass}>
                  Asignado A
                </span>
                <span className={`text-[10px] truncate block ${asignadoA === 'Sin asignar' ? 'text-stone-400 italic' : 'font-semibold text-brand'}`}>
                  {asignadoA}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Col 4: ID, Fecha & Detalle */}
        <div className="lg:col-span-2 flex items-center justify-between lg:justify-end gap-3 border-t lg:border-t-0 lg:border-l border-border pt-2 lg:pt-0 lg:pl-3 lg:self-center w-full">
          <div className="flex flex-col items-start lg:items-end gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-stone-400">
              ID {registro.id}
            </span>
            <div className="flex items-center gap-1 text-[10px] whitespace-nowrap text-stone-500">
              <Calendar className="w-3 h-3 text-stone-400" strokeWidth={1.75} />
              {dateStr}
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg border border-border flex items-center justify-center group-hover:bg-brand group-hover:border-brand transition-colors shrink-0">
            <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-white transition-colors" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
