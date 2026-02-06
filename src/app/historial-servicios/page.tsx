'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { ArrowLeft, Search as SearchIcon, Calendar as CalendarIcon, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import ServiceHistoryCard from '@/components/historial/ServiceHistoryCard'

interface User {
    id: number
    display_name: string
    rol: string
    correo: string
}

interface Technician {
    id: number
    display_name: string
    rol: string
}

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

export default function HistorialServiciosPage() {
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [technicians, setTechnicians] = useState<Technician[]>([])
    const [services, setServices] = useState<ServiceVisit[]>([])
    const [loading, setLoading] = useState(true)

    // Filtros
    const [selectedTechnician, setSelectedTechnician] = useState<number | null>(null)
    const [serviceStatus, setServiceStatus] = useState<boolean>(true) // true = pendientes, false = terminados
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [searchText, setSearchText] = useState('')
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        console.log('🔵 Component mounted, loading user and technicians...')
        loadUserAndTechnicians()
    }, [])

    useEffect(() => {
        if (selectedTechnician) {
            console.log('🟢 Loading services for technician:', selectedTechnician)
            loadServices()
        }
    }, [selectedTechnician, serviceStatus])

    const loadUserAndTechnicians = async () => {
        console.log('🔵 Starting loadUserAndTechnicians...')
        setLoading(true)

        try {
            console.log('🔵 Getting session...')
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()

            if (sessionError) {
                console.error('❌ Session error:', sessionError)
                setLoading(false)
                router.push('/login')
                return
            }

            if (!session) {
                console.log('⚠️ No session found, redirecting to login...')
                setLoading(false)
                router.push('/login')
                return
            }

            console.log('✅ Session found, loading user data...')
            const { data: userData, error: userError } = await supabase
                .from('Usuarios')
                .select('id, display_name, rol, correo')
                .eq('correo', session.user.email)
                .single()

            if (userError) {
                console.error('❌ Error loading user data:', userError)
                setLoading(false)
                return
            }

            if (userData) {
                console.log('✅ User data loaded:', userData)
                setCurrentUser(userData)
                await loadTechnicians(userData)
            } else {
                console.error('❌ No user data found')
                setLoading(false)
            }
        } catch (error) {
            console.error('❌ Error in loadUserAndTechnicians:', error)
            setLoading(false)
        }
    }

    const loadTechnicians = async (user: User) => {
        console.log('🔵 Loading technicians for user:', user.rol)

        try {
            const technicianRoles = [
                'tecnico',
                'coordinador_tecnico',
                'asesor_tecnico',
                'promotor_tecnico',
                'promotor_tecnico_exhibiciones',
                'promotor_tecnico_comercial',
                'tecnico_externo'
            ]

            let query = supabase
                .from('Usuarios')
                .select('id, display_name, rol')
                .in('rol', technicianRoles)
                .order('display_name', { ascending: true })

            // Filtrar según rol del usuario
            if (user.rol === 'tecnico' || user.rol === 'tecnico_externo') {
                query = query.eq('id', user.id)
            } else if (user.rol === 'supervisor_externo') {
                query = query.eq('rol', 'tecnico_externo')
            }

            const { data, error } = await query

            if (error) {
                console.error('❌ Error loading technicians:', error)
                setLoading(false)
                return
            }

            if (data) {
                console.log('✅ Technicians loaded:', data.length, 'technicians')
                setTechnicians(data)
                // Auto-seleccionar si solo hay un técnico
                if (data.length === 1) {
                    console.log('🟢 Auto-selecting single technician:', data[0].display_name)
                    setSelectedTechnician(data[0].id)
                }
            }

            setLoading(false)
            console.log('✅ Loading complete!')
        } catch (error) {
            console.error('❌ Error in loadTechnicians:', error)
            setLoading(false)
        }
    }

    const loadServices = async () => {
        if (!selectedTechnician) return

        try {
            const { data, error } = await supabase
                .from('query_visita_servicio')
                .select('*')
                .eq('tecnico_id', selectedTechnician)
                .eq('personal', false)
                .eq('estado', serviceStatus)
                .eq('reagendado', false)
                .neq('nombre', 'Preagendado')
                .not('fecha_hora_inicio', 'is', null)
                .order('created_at', { ascending: false })
                .limit(100)

            if (error) throw error
            if (data) setServices(data as ServiceVisit[])
        } catch (error) {
            console.error('Error loading services:', error)
        }
    }

    // Filtrado de servicios
    const filteredServices = useMemo(() => {
        return services.filter(service => {
            // Filtro por fecha
            if (selectedDate) {
                const serviceDate = format(new Date(service.fecha_hora_inicio), 'yyyy-MM-dd')
                if (serviceDate !== selectedDate) return false
            }

            // Filtro por búsqueda
            if (searchQuery) {
                const query = searchQuery.toLowerCase()
                const matchesConsecutivo = service.consecutivo?.toLowerCase().includes(query)
                const matchesConsumidorCiudad = service.consumidor_ciudad?.toLowerCase().includes(query)
                const matchesUbicacionCiudad = service.ubicacion_ciudad?.toLowerCase().includes(query)

                if (!matchesConsecutivo && !matchesConsumidorCiudad && !matchesUbicacionCiudad) {
                    return false
                }
            }

            return true
        })
    }, [services, selectedDate, searchQuery])

    const handleSearch = () => {
        setSearchQuery(searchText)
    }

    const handleClearFilters = () => {
        setSelectedDate('')
        setSearchText('')
        setSearchQuery('')
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#254153] mx-auto mb-4"></div>
                    <p className="text-slate-600">Cargando historial...</p>
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
                        <h1 className="text-2xl font-bold">Historial de servicios</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Filtros */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-md p-6 mb-6"
                >
                    <div className="flex flex-wrap gap-4">
                        {/* Selector de Técnico */}
                        <div className="flex-1 min-w-[250px]">
                            <label className="block text-sm font-semibold text-[#254153] mb-2">
                                Técnico:
                            </label>
                            <select
                                value={selectedTechnician || ''}
                                onChange={(e) => setSelectedTechnician(Number(e.target.value))}
                                className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 focus:border-[#254153] focus:ring-2 focus:ring-[#254153]/20 outline-none transition-all text-slate-900 font-semibold"
                            >
                                <option value="">Seleccione el técnico...</option>
                                {technicians.map((tech) => (
                                    <option key={tech.id} value={tech.id}>
                                        {tech.display_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Estado del servicio */}
                        <div className="w-[200px]">
                            <label className="block text-sm font-semibold text-[#254153] mb-2">
                                Estado del servicio
                            </label>
                            <select
                                value={serviceStatus ? 'true' : 'false'}
                                onChange={(e) => setServiceStatus(e.target.value === 'true')}
                                className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 focus:border-[#254153] focus:ring-2 focus:ring-[#254153]/20 outline-none transition-all text-slate-900 font-semibold"
                            >
                                <option value="true">Pendientes</option>
                                <option value="false">Terminados</option>
                            </select>
                        </div>

                        {/* Fecha del servicio */}
                        <div className="w-[180px]">
                            <label className="block text-sm font-semibold text-[#254153] mb-2">
                                Fecha del servicio
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 focus:border-[#254153] focus:ring-2 focus:ring-[#254153]/20 outline-none transition-all text-slate-900 font-semibold"
                            />
                        </div>

                        {/* Búsqueda avanzada */}
                        <div className="flex-1 min-w-[300px]">
                            <label className="block text-sm font-semibold text-[#254153] mb-2">
                                Búsqueda avanzada
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="Ingrese texto a buscar..."
                                    className="flex-1 px-4 py-2.5 rounded-lg border-2 border-slate-200 focus:border-[#254153] focus:ring-2 focus:ring-[#254153]/20 outline-none transition-all text-slate-900 font-semibold"
                                />
                                <button
                                    onClick={handleSearch}
                                    className="p-2.5 bg-[#254153] text-white rounded-lg hover:bg-[#1a2f3d] transition-colors"
                                    aria-label="Buscar"
                                >
                                    <SearchIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleClearFilters}
                                    className="p-2.5 bg-slate-100 text-[#254153] rounded-lg hover:bg-slate-200 transition-colors"
                                    aria-label="Limpiar filtros"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Lista de Servicios */}
                {selectedTechnician ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl shadow-md p-6"
                    >
                        <div className="mb-4">
                            <p className="text-sm text-slate-600">
                                <span className="font-semibold text-[#254153]">Servicios: </span>
                                <span className="font-bold">{filteredServices.length}</span>
                            </p>
                        </div>

                        <div className="space-y-4">
                            {filteredServices.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>No se encontraron servicios con los filtros seleccionados</p>
                                </div>
                            ) : (
                                filteredServices.map((service) => (
                                    <ServiceHistoryCard
                                        key={service.id}
                                        service={service}
                                    />
                                ))
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <div className="bg-white rounded-xl shadow-md p-12 text-center">
                        <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                        <p className="text-slate-600 text-lg">
                            Seleccione un técnico para ver el historial de servicios
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
