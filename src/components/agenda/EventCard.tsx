'use client'

import { Clock, Calendar, Repeat, User } from 'lucide-react'
import { Visita } from '@/lib/dateUtils'
import { formatTime } from '@/lib/dateUtils'

interface Props {
    visita: Visita
    onClick?: () => void
}

export default function EventCard({ visita, onClick }: Props) {
    const getEventTypeColor = () => {
        if (visita.personal) return 'bg-purple-100 border-purple-300 text-purple-800'
        if (visita.recurrente) return 'bg-blue-100 border-blue-300 text-blue-800'
        return 'bg-emerald-100 border-emerald-300 text-emerald-800'
    }

    const getEventTypeBadge = () => {
        if (visita.personal) return { icon: User, label: 'Personal', color: 'bg-purple-500' }
        if (visita.recurrente) return { icon: Repeat, label: 'Recurrente', color: 'bg-blue-500' }
        return { icon: Calendar, label: 'Evento', color: 'bg-emerald-500' }
    }

    const badge = getEventTypeBadge()
    const BadgeIcon = badge.icon

    return (
        <div
            onClick={onClick}
            className={`border-2 rounded-xl p-4 transition-all cursor-pointer hover:shadow-lg ${getEventTypeColor()}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                    {/* Nombre del evento */}
                    <h3 className="font-bold text-lg mb-2">{visita.nombre}</h3>

                    {/* Horario */}
                    {visita.fecha_hora_inicio && (
                        <div className="flex items-center gap-2 text-sm mb-2">
                            <Clock className="w-4 h-4" />
                            <span className="font-semibold">
                                {formatTime(visita.fecha_hora_inicio)}
                                {visita.fecha_hora_fin && ` - ${formatTime(visita.fecha_hora_fin)}`}
                            </span>
                        </div>
                    )}

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-white ${badge.color}`}>
                            <BadgeIcon className="w-3 h-3" />
                            {badge.label}
                        </span>

                        {visita.reagendado && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500 text-white">
                                Reagendado
                            </span>
                        )}

                        {visita.ocurriendo && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white animate-pulse">
                                En curso
                            </span>
                        )}

                        {visita.entrega_parcial && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500 text-white">
                                Entrega parcial
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Días recurrentes */}
            {visita.recurrente && visita.dia_recurrente && visita.dia_recurrente.length > 0 && (
                <div className="mt-3 pt-3 border-t border-current/20">
                    <p className="text-xs font-medium mb-1">Se repite:</p>
                    <div className="flex flex-wrap gap-1">
                        {visita.dia_recurrente.map((dia, index) => {
                            const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
                            return (
                                <span key={index} className="px-2 py-0.5 bg-white/50 rounded text-xs font-semibold">
                                    {dias[parseInt(dia)]}
                                </span>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
