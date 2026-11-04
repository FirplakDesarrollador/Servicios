import React, { useMemo, useState, useEffect } from 'react';
import { RegistroMAC, FilterState } from '../types';
import { porcentajeCumplimiento } from '../utils/metricas';
import DesempenoAgentes from '../components/DesempenoAgentes';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { SearchIcon, DownloadIcon, SaveIcon, AlertCircleIcon, ExternalLinkIcon, AlertTriangleIcon } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
    data: RegistroMAC[];
    prevData: RegistroMAC[];
    filters: FilterState;
    setFilters?: any;
    onFilterToggle: (key: keyof FilterState, value: string, e?: any) => void;
    /** Todos los filtros excepto el de agente */
    dataForAgente?: RegistroMAC[];
}

const COLORS = {
    excelente: '#10b981', // green-500
    regular: '#f59e0b',   // amber-500
    riesgo: '#f97316',    // orange-500
    demandante: '#ef4444',// red-500
    brand: 'var(--serie-navy)'
};

export default function AgentesMac({ data, prevData, filters, onFilterToggle, dataForAgente }: Props) {
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
    const porcCumplimiento = porcentajeCumplimiento(data);

    // Mis prioridades de hoy (Top 10 abiertas con más días hábiles)
    const prioridades = useMemo(() => {
        return abiertas
            .sort((a, b) => (b._diasHabilesAbierta || 0) - (a._diasHabilesAbierta || 0))
            .slice(0, 10);
    }, [abiertas]);

    const now = new Date();
    const currentMesPresupuestoKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const porCerrarPresupuesto = abiertas.filter(d => d._mesPresupuestoKey === currentMesPresupuestoKey);

    const checkMissingData = (d: any) => {
        const hasProductos = Array.isArray(d.productos_novedad) && d.productos_novedad.length > 0;
        let mFamilia = !hasProductos;
        let mPlanta = !hasProductos;
        let mProblema = !hasProductos || (!d._defectosNombres || d._defectosNombres.length === 0);
        let mResponsable = !hasProductos || (!d._responsablesNombres || d._responsablesNombres.length === 0);

        if (hasProductos) {
            for (const p of d.productos_novedad) {
                if (!p.familia) mFamilia = true;
                if (!p.planta) mPlanta = true;
                
                if (!p.problemas || p.problemas.length === 0) {
                    mProblema = true;
                    mResponsable = true;
                } else {
                    for (const prob of p.problemas) {
                        if (!prob.tipo_problema_id) mProblema = true;
                        if (!prob.responsable_problema_id) mResponsable = true;
                    }
                }
            }
        }
        
        return { mFamilia, mPlanta, mProblema, mResponsable, isMissing: mFamilia || mPlanta || mProblema || mResponsable };
    };

    const incompleteData = useMemo(() => {
        return data.filter(d => checkMissingData(d).isMissing);
    }, [data]);

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
        <div className="bg-white px-3 py-2 rounded-xl shadow-sm border border-border flex flex-col justify-center min-h-[60px]">
            <h3 className="text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-0.5" title={title}>{title}</h3>
            <div className="text-lg font-bold text-brand-dark leading-tight">
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
                <div className="bg-brand-soft border border-brand-light/30 text-brand p-3 rounded-lg flex items-start gap-2">
                    <AlertCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-xs font-bold">Vista General de Agentes</h4>
                        <p className="text-[10px] mt-0.5 text-brand">Estás viendo los indicadores de todos los agentes. Selecciona un agente en el filtro superior para ver su panel de trabajo personal.</p>
                    </div>
                </div>
            )}

            {/* Mis Prioridades (Solo visibles si hay abiertas) */}
            {prioridades.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-red-50 to-white px-4 py-2 border-b border-red-100 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                            🔥 Mis Prioridades de Hoy
                        </h3>
                        <span className="text-[10px] font-bold text-red-500">Top {prioridades.length} más críticas</span>
                    </div>
                    <div className="p-2 flex overflow-x-auto gap-2 snap-x custom-scrollbar pb-3">
                        {prioridades.map(p => (
                            <div key={p.id} className="snap-start shrink-0 w-52 bg-white border border-border rounded-lg p-3 shadow-sm relative overflow-hidden">
                                <div className={`absolute top-0 left-0 w-1 h-full ${p._estadoRiesgo === 'Demandante' ? 'bg-red-500' : p._estadoRiesgo === 'Riesgo de demanda' ? 'bg-orange-500' : 'bg-amber-500'}`} />
                                <div className="flex justify-between items-start mb-1.5 pl-1">
                                    <a href={`/ver-registro/${p.id}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-brand hover:underline flex items-center gap-1">
                                        {p.consecutivo} <ExternalLinkIcon className="w-2.5 h-2.5" />
                                    </a>
                                    <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{p._diasHabilesAbierta} días</span>
                                </div>
                                <p className="text-[10px] text-stone-600 font-medium truncate mb-0.5 pl-1">{p.cliente_final_nombre || p.cliente_nombre}</p>
                                <p className="text-[9px] text-stone-400 truncate pl-1">{p.tipo_solicitud}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <KpiCard title="Registradas" value={total} />
                <KpiCard title="Abiertas" value={abiertas.length} />
                <KpiCard title="Ppto. a Cerrar" value={porCerrarPresupuesto.length} />
                <KpiCard title="Cerradas" value={cerradas.length} />
                <KpiCard title="% Cierre" value={porcCierre} suffix="%" />
                <KpiCard title="% Cumplim." value={porcCumplimiento} suffix="%" />
                <KpiCard title="Tiempo Prom." value={tiempoPromedioCierre} suffix="d" />
                <KpiCard title="Val. Invertido" value={valorInvertidoTotal.toLocaleString('es-CO')} prefix="$" />
            </div>

            <DesempenoAgentes data={dataForAgente || data} filters={filters} onFilterToggle={onFilterToggle} />

            {/* Tabla de Seguimiento */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col h-[600px]">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider">Tabla de Seguimiento Diario</h3>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <SearchIcon className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input 
                                type="text"
                                placeholder="Buscar radicado..."
                                className="pl-9 pr-4 py-2 border border-border rounded-lg text-xs w-64 focus:outline-none focus:ring-2 focus:ring-brand"
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
                                <th className="p-3 text-[10px] font-bold uppercase text-stone-500 border-b border-border">Radicado</th>
                                <th className="p-3 text-[10px] font-bold uppercase text-stone-500 border-b border-border">Fecha</th>
                                <th className="p-3 text-[10px] font-bold uppercase text-stone-500 border-b border-border">Cliente</th>
                                <th className="p-3 text-[10px] font-bold uppercase text-stone-500 border-b border-border">Tipo Solicitud</th>
                                <th className="p-3 text-[10px] font-bold uppercase text-stone-500 border-b border-border">Días</th>
                                <th className="p-3 text-[10px] font-bold uppercase text-stone-500 border-b border-border w-1/3">Observaciones (Internas)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {exportData.map((d) => (
                                <tr key={d.id} className={`hover:bg-cream-light transition-colors border-b border-border ${d.estado === 'Abierto' ? getRowColor(d._estadoRiesgo) : ''}`}>
                                    <td className="p-3 text-xs font-bold">
                                        <a href={`/ver-registro/${d.id}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline flex items-center gap-1">
                                            {d.consecutivo} <ExternalLinkIcon className="w-3 h-3 text-stone-400" />
                                        </a>
                                    </td>
                                    <td className="p-3 text-xs text-stone-600">{new Date(d.created_at).toLocaleDateString()}</td>
                                    <td className="p-3 text-xs font-medium text-brand-dark max-w-[200px] truncate" title={d.cliente_final_nombre || d.cliente_nombre || ''}>
                                        {d.cliente_final_nombre || d.cliente_nombre || 'N/A'}
                                    </td>
                                    <td className="p-3 text-xs text-stone-600 max-w-[150px] truncate" title={d.tipo_solicitud}>{d.tipo_solicitud}</td>
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
                                            <span className="text-stone-400 font-normal">{d._tiempoCierre}</span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        <div className="relative group">
                                            <textarea 
                                                className="w-full text-xs p-2 border border-transparent hover:border-border focus:border-brand focus:ring-1 focus:ring-brand rounded resize-none transition-colors min-h-[40px] bg-transparent focus:bg-white"
                                                placeholder="Añadir nota de seguimiento..."
                                                value={observaciones[d.id] || ''}
                                                onChange={(e) => saveObservacion(d.id, e.target.value)}
                                            />
                                            <SaveIcon className="w-3 h-3 text-stone-400 absolute right-2 bottom-2 opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {incompleteData.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-rose-100 overflow-hidden">
                    <div className="bg-rose-50 px-4 py-3 border-b border-rose-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangleIcon className="w-5 h-5 text-rose-500" />
                            <h3 className="text-xs font-bold text-rose-700 uppercase tracking-wider">Casos con Datos Faltantes (Problema, Responsable, Familia o Planta)</h3>
                        </div>
                        <span className="text-[10px] font-bold text-rose-500 bg-rose-100 px-2 py-1 rounded-full">{incompleteData.length} registros</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="p-3 text-[10px] font-bold uppercase text-stone-500 border-b border-border">Radicado</th>
                                    <th className="p-3 text-[10px] font-bold uppercase text-stone-500 border-b border-border">Estado</th>
                                    <th className="p-3 text-[10px] font-bold uppercase text-stone-500 border-b border-border">Faltante</th>
                                    <th className="p-3 text-[10px] font-bold uppercase text-stone-500 border-b border-border">Agente MAC</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incompleteData.map(d => {
                                    const { mProblema, mResponsable, mFamilia, mPlanta } = checkMissingData(d);

                                    return (
                                        <tr key={d.id} className="hover:bg-rose-50/30 transition-colors border-b border-border">
                                            <td className="p-3 text-xs font-bold">
                                                <a href={`/ver-registro/${d.id}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline flex items-center gap-1">
                                                    {d.consecutivo} <ExternalLinkIcon className="w-3 h-3 text-stone-400" />
                                                </a>
                                            </td>
                                            <td className="p-3 text-xs font-semibold text-stone-600">{d.estado}</td>
                                            <td className="p-3 text-[10px]">
                                                <div className="flex flex-col gap-1">
                                                    {mProblema && <span className="inline-flex items-center w-fit px-1.5 py-0.5 rounded font-bold bg-rose-50 text-rose-600 border border-rose-100">Tipo de Problema</span>}
                                                    {mResponsable && <span className="inline-flex items-center w-fit px-1.5 py-0.5 rounded font-bold bg-orange-50 text-orange-600 border border-orange-100">Responsable</span>}
                                                    {mFamilia && <span className="inline-flex items-center w-fit px-1.5 py-0.5 rounded font-bold bg-brand-soft text-brand border border-brand-light/30">Familia</span>}
                                                    {mPlanta && <span className="inline-flex items-center w-fit px-1.5 py-0.5 rounded font-bold bg-brand-soft text-brand border border-brand-light/30">Planta</span>}
                                                </div>
                                            </td>
                                            <td className="p-3 text-xs text-stone-600 font-semibold">{d._agenteNombre || '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
