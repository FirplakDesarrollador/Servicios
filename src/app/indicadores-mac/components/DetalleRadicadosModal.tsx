import React, { useState } from 'react';
import { RegistroMAC } from '../../types';
import { XIcon, ExternalLinkIcon } from 'lucide-react';
import Link from 'next/link';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    data: RegistroMAC[];
}

export default function DetalleRadicadosModal({ isOpen, onClose, data }: Props) {
    const [page, setPage] = useState(1);
    const itemsPerPage = 50;

    if (!isOpen) return null;

    const totalPages = Math.ceil(data.length / itemsPerPage);
    const displayedData = data.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-[95vw] h-[90vh] max-w-7xl flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <div>
                        <h2 className="text-lg font-black text-gray-800">Detalle de Radicados</h2>
                        <p className="text-xs text-gray-500 font-medium">Visualizando {data.length} registros que cumplen con los filtros actuales</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-800">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-auto bg-white p-6">
                    {data.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-400">
                            No hay registros para mostrar con la combinación de filtros actual.
                        </div>
                    ) : (
                        <div className="min-w-max border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-4 py-3 font-bold text-gray-600 uppercase tracking-wider border-b">ID</th>
                                        <th className="px-4 py-3 font-bold text-gray-600 uppercase tracking-wider border-b">Estado</th>
                                        <th className="px-4 py-3 font-bold text-gray-600 uppercase tracking-wider border-b">Fecha Cierre</th>
                                        <th className="px-4 py-3 font-bold text-gray-600 uppercase tracking-wider border-b">Días Hábiles</th>
                                        <th className="px-4 py-3 font-bold text-gray-600 uppercase tracking-wider border-b">Cliente</th>
                                        <th className="px-4 py-3 font-bold text-gray-600 uppercase tracking-wider border-b">Ciudad</th>
                                        <th className="px-4 py-3 font-bold text-gray-600 uppercase tracking-wider border-b">Productos</th>
                                        <th className="px-4 py-3 font-bold text-gray-600 uppercase tracking-wider border-b">Defectos</th>
                                        <th className="px-4 py-3 font-bold text-gray-600 uppercase tracking-wider border-b">Costo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {displayedData.map((d, i) => (
                                        <tr key={d.id} className="hover:bg-blue-50/40 transition-colors bg-white">
                                            <td className="px-4 py-3 font-bold text-brand">
                                                <Link href={`/ver-registro/${d.id}`} target="_blank" className="flex items-center gap-1 hover:underline">
                                                    {d.consecutivo}
                                                    <ExternalLinkIcon className="w-3 h-3 text-gray-400" />
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 font-semibold">
                                                <span className={`px-2 py-1 rounded-md ${d.estado === 'Cerrado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                    {d.estado}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                                                {d._fechaCierre ? new Date(d._fechaCierre).toLocaleDateString() : 'Pendiente'}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-gray-800">
                                                {d._diasHabilesAbierta} <span className="text-gray-400 font-normal">días</span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate" title={d._clientePrincipalFinal}>
                                                {d._clientePrincipalFinal}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700 max-w-[150px] truncate">
                                                {d._ciudad}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 max-w-[250px] truncate text-[10px]" title={d._productosNombres?.join(', ')}>
                                                {d._productosNombres?.join(', ')}
                                            </td>
                                            <td className="px-4 py-3 text-red-500 max-w-[250px] truncate text-[10px]" title={d._defectosNombres?.join(', ')}>
                                                {d._defectosNombres?.join(', ')}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-gray-800 whitespace-nowrap">
                                                ${(d._valorInvertido || 0).toLocaleString('es-CO')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer / Pagination */}
                {data.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">
                            Mostrando {(page - 1) * itemsPerPage + 1} - {Math.min(page * itemsPerPage, data.length)} de {data.length}
                        </span>
                        <div className="flex gap-2">
                            <button 
                                disabled={page === 1} 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Anterior
                            </button>
                            <button 
                                disabled={page === totalPages} 
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
