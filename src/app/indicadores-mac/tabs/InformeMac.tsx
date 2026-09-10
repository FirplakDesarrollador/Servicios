'use client';
import React, { useMemo, useState, useCallback, useRef } from 'react';
import { RegistroMAC, FilterState } from '../types';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    ScatterChart, Scatter, Cell, ZAxis, LabelList,
} from 'recharts';
import {
    DollarSignIcon, HashIcon, PackageIcon, TrendingUpIcon,
    TrendingDownIcon, MinusIcon, ArrowUpIcon, ArrowDownIcon,
    DownloadIcon, ChevronDownIcon, ChevronUpIcon, CalendarIcon,
    FilterIcon, AlertTriangleIcon,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ── Types ──────────────────────────────────────────────────────────────────
interface Props {
    data: RegistroMAC[];
    prevData: RegistroMAC[];
    filters: FilterState;
    setFilters?: any;
    onFilterToggle: (key: keyof FilterState, value: string, e?: any) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const COLORS = ['#254153', '#749094', '#c96a4e', '#d3b99f', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const BRAND = '#254153';
const ACCENT = '#749094';

const fmt$ = (v: number) => `$${v.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
const fmtN = (v: number) => v.toLocaleString('es-CO');
const fmtPct = (v: number | null) => {
    if (v === null || isNaN(v)) return '—';
    return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
};
const calcVar = (curr: number, prev: number): number | null => {
    if (prev === 0) return curr > 0 ? null : 0;
    return ((curr - prev) / prev) * 100;
};

const normalizeGrupoName = (g: string): string => {
    if (!g) return 'OTROS';
    const norm = String(g).trim().toUpperCase();
    if (['COCINA', 'COCINAS', 'MESON', 'MESONES', 'LAVAPLATOS'].includes(norm)) return 'COCINAS';
    if (['BAÑO', 'BAÑOS', 'BANO', 'BANOS', 'LAVAMANOS', 'MUEBLE', 'MUEBLES'].includes(norm)) return 'BAÑOS';
    if (['HIDROMASAJE', 'HIDROMASAJES', 'SPA', 'TINA'].includes(norm)) return 'HIDROMASAJES';
    if (['REPUESTO', 'REPUESTOS', 'REPOSICION'].includes(norm)) return 'REPUESTOS';
    if (['LAVARROPAS', 'ROPA', 'ROPAS'].includes(norm)) return 'ROPAS';
    if (['INFRAESTRUCTURA', 'PATA', 'PISO'].includes(norm)) return 'INFRAESTRUCTURA';
    if (norm.includes('HIDROPOR')) return 'HIDROMASAJES';
    if (norm.includes('MPDIRECT')) return 'MPDIRECT';
    if (norm.includes('HIDROEMP')) return 'HIDROMASAJES';
    return norm;
};

const getGrupoFromProduct = (p: any): string => {
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
    return normalizeGrupoName(grupoRaw);
};

const getUnitsFromRecord = (r: RegistroMAC): number => {
    if (!Array.isArray(r.productos_novedad)) return 0;
    return r.productos_novedad.reduce((s: number, p: any) => s + (p.cantidad || 1), 0);
};

// ── Trend Arrow ────────────────────────────────────────────────────────────
const TrendArrow = ({ value, invertColor = true }: { value: number | null; invertColor?: boolean }) => {
    if (value === null) return <span className="text-xs font-bold text-purple-600">Nuevo</span>;
    if (value === 0) return <span className="text-gray-400 flex items-center gap-0.5"><MinusIcon className="w-3 h-3" /> <span className="text-xs font-semibold">0%</span></span>;
    // invertColor=true → aumento = rojo (negativo para novedades), disminución = verde
    const isUp = value > 0;
    const color = invertColor
        ? (isUp ? 'text-red-600' : 'text-green-600')
        : (isUp ? 'text-green-600' : 'text-red-600');
    return (
        <span className={`flex items-center gap-0.5 ${color}`}>
            {isUp ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
            <span className="text-xs font-bold">{fmtPct(value)}</span>
        </span>
    );
};

// ── Sort hook ──────────────────────────────────────────────────────────────
type SortKey = string;
type SortDir = 'asc' | 'desc';
function useSortable<T extends Record<string, any>>(data: T[], defaultKey: SortKey = '', defaultDir: SortDir = 'desc') {
    const [sortKey, setSortKey] = useState<SortKey>(defaultKey);
    const [sortDir, setSortDir] = useState<SortDir>(defaultDir);
    const sorted = useMemo(() => {
        if (!sortKey) return data;
        return [...data].sort((a, b) => {
            const va = a[sortKey] ?? 0;
            const vb = b[sortKey] ?? 0;
            if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'desc' ? vb - va : va - vb;
            return sortDir === 'desc' ? String(vb).localeCompare(String(va)) : String(va).localeCompare(String(vb));
        });
    }, [data, sortKey, sortDir]);
    const toggle = useCallback((key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        else { setSortKey(key); setSortDir('desc'); }
    }, [sortKey]);
    return { sorted, sortKey, sortDir, toggle };
}

// ── Sortable Header ────────────────────────────────────────────────────────
const SortHeader = ({ label, field, sortKey, sortDir, onSort, align = 'left' }: {
    label: string; field: string; sortKey: string; sortDir: string;
    onSort: (k: string) => void; align?: 'left' | 'right';
}) => (
    <th
        className={`px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 cursor-pointer hover:text-gray-800 select-none transition-colors ${align === 'right' ? 'text-right' : ''}`}
        onClick={() => onSort(field)}
    >
        <span className="flex items-center gap-0.5" style={{ justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
            {label}
            {sortKey === field && (
                sortDir === 'desc' ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronUpIcon className="w-3 h-3" />
            )}
        </span>
    </th>
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function InformeMac({ data, prevData, filters, setFilters, onFilterToggle }: Props) {
    // ── Informe-level filters ───────────────────────────────────────────────
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        prevData.forEach(d => {
            const y = new Date(d.created_at).getFullYear();
            if (!isNaN(y)) years.add(y);
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [prevData]);

    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        data.forEach(d => { if (d._mesCreacionKey) months.add(d._mesCreacionKey); });
        return Array.from(months).sort();
    }, [data]);

    const [selectedYear, setSelectedYear] = useState<string>('all');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [selectedZona, setSelectedZona] = useState<string>('all');
    const [selectedCiudad, setSelectedCiudad] = useState<string>('all');
    const [selectedGrupo, setSelectedGrupo] = useState<string>('all');
    const [selectedReferencia, setSelectedReferencia] = useState<string>('all');
    const [selectedNovedad, setSelectedNovedad] = useState<string>('all');

    const resetLocalFilters = () => {
        setSelectedYear('all');
        setSelectedMonth('all');
        setSelectedZona('all');
        setSelectedCiudad('all');
        setSelectedGrupo('all');
        setSelectedReferencia('all');
        setSelectedNovedad('all');
    };

    const hasActiveLocalFilters = selectedYear !== 'all' || selectedMonth !== 'all' || selectedZona !== 'all' || selectedCiudad !== 'all' || selectedGrupo !== 'all' || selectedReferencia !== 'all' || selectedNovedad !== 'all';

    // Available values for filters (from currently loaded data)
    const availableZonas = useMemo(() => Array.from(new Set(data.map(d => d._zona || '').filter(Boolean))).sort(), [data]);
    const availableCiudades = useMemo(() => Array.from(new Set(data.map(d => d._ciudad || '').filter(Boolean))).sort(), [data]);
    const availableGrupos = useMemo(() => {
        const grupos = new Set<string>();
        data.forEach(d => {
            if (Array.isArray(d.productos_novedad)) {
                d.productos_novedad.forEach((p: any) => grupos.add(getGrupoFromProduct(p)));
            }
        });
        return Array.from(grupos).sort();
    }, [data]);
    const availableReferencias = useMemo(() => {
        const refs = new Set<string>();
        data.forEach(d => {
            if (Array.isArray(d.productos_novedad)) {
                d.productos_novedad.forEach((p: any) => {
                    const ref = p.descripcion || p.nombre || p.sku || p.referencia || '';
                    if (ref) refs.add(ref);
                });
            }
        });
        return Array.from(refs).sort();
    }, [data]);
    const availableNovedades = useMemo(() => {
        const novs = new Set<string>();
        data.forEach(d => (d._defectosNombres || []).forEach(n => novs.add(n)));
        return Array.from(novs).sort();
    }, [data]);

    // ── Filtered data (respects informe-level filters) ──────────────────────
    const informeData = useMemo(() => {
        return data.filter(d => {
            const dt = new Date(d.created_at);
            if (selectedYear !== 'all' && dt.getFullYear() !== parseInt(selectedYear)) return false;
            if (selectedMonth !== 'all' && d._mesCreacionKey !== selectedMonth) return false;
            if (selectedZona !== 'all' && d._zona !== selectedZona) return false;
            if (selectedCiudad !== 'all' && d._ciudad !== selectedCiudad) return false;
            if (selectedNovedad !== 'all' && !(d._defectosNombres || []).includes(selectedNovedad)) return false;
            if (selectedGrupo !== 'all') {
                if (!Array.isArray(d.productos_novedad)) return false;
                const hasGrupo = d.productos_novedad.some((p: any) => getGrupoFromProduct(p) === selectedGrupo);
                if (!hasGrupo) return false;
            }
            if (selectedReferencia !== 'all') {
                if (!Array.isArray(d.productos_novedad)) return false;
                const hasRef = d.productos_novedad.some((p: any) =>
                    (p.descripcion || p.nombre || p.sku || p.referencia || '') === selectedReferencia
                );
                if (!hasRef) return false;
            }
            return true;
        });
    }, [data, selectedYear, selectedMonth, selectedZona, selectedCiudad, selectedGrupo, selectedReferencia, selectedNovedad]);

    // ── Previous period data for comparison ─────────────────────────────────
    const { prevPeriodData, comparisonLabel } = useMemo(() => {
        if (selectedMonth !== 'all') {
            // Compare against previous month
            const [y, m] = selectedMonth.split('-').map(Number);
            let prevM = m - 1, prevY = y;
            if (prevM < 1) { prevM = 12; prevY -= 1; }
            const prevKey = `${prevY}-${String(prevM).padStart(2, '0')}`;
            const prevFiltered = data.filter(d => {
                if (d._mesCreacionKey !== prevKey) return false;
                if (selectedZona !== 'all' && d._zona !== selectedZona) return false;
                if (selectedCiudad !== 'all' && d._ciudad !== selectedCiudad) return false;
                if (selectedNovedad !== 'all' && !(d._defectosNombres || []).includes(selectedNovedad)) return false;
                if (selectedGrupo !== 'all') {
                    if (!Array.isArray(d.productos_novedad)) return false;
                    if (!d.productos_novedad.some((p: any) => getGrupoFromProduct(p) === selectedGrupo)) return false;
                }
                if (selectedReferencia !== 'all') {
                    if (!Array.isArray(d.productos_novedad)) return false;
                    if (!d.productos_novedad.some((p: any) => (p.descripcion || p.nombre || p.sku || p.referencia || '') === selectedReferencia)) return false;
                }
                return true;
            });
            const [cy, cm] = selectedMonth.split('-').map(Number);
            return {
                prevPeriodData: prevFiltered,
                comparisonLabel: `${MONTH_NAMES[cm - 1]} ${cy} vs ${MONTH_NAMES[prevM - 1]} ${prevY}`,
            };
        } else if (selectedYear !== 'all') {
            // Compare against previous year
            const prevYear = parseInt(selectedYear) - 1;
            const prevFiltered = data.filter(d => {
                const dt = new Date(d.created_at);
                if (dt.getFullYear() !== prevYear) return false;
                if (selectedZona !== 'all' && d._zona !== selectedZona) return false;
                if (selectedCiudad !== 'all' && d._ciudad !== selectedCiudad) return false;
                if (selectedNovedad !== 'all' && !(d._defectosNombres || []).includes(selectedNovedad)) return false;
                if (selectedGrupo !== 'all') {
                    if (!Array.isArray(d.productos_novedad)) return false;
                    if (!d.productos_novedad.some((p: any) => getGrupoFromProduct(p) === selectedGrupo)) return false;
                }
                if (selectedReferencia !== 'all') {
                    if (!Array.isArray(d.productos_novedad)) return false;
                    if (!d.productos_novedad.some((p: any) => (p.descripcion || p.nombre || p.sku || p.referencia || '') === selectedReferencia)) return false;
                }
                return true;
            });
            return { prevPeriodData: prevFiltered, comparisonLabel: `${selectedYear} vs ${prevYear}` };
        }
        return { prevPeriodData: [] as RegistroMAC[], comparisonLabel: '' };
    }, [data, selectedMonth, selectedYear, selectedZona, selectedCiudad, selectedGrupo, selectedReferencia, selectedNovedad]);

    // ── Core KPIs ───────────────────────────────────────────────────────────
    const kpis = useMemo(() => {
        const casos = informeData.length;
        const inversion = informeData.reduce((a, d) => a + (d._valorInvertido || 0), 0);
        const unidades = informeData.reduce((a, d) => a + getUnitsFromRecord(d), 0);
        const promCaso = casos > 0 ? inversion / casos : 0;
        const promUnidadesCaso = casos > 0 ? unidades / casos : 0;

        // Months in period for averages
        const monthsSet = new Set<string>();
        informeData.forEach(d => { if (d._mesCreacionKey) monthsSet.add(d._mesCreacionKey); });
        const numMeses = monthsSet.size || 1;
        const promMensualCasos = casos / numMeses;
        const promMensualInversion = inversion / numMeses;

        // Previous period
        const prevCasos = prevPeriodData.length;
        const prevInversion = prevPeriodData.reduce((a, d) => a + (d._valorInvertido || 0), 0);
        const prevUnidades = prevPeriodData.reduce((a, d) => a + getUnitsFromRecord(d), 0);
        const prevPromCaso = prevCasos > 0 ? prevInversion / prevCasos : 0;

        return {
            casos, inversion, unidades, promCaso, promUnidadesCaso,
            numMeses, promMensualCasos, promMensualInversion,
            varCasos: calcVar(casos, prevCasos),
            varInversion: calcVar(inversion, prevInversion),
            varPromCaso: calcVar(promCaso, prevPromCaso),
            varUnidades: calcVar(unidades, prevUnidades),
            prevCasos, prevInversion, prevUnidades, prevPromCaso,
        };
    }, [informeData, prevPeriodData]);

    // ── Monthly breakdown ───────────────────────────────────────────────────
    const monthlyData = useMemo(() => {
        const map: Record<string, { key: string; casos: number; inversion: number; unidades: number }> = {};
        informeData.forEach(d => {
            const k = d._mesCreacionKey || '';
            if (!k) return;
            if (!map[k]) map[k] = { key: k, casos: 0, inversion: 0, unidades: 0 };
            map[k].casos += 1;
            map[k].inversion += (d._valorInvertido || 0);
            map[k].unidades += getUnitsFromRecord(d);
        });
        const sorted = Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
        return sorted.map((item, i) => {
            const [y, m] = item.key.split('-').map(Number);
            const prev = i > 0 ? sorted[i - 1] : null;
            const promCaso = item.casos > 0 ? item.inversion / item.casos : 0;
            const prevPromCaso = prev && prev.casos > 0 ? prev.inversion / prev.casos : 0;
            const promUds = item.casos > 0 ? item.unidades / item.casos : 0;
            return {
                mes: `${MONTH_SHORT[m - 1]} ${y}`,
                mesLabel: `${MONTH_NAMES[m - 1]} ${y}`,
                key: item.key,
                casos: item.casos,
                inversion: item.inversion,
                promCaso,
                unidades: item.unidades,
                promUds: parseFloat(promUds.toFixed(1)),
                varCasos: prev ? calcVar(item.casos, prev.casos) : null,
                varInversion: prev ? calcVar(item.inversion, prev.inversion) : null,
                varPromCaso: prev ? calcVar(promCaso, prevPromCaso) : null,
                varUnidades: prev ? calcVar(item.unidades, prev.unidades) : null,
            };
        });
    }, [informeData]);

    // ── Investment by Product Group ─────────────────────────────────────────
    const grupoData = useMemo(() => {
        const stats: Record<string, { casos: Set<number>; unidades: number; inversion: number }> = {};
        informeData.forEach(d => {
            if (!Array.isArray(d.productos_novedad)) return;
            d.productos_novedad.forEach((p: any) => {
                const grupo = getGrupoFromProduct(p);
                if (!stats[grupo]) stats[grupo] = { casos: new Set(), unidades: 0, inversion: 0 };
                stats[grupo].casos.add(d.id);
                stats[grupo].unidades += (p.cantidad || 1);
                // Distribute record's investment proportionally (or full to each grupo)
                stats[grupo].inversion += (d._valorInvertido || 0) / (d.productos_novedad.length || 1);
            });
        });
        const totalInv = Object.values(stats).reduce((a, s) => a + s.inversion, 0) || 1;
        return Object.entries(stats).map(([grupo, s]) => ({
            grupo,
            casos: s.casos.size,
            unidades: s.unidades,
            inversion: Math.round(s.inversion),
            pctInversion: (s.inversion / totalInv) * 100,
            promCaso: s.casos.size > 0 ? Math.round(s.inversion / s.casos.size) : 0,
        })).sort((a, b) => b.inversion - a.inversion);
    }, [informeData]);

    // ── Investment by Reference ─────────────────────────────────────────────
    const [showAllRefs, setShowAllRefs] = useState(false);
    const referenciaData = useMemo(() => {
        const stats: Record<string, { nombre: string; grupo: string; casos: Set<number>; unidades: number; inversion: number }> = {};
        informeData.forEach(d => {
            if (!Array.isArray(d.productos_novedad)) return;
            d.productos_novedad.forEach((p: any) => {
                const ref = p.descripcion || p.nombre || p.sku || p.referencia || 'Desconocido';
                const grupo = getGrupoFromProduct(p);
                if (!stats[ref]) stats[ref] = { nombre: ref, grupo, casos: new Set(), unidades: 0, inversion: 0 };
                stats[ref].casos.add(d.id);
                stats[ref].unidades += (p.cantidad || 1);
                stats[ref].inversion += (d._valorInvertido || 0) / (d.productos_novedad.length || 1);
            });
        });
        const totalInv = Object.values(stats).reduce((a, s) => a + s.inversion, 0) || 1;
        return Object.values(stats).map((s, i) => ({
            ...s,
            casos: s.casos.size,
            inversion: Math.round(s.inversion),
            pctInversion: (s.inversion / totalInv) * 100,
            promCaso: s.casos.size > 0 ? Math.round(s.inversion / s.casos.size) : 0,
        })).sort((a, b) => b.inversion - a.inversion);
    }, [informeData]);

    // ── Concentration indicators ────────────────────────────────────────────
    const concentration = useMemo(() => {
        const totalInv = referenciaData.reduce((a, r) => a + r.inversion, 0) || 1;
        const top5Refs = referenciaData.slice(0, 5);
        const top5Pct = (top5Refs.reduce((a, r) => a + r.inversion, 0) / totalInv) * 100;
        const top3Grupos = grupoData.slice(0, 3);
        const top3GrupoPct = (top3Grupos.reduce((a, g) => a + g.inversion, 0) / totalInv) * 100;
        const mayorInvRef = referenciaData[0];
        const mayorCasosRef = [...referenciaData].sort((a, b) => b.casos - a.casos)[0];
        return { top5Pct, top3GrupoPct, mayorInvRef, mayorCasosRef, top5Refs, top3Grupos };
    }, [referenciaData, grupoData]);

    // ── Scatter data (Volume vs Money) ──────────────────────────────────────
    const scatterData = useMemo(() => {
        return referenciaData.slice(0, 40).map(r => ({
            ...r,
            x: r.casos,
            y: r.inversion,
            z: r.unidades,
        }));
    }, [referenciaData]);

    // ── Sortables ───────────────────────────────────────────────────────────
    const grupoSort = useSortable(grupoData, 'inversion', 'desc');
    const refSort = useSortable(referenciaData, 'inversion', 'desc');

    // ── Period label ────────────────────────────────────────────────────────
    const periodLabel = useMemo(() => {
        if (selectedMonth !== 'all') {
            const [y, m] = selectedMonth.split('-').map(Number);
            return `${MONTH_NAMES[m - 1]} ${y}`;
        }
        if (selectedYear !== 'all') return `Año ${selectedYear}`;
        return 'Período completo';
    }, [selectedMonth, selectedYear]);

    // ── Executive Summary ───────────────────────────────────────────────────
    const executiveSummary = useMemo(() => {
        const { casos, inversion, promCaso, unidades, varCasos, varInversion, varPromCaso, varUnidades } = kpis;
        let text = `Durante ${periodLabel.toLowerCase()} se registraron ${fmtN(casos)} casos, con una inversión total de ${fmt$(inversion)}.`;
        text += ` La inversión promedio por caso fue de ${fmt$(promCaso)}`;
        if (comparisonLabel && varPromCaso !== null) {
            text += `, representando una variación de ${fmtPct(varPromCaso)} frente al período anterior`;
        }
        text += `. Las unidades afectadas fueron ${fmtN(unidades)}.`;

        if (grupoData.length > 0) {
            text += `\n\nEl grupo de producto con mayor participación en la inversión fue ${grupoData[0].grupo}, representando ${grupoData[0].pctInversion.toFixed(1)}% del total.`;
        }
        if (referenciaData.length >= 3) {
            const top3Names = referenciaData.slice(0, 3).map(r => r.nombre).join(', ');
            text += ` Las referencias ${top3Names} concentraron ${(referenciaData.slice(0, 3).reduce((a, r) => a + r.pctInversion, 0)).toFixed(1)}% de la inversión.`;
        }
        if (comparisonLabel) {
            text += `\n\nFrente al período anterior (${comparisonLabel}), los casos `;
            if (varCasos !== null && varCasos !== 0) {
                text += varCasos > 0 ? `aumentaron ${fmtPct(varCasos)}` : `disminuyeron ${fmtPct(Math.abs(varCasos))}`;
            } else {
                text += 'se mantuvieron estables';
            }
            text += `, mientras que la inversión `;
            if (varInversion !== null && varInversion !== 0) {
                text += varInversion > 0 ? `aumentó ${fmtPct(varInversion)}` : `disminuyó ${fmtPct(Math.abs(varInversion))}`;
            } else {
                text += 'se mantuvo estable';
            }
            text += '.';
            // Identify main point of attention
            if (grupoData.length > 0 && grupoData[0].pctInversion > 30) {
                text += ` El principal punto de atención corresponde a ${grupoData[0].grupo} debido a su alta concentración de inversión (${grupoData[0].pctInversion.toFixed(1)}% del total).`;
            }
        }
        return text;
    }, [kpis, periodLabel, comparisonLabel, grupoData, referenciaData]);

    // ── Export ───────────────────────────────────────────────────────────────
    const handleExport = useCallback(() => {
        const wb = XLSX.utils.book_new();
        // Sheet 1: KPIs
        const kpiRows = [
            { Indicador: 'Inversión Total', Valor: kpis.inversion, Variacion: kpis.varInversion !== null ? `${fmtPct(kpis.varInversion)}` : '—' },
            { Indicador: 'Inversión Promedio por Caso', Valor: kpis.promCaso, Variacion: kpis.varPromCaso !== null ? `${fmtPct(kpis.varPromCaso)}` : '—' },
            { Indicador: 'Cantidad de Casos', Valor: kpis.casos, Variacion: kpis.varCasos !== null ? `${fmtPct(kpis.varCasos)}` : '—' },
            { Indicador: 'Unidades con Novedad', Valor: kpis.unidades, Variacion: kpis.varUnidades !== null ? `${fmtPct(kpis.varUnidades)}` : '—' },
            { Indicador: 'Promedio Mensual de Casos', Valor: parseFloat(kpis.promMensualCasos.toFixed(1)), Variacion: '' },
            { Indicador: 'Promedio Mensual de Inversión', Valor: kpis.promMensualInversion, Variacion: '' },
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiRows), 'KPIs');
        // Sheet 2: Mensual
        const mensualRows = monthlyData.map(m => ({
            Mes: m.mesLabel, Casos: m.casos, Inversión: m.inversion,
            '$ Promedio/Caso': Math.round(m.promCaso), Unidades: m.unidades,
            'Promedio Uds/Caso': m.promUds,
            'Var. Casos %': m.varCasos !== null ? fmtPct(m.varCasos) : '—',
            'Var. Inversión %': m.varInversion !== null ? fmtPct(m.varInversion) : '—',
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mensualRows), 'Mensual');
        // Sheet 3: Grupos
        const grupoRows = grupoSort.sorted.map(g => ({
            'Grupo de Producto': g.grupo, Casos: g.casos, Unidades: g.unidades,
            'Inversión $': g.inversion, '% Inversión': `${g.pctInversion.toFixed(1)}%`,
            '$ Promedio/Caso': g.promCaso,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(grupoRows), 'Grupos');
        // Sheet 4: Referencias
        const refRows = refSort.sorted.map((r, i) => ({
            Ranking: i + 1, Referencia: r.nombre, Producto: r.grupo, Casos: r.casos,
            Unidades: r.unidades, 'Inversión $': r.inversion,
            '% Inversión': `${r.pctInversion.toFixed(1)}%`, '$ Promedio/Caso': r.promCaso,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(refRows), 'Referencias');
        XLSX.writeFile(wb, `Informe_MAC_${periodLabel.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }, [kpis, monthlyData, grupoSort, refSort, periodLabel]);

    // ── Custom tooltip for scatter ──────────────────────────────────────────
    const ScatterTooltip = ({ active, payload }: any) => {
        if (!active || !payload || !payload.length) return null;
        const d = payload[0].payload;
        return (
            <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs max-w-[220px]">
                <p className="font-black text-gray-800 mb-1 truncate">{d.nombre}</p>
                <p className="text-gray-500 mb-2">{d.grupo}</p>
                <div className="space-y-0.5">
                    <p className="text-gray-600">Casos: <span className="font-bold text-gray-800">{d.casos}</span></p>
                    <p className="text-gray-600">Inversión: <span className="font-bold text-[#254153]">{fmt$(d.inversion)}</span></p>
                    <p className="text-gray-600">$ Prom/Caso: <span className="font-bold">{fmt$(d.promCaso)}</span></p>
                    <p className="text-gray-600">Unidades: <span className="font-bold text-[#c96a4e]">{d.unidades}</span></p>
                </div>
            </div>
        );
    };

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════
    return (
        <div className="space-y-6 animate-fade-in">
            {/* ── Filtros del informe ─────────────────────────────────────────── */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <FilterIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Filtros del informe</span>
                    </div>
                    {hasActiveLocalFilters && (
                        <button 
                            onClick={resetLocalFilters} 
                            className="text-[10px] font-bold text-[#254153] bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-md transition-colors"
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                    <div>
                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Año</label>
                        <select className="w-full text-xs border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-brand focus:outline-none" value={selectedYear} onChange={e => { setSelectedYear(e.target.value); if (e.target.value !== 'all') setSelectedMonth('all'); }}>
                            <option value="all">Todos</option>
                            {availableYears.map(y => <option key={y} value={String(y)}>{y}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Mes</label>
                        <select className="w-full text-xs border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-brand focus:outline-none" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                            <option value="all">Todos</option>
                            {availableMonths.map(m => {
                                const [y, mo] = m.split('-').map(Number);
                                return <option key={m} value={m}>{MONTH_SHORT[mo - 1]} {y}</option>;
                            })}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Zona</label>
                        <select className="w-full text-xs border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-brand focus:outline-none" value={selectedZona} onChange={e => setSelectedZona(e.target.value)}>
                            <option value="all">Todas</option>
                            {availableZonas.map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Ciudad</label>
                        <select className="w-full text-xs border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-brand focus:outline-none" value={selectedCiudad} onChange={e => setSelectedCiudad(e.target.value)}>
                            <option value="all">Todas</option>
                            {availableCiudades.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Grupo producto</label>
                        <select className="w-full text-xs border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-brand focus:outline-none" value={selectedGrupo} onChange={e => setSelectedGrupo(e.target.value)}>
                            <option value="all">Todos</option>
                            {availableGrupos.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Referencia</label>
                        <select className="w-full text-xs border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-brand focus:outline-none" value={selectedReferencia} onChange={e => setSelectedReferencia(e.target.value)}>
                            <option value="all">Todas</option>
                            {availableReferencias.slice(0, 200).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Tipo novedad</label>
                        <select className="w-full text-xs border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-brand focus:outline-none" value={selectedNovedad} onChange={e => setSelectedNovedad(e.target.value)}>
                            <option value="all">Todas</option>
                            {availableNovedades.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={handleExport}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
                        >
                            <DownloadIcon className="w-3.5 h-3.5" /> Exportar
                        </button>
                    </div>
                </div>
            </div>

            {/* ── KPI Cards ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* KPI 1: Inversión Total */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-[120px]">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Inversión Total</h3>
                        <DollarSignIcon className="w-4 h-4 text-gray-300" />
                    </div>
                    <div className="text-xl font-black text-[#254153] leading-tight">{fmt$(kpis.inversion)}</div>
                    {comparisonLabel && <div className="mt-1.5"><TrendArrow value={kpis.varInversion} /></div>}
                </div>
                {/* KPI 2: Inversión Promedio por Caso */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-[120px]">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Inversión Prom / Caso</h3>
                        <DollarSignIcon className="w-4 h-4 text-gray-300" />
                    </div>
                    <div className="text-xl font-black text-[#254153] leading-tight">{fmt$(kpis.promCaso)}</div>
                    <div className="text-[9px] text-gray-400 font-semibold mt-0.5">por caso</div>
                    {comparisonLabel && <div className="mt-1"><TrendArrow value={kpis.varPromCaso} /></div>}
                </div>
                {/* KPI 3: Cantidad de Casos */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-[120px]">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cantidad de Casos</h3>
                        <HashIcon className="w-4 h-4 text-gray-300" />
                    </div>
                    <div className="text-xl font-black text-gray-800 leading-tight">{fmtN(kpis.casos)}</div>
                    <div className="text-[9px] text-gray-400 font-semibold mt-0.5">casos</div>
                    {comparisonLabel && <div className="mt-1"><TrendArrow value={kpis.varCasos} /></div>}
                </div>
                {/* KPI 4: Unidades con Novedad */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-[120px]">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Unidades con Novedad</h3>
                        <PackageIcon className="w-4 h-4 text-gray-300" />
                    </div>
                    <div className="text-xl font-black text-[#c96a4e] leading-tight">{fmtN(kpis.unidades)}</div>
                    <div className="text-[9px] text-gray-400 font-semibold mt-0.5">Prom: {kpis.promUnidadesCaso.toFixed(1)} uds/caso</div>
                    {comparisonLabel && <div className="mt-1"><TrendArrow value={kpis.varUnidades} /></div>}
                </div>
                {/* KPI 5: Promedio Mensual de Casos */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-[120px]">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Prom. Mensual Casos</h3>
                        <CalendarIcon className="w-4 h-4 text-gray-300" />
                    </div>
                    <div className="text-xl font-black text-gray-800 leading-tight">{kpis.promMensualCasos % 1 === 0 ? kpis.promMensualCasos : kpis.promMensualCasos.toFixed(1)}</div>
                    <div className="text-[9px] text-gray-400 font-semibold mt-0.5">casos / mes ({kpis.numMeses} {kpis.numMeses === 1 ? 'mes' : 'meses'})</div>
                </div>
                {/* KPI 6: Promedio Mensual de Inversión */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-[120px]">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Prom. Mensual Inversión</h3>
                        <DollarSignIcon className="w-4 h-4 text-gray-300" />
                    </div>
                    <div className="text-xl font-black text-[#254153] leading-tight">{fmt$(kpis.promMensualInversion)}</div>
                    <div className="text-[9px] text-gray-400 font-semibold mt-0.5">por mes ({kpis.numMeses} {kpis.numMeses === 1 ? 'mes' : 'meses'})</div>
                </div>
            </div>

            {/* ── Comparación con período anterior ────────────────────────────── */}
            {comparisonLabel && (
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#254153] text-white flex items-center justify-center"><TrendingUpIcon className="w-3.5 h-3.5" /></div>
                        Comparación: {comparisonLabel}
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-gray-50 rounded-xl">
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Casos</p>
                            <p className="text-lg font-black text-gray-800">{fmtN(kpis.casos)}</p>
                            <div className="mt-1 flex justify-center"><TrendArrow value={kpis.varCasos} /></div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-xl">
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Inversión</p>
                            <p className="text-lg font-black text-[#254153]">{fmt$(kpis.inversion)}</p>
                            <div className="mt-1 flex justify-center"><TrendArrow value={kpis.varInversion} /></div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-xl">
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">$ Prom / Caso</p>
                            <p className="text-lg font-black text-gray-800">{fmt$(kpis.promCaso)}</p>
                            <div className="mt-1 flex justify-center"><TrendArrow value={kpis.varPromCaso} /></div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-xl">
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Unidades</p>
                            <p className="text-lg font-black text-[#c96a4e]">{fmtN(kpis.unidades)}</p>
                            <div className="mt-1 flex justify-center"><TrendArrow value={kpis.varUnidades} /></div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Comportamiento Mensual ──────────────────────────────────────── */}
            {monthlyData.length > 1 && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#254153] text-white flex items-center justify-center"><CalendarIcon className="w-3.5 h-3.5" /></div>
                        Comportamiento Mensual
                    </h2>
                    {/* Chart */}
                    <div className="h-[300px] mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v: number) => `$${(v / 1000000).toFixed(0)}M`} />
                                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', padding: '10px 14px' }} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                <Bar 
                                    yAxisId="left" 
                                    dataKey="casos" 
                                    name="Casos" 
                                    fill={BRAND} 
                                    radius={[4, 4, 0, 0]} 
                                    maxBarSize={40}
                                    onClick={(data: any, index: number, e: any) => onFilterToggle('mesCreacion', data.payload?.key, e)}
                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                    <LabelList dataKey="casos" position="top" style={{ fill: BRAND, fontSize: 10, fontWeight: 'bold' }} />
                                </Bar>
                                <Bar 
                                    yAxisId="right" 
                                    dataKey="inversion" 
                                    name="Inversión $" 
                                    fill={ACCENT} 
                                    radius={[4, 4, 0, 0]} 
                                    maxBarSize={40}
                                    onClick={(data: any, index: number, e: any) => onFilterToggle('mesCreacion', data.payload?.key, e)}
                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 rounded-tl-lg">Mes</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Casos</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Var. %</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Inversión</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Var. %</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">$ Prom/Caso</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Var. %</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Unidades</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Var. %</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right rounded-tr-lg">Prom Uds/Caso</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyData.map((m, i) => (
                                    <tr key={m.key} className={`transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-blue-50/40`}>
                                        <td className="px-3 py-2.5 text-xs font-semibold text-gray-800 border-b border-gray-100">{m.mesLabel}</td>
                                        <td className="px-3 py-2.5 text-xs font-bold text-gray-800 text-right border-b border-gray-100">{fmtN(m.casos)}</td>
                                        <td className="px-3 py-2.5 text-right border-b border-gray-100"><TrendArrow value={m.varCasos} /></td>
                                        <td className="px-3 py-2.5 text-xs font-bold text-[#254153] text-right border-b border-gray-100">{fmt$(m.inversion)}</td>
                                        <td className="px-3 py-2.5 text-right border-b border-gray-100"><TrendArrow value={m.varInversion} /></td>
                                        <td className="px-3 py-2.5 text-xs font-bold text-gray-700 text-right border-b border-gray-100">{fmt$(m.promCaso)}</td>
                                        <td className="px-3 py-2.5 text-right border-b border-gray-100"><TrendArrow value={m.varPromCaso} /></td>
                                        <td className="px-3 py-2.5 text-xs font-bold text-[#c96a4e] text-right border-b border-gray-100">{fmtN(m.unidades)}</td>
                                        <td className="px-3 py-2.5 text-right border-b border-gray-100"><TrendArrow value={m.varUnidades} /></td>
                                        <td className="px-3 py-2.5 text-xs font-semibold text-gray-600 text-right border-b border-gray-100">{m.promUds}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Inversión por Grupo de Producto ─────────────────────────────── */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#254153] text-white flex items-center justify-center"><PackageIcon className="w-3.5 h-3.5" /></div>
                    ¿Dónde se concentra la inversión?
                </h2>
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                    {/* Chart */}
                    <div className="xl:col-span-2 h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={grupoData.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v: number) => `$${(v / 1000000).toFixed(0)}M`} />
                                <YAxis dataKey="grupo" type="category" width={110} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }} />
                                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }} formatter={(v: number) => fmt$(v)} />
                                <Bar 
                                    dataKey="inversion" 
                                    name="Inversión $" 
                                    radius={[0, 4, 4, 0]} 
                                    maxBarSize={20}
                                    onClick={(data: any, index: number, e: any) => onFilterToggle('productos', data.payload?.grupo, e)}
                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                    {grupoData.slice(0, 10).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    <LabelList dataKey="pctInversion" position="right" formatter={(v: number) => `${v.toFixed(0)}%`} style={{ fill: '#6b7280', fontSize: 10, fontWeight: 'bold' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Table */}
                    <div className="xl:col-span-3 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50">
                                    <SortHeader label="Grupo de producto" field="grupo" sortKey={grupoSort.sortKey} sortDir={grupoSort.sortDir} onSort={grupoSort.toggle} />
                                    <SortHeader label="Casos" field="casos" sortKey={grupoSort.sortKey} sortDir={grupoSort.sortDir} onSort={grupoSort.toggle} align="right" />
                                    <SortHeader label="Unidades" field="unidades" sortKey={grupoSort.sortKey} sortDir={grupoSort.sortDir} onSort={grupoSort.toggle} align="right" />
                                    <SortHeader label="Inversión $" field="inversion" sortKey={grupoSort.sortKey} sortDir={grupoSort.sortDir} onSort={grupoSort.toggle} align="right" />
                                    <SortHeader label="% inversión" field="pctInversion" sortKey={grupoSort.sortKey} sortDir={grupoSort.sortDir} onSort={grupoSort.toggle} align="right" />
                                    <SortHeader label="$ Prom/Caso" field="promCaso" sortKey={grupoSort.sortKey} sortDir={grupoSort.sortDir} onSort={grupoSort.toggle} align="right" />
                                </tr>
                            </thead>
                            <tbody>
                                {grupoSort.sorted.map((g, i) => (
                                    <tr key={g.grupo} className={`transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-blue-50/40`}>
                                        <td className="px-3 py-2.5 text-xs font-semibold text-gray-800 border-b border-gray-100">
                                            <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                            {g.grupo}
                                        </td>
                                        <td className="px-3 py-2.5 text-xs font-bold text-gray-800 text-right border-b border-gray-100">{fmtN(g.casos)}</td>
                                        <td className="px-3 py-2.5 text-xs font-bold text-[#c96a4e] text-right border-b border-gray-100">{fmtN(g.unidades)}</td>
                                        <td className="px-3 py-2.5 text-xs font-black text-[#254153] text-right border-b border-gray-100">{fmt$(g.inversion)}</td>
                                        <td className="px-3 py-2.5 text-xs font-bold text-[#749094] text-right border-b border-gray-100">{g.pctInversion.toFixed(1)}%</td>
                                        <td className="px-3 py-2.5 text-xs font-bold text-gray-700 text-right border-b border-gray-100">{fmt$(g.promCaso)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ── Inversión por Referencia ────────────────────────────────────── */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#254153] text-white flex items-center justify-center"><DollarSignIcon className="w-3.5 h-3.5" /></div>
                        Referencias con mayor impacto económico
                    </h2>
                    <div className="flex items-center gap-3">
                        {concentration.top5Pct > 0 && (
                            <span className="text-[10px] font-bold text-[#254153] bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                                Las 5 principales referencias concentran el {concentration.top5Pct.toFixed(1)}% de la inversión total
                            </span>
                        )}
                        <button
                            onClick={() => setShowAllRefs(!showAllRefs)}
                            className="text-[10px] font-bold text-[#749094] hover:text-[#254153] transition-colors"
                        >
                            {showAllRefs ? 'Ver Top 10' : 'Ver todas'}
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 rounded-tl-lg w-10">#</th>
                                <SortHeader label="Referencia" field="nombre" sortKey={refSort.sortKey} sortDir={refSort.sortDir} onSort={refSort.toggle} />
                                <SortHeader label="Producto" field="grupo" sortKey={refSort.sortKey} sortDir={refSort.sortDir} onSort={refSort.toggle} />
                                <SortHeader label="Casos" field="casos" sortKey={refSort.sortKey} sortDir={refSort.sortDir} onSort={refSort.toggle} align="right" />
                                <SortHeader label="Unidades" field="unidades" sortKey={refSort.sortKey} sortDir={refSort.sortDir} onSort={refSort.toggle} align="right" />
                                <SortHeader label="Inversión $" field="inversion" sortKey={refSort.sortKey} sortDir={refSort.sortDir} onSort={refSort.toggle} align="right" />
                                <SortHeader label="% inversión" field="pctInversion" sortKey={refSort.sortKey} sortDir={refSort.sortDir} onSort={refSort.toggle} align="right" />
                                <SortHeader label="$ Prom/Caso" field="promCaso" sortKey={refSort.sortKey} sortDir={refSort.sortDir} onSort={refSort.toggle} align="right" />
                            </tr>
                        </thead>
                        <tbody>
                            {refSort.sorted.slice(0, showAllRefs ? undefined : 10).map((r, i) => (
                                <tr key={r.nombre} className={`transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-blue-50/40`}>
                                    <td className="px-3 py-2.5 text-xs font-bold text-gray-400 border-b border-gray-100">{i + 1}</td>
                                    <td className="px-3 py-2.5 text-xs font-semibold text-gray-800 border-b border-gray-100 max-w-[200px] truncate" title={r.nombre}>{r.nombre}</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-600 border-b border-gray-100">{r.grupo}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-gray-800 text-right border-b border-gray-100">{fmtN(r.casos)}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#c96a4e] text-right border-b border-gray-100">{fmtN(r.unidades)}</td>
                                    <td className="px-3 py-2.5 text-xs font-black text-[#254153] text-right border-b border-gray-100">{fmt$(r.inversion)}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#749094] text-right border-b border-gray-100">{r.pctInversion.toFixed(1)}%</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-gray-700 text-right border-b border-gray-100">{fmt$(r.promCaso)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Análisis Volumen vs Dinero ──────────────────────────────────── */}
            {scatterData.length > 0 && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#254153] text-white flex items-center justify-center"><TrendingUpIcon className="w-3.5 h-3.5" /></div>
                        Análisis de Volumen vs. Impacto Económico
                    </h2>
                    <p className="text-[10px] text-gray-400 font-medium mb-5">Cada punto representa una referencia. Eje X = casos, Eje Y = inversión. Tamaño = unidades.</p>
                    <div className="h-[380px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis type="number" dataKey="x" name="Casos" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} label={{ value: 'Casos →', position: 'insideBottomRight', offset: -5, style: { fontSize: 10, fill: '#9ca3af', fontWeight: 600 } }} />
                                <YAxis type="number" dataKey="y" name="Inversión" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v: number) => `$${(v / 1000000).toFixed(0)}M`} label={{ value: 'Inversión $ →', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#9ca3af', fontWeight: 600 } }} />
                                <ZAxis type="number" dataKey="z" range={[40, 400]} name="Unidades" />
                                <RechartsTooltip content={<ScatterTooltip />} />
                                <Scatter name="Referencias" data={scatterData} fill={BRAND} fillOpacity={0.7}>
                                    {scatterData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[9px] text-gray-400 font-semibold">
                        <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-2">
                            <div className="w-2 h-2 rounded-full bg-red-400" />
                            ↗ Alto volumen + Alto costo = Urgente
                        </div>
                        <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-2">
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                            → Alto volumen + Bajo costo = Masivo
                        </div>
                        <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-2">
                            <div className="w-2 h-2 rounded-full bg-blue-400" />
                            ↑ Bajo volumen + Alto costo = Costoso
                        </div>
                        <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-2">
                            <div className="w-2 h-2 rounded-full bg-green-400" />
                            ↘ Bajo volumen + Bajo costo = Controlado
                        </div>
                    </div>
                </div>
            )}

            {/* ── Concentración del Impacto ───────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Top 5 referencias</h3>
                    <p className="text-2xl font-black text-[#254153]">{concentration.top5Pct.toFixed(1)}%</p>
                    <p className="text-[10px] text-gray-500 mt-1">de la inversión total</p>
                    <div className="mt-3 space-y-1">
                        {concentration.top5Refs.map((r, i) => (
                            <div key={i} className="flex items-center justify-between text-[10px]">
                                <span className="text-gray-600 truncate max-w-[140px]" title={r.nombre}>{r.nombre}</span>
                                <span className="font-bold text-gray-800">{r.pctInversion.toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Top 3 grupos</h3>
                    <p className="text-2xl font-black text-[#749094]">{concentration.top3GrupoPct.toFixed(1)}%</p>
                    <p className="text-[10px] text-gray-500 mt-1">de la inversión total</p>
                    <div className="mt-3 space-y-1">
                        {concentration.top3Grupos.map((g, i) => (
                            <div key={i} className="flex items-center justify-between text-[10px]">
                                <span className="text-gray-600">{g.grupo}</span>
                                <span className="font-bold text-gray-800">{g.pctInversion.toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Mayor inversión (referencia)</h3>
                    {concentration.mayorInvRef ? (
                        <>
                            <p className="text-lg font-black text-[#254153]">{fmt$(concentration.mayorInvRef.inversion)}</p>
                            <p className="text-xs font-semibold text-gray-700 mt-1 truncate" title={concentration.mayorInvRef.nombre}>{concentration.mayorInvRef.nombre}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{concentration.mayorInvRef.casos} casos · {concentration.mayorInvRef.unidades} uds</p>
                        </>
                    ) : <p className="text-sm text-gray-400">—</p>}
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Mayor cantidad de casos</h3>
                    {concentration.mayorCasosRef ? (
                        <>
                            <p className="text-lg font-black text-gray-800">{fmtN(concentration.mayorCasosRef.casos)} casos</p>
                            <p className="text-xs font-semibold text-gray-700 mt-1 truncate" title={concentration.mayorCasosRef.nombre}>{concentration.mayorCasosRef.nombre}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{fmt$(concentration.mayorCasosRef.inversion)} · {concentration.mayorCasosRef.unidades} uds</p>
                        </>
                    ) : <p className="text-sm text-gray-400">—</p>}
                </div>
            </div>

            {/* ── Semáforo Ejecutivo ──────────────────────────────────────────── */}
            {comparisonLabel && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#254153] text-white flex items-center justify-center"><AlertTriangleIcon className="w-3.5 h-3.5" /></div>
                        Estado del Período
                    </h2>
                    <p className="text-[10px] text-gray-400 font-medium mb-4">Un incremento representa un aumento del impacto de las novedades y requiere atención.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'Casos', value: fmtN(kpis.casos), variation: kpis.varCasos },
                            { label: 'Inversión', value: fmt$(kpis.inversion), variation: kpis.varInversion },
                            { label: '$ Promedio/Caso', value: fmt$(kpis.promCaso), variation: kpis.varPromCaso },
                            { label: 'Unidades', value: fmtN(kpis.unidades), variation: kpis.varUnidades },
                        ].map((item, i) => {
                            const isUp = item.variation !== null && item.variation > 0;
                            const isDown = item.variation !== null && item.variation < 0;
                            const bgColor = isUp ? '#fef2f2' : isDown ? '#f0fdf4' : '#f9fafb';
                            const borderColor = isUp ? '#fecaca' : isDown ? '#bbf7d0' : '#e5e7eb';
                            const indicatorColor = isUp ? '#ef4444' : isDown ? '#22c55e' : '#9ca3af';
                            return (
                                <div key={i} className="rounded-xl p-4 border" style={{ backgroundColor: bgColor, borderColor }}>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">{item.label}</p>
                                    <p className="text-lg font-black text-gray-800">{item.value}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: indicatorColor }} />
                                        <TrendArrow value={item.variation} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Resumen Ejecutivo ───────────────────────────────────────────── */}
            <div className="bg-gradient-to-br from-[#254153] to-[#1a2f3d] p-7 rounded-2xl shadow-lg text-white">
                <h2 className="text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center"><TrendingUpIcon className="w-3.5 h-3.5" /></div>
                    Resumen Ejecutivo — {periodLabel}
                </h2>
                <div className="text-sm leading-relaxed text-white/90 whitespace-pre-line">
                    {executiveSummary}
                </div>
                <div className="mt-5 pt-3 border-t border-white/10 flex items-center gap-3 text-[9px] text-white/40">
                    <span>📊 Datos calculados a partir de los registros fuente de registro_solicitudes</span>
                    <span>•</span>
                    <span>Período: {periodLabel}</span>
                    <span>•</span>
                    <span>{fmtN(informeData.length)} registros analizados</span>
                </div>
            </div>
        </div>
    );
}
