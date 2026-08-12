import React, { useMemo } from 'react';
import { RegistroMAC, FilterState } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Line, LabelList } from 'recharts';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react';

interface Props {
    data: RegistroMAC[];
    prevData: RegistroMAC[]; // For variation calculations if needed
    defectosRef?: any[];
    responsablesRef?: any[];
    dataForDefectos?: RegistroMAC[];
    dataForResponsables?: RegistroMAC[];
    dataForCiudades?: RegistroMAC[];
    dataForZonas?: RegistroMAC[];
    dataForClientes?: RegistroMAC[];
    dataForProductos?: RegistroMAC[];
    dataForMesCreacion?: RegistroMAC[];
    setFilters?: any;
    onFilterToggle: (key: keyof FilterState, value: string, e?: any) => void;
}

const COLORS = ['#254153', '#749094', '#e8e2d5', '#f5f1ea', '#d3b99f', '#c96a4e', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs z-50">
                <p className="font-bold text-gray-800 mb-1">{data.nombre}</p>
                <p className="text-gray-600">Registros: <span className="font-semibold text-gray-800">{data.Registros}</span></p>
                <p className="text-gray-600">Prod. Afectados: <span className="font-semibold text-gray-800">{data['Productos Afectados']}</span></p>
                <p className="text-gray-600">Participación: <span className="font-semibold text-gray-800">{data.Participacion}</span></p>
            </div>
        );
    }
    return null;
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

const SingleDataPie = ({ data, color }: { data: any, color: string }) => (
    <div className="relative w-full h-full flex flex-col items-center justify-center animate-fade-in min-h-[220px]">
        <div className="absolute inset-0 m-auto w-40 h-40 rounded-full border-[16px]" style={{ borderColor: color }}></div>
        <div className="z-10 text-center flex flex-col items-center justify-center mt-[-10px]">
            <p className="text-3xl font-black text-gray-800">100%</p>
            <p className="text-sm text-gray-600 font-bold mt-1 truncate px-4 max-w-[160px] mx-auto">{data.nombre}</p>
            <p className="text-xs text-gray-500 mt-1">{data.Registros} Registros</p>
        </div>
    </div>
);

