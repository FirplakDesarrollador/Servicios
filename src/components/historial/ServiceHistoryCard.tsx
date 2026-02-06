'use client'

import { motion } from 'framer-motion'
import { Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ServiceVisit {
    id: number
    consecutivo: string
    fecha_hora_inicio: string
    fecha_hora_fin: string
    tipo_de_servicio: string
    consumidor_ciudad: string
    consumidor_direccion: string
    consumidor_contacto: string
    consumidor_telefono: string
    ubicacion_ciudad: string
    ubicacion_direccion: string
    ubicacion_contacto: string
    ubicacion_telefono: string
    servicio_id: number
    estado: boolean
}

interface ServiceHistoryCardProps {
    service: ServiceVisit
}

export default function ServiceHistoryCard({ service }: ServiceHistoryCardProps) {
    const router = useRouter()

    const formatTime = (dateString: string) => {
        try {
            return format(new Date(dateString), 'HH:mm', { locale: es })
        } catch {
            return 'N/A'
        }
    }

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'dd/MM/yyyy', { locale: es })
        } catch {
            return 'N/A'
        }
    }

    // Determinar qué información mostrar (consumidor o ubicación)
    const hasConsumerInfo = service.consumidor_contacto && service.consumidor_contacto.trim() !== ''
    const city = hasConsumerInfo ? service.consumidor_ciudad : service.ubicacion_ciudad
    const address = hasConsumerInfo ? service.consumidor_direccion : service.ubicacion_direccion
    const contact = hasConsumerInfo ? service.consumidor_contacto : service.ubicacion_contacto
    const phone = hasConsumerInfo ? service.consumidor_telefono : service.ubicacion_telefono

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
        >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="text-base font-bold text-[#254153]">
                    {service.consecutivo || 'Sin consecutivo'}
                </h3>

                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-600 font-semibold">
                        {formatDate(service.fecha_hora_inicio)}
                    </span>
                    <span className="text-sm text-slate-600">
                        De {formatTime(service.fecha_hora_inicio)} a {formatTime(service.fecha_hora_fin)}
                    </span>
                    <button
                        onClick={() => router.push(`/servicios/${service.servicio_id}`)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        aria-label="Ver detalles"
                    >
                        <Eye className="w-5 h-5 text-[#254153]" />
                    </button>
                </div>
            </div>

            {/* Información del servicio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* Tipo de servicio */}
                <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">Tipo de servicio</p>
                    <p className="text-sm text-slate-900">{service.tipo_de_servicio || 'N/A'}</p>
                </div>

                {/* Ciudad */}
                <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">Ciudad</p>
                    <p className="text-sm text-slate-900">{city || 'N/A'}</p>
                </div>

                {/* Dirección */}
                <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">Dirección</p>
                    <p className="text-sm text-slate-900 truncate" title={address || 'N/A'}>
                        {address || 'N/A'}
                    </p>
                </div>

                {/* Persona de contacto */}
                <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">Persona de contacto</p>
                    <p className="text-sm text-slate-900">{contact || 'N/A'}</p>
                </div>

                {/* Teléfono */}
                <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">Teléfono</p>
                    <p className="text-sm text-slate-900">{phone || 'N/A'}</p>
                </div>
            </div>

            {/* Badge de estado */}
            <div className="mt-3 flex items-center gap-2">
                <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${service.estado
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                >
                    {service.estado ? 'Pendiente' : 'Terminado'}
                </span>
            </div>
        </motion.div>
    )
}
