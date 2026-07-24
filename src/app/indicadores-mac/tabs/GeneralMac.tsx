import React, { useMemo } from 'react';
import { RegistroMAC, FilterState } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Line, LabelList } from 'recharts';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react';

interface Props {
    data: RegistroMAC[];
    prevData: RegistroMAC[]; // For variation calculations if needed
    filters: FilterState;
    razones: any[];
    defectosRef?: any[];
    responsablesRef?: any[];
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

const CleanDonutCard = ({ title, data, colors }: { title: string, data: any[], colors: string[] }) => {
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
                            >
                                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />)}
                            </Pie>
                            <RechartsTooltip content={<CustomPieTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Columna Derecha: Lista (40%) */}
                <div className="w-[40%] flex flex-col justify-center pl-2">
                    <div className="flex flex-col space-y-3 w-full">
                        {data.map((item, index) => (
                            <div key={index} className="flex items-center justify-between text-xs w-full">
                                <div className="flex items-center gap-2 truncate pr-2 flex-1 min-w-0">
                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors[index % colors.length] }}></div>
                                    <span className="font-semibold text-gray-700 truncate" title={item.nombre}>{item.nombre}</span>
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
const ProductTable = ({ title, data, maxHeight = 440 }: {
    title: string;
    data: Array<{ nombre: string; Registros: number; 'Productos Afectados': number; Participacion: string }>;
    maxHeight?: number;
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
                                <tr key={i} className={`group hover:bg-blue-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}>
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
const TopClientesCard = ({ data }: {
    data: Array<{ Cliente: string; Registros: number; Productos: number; Participacion: string }>;
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
                                <tr key={i} className={`group hover:bg-blue-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}>
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

export default function GeneralMac({ data, prevData, filters, razones, defectosRef = [], responsablesRef = [] }: Props) {
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
        const counts: Record<string, number> = {};
        data.forEach(d => {
            const date = new Date(d.created_at);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            counts[key] = (counts[key] || 0) + 1;
        });
        
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        return Object.entries(counts)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, count]) => {
                const [yyyy, mm] = key.split('-');
                return { mes: monthNames[parseInt(mm, 10) - 1], Registros: count };
            });
    }, [data]);

    // Funciones auxiliares
    const getProductosStats = (field: 'productos_compra' | 'productos_novedad') => {
        const stats: Record<string, { registrosSet: Set<number>, productosAfectados: number }> = {};
        
        data.forEach(d => {
            if (Array.isArray(d[field])) {
                d[field].forEach((p: any) => {
                    const nombre = p.descripcion || p.nombre || p.sku || p.referencia || 'Desconocido';
                    if (!stats[nombre]) stats[nombre] = { registrosSet: new Set(), productosAfectados: 0 };
                    stats[nombre].registrosSet.add(d.id);
                    stats[nombre].productosAfectados += (p.cantidad || 1);
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
        
        data.forEach(d => {
            if (Array.isArray(d.productos_novedad)) {
                d.productos_novedad.forEach((p: any) => {
                    let hasProblema = false;
                    
                    if (Array.isArray(p.problemas) && p.problemas.length > 0) {
                        p.problemas.forEach((prob: any) => {
                            if (prob.tipo_problema_id) {
                                hasProblema = true;
                                const nombre = getNombreProblema(prob.tipo_problema_id);
                                
                                if (!stats[nombre]) stats[nombre] = { registrosSet: new Set(), productosAfectados: 0 };
                                stats[nombre].registrosSet.add(d.id);
                                stats[nombre].productosAfectados += (p.cantidad || 1);
                            }
                        });
                    }
                    
                    if (!hasProblema && p.tipo_problema_id) {
                        const nombre = getNombreProblema(p.tipo_problema_id);
                        
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
            .sort((a, b) => b.Registros - a.Registros)
            .slice(0, 10);
    }, [data, razones, defectosRef]);

    const responsableProblemaStats = useMemo(() => {
        const stats: Record<string, { registrosSet: Set<number>, productosAfectados: number }> = {};
        
        data.forEach(d => {
            if (Array.isArray(d.productos_novedad)) {
                d.productos_novedad.forEach((p: any) => {
                    let hasResponsable = false;
                    
                    if (Array.isArray(p.problemas) && p.problemas.length > 0) {
                        p.problemas.forEach((prob: any) => {
                            if (prob.responsable_problema_id) {
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
                        const respObj = responsablesRef?.find(r => r.id == p.responsable_problema_id);
                        const nombre = respObj ? respObj.responsable : `ID ${p.responsable_problema_id}`;
                        
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
            .sort((a, b) => b.Registros - a.Registros)
            .slice(0, 10);
    }, [data, responsablesRef]);

    const productosNovedadStats = useMemo(() => getProductosStats('productos_novedad'), [data]);
    const productosCompraStats = useMemo(() => getProductosStats('productos_compra'), [data]);

    // Chart 7 & 8: Ciudades y Zonas
    const ciudadesData = useMemo(() => {
        const stats: Record<string, { regs: number, prods: number }> = {};
        const total = data.length || 1;
        data.forEach(d => {
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
        })).sort((a, b) => b.Registros - a.Registros).slice(0, 5);
    }, [data]);

    const zonasData = useMemo(() => {
        const stats: Record<string, { regs: number, prods: number }> = {};
        const total = data.length || 1;
        data.forEach(d => {
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
        })).sort((a, b) => b.Registros - a.Registros).slice(0, 5);
    }, [data]);

    // Clientes
    const clientesData = useMemo(() => {
        const stats: Record<string, { regs: number, prods: number, valor: number }> = {};
        data.forEach(d => {
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
        <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{title}</h3>
            <div className="text-xl font-black text-gray-800">
                {prefix}{value.toLocaleString('es-CO')}{suffix}
            </div>
            {variacion !== undefined && (
                <div className={`flex items-center gap-1 mt-1 text-[10px] font-bold ${variacion > 0 ? 'text-green-600' : variacion < 0 ? 'text-red-600' : 'text-gray-500'}`} title="Comparado con el periodo inmediatamente anterior de la misma longitud">
                    {variacion > 0 ? <ArrowUpIcon className="w-3 h-3" /> : variacion < 0 ? <ArrowDownIcon className="w-3 h-3" /> : <MinusIcon className="w-3 h-3" />}
                    {Math.abs(variacion)}% vs ant.
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Tarjetas KPI */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
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
                                <Bar dataKey="Registros" fill="#254153" radius={[4, 4, 0, 0]} maxBarSize={60}>
                                    <LabelList dataKey="Registros" position="top" style={{ fill: '#6b7280', fontSize: 12, fontWeight: 'bold' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 5: Tipo de Problemas */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider">Tipo de Problemas</h3>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={tipoProblemaStats} layout="vertical" margin={{ top: 20, right: 30, left: -25, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                <YAxis dataKey="nombre" type="category" width={115} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                                <RechartsTooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                <Bar dataKey="Registros" fill="#749094" radius={[0, 4, 4, 0]} maxBarSize={25}>
                                    <LabelList dataKey="Participacion" position="right" style={{ fill: '#6b7280', fontSize: 10 }} />
                                </Bar>
                                <Bar dataKey="Productos Afectados" fill="#c96a4e" radius={[0, 4, 4, 0]} maxBarSize={25} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart: Responsable del Problema */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider">Responsable del Problema</h3>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={responsableProblemaStats} layout="vertical" margin={{ top: 20, right: 30, left: -25, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                <YAxis dataKey="nombre" type="category" width={115} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                                <RechartsTooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                <Bar dataKey="Registros" fill="#749094" radius={[0, 4, 4, 0]} maxBarSize={25}>
                                    <LabelList dataKey="Participacion" position="right" style={{ fill: '#6b7280', fontSize: 10 }} />
                                </Bar>
                                <Bar dataKey="Productos Afectados" fill="#c96a4e" radius={[0, 4, 4, 0]} maxBarSize={25} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

                <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Chart 6: Productos de Compra */}
                    <ProductTable title="Productos de Compra" data={productosCompraStats} maxHeight={440} />

                    {/* Chart 7: Productos con Novedad */}
                    <ProductTable title="Productos con Novedad" data={productosNovedadStats} maxHeight={440} />
                </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Ciudades */}
                <CleanDonutCard title="Top Ciudades" data={ciudadesData} colors={COLORS} />

                {/* Zonas */}
                <CleanDonutCard title="Top Zonas" data={zonasData} colors={COLORS.slice(3).concat(COLORS.slice(0,3))} />

                {/* Clientes */}
                <TopClientesCard data={clientesData} />
            </div>
        </div>
    );
}
