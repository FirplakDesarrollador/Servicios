import React, { useMemo, useState } from 'react';
import { RegistroMAC, FilterState } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Line, LabelList, ComposedChart } from 'recharts';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon, Globe, Package, Check, X, Filter } from 'lucide-react';

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
    dataForMercado?: RegistroMAC[];
    setFilters?: any;
    onFilterToggle: (key: keyof FilterState, value: string, e?: any) => void;
    razones?: any[];
    filtersComponent?: React.ReactNode;
}

const COLORS = [
    '#254153', // Azul petróleo profundo Firplak
    '#749094', // Verde pizarra / Salvia Firplak
    '#c96a4e', // Terracota / Teja Firplak
    '#e09f3e', // Ámbar / Melocotón cálido Firplak
    '#3b778c', // Azul acero / Petróleo suave Firplak
    '#a67347', // Arena tostada / Avellana cálido Firplak
    '#4e7c61', // Verde eucalipto / Spa Firplak
    '#9e382b', // Ladrillo oscuro / Teja carmesí Firplak
    '#5b8e9e', // Celeste mineral suave Firplak
    '#b86835', // Canela / Cobre cálido Firplak
    '#4a6b82', // Pizarra azulada Firplak
    '#839199', // Gris piedra ceniza Firplak
    '#34596b', // Azul petróleo medio Firplak
    '#b3bec4', // Caliza suave Firplak
];

// Paleta amplia armónica de alta distinción y elegancia mineral/arquitectónica (fiel a Firplak, sin morados ni azules chillones)
const DISTINCT_PALETTE: string[] = [
    '#254153', // Azul petróleo profundo Firplak
    '#749094', // Verde pizarra / Salvia Firplak
    '#c96a4e', // Terracota / Teja cálido Firplak
    '#e09f3e', // Ámbar / Melocotón cálido Firplak
    '#3b778c', // Azul acero / Petróleo suave Firplak
    '#a67347', // Arena tostada / Avellana cálido Firplak
    '#4e7c61', // Verde eucalipto / Spa Firplak
    '#9e382b', // Ladrillo oscuro / Teja carmesí Firplak
    '#5b8e9e', // Celeste mineral / Glaciar suave Firplak
    '#b86835', // Canela / Cobre cálido Firplak
    '#4a6b82', // Pizarra azulada / Grafito azul
    '#6b8a75', // Salvia bosque suave
    '#c48c37', // Ocre mostaza tostada
    '#34596b', // Azul petróleo medio
    '#8c5847', // Arcilla / Siena tostada
    '#5e7a68', // Verde oliva mineral
    '#b38b6d', // Arena cálido / Caramelo
    '#839199', // Gris piedra ceniza
    '#415b6b', // Petróleo pizarra
    '#687a82', // Gris pizarra
    '#8b4a3e', // Óxido suave
    '#3f6652', // Pino mineral
    '#a07855', // Madera roble suave
    '#2c4d5e', // Azul marino grafito
    '#b3bec4', // Caliza clara
];

// Colores preferidos por tipo de solicitud (100% alineados a la identidad visual de Firplak)
const TIPO_SOLICITUD_COLORS: Record<string, string> = {
    'garantia': '#254153',       // Azul marino petróleo institucional base
    'garantía': '#254153',
    'encuesta b2c': '#3b778c',   // Azul acero / Petróleo suave Firplak (armónico, elegante, no saturado)
    'encuesta b2b': '#749094',   // Verde pizarra / Salvia institucional Firplak
    'atencion': '#c96a4e',       // Terracota / Teja cálido Firplak (icónico de la marca, sin morado)
    'atención': '#c96a4e',
    'reclamo': '#e09f3e',        // Ámbar / Melocotón cálido Firplak
    'queja': '#9e382b',          // Ladrillo oscuro / Teja carmesí Firplak
    'solicitud': '#4a6b82',      // Pizarra azulada Firplak
    'peticion': '#5b8e9e',       // Celeste mineral suave Firplak
    'petición': '#5b8e9e',
    'servicio': '#5e7a68',       // Verde oliva mineral Firplak
    'servicio tecnico': '#5e7a68',
    'felicitacion': '#4e7c61',   // Verde laurel / Spa Firplak
    'felicitación': '#4e7c61',
    'asesoria': '#a67347',       // Arena tostada / Avellana cálido Firplak
    'asesoría': '#a67347',
    'tramite': '#b86835',        // Canela / Cobre cálido Firplak
    'trámite': '#b86835',
    'consulta': '#34596b',       // Azul petróleo medio Firplak
    'soporte': '#415b6b',        // Petróleo pizarra Firplak
    'otros': '#839199',          // Gris piedra ceniza
    'sin definir': '#b3bec4',    // Caliza clara neutra
};

// Generador que garantiza que CADA tipo de solicitud tenga un color 100% ÚNICO y diferente
const getTipoSolicitudColorMap = (tipos: string[]): Record<string, string> => {
    const map: Record<string, string> = {};
    const usedColors = new Set<string>();

    const normalize = (t: string) =>
        t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    // 1. Asignar color preferido si está disponible y aún no ha sido usado por otro tipo
    tipos.forEach(tipo => {
        const norm = normalize(tipo);
        let preferred = TIPO_SOLICITUD_COLORS[norm];
        if (!preferred) {
            for (const [key, col] of Object.entries(TIPO_SOLICITUD_COLORS)) {
                if (norm.includes(key)) {
                    preferred = col;
                    break;
                }
            }
        }

        if (preferred && !usedColors.has(preferred.toLowerCase())) {
            map[tipo] = preferred;
            usedColors.add(preferred.toLowerCase());
        }
    });

    // 2. Para tipos restantes o colisiones, asignar el siguiente color disponible sin repetir
    let paletteIdx = 0;
    tipos.forEach(tipo => {
        if (!map[tipo]) {
            while (paletteIdx < DISTINCT_PALETTE.length && usedColors.has(DISTINCT_PALETTE[paletteIdx].toLowerCase())) {
                paletteIdx++;
            }

            let assigned: string;
            if (paletteIdx < DISTINCT_PALETTE.length) {
                assigned = DISTINCT_PALETTE[paletteIdx];
                paletteIdx++;
            } else {
                // Si la paleta se excede, generar colores HSL minerales por proporción áurea
                const hue = Math.round((usedColors.size * 137.5) % 360);
                assigned = `hsl(${hue}, 35%, 45%)`;
            }

            map[tipo] = assigned;
            usedColors.add(assigned.toLowerCase());
        }
    });

    return map;
};

const getTipoSolicitudColor = (tipo: string, idx: number): string => {
    const norm = tipo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (TIPO_SOLICITUD_COLORS[norm]) return TIPO_SOLICITUD_COLORS[norm];
    for (const [key, color] of Object.entries(TIPO_SOLICITUD_COLORS)) {
        if (norm.includes(key)) return color;
    }
    return DISTINCT_PALETTE[idx % DISTINCT_PALETTE.length];
};
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

const normalizePlantaName = (planta: string) => {
    if (!planta || !String(planta).trim() || String(planta).trim().toLowerCase().includes('seleccione')) return 'En Blanco';
    const p = String(planta).toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (['MARMOL', 'MARMOLES', 'PC'].includes(p)) return 'Marmol';
    if (['MUEBLE', 'MUEBLES', 'MBL'].includes(p)) return 'Muebles';
    if (['FIBRA', 'FIBRAS', 'FV', 'FVHM', 'FVHMP'].includes(p)) return 'Fibra';
    if (['COMERCIALIZADO', 'COMERCIALIZADOS'].includes(p)) return 'Comercializado';
    if (['SERVICIO', 'SERVICIOS'].includes(p)) return 'Servicios';
    if (p === 'RTM') return 'RTM';
    if (['QUARZTONE', 'CUARZO'].includes(p)) return 'Quarztone';
    return 'En Blanco';
};

const normalizeGrupoName = (g: string): string => {
    if (!g || g === 'En Blanco' || g.toLowerCase() === 'en blanco') return 'En Blanco';
    const norm = String(g).trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (['COCINA', 'COCINAS'].includes(norm)) return 'Cocinas';
    if (['BANO', 'BANOS'].includes(norm)) return 'Baño';
    if (['HIDROTERAPIA', 'HIDROMASAJE', 'HIDROMASAJES', 'SPA', 'TINA'].includes(norm)) return 'Hidroterapia';
    if (['LABOR', 'LABORES'].includes(norm)) return 'Labores';
    if (['GRIFERIA', 'GRIFERIAS'].includes(norm)) return 'Griferia';
    if (['PLOMERIA', 'PLOMERIAS'].includes(norm)) return 'Plomeria';
    if (['SERVICIO', 'SERVICIOS'].includes(norm)) return 'Servicios';
    if (['CUIDADO&MANTENIMIENTO', 'CUIDADO & MANTENIMIENTO'].includes(norm)) return 'Cuidado&Mantenimiento';
    return 'En Blanco';
};