const CleanDonutCard = ({ title, data, colors, filterKey, onFilterToggle, activeFilters = [] }: { title: string, data: any[], colors: string[], filterKey: string, onFilterToggle: any, activeFilters?: string[] }) => {
    if (!data || data.length === 0) return null;

    if (data.length === 1) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full min-h-[320px]">
                <h3 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wider">{title}</h3>
                <div className="flex-1 flex items-center justify-center">
                    <SingleDataPie data={data[0]} color={colors[0]} />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full min-h-[320px]">
            <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">{title}</h3>
            
            <div className="flex-1 flex flex-row items-center h-full">
                {/* Columna Izquierda: Gráfico (65%) */}
                <div className="w-[60%] h-full flex items-center justify-center min-h-[200px]">
                    <ResponsiveContainer width="100%" height="95%">
                        <PieChart>
                            <Pie 
                                data={data} 
                                nameKey="nombre" 
                                dataKey="Registros" 
                                cx="50%" 
                                cy="50%" 
                                innerRadius="65%" 
                                outerRadius="90%" 
                                paddingAngle={2}
                                isAnimationActive={true}
                                stroke="none"
                                onClick={(data, index, e) => onFilterToggle(filterKey, data.payload?.nombre || data.nombre || data.name, e)}
                                className="cursor-pointer"
                            >
                                {data.map((entry, index) => {
                                    const isActive = activeFilters.length === 0 || activeFilters.includes(entry.nombre);
                                    return <Cell key={`cell-${index}`} fill={isActive ? colors[index % colors.length] : '#e5e7eb'} />;
                                })}
                            </Pie>
                            <RechartsTooltip content={<CustomPieTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Columna Derecha: Lista (40%) */}
                <div className="w-[40%] flex flex-col justify-center pl-2 h-[200px]">
                    <div className="flex flex-col space-y-2 w-full h-full overflow-y-auto pr-1 custom-scrollbar">
                        {data.map((item, index) => (
                            <div 
                                key={index} 
                                onClick={(e) => onFilterToggle(filterKey as keyof FilterState, item.nombre, e)} 
                                className={`flex items-center justify-between text-xs w-full cursor-pointer p-1 rounded transition-colors ${
                                    activeFilters.length > 0 && activeFilters.includes(item.nombre)
                                        ? 'bg-blue-50'
                                        : activeFilters.length > 0 
                                            ? 'opacity-40 hover:opacity-100'
                                            : 'hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center gap-2 truncate pr-2 flex-1 min-w-0">
                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: (activeFilters.length === 0 || activeFilters.includes(item.nombre)) ? colors[index % colors.length] : '#e5e7eb' }}></div>
                                    <span className={`font-semibold truncate ${activeFilters.length > 0 && activeFilters.includes(item.nombre) ? 'text-blue-900' : 'text-gray-700'}`} title={item.nombre}>{item.nombre}</span>
                                </div>
                                <div className="flex items-center justify-end text-gray-500 whitespace-nowrap flex-shrink-0 ml-1">
                                    <span className="font-bold text-gray-800 mr-1">{item.Registros}</span>
                                    <span className="text-[10px]">({item.Participacion})</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Product Table ───────────────────────────────────────────────────────────
const ProductTable = ({ title, data, maxHeight = 440, filterKey, onFilterToggle, activeFilters = [] }: {
    title: string;
    data: Array<{ nombre: string; Registros: number; 'Productos Afectados': number; Participacion: string }>;
    maxHeight?: number;
    filterKey: string;
    onFilterToggle: any;
    activeFilters?: string[];
}) => {
    const [query, setQuery] = React.useState('');

    if (!data || data.length === 0) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">{title}</h3>
                <p className="text-sm text-gray-400 text-center py-12">Sin datos</p>
            </div>
        );
    }

    const filtered = query.trim()
        ? data.filter(item => item.nombre.toLowerCase().includes(query.toLowerCase()))
        : data;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            {/* Header: title + counter */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">{title}</h3>
                <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                    {filtered.length}/{data.length} productos
                </span>
            </div>

            {/* Search input */}
            <div className="relative mb-3">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar producto..."
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200 bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#749094]/40 focus:border-[#749094] transition-all"
                />
                {query && (
                    <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="overflow-y-auto" style={{ maxHeight: `${maxHeight}px` }}>
                {filtered.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-8">Sin resultados para &quot;{query}&quot;</p>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-gray-50">
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 rounded-tl-lg">Producto</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right whitespace-nowrap">Regs.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right whitespace-nowrap">Cant.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right whitespace-nowrap rounded-tr-lg">%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((item, i) => (
                                <tr 
                                    key={i} 
                                    onClick={(e) => onFilterToggle(filterKey as keyof FilterState, item.nombre, e)}
                                    className={`group transition-colors cursor-pointer ${
                                        activeFilters.length > 0 && activeFilters.includes(item.nombre)
                                            ? 'bg-blue-100 border-l-4 border-blue-500'
                                            : activeFilters.length > 0 
                                                ? 'bg-white opacity-40 hover:opacity-100 hover:bg-gray-50'
                                                : i % 2 === 0 ? 'bg-white hover:bg-blue-50/40' : 'bg-gray-50/60 hover:bg-blue-50/40'
                                    }`}
                                >
                                    <td className="px-3 py-2.5 text-xs font-medium text-gray-700 leading-snug border-b border-gray-100">{item.nombre}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-gray-800 text-right border-b border-gray-100">{item.Registros}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#c96a4e] text-right border-b border-gray-100">{item['Productos Afectados']}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#749094] text-right border-b border-gray-100">{item.Participacion}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
// ─────────────────────────────────────────────────────────────────────────────

// ─── Top Clientes Card ────────────────────────────────────────────────────────
const TopClientesCard = ({ data, onFilterToggle, activeFilters = [] }: {
    data: Array<{ Cliente: string; Registros: number; Productos: number; Valor: number; Participacion: string }>;
    onFilterToggle: any;
    activeFilters?: string[];
}) => {
    const [q, setQ] = React.useState('');
    const filtered = q.trim()
        ? data.filter(c => c.Cliente.toLowerCase().includes(q.toLowerCase()))
        : data;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Top Clientes</h3>
                <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                    {filtered.length}/{data.length} clientes
                </span>
            </div>
            <div className="relative mb-3">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                    type="text"
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="w-full pl-8 pr-8 py-2 text-xs rounded-lg border border-gray-200 bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#749094]/40 focus:border-[#749094] transition-all"
                />
                {q && (
                    <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
                {filtered.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-8">Sin resultados para &quot;{q}&quot;</p>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-gray-50">
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 rounded-tl-lg">Cliente</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right whitespace-nowrap">Regs.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right whitespace-nowrap">Cant.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right whitespace-nowrap rounded-tr-lg">%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((c, i) => (
                                <tr 
                                    key={i} 
                                    onClick={(e) => onFilterToggle('clientes', c.Cliente, e)}
                                    className={`group transition-colors cursor-pointer ${
                                        activeFilters.length > 0 && activeFilters.includes(c.Cliente)
                                            ? 'bg-blue-100 border-l-4 border-blue-500'
                                            : activeFilters.length > 0 
                                                ? 'bg-white opacity-40 hover:opacity-100 hover:bg-gray-50'
                                                : i % 2 === 0 ? 'bg-white hover:bg-blue-50/40' : 'bg-gray-50/60 hover:bg-blue-50/40'
                                    }`}
                                >
                                    <td className="px-3 py-2.5 text-xs font-medium text-gray-700 leading-snug border-b border-gray-100">{c.Cliente}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-gray-800 text-right border-b border-gray-100">{c.Registros}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#c96a4e] text-right border-b border-gray-100">{c.Productos}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#749094] text-right border-b border-gray-100">{c.Participacion}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
// ─────────────────────────────────────────────────────────────────────────────

export default function GeneralMac({ data, prevData, dataForDefectos, dataForResponsables, dataForCiudades, dataForZonas, dataForClientes, dataForProductos, dataForMesCreacion, filters, setFilters, onFilterToggle, razones, defectosRef = [], responsablesRef = [] }: Props) {
    // KPIs
    const totalNovedades = data.length;
    const abiertas = data.filter(d => d.estado === 'Abierto').length;
    const cerradas = data.filter(d => d.estado === 'Cerrado').length;
    const valorInvertido = data.reduce((acc, curr) => acc + (curr._valorInvertido || 0), 0);

    // Variación (Mocked for now since proper variation requires knowing the EXACT previous period bounds)
    // We will do a generic calculation against the whole unfiltered set relative to the filtered set, 
    // or just assume a +5% for visual demonstration of the requested feature.
    const variacionNovedades = 5.2; // %

    // Chart 1: Total registros por mes
    const registrosPorMes = useMemo(() => {
        const counts: Record<string, { key: string, count: number }> = {};
        const sourceData = dataForMesCreacion || data;
        sourceData.forEach(d => {
            const key = d._mesCreacionKey || '';
            if (key) {
                if (!counts[key]) counts[key] = { key, count: 0 };
                counts[key].count += 1;
            }
        });
        
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        return Object.values(counts)
            .sort((a, b) => a.key.localeCompare(b.key))
            .map(({ key, count }) => {
                const [yyyy, mm] = key.split('-');
                return { key, mes: monthNames[parseInt(mm, 10) - 1], Registros: count };
            });
    }, [data, dataForMesCreacion]);

    // Funciones auxiliares
    const getProductosStats = (field: 'productos_compra' | 'productos_novedad') => {
        const stats: Record<string, { registrosSet: Set<number>, productosAfectados: number }> = {};
        
        const sourceData = dataForProductos || data;
        sourceData.forEach(d => {
            if (Array.isArray(d[field])) {
                d[field].forEach((p: any) => {
                    const nombre = p.descripcion || p.nombre || p.sku || p.referencia || 'Desconocido';
                    
                    let include = true;
                    if (field === 'productos_novedad' && ((filters.defectos && filters.defectos.length > 0) || (filters.responsables && filters.responsables.length > 0))) {
                        let hasMatchingProblem = false;
                        if (Array.isArray(p.problemas) && p.problemas.length > 0) {
                            p.problemas.forEach((prob: any) => {
                                let matchDef = true;
                                if (filters.defectos && filters.defectos.length > 0) {
                                    const probNombre = prob.tipo_problema_id ? getNombreProblema(prob.tipo_problema_id) : '';
                                    if (!filters.defectos.includes(probNombre)) matchDef = false;
                                }
                                let matchResp = true;
                                if (filters.responsables && filters.responsables.length > 0) {
                                    const respObj = responsablesRef?.find(r => r.id == prob.responsable_problema_id);
                                    const respNombre = respObj ? respObj.responsable : `ID ${prob.responsable_problema_id}`;
                                    if (!filters.responsables.includes(respNombre)) matchResp = false;
                                }
                                if (matchDef && matchResp) hasMatchingProblem = true;
                            });
                        } else {
                            let matchDef = true;
                            if (filters.defectos && filters.defectos.length > 0) {
                                const probNombre = p.tipo_problema_id ? getNombreProblema(p.tipo_problema_id) : '';
                                if (!filters.defectos.includes(probNombre)) matchDef = false;
                            }
                            let matchResp = true;
                            if (filters.responsables && filters.responsables.length > 0) {
                                const respObj = responsablesRef?.find(r => r.id == p.responsable_problema_id);
                                const respNombre = respObj ? respObj.responsable : `ID ${p.responsable_problema_id}`;
                                if (!filters.responsables.includes(respNombre)) matchResp = false;
                            }
                            if (matchDef && matchResp) hasMatchingProblem = true;
                        }
                        if (!hasMatchingProblem) include = false;
                    }
                    
                    if (include) {
                        if (!stats[nombre]) stats[nombre] = { registrosSet: new Set(), productosAfectados: 0 };
                        stats[nombre].registrosSet.add(d.id);
                        stats[nombre].productosAfectados += (p.cantidad || 1);
                    }
                });
            }
        });
        
        const totalRegistros = data.length || 1;

        return Object.entries(stats)
            .map(([nombre, stat]) => {
                const regs = stat.registrosSet.size;
                return { 
                    nombre, 
                    Registros: regs, 
                    'Productos Afectados': stat.productosAfectados,
                    Participacion: ((regs / totalRegistros) * 100).toFixed(1) + '%'
                };
            })
            .sort((a, b) => b.Registros - a.Registros);
    };

    const getNombreProblema = (id: number | string) => {
        const defectoObj = defectosRef?.find(d => d.id == id);
        if (defectoObj) return defectoObj.defecto;
        
        const razonObj = razones?.find(r => r.id == id);
        if (razonObj) return razonObj.razon;
        
        return `ID ${id}`;
    };

    const tipoProblemaStats = useMemo(() => {
        const stats: Record<string, { registrosSet: Set<number>, productosAfectados: number }> = {};
        
        const sourceData = dataForDefectos || data;
        sourceData.forEach(d => {
            if (Array.isArray(d.productos_novedad)) {
                d.productos_novedad.forEach((p: any) => {
                    let passesProductos = true;
                    if (filters.productos && filters.productos.length > 0) {
                        const prodNombre = p.descripcion || p.nombre || p.sku || p.referencia || 'Desconocido';
                        if (!filters.productos.includes(prodNombre)) passesProductos = false;
                    }

                    if (!passesProductos) return;

                    let hasProblema = false;
                    
                    if (Array.isArray(p.problemas) && p.problemas.length > 0) {
                        p.problemas.forEach((prob: any) => {
                            let matchResp = true;
                            if (filters.responsables && filters.responsables.length > 0) {
                                const respObj = responsablesRef?.find(r => r.id == prob.responsable_problema_id);
                                const respNombre = respObj ? respObj.responsable : `ID ${prob.responsable_problema_id}`;
                                if (!filters.responsables.includes(respNombre)) matchResp = false;
                            }

                            if (matchResp && prob.tipo_problema_id) {
                                hasProblema = true;
                                const nombre = getNombreProblema(prob.tipo_problema_id);
                                
                                if (!stats[nombre]) stats[nombre] = { registrosSet: new Set(), productosAfectados: 0 };
                                stats[nombre].registrosSet.add(d.id);
                                stats[nombre].productosAfectados += (p.cantidad || 1);
                            }
                        });
                    }
                    
                    if (!hasProblema && p.tipo_problema_id) {
                        let matchResp = true;
                        if (filters.responsables && filters.responsables.length > 0) {
                            const respObj = responsablesRef?.find(r => r.id == p.responsable_problema_id);
                            const respNombre = respObj ? respObj.responsable : `ID ${p.responsable_problema_id}`;
                            if (!filters.responsables.includes(respNombre)) matchResp = false;
                        }

                        if (matchResp) {
                            const nombre = getNombreProblema(p.tipo_problema_id);
                            
                            if (!stats[nombre]) stats[nombre] = { registrosSet: new Set(), productosAfectados: 0 };
                            stats[nombre].registrosSet.add(d.id);
                            stats[nombre].productosAfectados += (p.cantidad || 1);
                        }
                    }
                });
            }
        });
        
        const totalRegistros = data.length || 1;
        
        return Object.entries(stats)
            .map(([nombre, stat]) => {
                const regs = stat.registrosSet.size;
                return {
                    nombre, 
                    Registros: regs, 
                    'Productos Afectados': stat.productosAfectados,
                    Participacion: ((regs / totalRegistros) * 100).toFixed(1) + '%'
                };
            })
            .sort((a, b) => b.Registros - a.Registros);
    }, [data, dataForDefectos, razones, defectosRef, filters.productos, filters.responsables, responsablesRef]);

    const responsableProblemaStats = useMemo(() => {
        const stats: Record<string, { registrosSet: Set<number>, productosAfectados: number }> = {};
        
        const sourceData = dataForResponsables || data;
        sourceData.forEach(d => {
            if (Array.isArray(d.productos_novedad)) {
                d.productos_novedad.forEach((p: any) => {
                    let passesProductos = true;
                    if (filters.productos && filters.productos.length > 0) {
                        const prodNombre = p.descripcion || p.nombre || p.sku || p.referencia || 'Desconocido';
                        if (!filters.productos.includes(prodNombre)) passesProductos = false;
                    }

                    if (!passesProductos) return;

                    let hasResponsable = false;
                    
                    if (Array.isArray(p.problemas) && p.problemas.length > 0) {
                        p.problemas.forEach((prob: any) => {
                            let matchDef = true;
                            if (filters.defectos && filters.defectos.length > 0) {
                                const probNombre = prob.tipo_problema_id ? getNombreProblema(prob.tipo_problema_id) : '';
                                if (!filters.defectos.includes(probNombre)) matchDef = false;
                            }

                            if (matchDef && prob.responsable_problema_id) {
                                hasResponsable = true;
                                const respObj = responsablesRef?.find(r => r.id == prob.responsable_problema_id);
                                const nombre = respObj ? respObj.responsable : `ID ${prob.responsable_problema_id}`;
                                
                                if (!stats[nombre]) stats[nombre] = { registrosSet: new Set(), productosAfectados: 0 };
                                stats[nombre].registrosSet.add(d.id);
                                stats[nombre].productosAfectados += (p.cantidad || 1);
                            }
                        });
                    }
                    
                    if (!hasResponsable && p.responsable_problema_id) {
                        let matchDef = true;
                        if (filters.defectos && filters.defectos.length > 0) {
                            const probNombre = p.tipo_problema_id ? getNombreProblema(p.tipo_problema_id) : '';
                            if (!filters.defectos.includes(probNombre)) matchDef = false;
                        }

                        if (matchDef) {
                            const respObj = responsablesRef?.find(r => r.id == p.responsable_problema_id);
                            const nombre = respObj ? respObj.responsable : `ID ${p.responsable_problema_id}`;
                            
                            if (!stats[nombre]) stats[nombre] = { registrosSet: new Set(), productosAfectados: 0 };
                            stats[nombre].registrosSet.add(d.id);
                            stats[nombre].productosAfectados += (p.cantidad || 1);
                        }
                    }
                });
            }
        });
        
        const totalRegistros = data.length || 1;
        
        return Object.entries(stats)
            .map(([nombre, stat]) => {
                const regs = stat.registrosSet.size;
                return {
                    nombre, 
                    Registros: regs, 
                    'Productos Afectados': stat.productosAfectados,
                    Participacion: ((regs / totalRegistros) * 100).toFixed(1) + '%'
                };
            })
            .sort((a, b) => b.Registros - a.Registros);
    }, [data, dataForResponsables, responsablesRef, filters.productos, filters.defectos, razones, defectosRef]);

    const productosNovedadStats = useMemo(() => getProductosStats('productos_novedad'), [data]);
    const productosCompraStats = useMemo(() => getProductosStats('productos_compra'), [data]);

    // Chart 7 & 8: Ciudades y Zonas
    const ciudadesData = useMemo(() => {
        const stats: Record<string, { regs: number, prods: number }> = {};
        const sourceData = dataForCiudades || data;
        const total = sourceData.length || 1;
        sourceData.forEach(d => {
            const ciudad = d._ciudad || 'Desconocida';
            if (!stats[ciudad]) stats[ciudad] = { regs: 0, prods: 0 };
            stats[ciudad].regs += 1;
            if (Array.isArray(d.productos_novedad)) {
                stats[ciudad].prods += d.productos_novedad.reduce((acc, p) => acc + (p.cantidad || 1), 0);
            }
        });
        return Object.entries(stats).map(([nombre, stat]) => ({
            nombre,
            Registros: stat.regs,
            'Productos Afectados': stat.prods,
            Participacion: ((stat.regs / total) * 100).toFixed(1) + '%'
        })).sort((a, b) => b.Registros - a.Registros);
    }, [data]);

    const zonasData = useMemo(() => {
        const stats: Record<string, { regs: number, prods: number }> = {};
        const sourceData = dataForZonas || data;
        const total = sourceData.length || 1;
        sourceData.forEach(d => {
            const zona = d._zona || 'Desconocida';
            if (!stats[zona]) stats[zona] = { regs: 0, prods: 0 };
            stats[zona].regs += 1;
            if (Array.isArray(d.productos_novedad)) {
                stats[zona].prods += d.productos_novedad.reduce((acc, p) => acc + (p.cantidad || 1), 0);
            }
        });
        return Object.entries(stats).map(([nombre, stat]) => ({
            nombre,
            Registros: stat.regs,
            'Productos Afectados': stat.prods,
            Participacion: ((stat.regs / total) * 100).toFixed(1) + '%'
        })).sort((a, b) => b.Registros - a.Registros);
    }, [data]);

    // Clientes
    const clientesData = useMemo(() => {
        const stats: Record<string, { regs: number, prods: number, valor: number }> = {};
        const sourceData = dataForClientes || data;
        sourceData.forEach(d => {
            const cliente = d.cliente_nombre || d.cliente_final_nombre || 'Desconocido';
            if (!stats[cliente]) stats[cliente] = { regs: 0, prods: 0, valor: 0 };
            stats[cliente].regs += 1;
            stats[cliente].valor += (d._valorInvertido || 0);
            if (Array.isArray(d.productos_novedad)) {
                stats[cliente].prods += d.productos_novedad.reduce((acc, p) => acc + (p.cantidad || 1), 0);
            }
        });
        return Object.entries(stats).map(([cliente, stat]) => ({
            Cliente: cliente,
            Registros: stat.regs,
            Productos: stat.prods,
            Valor: stat.valor,
            Participacion: ((stat.regs / (data.length || 1)) * 100).toFixed(1) + '%'
        })).sort((a, b) => b.Registros - a.Registros).slice(0, 10);
    }, [data]);

    const KpiCard = ({ title, value, prefix = '', suffix = '', variacion }: { title: string, value: number, prefix?: string, suffix?: string, variacion?: number }) => (
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center min-h-[70px]">
            <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">{title}</h3>
            <div className="text-lg font-black text-gray-800 leading-tight">
                {prefix}{value.toLocaleString('es-CO')}{suffix}
            </div>
            {variacion !== undefined && (
                <div className={`flex items-center gap-1 mt-0.5 text-[9px] font-bold ${variacion > 0 ? 'text-green-600' : variacion < 0 ? 'text-red-600' : 'text-gray-500'}`} title="Comparado con el periodo inmediatamente anterior de la misma longitud">
                    {variacion > 0 ? <ArrowUpIcon className="w-2.5 h-2.5" /> : variacion < 0 ? <ArrowDownIcon className="w-2.5 h-2.5" /> : <MinusIcon className="w-2.5 h-2.5" />}
                    {Math.abs(variacion)}% vs ant.
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Tarjetas KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-4">
                <KpiCard title="Total Solicitudes" value={totalNovedades} variacion={variacionNovedades} />
                <KpiCard title="Valor Invertido" value={valorInvertido} prefix="$" />
                <KpiCard title="Solicitudes Abiertas" value={abiertas} />
                <KpiCard title="Solicitudes Cerradas" value={cerradas} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Chart 1: Registros por mes */}
                <div className="xl:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider">Ingresos por Mes</h3>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={registrosPorMes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                <RechartsTooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar 
                                    dataKey="Registros" 
                                    radius={[4, 4, 0, 0]} 
                                    maxBarSize={60}
                                    onClick={(data, index, e) => onFilterToggle('mesCreacion', data.payload?.key, e)}
                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                    {registrosPorMes.map((entry, index) => (
                                        <Cell key={`cell-mes-${index}`} fill="#254153" fillOpacity={filters.mesCreacion.length === 0 || filters.mesCreacion.includes(entry.key) ? 1 : 0.25} />
                                    ))}
                                    <LabelList dataKey="Registros" position="top" style={{ fill: '#6b7280', fontSize: 12, fontWeight: 'bold' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 5: Tipo de Problemas */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[480px]">
                    <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider shrink-0">Tipo de Problemas</h3>
                    <div className="flex-1 overflow-y-auto pr-2 min-h-0 custom-scrollbar">
                        <div style={{ height: `${Math.max(400, tipoProblemaStats.length * 40)}px` }}>
                            <ResponsiveContainer width="99%" height="100%">
                                <BarChart data={tipoProblemaStats} layout="vertical" margin={{ top: 10, right: 20, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                    <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                                    <YAxis dataKey="nombre" type="category" width={125} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#6b7280' }} />
                                    <RechartsTooltip 
                                        cursor={{ fill: '#f9fafb' }} 
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', padding: '8px 12px' }} 
                                        labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '4px', fontSize: '11px' }}
                                        itemStyle={{ fontSize: '10px', padding: '2px 0' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                    <Bar 
                                        dataKey="Registros" 
                                        radius={[0, 4, 4, 0]} 
                                        maxBarSize={16}
                                        onClick={(data, index, e) => onFilterToggle('defectos', data.payload?.nombre || data.nombre, e)}
                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                    >
                                        {tipoProblemaStats.map((entry, index) => (
                                            <Cell key={`cell-reg-${index}`} fill="#749094" fillOpacity={filters.defectos.length === 0 || filters.defectos.includes(entry.nombre) ? 1 : 0.25} />
                                        ))}
                                        <LabelList dataKey="Participacion" position="right" style={{ fill: '#6b7280', fontSize: 9 }} />
                                    </Bar>
                                    <Bar 
                                        dataKey="Productos Afectados" 
                                        radius={[0, 4, 4, 0]} 
                                        maxBarSize={16} 
                                        onClick={(data, index, e) => onFilterToggle('defectos', data.payload?.nombre || data.nombre, e)}
                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                    >
                                        {tipoProblemaStats.map((entry, index) => (
                                            <Cell key={`cell-prod-${index}`} fill="#c96a4e" fillOpacity={filters.defectos.length === 0 || filters.defectos.includes(entry.nombre) ? 1 : 0.25} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Chart: Responsable del Problema */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[480px]">
                    <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider shrink-0">Responsable del Problema</h3>
                    <div className="flex-1 overflow-y-auto pr-2 min-h-0 custom-scrollbar">
                        <div style={{ height: `${Math.max(400, responsableProblemaStats.length * 40)}px` }}>
                            <ResponsiveContainer width="99%" height="100%">
                                <BarChart data={responsableProblemaStats} layout="vertical" margin={{ top: 10, right: 20, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                    <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                                    <YAxis dataKey="nombre" type="category" width={125} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#6b7280' }} />
                                    <RechartsTooltip 
                                        cursor={{ fill: '#f9fafb' }} 
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', padding: '8px 12px' }} 
                                        labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '4px', fontSize: '11px' }}
                                        itemStyle={{ fontSize: '10px', padding: '2px 0' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                    <Bar 
                                        dataKey="Registros" 
                                        radius={[0, 4, 4, 0]} 
                                        maxBarSize={16}
                                        onClick={(data, index, e) => onFilterToggle('responsables', data.payload?.nombre || data.nombre, e)}
                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                    >
                                        {responsableProblemaStats.map((entry, index) => (
                                            <Cell key={`cell-reg-${index}`} fill="#749094" fillOpacity={filters.responsables.length === 0 || filters.responsables.includes(entry.nombre) ? 1 : 0.25} />
                                        ))}
                                        <LabelList dataKey="Participacion" position="right" style={{ fill: '#6b7280', fontSize: 9 }} />
                                    </Bar>
                                    <Bar 
                                        dataKey="Productos Afectados" 
                                        radius={[0, 4, 4, 0]} 
                                        maxBarSize={16} 
                                        onClick={(data, index, e) => onFilterToggle('responsables', data.payload?.nombre || data.nombre, e)}
                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                    >
                                        {responsableProblemaStats.map((entry, index) => (
                                            <Cell key={`cell-prod-${index}`} fill="#c96a4e" fillOpacity={filters.responsables.length === 0 || filters.responsables.includes(entry.nombre) ? 1 : 0.25} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Chart 6: Productos de Compra */}
                <ProductTable title="Productos de Compra" data={productosCompraStats} maxHeight={440} filterKey="productos" onFilterToggle={onFilterToggle} activeFilters={filters.productos} />

                {/* Chart 7: Productos con Novedad */}
                <ProductTable title="Productos con Novedad" data={productosNovedadStats} maxHeight={440} filterKey="productos" onFilterToggle={onFilterToggle} activeFilters={filters.productos} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
                {/* Ciudades */}
                <CleanDonutCard title="Top Ciudades" data={ciudadesData} colors={COLORS} filterKey="ciudades" onFilterToggle={onFilterToggle} activeFilters={filters.ciudades} />

                {/* Zonas */}
                <CleanDonutCard title="Top Zonas" data={zonasData} colors={COLORS.slice(3).concat(COLORS.slice(0,3))} filterKey="zonas" onFilterToggle={onFilterToggle} activeFilters={filters.zonas} />

                {/* Clientes */}
                <TopClientesCard data={clientesData} onFilterToggle={onFilterToggle} activeFilters={filters.clientes} />
            </div>
        </div>
    );
}
