'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar as CalendarIcon, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format, startOfWeek, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import EventCard from '@/components/agenda/EventCard'
import {
    Visita,
    getNextDays,
    formatDateES,
    filterVisitasByDate,
    countVisitasByDate
} from '@/lib/dateUtils'

interface User {
    id: number
    display_name: string
    rol: string
    correo: string
}

export default function MiAgendaPage() {
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [visitas, setVisitas] = useState<Visita[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())

    useEffect(() => {
        loadUserAndVisitas()
    }, [])

    // Reload visitas when week changes
    useEffect(() => {
        if (currentUser) {
            loadVisitas(currentUser.id)
        }
    }, [selectedDate, currentUser])

    const loadUserAndVisitas = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }

            const { data: userData } = await supabase
                .from('Usuarios')
                .select('id, display_name, rol, correo')
                .eq('correo', session.user.email)
                .single()

            if (userData) {
                setCurrentUser(userData)
            }
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadVisitas = async (userId: number) => {
        try {
            // Calculate date range: 1 month before and after selected date
            const startDate = subDays(selectedDate, 30)
            const endDate = addDays(selectedDate, 30)

            const { data, error } = await supabase
                .from('Visitas')
                .select('id, nombre, fecha_hora_inicio, fecha_hora_fin, recurrente, dia_recurrente, personal, reagendado, ocurriendo, entrega_parcial, tecnico_id, servicio_id, estado')
                .eq('tecnico_id', userId)
                .eq('estado', true)
                .neq('nombre', 'Preagendado')
                .or(`fecha_hora_inicio.gte.${startDate.toISOString()},recurrente.eq.true`)
                .lte('fecha_hora_inicio', endDate.toISOString())
                .order('fecha_hora_inicio', { ascending: true })
                .limit(100)

            if (error) throw error
            if (data) setVisitas(data as Visita[])
        } catch (error) {
            console.error('Error loading visitas:', error)
        }
    }

    // Memoize week days calculation
    const weekDays = useMemo(() =>
        getNextDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), 7),
        [selectedDate]
    )

    // Memoize selected date events
    const selectedDateEvents = useMemo(() =>
        filterVisitasByDate(visitas, selectedDate),
        [visitas, selectedDate]
    )

    // Memoize week navigation handlers
    const goToPreviousWeek = useCallback(() => {
        setSelectedDate(prev => new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000))
    }, [])

    const goToNextWeek = useCallback(() => {
        setSelectedDate(prev => new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000))
    }, [])

    const goToToday = useCallback(() => {
        setSelectedDate(new Date())
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#254153] mx-auto mb-4"></div>
                    <p className="text-slate-600">Cargando agenda...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#254153] to-[#1a2f3d] text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Volver"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-2xl font-bold">Mi Agenda</h1>
                    </div>

                    <button
                        onClick={() => {/* TODO: Abrir modal crear evento */ }}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">Agregar evento</span>
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Calendar Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-md p-6 mb-6"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <CalendarIcon className="w-5 h-5 text-[#254153]" />
                        <h2 className="text-lg font-bold text-[#254153]">Calendario</h2>
                    </div>

                    {/* Simple Week Selector */}
                    <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
                        <button
                            onClick={goToPreviousWeek}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-sm sm:text-base text-slate-800 font-semibold"
                        >
                            ← <span className="hidden sm:inline">Semana anterior</span><span className="sm:hidden">Anterior</span>
                        </button>
                        <button
                            onClick={goToToday}
                            className="px-4 py-2 bg-[#254153] text-white hover:bg-[#1a2f3d] rounded-lg transition-colors text-sm sm:text-base"
                        >
                            Hoy
                        </button>
                        <button
                            onClick={goToNextWeek}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-sm sm:text-base text-slate-800 font-semibold"
                        >
                            <span className="hidden sm:inline">Semana siguiente</span><span className="sm:hidden">Siguiente</span> →
                        </button>
                    </div>

                    {/* Week View */}
                    <div className="grid grid-cols-7 gap-2">
                        {weekDays.map((day, index) => {
                            const eventCount = countVisitasByDate(visitas, day)
                            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                            const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')

                            return (
                                <button
                                    key={index}
                                    onClick={() => setSelectedDate(day)}
                                    className={`p-2 sm:p-3 rounded-lg border-2 transition-all ${isSelected
                                        ? 'border-[#254153] bg-[#254153] text-white'
                                        : isToday
                                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                                            : 'border-slate-300 bg-white hover:border-slate-400 text-slate-800 font-semibold'
                                        }`}
                                >
                                    <div className="text-xs font-bold mb-1">
                                        {format(day, 'EEE', { locale: es })}
                                    </div>
                                    <div className="text-xl sm:text-2xl font-bold mb-1">
                                        {format(day, 'd')}
                                    </div>
                                    {eventCount > 0 && (
                                        <div className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-[#254153]'}`}>
                                            {eventCount}
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </motion.div>

                {/* Events for Selected Date */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-md p-6"
                >
                    <h2 className="text-lg font-bold text-[#254153] mb-4">
                        {formatDateES(selectedDate, 'EEEE, d MMMM yyyy')}
                    </h2>

                    <div className="space-y-3">
                        {selectedDateEvents.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No hay eventos programados para este día</p>
                            </div>
                        ) : (
                            selectedDateEvents.map((visita) => (
                                <EventCard
                                    key={visita.id}
                                    visita={visita}
                                    onClick={() => {
                                        console.log('Ver detalles de visita:', visita.id)
                                    }}
                                />
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
