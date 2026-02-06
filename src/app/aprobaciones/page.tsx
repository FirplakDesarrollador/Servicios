'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { ArrowLeft, Search, Calendar, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import ApprovalServiceCard from '@/components/aprobaciones/ApprovalServiceCard'

type ApprovalType = 'Director comercial' | 'Servicio al cliente' | 'Logistica'
type ApprovalStatus = 'Pendiente' | 'Aprobado' | 'Rechazado'
type ServiceStatus = 'Abiertos' | 'Cerrados' | 'Todos'

interface ApprovalData {
    estado: ApprovalStatus | 'No_aplica'
}

interface Service {
    id: number
    consecutivo: string
    numero_de_pedido: string | null
    tipo_de_servicio: string | null
    canal_de_venta: string | null
    estado: boolean
    created_at: string
    asesor_mac_id: number | null
    aprobacion_director: ApprovalData
    aprobacion_mac: ApprovalData
    aprobacion_logistica: ApprovalData
}

interface User {
    id: number
    display_name: string
    rol: string
    correo: string
}

export default function AprobacionesPage() {
    const router = useRouter()

    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [services, setServices] = useState<Service[]>([])
    const [macUsers, setMacUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [approvalType, setApprovalType] = useState<ApprovalType>('Director comercial')
    const [searchTerm, setSearchTerm] = useState('')
    const [serviceStatus, setServiceStatus] = useState<ServiceStatus>('Todos')
    const [selectedMac, setSelectedMac] = useState<number | null>(null)
    const [dateFrom, setDateFrom] = useState<string>('')
    const [dateTo, setDateTo] = useState<string>('')

    // Active tab
    const [activeTab, setActiveTab] = useState<ApprovalStatus>('Pendiente')

    useEffect(() => {
        loadUserAndData()
    }, [])

    const loadUserAndData = async () => {
        try {
            // Get current user
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }

            const { data: userData } = await supabase
                .from('Usuarios')
                .select('*')
                .eq('correo', session.user.email)
                .single()

            if (userData) {
                setCurrentUser(userData)

                // Set default approval type based on role
                if (userData.rol === 'director_comercial') {
                    setApprovalType('Director comercial')
                } else if (userData.rol === 'mac') {
                    setApprovalType('Servicio al cliente')
                } else if (userData.rol === 'auxiliar_novedades') {
                    setApprovalType('Logistica')
                }
            }

            // Load MAC users
            const { data: macData } = await supabase
                .from('Usuarios')
                .select('*')
                .eq('rol', 'mac')

            if (macData) {
                setMacUsers(macData)
            }

            // Load services
            await loadServices()
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadServices = async () => {
        try {
            const { data, error } = await supabase
                .from('Servicios')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            if (data) setServices(data)
        } catch (error) {
            console.error('Error loading services:', error)
        }
    }

    const getApprovalStatus = (service: Service): ApprovalStatus | 'No_aplica' => {
        switch (approvalType) {
            case 'Director comercial':
                return service.aprobacion_director?.estado || 'No_aplica'
            case 'Servicio al cliente':
                return service.aprobacion_mac?.estado || 'No_aplica'
            case 'Logistica':
                return service.aprobacion_logistica?.estado || 'No_aplica'
            default:
                return 'No_aplica'
        }
    }

    const filterServices = (status: ApprovalStatus) => {
        return services.filter(service => {
            // Filter by search term
            if (searchTerm && !service.consecutivo?.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false
            }

            // Filter by approval status
            if (getApprovalStatus(service) !== status) {
                return false
            }

            // Filter by service status (open/closed)
            if (serviceStatus === 'Abiertos' && !service.estado) return false
            if (serviceStatus === 'Cerrados' && service.estado) return false

            // Filter by MAC user
            if (selectedMac && service.asesor_mac_id !== selectedMac) {
                return false
            }

            // Filter by date range
            if (dateFrom && dateTo) {
                const serviceDate = new Date(service.created_at)
                const from = new Date(dateFrom)
                const to = new Date(dateTo)
                if (serviceDate < from || serviceDate > to) {
                    return false
                }
            }

            // Director comercial only sees open services
            if (currentUser?.rol === 'director_comercial' && !service.estado) {
                return false
            }

            return true
        })
    }

    const clearDates = () => {
        setDateFrom('')
        setDateTo('')
    }

    const isMacOrDev = currentUser?.rol === 'mac' || currentUser?.correo === 'analista2.desarrollo@firplak.com'

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#254153] to-[#1a2f3d] text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={() => router.push('/')}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold">Aprobaciones</h1>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Filters */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-md p-6 mb-6"
                >
                    <div className="flex flex-wrap gap-4">
                        {/* Approval Type */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium text-[#254153] mb-2">
                                Aprobación
                            </label>
                            <select
                                value={approvalType}
                                onChange={(e) => setApprovalType(e.target.value as ApprovalType)}
                                className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 focus:border-[#254153] focus:ring-2 focus:ring-[#254153]/20 outline-none transition-all text-slate-900 font-semibold"
                            >
                                <option value="Director comercial">Director comercial</option>
                                <option value="Servicio al cliente">Servicio al cliente</option>
                                <option value="Logistica">Logistica</option>
                            </select>
                        </div>

                        {/* Search */}
                        <div className="flex-1 min-w-[220px]">
                            <label className="block text-sm font-medium text-[#254153] mb-2">
                                Buscar por consecutivo:
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Consecutivo..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 border-slate-200 focus:border-[#254153] focus:ring-2 focus:ring-[#254153]/20 outline-none transition-all text-slate-900 font-bold placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        {/* Service Status - Only for MAC */}
                        {currentUser?.rol === 'mac' && (
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-[#254153] mb-2">
                                    Estado
                                </label>
                                <select
                                    value={serviceStatus}
                                    onChange={(e) => setServiceStatus(e.target.value as ServiceStatus)}
                                    className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 focus:border-[#254153] focus:ring-2 focus:ring-[#254153]/20 outline-none transition-all text-slate-900 font-semibold"
                                >
                                    <option value="Abiertos">Abiertos</option>
                                    <option value="Cerrados">Cerrados</option>
                                    <option value="Todos">Todos</option>
                                </select>
                            </div>
                        )}

                        {/* MAC User Selector - Only for MAC or Developer */}
                        {isMacOrDev && (
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-[#254153] mb-2">
                                    Asesor MAC
                                </label>
                                <select
                                    value={selectedMac || ''}
                                    onChange={(e) => setSelectedMac(e.target.value ? Number(e.target.value) : null)}
                                    className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 focus:border-[#254153] focus:ring-2 focus:ring-[#254153]/20 outline-none transition-all text-slate-900 font-semibold"
                                >
                                    <option value="">Seleccione</option>
                                    {macUsers.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.display_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Date Filters - Only for MAC */}
                        {currentUser?.rol === 'mac' && (
                            <>
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-sm font-medium text-[#254153] mb-2">
                                        Desde
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => setDateFrom(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 border-slate-200 focus:border-[#254153] focus:ring-2 focus:ring-[#254153]/20 outline-none transition-all text-slate-900 font-semibold"
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-sm font-medium text-[#254153] mb-2">
                                        Hasta
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) => setDateTo(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 border-slate-200 focus:border-[#254153] focus:ring-2 focus:ring-[#254153]/20 outline-none transition-all text-slate-900 font-semibold"
                                        />
                                    </div>
                                </div>

                                {(dateFrom || dateTo) && (
                                    <div className="flex items-end">
                                        <button
                                            onClick={clearDates}
                                            className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <X className="w-5 h-5" />
                                            Limpiar fechas
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="border-b border-slate-200">
                        <div className="flex">
                            {(['Pendiente', 'Aprobado', 'Rechazado'] as ApprovalStatus[]).map((tab) => {
                                const count = filterServices(tab).length
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`flex-1 px-6 py-4 font-medium transition-all relative ${activeTab === tab
                                            ? 'text-[#254153] bg-slate-50'
                                            : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        {tab}s ({count})
                                        {activeTab === tab && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute bottom-0 left-0 right-0 h-1 bg-[#254153]"
                                            />
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        <div className="mb-4">
                            <p className="text-sm">
                                <span className="font-bold text-[#254153]">Servicios encontrados: </span>
                                <span className="text-emerald-600 font-semibold">
                                    {filterServices(activeTab).length}
                                </span>
                            </p>
                        </div>

                        <div className="space-y-3">
                            {filterServices(activeTab).length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    No se encontraron servicios {activeTab.toLowerCase()}s
                                </div>
                            ) : (
                                filterServices(activeTab).map((service) => (
                                    <ApprovalServiceCard
                                        key={service.id}
                                        service={service}
                                        currentUserRole={currentUser?.rol || ''}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
