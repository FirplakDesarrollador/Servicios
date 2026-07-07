import React, { useMemo, useState } from 'react';
import { RegistroMAC, FilterState } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import * as XLSX from 'xlsx';
import { ArrowDownIcon, ArrowUpIcon, MinusIcon, DownloadIcon, SearchIcon } from 'lucide-react';
import { addBusinessDays } from '../utils/businessDays';

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
    brand: '#254153',
    brandLight: '#749094'
};

export default function DetalleMac({ data, prevData, filters }: Props) {
    const [searchTerm, setSearchTerm] = useState('');

    // KPIs Base
    const total = data.length;
    const abiertas = data.filter(d => d.estado === 'Abierto');
    const cerradas = data.filter(d => d.estado === 'Cerrado');
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

    // Chart: Cumplimiento
    const cumplimientoData = [
        { name: 'Dentro del Objetivo', value: cumplieronObjetivo, color: COLORS.excelente },
        { name: 'Fuera del Objetivo', value: cerradas.length - cumplieronObjetivo, color: COLORS.demandante }
    ];

    // Presupuesto de Cierre
    const presupuestoData = useMemo(() => {
        const meses: Record<string, { pres: number, cerr: number, pend: number }> = {};
        
        data.forEach(d => {
            const created = new Date(d.created_at);
            const objDate = addBusinessDays(created, 15);
            const mesObj = `${objDate.getFullYear()}-${String(objDate.getMonth() + 1).padStart(2, '0')}`;
            
            if (!meses[mesObj]) meses[mesObj] = { pres: 0, cerr: 0, pend: 0 };
            
            meses[mesObj].pres += 1;

            if (d.estado === 'Cerrado') {
                const mesCierre = d._fechaCierre ? `${d._fechaCierre.getFullYear()}-${String(d._fechaCierre.getMonth() + 1).padStart(2, '0')}` : mesObj;
                if (mesCierre === mesObj) {
                    meses[mesObj].cerr += 1;
                } else if (mesCierre < mesObj) {
                    // Cerrado anticipadamente
                    const mesReal = `${d._fechaCierre!.getFullYear()}-${String(d._fechaCierre!.getMonth() + 1).padStart(2, '0')}`;
                    if (!meses[mesReal]) meses[mesReal] = { pres: 0, cerr: 0, pend: 0 };
                    meses[mesReal].cerr += 1;
                    meses[mesObj].pres -= 1; // Ajuste
                }
            } else {
                meses[mesObj].pend += 1;
            }
        });

        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        return Object.entries(meses).sort().map(([mesKey, vals]) => {
            const [year, monthStr] = mesKey.split('-');
            const monthIdx = parseInt(monthStr, 10) - 1;
            const mesLabel = monthNames[monthIdx] || mesKey;
            return {
                mes: mesLabel, 
                'Presupuesto': Math.max(0, vals.pres), 
                'Cerradas': vals.cerr, 
                'Pendientes': vals.pend,
                Cumplimiento: vals.pres > 0 ? ((vals.cerr / vals.pres) * 100).toFixed(1) : 0
            };
        });
    }, [data]);

    // Export Excel
    const exportToExcel = () => {
        const rows = exportData.map(d => ({
            'Número Radicado': d.consecutivo,
            'Fecha Registro': new Date(d.created_at).toLocaleDateString(),
            'Cliente': d.cliente_final_nombre || d.cliente_nombre,
            'Canal': d.canal_venta,
            'Tipo Solicitud': d.tipo_solicitud,
            'Responsable': d.Usuarios?.nombres ? `${d.Usuarios.nombres} ${d.Usuarios.apellidos}` : 'N/A',
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
        if (!searchTerm) return data;
        return data.filter(d => 
            d.consecutivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (d.cliente_final_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (d.cliente_nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data, searchTerm]);

    const KpiCard = ({ title, value, prefix = '', suffix = '', subtitle = '' }: any) => (
        <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{title}</h3>
            <div className="text-xl font-black text-gray-800">
                {prefix}{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}{suffix}
            </div>
            {subtitle && <div className="mt-1 text-[10px] font-medium text-gray-400">{subtitle}</div>}
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header: Semáforo */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${semaforoColor} animate-pulse`} />
                    <span className="text-sm font-black uppercase tracking-widest text-gray-800">Estado Operativo: {semaforoTexto}</span>
                </div>
                <div className="text-xs font-bold text-gray-500">
                    Cumplimiento: {porcCumplimiento.toFixed(1)}% | Riesgo: {porcRiesgo.toFixed(1)}%
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
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

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider">Cumplimiento (≤ 15 días)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={cumplimientoData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                                    {cumplimientoData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <RechartsTooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider">Presupuesto de Cierre</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={presupuestoData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <RechartsTooltip />
                                <Legend />
                                <Bar dataKey="Presupuesto" fill={COLORS.brandLight} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Cerradas" fill={COLORS.brand} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Tabla Detalle */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Detalle Operativo</h3>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input 
                                type="text"
                                placeholder="Buscar radicado, cliente..."
                                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs w-64 focus:outline-none focus:ring-2 focus:ring-brand"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
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
                            <tr>
                                <th className="p-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200">Radicado</th>
                                <th className="p-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200">Fecha</th>
                                <th className="p-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200">Cliente</th>
                                <th className="p-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200">Canal</th>
                                <th className="p-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200">Estado</th>
                                <th className="p-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200">Agente</th>
                                <th className="p-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200 text-center">Días</th>
                                <th className="p-3 text-[10px] font-black uppercase text-gray-500 border-b border-gray-200">Riesgo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {exportData.slice(0, 50).map((d, i) => ( // Limite visual a 50
                                <tr key={i} className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                                    <td className="p-3 text-xs font-bold text-brand">{d.consecutivo}</td>
                                    <td className="p-3 text-xs text-gray-600">{new Date(d.created_at).toLocaleDateString()}</td>
                                    <td className="p-3 text-xs font-medium text-gray-800 max-w-[200px] truncate">{d.cliente_final_nombre || d.cliente_nombre || 'N/A'}</td>
                                    <td className="p-3 text-xs text-gray-600">{d.canal_venta}</td>
                                    <td className="p-3 text-xs text-gray-600">
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
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {exportData.length > 50 && (
                        <div className="p-4 text-center text-xs text-gray-500 bg-gray-50">
                            Mostrando los primeros 50 registros. Utilice la exportación a Excel para ver los {exportData.length} registros completos.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
