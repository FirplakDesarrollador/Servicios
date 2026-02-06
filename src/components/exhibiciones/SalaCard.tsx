'use client'

import { QueryUbicacionesRow } from '@/types/supabase'

interface SalaCardProps {
    sala: QueryUbicacionesRow
}

export default function SalaCard({ sala }: SalaCardProps) {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow">
            {/* Header Row */}
            <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                <div className="text-xs">
                    <span className="text-[#254153] font-medium">NIT: </span>
                    <span className="text-purple-600">{sala.nit || 'N/A'}</span>
                </div>

                <div className="text-xs">
                    <span className="text-[#254153] font-medium">Ultimo Mantenimiento: </span>
                    <span className="text-gray-700">
                        {sala.ultimo_mantenimiento_fecha_cierre
                            ? new Date(sala.ultimo_mantenimiento_fecha_cierre).toLocaleDateString()
                            : 'No registra'}
                    </span>
                </div>

                <div className="text-xs">
                    <span className="text-[#254153] font-medium">Id: </span>
                    <span className="text-purple-600">{sala.id}</span>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Cliente y Sala */}
                <div className="space-y-1">
                    <p className="text-xs font-medium text-[#254153]">{sala.cliente_nombre || 'N/A'}</p>
                    <p className="text-xs font-light text-[#254153]">{sala.nombre || 'N/A'}</p>
                </div>

                {/* Ciudad */}
                <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-900">Ciudad</p>
                    <p className="text-xs font-light text-gray-600">{sala.ciudad || 'N/A'}</p>
                </div>

                {/* Dirección */}
                <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-900">Dirección</p>
                    <p className="text-xs font-light text-gray-600">{sala.direccion || 'N/A'}</p>
                </div>

                {/* Contacto */}
                <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-900">Contacto</p>
                    <p className="text-xs font-light text-gray-600">{sala.nombre_contacto || 'N/A'}</p>
                </div>

                {/* Teléfono */}
                <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-900">Teléfono</p>
                    <p className="text-xs font-light text-gray-600">{sala.telefono || 'N/A'}</p>
                </div>

                {/* Asesor Comercial */}
                <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-900">Asesor comercial</p>
                    <p className="text-xs font-light text-gray-600">{sala.asesor_comercial_nombre || 'N/A'}</p>
                </div>

                {/* POPs */}
                <div className="col-span-1 md:col-span-2 space-y-1">
                    <p className="text-xs font-medium text-gray-900">POPs</p>
                    <div className="flex flex-wrap gap-2">
                        {sala.pop_banos && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">Baños</span>
                        )}
                        {sala.pop_cocinas && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Cocinas</span>
                        )}
                        {sala.pop_labores && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">Labores</span>
                        )}
                        {sala.pop_hidros && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">Hidros</span>
                        )}
                        {sala.pop_no_aplica && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">No aplica</span>
                        )}
                        {!sala.pop_banos && !sala.pop_cocinas && !sala.pop_labores && !sala.pop_hidros && !sala.pop_no_aplica && (
                            <span className="text-xs text-gray-400">Sin POPs</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
