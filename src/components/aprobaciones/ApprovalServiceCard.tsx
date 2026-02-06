'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ApprovalData {
    estado: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'No_aplica'
}

interface Service {
    id: number
    consecutivo: string
    numero_de_pedido: string | null
    tipo_de_servicio: string | null
    canal_de_venta: string | null
    created_at: string
    asesor_mac_id: number | null
    aprobacion_director: ApprovalData
    aprobacion_mac: ApprovalData
    aprobacion_logistica: ApprovalData
}

interface User {
    id: number
    display_name: string
}

interface Props {
    service: Service
    currentUserRole: string
}

export default function ApprovalServiceCard({ service, currentUserRole }: Props) {
    const router = useRouter()
    const [macUser, setMacUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadMacUser()
    }, [service.asesor_mac_id])

    const loadMacUser = async () => {
        if (!service.asesor_mac_id) {
            setLoading(false)
            return
        }

        try {
            const { data } = await supabase
                .from('Usuarios')
                .select('id, display_name')
                .eq('id', service.asesor_mac_id)
                .single()

            if (data) {
                setMacUser(data)
            }
        } catch (error) {
            console.error('Error loading MAC user:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pendiente':
                return 'text-yellow-600 bg-yellow-50 border-yellow-200'
            case 'Aprobado':
                return 'text-green-600 bg-green-50 border-green-200'
            case 'Rechazado':
                return 'text-red-600 bg-red-50 border-red-200'
            case 'No_aplica':
                return 'text-slate-600 bg-slate-50 border-slate-200'
            default:
                return 'text-slate-600 bg-slate-50 border-slate-200'
        }
    }

    return (
        <div className="border-2 border-slate-200 rounded-xl p-5 bg-white hover:shadow-md transition-shadow">
            {/* Header Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-[#254153]">
                        {service.consecutivo}
                    </span>
                    <span className="text-sm text-slate-600">
                        <span className="font-medium text-[#254153]">Fecha solicitud: </span>
                        <span className="text-emerald-600 font-semibold">
                            {formatDate(service.created_at)}
                        </span>
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    {currentUserRole !== 'director_comercial' && (
                        <span className="text-sm text-slate-700">
                            <span className="font-medium">Asesor MAC: </span>
                            {loading ? (
                                <span className="text-slate-400">Cargando...</span>
                            ) : (
                                <span className="font-semibold">{macUser?.display_name || 'N/A'}</span>
                            )}
                        </span>
                    )}

                    <button
                        onClick={() => router.push(`/servicios/${service.id}`)}
                        className="p-2 hover:bg-[#254153]/10 rounded-lg transition-colors group"
                        title="Ver detalles"
                    >
                        <Eye className="w-5 h-5 text-[#254153] group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Tipo de servicio */}
                <div className="space-y-1">
                    <p className="text-sm font-medium text-[#254153]">Tipo de servicio</p>
                    <p className="text-sm text-slate-700">{service.tipo_de_servicio || 'N/A'}</p>
                </div>

                {/* Canal de venta */}
                <div className="space-y-1">
                    <p className="text-sm font-medium text-[#254153]">Canal de venta</p>
                    <p className="text-sm text-slate-700">{service.canal_de_venta || 'N/A'}</p>
                </div>

                {/* Número de pedido */}
                <div className="space-y-1">
                    <p className="text-sm font-medium text-[#254153]">Número de pedido</p>
                    <p className="text-sm text-slate-700">{service.numero_de_pedido || 'N/A'}</p>
                </div>

                {/* Aprobación MAC */}
                <div className="space-y-1">
                    <p className="text-sm font-medium text-[#254153]">Aprobación MAC</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(service.aprobacion_mac?.estado || 'No_aplica')}`}>
                        {service.aprobacion_mac?.estado || 'No_aplica'}
                    </span>
                </div>

                {/* Aprobación Logística */}
                <div className="space-y-1">
                    <p className="text-sm font-medium text-[#254153]">Aprobación Logística</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(service.aprobacion_logistica?.estado || 'No_aplica')}`}>
                        {service.aprobacion_logistica?.estado || 'No_aplica'}
                    </span>
                </div>

                {/* Aprobación Dir. comercial */}
                <div className="space-y-1">
                    <p className="text-sm font-medium text-[#254153]">Aprobación Dir. comercial</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(service.aprobacion_director?.estado || 'No_aplica')}`}>
                        {service.aprobacion_director?.estado || 'No_aplica'}
                    </span>
                </div>
            </div>
        </div>
    )
}
