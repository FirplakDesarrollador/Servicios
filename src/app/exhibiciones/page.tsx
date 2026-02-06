'use client'

import { useEffect, useState, useMemo } from 'react'
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

    // Load user data and salas
    useEffect(() => {
        async function loadData() {
            console.log('[Exhibiciones] Starting data load...')
            setLoading(true)

            try {
                // Get session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession()
                console.log('[Exhibiciones] Session check:', { hasSession: !!session, error: sessionError })

                if (!session) {
                    console.log('[Exhibiciones] No session, redirecting to login')
                    router.push('/login')
                    return
                }

                // Get user profile
                console.log('[Exhibiciones] Fetching profile for uid:', session.user.id)
                const { data: profile, error: profileError } = await supabase
                    .from('Usuarios')
                    .select('id, rol, id_colaboradores')
                    .eq('uid', session.user.id)
                    .maybeSingle()

                console.log('[Exhibiciones] Profile query result:', { profile, error: profileError })

                if (profileError) {
                    console.error('[Exhibiciones] Profile error details:', {
                        message: profileError.message,
                        details: profileError.details,
                        hint: profileError.hint,
                        code: profileError.code
                    })
                    setLoading(false)
                    return
                }

                if (!profile) {
                    console.error('[Exhibiciones] No profile found for user')
                    setLoading(false)
                    return
                }

                console.log('[Exhibiciones] Profile loaded successfully:', { id: profile.id, rol: profile.rol })
                setUserId(profile.id)
                setUserRole(profile.rol)
                setUserColaboradores(profile.id_colaboradores || [])

                // Load salas
                console.log('[Exhibiciones] Loading salas with filters:', { activo: estadoActivo, userId: profile.id, rol: profile.rol })

                let query = supabase
                    .from('query_ubicaciones')
                    .select('*')
                    .eq('activo', estadoActivo)

                // Role-based filtering
                const rolesLimitados = ['comercial', 'promotor', 'asesor_tecnico']
                if (rolesLimitados.includes(profile.rol)) {
                    const asesorIds = [profile.id, ...(profile.id_colaboradores || [])]
                    console.log('[Exhibiciones] Applying role-based filter for asesor_id:', asesorIds)
                    query = query.in('asesor_id', asesorIds)
                }

                const { data: salasData, error: salasError } = await query

                if (salasError) {
                    console.error('[Exhibiciones] Error loading salas:', {
                        message: salasError.message,
                        details: salasError.details,
                        hint: salasError.hint,
                        code: salasError.code
                    })
                    setLoading(false)
                    return
                }

                console.log('[Exhibiciones] Salas loaded:', salasData?.length || 0)
                if (salasData && salasData.length > 0) {
                    console.log('[Exhibiciones] First sala sample:', salasData[0])
                }
                setSalas(salasData || [])

                // Load asesores if needed
                const rolesConFiltroAsesor = ['desarrollador', 'mac', 'coordinador_comercial', 'director_comercial', 'gerente']
                if (rolesConFiltroAsesor.includes(profile.rol)) {
                    const { data: asesoresData } = await supabase
                        .from('Usuarios')
                        .select('id, display_name')
                        .in('rol', ['comercial', 'mac', 'coordinador_comercial', 'director_comercial', 'ecommerce'])
                        .order('display_name', { ascending: true })

                    if (asesoresData) {
                        setAsesores(asesoresData)
                    }
                }

            } catch (error) {
                console.error('[Exhibiciones] Unexpected error:', error)
            } finally {
                console.log('[Exhibiciones] Setting loading to false')
                setLoading(false)
            }
        }

        loadData()
    }, [estadoActivo])

    // Filter salas
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
    }, [salas, busqueda, asesorId, mantenimiento])

    const handleClearFilters = () => {
        setEstadoActivo(true)
        setBusqueda('')
        setAsesorId(null)
        setMantenimiento('')
    }

    const handleRefresh = () => {
        window.location.reload()
    }

    const rolesConFiltroAsesor = ['desarrollador', 'mac', 'coordinador_comercial', 'director_comercial', 'gerente']

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#254153] to-[#1a2f3d] text-white shadow-lg">
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
                            <label className="block text-xs font-medium text-[#254153] mb-1">
                                Estado del cliente
                            </label>
                            <select
                                value={estadoActivo ? 'true' : 'false'}
                                onChange={(e) => setEstadoActivo(e.target.value === 'true')}
                                className="w-36 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#254153] focus:border-[#254153]"
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

                        {/* Filtro por asesor */}
                        {rolesConFiltroAsesor.includes(userRole) && (
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
                            className="p-2 text-[#254153] hover:bg-blue-50 rounded-lg transition-colors"
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
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#254153]"></div>
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
