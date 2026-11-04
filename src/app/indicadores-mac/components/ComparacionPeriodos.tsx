'use client';
import React, { useCallback, useMemo, useState } from 'react';
import { RegistroMAC, FilterState, DateRange, QRRRecord, PriorityLevel, AllAnalyses } from '../types';
import type { Decision, SeccionResumen } from '../utils/panorama';
import { buildMonthRangeFromKey, getDefaultPeriods, PRIORITY_CONFIG } from '../utils/analysisEngine';
import { AlertTriangleIcon, TrendingUpIcon, DollarSignIcon, MapPinIcon, UsersIcon, PackageIcon, ShieldAlertIcon, ChevronDownIcon, ChevronUpIcon, PlusCircleIcon, EyeIcon, ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react';

// Comparación contra el periodo anterior, dentro de la hoja Informe. El periodo actual es siempre el
// que está filtrado en la página. Aquí se cuentan radicados únicos; la tabla de Tipo de Problema del Informe
// cuenta líneas de producto, por eso un problema puede diferir en unos pocos casos entre ambas.

// ── Periodos ───────────────────────────────────────────────────────────────
const DIA_MS = 86400000;
const claveMes = (total: number) => `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
const mesesTotales = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    return y * 12 + (m - 1);
};
const fechaISO = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fechaCorta = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

/** Periodo filtrado en la página: los meses elegidos o, si no hay, el rango de fechas. */
export function periodoDesdeFiltros(filters: Pick<FilterState, 'mesCreacion' | 'fechaInicial' | 'fechaFinal'>): DateRange {
    const meses = [...filters.mesCreacion].sort();
    if (meses.length > 0) {
        const primero = buildMonthRangeFromKey(meses[0]);
        const ultimo = buildMonthRangeFromKey(meses[meses.length - 1]);
        return {
            start: primero.start,
            end: ultimo.end,
            key: meses[0],
            label: meses.length === 1 ? primero.label : `${primero.label} – ${ultimo.label}`,
        };
    }
    if (!filters.fechaInicial) return getDefaultPeriods().current;
    const fin = filters.fechaFinal || fechaISO(Date.now());
    return { start: filters.fechaInicial, end: fin, key: filters.fechaInicial.slice(0, 7), label: `${fechaCorta(filters.fechaInicial)} – ${fechaCorta(fin)}` };
}

/** Periodo de igual duración inmediatamente anterior al actual. */
export function periodoAnteriorAutomatico(actual: DateRange, meses: string[]): DateRange {
    if (meses.length > 0) {
        const primero = mesesTotales([...meses].sort()[0]);
        const desde = buildMonthRangeFromKey(claveMes(primero - meses.length));
        const hasta = buildMonthRangeFromKey(claveMes(primero - 1));
        return { start: desde.start, end: hasta.end, key: desde.key, label: meses.length === 1 ? desde.label : `${desde.label} – ${hasta.label}` };
    }
    const inicio = new Date(`${actual.start}T00:00:00`).getTime();
    const fin = new Date(`${actual.end}T00:00:00`).getTime();
    const hastaTs = inicio - DIA_MS;
    const start = fechaISO(hastaTs - (fin - inicio));
    const end = fechaISO(hastaTs);
    return { start, end, key: start.slice(0, 7), label: `${fechaCorta(start)} – ${fechaCorta(end)}` };
}

// ── Helpers ────────────────────────────────────────────────────────────────
export const fmt$ = (v: number) => v > 0 ? `$${v.toLocaleString('es-CO')}` : '$0';
export const fmtVar = (v: number | null) => {
    if (v === null) return <span className="text-brand font-bold text-xs">Nuevo</span>;
    if (v === 0) return <span className="text-stone-400 font-semibold text-xs">0%</span>;
    const color = v > 0 ? 'text-red-600' : 'text-green-600';
    const icon = v > 0 ? <ArrowUpIcon className="w-3 h-3 inline" /> : <ArrowDownIcon className="w-3 h-3 inline" />;
    return <span className={`${color} font-bold text-xs`}>{icon} {v > 0 ? '+' : ''}{v.toFixed(1)}%</span>;
};

export const PriorityBadge = ({ level }: { level: PriorityLevel }) => {
    const cfg = PRIORITY_CONFIG[level];
    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
            style={{ backgroundColor: cfg.bgColor, color: cfg.color, border: `1px solid ${cfg.borderColor}` }}
        >
            {cfg.emoji} {cfg.label}
        </span>
    );
};

// ── Collapsible Section ────────────────────────────────────────────────────
const CollapsibleSection = ({ children, title, icon, subtitle, defaultOpen = true }: {
    children: React.ReactNode; title: string; icon: React.ReactNode; subtitle?: string; defaultOpen?: boolean;
}) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-5 hover:bg-cream-light/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#254153] text-white flex items-center justify-center flex-shrink-0">{icon}</div>
                    <div className="text-left">
                        <h2 className="text-sm font-bold text-brand-dark uppercase tracking-wider">{title}</h2>
                        {subtitle && <p className="text-[10px] text-stone-400 font-medium">{subtitle}</p>}
                    </div>
                </div>
                {open ? <ChevronUpIcon className="w-5 h-5 text-stone-400" /> : <ChevronDownIcon className="w-5 h-5 text-stone-400" />}
            </button>
            {open && <div className="px-5 pb-5 animate-fade-in">{children}</div>}
        </div>
    );
};

const claseFila = (activa: boolean, i: number) =>
    `transition-colors cursor-pointer ${activa ? 'bg-sage-soft' : i % 2 === 0 ? 'bg-white hover:bg-cream-light' : 'bg-cream-light/60 hover:bg-cream-light'}`;

// ── Resumen: selector, indicadores con variación y decisiones ──────────────
export function ComparacionResumen({ actual, anterior, opciones, comparaCon, onComparaCon, resumen }: {
    actual: DateRange;
    anterior: DateRange;
    /** Meses anteriores al periodo actual, elegibles para comparar */
    opciones: DateRange[];
    comparaCon: string;
    onComparaCon: (key: string) => void;
    resumen: SeccionResumen[];
}) {
    return (
        <div className="space-y-5">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-border flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-sm font-bold text-brand-dark uppercase tracking-wider">Comparación con el periodo anterior</h2>
                    <p className="text-[11px] text-stone-400 mt-0.5"><strong>{actual.label}</strong> vs <strong>{anterior.label}</strong> · respeta los filtros de la página</p>
                </div>
                <label className="flex items-center gap-2 text-[11px] font-medium text-stone-500">
                    Comparar con
                    <select
                        value={comparaCon}
                        onChange={(e) => onComparaCon(e.target.value)}
                        className="rounded-lg border border-border bg-white py-1.5 pl-2 pr-7 text-xs text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                        <option value="auto">Periodo anterior ({anterior.label})</option>
                        {opciones.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                    </select>
                </label>
            </div>

            {/* ── Resumen Ejecutivo ───────────────────────────────────────────── */}
            <div className="bg-gradient-to-br from-[#254153] to-[#1a2f3d] p-6 rounded-2xl shadow-lg text-white">
                <h2 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center"><TrendingUpIcon className="w-3.5 h-3.5" /></div>
                    Resumen Ejecutivo — {actual.label}
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
                    {resumen.map((seccion) => (
                        <section key={seccion.titulo} className="min-w-0">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#d3b99f] mb-1.5">{seccion.titulo}</h3>
                            <ul className="space-y-1.5">
                                {seccion.lineas.map((linea) => <li key={linea} className="text-[13px] leading-relaxed text-white/90">{linea}</li>)}
                            </ul>
                        </section>
                    ))}
                </div>
                <p className="mt-4 pt-3 border-t border-white/10 text-[10px] text-white/50">
                    Lectura automática de los registros y comentarios: indica concentración y correlación, no causa raíz confirmada.
                </p>
            </div>
        </div>
    );
}

// ── Decisiones: lo último de la hoja ───────────────────────────────────────
export function DecisionesRecomendadas({ decisiones, registros, onAddQRR }: {
    decisiones: Decision[];
    registros: RegistroMAC[];
    onAddQRR: (rec: Partial<QRRRecord>) => void;
}) {
    const [showRecords, setShowRecords] = useState<number[] | null>(null);
    const associatedRecords = useMemo(() => {
        if (!showRecords) return [];
        const ids = new Set(showRecords);
        return registros.filter((r) => ids.has(r.id));
    }, [showRecords, registros]);

    const handleOpenQRR = useCallback((d: Decision) => {
        const temas = d.temas.slice(0, 3);
        const fotos = d.fotos.slice(0, 5);
        onAddQRR({
            fechaInicio: new Date().toISOString().split('T')[0],
            origen: 'Análisis de indicadores',
            referencia: [d.topCompra, d.topPieza].filter(Boolean).filter((x, i, l) => l.indexOf(x) === i).join(' / '),
            responsable: d.responsable,
            problema: d.problema,
            numCasos: d.problemas,
            numUnidades: d.unidades,
            impactoDinero: Math.round(d.inversion),
            evidencia: [d.evidencia, ...(fotos.length ? [`Fotos: ${fotos.join(' ')}`] : [])].join('\n'),
            observaciones: [
                `Hablar con ${d.hablarCon}. ${d.motivo}`,
                ...(d.empuja.length ? [`Empuja sobre la meta a: ${d.empuja.join(', ')}.`] : []),
                ...temas.map((t) => `Comentarios de MAC — ${t.tema.nombre} (${t.radicados} radicados): ${t.cita}`),
            ].join('\n'),
            registrosAsociados: d.radicadosIds,
            prioridad: d.prioridad,
        });
    }, [onAddQRR]);


    const destacadas = decisiones.filter((d) => d.prioridad === 'inmediato' || d.prioridad === 'seguimiento').slice(0, 8);

    return (
        <div className="space-y-5">
            {/* ── Decisiones Recomendadas ─────────────────────────────────────── */}
            <CollapsibleSection
                title="Decisiones Recomendadas"
                icon={<ShieldAlertIcon className="w-4 h-4" />}
                subtitle="Lo que hay que abrir en QRR o seguir de cerca"
            >
                {destacadas.length === 0 ? (
                    <p className="text-sm text-stone-400 text-center py-8">Nada por abrir ni por seguir en este periodo</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[720px]">
                            <thead>
                                <tr className="bg-cream-light">
                                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 rounded-tl-lg">Decisión</th>
                                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500">Problema</th>
                                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500">Por qué</th>
                                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500">Hablar con</th>
                                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 rounded-tr-lg">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {destacadas.map((d, i) => (
                                    <tr key={d.problema} className={`transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-cream-light/60'} hover:bg-cream-light align-top`}>
                                        <td className="px-3 py-2.5 border-b border-border"><PriorityBadge level={d.prioridad} /></td>
                                        <td className="px-3 py-2.5 text-xs font-bold text-brand-dark border-b border-border max-w-[170px]">
                                            {d.problema}
                                            <div className="text-[10px] font-medium text-stone-500 mt-0.5">Responsable: {d.responsable}</div>
                                        </td>
                                        <td className="px-3 py-2.5 text-[11px] text-stone-700 border-b border-border max-w-[240px]">{d.motivo}</td>
                                        <td className="px-3 py-2.5 text-xs font-semibold text-stone-700 border-b border-border max-w-[140px]">{d.hablarCon}</td>
                                        <td className="px-3 py-2.5 border-b border-border">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-semibold text-stone-700 whitespace-nowrap">{d.accion}</span>
                                                {d.prioridad === 'inmediato' && (
                                                    <button
                                                        onClick={() => handleOpenQRR(d)}
                                                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm cursor-pointer"
                                                        title="Abrir QRR con los datos, comentarios y fotos de este problema"
                                                    >
                                                        <PlusCircleIcon className="w-3 h-3" />
                                                        QRR
                                                    </button>
                                                )}
                                                {d.radicadosIds.length > 0 && (
                                                    <button
                                                        onClick={() => setShowRecords(d.radicadosIds)}
                                                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-[#254153] bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                                                        title="Ver radicados asociados"
                                                    >
                                                        <EyeIcon className="w-3 h-3" />
                                                        {d.radicadosIds.length}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CollapsibleSection>

            {/* ── Modal de Registros Asociados ────────────────────────────────── */}
            {showRecords && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowRecords(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="bg-[#254153] px-6 py-4 flex items-center justify-between">
                            <h3 className="text-white font-bold text-sm">Registros Asociados ({associatedRecords.length})</h3>
                            <button onClick={() => setShowRecords(null)} className="text-white/80 hover:text-white transition-colors text-lg">✕</button>
                        </div>
                        <div className="p-4 overflow-auto max-h-[65vh]">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-cream-light">
                                        <th className="px-3 py-2 text-[10px] font-bold uppercase text-stone-500">Radicado</th>
                                        <th className="px-3 py-2 text-[10px] font-bold uppercase text-stone-500">Fecha</th>
                                        <th className="px-3 py-2 text-[10px] font-bold uppercase text-stone-500">Cliente</th>
                                        <th className="px-3 py-2 text-[10px] font-bold uppercase text-stone-500">Estado</th>
                                        <th className="px-3 py-2 text-[10px] font-bold uppercase text-stone-500">Ciudad</th>
                                        <th className="px-3 py-2 text-[10px] font-bold uppercase text-stone-500 text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {associatedRecords.map((r, i) => (
                                        <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-cream-light/60'}>
                                            <td className="px-3 py-2 text-xs font-bold text-[#254153] border-b border-border">{r.consecutivo}</td>
                                            <td className="px-3 py-2 text-xs text-stone-600 border-b border-border">{new Date(r.created_at).toLocaleDateString('es-CO')}</td>
                                            <td className="px-3 py-2 text-xs text-stone-700 border-b border-border">{r._clientePrincipalFinal}</td>
                                            <td className="px-3 py-2 text-xs border-b border-border">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.estado === 'Cerrado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{r.estado}</span>
                                            </td>
                                            <td className="px-3 py-2 text-xs text-stone-600 border-b border-border">{r._ciudad}</td>
                                            <td className="px-3 py-2 text-xs font-bold text-brand-dark text-right border-b border-border">{fmt$(r._valorInvertido || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Detalle: quién y dónde está creciendo ──────────────────────────────────
export function ComparacionDetalle({ analysis, filters, onFilterToggle }: {
    analysis: AllAnalyses;
    filters: FilterState;
    onFilterToggle: (key: keyof FilterState, value: string, e?: any) => void;
}) {
    const { responsables, references, geographic, clients } = analysis;
    return (
        <div className="space-y-5">
            {/* ── Responsables / Áreas ────────────────────────────────────────── */}
            <CollapsibleSection
                title="Responsables / Áreas a Atacar"
                icon={<UsersIcon className="w-4 h-4" />}
                subtitle="Área asociada a los registros — no implica causa raíz confirmada"
                defaultOpen={false}
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-cream-light">
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 rounded-tl-lg">Responsable / Área</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 text-right">Registros</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 text-right">Unidades</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 text-right">Var. %</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 text-right">$$$ asociado</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500">Principal problema</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500">Ref. principal</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 rounded-tr-lg">Prioridad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {responsables.slice(0, 15).map((r, i) => (
                                <tr key={i} onClick={(e) => onFilterToggle('responsables', r.name, e)} className={claseFila(filters.responsables.includes(r.name), i)}>
                                    <td className="px-3 py-2.5 text-xs font-medium text-brand-dark border-b border-border">{r.name}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-brand-dark text-right border-b border-border">{r.recordsCurr}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#c96a4e] text-right border-b border-border">{r.unitsCurr}</td>
                                    <td className="px-3 py-2.5 text-right border-b border-border">{fmtVar(r.variationRecords)}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#254153] text-right border-b border-border">{fmt$(r.valueCurr)}</td>
                                    <td className="px-3 py-2.5 text-xs text-stone-600 border-b border-border max-w-[150px] truncate" title={r.principalProblema}>{r.principalProblema}</td>
                                    <td className="px-3 py-2.5 text-xs text-stone-600 border-b border-border max-w-[150px] truncate" title={r.principalReferencia}>{r.principalReferencia}</td>
                                    <td className="px-3 py-2.5 border-b border-border"><PriorityBadge level={r.priority} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CollapsibleSection>

            {/* ── Referencias con Mayor Afectación ────────────────────────────── */}
            <CollapsibleSection
                title="Referencias con Mayor Afectación"
                icon={<PackageIcon className="w-4 h-4" />}
                subtitle="Producto comprado vs producto con novedad"
                defaultOpen={false}
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-cream-light">
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 rounded-tl-lg">Ref. compra</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500">Ref. novedad</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 text-right">Regs.</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 text-right">Uds.</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 text-right">Var. reg. %</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 text-right">Var. uds. %</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 text-right">$$$</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500">Novedad</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500">Responsable</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 rounded-tr-lg">Prioridad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {references.slice(0, 25).map((r, i) => (
                                <tr key={i} onClick={(e) => onFilterToggle('productos', r.refNovedad, e)} className={claseFila(filters.productos.includes(r.refNovedad), i)}>
                                    <td className="px-3 py-2.5 text-xs text-stone-600 border-b border-border max-w-[120px] truncate" title={r.refCompra}>{r.refCompra}</td>
                                    <td className="px-3 py-2.5 text-xs font-medium text-brand-dark border-b border-border max-w-[120px] truncate" title={r.refNovedad}>{r.refNovedad}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-brand-dark text-right border-b border-border">{r.recordsCurr}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#c96a4e] text-right border-b border-border">{r.unitsCurr}</td>
                                    <td className="px-3 py-2.5 text-right border-b border-border">{fmtVar(r.variationRecords)}</td>
                                    <td className="px-3 py-2.5 text-right border-b border-border">{fmtVar(r.variationUnits)}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#254153] text-right border-b border-border">{fmt$(r.valueCurr)}</td>
                                    <td className="px-3 py-2.5 text-xs text-stone-600 border-b border-border max-w-[120px] truncate" title={r.principalNovedad}>{r.principalNovedad}</td>
                                    <td className="px-3 py-2.5 text-xs text-stone-600 border-b border-border max-w-[100px] truncate" title={r.responsable}>{r.responsable}</td>
                                    <td className="px-3 py-2.5 border-b border-border"><PriorityBadge level={r.priority} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CollapsibleSection>

            {/* ── Zonas y Ciudades ────────────────────────────────────────────── */}
            <CollapsibleSection
                title="Zonas y Ciudades con Mayor Crecimiento"
                icon={<MapPinIcon className="w-4 h-4" />}
                subtitle="Identificar concentración geográfica de problemas"
                defaultOpen={false}
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-cream-light">
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 rounded-tl-lg">Zona</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500">Ciudad</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 text-right">Reg. ant.</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 text-right">Reg. act.</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 text-right">Var. %</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 text-right">Uds.</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 text-right">$$$</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500">Novedad ppal.</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500">Cliente ppal.</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 rounded-tr-lg">Prioridad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {geographic.slice(0, 20).map((g, i) => (
                                <tr key={i} onClick={(e) => onFilterToggle('ciudades', g.ciudad, e)} className={claseFila(filters.ciudades.includes(g.ciudad), i)}>
                                    <td className="px-3 py-2.5 text-xs font-medium text-brand-dark border-b border-border">{g.zona}</td>
                                    <td className="px-3 py-2.5 text-xs text-stone-700 border-b border-border">{g.ciudad}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-stone-600 text-right border-b border-border">{g.recordsPrev}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-brand-dark text-right border-b border-border">{g.recordsCurr}</td>
                                    <td className="px-3 py-2.5 text-right border-b border-border">{fmtVar(g.variationRecords)}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#c96a4e] text-right border-b border-border">{g.unitsCurr}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#254153] text-right border-b border-border">{fmt$(g.valueCurr)}</td>
                                    <td className="px-3 py-2.5 text-xs text-stone-600 border-b border-border max-w-[130px] truncate" title={g.principalNovedad}>{g.principalNovedad}</td>
                                    <td className="px-3 py-2.5 text-xs text-stone-600 border-b border-border max-w-[130px] truncate" title={g.clientePrincipal}>{g.clientePrincipal}</td>
                                    <td className="px-3 py-2.5 border-b border-border"><PriorityBadge level={g.priority} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CollapsibleSection>

            {/* ── Clientes con Tendencia Creciente ────────────────────────────── */}
            <CollapsibleSection
                title="Clientes con Tendencia Creciente"
                icon={<UsersIcon className="w-4 h-4" />}
                subtitle="Clientes con aumento de novedades"
                defaultOpen={false}
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-cream-light">
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 rounded-tl-lg">Cliente</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 text-right">Reg. ant.</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 text-right">Reg. act.</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 text-right">Var. %</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 text-right">Uds.</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 text-right">$$$</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500">Novedad ppal.</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500">Ref. ppal.</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500">Zona</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 rounded-tr-lg">Prioridad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.slice(0, 20).map((c, i) => (
                                <tr key={i} onClick={(e) => onFilterToggle('clientes', c.name, e)} className={claseFila(filters.clientes.includes(c.name), i)}>
                                    <td className="px-3 py-2.5 text-xs font-medium text-brand-dark border-b border-border max-w-[160px] truncate" title={c.name}>{c.name}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-stone-600 text-right border-b border-border">{c.recordsPrev}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-brand-dark text-right border-b border-border">{c.recordsCurr}</td>
                                    <td className="px-3 py-2.5 text-right border-b border-border">{fmtVar(c.variationRecords)}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#c96a4e] text-right border-b border-border">{c.unitsCurr}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#254153] text-right border-b border-border">{fmt$(c.valueCurr)}</td>
                                    <td className="px-3 py-2.5 text-xs text-stone-600 border-b border-border max-w-[120px] truncate" title={c.principalNovedad}>{c.principalNovedad}</td>
                                    <td className="px-3 py-2.5 text-xs text-stone-600 border-b border-border max-w-[120px] truncate" title={c.principalReferencia}>{c.principalReferencia}</td>
                                    <td className="px-3 py-2.5 text-xs text-stone-600 border-b border-border">{c.zona}</td>
                                    <td className="px-3 py-2.5 border-b border-border"><PriorityBadge level={c.priority} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CollapsibleSection>

            <p className="text-[10px] text-stone-400 px-1">Las interpretaciones se basan en correlación y concentración de los registros, no en causa raíz confirmada.</p>
        </div>
    );
}
