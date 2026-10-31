'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Users, Check, ChevronDown, User as UserIcon, Calendar as CalendarIcon } from 'lucide-react'
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

// --- Componentes Reutilizables ---
function PremiumTechSelector({ options, selectedId, onChange }: { options: any[], selectedId: string | number | null, onChange: (id: any) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(o => o.id === selectedId);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm(''); // Clear search when closed
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (option.rol && option.rol.replace(/_/g, ' ').toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="relative w-full sm:w-[350px]" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white/80 backdrop-blur-md border border-white/40 rounded-[2rem] p-3 flex items-center justify-between shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group"
            >
                {selectedOption ? (
                    <div className="flex items-center gap-3">
                        {selectedOption.url_foto ? (
                            <img src={selectedOption.url_foto} alt={selectedOption.display_name} className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-white" />
                        ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center ring-2 ring-white">
                                <UserIcon className="w-5 h-5 text-slate-400" />
                            </div>
                        )}
                        <div className="text-left">
                            <p className="text-[13px] font-black text-slate-800 leading-none mb-1">{selectedOption.label}</p>
                            <p className="text-[9px] font-bold text-[#254153] uppercase tracking-[0.15em] opacity-80">{selectedOption.rol?.replace(/_/g, ' ')}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-10 h-10 bg-brand/10 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-brand" />
                        </div>
                        <span className="text-slate-600 font-bold text-sm">Selecciona un técnico...</span>
                    </div>
                )}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-[#254153] text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-xl rounded-3xl border border-white/50 shadow-[0_20px_40px_rgb(0,0,0,0.1)] overflow-hidden"
                    >
                        <div className="p-3 border-b border-slate-100 bg-white/50">
                            <input
                                type="text"
                                placeholder="Buscar técnico..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#254153]/20 focus:border-[#254153]/30 transition-all placeholder:text-slate-400"
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                            />
                        </div>
                        <div className="max-h-[300px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {filteredOptions.length > 0 ? filteredOptions.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => { onChange(option.id); setIsOpen(false); setSearchTerm(''); }}
                                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${selectedId === option.id ? 'bg-[#254153] text-white shadow-md' : 'hover:bg-slate-50 border border-transparent'}`}
                                >
                                    {option.url_foto ? (
                                        <img src={option.url_foto} alt={option.display_name} className="w-10 h-10 rounded-full object-cover shadow-sm bg-white" />
                                    ) : (
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedId === option.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                                            <UserIcon className={`w-5 h-5 ${selectedId === option.id ? 'text-white' : 'text-slate-400'}`} />
                                        </div>
                                    )}
                                    <div className="flex-1 text-left">
                                        <p className={`text-sm font-black leading-tight ${selectedId === option.id ? 'text-white' : 'text-slate-700'}`}>
                                            {option.label}
                                        </p>
                                        <p className={`text-[9px] font-bold uppercase tracking-[0.15em] mt-1 ${selectedId === option.id ? 'text-white/70' : 'text-slate-400'}`}>
                                            {option.rol?.replace(/_/g, ' ')}
                                        </p>
                                    </div>
                                    {selectedId === option.id && (
                                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                                            <Check className="w-3 h-3 text-[#254153]" />
                                        </div>
                                    )}
                                </button>
                            )) : (
                                <div className="text-center py-8 text-slate-400 text-sm font-medium">
                                    No se encontraron técnicos
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// --- Componente Principal ---
export default function AgendaTecnicosPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [loadingVisitas, setLoadingVisitas] = useState(false)
    const [technicians, setTechnicians] = useState<any[]>([])
    const [selectedTechId, setSelectedTechId] = useState<number | null>(null)
    const [visitas, setVisitas] = useState<Visita[]>([])
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())

    useEffect(() => {
        loadTechnicians()
    }, [])

    useEffect(() => {
        if (selectedTechId) {
            loadVisitas(selectedTechId)
        } else {
            setVisitas([])
        }
    }, [selectedTechId, selectedDate])

    const loadTechnicians = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }

            const { data: techData, error } = await supabase
                .from('Usuarios')
                .select('id, display_name, cedula, rol, url_foto')
                .in('rol', ['tecnico', 'tecnico_externo', 'promotor_tecnico', 'promotor_tecnico_comercial', 'promotor_tecnico_exhibiciones'])
                .order('display_name', { ascending: true })

            if (error) throw error

            if (techData) {
                setTechnicians(techData)
            }
        } catch (error) {
            console.error('Error loading technicians:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadVisitas = async (userId: number) => {
        setLoadingVisitas(true)
        try {
            const startDate = subDays(selectedDate, 30)
            const endDate = addDays(selectedDate, 30)

            const { data, error } = await supabase
                .from('Visitas')
                .select('id, nombre, fecha_hora_inicio, fecha_hora_fin, recurrente, dia_recurrente, personal, reagendado, ocurriendo, entrega_parcial, tecnico_id, servicio_id, estado')
                .eq('tecnico_id', userId)
                .neq('nombre', 'Preagendado')
                .or(`fecha_hora_inicio.gte.${startDate.toISOString()},recurrente.eq.true`)
                .lte('fecha_hora_inicio', endDate.toISOString())
                .order('fecha_hora_inicio', { ascending: true })
                .limit(100)

            if (error) throw error
            if (data) setVisitas(data as Visita[])
        } catch (error) {
            console.error('Error loading visitas:', error)
        } finally {
            setLoadingVisitas(false)
        }
    }

    // Calcular las semanas dinámicamente
    const weekDays = useMemo(() =>
        getNextDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), 14), // Mostrar dos semanas para navegar fluido
        [selectedDate]
    )

    const selectedDateEvents = useMemo(() =>
        filterVisitasByDate(visitas, selectedDate),
        [visitas, selectedDate]
    )

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <div className="w-12 h-12 border-4 border-[#254153]/20 border-t-[#254153] rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            {/* 1. Header Integrado con Glassmorphism */}
            <div className="sticky top-0 z-40 bg-[#F8FAFC]/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 py-4 lg:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="w-10 h-10 bg-white rounded-full shadow-sm border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:scale-105 transition-all text-slate-600"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-[#254153] tracking-tight leading-none">Agenda Técnicos</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Visión General</p>
                        </div>
                    </div>

                    <PremiumTechSelector
                        options={technicians.map(t => ({
                            id: t.id,
                            label: t.display_name,
                            url_foto: t.url_foto,
                            display_name: t.display_name,
                            rol: t.rol
                        }))}
                        selectedId={selectedTechId}
                        onChange={(id) => setSelectedTechId(id)}
                    />
                </div>

                {/* 2. Selector de Días Minimalista (Horizontal) */}
                {selectedTechId && (
                    <div className="max-w-5xl mx-auto px-4 pb-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-black text-slate-800 tracking-tight capitalize">
                                {formatDateES(selectedDate, 'MMMM yyyy')}
                            </h2>
                            <button
                                onClick={() => setSelectedDate(new Date())}
                                className="text-[10px] font-black text-brand uppercase tracking-wider hover:bg-brand/10 px-3 py-1.5 rounded-full transition-colors"
                            >
                                Ir a Hoy
                            </button>
                        </div>
                        
                        <div className="flex gap-2 overflow-x-auto pb-4 pt-1 px-1 custom-scrollbar -mx-4 sm:mx-0 sm:px-0">
                            {weekDays.map((day, index) => {
                                const eventCount = countVisitasByDate(visitas, day)
                                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                                const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')

                                return (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedDate(day)}
                                        className={`flex-shrink-0 flex flex-col items-center justify-center w-[60px] h-[80px] rounded-full transition-all relative
                                            ${isSelected 
                                                ? 'bg-[#254153] text-white shadow-[0_8px_16px_rgba(37,65,83,0.3)] scale-105' 
                                                : isToday
                                                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isSelected ? 'opacity-80' : 'text-slate-400'}`}>
                                            {format(day, 'EEE', { locale: es }).substring(0, 3)}
                                        </span>
                                        <span className={`text-xl font-black leading-none ${isToday && !isSelected ? 'text-emerald-600' : ''}`}>
                                            {format(day, 'd')}
                                        </span>
                                        
                                        {/* Indicador de eventos sutil */}
                                        {eventCount > 0 && (
                                            <div className="absolute bottom-3 flex gap-0.5">
                                                {Array.from({ length: Math.min(eventCount, 3) }).map((_, i) => (
                                                    <div key={i} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-brand'}`} />
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* 3. Línea de Tiempo de Eventos */}
            <div className="max-w-5xl mx-auto px-4 mt-8">
                {!selectedTechId ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-24 text-center max-w-sm mx-auto"
                    >
                        <div className="w-24 h-24 bg-white shadow-sm border border-slate-100 rounded-[2rem] rotate-12 flex items-center justify-center mx-auto mb-8">
                            <Users className="w-10 h-10 text-slate-300 -rotate-12" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-3">Agenda Vacía</h3>
                        <p className="text-slate-500 font-medium text-sm">Usa el selector superior para elegir a un miembro del equipo y explorar su disponibilidad.</p>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={selectedDate.toISOString()}
                        className="max-w-3xl"
                    >
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-8 h-8 bg-brand/10 rounded-full flex items-center justify-center">
                                <CalendarIcon className="w-4 h-4 text-brand" />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight capitalize">
                                {formatDateES(selectedDate, 'EEEE, d MMMM yyyy')}
                            </h2>
                        </div>

                        {loadingVisitas ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-10 h-10 border-4 border-slate-200 border-t-brand rounded-full animate-spin" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando agenda...</p>
                            </div>
                        ) : selectedDateEvents.length === 0 ? (
                            <div className="ml-4 pl-8 py-10 border-l-2 border-dashed border-slate-200 relative">
                                <div className="absolute left-[-9px] top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-100 border-2 border-slate-300 rounded-full" />
                                <h3 className="text-slate-400 font-bold text-lg mb-1">Día Libre</h3>
                                <p className="text-slate-400 text-sm font-medium">No hay servicios programados para esta fecha.</p>
                            </div>
                        ) : (
                            <div className="ml-4 pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-8 py-4">
                                {selectedDateEvents.map((visita, idx) => (
                                    <div className="relative" key={idx}>
                                        {/* Timeline Dot */}
                                        <div className={`absolute -left-[35px] sm:-left-[43px] top-6 w-4 h-4 rounded-full border-4 shadow-sm ${
                                            visita.estado 
                                                ? 'bg-white border-brand' 
                                                : 'bg-slate-100 border-slate-300'
                                        }`} />
                                        
                                        <EventCard
                                            visita={visita}
                                            onClick={() => {
                                                if (visita.servicio_id) {
                                                    router.push(`/ver-servicio/${visita.servicio_id}`);
                                                }
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    )
}