const productMatchesFilters = (p: any, filtersArr: string[] | undefined, filterTypeToIgnore?: 'PL' | 'GF') => {
    if (!filtersArr || filtersArr.length === 0) return true;
    const prodNombre = p.descripcion || p.nombre || p.sku || p.referencia || 'Desconocido';
    const prodCodigo = p.codigo || p.referencia || p.sku || p.codigo_producto || p.cod_producto || p.cod || '';
    const rawG = p.familia || '';
    const prodGrupo = normalizeGrupoName(rawG);
    const rawP = p.planta || '';
    const prodPlanta = normalizePlantaName(rawP);
    
    return filtersArr.some(f => {
        const fUpper = f.toUpperCase().trim();
        if (fUpper.startsWith('PL:')) {
            if (filterTypeToIgnore === 'PL') return true;
            const plantaFilter = normalizePlantaName(f.substring(3)).toUpperCase().trim();
            return prodPlanta.toUpperCase().trim() === plantaFilter;
        }
        if (fUpper.startsWith('GF:')) {
            if (filterTypeToIgnore === 'GF') return true;
            const groupFilter = normalizeGrupoName(f.substring(3)).toUpperCase().trim();
            return prodGrupo.toUpperCase().trim() === groupFilter;
        }
        return f === prodNombre || (prodCodigo && f === prodCodigo);
    });
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
                                isAnimationActive={false}
                                data={data} 
                                nameKey="nombre" 
                                dataKey="Registros" 
                                cx="50%" 
                                cy="50%" 
                                innerRadius="65%" 
                                outerRadius="90%" 
                                paddingAngle={2}
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
// ─── Plantas de Producto Table Card ────────────────────────────────────────────
const PlantasProductoTableCard = ({ title, data, maxHeight = 440, onFilterToggle, activeFilters = [] }: {
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
                    {filtered.length}/{data.length} plantas
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
                    placeholder="Buscar planta..."
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
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 rounded-tl-lg">Planta</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right whitespace-nowrap">Regs.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right whitespace-nowrap">Cant.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right rounded-tr-lg">%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((item, i) => {
                                const isSelected = activeFilters.includes(`PL:${item.nombre}`);
                                return (
                                    <tr 
                                        key={item.nombre} 
                                        onClick={(e) => onFilterToggle('productos', `PL:${item.nombre}`, e)}
                                        className={`cursor-pointer transition-colors ${i !== filtered.length - 1 ? 'border-b border-gray-50' : ''} ${isSelected ? 'bg-[#254153]/10 hover:bg-[#254153]/20' : 'hover:bg-slate-50'}`}
                                    >
                                        <td className="px-3 py-3 text-xs font-bold text-gray-800">{item.nombre}</td>
                                        <td className="px-3 py-3 text-xs font-semibold text-gray-700 text-right">{item.Registros}</td>
                                        <td className="px-3 py-3 text-xs font-bold text-[#c96a4e] text-right">{item['Productos Afectados']}</td>
                                        <td className="px-3 py-3 text-[10px] font-medium text-gray-500 text-right">{item.Participacion}</td>
                                    </tr>
                                );
                            })}
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
                                    onClick={(e) => onFilterToggle('productos', `GF:${item.nombre}`, e)}
                                    className={`group transition-colors cursor-pointer ${
                                        activeFilters.length > 0 && activeFilters.includes(`GF:${item.nombre}`)
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

const formatMoney = (amount: number) => {
    if (!amount || isNaN(amount)) return '$0';
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
    return `$${Math.round(amount).toLocaleString('es-CO')}`;
};

// ─── Mercados Component (Nacional vs. Internacional) ──────────────────────────
export const MercadosParticipacionCard = ({
    data,
    dataForMercado,
    filters,
    onFilterToggle
}: {
    data: RegistroMAC[];
    dataForMercado?: RegistroMAC[];
    filters: FilterState;
    onFilterToggle: (key: keyof FilterState, value: string, e?: any) => void;
}) => {
    const { mercadosData, totalRegs, totalProds, totalInversion } = useMemo(() => {
        const sourceData = dataForMercado || data;

        const categories: Record<string, {
            id: string;
            nombre: string;
            subtitulo: string;
            color: string;
            hoverColor: string;
            borderClass: string;
            activeBorderClass: string;
            activeRingClass: string;
            activeBgClass: string;
            regs: number;
            prods: number;
            inversion: number;
            canales: Record<string, number>;
        }> = {
            'Nacional': {
                id: 'Nacional',
                nombre: 'Mercado Nacional',
                subtitulo: 'Colombia / Clientes Locales',
                color: '#254153',
                hoverColor: '#1a2e3b',
                borderClass: 'border-slate-200',
                activeBorderClass: 'border-[#254153]',
                activeRingClass: 'ring-[#254153]/25',
                activeBgClass: 'bg-slate-50/80',
                regs: 0,
                prods: 0,
                inversion: 0,
                canales: {}
            },
            'Internacional': {
                id: 'Internacional',
                nombre: 'Mercado Internacional',
                subtitulo: 'Exportaciones / Exterior',
                color: '#3b82f6',
                hoverColor: '#2563eb',
                borderClass: 'border-blue-200',
                activeBorderClass: 'border-blue-600',
                activeRingClass: 'ring-blue-500/25',
                activeBgClass: 'bg-blue-50/50',
                regs: 0,
                prods: 0,
                inversion: 0,
                canales: {}
            },
            'Sin clasificar': {
                id: 'Sin clasificar',
                nombre: 'Sin clasificar',
                subtitulo: 'Sin asignación de mercado',
                color: '#94a3b8',
                hoverColor: '#64748b',
                borderClass: 'border-slate-200',
                activeBorderClass: 'border-slate-500',
                activeRingClass: 'ring-slate-400/25',
                activeBgClass: 'bg-slate-100/60',
                regs: 0,
                prods: 0,
                inversion: 0,
                canales: {}
            }
        };

        let tRegs = 0;
        let tProds = 0;
        let tInv = 0;

        sourceData.forEach(d => {
            const rawMercado = d._mercado || 'Sin clasificar';
            const m = rawMercado === 'Internacional' ? 'Internacional' : (rawMercado === 'Nacional' ? 'Nacional' : 'Sin clasificar');
            const cat = categories[m];
            if (cat) {
                cat.regs += 1;
                tRegs += 1;

                let cantProds = 1;
                if (Array.isArray(d.productos_novedad) && d.productos_novedad.length > 0) {
                    cantProds = d.productos_novedad.reduce((acc, p) => acc + (p.cantidad || 1), 0);
                }
                cat.prods += cantProds;
                tProds += cantProds;

                const inv = ((d as any).valor_servicio || 0) + ((d as any).valor_flete || 0) + ((d as any).valor_producto || 0);
                cat.inversion += inv;
                tInv += inv;

                const canal = d.canal_venta || 'Sin canal';
                cat.canales[canal] = (cat.canales[canal] || 0) + 1;
            }
        });

        const totalToUse = tRegs || 1;
        const totalProdsToUse = tProds || 1;

        const list = Object.values(categories)
            .filter(cat => cat.id !== 'Sin clasificar' || cat.regs > 0)
            .map(cat => {
                const pctRegsVal = (cat.regs / totalToUse) * 100;
                const pctProdsVal = (cat.prods / totalProdsToUse) * 100;
                return {
                    ...cat,
                    participacionVal: pctRegsVal,
                    participacion: pctRegsVal.toFixed(1) + '%',
                    participacionProdsVal: pctProdsVal,
                    participacionProds: pctProdsVal.toFixed(1) + '%'
                };
            });

        return { mercadosData: list, totalRegs: tRegs, totalProds: tProds, totalInversion: tInv };
    }, [data, dataForMercado]);

    const activeMercadoFilters = filters.mercado || [];
    const hasFilter = activeMercadoFilters.length > 0;

    const [tooltipPlacements, setTooltipPlacements] = useState<Record<string, { vertical: 'top' | 'bottom'; horizontal: 'center' | 'left' | 'right' }>>({});

    const handleMouseEnterCard = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;
        const tooltipHeight = 280;
        const tooltipWidth = 288;

        // Si hacia arriba no cabe toda la info (< 280px), desplegar hacia abajo ('bottom')
        let vertical: 'top' | 'bottom' = 'bottom';
        if (spaceAbove < tooltipHeight) {
            vertical = 'bottom';
        } else if (spaceBelow < tooltipHeight && spaceAbove >= tooltipHeight) {
            vertical = 'top';
        } else {
            vertical = 'bottom';
        }

        const cardCenter = rect.left + rect.width / 2;
        let horizontal: 'center' | 'left' | 'right' = 'center';
        if (cardCenter - tooltipWidth / 2 < 16) {
            horizontal = 'left';
        } else if (cardCenter + tooltipWidth / 2 > window.innerWidth - 16) {
            horizontal = 'right';
        }

        setTooltipPlacements(prev => ({
            ...prev,
            [id]: { vertical, horizontal }
        }));
    };

    return (
        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-gray-100 flex flex-col space-y-2.5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-[#254153]/10 text-[#254153] flex items-center justify-center">
                        <Globe className="w-3 h-3" />
                    </div>
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                        Mercados <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.2 normal-case font-normal">(% de Participación)</span>
                    </h3>
                    {hasFilter && (
                        <div className="flex items-center gap-1 ml-1">
                            <span className="text-[9px] font-bold bg-[#254153] text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                Filtrando: {activeMercadoFilters.join(', ')}
                            </span>
                            <button
                                onClick={() => activeMercadoFilters.forEach(f => onFilterToggle('mercado', f))}
                                className="text-[9px] font-bold text-gray-400 hover:text-red-500 underline ml-0.5 cursor-pointer transition-colors"
                                title="Limpiar filtro de mercado"
                            >
                                Limpiar
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 bg-gray-50 border border-gray-200/60 px-2 py-0.5 rounded-md">
                        <span>Total: <strong className="text-gray-800 font-bold">{totalRegs.toLocaleString('es-CO')}</strong> reg.</span>
                        <span className="text-gray-300">|</span>
                        <span><strong className="text-amber-700 font-bold">{totalProds.toLocaleString('es-CO')}</strong> prods.</span>
                    </div>
                    <span className="text-[9px] font-semibold text-gray-400 hidden md:inline">
                        Clic en una tarjeta para filtro cruzado
                    </span>
                </div>
            </div>

            {/* Barra acumulada horizontal proporcional fina */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full flex overflow-hidden p-0.2 gap-0.5">
                {mercadosData.map(cat => {
                    const isSelected = activeMercadoFilters.includes(cat.id);
                    const isDimmed = hasFilter && !isSelected;
                    return (
                        <div
                            key={cat.id}
                            style={{ width: `${Math.max(cat.participacionVal, 2)}%`, backgroundColor: cat.color }}
                            className={`h-full rounded-xs transition-all duration-300 cursor-pointer ${
                                isDimmed ? 'opacity-25 hover:opacity-60' : 'opacity-100 hover:opacity-85'
                            }`}
                            onClick={(e) => onFilterToggle('mercado', cat.id, e)}
                            title={`${cat.nombre}: ${cat.participacion} (${cat.regs} reg. | ${cat.prods} unid.) - Clic para filtrar`}
                        />
                    );
                })}
            </div>

            {/* Tarjetas de Mercado Compactas */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${mercadosData.length > 2 ? 'lg:grid-cols-3' : ''} gap-2.5`}>
                {mercadosData.map(cat => {
                    const isSelected = activeMercadoFilters.includes(cat.id);
                    const isDimmed = hasFilter && !isSelected;
                    const placement = tooltipPlacements[cat.id] || { vertical: 'bottom', horizontal: 'center' };
                    const isBottom = placement.vertical === 'bottom';
                    const horizontalClass = placement.horizontal === 'left'
                        ? 'left-0'
                        : placement.horizontal === 'right'
                        ? 'right-0'
                        : 'left-1/2 -translate-x-1/2';
                    const arrowHorizontalClass = placement.horizontal === 'left'
                        ? 'left-6'
                        : placement.horizontal === 'right'
                        ? 'right-6'
                        : 'left-1/2 -translate-x-1/2';

                    return (
                        <div
                            key={cat.id}
                            onMouseEnter={(e) => handleMouseEnterCard(cat.id, e)}
                            onClick={(e) => onFilterToggle('mercado', cat.id, e)}
                            className={`group relative p-2.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                                isSelected
                                    ? `bg-white ${cat.activeBorderClass} shadow-xs ring-1.5 ${cat.activeRingClass} border-2`
                                    : isDimmed
                                    ? 'bg-gray-50/50 border-gray-100 opacity-40 hover:opacity-95 hover:border-gray-300'
                                    : 'bg-white border-gray-200/80 shadow-2xs hover:shadow-xs hover:border-gray-300'
                            }`}
                        >
                            {/* Color Dot + Name + % Participación */}
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5 truncate pr-1">
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                                    <span className="text-[11px] font-bold text-gray-800 truncate">{cat.nombre}</span>
                                    <span className="text-[9px] font-medium text-gray-400 hidden xl:inline">({cat.subtitulo})</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className="text-xs font-black text-gray-900">{cat.participacion}</span>
                                    {isSelected && (
                                        <span className="text-[8px] font-bold bg-[#254153] text-white px-1.5 py-0.2 rounded-full">Activo</span>
                                    )}
                                </div>
                            </div>

                            {/* Métricas Compactas en Fila */}
                            <div className="flex items-center justify-between gap-1 text-[10px] bg-slate-50/80 px-2 py-1 rounded-md border border-slate-100">
                                <span className="text-gray-600">
                                    Regs: <strong className="font-bold text-gray-800">{cat.regs.toLocaleString('es-CO')}</strong>
                                </span>
                                <span className="text-gray-300">|</span>
                                <span className="text-amber-800">
                                    Unids: <strong className="font-bold text-amber-900">{cat.prods.toLocaleString('es-CO')}</strong>
                                </span>
                                <span className="text-gray-300">|</span>
                                <span className="text-gray-500 text-[9px] truncate">
                                    Inv: <strong className="font-semibold text-gray-700">{formatMoney(cat.inversion)}</strong>
                                </span>
                            </div>

                            {/* Tooltip emergente inteligente: hacia abajo si no cabe arriba */}
                            <div
                                className={`hidden group-hover:block absolute ${horizontalClass} ${
                                    isBottom ? 'top-full mt-2' : 'bottom-full mb-2'
                                } w-72 p-3.5 bg-slate-900 text-white rounded-xl shadow-2xl text-xs z-50 animate-fade-in pointer-events-none border border-slate-700`}
                            >
                                <div className="font-bold text-slate-100 border-b border-slate-700 pb-1.5 mb-2 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                        {cat.nombre}
                                    </span>
                                    <span className="text-sky-400 font-black">{cat.participacion}</span>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-slate-300">
                                        <span className="text-[11px]">Total Registros hechos:</span>
                                        <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{cat.regs.toLocaleString('es-CO')} ({cat.participacion})</span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-300">
                                        <span className="text-[11px]">Total Unidades con novedad:</span>
                                        <span className="font-bold text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50">{cat.prods.toLocaleString('es-CO')} ({cat.participacionProds})</span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-300">
                                        <span className="text-[11px]">Valor invertido estimado:</span>
                                        <span className="font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/50">{formatMoney(cat.inversion)}</span>
                                    </div>
                                    {Object.keys(cat.canales).length > 0 && (
                                        <div className="border-t border-slate-700/80 pt-1.5 mt-1.5">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                Desglose por Canal de Venta:
                                            </div>
                                            <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                                                {Object.entries(cat.canales).map(([canal, count]) => (
                                                    <div key={canal} className="flex items-center justify-between text-[10px] text-slate-300">
                                                        <span className="truncate pr-2">{canal}:</span>
                                                        <span className="font-bold text-slate-200">{count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 pt-1.5 border-t border-slate-700/60 text-[10px] text-sky-300 text-center font-medium">
                                    {isSelected ? 'Haz clic para quitar filtro cruzado' : 'Haz clic para aplicar filtro cruzado'}
                                </div>
                                {/* Flecha del tooltip apuntando al contenedor */}
                                <div
                                    className={`absolute ${arrowHorizontalClass} border-4 border-transparent ${
                                        isBottom
                                            ? 'bottom-full border-b-slate-900'
                                            : 'top-full border-t-slate-900'
                                    }`}
                                />
                            </div>
                        </div>
                    );
                })}
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
    const { canalVentaData, globalMercados } = useMemo(() => {
        const categories: Record<string, {
            id: string;
            nombre: string;
            matchingKeys: string[];
            color: string;
            regs: number;
            prods: number;
            mercados: Record<string, number>;
        }> = {
            'distribucion': {
                id: 'distribucion',
                nombre: 'Distribución',
                matchingKeys: [
                    'Canal Distribuidor', 
                    'canal_distribuidor', 
                    'canal_ditribuidor', 
                    'Distribución', 
                    'Distribucion',
                    'Canal Exportador',
                    'canal_exportador',
                    'Exportaciones',
                    'Exportador'
                ],
                color: '#254153',
                regs: 0,
                prods: 0,
                mercados: { 'Nacional': 0, 'Internacional': 0, 'Sin clasificar': 0 }
            },
            'constructor': {
                id: 'constructor',
                nombre: 'Constructor',
                matchingKeys: ['Canal Constructor', 'canal_constructor', 'Constructor'],
                color: '#749094',
                regs: 0,
                prods: 0,
                mercados: { 'Nacional': 0, 'Internacional': 0, 'Sin clasificar': 0 }
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
                prods: 0,
                mercados: { 'Nacional': 0, 'Internacional': 0, 'Sin clasificar': 0 }
            }
        };

        const sourceData = dataForCanalVenta || data;
        let globalNac = 0;
        let globalInt = 0;
        let globalSin = 0;

        sourceData.forEach(d => {
            const m = d._mercado || 'Sin clasificar';
            if (m === 'Nacional') globalNac++;
            else if (m === 'Internacional') globalInt++;
            else globalSin++;

            const canalRaw = d.canal_venta || '';
            let matchedCatKey: string | null = null;

            Object.entries(categories).forEach(([catKey, catObj]) => {
                if (catObj.matchingKeys.some(mk => canalRaw.toLowerCase().includes(mk.toLowerCase()) || mk.toLowerCase().includes(canalRaw.toLowerCase()))) {
                    matchedCatKey = catKey;
                }
            });

            if (matchedCatKey && categories[matchedCatKey]) {
                categories[matchedCatKey].regs += 1;
                categories[matchedCatKey].mercados[m] = (categories[matchedCatKey].mercados[m] || 0) + 1;
                if (Array.isArray(d.productos_novedad)) {
                    categories[matchedCatKey].prods += d.productos_novedad.reduce((acc, p) => acc + (p.cantidad || 1), 0);
                }
            }
        });

        const totalCalculatedRegs = Object.values(categories).reduce((acc, c) => acc + c.regs, 0) || (sourceData.length || 1);
        const globalTotal = sourceData.length || 1;

        const globalMercados = {
            total: sourceData.length,
            nacionalCount: globalNac,
            nacionalPct: ((globalNac / globalTotal) * 100).toFixed(1),
            internacionalCount: globalInt,
            internacionalPct: ((globalInt / globalTotal) * 100).toFixed(1),
            sinClasificarCount: globalSin,
            sinClasificarPct: ((globalSin / globalTotal) * 100).toFixed(1),
        };

        const list = Object.values(categories).map(cat => {
            const pctVal = (cat.regs / totalCalculatedRegs) * 100;
            const catTotal = cat.regs || 1;
            const nacCount = cat.mercados['Nacional'] || 0;
            const intCount = cat.mercados['Internacional'] || 0;
            const sinCount = cat.mercados['Sin clasificar'] || 0;

            return {
                ...cat,
                participacionVal: pctVal,
                participacion: pctVal.toFixed(1) + '%',
                mercadoNacionalRegs: nacCount,
                mercadoNacionalPct: ((nacCount / catTotal) * 100).toFixed(1),
                mercadoInternacionalRegs: intCount,
                mercadoInternacionalPct: ((intCount / catTotal) * 100).toFixed(1),
                mercadoSinClasificarRegs: sinCount,
                mercadoSinClasificarPct: ((sinCount / catTotal) * 100).toFixed(1),
            };
        });

        return { canalVentaData: list, globalMercados };
    }, [data, dataForCanalVenta]);

    const activeCanalFilters = filters.canalVenta || [];

    const [canalTooltipPlacements, setCanalTooltipPlacements] = useState<Record<string, { vertical: 'top' | 'bottom'; horizontal: 'center' | 'left' | 'right' }>>({});

    const handleMouseEnterCanalCard = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;
        const tooltipHeight = 280;
        const tooltipWidth = 260;

        let vertical: 'top' | 'bottom' = 'bottom';
        if (spaceAbove < tooltipHeight) {
            vertical = 'bottom';
        } else if (spaceBelow < tooltipHeight && spaceAbove >= tooltipHeight) {
            vertical = 'top';
        } else {
            vertical = 'bottom';
        }

        const cardCenter = rect.left + rect.width / 2;
        let horizontal: 'center' | 'left' | 'right' = 'center';
        if (cardCenter - tooltipWidth / 2 < 16) {
            horizontal = 'left';
        } else if (cardCenter + tooltipWidth / 2 > window.innerWidth - 16) {
            horizontal = 'right';
        }

        setCanalTooltipPlacements(prev => ({
            ...prev,
            [id]: { vertical, horizontal }
        }));
    };

    return (
        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 flex flex-col space-y-2.5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                        Canales de Venta <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 normal-case font-normal">(% de Participación)</span>
                    </h3>
                </div>

                {/* Resumen Global de Participación por Mercado */}
                <div className="flex items-center gap-2">
                    <div className="relative group cursor-help bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-md px-2 py-0.5 flex items-center gap-1.5 text-[9px] transition-colors shadow-2xs">
                        <span className="font-bold text-slate-600 uppercase tracking-wider">Mercados:</span>
                        <span className="font-black text-emerald-700">Nac: {globalMercados.nacionalPct}%</span>
                        <span className="text-slate-300 font-light">|</span>
                        <span className="font-black text-sky-700">Int: {globalMercados.internacionalPct}%</span>
                        {globalMercados.sinClasificarCount > 0 && (
                            <>
                                <span className="text-slate-300 font-light">|</span>
                                <span className="font-semibold text-slate-500">Sin clasif: {globalMercados.sinClasificarPct}%</span>
                            </>
                        )}

                        {/* Tooltip con desglose global al pasar el mouse */}
                        <div className="hidden group-hover:block absolute right-0 top-full mt-2 w-64 p-3.5 bg-slate-900 text-white rounded-xl shadow-2xl text-xs z-50 animate-fade-in pointer-events-none border border-slate-700">
                            <div className="font-bold text-slate-100 border-b border-slate-700 pb-1.5 mb-2 flex items-center justify-between">
                                <span>Participación Total por Mercado</span>
                                <span className="text-[10px] font-bold text-slate-400">{globalMercados.total} casos</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-slate-300 text-[11px]">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                        Mercado Nacional:
                                    </span>
                                    <span className="font-bold text-emerald-400">{globalMercados.nacionalPct}% <span className="text-[10px] text-slate-400 font-normal">({globalMercados.nacionalCount})</span></span>
                                </div>
                                <div className="flex items-center justify-between text-slate-300 text-[11px]">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-sky-400" />
                                        Mercado Internacional:
                                    </span>
                                    <span className="font-bold text-sky-400">{globalMercados.internacionalPct}% <span className="text-[10px] text-slate-400 font-normal">({globalMercados.internacionalCount})</span></span>
                                </div>
                                {globalMercados.sinClasificarCount > 0 && (
                                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-slate-500" />
                                            Sin clasificar:
                                        </span>
                                        <span className="font-bold text-slate-300">{globalMercados.sinClasificarPct}% <span className="text-[10px] text-slate-400 font-normal">({globalMercados.sinClasificarCount})</span></span>
                                    </div>
                                )}
                            </div>
                            <div className="absolute top-0 right-6 -translate-y-full border-4 border-transparent border-b-slate-900" />
                        </div>
                    </div>

                    <span className="text-[9px] font-medium text-gray-400 hidden sm:inline">Pasa el mouse para ver detalles</span>
                </div>
            </div>

            {/* Barra acumulada horizontal proporcional */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full flex overflow-hidden p-0.5 gap-0.5">
                {canalVentaData.map(cat => {
                    const hasActiveFilter = activeCanalFilters.length > 0;
                    const isActive = !hasActiveFilter || activeCanalFilters.some(f => cat.matchingKeys.some(mk => mk.toLowerCase() === f.toLowerCase() || f.toLowerCase() === cat.id));
                    return (
                        <div
                            key={cat.id}
                            style={{ width: `${Math.max(cat.participacionVal, 2)}%`, backgroundColor: cat.color }}
                            className={`h-full rounded-sm transition-all duration-300 cursor-pointer ${
                                isActive ? 'opacity-100 hover:opacity-80' : 'opacity-25 hover:opacity-60'
                            }`}
                            onClick={(e) => onFilterToggle('canalVenta', cat.id, e)}
                            title={`${cat.nombre}: ${cat.participacion} | Registros: ${cat.regs} | Mercado Nac: ${cat.mercadoNacionalPct}%, Int: ${cat.mercadoInternacionalPct}%`}
                        />
                    );
                })}
            </div>

            {/* Tarjetas horizontales de los 3 canales Compactas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {canalVentaData.map(cat => {
                    const hasActiveFilter = activeCanalFilters.length > 0;
                    const isSelected = hasActiveFilter && activeCanalFilters.some(f => cat.matchingKeys.some(mk => mk.toLowerCase() === f.toLowerCase() || f.toLowerCase() === cat.id));
                    const isDimmed = hasActiveFilter && !isSelected;
                    const placement = canalTooltipPlacements[cat.id] || { vertical: 'bottom', horizontal: 'center' };
                    const isBottom = placement.vertical === 'bottom';
                    const horizontalClass = placement.horizontal === 'left'
                        ? 'left-0'
                        : placement.horizontal === 'right'
                        ? 'right-0'
                        : 'left-1/2 -translate-x-1/2';
                    const arrowHorizontalClass = placement.horizontal === 'left'
                        ? 'left-6'
                        : placement.horizontal === 'right'
                        ? 'right-6'
                        : 'left-1/2 -translate-x-1/2';

                    return (
                        <div
                            key={cat.id}
                            onMouseEnter={(e) => handleMouseEnterCanalCard(cat.id, e)}
                            onClick={(e) => onFilterToggle('canalVenta', cat.id, e)}
                            className={`group relative p-2.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                                isSelected 
                                    ? 'bg-white border-2 border-[#254153] ring-1.5 ring-[#254153]/20 shadow-xs' 
                                    : isDimmed
                                    ? 'bg-gray-50/50 border-gray-100 opacity-40 hover:opacity-95 hover:border-gray-300'
                                    : 'bg-white border-gray-200/80 shadow-2xs hover:shadow-xs hover:border-gray-300'
                            }`}
                        >
                            {/* Color Dot + Name + % Participación */}
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5 truncate pr-1">
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                                    <span className="text-[11px] font-bold text-gray-800 truncate">{cat.nombre}</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className="text-xs font-black text-gray-900">{cat.participacion}</span>
                                    {isSelected && (
                                        <span className="text-[8px] font-bold bg-[#254153] text-white px-1.5 py-0.2 rounded-full">Activo</span>
                                    )}
                                </div>
                            </div>

                            {/* Métricas Compactas en Fila */}
                            <div className="flex items-center justify-between gap-1 text-[10px] bg-slate-50/80 px-2 py-1 rounded-md border border-slate-100">
                                <span className="text-gray-600">
                                    Regs: <strong className="font-bold text-gray-800">{cat.regs.toLocaleString('es-CO')}</strong>
                                </span>
                                <span className="text-gray-300">|</span>
                                <span className="text-amber-800">
                                    Unids: <strong className="font-bold text-amber-900">{cat.prods.toLocaleString('es-CO')}</strong>
                                </span>
                                <span className="text-gray-300">|</span>
                                <span className="text-[9px] font-medium text-slate-500 truncate" title="Participación por Mercado: Nacional vs Internacional">
                                    Nac: <strong className="text-emerald-700 font-semibold">{cat.mercadoNacionalPct}%</strong> • Int: <strong className="text-sky-700 font-semibold">{cat.mercadoInternacionalPct}%</strong>
                                </span>
                            </div>

                            {/* Tooltip emergente inteligente: hacia abajo si no cabe arriba */}
                            <div
                                className={`hidden group-hover:block absolute ${horizontalClass} ${
                                    isBottom ? 'top-full mt-2' : 'bottom-full mb-2'
                                } w-64 p-3.5 bg-slate-900 text-white rounded-xl shadow-2xl text-xs z-50 animate-fade-in pointer-events-none border border-slate-700`}
                            >
                                <div className="font-bold text-slate-100 border-b border-slate-700 pb-1.5 mb-2 flex items-center justify-between">
                                    <span>{cat.nombre}</span>
                                    <span className="text-sky-400 font-black">{cat.participacion}</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-slate-300">
                                        <span className="text-[11px] text-slate-300">Total de registros hechos:</span>
                                        <span className="font-bold text-white text-xs bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{cat.regs.toLocaleString('es-CO')}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-300">
                                        <span className="text-[11px] text-slate-300">Productos con novedad:</span>
                                        <span className="font-bold text-amber-300 text-xs bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50">{cat.prods.toLocaleString('es-CO')}</span>
                                    </div>

                                    {/* Participación por Mercado en este Canal */}
                                    <div className="border-t border-slate-700/80 pt-2 mt-1">
                                        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                                            <span>Participación por Mercado:</span>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="text-slate-300 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                    Nacional:
                                                </span>
                                                <span className="font-bold text-emerald-400">
                                                    {cat.mercadoNacionalPct}% <span className="text-[10px] text-slate-400 font-normal">({cat.mercadoNacionalRegs})</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="text-slate-300 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                                                    Internacional:
                                                </span>
                                                <span className="font-bold text-sky-400">
                                                    {cat.mercadoInternacionalPct}% <span className="text-[10px] text-slate-400 font-normal">({cat.mercadoInternacionalRegs})</span>
                                                </span>
                                            </div>
                                            {cat.mercadoSinClasificarRegs > 0 && (
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="text-slate-400 flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                                        Sin clasificar:
                                                    </span>
                                                    <span className="font-bold text-slate-300">
                                                        {cat.mercadoSinClasificarPct}% <span className="text-[10px] text-slate-400 font-normal">({cat.mercadoSinClasificarRegs})</span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {/* Flecha del tooltip apuntando al contenedor */}
                                <div
                                    className={`absolute ${arrowHorizontalClass} border-4 border-transparent ${
                                        isBottom
                                            ? 'bottom-full border-b-slate-900'
                                            : 'top-full border-t-slate-900'
                                    }`}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
// ─────────────────────────────────────────────────────────────────────────────

export default function GeneralMac({ data, prevData, dataForDefectos, dataForResponsables, dataForCiudades, dataForZonas, dataForClientes, dataForProductos, dataForMesCreacion, dataForCanalVenta, dataForMercado, filters, setFilters, onFilterToggle, razones, defectosRef = [], responsablesRef = [], filtersComponent }: Props) {
    // ── KPIs memoizados ────────────────────────────────────────────────────────
    const totalNovedades = data.length;
    const { abiertas, cerradas, valorInvertido } = useMemo(() => ({
        abiertas: data.filter(d => d.estado === 'Abierto').length,
        cerradas: data.filter(d => d.estado === 'Cerrado').length,
        valorInvertido: data.reduce((acc, curr) => acc + (curr._valorInvertido || 0), 0),
    }), [data]);

    const variacionNovedades = 5.2; // %

    // ── Maps O(1) para lookup de IDs → nombres (construidos una sola vez) ──────
    const defectosMap = useMemo(() =>
        new Map<string, string>(defectosRef.map((d: any) => [String(d.id), d.defecto])),
        [defectosRef]
    );
    const razonesMap = useMemo(() =>
        new Map<string, string>((razones || []).map((r: any) => [String(r.id), r.razon])),
        [razones]
    );
    const responsablesMap = useMemo(() =>
        new Map<string, string>((responsablesRef || []).map((r: any) => [String(r.id), r.responsable])),
        [responsablesRef]
    );

    // getNombreProblema usando Maps O(1)
    const getNombreProblema = (id: number | string): string => {
        const key = String(id);
        return defectosMap.get(key) || razonesMap.get(key) || `ID ${id}`;
    };

    const getResponsableNombre = (id: number | string): string => {
        return responsablesMap.get(String(id)) || `ID ${id}`;
    };

    // Chart 1: Total registros por mes con desglose apilado por Tipo de Solicitud
    const { registrosPorMes, tiposSolicitudMes } = useMemo(() => {
        const counts: Record<string, { key: string; total: number; [tipo: string]: any }> = {};
        const sourceData = dataForMesCreacion || data;
        const tiposSet = new Set<string>();

        sourceData.forEach(d => {
            const key = d._mesCreacionKey || '';
            if (!key) return;

            const rawTipo = (d.tipo_solicitud || '').trim();
            const tipo = rawTipo ? (rawTipo.charAt(0).toUpperCase() + rawTipo.slice(1).toLowerCase()) : 'Sin Definir';
            tiposSet.add(tipo);

            if (!counts[key]) {
                counts[key] = { key, total: 0, _mercados: { 'Nacional': 0, 'Internacional': 0, 'Sin clasificar': 0 } };
            }
            counts[key].total += 1;
            counts[key][tipo] = (counts[key][tipo] || 0) + 1;
            const m = d._mercado || 'Sin clasificar';
            if (!counts[key]._mercados) counts[key]._mercados = { 'Nacional': 0, 'Internacional': 0, 'Sin clasificar': 0 };
            counts[key]._mercados[m] = (counts[key]._mercados[m] || 0) + 1;
        });

        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        // Prioridad visual en el apilado (base sólida abajo, quejas/reclamos arriba)
        const typePriority: Record<string, number> = {
            'garantia': 1,
            'garantía': 1,
            'encuesta b2c': 2,
            'encuesta b2b': 3,
            'atencion': 4,
            'atención': 4,
            'solicitud': 5,
            'peticion': 6,
            'petición': 6,
            'servicio': 7,
            'servicio tecnico': 7,
            'asesoria': 8,
            'asesoría': 8,
            'reclamo': 9,
            'queja': 10,
            'felicitacion': 11,
            'felicitación': 11,
            'otros': 90,
            'sin definir': 99,
        };

        const tiposList = Array.from(tiposSet).sort((a, b) => {
            const normA = a.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            const normB = b.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            const prioA = typePriority[normA] || 50;
            const prioB = typePriority[normB] || 50;
            if (prioA !== prioB) return prioA - prioB;
            return a.localeCompare(b);
        });

        const sortedData = Object.values(counts)
            .sort((a, b) => a.key.localeCompare(b.key))
            .map(item => {
                const [yyyy, mm] = item.key.split('-');
                const monthIndex = parseInt(mm, 10) - 1;
                tiposList.forEach(t => {
                    if (item[t] === undefined) item[t] = 0;
                });
                return {
                    ...item,
                    mes: monthNames[monthIndex] || item.key,
                    Registros: item.total,
                    total: item.total,
                };
            });

        return { registrosPorMes: sortedData, tiposSolicitudMes: tiposList };
    }, [data, dataForMesCreacion]);

    // Mapa de colores únicos y exclusivos por tipo de solicitud para este conjunto de datos
    const tipoColorMap = useMemo(() => {
        return getTipoSolicitudColorMap(tiposSolicitudMes);
    }, [tiposSolicitudMes]);

    // Tooltip enriquecido para el gráfico apilado de Ingresos por Mes
    const CustomIngresosTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        const entry = payload[0]?.payload;
        if (!entry) return null;

        const items = payload
            .filter((p: any) => p.dataKey !== 'Registros' && p.dataKey !== 'total' && typeof p.value === 'number' && p.value > 0)
            .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));

        const total = entry.total || entry.Registros || 0;

        return (
            <div className="bg-white/95 backdrop-blur-sm p-3.5 rounded-xl border border-gray-100 shadow-xl text-xs space-y-2 min-w-[200px]">
                <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                    <span className="font-bold text-gray-800 text-sm">{label || entry.mes}</span>
                    <span className="font-extrabold text-[#254153] text-xs bg-slate-100 px-2 py-0.5 rounded-full">
                        {total} {total === 1 ? 'solicitud' : 'solicitudes'}
                    </span>
                </div>
                <div className="space-y-1.5 pt-0.5">
                    {items.length > 0 ? (
                        items.map((item: any, i: number) => {
                            const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                            const itemColor = tipoColorMap[item.name] || tipoColorMap[item.dataKey] || item.color || item.fill;
                            return (
                                <div key={i} className="flex items-center justify-between gap-3 text-gray-600">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: itemColor }} />
                                        <span className="truncate font-medium">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 font-bold text-gray-800">
                                        <span>{item.value}</span>
                                        <span className="text-[10px] text-gray-400 font-normal">({pct}%)</span>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-gray-400 text-center py-1">Sin detalles</div>
                    )}
                </div>
                {/* Participación por Mercado en este mes */}
                {total > 0 && entry._mercados && (
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px]">
                        <span className="text-gray-500 font-bold uppercase tracking-wider">Mercado:</span>
                        <span className="font-bold text-gray-700">
                            Nac: <strong className="text-emerald-700">{(((entry._mercados['Nacional'] || 0) / total) * 100).toFixed(1)}%</strong> • Int: <strong className="text-sky-700">{(((entry._mercados['Internacional'] || 0) / total) * 100).toFixed(1)}%</strong>
                        </span>
                    </div>
                )}
                {filters.mesCreacion.length > 0 && filters.mesCreacion.includes(entry.key) && (
                    <div className="text-[10px] text-brand font-semibold pt-1 border-t border-gray-100">
                        ✓ Mes seleccionado en filtros (clic para deseleccionar)
                    </div>
                )}
            </div>
        );
    };

    const promedioIngresoMensual = useMemo(() => {
        const numMeses = registrosPorMes.length || 1;
        const avg = totalNovedades / numMeses;
        return avg % 1 === 0 ? avg.toString() : avg.toFixed(1);
    }, [totalNovedades, registrosPorMes]);

    // ── getProductosStats memoizada (evita recalcular en cada render) ──────────
    const buildProductosStats = (field: 'productos_compra' | 'productos_novedad', sourceData: RegistroMAC[]) => {
        const stats: Record<string, { registrosSet: Set<number>, productosAfectados: number, codigosSet: Set<string> }> = {};

        const activeGroupFilters = (filters.productos || []).filter(f => String(f).toUpperCase().startsWith('GF:'));
        const activePlantFilters = (filters.productos || []).filter(f => String(f).toUpperCase().startsWith('PL:'));
        const activeSpecificFilters = (filters.productos || []).filter(f => !String(f).toUpperCase().startsWith('GF:') && !String(f).toUpperCase().startsWith('PL:'));

        sourceData.forEach(d => {
            if (activeSpecificFilters.length > 0) {
                const hasSpecificMatch = activeSpecificFilters.some(f => (d as any)._productosNombres?.some((pn: any) => String(pn).toUpperCase().trim() === String(f).toUpperCase().trim()));
                if (!hasSpecificMatch) return;
            }
            if (activePlantFilters.length > 0) {
                const hasPlantMatch = activePlantFilters.some(f => {
                    const pName = String(f).substring(3).toUpperCase().trim();
                    return (d as any)._plantasNombres?.some((pn: any) => String(pn).toUpperCase().trim() === pName);
                });
                if (!hasPlantMatch) return;
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
                                    // O(1) lookup con Map
                                    const respNombre = prob.responsable_problema_id ? getResponsableNombre(prob.responsable_problema_id) : '';
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
                                const respNombre = p.responsable_problema_id ? getResponsableNombre(p.responsable_problema_id) : '';
                                if (!filters.responsables.includes(respNombre)) matchResp = false;
                            }
                            if (matchDef && matchResp) hasMatchingProblem = true;
                        }
                        if (!hasMatchingProblem) include = false;
                    }

                    if (activeGroupFilters.length > 0) {
                        const prodGrupo = p._grupo || p.grupo || p.grupo_producto || '';
                        const normalizeGroupNameGlobal = (g: string): string => {
                            if (!g) return 'Otros';
                            let norm = String(g).trim().toUpperCase();
                            if (['COCINA', 'COCINAS', 'MESON', 'MESONES', 'LAVAPLATOS'].includes(norm)) return 'Cocinas';
                            if (['BAÑO', 'BAÑOS', 'BANO', 'BANOS', 'LAVAMANOS', 'MUEBLE', 'MUEBLES', 'BAÑO'].includes(norm)) return 'Baño';
                            if (['HIDROTERAPIA', 'HIDROMASAJE', 'HIDROMASAJES', 'SPA', 'TINA', 'HIDROEMP', 'HIDROPOR', 'BAÑERA'].includes(norm)) return 'Hidroterapia';
                            if (['LABORES', 'LABOR', 'ROPAS', 'ROPA', 'LAVARROPAS'].includes(norm)) return 'Labores';
                            if (['GRIFERIA', 'GRIFERÍA', 'GRIFERIAS'].includes(norm)) return 'Griferia';
                            if (['COMERCIALIZADOS', 'COMERCIALIZADO', 'MPDIRECT', 'REPUESTO', 'REPUESTOS', 'REPOSICION'].includes(norm)) return 'Comercializados';
                            if (['INFRAESTRUCTURA', 'PATA', 'PISO'].includes(norm)) return 'Infraestructura';
                            if (['PLOMERIA', 'PLOMERÍA'].includes(norm)) return 'Plomeria';
                            if (['SERVICIOS', 'SERVICIO'].includes(norm)) return 'Servicios';
                            if (['CUIDADO&MANTENIMIENTO', 'CUIDADO & MANTENIMIENTO', 'CUIDYMNTTOHIDROS'].includes(norm)) return 'Cuidado&Mantenimiento';
                            return norm.charAt(0).toUpperCase() + norm.slice(1).toLowerCase();
                        };
                        const matchesGroup = activeGroupFilters.some(gf => {
                            const groupName = normalizeGroupNameGlobal(gf.substring(3));
                            return normalizeGroupNameGlobal(prodGrupo) === groupName;
                        });
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
                return {
                    nombre,
                    codigo: codigosArr.length > 0 ? codigosArr.join(', ') : '',
                    Registros: regs,
                    'Productos Afectados': stat.productosAfectados,
                    Participacion: ((regs / totalRegistros) * 100).toFixed(1) + '%'
                };
            })
            .sort((a, b) => b.Registros - a.Registros);
    };

    const tipoProblemaStats = useMemo(() => {
        const stats: Record<string, { registrosSet: Set<number>, productosAfectados: number }> = {};

        const sourceData = dataForDefectos || data;
        let checkedProducts = 0;
        let passedProducts = 0;
        let productsWithProblems = 0;
        
        sourceData.forEach(d => {
            if (Array.isArray(d.productos_novedad)) {
                d.productos_novedad.forEach((p: any) => {
                    checkedProducts++;
                    let passesProductos = productMatchesFilters(p, filters.productos);
                    if (filters.productos && filters.productos.length > 0) {
                        console.log('DEBUG CHECK:', p._grupo, p.grupo, p.grupo_producto, 'Filter:', filters.productos, 'Passes?', passesProductos);
                    }
                    if (!passesProductos) return;
                    passedProducts++;

                    let hasProblema = false;

                    if (Array.isArray(p.problemas) && p.problemas.length > 0) {
                        p.problemas.forEach((prob: any) => {
                            let matchResp = true;
                            if (filters.responsables && filters.responsables.length > 0) {
                                // O(1) Map lookup
                                const respNombre = prob.responsable_problema_id ? getResponsableNombre(prob.responsable_problema_id) : '';
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
                            const respNombre = p.responsable_problema_id ? getResponsableNombre(p.responsable_problema_id) : '';
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
            .map(([nombre, stat]) => ({
                nombre,
                Registros: stat.registrosSet.size,
                'Productos Afectados': stat.productosAfectados,
                Participacion: ((stat.registrosSet.size / totalRegistros) * 100).toFixed(1) + '%'
            }))
            .sort((a, b) => b.Registros - a.Registros);
    }, [data, dataForDefectos, defectosMap, razonesMap, responsablesMap, filters.productos, filters.responsables]);

    const responsableProblemaStats = useMemo(() => {
        const stats: Record<string, { registrosSet: Set<number>, productosAfectados: number }> = {};

        const sourceData = dataForResponsables || data;
        sourceData.forEach(d => {
            if (Array.isArray(d.productos_novedad)) {
                d.productos_novedad.forEach((p: any) => {
                    let passesProductos = productMatchesFilters(p, filters.productos);
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
                                // O(1) Map lookup
                                const nombre = getResponsableNombre(prob.responsable_problema_id);
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
                            const nombre = getResponsableNombre(p.responsable_problema_id);
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
            .map(([nombre, stat]) => ({
                nombre,
                Registros: stat.registrosSet.size,
                'Productos Afectados': stat.productosAfectados,
                Participacion: ((stat.registrosSet.size / totalRegistros) * 100).toFixed(1) + '%'
            }))
            .sort((a, b) => b.Registros - a.Registros);
    }, [data, dataForResponsables, responsablesMap, defectosMap, razonesMap, filters.productos, filters.defectos]);

    // Memoizados correctamente con sus dependencias reales
    const productosNovedadStats = useMemo(() =>
        buildProductosStats('productos_novedad', dataForProductos || data),
        [data, dataForProductos, filters.productos, filters.defectos, filters.responsables, defectosMap, razonesMap, responsablesMap]
    );
    const productosCompraStats = useMemo(() =>
        buildProductosStats('productos_compra', dataForProductos || data),
        [data, dataForProductos, filters.productos, filters.defectos, filters.responsables, defectosMap, razonesMap, responsablesMap]
    );

    const productosGruposStats = useMemo(() => {
        const stats: Record<string, { registrosSet: Set<number>; productosAfectados: number }> = {};
        const sourceData = dataForProductos || data;

        sourceData.forEach(d => {
            let hasMatchedItem = false;
            if (Array.isArray(d.productos_novedad) && d.productos_novedad.length > 0) {
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
                                    const respNombre = prob.responsable_problema_id ? getResponsableNombre(prob.responsable_problema_id) : '';
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
                                const respNombre = p.responsable_problema_id ? getResponsableNombre(p.responsable_problema_id) : '';
                                if (!filters.responsables.includes(respNombre)) matchResp = false;
                            }
                            if (matchDef && matchResp) hasMatchingProblem = true;
                        }
                        if (!hasMatchingProblem) include = false;
                    }

                    if (include && !productMatchesFilters(p, filters.productos, 'GF')) {
                        include = false;
                    }

                    if (include) {
                        hasMatchedItem = true;
                        const rawG = p.familia || '';
                        const grupo = normalizeGrupoName(rawG);
                        if (!stats[grupo]) stats[grupo] = { registrosSet: new Set(), productosAfectados: 0 };
                        stats[grupo].registrosSet.add(d.id);
                        stats[grupo].productosAfectados += (p.cantidad || 1);
                    }
                });
            }

            // Radicados sin novedades o donde ninguna novedad tuvo clasificación
            if (!hasMatchedItem) {
                const passDefResp = (!filters.defectos || filters.defectos.length === 0) && (!filters.responsables || filters.responsables.length === 0);
                const passPL = (!filters.productos || !filters.productos.some(f => String(f).toUpperCase().startsWith('PL:')));
                if (passDefResp && passPL) {
                    if (!stats['En Blanco']) stats['En Blanco'] = { registrosSet: new Set(), productosAfectados: 0 };
                    stats['En Blanco'].registrosSet.add(d.id);
                }
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
    }, [data, dataForProductos, defectosMap, razonesMap, responsablesMap, filters.defectos, filters.responsables, filters.productos]);

    const productosPlantasStats = useMemo(() => {
        const stats: Record<string, { registrosSet: Set<number>; productosAfectados: number }> = {};
        const sourceData = dataForProductos || data;

        sourceData.forEach(d => {
            let hasMatchedItem = false;
            if (Array.isArray(d.productos_novedad) && d.productos_novedad.length > 0) {
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
                                    const respNombre = prob.responsable_problema_id ? getResponsableNombre(prob.responsable_problema_id) : '';
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
                                const respNombre = p.responsable_problema_id ? getResponsableNombre(p.responsable_problema_id) : '';
                                if (!filters.responsables.includes(respNombre)) matchResp = false;
                            }
                            if (matchDef && matchResp) hasMatchingProblem = true;
                        }
                        if (!hasMatchingProblem) include = false;
                    }

                    if (include && !productMatchesFilters(p, filters.productos, 'PL')) {
                        include = false;
                    }

                    if (include) {
                        hasMatchedItem = true;
                        const rawP = p.planta || '';
                        const planta = normalizePlantaName(rawP);
                        if (!stats[planta]) stats[planta] = { registrosSet: new Set(), productosAfectados: 0 };
                        stats[planta].registrosSet.add(d.id);
                        stats[planta].productosAfectados += (p.cantidad || 1);
                    }
                });
            }

            // Radicados sin novedades o donde ninguna novedad tuvo clasificación
            if (!hasMatchedItem) {
                const passDefResp = (!filters.defectos || filters.defectos.length === 0) && (!filters.responsables || filters.responsables.length === 0);
                const passGF = (!filters.productos || !filters.productos.some(f => String(f).toUpperCase().startsWith('GF:')));
                if (passDefResp && passGF) {
                    if (!stats['En Blanco']) stats['En Blanco'] = { registrosSet: new Set(), productosAfectados: 0 };
                    stats['En Blanco'].registrosSet.add(d.id);
                }
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
    }, [data, dataForProductos, defectosMap, razonesMap, responsablesMap, filters.defectos, filters.responsables, filters.productos]);

    // Chart 7 & 8: Ciudades y Zonas — dependencias correctas sobre sourceData
    const ciudadesData = useMemo(() => {
        const stats: Record<string, { regs: number, prods: number }> = {};
        const sourceData = dataForCiudades || data;
        const total = sourceData.length || 1;
        sourceData.forEach(d => {
            const ciudad = d._ciudad || 'Desconocida';
            if (!stats[ciudad]) stats[ciudad] = { regs: 0, prods: 0 };
            stats[ciudad].regs += 1;
            if (Array.isArray(d.productos_novedad)) {
                stats[ciudad].prods += d.productos_novedad.reduce((acc: number, p: any) => acc + (p.cantidad || 1), 0);
            }
        });
        return Object.entries(stats).map(([nombre, stat]) => ({
            nombre,
            Registros: stat.regs,
            'Productos Afectados': stat.prods,
            Participacion: ((stat.regs / total) * 100).toFixed(1) + '%'
        })).sort((a, b) => b.Registros - a.Registros);
    }, [data, dataForCiudades]);

    const zonasData = useMemo(() => {
        const stats: Record<string, { regs: number, prods: number }> = {};
        const sourceData = dataForZonas || data;
        const total = sourceData.length || 1;
        sourceData.forEach(d => {
            const zona = d._zona || 'Desconocida';
            if (!stats[zona]) stats[zona] = { regs: 0, prods: 0 };
            stats[zona].regs += 1;
            if (Array.isArray(d.productos_novedad)) {
                stats[zona].prods += d.productos_novedad.reduce((acc: number, p: any) => acc + (p.cantidad || 1), 0);
            }
        });
        return Object.entries(stats).map(([nombre, stat]) => ({
            nombre,
            Registros: stat.regs,
            'Productos Afectados': stat.prods,
            Participacion: ((stat.regs / total) * 100).toFixed(1) + '%'
        })).sort((a, b) => b.Registros - a.Registros);
    }, [data, dataForZonas]);

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
            {filtersComponent ? (
                <div className="space-y-4 mb-2">
                    {/* Filtros a la izquierda, estirados a la altura de Mercados + Canales */}
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="w-full lg:w-64 xl:w-72 shrink-0 lg:*:h-full">
                            {filtersComponent}
                        </div>
                        <div className="flex-1 min-w-0 space-y-4">
                            <MercadosParticipacionCard
                                data={data}
                                dataForMercado={dataForMercado || data}
                                filters={filters}
                                onFilterToggle={onFilterToggle}
                            />
                            <CanalesVentaCard
                                data={data}
                                dataForCanalVenta={dataForCanalVenta || data}
                                filters={filters}
                                onFilterToggle={onFilterToggle}
                            />
                        </div>
                    </div>
                    {/* Tarjetas KPI en fila completa */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        <KpiCard title="Total Solicitudes" value={totalNovedades} variacion={variacionNovedades} />
                        <KpiCard title="Valor Invertido" value={valorInvertido.toLocaleString('es-CO')} prefix="$" />
                        <KpiCard title="Solicitudes Abiertas" value={abiertas} />
                        <KpiCard title="Solicitudes Cerradas" value={cerradas} />
                        <KpiCard title="Promedio Mensual" value={promedioIngresoMensual} suffix=" / mes" subtitle={`Basado en ${registrosPorMes.length} ${registrosPorMes.length === 1 ? 'mes' : 'meses'}`} />
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <MercadosParticipacionCard
                        data={data}
                        dataForMercado={dataForMercado || data}
                        filters={filters}
                        onFilterToggle={onFilterToggle}
                    />
                    <CanalesVentaCard
                        data={data}
                        dataForCanalVenta={dataForCanalVenta || data}
                        filters={filters}
                        onFilterToggle={onFilterToggle}
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-5 gap-4">
                        <KpiCard title="Total Solicitudes" value={totalNovedades} variacion={variacionNovedades} />
                        <KpiCard title="Valor Invertido" value={valorInvertido.toLocaleString('es-CO')} prefix="$" />
                        <KpiCard title="Solicitudes Abiertas" value={abiertas} />
                        <KpiCard title="Solicitudes Cerradas" value={cerradas} />
                        <KpiCard title="Promedio Mensual" value={promedioIngresoMensual} suffix=" / mes" subtitle={`Basado en ${registrosPorMes.length} ${registrosPorMes.length === 1 ? 'mes' : 'meses'}`} />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Chart 1: Registros por mes apilados por tipo de solicitud */}
                <div className="xl:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Ingresos por Mes</h3>
                            <p className="text-[11px] text-gray-400 font-medium">Distribución apilada por tipo de solicitud</p>
                        </div>
                        {filters.mesCreacion.length > 0 && (
                            <button
                                onClick={(e) => onFilterToggle('mesCreacion', filters.mesCreacion[0], e)}
                                className="text-[10px] font-semibold text-brand bg-brand/10 hover:bg-brand/20 border border-brand/20 px-2.5 py-1 rounded-full transition-colors flex items-center gap-1"
                                title="Limpiar filtro de mes"
                            >
                                Limpiar filtro mes ✕
                            </button>
                        )}
                    </div>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={registrosPorMes} margin={{ top: 25, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                <RechartsTooltip content={<CustomIngresosTooltip />} cursor={{ fill: '#f9fafb' }} />
                                <Legend 
                                    iconType="circle" 
                                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                                    formatter={(value: string) => {
                                        const isFiltered = filters.tipoSolicitud.length > 0;
                                        const isThisSelected = filters.tipoSolicitud.some(f => f.toLowerCase() === value.toLowerCase());
                                        return (
                                            <span 
                                                className={`cursor-pointer transition-opacity ${isFiltered && !isThisSelected ? 'opacity-35 line-through' : 'font-semibold text-gray-700'}`}
                                                title={`Clic para filtrar por ${value}`}
                                            >
                                                {value}
                                            </span>
                                        );
                                    }}
                                    onClick={(e: any) => {
                                        if (e && (e.dataKey || e.value)) {
                                            onFilterToggle('tipoSolicitud', e.dataKey || e.value);
                                        }
                                    }}
                                />
                                {tiposSolicitudMes.length > 0 ? (
                                    tiposSolicitudMes.map((tipo, index) => {
                                        const color = tipoColorMap[tipo] || getTipoSolicitudColor(tipo, index);
                                        const isTop = index === tiposSolicitudMes.length - 1;
                                        return (
                                            <Bar
                                                key={tipo}
                                                dataKey={tipo}
                                                name={tipo}
                                                stackId="tipoSolStack"
                                                fill={color}
                                                isAnimationActive={false}
                                                maxBarSize={60}
                                                radius={isTop ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                                onClick={(barData: any, i: number, e: any) => onFilterToggle('mesCreacion', barData.payload?.key, e)}
                                                className="cursor-pointer hover:opacity-85 transition-opacity"
                                            >
                                                {registrosPorMes.map((entry, idx) => (
                                                    <Cell
                                                        key={`cell-${tipo}-${idx}`}
                                                        fill={color}
                                                        fillOpacity={filters.mesCreacion.length === 0 || filters.mesCreacion.includes(entry.key) ? 1 : 0.25}
                                                    />
                                                ))}
                                            </Bar>
                                        );
                                    })
                                ) : (
                                    <Bar
                                        dataKey="Registros"
                                        fill="#254153"
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={60}
                                        isAnimationActive={false}
                                        onClick={(barData: any, i: number, e: any) => onFilterToggle('mesCreacion', barData.payload?.key, e)}
                                    >
                                        {registrosPorMes.map((entry, index) => (
                                            <Cell
                                                key={`cell-mes-${index}`}
                                                fill="#254153"
                                                fillOpacity={filters.mesCreacion.length === 0 || filters.mesCreacion.includes(entry.key) ? 1 : 0.25}
                                            />
                                        ))}
                                    </Bar>
                                )}
                                <Line
                                    type="monotone"
                                    dataKey="total"
                                    stroke="transparent"
                                    dot={false}
                                    legendType="none"
                                    tooltipType="none"
                                    isAnimationActive={false}
                                >
                                    <LabelList
                                        dataKey="total"
                                        position="top"
                                        offset={8}
                                        style={{ fill: '#374151', fontSize: 12, fontWeight: 'bold' }}
                                    />
                                </Line>
                            </ComposedChart>
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
                                    <Bar isAnimationActive={false} 
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
                                    <Bar isAnimationActive={false} 
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
                                    <Bar isAnimationActive={false} 
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
                                    <Bar isAnimationActive={false} 
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

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
                {/* Chart 6: Productos de Compra */}
                <ProductTable title="Productos de Compra" data={productosCompraStats} maxHeight={440} filterKey="productos" onFilterToggle={onFilterToggle} activeFilters={filters.productos} />

                {/* Chart 7: Productos con Novedad */}
                <ProductTable title="Productos con Novedad" data={productosNovedadStats} maxHeight={440} filterKey="productos" onFilterToggle={onFilterToggle} activeFilters={filters.productos} />

                {/* Chart 9: Plantas */}
                <PlantasProductoTableCard title="Plantas de Producto" data={productosPlantasStats} maxHeight={440} onFilterToggle={onFilterToggle} activeFilters={filters.productos} />

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
                                <Bar isAnimationActive={false} dataKey="Registros" fill="#254153" radius={[4, 4, 0, 0]} maxBarSize={45}>
                                    <LabelList dataKey="Registros" position="top" style={{ fill: '#254153', fontSize: 11, fontWeight: 'bold' }} />
                                </Bar>
                                <Bar isAnimationActive={false} dataKey="Productos Afectados" fill="#c96a4e" radius={[4, 4, 0, 0]} maxBarSize={45}>
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
                                <Bar isAnimationActive={false} dataKey="Registros" fill="#749094" radius={[4, 4, 0, 0]} maxBarSize={45}>
                                    <LabelList dataKey="Registros" position="top" style={{ fill: '#749094', fontSize: 11, fontWeight: 'bold' }} />
                                </Bar>
                                <Bar isAnimationActive={false} dataKey="Productos Afectados" fill="#c96a4e" radius={[4, 4, 0, 0]} maxBarSize={45}>
                                    <LabelList dataKey="Productos Afectados" position="top" style={{ fill: '#c96a4e', fontSize: 10, fontWeight: 'bold' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Tabla de Radicados y Comentarios */}
            <div className="mt-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Relación de Radicados</h3>
                <div className="overflow-y-auto max-h-[400px] custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-gray-50">
                                <th className="px-4 py-3 text-xs font-black uppercase text-gray-500 rounded-tl-lg whitespace-nowrap w-[150px]">Radicado</th>
                                <th className="px-4 py-3 text-xs font-black uppercase text-gray-500 whitespace-nowrap w-[200px]">Familia(s)</th>
                                <th className="px-4 py-3 text-xs font-black uppercase text-gray-500 whitespace-nowrap w-[200px]">Planta(s)</th>
                                <th className="px-4 py-3 text-xs font-black uppercase text-gray-500 rounded-tr-lg">Comentario</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-xs text-gray-400">No hay datos disponibles</td>
                                </tr>
                            ) : (
                                data.map((d, i) => {
                                    const gruposSet = new Set<string>();
                                    const plantasSet = new Set<string>();
                                    
                                    if (Array.isArray(d.productos_novedad)) {
                                        d.productos_novedad.forEach((p: any) => {
                                            gruposSet.add(normalizeGrupoName(p.familia || ''));
                                            plantasSet.add(normalizePlantaName(p.planta || ''));
                                        });
                                    }
                                    if (gruposSet.size === 0) gruposSet.add('En Blanco');
                                    if (plantasSet.size === 0) plantasSet.add('En Blanco');
                                    
                                    const gruposArr = Array.from(gruposSet);
                                    const plantasArr = Array.from(plantasSet);

                                    return (
                                        <tr key={d.id || i} className={i % 2 === 0 ? 'bg-white hover:bg-blue-50/40' : 'bg-gray-50/60 hover:bg-blue-50/40'}>
                                            <td className="px-4 py-3 text-xs font-bold text-gray-800 whitespace-nowrap border-b border-gray-100 align-top">
                                                {d.consecutivo ? (
                                                    <a 
                                                        href={`/ver-registro/${d.id}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="text-blue-600 hover:text-blue-800 hover:underline"
                                                        title={`Ver detalles del radicado ${d.consecutivo}`}
                                                    >
                                                        {d.consecutivo}
                                                    </a>
                                                ) : (
                                                    'N/A'
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600 border-b border-gray-100 align-top">
                                                {gruposArr.length > 0 ? gruposArr.join(', ') : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600 border-b border-gray-100 align-top">
                                                {plantasArr.length > 0 ? plantasArr.join(', ') : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600 border-b border-gray-100 align-top">{d.comentarios || 'Sin comentarios'}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
