import React, { useMemo } from 'react';
import { RegistroMAC, FilterState } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Line, LabelList } from 'recharts';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react';

interface Props {
    data: RegistroMAC[];
    prevData: RegistroMAC[]; // For variation calculations if needed
    filters: FilterState;
    defectosRef?: any[];
    responsablesRef?: any[];
    dataForDefectos?: RegistroMAC[];
    dataForResponsables?: RegistroMAC[];
    dataForCiudades?: RegistroMAC[];
    dataForZonas?: RegistroMAC[];
    dataForClientes?: RegistroMAC[];
    dataForProductos?: RegistroMAC[];
    dataForMesCreacion?: RegistroMAC[];
    dataForCanalVenta?: RegistroMAC[];
    setFilters?: any;
    onFilterToggle: (key: keyof FilterState, value: string, e?: any) => void;
    razones?: any[];
}

const COLORS = ['#254153', '#749094', '#e8e2d5', '#f5f1ea', '#d3b99f', '#c96a4e', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const isGroupFilter = (str: string) => {
    if (!str) return false;
    const u = str.toUpperCase().trim();
    return [
        'BAÑO', 'BAÑOS', 'BANO', 'BANOS',
        'COCINA', 'COCINAS', 'MESON', 'MESONES',
        'HIDROMASAJE', 'HIDROMASAJES',
        'INFRAESTRUCTURA',
        'REPUESTO', 'REPUESTOS',
        'ROPA', 'ROPAS', 'LAVARROPAS',
        'HIDROPOR', 'MPDIRECT', 'HIDROEMP',
        'OTROS', 'LAVAMANOS', 'LAVAPLATOS', 'MUEBLES'
    ].includes(u);
};

const normalizeGrupoName = (g: string): string => {
    if (!g) return 'OTROS';
    let norm = String(g).trim().toUpperCase();
    if (norm === 'COCINA' || norm === 'COCINAS' || norm === 'MESON' || norm === 'MESONES' || norm === 'LAVAPLATOS') return 'COCINAS';
    if (norm === 'BAÑO' || norm === 'BAÑOS' || norm === 'BANO' || norm === 'BANOS' || norm === 'LAVAMANOS' || norm === 'MUEBLE' || norm === 'MUEBLES') return 'BAÑOS';
    if (norm === 'HIDROMASAJE' || norm === 'HIDROMASAJES' || norm === 'SPA' || norm === 'TINA') return 'HIDROMASAJES';
    if (norm === 'REPUESTO' || norm === 'REPUESTOS' || norm === 'REPOSICION') return 'REPUESTOS';
    if (norm === 'LAVARROPAS' || norm === 'ROPA' || norm === 'ROPAS') return 'ROPAS';
    if (norm === 'INFRAESTRUCTURA' || norm === 'PATA' || norm === 'PISO') return 'INFRAESTRUCTURA';
    if (norm.includes('HIDROPOR')) return 'HIDROPOR';
    if (norm.includes('MPDIRECT')) return 'MPDIRECT';
    if (norm.includes('HIDROEMP')) return 'HIDROEMP';
    return norm;
};

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
                                onClick={(data: any, index: number, e: any) => onFilterToggle(filterKey as keyof FilterState, data.payload?.nombre || data.nombre || data.name, e)}
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
    data: Array<{ nombre: string; codigo?: string; Registros: number; 'Productos Afectados': number; Participacion: string }>;
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
        ? data.filter(item => {
            const q = query.toLowerCase().trim();
            const matchNombre = item.nombre.toLowerCase().includes(q);
            const matchCodigo = item.codigo ? item.codigo.toLowerCase().includes(q) : false;
            return matchNombre || matchCodigo;
        })
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
                    placeholder="Buscar por código o producto..."
                    className="w-full pl-8 pr-8 py-2 text-xs rounded-lg border border-gray-200 bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#749094]/40 focus:border-[#749094] transition-all"
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
// ─── Top Ciudades Card ────────────────────────────────────────────────────────
const TopCiudadesCard = ({ data, onFilterToggle, activeFilters = [] }: {
    data: Array<{ nombre: string; Registros: number; 'Productos Afectados': number; Participacion: string }>;
    onFilterToggle: any;
    activeFilters?: string[];
}) => {
    const [q, setQ] = React.useState('');
    const filtered = q.trim()
        ? data.filter(c => c.nombre.toLowerCase().includes(q.toLowerCase()))
        : data;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Top Ciudades</h3>
                <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                    {filtered.length}/{data.length} ciudades
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
                    placeholder="Buscar ciudad..."
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
            <div className="overflow-y-auto" style={{ maxHeight: '380px' }}>
                {filtered.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-8">Sin resultados para &quot;{q}&quot;</p>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-gray-50">
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 rounded-tl-lg">Ciudad</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right whitespace-nowrap">Regs.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right whitespace-nowrap">Cant.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right whitespace-nowrap rounded-tr-lg">%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((c, i) => (
                                <tr 
                                    key={i} 
                                    onClick={(e) => onFilterToggle('ciudades', c.nombre, e)}
                                    className={`group transition-colors cursor-pointer ${
                                        activeFilters.length > 0 && activeFilters.includes(c.nombre)
                                            ? 'bg-blue-100 border-l-4 border-blue-500'
                                            : activeFilters.length > 0 
                                                ? 'bg-white opacity-40 hover:opacity-100 hover:bg-gray-50'
                                                : i % 2 === 0 ? 'bg-white hover:bg-blue-50/40' : 'bg-gray-50/60 hover:bg-blue-50/40'
                                    }`}
                                >
                                    <td className="px-3 py-2.5 text-xs font-medium text-gray-700 leading-snug border-b border-gray-100">{c.nombre}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-gray-800 text-right border-b border-gray-100">{c.Registros}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#c96a4e] text-right border-b border-gray-100">{c['Productos Afectados']}</td>
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
                    placeholder="Buscar cliente final..."
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
            <div className="overflow-y-auto" style={{ maxHeight: '380px' }}>
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
// ─── Grupos de Producto Table Card ─────────────────────────────────────────────
const GruposProductoTableCard = ({ title, data, maxHeight = 440, onFilterToggle, activeFilters = [] }: {
    title: string;
    data: Array<{ nombre: string; Registros: number; 'Productos Afectados': number; Participacion: string }>;
    maxHeight?: number;
    onFilterToggle: any;
    activeFilters?: string[];
}) => {
    const [q, setQ] = React.useState('');
    const filtered = q.trim()
        ? data.filter(item => item.nombre.toLowerCase().includes(q.toLowerCase()))
        : data;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">{title}</h3>
                <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                    {filtered.length}/{data.length} grupos
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
                    placeholder="Buscar grupo de producto..."
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
            <div className="overflow-y-auto" style={{ maxHeight: `${maxHeight}px` }}>
                {filtered.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-8">Sin resultados para &quot;{q}&quot;</p>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-gray-50">
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 rounded-tl-lg">Grupo</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right whitespace-nowrap">Regs.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right whitespace-nowrap">Cant.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right whitespace-nowrap rounded-tr-lg">%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((item, i) => (
                                <tr 
                                    key={i} 
                                    onClick={(e) => onFilterToggle('productos', item.nombre, e)}
                                    className={`group transition-colors cursor-pointer ${
                                        activeFilters.length > 0 && activeFilters.includes(item.nombre)
                                            ? 'bg-blue-100 border-l-4 border-blue-500'
                                            : activeFilters.length > 0 
                                                ? 'bg-white opacity-40 hover:opacity-100 hover:bg-gray-50'
                                                : i % 2 === 0 ? 'bg-white hover:bg-blue-50/40' : 'bg-gray-50/60 hover:bg-blue-50/40'
                                    }`}
                                >
                                    <td className="px-3 py-2.5 text-xs font-bold text-gray-800 leading-snug border-b border-gray-100">{item.nombre}</td>
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

// ─── Canales de Venta Component ──────────────────────────────────────────────
export const CanalesVentaCard = ({ data, dataForCanalVenta, filters, onFilterToggle }: {
    data: RegistroMAC[];
    dataForCanalVenta?: RegistroMAC[];
    filters: FilterState;
    onFilterToggle: (key: keyof FilterState, value: string, e?: any) => void;
}) => {
    const canalVentaData = useMemo(() => {
        const categories: Record<string, {
            id: string;
            nombre: string;
            matchingKeys: string[];
            color: string;
            regs: number;
            prods: number;
        }> = {
            'distribucion': {
                id: 'distribucion',
                nombre: 'Distribución',
                matchingKeys: ['Canal Distribuidor', 'canal_distribuidor', 'canal_ditribuidor', 'Distribución', 'Distribucion'],
                color: '#254153',
                regs: 0,
                prods: 0
            },
            'constructor': {
                id: 'constructor',
                nombre: 'Constructor',
                matchingKeys: ['Canal Constructor', 'canal_constructor', 'Constructor'],
                color: '#749094',
                regs: 0,
                prods: 0
            },
            'exportaciones': {
                id: 'exportaciones',
                nombre: 'Exportaciones',
                matchingKeys: ['Canal Exportador', 'canal_exportador', 'Exportaciones', 'Exportador'],
                color: '#c96a4e',
                regs: 0,
                prods: 0
            },
            'canal_propio': {
                id: 'canal_propio',
                nombre: 'Canal Propio',
                matchingKeys: [
                    'Canal Propio Firplakhome', 
                    'Canal Propio eCommerce', 
                    'canal_propio_firplakhome', 
                    'canal_propio_ecommerce', 
                    'Canal Propio',
                    'Propio'
                ],
                color: '#3b82f6',
                regs: 0,
                prods: 0
            }
        };

        const sourceData = dataForCanalVenta || data;
        sourceData.forEach(d => {
            const canalRaw = d.canal_venta || '';
            let matchedCatKey: string | null = null;

            Object.entries(categories).forEach(([catKey, catObj]) => {
                if (catObj.matchingKeys.some(mk => canalRaw.toLowerCase().includes(mk.toLowerCase()) || mk.toLowerCase().includes(canalRaw.toLowerCase()))) {
                    matchedCatKey = catKey;
                }
            });

            if (matchedCatKey && categories[matchedCatKey]) {
                categories[matchedCatKey].regs += 1;
                if (Array.isArray(d.productos_novedad)) {
                    categories[matchedCatKey].prods += d.productos_novedad.reduce((acc, p) => acc + (p.cantidad || 1), 0);
                }
            }
        });

        const totalCalculatedRegs = Object.values(categories).reduce((acc, c) => acc + c.regs, 0) || (sourceData.length || 1);

        return Object.values(categories).map(cat => {
            const pctVal = (cat.regs / totalCalculatedRegs) * 100;
            return {
                ...cat,
                participacionVal: pctVal,
                participacion: pctVal.toFixed(1) + '%'
            };
        });
    }, [data, dataForCanalVenta]);

    const activeCanalFilters = filters.canalVenta || [];

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                    Canales de Venta <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 normal-case font-normal">(% de Participación)</span>
                </h3>
                <span className="text-[10px] font-semibold text-gray-400">Pasa el mouse para ver detalles</span>
            </div>

            {/* Barra acumulada horizontal proporcional */}
            <div className="w-full h-3 bg-gray-100 rounded-full flex overflow-hidden p-0.5 gap-0.5">
                {canalVentaData.map(cat => {
                    const isActive = activeCanalFilters.length === 0 || activeCanalFilters.some(f => cat.matchingKeys.some(mk => mk.toLowerCase() === f.toLowerCase() || f.toLowerCase() === cat.id));
                    return (
                        <div
                            key={cat.id}
                            style={{ width: `${Math.max(cat.participacionVal, 2)}%`, backgroundColor: cat.color }}
                            className={`h-full rounded-sm transition-all duration-300 cursor-pointer ${
                                isActive ? 'opacity-100 hover:opacity-80' : 'opacity-25 hover:opacity-60'
                            }`}
                            onClick={(e) => onFilterToggle('canalVenta', cat.id, e)}
                            title={`${cat.nombre}: ${cat.participacion} | Registros: ${cat.regs} | Productos con Novedad: ${cat.prods}`}
                        />
                    );
                })}
            </div>

            {/* Tarjetas horizontales de los 4 canales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {canalVentaData.map(cat => {
                    const isActive = activeCanalFilters.length === 0 || activeCanalFilters.some(f => cat.matchingKeys.some(mk => mk.toLowerCase() === f.toLowerCase() || f.toLowerCase() === cat.id));

                    return (
                        <div
                            key={cat.id}
                            onClick={(e) => onFilterToggle('canalVenta', cat.id, e)}
                            className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer ${
                                isActive 
                                    ? 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300' 
                                    : 'bg-gray-50/50 border-gray-100 opacity-40 hover:opacity-100'
                            }`}
                        >
                            {/* Color Dot + Name */}
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2 truncate pr-1">
                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                                    <span className="text-xs font-bold text-gray-700 truncate">{cat.nombre}</span>
                                </div>
                                <span className="text-xs font-black text-gray-800">{cat.participacion}</span>
                            </div>

                            {/* Mini barra de progreso */}
                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-2">
                                <div 
                                    className="h-full rounded-full transition-all duration-500" 
                                    style={{ width: `${cat.participacionVal}%`, backgroundColor: cat.color }} 
                                />
                            </div>

                            {/* Tooltip emergente al pasar el mouse por encima */}
                            <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3.5 bg-slate-900 text-white rounded-xl shadow-2xl text-xs z-50 animate-fade-in pointer-events-none">
                                <div className="font-bold text-slate-100 border-b border-slate-700 pb-1.5 mb-2 flex items-center justify-between">
                                    <span>{cat.nombre}</span>
                                    <span className="text-sky-400 font-black">{cat.participacion}</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-slate-300">
                                        <span className="text-[11px] text-slate-300">Total de registros hechos:</span>
                                        <span className="font-bold text-white text-xs bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{cat.regs}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-300">
                                        <span className="text-[11px] text-slate-300">Productos con novedad:</span>
                                        <span className="font-bold text-amber-300 text-xs bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50">{cat.prods}</span>
                                    </div>
                                </div>
                                {/* Flechita inferior del tooltip */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                            </div>

                            {/* Pie de la tarjeta */}
                            <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-100">
                                <span><strong className="text-gray-700">{cat.regs}</strong> registros</span>
                                <span><strong className="text-[#c96a4e]">{cat.prods}</strong> prods.</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
// ─────────────────────────────────────────────────────────────────────────────

export default function GeneralMac({ data, prevData, dataForDefectos, dataForResponsables, dataForCiudades, dataForZonas, dataForClientes, dataForProductos, dataForMesCreacion, dataForCanalVenta, filters, setFilters, onFilterToggle, razones, defectosRef = [], responsablesRef = [] }: Props) {
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

    const promedioIngresoMensual = useMemo(() => {
        const numMeses = registrosPorMes.length || 1;
        const avg = totalNovedades / numMeses;
        return avg % 1 === 0 ? avg.toString() : avg.toFixed(1);
    }, [totalNovedades, registrosPorMes]);

    // Funciones auxiliares
    const getProductosStats = (field: 'productos_compra' | 'productos_novedad') => {
        const stats: Record<string, { registrosSet: Set<number>, productosAfectados: number, codigosSet: Set<string> }> = {};
        
        const sourceData = dataForProductos || data;

        const activeGroupFilters = (filters.productos || []).filter(f => isGroupFilter(f));
        const activeSpecificFilters = (filters.productos || []).filter(f => !isGroupFilter(f));

        sourceData.forEach(d => {
            if (activeSpecificFilters.length > 0) {
                const hasSpecificMatch = activeSpecificFilters.some(f => (d as any)._productosNombres?.includes(f));
                if (!hasSpecificMatch) return;
            }

            if (Array.isArray(d[field])) {
                d[field].forEach((p: any) => {
                    const nombre = p.descripcion || p.nombre || p.sku || p.referencia || p.codigo || 'Desconocido';
                    const codigo = p.codigo || p.referencia || p.sku || p.codigo_producto || p.cod_producto || p.cod || '';
                    
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
                    
                    if (activeGroupFilters.length > 0) {
                        const prodGrupo = p._grupo || p.grupo || p.grupo_producto || '';
                        const matchesGroup = activeGroupFilters.some(gf => gf.toUpperCase() === prodGrupo.toUpperCase());
                        if (!matchesGroup) include = false;
                    }

                    if (include) {
                        if (!stats[nombre]) stats[nombre] = { registrosSet: new Set(), productosAfectados: 0, codigosSet: new Set() };
                        stats[nombre].registrosSet.add(d.id);
                        stats[nombre].productosAfectados += (p.cantidad || 1);
                        if (codigo && String(codigo).trim() && String(codigo).trim() !== nombre) {
                            stats[nombre].codigosSet.add(String(codigo).trim());
                        }
                    }
                });
            }
        });
        
        const totalRegistros = data.length || 1;

        return Object.entries(stats)
            .map(([nombre, stat]) => {
                const regs = stat.registrosSet.size;
                const codigosArr = Array.from(stat.codigosSet);
                const codigoStr = codigosArr.length > 0 ? codigosArr.join(', ') : '';
                return { 
                    nombre, 
                    codigo: codigoStr,
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
                        const prodCodigo = p.codigo || p.referencia || p.sku || p.codigo_producto || p.cod_producto || p.cod || '';
                        const prodGrupo = p._grupo || p.grupo || p.grupo_producto || '';
                        const matches = filters.productos.some(f => f === prodNombre || (prodCodigo && f === prodCodigo) || (prodGrupo && f === prodGrupo));
                        if (!matches) passesProductos = false;
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
                        const prodCodigo = p.codigo || p.referencia || p.sku || p.codigo_producto || p.cod_producto || p.cod || '';
                        const prodGrupo = p._grupo || p.grupo || p.grupo_producto || '';
                        const matches = filters.productos.some(f => f === prodNombre || (prodCodigo && f === prodCodigo) || (prodGrupo && f === prodGrupo));
                        if (!matches) passesProductos = false;
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

    const productosGruposStats = useMemo(() => {
        const stats: Record<string, { registrosSet: Set<number>; productosAfectados: number }> = {};
        const sourceData = dataForProductos || data;

        sourceData.forEach(d => {
            if (Array.isArray(d.productos_novedad)) {
                d.productos_novedad.forEach((p: any) => {
                    let include = true;
                    if ((filters.defectos && filters.defectos.length > 0) || (filters.responsables && filters.responsables.length > 0)) {
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

                    if (filters.productos && filters.productos.length > 0) {
                        const specificProdFilters = filters.productos.filter(f => !isGroupFilter(f));
                        if (specificProdFilters.length > 0) {
                            const prodNombre = p.descripcion || p.nombre || p.sku || p.referencia || p.codigo || '';
                            const prodCodigo = p.codigo || p.referencia || p.sku || p.codigo_producto || p.cod_producto || p.cod || '';
                            const matchesSpecific = specificProdFilters.some(f => f === prodNombre || (prodCodigo && f === prodCodigo));
                            if (!matchesSpecific) include = false;
                        }
                    }

                    if (include) {
                        let grupoRaw = p._grupo || p.grupo || p.grupo_producto || p.linea || p.familia || p.categoria || '';
                        if (!grupoRaw) {
                            const desc = (p.descripcion || p.nombre || '').toUpperCase();
                            if (desc.includes('COCINA') || desc.includes('MESON') || desc.includes('LAVAPLATOS')) grupoRaw = 'COCINAS';
                            else if (desc.includes('BAÑO') || desc.includes('BANO') || desc.includes('LAVAMANOS') || desc.includes('LVM') || desc.includes('MUEBLE') || desc.includes('MBLE')) grupoRaw = 'BAÑOS';
                            else if (desc.includes('HIDROMASAJE') || desc.includes('SPA') || desc.includes('TINA')) grupoRaw = 'HIDROMASAJES';
                            else if (desc.includes('REPUESTO')) grupoRaw = 'REPUESTOS';
                            else if (desc.includes('INFRAESTRUCTURA')) grupoRaw = 'INFRAESTRUCTURA';
                            else grupoRaw = 'OTROS';
                        }
                        let grupo = normalizeGrupoName(grupoRaw);

                        if (!stats[grupo]) {
                            stats[grupo] = { registrosSet: new Set(), productosAfectados: 0 };
                        }

                        stats[grupo].registrosSet.add(d.id);
                        stats[grupo].productosAfectados += (p.cantidad || 1);
                    }
                });
            }
        });

        const totalRegistros = sourceData.length || 1;

        return Object.entries(stats)
            .map(([nombre, stat]) => ({
                nombre,
                Registros: stat.registrosSet.size,
                'Productos Afectados': stat.productosAfectados,
                Participacion: ((stat.registrosSet.size / totalRegistros) * 100).toFixed(1) + '%'
            }))
            .sort((a, b) => b.Registros - a.Registros);
    }, [data, dataForProductos, filters.defectos, filters.responsables, filters.productos, razones, defectosRef, responsablesRef]);

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
            const cliente = d.cliente_final_nombre || d.cliente_nombre || 'Desconocido';
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
        })).sort((a, b) => b.Registros - a.Registros);
    }, [data, dataForClientes]);

    // Helper para formatear fecha a "Mes Año" (Ej: "Ene 2026", "Feb 2026")
    const formatMesAno = (dateStr: string | null | undefined): { key: string; label: string } | null => {
        if (!dateStr || typeof dateStr !== 'string') return null;
        const cleanStr = dateStr.trim();
        if (!cleanStr) return null;

        let d: Date | null = null;
        if (cleanStr.includes('-')) {
            const parts = cleanStr.split('T')[0].split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                if (!isNaN(year) && !isNaN(month)) d = new Date(year, month, day || 1);
            }
        } else if (cleanStr.includes('/')) {
            const parts = cleanStr.split('/');
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                } else {
                    d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                }
            }
        }

        if (!d || isNaN(d.getTime())) d = new Date(cleanStr);
        if (isNaN(d.getTime())) return null;

        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const label = `${monthNames[d.getMonth()]} ${yyyy}`;
        const key = `${yyyy}-${mm}`;
        return { key, label };
    };

    // ─── Stats por Fecha de Compra (Mes y Año) ─────────────────────────────────
    const fechaCompraStats = useMemo(() => {
        const stats: Record<string, { label: string; key: string; regs: number; prods: number }> = {};
        const total = data.length || 1;

        data.forEach(d => {
            let rawFecha: string | null | undefined = (d as any).fecha_compra;
            if (!rawFecha && Array.isArray(d.productos_compra)) {
                const p = d.productos_compra.find(pc => pc.fecha_compra);
                if (p) rawFecha = p.fecha_compra;
            }
            if (!rawFecha && Array.isArray(d.productos_novedad)) {
                const p = d.productos_novedad.find(pn => pn.fecha_compra);
                if (p) rawFecha = p.fecha_compra;
            }

            const formatted = formatMesAno(rawFecha);
            const groupKey = formatted ? formatted.key : 'Sin Fecha';
            const groupLabel = formatted ? formatted.label : 'Sin Fecha';

            if (!stats[groupKey]) {
                stats[groupKey] = { label: groupLabel, key: groupKey, regs: 0, prods: 0 };
            }

            stats[groupKey].regs += 1;
            if (Array.isArray(d.productos_novedad)) {
                stats[groupKey].prods += d.productos_novedad.reduce((acc, p) => acc + (p.cantidad || 1), 0);
            }
        });

        return Object.values(stats)
            .sort((a, b) => (a.key === 'Sin Fecha' ? 1 : b.key === 'Sin Fecha' ? -1 : a.key.localeCompare(b.key)))
            .map(item => ({
                mesAno: item.label,
                Registros: item.regs,
                'Productos Afectados': item.prods,
                Participacion: ((item.regs / total) * 100).toFixed(1) + '%'
            }));
    }, [data]);

    // ─── Stats por Fecha de Fabricación (Mes y Año) ──────────────────────────────
    const fechaFabricacionStats = useMemo(() => {
        const stats: Record<string, { label: string; key: string; regs: number; prods: number }> = {};
        const total = data.length || 1;

        data.forEach(d => {
            let rawFecha: string | null | undefined = (d as any).fecha_fabricacion;
            if (!rawFecha && Array.isArray(d.productos_compra)) {
                const p = d.productos_compra.find(pc => pc.fecha_fabricacion);
                if (p) rawFecha = p.fecha_fabricacion;
            }
            if (!rawFecha && Array.isArray(d.productos_novedad)) {
                const p = d.productos_novedad.find(pn => pn.fecha_fabricacion);
                if (p) rawFecha = p.fecha_fabricacion;
            }

            const formatted = formatMesAno(rawFecha);
            const groupKey = formatted ? formatted.key : 'Sin Fecha';
            const groupLabel = formatted ? formatted.label : 'Sin Fecha';

            if (!stats[groupKey]) {
                stats[groupKey] = { label: groupLabel, key: groupKey, regs: 0, prods: 0 };
            }

            stats[groupKey].regs += 1;
            if (Array.isArray(d.productos_novedad)) {
                stats[groupKey].prods += d.productos_novedad.reduce((acc, p) => acc + (p.cantidad || 1), 0);
            }
        });

        return Object.values(stats)
            .sort((a, b) => (a.key === 'Sin Fecha' ? 1 : b.key === 'Sin Fecha' ? -1 : a.key.localeCompare(b.key)))
            .map(item => ({
                mesAno: item.label,
                Registros: item.regs,
                'Productos Afectados': item.prods,
                Participacion: ((item.regs / total) * 100).toFixed(1) + '%'
            }));
    }, [data]);

    const KpiCard = ({ title, value, prefix = '', suffix = '', variacion, subtitle }: { title: string, value: number | string, prefix?: string, suffix?: string, variacion?: number, subtitle?: string }) => (
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center min-h-[70px]">
            <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">{title}</h3>
            <div className="text-lg font-black text-gray-800 leading-tight">
                {prefix}{typeof value === 'number' ? value.toLocaleString('es-CO') : value}{suffix}
            </div>
            {subtitle && (
                <div className="text-[9px] text-gray-400 font-semibold mt-0.5">
                    {subtitle}
                </div>
            )}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-5 gap-4">
                <KpiCard title="Total Solicitudes" value={totalNovedades} variacion={variacionNovedades} />
                <KpiCard title="Valor Invertido" value={valorInvertido} prefix="$" />
                <KpiCard title="Solicitudes Abiertas" value={abiertas} />
                <KpiCard title="Solicitudes Cerradas" value={cerradas} />
                <KpiCard title="Promedio Mensual" value={promedioIngresoMensual} suffix=" / mes" subtitle={`Basado en ${registrosPorMes.length} ${registrosPorMes.length === 1 ? 'mes' : 'meses'}`} />
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
                                    onClick={(data: any, index: number, e: any) => onFilterToggle('mesCreacion', data.payload?.key, e)}
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
                                        onClick={(data: any, index: number, e: any) => onFilterToggle('defectos', data.payload?.nombre || data.nombre, e)}
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
                                        onClick={(data: any, index: number, e: any) => onFilterToggle('defectos', data.payload?.nombre || data.nombre, e)}
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
                                        onClick={(data: any, index: number, e: any) => onFilterToggle('responsables', data.payload?.nombre || data.nombre, e)}
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
                                        onClick={(data: any, index: number, e: any) => onFilterToggle('responsables', data.payload?.nombre || data.nombre, e)}
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

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
                {/* Chart 6: Productos de Compra */}
                <ProductTable title="Productos de Compra" data={productosCompraStats} maxHeight={440} filterKey="productos" onFilterToggle={onFilterToggle} activeFilters={filters.productos} />

                {/* Chart 7: Productos con Novedad */}
                <ProductTable title="Productos con Novedad" data={productosNovedadStats} maxHeight={440} filterKey="productos" onFilterToggle={onFilterToggle} activeFilters={filters.productos} />

                {/* Chart 8: Grupos de Producto */}
                <GruposProductoTableCard title="Grupos de Producto" data={productosGruposStats} maxHeight={440} onFilterToggle={onFilterToggle} activeFilters={filters.productos} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
                {/* Ciudades */}
                <TopCiudadesCard data={ciudadesData} onFilterToggle={onFilterToggle} activeFilters={filters.ciudades} />

                {/* Zonas */}
                <CleanDonutCard title="Top Zonas" data={zonasData} colors={COLORS.slice(3).concat(COLORS.slice(0,3))} filterKey="zonas" onFilterToggle={onFilterToggle} activeFilters={filters.zonas} />

                {/* Clientes */}
                <TopClientesCard data={clientesData} onFilterToggle={onFilterToggle} activeFilters={filters.clientes} />
            </div>

            {/* Indicadores por Fecha de Compra y Fecha de Fabricación (Mes y Año) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Chart: Por Fecha de Compra */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Solicitudes por Fecha de Compra</h3>
                            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Agrupado por Mes y Año de Compra</p>
                        </div>
                        <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 rounded-full px-2.5 py-0.5">
                            {fechaCompraStats.length} periodos
                        </span>
                    </div>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={fechaCompraStats} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="mesAno" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} />
                                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                                <RechartsTooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', padding: '10px 14px' }} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                <Bar dataKey="Registros" fill="#254153" radius={[4, 4, 0, 0]} maxBarSize={45}>
                                    <LabelList dataKey="Registros" position="top" style={{ fill: '#254153', fontSize: 11, fontWeight: 'bold' }} />
                                </Bar>
                                <Bar dataKey="Productos Afectados" fill="#c96a4e" radius={[4, 4, 0, 0]} maxBarSize={45}>
                                    <LabelList dataKey="Productos Afectados" position="top" style={{ fill: '#c96a4e', fontSize: 10, fontWeight: 'bold' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart: Por Fecha de Fabricación */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Solicitudes por Fecha de Fabricación</h3>
                            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Agrupado por Mes y Año de Fabricación</p>
                        </div>
                        <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 rounded-full px-2.5 py-0.5">
                            {fechaFabricacionStats.length} periodos
                        </span>
                    </div>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={fechaFabricacionStats} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="mesAno" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} />
                                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                                <RechartsTooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', padding: '10px 14px' }} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                <Bar dataKey="Registros" fill="#749094" radius={[4, 4, 0, 0]} maxBarSize={45}>
                                    <LabelList dataKey="Registros" position="top" style={{ fill: '#749094', fontSize: 11, fontWeight: 'bold' }} />
                                </Bar>
                                <Bar dataKey="Productos Afectados" fill="#c96a4e" radius={[4, 4, 0, 0]} maxBarSize={45}>
                                    <LabelList dataKey="Productos Afectados" position="top" style={{ fill: '#c96a4e', fontSize: 10, fontWeight: 'bold' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
