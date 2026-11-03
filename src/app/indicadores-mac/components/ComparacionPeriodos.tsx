'use client';
import React, { useCallback, useMemo, useState } from 'react';
import { RegistroMAC, FilterState, DateRange, QRRRecord, PriorityLevel, AllAnalyses, Recommendation } from '../types';
import { buildMonthRangeFromKey, generateExecutiveSummary, getDefaultPeriods, PRIORITY_CONFIG } from '../utils/analysisEngine';
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

// ── KPI Card ───────────────────────────────────────────────────────────────
const KpiCard = ({ title, value, prefix = '', suffix = '', variacion, subtitle, icon }: {
    title: string; value: number | string; prefix?: string; suffix?: string;
    variacion?: number | null; subtitle?: string; icon?: React.ReactNode;
}) => (
    <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-border flex flex-col justify-center min-h-[80px]">
        <div className="flex items-center justify-between">
            <h3 className="text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-0.5">{title}</h3>
            {icon && <div className="text-stone-300">{icon}</div>}
        </div>
        <div className="text-lg font-bold text-brand-dark leading-tight">
            {prefix}{typeof value === 'number' ? value.toLocaleString('es-CO') : value}{suffix}
        </div>
        {subtitle && <div className="text-[9px] text-stone-400 font-semibold mt-0.5">{subtitle}</div>}
        {variacion !== undefined && variacion !== null && (
            <div className={`flex items-center gap-1 mt-0.5 text-[9px] font-bold ${variacion > 0 ? 'text-red-600' : variacion < 0 ? 'text-green-600' : 'text-stone-500'}`}>
                {variacion > 0 ? <ArrowUpIcon className="w-2.5 h-2.5" /> : variacion < 0 ? <ArrowDownIcon className="w-2.5 h-2.5" /> : <MinusIcon className="w-2.5 h-2.5" />}
                {Math.abs(variacion).toFixed(1)}% vs período anterior
            </div>
        )}
        {variacion === null && (
            <div className="text-[9px] font-bold text-brand mt-0.5">Nuevo — sin datos del período anterior</div>
        )}
    </div>
);

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
export function ComparacionResumen({ analysis, actual, anterior, opciones, comparaCon, onComparaCon, registros, onAddQRR }: {
    analysis: AllAnalyses;
    actual: DateRange;
    anterior: DateRange;
    /** Meses anteriores al periodo actual, elegibles para comparar */
    opciones: DateRange[];
    comparaCon: string;
    onComparaCon: (key: string) => void;
    registros: RegistroMAC[];
    onAddQRR: (rec: Partial<QRRRecord>) => void;
}) {
    const executiveSummary = useMemo(() => generateExecutiveSummary(analysis), [analysis]);
    const [showRecords, setShowRecords] = useState<number[] | null>(null);
    const associatedRecords = useMemo(() => {
        if (!showRecords) return [];
        const ids = new Set(showRecords);
        return registros.filter((r) => ids.has(r.id));
    }, [showRecords, registros]);

    const handleOpenQRR = useCallback((rec: Recommendation) => {
        onAddQRR({
            fechaInicio: new Date().toISOString().split('T')[0],
            origen: 'Análisis de indicadores',
            referencia: rec.referencias,
            responsable: rec.responsable,
            problema: rec.problema,
            numCasos: rec.numCasos,
            numUnidades: rec.numUnidades,
            impactoDinero: rec.impactoDinero,
            evidencia: rec.evidencia,
            observaciones: rec.motivo,
            registrosAsociados: rec.registrosIds,
            prioridad: rec.priority,
        });
    }, [onAddQRR]);

    const { defects, recommendations } = analysis;
    const variacion = (act: number, prev: number) => (prev > 0 ? ((act - prev) / prev) * 100 : null);
    const criticalCount = defects.filter(d => d.priority === 'inmediato').length;
    const monitoringCount = defects.filter(d => d.priority === 'seguimiento').length;
    const growingCount = defects.filter(d => d.variationRecords !== null && d.variationRecords > 0).length;

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

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <KpiCard title="Registros período" value={analysis.totalRecordsCurr} variacion={variacion(analysis.totalRecordsCurr, analysis.totalRecordsPrev)} icon={<TrendingUpIcon className="w-4 h-4" />} />
                <KpiCard title="Problemas creciendo" value={growingCount} subtitle={`de ${defects.length} tipos`} icon={<AlertTriangleIcon className="w-4 h-4" />} />
                <KpiCard title="Problemas nuevos" value={defects.filter(d => d.variationRecords === null && d.recordsCurr > 0).length} icon={<ShieldAlertIcon className="w-4 h-4" />} />
                <KpiCard title="Unidades afectadas" value={analysis.totalUnitsCurr} variacion={variacion(analysis.totalUnitsCurr, analysis.totalUnitsPrev)} icon={<PackageIcon className="w-4 h-4" />} />
                <KpiCard title="Inversión total" value={fmt$(analysis.totalValueCurr)} variacion={variacion(analysis.totalValueCurr, analysis.totalValuePrev)} icon={<DollarSignIcon className="w-4 h-4" />} />
                <KpiCard title="Problemas críticos" value={criticalCount} subtitle={`${monitoringCount} en seguimiento`} icon={<ShieldAlertIcon className="w-4 h-4" />} />
            </div>

            {/* ── Resumen Ejecutivo ───────────────────────────────────────────── */}
            <div className="bg-gradient-to-br from-[#254153] to-[#1a2f3d] p-6 rounded-2xl shadow-lg text-white">
                <h2 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center"><TrendingUpIcon className="w-3.5 h-3.5" /></div>
                    Resumen Ejecutivo — {actual.label}
                </h2>
                <div className="text-sm leading-relaxed text-white/90 whitespace-pre-line">
                    {executiveSummary}
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 text-[9px] text-white/50">
                    <span>📊 Dato registrado</span>
                    <span>•</span>
                    <span>🔢 Dato calculado</span>
                    <span>•</span>
                    <span>💡 Interpretación analítica</span>
                    <span>•</span>
                    <span>⚡ Recomendación</span>
                </div>
            </div>

            {/* ── Matriz de Decisión ─────────────────────────────────────────── */}
            <CollapsibleSection
                title="Decisiones Recomendadas"
                icon={<ShieldAlertIcon className="w-4 h-4" />}
                subtitle="Recomendaciones automáticas basadas en el análisis de datos"
            >
                {recommendations.length === 0 ? (
                    <p className="text-sm text-stone-400 text-center py-8">Sin recomendaciones para el período seleccionado</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-cream-light">
                                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 rounded-tl-lg">Prioridad</th>
                                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500">Problema</th>
                                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500">Evidencia</th>
                                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500">Impacto</th>
                                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500">Responsable</th>
                                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 rounded-tr-lg">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recommendations.filter(r => r.priority !== 'estable').slice(0, 15).map((rec, i) => (
                                    <tr key={i} className={`transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-cream-light/60'} hover:bg-cream-light`}>
                                        <td className="px-3 py-2.5 border-b border-border"><PriorityBadge level={rec.priority} /></td>
                                        <td className="px-3 py-2.5 text-xs font-medium text-brand-dark border-b border-border max-w-[200px]">{rec.problema}</td>
                                        <td className="px-3 py-2.5 text-[11px] text-stone-600 border-b border-border max-w-[250px]">{rec.evidencia}</td>
                                        <td className="px-3 py-2.5 border-b border-border">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${rec.impacto === 'Alto' ? 'bg-red-100 text-red-700' : rec.impacto === 'Medio' ? 'bg-orange-100 text-orange-700' : 'bg-stone-100 text-stone-600'}`}>
                                                {rec.impacto}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-stone-600 border-b border-border">{rec.responsable}</td>
                                        <td className="px-3 py-2.5 border-b border-border">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-semibold text-stone-700">{rec.accionRecomendada}</span>
                                                {rec.priority === 'inmediato' && (
                                                    <button
                                                        onClick={() => handleOpenQRR(rec)}
                                                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
                                                        title="Abrir QRR con los datos de esta recomendación"
                                                    >
                                                        <PlusCircleIcon className="w-3 h-3" />
                                                        QRR
                                                    </button>
                                                )}
                                                {rec.registrosIds.length > 0 && (
                                                    <button
                                                        onClick={() => setShowRecords(rec.registrosIds)}
                                                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-[#254153] bg-stone-100 hover:bg-stone-100 rounded-lg transition-colors"
                                                        title="Ver registros asociados"
                                                    >
                                                        <EyeIcon className="w-3 h-3" />
                                                        {rec.registrosIds.length}
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
