'use client';
import React, { useMemo, useState, useCallback } from 'react';
import { RegistroMAC, FilterState, DateRange, QRRRecord, PriorityLevel, AllAnalyses, Recommendation } from '../types';
import {
    getDefaultPeriods, getAvailableMonths, buildMonthRangeFromKey,
    runFullAnalysis, generateExecutiveSummary, formatVariation,
    PRIORITY_CONFIG, filterByPeriod,
} from '../utils/analysisEngine';
import { AlertTriangleIcon, TrendingUpIcon, DollarSignIcon, MapPinIcon, UsersIcon, PackageIcon, ShieldAlertIcon, ChevronDownIcon, ChevronUpIcon, PlusCircleIcon, EyeIcon, ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react';

// ── Props ──────────────────────────────────────────────────────────────────
interface Props {
    data: RegistroMAC[];
    prevData: RegistroMAC[];
    filters: FilterState;
    setFilters?: any;
    onFilterToggle: (key: keyof FilterState, value: string, e?: any) => void;
    qrrRecords: QRRRecord[];
    onAddQRR: (rec: Partial<QRRRecord>) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt$ = (v: number) => v > 0 ? `$${v.toLocaleString('es-CO')}` : '$0';
const fmtVar = (v: number | null) => {
    if (v === null) return <span className="text-purple-600 font-bold text-xs">Nuevo</span>;
    if (v === 0) return <span className="text-gray-400 font-semibold text-xs">0%</span>;
    const color = v > 0 ? 'text-red-600' : 'text-green-600';
    const icon = v > 0 ? <ArrowUpIcon className="w-3 h-3 inline" /> : <ArrowDownIcon className="w-3 h-3 inline" />;
    return <span className={`${color} font-bold text-xs`}>{icon} {v > 0 ? '+' : ''}{v.toFixed(1)}%</span>;
};

const PriorityBadge = ({ level }: { level: PriorityLevel }) => {
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

const SectionTitle = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) => (
    <div className="flex items-center gap-2 mb-4 pt-2">
        <div className="w-8 h-8 rounded-lg bg-[#254153] text-white flex items-center justify-center flex-shrink-0">{icon}</div>
        <div>
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">{title}</h2>
            {subtitle && <p className="text-[10px] text-gray-400 font-medium">{subtitle}</p>}
        </div>
    </div>
);

// ── KPI Card ───────────────────────────────────────────────────────────────
const KpiCard = ({ title, value, prefix = '', suffix = '', variacion, subtitle, icon }: {
    title: string; value: number | string; prefix?: string; suffix?: string;
    variacion?: number | null; subtitle?: string; icon?: React.ReactNode;
}) => (
    <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center min-h-[80px]">
        <div className="flex items-center justify-between">
            <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">{title}</h3>
            {icon && <div className="text-gray-300">{icon}</div>}
        </div>
        <div className="text-lg font-black text-gray-800 leading-tight">
            {prefix}{typeof value === 'number' ? value.toLocaleString('es-CO') : value}{suffix}
        </div>
        {subtitle && <div className="text-[9px] text-gray-400 font-semibold mt-0.5">{subtitle}</div>}
        {variacion !== undefined && variacion !== null && (
            <div className={`flex items-center gap-1 mt-0.5 text-[9px] font-bold ${variacion > 0 ? 'text-red-600' : variacion < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                {variacion > 0 ? <ArrowUpIcon className="w-2.5 h-2.5" /> : variacion < 0 ? <ArrowDownIcon className="w-2.5 h-2.5" /> : <MinusIcon className="w-2.5 h-2.5" />}
                {Math.abs(variacion).toFixed(1)}% vs período anterior
            </div>
        )}
        {variacion === null && (
            <div className="text-[9px] font-bold text-purple-600 mt-0.5">Nuevo — sin datos del período anterior</div>
        )}
    </div>
);

// ── Collapsible Section ────────────────────────────────────────────────────
const CollapsibleSection = ({ children, title, icon, subtitle, defaultOpen = true }: {
    children: React.ReactNode; title: string; icon: React.ReactNode; subtitle?: string; defaultOpen?: boolean;
}) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#254153] text-white flex items-center justify-center flex-shrink-0">{icon}</div>
                    <div className="text-left">
                        <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">{title}</h2>
                        {subtitle && <p className="text-[10px] text-gray-400 font-medium">{subtitle}</p>}
                    </div>
                </div>
                {open ? <ChevronUpIcon className="w-5 h-5 text-gray-400" /> : <ChevronDownIcon className="w-5 h-5 text-gray-400" />}
            </button>
            {open && <div className="px-5 pb-5 animate-fade-in">{children}</div>}
        </div>
    );
};

// ── Component ──────────────────────────────────────────────────────────────
export default function AnalisisMac({ data, prevData, filters, onFilterToggle, qrrRecords, onAddQRR }: Props) {
    // ── Períodos ────────────────────────────────────────────────────────────
    const availableMonths = useMemo(() => getAvailableMonths(prevData), [prevData]);
    const defaults = useMemo(() => getDefaultPeriods(), []);

    const [currentPeriodKey, setCurrentPeriodKey] = useState<string>(defaults.current.key);
    const [previousPeriodKey, setPreviousPeriodKey] = useState<string>(defaults.previous.key);

    const currentPeriod = useMemo(() => buildMonthRangeFromKey(currentPeriodKey), [currentPeriodKey]);
    const previousPeriod = useMemo(() => buildMonthRangeFromKey(previousPeriodKey), [previousPeriodKey]);

    // ── Análisis completo ───────────────────────────────────────────────────
    const analysis: AllAnalyses = useMemo(
        () => runFullAnalysis(prevData, currentPeriod, previousPeriod),
        [prevData, currentPeriod, previousPeriod]
    );

    const executiveSummary = useMemo(() => generateExecutiveSummary(analysis), [analysis]);

    // ── Registros asociados modal ───────────────────────────────────────────
    const [showRecords, setShowRecords] = useState<number[] | null>(null);
    const associatedRecords = useMemo(() => {
        if (!showRecords) return [];
        return prevData.filter(r => showRecords.includes(r.id));
    }, [showRecords, prevData]);

    // ── Handler para crear QRR desde recomendación ──────────────────────────
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

    const { defects, responsables, references, geographic, clients, economic, recommendations } = analysis;
    const varRecords = analysis.totalRecordsPrev > 0
        ? ((analysis.totalRecordsCurr - analysis.totalRecordsPrev) / analysis.totalRecordsPrev) * 100
        : null;
    const varValue = analysis.totalValuePrev > 0
        ? ((analysis.totalValueCurr - analysis.totalValuePrev) / analysis.totalValuePrev) * 100
        : null;
    const varUnits = analysis.totalUnitsPrev > 0
        ? ((analysis.totalUnitsCurr - analysis.totalUnitsPrev) / analysis.totalUnitsPrev) * 100
        : null;

    const criticalCount = defects.filter(d => d.priority === 'inmediato').length;
    const monitoringCount = defects.filter(d => d.priority === 'seguimiento').length;
    const growingCount = defects.filter(d => d.variationRecords !== null && d.variationRecords > 0).length;

    return (
        <div className="space-y-5 animate-fade-in">
            {/* ── Selector de período ────────────────────────────────────────── */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Período Actual</label>
                    <select
                        className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-brand sm:text-xs sm:leading-6"
                        value={currentPeriodKey}
                        onChange={e => setCurrentPeriodKey(e.target.value)}
                    >
                        {availableMonths.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                    </select>
                </div>
                <div className="text-sm font-bold text-gray-400 pb-2">vs</div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Período Comparativo</label>
                    <select
                        className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-brand sm:text-xs sm:leading-6"
                        value={previousPeriodKey}
                        onChange={e => setPreviousPeriodKey(e.target.value)}
                    >
                        {availableMonths.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                    </select>
                </div>
                <div className="text-[10px] text-gray-400 pb-2">
                    Comparando <strong>{currentPeriod.label}</strong> vs <strong>{previousPeriod.label}</strong>
                </div>
            </div>

            {/* ── KPIs ───────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <KpiCard title="Registros período" value={analysis.totalRecordsCurr} variacion={varRecords} icon={<TrendingUpIcon className="w-4 h-4" />} />
                <KpiCard title="Problemas creciendo" value={growingCount} subtitle={`de ${defects.length} tipos`} icon={<AlertTriangleIcon className="w-4 h-4" />} />
                <KpiCard title="Problemas nuevos" value={defects.filter(d => d.variationRecords === null && d.recordsCurr > 0).length} icon={<ShieldAlertIcon className="w-4 h-4" />} />
                <KpiCard title="Unidades afectadas" value={analysis.totalUnitsCurr} variacion={varUnits} icon={<PackageIcon className="w-4 h-4" />} />
                <KpiCard title="Inversión total" value={fmt$(analysis.totalValueCurr)} variacion={varValue} icon={<DollarSignIcon className="w-4 h-4" />} />
                <KpiCard title="Problemas críticos" value={criticalCount} subtitle={`${monitoringCount} en seguimiento`} icon={<ShieldAlertIcon className="w-4 h-4" />} />
            </div>

            {/* ── Resumen Ejecutivo ───────────────────────────────────────────── */}
            <div className="bg-gradient-to-br from-[#254153] to-[#1a2f3d] p-6 rounded-2xl shadow-lg text-white">
                <h2 className="text-sm font-black uppercase tracking-wider mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center"><TrendingUpIcon className="w-3.5 h-3.5" /></div>
                    Resumen Ejecutivo — {currentPeriod.label}
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
                    <p className="text-sm text-gray-400 text-center py-8">Sin recomendaciones para el período seleccionado</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 rounded-tl-lg">Prioridad</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Problema</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Evidencia</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Impacto</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Responsable</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 rounded-tr-lg">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recommendations.filter(r => r.priority !== 'estable').slice(0, 15).map((rec, i) => (
                                    <tr key={i} className={`transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-blue-50/40`}>
                                        <td className="px-3 py-2.5 border-b border-gray-100"><PriorityBadge level={rec.priority} /></td>
                                        <td className="px-3 py-2.5 text-xs font-medium text-gray-800 border-b border-gray-100 max-w-[200px]">{rec.problema}</td>
                                        <td className="px-3 py-2.5 text-[11px] text-gray-600 border-b border-gray-100 max-w-[250px]">{rec.evidencia}</td>
                                        <td className="px-3 py-2.5 border-b border-gray-100">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${rec.impacto === 'Alto' ? 'bg-red-100 text-red-700' : rec.impacto === 'Medio' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {rec.impacto}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-gray-600 border-b border-gray-100">{rec.responsable}</td>
                                        <td className="px-3 py-2.5 border-b border-gray-100">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-semibold text-gray-700">{rec.accionRecomendada}</span>
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
                                                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-[#254153] bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
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

            {/* ── Defectos con Tendencia Creciente ────────────────────────────── */}
            <CollapsibleSection
                title="Defectos con Tendencia Creciente"
                icon={<TrendingUpIcon className="w-4 h-4" />}
                subtitle={`${defects.length} tipos de novedad analizados`}
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 rounded-tl-lg">Tipo de novedad</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Reg. ant.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Reg. act.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Var. reg. %</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Uds. ant.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Uds. act.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Var. uds. %</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">$$$ actual</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Var. $$$ %</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 rounded-tr-lg">Prioridad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {defects.slice(0, 25).map((d, i) => (
                                <tr key={i} className={`transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-blue-50/40`}>
                                    <td className="px-3 py-2.5 text-xs font-medium text-gray-800 border-b border-gray-100">{d.name}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-gray-600 text-right border-b border-gray-100">{d.recordsPrev}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-gray-800 text-right border-b border-gray-100">{d.recordsCurr}</td>
                                    <td className="px-3 py-2.5 text-right border-b border-gray-100">{fmtVar(d.variationRecords)}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-gray-600 text-right border-b border-gray-100">{d.unitsPrev}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-gray-800 text-right border-b border-gray-100">{d.unitsCurr}</td>
                                    <td className="px-3 py-2.5 text-right border-b border-gray-100">{fmtVar(d.variationUnits)}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#254153] text-right border-b border-gray-100">{fmt$(d.valueCurr)}</td>
                                    <td className="px-3 py-2.5 text-right border-b border-gray-100">{fmtVar(d.variationValue)}</td>
                                    <td className="px-3 py-2.5 border-b border-gray-100"><PriorityBadge level={d.priority} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CollapsibleSection>

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
                            <tr className="bg-gray-50">
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 rounded-tl-lg">Responsable / Área</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Registros</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Unidades</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Var. %</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">$$$ asociado</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Principal problema</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Ref. principal</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 rounded-tr-lg">Prioridad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {responsables.slice(0, 15).map((r, i) => (
                                <tr key={i} className={`transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-blue-50/40`}>
                                    <td className="px-3 py-2.5 text-xs font-medium text-gray-800 border-b border-gray-100">{r.name}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-gray-800 text-right border-b border-gray-100">{r.recordsCurr}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#c96a4e] text-right border-b border-gray-100">{r.unitsCurr}</td>
                                    <td className="px-3 py-2.5 text-right border-b border-gray-100">{fmtVar(r.variationRecords)}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#254153] text-right border-b border-gray-100">{fmt$(r.valueCurr)}</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-600 border-b border-gray-100 max-w-[150px] truncate" title={r.principalProblema}>{r.principalProblema}</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-600 border-b border-gray-100 max-w-[150px] truncate" title={r.principalReferencia}>{r.principalReferencia}</td>
                                    <td className="px-3 py-2.5 border-b border-gray-100"><PriorityBadge level={r.priority} /></td>
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
                            <tr className="bg-gray-50">
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 rounded-tl-lg">Ref. compra</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Ref. novedad</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Regs.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Uds.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Var. reg. %</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Var. uds. %</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">$$$</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Novedad</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Responsable</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 rounded-tr-lg">Prioridad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {references.slice(0, 25).map((r, i) => (
                                <tr key={i} className={`transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-blue-50/40`}>
                                    <td className="px-3 py-2.5 text-xs text-gray-600 border-b border-gray-100 max-w-[120px] truncate" title={r.refCompra}>{r.refCompra}</td>
                                    <td className="px-3 py-2.5 text-xs font-medium text-gray-800 border-b border-gray-100 max-w-[120px] truncate" title={r.refNovedad}>{r.refNovedad}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-gray-800 text-right border-b border-gray-100">{r.recordsCurr}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#c96a4e] text-right border-b border-gray-100">{r.unitsCurr}</td>
                                    <td className="px-3 py-2.5 text-right border-b border-gray-100">{fmtVar(r.variationRecords)}</td>
                                    <td className="px-3 py-2.5 text-right border-b border-gray-100">{fmtVar(r.variationUnits)}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#254153] text-right border-b border-gray-100">{fmt$(r.valueCurr)}</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-600 border-b border-gray-100 max-w-[120px] truncate" title={r.principalNovedad}>{r.principalNovedad}</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-600 border-b border-gray-100 max-w-[100px] truncate" title={r.responsable}>{r.responsable}</td>
                                    <td className="px-3 py-2.5 border-b border-gray-100"><PriorityBadge level={r.priority} /></td>
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
                            <tr className="bg-gray-50">
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 rounded-tl-lg">Zona</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Ciudad</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Reg. ant.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Reg. act.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Var. %</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Uds.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">$$$</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Novedad ppal.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Cliente ppal.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 rounded-tr-lg">Prioridad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {geographic.slice(0, 20).map((g, i) => (
                                <tr key={i} className={`transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-blue-50/40`}>
                                    <td className="px-3 py-2.5 text-xs font-medium text-gray-800 border-b border-gray-100">{g.zona}</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-700 border-b border-gray-100">{g.ciudad}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-gray-600 text-right border-b border-gray-100">{g.recordsPrev}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-gray-800 text-right border-b border-gray-100">{g.recordsCurr}</td>
                                    <td className="px-3 py-2.5 text-right border-b border-gray-100">{fmtVar(g.variationRecords)}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#c96a4e] text-right border-b border-gray-100">{g.unitsCurr}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#254153] text-right border-b border-gray-100">{fmt$(g.valueCurr)}</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-600 border-b border-gray-100 max-w-[130px] truncate" title={g.principalNovedad}>{g.principalNovedad}</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-600 border-b border-gray-100 max-w-[130px] truncate" title={g.clientePrincipal}>{g.clientePrincipal}</td>
                                    <td className="px-3 py-2.5 border-b border-gray-100"><PriorityBadge level={g.priority} /></td>
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
                            <tr className="bg-gray-50">
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 rounded-tl-lg">Cliente</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Reg. ant.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Reg. act.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Var. %</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Uds.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">$$$</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Novedad ppal.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Ref. ppal.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Zona</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 rounded-tr-lg">Prioridad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.slice(0, 20).map((c, i) => (
                                <tr key={i} className={`transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-blue-50/40`}>
                                    <td className="px-3 py-2.5 text-xs font-medium text-gray-800 border-b border-gray-100 max-w-[160px] truncate" title={c.name}>{c.name}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-gray-600 text-right border-b border-gray-100">{c.recordsPrev}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-gray-800 text-right border-b border-gray-100">{c.recordsCurr}</td>
                                    <td className="px-3 py-2.5 text-right border-b border-gray-100">{fmtVar(c.variationRecords)}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#c96a4e] text-right border-b border-gray-100">{c.unitsCurr}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#254153] text-right border-b border-gray-100">{fmt$(c.valueCurr)}</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-600 border-b border-gray-100 max-w-[120px] truncate" title={c.principalNovedad}>{c.principalNovedad}</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-600 border-b border-gray-100 max-w-[120px] truncate" title={c.principalReferencia}>{c.principalReferencia}</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-600 border-b border-gray-100">{c.zona}</td>
                                    <td className="px-3 py-2.5 border-b border-gray-100"><PriorityBadge level={c.priority} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CollapsibleSection>

            {/* ── Impacto Económico ───────────────────────────────────────────── */}
            <CollapsibleSection
                title="Novedades con Mayor Impacto Económico"
                icon={<DollarSignIcon className="w-4 h-4" />}
                subtitle="¿En qué problemas estamos gastando más dinero?"
                defaultOpen={false}
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 rounded-tl-lg">Tipo de novedad</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Casos</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Uds.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Inversión $$$</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">% del total</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Var. $$$ %</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Responsable</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Ref. ppal.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Cliente ppal.</th>
                                <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 rounded-tr-lg">Prioridad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {economic.slice(0, 15).map((e, i) => (
                                <tr key={i} className={`transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-blue-50/40`}>
                                    <td className="px-3 py-2.5 text-xs font-medium text-gray-800 border-b border-gray-100">{e.name}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-gray-800 text-right border-b border-gray-100">{e.recordsCurr}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#c96a4e] text-right border-b border-gray-100">{e.unitsCurr}</td>
                                    <td className="px-3 py-2.5 text-xs font-black text-[#254153] text-right border-b border-gray-100">{fmt$(e.valueCurr)}</td>
                                    <td className="px-3 py-2.5 text-xs font-bold text-[#749094] text-right border-b border-gray-100">{e.percentOfTotal.toFixed(1)}%</td>
                                    <td className="px-3 py-2.5 text-right border-b border-gray-100">{fmtVar(e.variationValue)}</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-600 border-b border-gray-100 max-w-[100px] truncate" title={e.responsable}>{e.responsable}</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-600 border-b border-gray-100 max-w-[120px] truncate" title={e.principalReferencia}>{e.principalReferencia}</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-600 border-b border-gray-100 max-w-[120px] truncate" title={e.clientePrincipal}>{e.clientePrincipal}</td>
                                    <td className="px-3 py-2.5 border-b border-gray-100"><PriorityBadge level={e.priority} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CollapsibleSection>

            {/* ── Conclusión Ejecutiva ────────────────────────────────────────── */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#254153] text-white flex items-center justify-center"><TrendingUpIcon className="w-3.5 h-3.5" /></div>
                    Conclusión Ejecutiva
                </h2>
                <div className="bg-gray-50 p-5 rounded-xl text-sm text-gray-700 leading-relaxed whitespace-pre-line border border-gray-100">
                    {executiveSummary}
                </div>
                <div className="mt-3 flex items-center gap-4 text-[9px] text-gray-400">
                    <span>📊 Los datos presentados provienen de los registros fuente de registro_solicitudes</span>
                    <span>•</span>
                    <span>💡 Las interpretaciones están basadas en correlación/concentración, no en causa raíz confirmada</span>
                </div>
            </div>

            {/* ── Modal de Registros Asociados ────────────────────────────────── */}
            {showRecords && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowRecords(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="bg-[#254153] px-6 py-4 flex items-center justify-between">
                            <h3 className="text-white font-black text-sm">Registros Asociados ({associatedRecords.length})</h3>
                            <button onClick={() => setShowRecords(null)} className="text-white/80 hover:text-white transition-colors text-lg">✕</button>
                        </div>
                        <div className="p-4 overflow-auto max-h-[65vh]">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="px-3 py-2 text-[10px] font-black uppercase text-gray-500">Radicado</th>
                                        <th className="px-3 py-2 text-[10px] font-black uppercase text-gray-500">Fecha</th>
                                        <th className="px-3 py-2 text-[10px] font-black uppercase text-gray-500">Cliente</th>
                                        <th className="px-3 py-2 text-[10px] font-black uppercase text-gray-500">Estado</th>
                                        <th className="px-3 py-2 text-[10px] font-black uppercase text-gray-500">Ciudad</th>
                                        <th className="px-3 py-2 text-[10px] font-black uppercase text-gray-500 text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {associatedRecords.map((r, i) => (
                                        <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                                            <td className="px-3 py-2 text-xs font-bold text-[#254153] border-b border-gray-100">{r.consecutivo}</td>
                                            <td className="px-3 py-2 text-xs text-gray-600 border-b border-gray-100">{new Date(r.created_at).toLocaleDateString('es-CO')}</td>
                                            <td className="px-3 py-2 text-xs text-gray-700 border-b border-gray-100">{r._clientePrincipalFinal}</td>
                                            <td className="px-3 py-2 text-xs border-b border-gray-100">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.estado === 'Cerrado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{r.estado}</span>
                                            </td>
                                            <td className="px-3 py-2 text-xs text-gray-600 border-b border-gray-100">{r._ciudad}</td>
                                            <td className="px-3 py-2 text-xs font-bold text-gray-800 text-right border-b border-gray-100">{fmt$(r._valorInvertido || 0)}</td>
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
