'use client'


import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, RefreshCw, Eraser } from 'lucide-react'
import SalaCard from '@/components/exhibiciones/SalaCard'
import { QueryUbicacionesRow } from '@/types/supabase'

interface Usuario {
    id: number
    display_name: string
}

export default function ExhibicionesPage() {
    const router = useRouter()
    const isMountedRef = useRef(true)

    const [loading, setLoading] = useState(true)
    const [salas, setSalas] = useState<QueryUbicacionesRow[]>([])
    const [asesores, setAsesores] = useState<Usuario[]>([])

    // User info
    const [userId, setUserId] = useState<number | null>(null)
    const [userRole, setUserRole] = useState<string>('')
    const [userColaboradores, setUserColaboradores] = useState<number[]>([])

    // Filters
    const [estadoActivo, setEstadoActivo] = useState<boolean>(true)
    const [busqueda, setBusqueda] = useState('')
    const [asesorId, setAsesorId] = useState<number | null>(null)
    const [mantenimiento, setMantenimiento] = useState<string>('')

    // Clear browser cache on mount to prevent stale loading states
    useEffect(() => {
        if (typeof window !== 'undefined' && 'caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    if (name.includes('next')) {
                        caches.delete(name)
                    }
                })
            }).catch(err => console.log('Cache clear error:', err))
        }
    }, [])

    // Load user data
    useEffect(() => {
        isMountedRef.current = true

        async function loadProfile() {
            if (!isMountedRef.current) return
            try {
                const { data: { session } } = await supabase.auth.getSession()
                if (!session) {
                    router.push('/login')
                    return
                }

                const { data: profile, error: profileError } = await supabase
                    .from('Usuarios')
                    .select('id, rol, id_colaboradores')
                    .eq('user_id', session.user.id)
                    .maybeSingle()

                if (profileError || !profile) {
                    console.error('[Exhibiciones] Profile error:', profileError)
                    return
                }

                if (isMountedRef.current) {
                    setUserId(profile.id)
                    setUserRole(profile.rol)
                    setUserColaboradores(profile.id_colaboradores || [])
                }
                
                // Always load all advisors for everyone once
                const { data: asesoresData } = await supabase
                    .from('Usuarios')
                    .select('id, display_name')
                    .in('rol', ['comercial', 'mac', 'coordinador_comercial', 'director_comercial', 'ecommerce'])
                    .order('display_name', { ascending: true })

                if (asesoresData && isMountedRef.current) {
                    setAsesores(asesoresData)
                }

            } catch (error) {
                console.error('[Exhibiciones] Unexpected profile error:', error)
            }
        }

        loadProfile()

        return () => {
            isMountedRef.current = false
        }
    }, [router])

    // Load salas when user or estadoActivo changes
    useEffect(() => {
        if (!userId || !userRole) return

        let isActive = true
        async function loadSalas() {
            setLoading(true)
            try {
                let query = supabase
                    .from('query_ubicaciones')
                    .select('*')
                    .eq('activo', estadoActivo)
                    .in('cliente_tipo', ['Distribuidor', 'Propio'])

                if (['comercial', 'promotor', 'asesor_tecnico'].includes(userRole)) {
                    const validIds = [userId!, ...(userColaboradores || [])]
                    query = query.in('asesor_id', validIds)
                }

                const { data: salasData, error: salasError } = await query.limit(3000)

                if (salasError) {
                    console.error('[Exhibiciones] Error loading salas:', salasError)
                    if (isActive) setLoading(false)
                    return
                }

                if (isActive) {
                    setSalas(salasData || [])
                }
            } catch (error) {
                console.error('[Exhibiciones] Unexpected salas error:', error)
            } finally {
                if (isActive) setLoading(false)
            }
        }

        loadSalas()

        return () => {
            isActive = false
        }
    }, [userId, userRole, userColaboradores, estadoActivo])

    // Filter salas (now includes estadoActivo filter)
    const filteredSalas = useMemo(() => {
        return salas.filter(sala => {

            // Búsqueda avanzada
            if (busqueda) {
                const searchLower = busqueda.toLowerCase()
                const matches = [
                    sala.nombre,
                    sala.cliente_nombre,
                    sala.direccion,
                    sala.nombre_contacto,
                    sala.ciudad,
                    sala.departamento,
                    sala.zona,
                    sala.coordinador_nombre,
                    sala.nit,
                    sala.cliente_nit
                ].some(field => field?.toLowerCase().includes(searchLower))

                if (!matches) return false
            }

            // Filtro por asesor
            if (asesorId && sala.asesor_id !== asesorId) {
                return false
            }

            // Filtro por mantenimiento
            if (mantenimiento) {
                const fechaCierre = sala.ultimo_mantenimiento_fecha_cierre

                if (mantenimiento === 'No registra') {
                    if (fechaCierre) return false
                } else if (mantenimiento.startsWith('Mas de')) {
                    if (!fechaCierre) return false

                    const meses = parseInt(mantenimiento.split(' ')[2])
                    const fechaLimite = new Date()
                    fechaLimite.setMonth(fechaLimite.getMonth() - meses)

                    if (new Date(fechaCierre) > fechaLimite) return false
                }
            }

            return true
        })
    }, [salas, estadoActivo, busqueda, asesorId, mantenimiento])

    const handleClearFilters = () => {
        setEstadoActivo(true)
        setBusqueda('')
        setAsesorId(null)
        setMantenimiento('')
    }

    const handleRefresh = () => {
        window.location.reload()
    }

    const rolesConFiltroAsesor = ['everyone'] // Dummy value


    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand/5 to-slate-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-brand to-brand-dark text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push('/')}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <h1 className="text-2xl font-semibold">Clientes y almacenes</h1>
                        </div>
                        <button
                            onClick={handleRefresh}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="flex flex-wrap gap-4 items-end">
                        {/* Estado */}
                        <div className="flex-shrink-0">
                            <label className="block text-xs font-medium text-brand mb-1">
                                Estado del cliente
                            </label>
                            <select
                                value={estadoActivo ? 'true' : 'false'}
                                onChange={(e) => setEstadoActivo(e.target.value === 'true')}
                                className="w-36 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand"
                            >
                                <option value="true">Activo</option>
                                <option value="false">Inactivo</option>
                            </select>
                        </div>

                        {/* Búsqueda */}
                        <div className="flex-grow min-w-[200px]">
                            <label className="block text-xs font-medium text-[#254153] mb-1">
                                Búsqueda avanzada
                            </label>
                            <input
                                type="text"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Ingrese texto a buscar..."
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#254153] focus:border-[#254153]"
                            />
                        </div>

                        {/* Filtro por asesor - Now for everyone */}
                        {true && (

                            <div className="flex-shrink-0">
                                <label className="block text-xs font-medium text-[#254153] mb-1">
                                    Filtrar por asesor
                                </label>
                                <select
                                    value={asesorId || ''}
                                    onChange={(e) => setAsesorId(e.target.value ? parseInt(e.target.value) : null)}
                                    className="w-56 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#254153] focus:border-[#254153]"
                                >
                                    <option value="">Todos los asesores...</option>
                                    {asesores.map(asesor => (
                                        <option key={asesor.id} value={asesor.id}>
                                            {asesor.display_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Último mantenimiento */}
                        <div className="flex-shrink-0">
                            <label className="block text-xs font-medium text-[#254153] mb-1">
                                Último mantenimiento
                            </label>
                            <select
                                value={mantenimiento}
                                onChange={(e) => setMantenimiento(e.target.value)}
                                className="w-56 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#254153] focus:border-[#254153]"
                            >
                                <option value="">Todos...</option>
                                <option value="No registra">No registra</option>
                                <option value="Mas de 2 meses">Más de 2 meses</option>
                                <option value="Mas de 3 meses">Más de 3 meses</option>
                                <option value="Mas de 4 meses">Más de 4 meses</option>
                                <option value="Mas de 5 meses">Más de 5 meses</option>
                            </select>
                        </div>

                        {/* Clear button */}
                        <button
                            onClick={handleClearFilters}
                            className="p-2 text-brand hover:bg-brand/5 rounded-lg transition-colors"
                            title="Limpiar filtros"
                        >
                            <Eraser className="w-8 h-8" />
                        </button>
                    </div>
                </div>

                {/* Results count */}
                <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-gray-700">
                        <span className="font-medium text-[#254153]">Salas encontradas: </span>
                        <span className="text-sm">{filteredSalas.length}</span>
                    </p>
                    {busqueda && (
                        <p className="text-sm text-red-600">
                            búsqueda aplicada: &quot;{busqueda}&quot;
                        </p>
                    )}
                </div>

                {/* Loading */}
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
                    </div>
                ) : (
                    /* Salas list */
                    <div className="space-y-3">
                        {filteredSalas.length === 0 ? (
                            <div className="text-center py-20 text-gray-500">
                                No se encontraron salas con los filtros aplicados
                            </div>
                        ) : (
                            filteredSalas.map(sala => (
                                <div
                                    key={sala.id}
                                    onClick={() => router.push(`/sala-details?id=${sala.id}&from=exhibiciones`)}
                                    className="cursor-pointer"
                                >
                                    <SalaCard sala={sala} />
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
