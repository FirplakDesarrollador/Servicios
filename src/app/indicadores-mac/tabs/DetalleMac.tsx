import React, { useMemo, useState } from 'react';
import { RegistroMAC, FilterState } from '../types';
import { ComposedChart, BarChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
import * as XLSX from 'xlsx';
import { ArrowDownIcon, ArrowUpIcon, MinusIcon, DownloadIcon, SearchIcon } from 'lucide-react';
import { addBusinessDays, getBusinessDaysDifference } from '../utils/businessDays';

interface Props {
    data: RegistroMAC[];
    prevData: RegistroMAC[];
    filters: FilterState;
    dataForMesPresupuesto?: RegistroMAC[];
    setFilters?: any;
    onFilterToggle: (key: keyof FilterState, value: string, e?: any) => void;
}

const COLORS = {
    excelente: '#10b981', // green-500
    regular: '#f59e0b',   // amber-500
    riesgo: '#f97316',    // orange-500
    demandante: '#ef4444',// red-500
    brand: '#254153',
    brandLight: '#749094'
};

// Parsear fecha segura: para strings tipo "2026-07-15" (solo fecha) se crea en hora local
// para evitar desfase por zona horaria UTC
function parseDateSafe(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    // Si es solo fecha (YYYY-MM-DD) sin hora, parsear manualmente en hora local
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    return new Date(dateStr);
}

// Calcular días hábiles y estado de riesgo para un registro
function calcularRiesgo(d: RegistroMAC): { diasHabiles: number; estadoRiesgo: 'Excelente' | 'Regular' | 'Riesgo de demanda' | 'Demandante' } {
    const createdAt = new Date(d.created_at);
    const fechaVerif = parseDateSafe((d as any).fecha_verificacion);
    const fechaReferencia = fechaVerif || new Date();
    const diasHabiles = getBusinessDaysDifference(createdAt, fechaReferencia);
    
    let estadoRiesgo: 'Excelente' | 'Regular' | 'Riesgo de demanda' | 'Demandante' = 'Excelente';
    if (diasHabiles > 20) estadoRiesgo = 'Demandante';
    else if (diasHabiles >= 16) estadoRiesgo = 'Riesgo de demanda';
    else if (diasHabiles >= 11) estadoRiesgo = 'Regular';
    
    return { diasHabiles, estadoRiesgo };
}

export default function DetalleMac({ data, prevData, filters, dataForMesPresupuesto, setFilters, onFilterToggle }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchTipoProblema, setSearchTipoProblema] = useState('');
    const [searchResponsable, setSearchResponsable] = useState('');

    // Datos enriquecidos con cálculo dinámico de riesgo
    const dataConRiesgo = useMemo(() => {
        return data.map(d => {
            const { diasHabiles, estadoRiesgo } = calcularRiesgo(d);
            return { ...d, _diasHabilesAbierta: diasHabiles, _estadoRiesgo: estadoRiesgo, _tiempoCierre: d.estado === 'Cerrado' ? diasHabiles : null };
        });
    }, [data]);

    // KPIs Base
    const total = dataConRiesgo.length;
    const abiertas = dataConRiesgo.filter(d => d.estado === 'Abierto');
    const cerradas = dataConRiesgo.filter(d => d.estado === 'Cerrado');
    const porcCierre = total > 0 ? (cerradas.length / total) * 100 : 0;
    const valorInvertidoTotal = cerradas.reduce((acc, curr) => acc + (curr._valorInvertido || 0), 0);
    const costoPromedio = cerradas.length > 0 ? valorInvertidoTotal / cerradas.length : 0;
    
    const tiempoPromedioCierre = cerradas.length > 0 
        ? cerradas.reduce((acc, curr) => acc + (curr._tiempoCierre || 0), 0) / cerradas.length 
        : 0;

    const cumplieronObjetivo = cerradas.filter(d => (d._tiempoCierre || 0) <= 15).length;
    const porcCumplimiento = cerradas.length > 0 ? (cumplieronObjetivo / cerradas.length) * 100 : 0;

    const backlog = abiertas.length;
    const enRiesgoODemandante = abiertas.filter(d => d._estadoRiesgo === 'Riesgo de demanda' || d._estadoRiesgo === 'Demandante').length;
    const porcRiesgo = abiertas.length > 0 ? (enRiesgoODemandante / abiertas.length) * 100 : 0;

    // Semáforo
    let semaforoColor = 'bg-red-500';
    let semaforoTexto = 'Crítico';
    if (porcCumplimiento >= 95 && porcRiesgo < 10) {
        semaforoColor = 'bg-green-500';
        semaforoTexto = 'Óptimo';
    } else if (porcCumplimiento >= 85 || (porcRiesgo >= 10 && porcRiesgo <= 20)) {
        semaforoColor = 'bg-amber-500';
        semaforoTexto = 'Atención';
    }

    // Chart: Estado de Riesgo
    const riesgoData = useMemo(() => {
        const counts = { 'Excelente': 0, 'Regular': 0, 'Riesgo de demanda': 0, 'Demandante': 0 };
        abiertas.forEach(d => {
            if (counts[d._estadoRiesgo as keyof typeof counts] !== undefined) {
                counts[d._estadoRiesgo as keyof typeof counts]++;
            }
        });
        return [
            { name: 'Excelente (1-10)', value: counts['Excelente'], color: COLORS.excelente },
            { name: 'Regular (11-15)', value: counts['Regular'], color: COLORS.regular },
            { name: 'Riesgo (16-20)', value: counts['Riesgo de demanda'], color: COLORS.riesgo },
            { name: 'Demandante (>20)', value: counts['Demandante'], color: COLORS.demandante },
        ];
    }, [abiertas]);

    // Presupuesto de Cierre
    // Presupuesto = mes donde se espera cerrar (created_at + 15 días hábiles)
    // El radicado SIEMPRE pertenece a su mes objetivo (incluso si se cerró antes).
    const presupuestoData = useMemo(() => {
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        const meses: Record<string, { pres: number, cerrEnSla: number, fueraSla: number, pendientes: number }> = {};

        const fechaIni = filters.fechaInicial ? new Date(filters.fechaInicial) : null;
        const fechaFin = filters.fechaFinal ? new Date(filters.fechaFinal) : null;
        if (fechaIni && fechaFin) {
            const endWithBuffer = new Date(fechaFin.getFullYear(), fechaFin.getMonth() + 1, 1);
            const current = new Date(fechaIni.getFullYear(), fechaIni.getMonth(), 1);
            while (current <= endWithBuffer) {
                const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
                meses[key] = { pres: 0, cerrEnSla: 0, fueraSla: 0, pendientes: 0 };
                current.setMonth(current.getMonth() + 1);
            }
        }

        const sourceData = dataForMesPresupuesto ? dataForMesPresupuesto.map(d => {
            const { diasHabiles, estadoRiesgo } = calcularRiesgo(d);
            return { ...d, _diasHabilesAbierta: diasHabiles, _estadoRiesgo: estadoRiesgo, _tiempoCierre: d.estado === 'Cerrado' ? diasHabiles : null };
        }) : dataConRiesgo;

        sourceData.forEach(d => {
            const created = new Date(d.created_at);
            const fechaObjetivo = addBusinessDays(created, 15);
            const mesKey = `${fechaObjetivo.getFullYear()}-${String(fechaObjetivo.getMonth() + 1).padStart(2, '0')}`;
            
            if (!meses[mesKey]) meses[mesKey] = { pres: 0, cerrEnSla: 0, fueraSla: 0, pendientes: 0 };
            meses[mesKey].pres += 1;

            const diasHabiles = d._tiempoCierre !== null ? d._tiempoCierre : d._diasHabilesAbierta;
            
            if (d.estado === 'Cerrado') {
                if (diasHabiles <= 15) {
                    meses[mesKey].cerrEnSla += 1;
                } else {
                    meses[mesKey].fueraSla += 1; // Cerrado tarde
                }
            } else {
                meses[mesKey].pendientes += 1; // Abierto
                if (diasHabiles > 15) {
                    meses[mesKey].fueraSla += 1; // Vencido
                }
            }
        });

        return Object.entries(meses).sort().filter(([, vals]) => vals.pres > 0).map(([mesKey, vals]) => {
            const [year, monthStr] = mesKey.split('-');
            const monthIdx = parseInt(monthStr, 10) - 1;
            const mesLabel = monthNames[monthIdx] || mesKey;
            
            const cumplimiento = vals.pres > 0 ? (((vals.pres - vals.fueraSla) / vals.pres) * 100).toFixed(2) : "0.00";

            return {
                mesKey: mesKey,
                mes: mesLabel, 
                Presupuesto: vals.pres, 
                CerradasEnSLA: vals.cerrEnSla,
                FueraSLA: vals.fueraSla,
                Pendientes: vals.pendientes,
                Cumplimiento: parseFloat(cumplimiento)
            };
        });
    }, [dataConRiesgo, filters.fechaInicial, filters.fechaFinal]);

    const CustomPresupuestoTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs z-50 min-w-[200px]">
                    <p className="font-black text-gray-800 mb-2 uppercase border-b pb-1">{label}</p>
                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-gray-600">
                            <span>Presupuesto:</span>
                            <span className="font-bold text-gray-800">{data.Presupuesto}</span>
                        </div>
                        <div className="flex justify-between items-center text-emerald-600">
                            <span>Cerradas en SLA:</span>
                            <span className="font-bold">{data.CerradasEnSLA}</span>
                        </div>
                        <div className="flex justify-between items-center text-red-500">
                            <span>Fuera del SLA:</span>
                            <span className="font-bold">{data.FueraSLA}</span>
                        </div>
                        <div className="flex justify-between items-center text-amber-500">
                            <span>Pendientes:</span>
                            <span className="font-bold">{data.Pendientes}</span>
                        </div>
                    </div>
                    <div className="mt-2 pt-2 border-t flex justify-between items-center text-brand">
                        <span className="font-black">Cumplimiento:</span>
                        <span className="font-black">{data.Cumplimiento}%</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Export Excel
    const exportToExcel = () => {
        const rows = exportData.map(d => ({
            'Número Radicado': d.consecutivo,
            'Fecha Registro': new Date(d.created_at).toLocaleDateString(),
            'Cliente': d.cliente_final_nombre || d.cliente_nombre,
            'Canal': d.canal_venta,
            'Tipo Solicitud': d.tipo_solicitud,
            'Tipo Problema': (d._defectosNombres || []).join(' | ') || 'N/A',
            'Responsable Problema': (d._responsablesNombres || []).join(' | ') || 'N/A',
            'Agente MAC': d._agenteNombre,
            'Estado': d.estado,
            'Días Abierta': d._diasHabilesAbierta,
            'Tiempo Cierre': d._tiempoCierre || '',
            'Estado Riesgo': d._estadoRiesgo,
            'Valor Invertido': d._valorInvertido
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Detalle MAC");
        XLSX.writeFile(workbook, `Detalle_MAC_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const exportData = useMemo(() => {
        const termLow = searchTerm.toLowerCase();
        const tipoLow = searchTipoProblema.toLowerCase();
        const respLow = searchResponsable.toLowerCase();
        return dataConRiesgo.filter(d => {
            // Búsqueda por radicado/cliente
            if (termLow && !(
                d.consecutivo.toLowerCase().includes(termLow) ||
                (d.cliente_final_nombre || '').toLowerCase().includes(termLow) ||
                (d.cliente_nombre || '').toLowerCase().includes(termLow)
            )) return false;
            // Búsqueda por tipo de problema (cualquier defecto del registro)
            if (tipoLow && !(
                (d._defectosNombres || []).some(def => def.toLowerCase().includes(tipoLow))
            )) return false;
            // Búsqueda por responsable
            if (respLow && !(
                (d._responsablesNombres || []).some(res => res.toLowerCase().includes(respLow))
            )) return false;
            return true;
        });
    }, [dataConRiesgo, searchTerm, searchTipoProblema, searchResponsable]);

    const KpiCard = ({ title, value, prefix = '', suffix = '', subtitle = '' }: any) => (
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center min-h-[70px]">
            <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">{title}</h3>
            <div className="text-lg font-black text-gray-800 leading-tight">
                {prefix}{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}{suffix}
            </div>
            {subtitle && <div className="mt-0.5 text-[9px] font-medium text-gray-400">{subtitle}</div>}
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <KpiCard title="Total Solicitudes" value={total} />
                <KpiCard title="Cerradas" value={cerradas.length} subtitle={`${porcCierre.toFixed(1)}% de cierre`} />
                <KpiCard title="Costo Promedio" value={costoPromedio} prefix="$" />
                <KpiCard title="Tiempo Prom. Cierre" value={tiempoPromedioCierre} suffix=" días" subtitle="Días hábiles" />
                <KpiCard title="% Cumplimiento" value={porcCumplimiento} suffix="%" />
                <KpiCard title="Backlog Operativo" value={backlog} />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider">Estado de Riesgo (Abiertas)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={riesgoData}
                                layout="vertical"
                                margin={{ top: 10, right: 30, left: 50, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#374151', fontWeight: '500' }} />
                                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20} name="Solicitudes">
                                    {riesgoData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 xl:col-span-2">
                    <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider">Presupuesto de Cierre</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={presupuestoData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} hide domain={[0, 100]} />
                                <RechartsTooltip content={<CustomPresupuestoTooltip />} cursor={{ fill: '#f9fafb' }} />
                                <Legend />
                                <Bar 
                                    yAxisId="left" 
                                    dataKey="Presupuesto" 
                                    fill={COLORS.brandLight} 
                                    radius={[4, 4, 0, 0]} 
                                    name="Presupuesto"
                                    onClick={(data: any, index: number, e: any) => onFilterToggle('mesPresupuesto', data.payload?.mesKey || data.mesKey, e)}
                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                />
                                <Bar 
                                    yAxisId="left" 
                                    dataKey="CerradasEnSLA" 
                                    fill={COLORS.brand} 
                                    radius={[4, 4, 0, 0]} 
                                    name="Cerradas en SLA"
                                    onClick={(data: any, index: number, e: any) => onFilterToggle('mesPresupuesto', data.payload?.mesKey || data.mesKey, e)}
                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                />
                                <Line yAxisId="right" type="monotone" dataKey="Cumplimiento" stroke="#000000" strokeWidth={3} dot={{ r: 4 }} name="% Cumplimiento">
                                    <LabelList dataKey="Cumplimiento" position="top" formatter={(val: any) => `${val}%`} style={{ fill: '#374151', fontSize: 11, fontWeight: 'bold' }} offset={10} />
                                </Line>
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Tabla Detalle */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Detalle Operativo</h3>
                        <p className="text-[10px] text-gray-400 mt-0.5">{exportData.length} registros encontrados</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Buscar radicado / cliente */}
                        <div className="relative">
                            <SearchIcon className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Radicado o cliente..."
                                className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs w-44 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
                            )}
                        </div>
                        {/* Buscar tipo de problema */}
                        <div className="relative">
                            <SearchIcon className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Tipo de problema..."
                                className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs w-44 focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 transition-all"
                                value={searchTipoProblema}
                                onChange={e => setSearchTipoProblema(e.target.value)}
                            />
                            {searchTipoProblema && (
                                <button onClick={() => setSearchTipoProblema('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
                            )}
                        </div>
                        {/* Buscar responsable */}
                        <div className="relative">
                            <SearchIcon className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Responsable..."
                                className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs w-40 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all"
                                value={searchResponsable}
                                onChange={e => setSearchResponsable(e.target.value)}
                            />
                            {searchResponsable && (
                                <button onClick={() => setSearchResponsable('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
                            )}
                        </div>
                        <button
                            onClick={exportToExcel}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                        >
                            <DownloadIcon className="w-4 h-4" /> Exportar a Excel
                        </button>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="p-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200 rounded-tl-lg">Radicado</th>
                                <th className="p-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200">Fecha</th>
                                <th className="p-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200">Cliente</th>
                                <th className="p-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200">Canal</th>
                                <th className="p-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200">Estado</th>
                                <th className="p-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200">Agente</th>
                                <th className="p-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200 text-center">Días</th>
                                <th className="p-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200">Riesgo</th>
                                <th className="p-3 text-[10px] font-black uppercase text-purple-600 border-b border-gray-200 bg-purple-50/60">Tipo Problema</th>
                                <th className="p-3 text-[10px] font-black uppercase text-amber-600 border-b border-gray-200 bg-amber-50/60 rounded-tr-lg">Responsable</th>
                            </tr>
                        </thead>
                        <tbody>
                            {exportData.slice(0, 100).map((d, i) => (
                                <tr key={i} className={`hover:bg-gray-50/80 transition-colors border-b border-gray-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                                    <td className="p-3 text-xs font-bold text-brand">{d.consecutivo}</td>
                                    <td className="p-3 text-xs text-gray-600">{new Date(d.created_at).toLocaleDateString()}</td>
                                    <td className="p-3 text-xs font-medium text-gray-800 max-w-[200px] truncate" title={d.cliente_final_nombre || d.cliente_nombre || 'N/A'}>{d.cliente_final_nombre || d.cliente_nombre || 'N/A'}</td>
                                    <td className="p-3 text-xs text-gray-600">{d.canal_venta}</td>
                                    <td className="p-3 text-xs">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${d.estado === 'Abierto' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                            {d.estado}
                                        </span>
                                    </td>
                                    <td className="p-3 text-xs text-gray-600">{d._agenteNombre}</td>
                                    <td className="p-3 text-xs font-bold text-center text-gray-800">{d.estado === 'Abierto' ? d._diasHabilesAbierta : d._tiempoCierre}</td>
                                    <td className="p-3 text-xs">
                                        {d.estado === 'Abierto' && (
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold text-white
                                                ${d._estadoRiesgo === 'Excelente' ? 'bg-[#10b981]' :
                                                  d._estadoRiesgo === 'Regular' ? 'bg-[#f59e0b]' :
                                                  d._estadoRiesgo === 'Riesgo de demanda' ? 'bg-[#f97316]' : 'bg-[#ef4444]'}`}
                                            >
                                                {d._estadoRiesgo}
                                            </span>
                                        )}
                                    </td>
                                    {/* ── Columna Tipo Problema ─────────────────────── */}
                                    <td className="p-3 text-xs bg-purple-50/30">
                                        {(d._defectosNombres || []).length > 0 ? (
                                            <div className="flex flex-col gap-1 max-w-[180px]">
                                                {(d._defectosNombres || []).slice(0, 2).map((def, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 truncate"
                                                        title={def}
                                                    >
                                                        {def}
                                                    </span>
                                                ))}
                                                {(d._defectosNombres || []).length > 2 && (
                                                    <span className="text-[10px] text-purple-400 font-medium">+{(d._defectosNombres || []).length - 2} más</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-300 text-[10px]">—</span>
                                        )}
                                    </td>
                                    {/* ── Columna Responsable ───────────────────────── */}
                                    <td className="p-3 text-xs bg-amber-50/30">
                                        {(d._responsablesNombres || []).length > 0 ? (
                                            <div className="flex flex-col gap-1 max-w-[180px]">
                                                {(d._responsablesNombres || []).slice(0, 2).map((res, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 truncate"
                                                        title={res}
                                                    >
                                                        {res}
                                                    </span>
                                                ))}
                                                {(d._responsablesNombres || []).length > 2 && (
                                                    <span className="text-[10px] text-amber-400 font-medium">+{(d._responsablesNombres || []).length - 2} más</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-300 text-[10px]">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {exportData.length > 100 && (
                        <div className="p-4 text-center text-xs text-gray-500 bg-gray-50 border-t border-gray-100">
                            Mostrando los primeros 100 registros de {exportData.length}. Utilice la exportación a Excel para ver todos los registros.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
