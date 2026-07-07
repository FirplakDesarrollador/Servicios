import React, { useMemo, useState, useEffect } from 'react';
import { RegistroMAC, FilterState } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { SearchIcon, DownloadIcon, SaveIcon, AlertCircleIcon, ExternalLinkIcon } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
    data: RegistroMAC[];
    prevData: RegistroMAC[];
    filters: FilterState;
}

const COLORS = {
    excelente: '#10b981', // green-500
    regular: '#f59e0b',   // amber-500
    riesgo: '#f97316',    // orange-500
    demandante: '#ef4444',// red-500
    brand: '#254153'
};

export default function AgentesMac({ data, prevData, filters }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [observaciones, setObservaciones] = useState<Record<number, string>>({});

    // Cargar observaciones de localStorage (solo para MVP sin modificar DB)
    useEffect(() => {
        const stored = localStorage.getItem('mac_observaciones');
        if (stored) {
            try { setObservaciones(JSON.parse(stored)); } catch (e) {}
        }
    }, []);

    const saveObservacion = (id: number, text: string) => {
        const newObs = { ...observaciones, [id]: text };
        setObservaciones(newObs);
        localStorage.setItem('mac_observaciones', JSON.stringify(newObs));
    };

    // Filtro Agente MAC es obligatorio o se muestra el de todos.
    const isAgenteSelected = filters.agenteMac && filters.agenteMac.length > 0;

    const total = data.length;
    const abiertas = data.filter(d => d.estado === 'Abierto');
    const cerradas = data.filter(d => d.estado === 'Cerrado');
    const porcCierre = total > 0 ? (cerradas.length / total) * 100 : 0;
    const valorInvertidoTotal = data.reduce((acc, curr) => acc + (curr._valorInvertido || 0), 0);
    const tiempoPromedioCierre = cerradas.length > 0 ? cerradas.reduce((acc, curr) => acc + (curr._tiempoCierre || 0), 0) / cerradas.length : 0;
    const porcCumplimiento = cerradas.length > 0 ? (cerradas.filter(d => (d._tiempoCierre || 0) <= 15).length / cerradas.length) * 100 : 0;

    // Mis prioridades de hoy (Top 10 abiertas con más días hábiles)
    const prioridades = useMemo(() => {
        return abiertas
            .sort((a, b) => (b._diasHabilesAbierta || 0) - (a._diasHabilesAbierta || 0))
            .slice(0, 10);
    }, [abiertas]);

    // Tabla de seguimiento
    const exportData = useMemo(() => {
        let filtered = data;
        if (searchTerm) {
            filtered = filtered.filter(d => 
                d.consecutivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (d.cliente_final_nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        // Ordenar por días hábiles transcurridos por defecto (descendente para priorizar antiguos)
        return filtered.sort((a, b) => {
            const valA = a.estado === 'Abierto' ? (a._diasHabilesAbierta || 0) : -1;
            const valB = b.estado === 'Abierto' ? (b._diasHabilesAbierta || 0) : -1;
            return valB - valA;
        });
    }, [data, searchTerm]);

    const exportToExcel = () => {
        const rows = exportData.map(d => ({
            'Número Radicado': d.consecutivo,
            'Fecha Registro': new Date(d.created_at).toLocaleDateString(),
            'Cliente': d.cliente_final_nombre || d.cliente_nombre,
            'Tipo Solicitud': d.tipo_solicitud,
            'Estado': d.estado,
            'Días Hábiles Transcurridos': d.estado === 'Abierto' ? d._diasHabilesAbierta : d._tiempoCierre,
            'Estado Riesgo': d._estadoRiesgo,
            'Observaciones': observaciones[d.id] || ''
        }));
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Seguimiento");
        XLSX.writeFile(workbook, "Seguimiento_Agente.xlsx");
    };

    const KpiCard = ({ title, value, suffix = '', prefix = '' }: any) => (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{title}</h3>
            <div className="text-2xl font-black text-gray-800">
                {prefix}{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}{suffix}
            </div>
        </div>
    );

    const getRowColor = (riesgo?: string) => {
        switch (riesgo) {
            case 'Excelente': return 'border-l-4 border-l-[#10b981]';
            case 'Regular': return 'border-l-4 border-l-[#f59e0b]';
            case 'Riesgo de demanda': return 'border-l-4 border-l-[#f97316]';
            case 'Demandante': return 'border-l-4 border-l-[#ef4444] bg-red-50/30';
            default: return '';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {!isAgenteSelected && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl flex items-start gap-3">
                    <AlertCircleIcon className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold">Vista General de Agentes</h4>
                        <p className="text-xs mt-1 text-blue-700">Estás viendo los indicadores de todos los agentes. Selecciona un agente en el filtro superior para ver su panel de trabajo personal.</p>
                    </div>
                </div>
            )}

            {/* Mis Prioridades (Solo visibles si hay abiertas) */}
            {prioridades.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-red-50 to-white px-6 py-4 border-b border-red-100 flex items-center justify-between">
                        <h3 className="text-sm font-black text-red-700 uppercase tracking-wider flex items-center gap-2">
                            🔥 Mis Prioridades de Hoy
                        </h3>
                        <span className="text-xs font-bold text-red-500">Top {prioridades.length} más críticas</span>
                    </div>
                    <div className="p-2 flex overflow-x-auto gap-3 snap-x">
                        {prioridades.map(p => (
                            <div key={p.id} className="snap-start shrink-0 w-64 bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                <div className={`absolute top-0 left-0 w-1 h-full ${p._estadoRiesgo === 'Demandante' ? 'bg-red-500' : p._estadoRiesgo === 'Riesgo de demanda' ? 'bg-orange-500' : 'bg-amber-500'}`} />
                                <div className="flex justify-between items-start mb-2">
                                    <a href={`/ver-registro/${p.id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-black text-brand hover:underline flex items-center gap-1">
                                        {p.consecutivo} <ExternalLinkIcon className="w-3 h-3" />
                                    </a>
                                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">{p._diasHabilesAbierta} días</span>
                                </div>
                                <p className="text-[11px] text-gray-600 font-medium truncate mb-1">{p.cliente_final_nombre || p.cliente_nombre}</p>
                                <p className="text-[10px] text-gray-400 truncate">{p.tipo_solicitud}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <KpiCard title="Registradas" value={total} />
                <KpiCard title="Abiertas" value={abiertas.length} />
                <KpiCard title="Cerradas" value={cerradas.length} />
                <KpiCard title="% Cierre" value={porcCierre} suffix="%" />
                <KpiCard title="% Cumplim." value={porcCumplimiento} suffix="%" />
                <KpiCard title="Tiempo Prom." value={tiempoPromedioCierre} suffix="d" />
                <KpiCard title="Val. Invertido" value={valorInvertidoTotal} prefix="$" />
            </div>

            {/* Tabla de Seguimiento */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Tabla de Seguimiento Diario</h3>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input 
                                type="text"
                                placeholder="Buscar radicado..."
                                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs w-64 focus:outline-none focus:ring-2 focus:ring-brand"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={exportToExcel}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                        >
                            <DownloadIcon className="w-4 h-4" /> Exportar
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead className="sticky top-0 bg-white shadow-sm z-10">
                            <tr>
                                <th className="p-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200">Radicado</th>
                                <th className="p-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200">Fecha</th>
                                <th className="p-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200">Cliente</th>
                                <th className="p-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200">Tipo Solicitud</th>
                                <th className="p-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200">Días</th>
                                <th className="p-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200 w-1/3">Observaciones (Internas)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {exportData.map((d) => (
                                <tr key={d.id} className={`hover:bg-gray-50 transition-colors border-b border-gray-100 ${d.estado === 'Abierto' ? getRowColor(d._estadoRiesgo) : ''}`}>
                                    <td className="p-3 text-xs font-bold">
                                        <a href={`/ver-registro/${d.id}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline flex items-center gap-1">
                                            {d.consecutivo} <ExternalLinkIcon className="w-3 h-3 text-gray-400" />
                                        </a>
                                    </td>
                                    <td className="p-3 text-xs text-gray-600">{new Date(d.created_at).toLocaleDateString()}</td>
                                    <td className="p-3 text-xs font-medium text-gray-800 max-w-[200px] truncate" title={d.cliente_final_nombre || d.cliente_nombre || ''}>
                                        {d.cliente_final_nombre || d.cliente_nombre || 'N/A'}
                                    </td>
                                    <td className="p-3 text-xs text-gray-600 max-w-[150px] truncate" title={d.tipo_solicitud}>{d.tipo_solicitud}</td>
                                    <td className="p-3 text-xs font-bold text-center">
                                        {d.estado === 'Abierto' ? (
                                            <span className={`px-2 py-0.5 rounded text-white ${
                                                d._estadoRiesgo === 'Excelente' ? 'bg-[#10b981]' : 
                                                d._estadoRiesgo === 'Regular' ? 'bg-[#f59e0b]' : 
                                                d._estadoRiesgo === 'Riesgo de demanda' ? 'bg-[#f97316]' : 'bg-[#ef4444]'
                                            }`}>
                                                {d._diasHabilesAbierta}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 font-normal">{d._tiempoCierre}</span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        <div className="relative group">
                                            <textarea 
                                                className="w-full text-xs p-2 border border-transparent hover:border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded resize-none transition-colors min-h-[40px] bg-transparent focus:bg-white"
                                                placeholder="Añadir nota de seguimiento..."
                                                value={observaciones[d.id] || ''}
                                                onChange={(e) => saveObservacion(d.id, e.target.value)}
                                            />
                                            <SaveIcon className="w-3 h-3 text-gray-400 absolute right-2 bottom-2 opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
