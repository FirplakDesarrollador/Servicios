'use client';
import React, { useMemo, useState, useCallback } from 'react';
import {
    QRRRecord, QRREstado, QRR_ESTADO_CONFIG, QRR_ORIGEN_OPTIONS,
    PriorityLevel, RegistroMAC, FilterState,
} from '../types';
import { PRIORITY_CONFIG } from '../utils/analysisEngine';
import {
    PlusIcon, XIcon, SaveIcon, AlertTriangleIcon, ClockIcon,
    CheckCircleIcon, EditIcon, EyeIcon, DownloadIcon, Trash2Icon,
    AlertCircleIcon,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ── Props ──────────────────────────────────────────────────────────────────
interface Props {
    data: RegistroMAC[];
    prevData: RegistroMAC[];
    filters: FilterState;
    qrrRecords: QRRRecord[];
    setQrrRecords: React.Dispatch<React.SetStateAction<QRRRecord[]>>;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt$ = (v: number) => v > 0 ? `$${v.toLocaleString('es-CO')}` : '$0';
const today = () => new Date().toISOString().split('T')[0];

function getDaysUntilDue(fechaCompromiso: string): number {
    if (!fechaCompromiso) return Infinity;
    const due = new Date(fechaCompromiso + 'T23:59:59').getTime();
    const now = Date.now();
    return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
}

function computeEstado(record: QRRRecord): QRREstado {
    if (record.estado === 'cerrado') return 'cerrado';
    if (record.fechaCompromiso && getDaysUntilDue(record.fechaCompromiso) < 0) return 'vencido';
    return record.estado;
}

// ── Alertas automáticas ────────────────────────────────────────────────────
interface QRRAlert {
    type: 'vencido' | 'proximo' | 'alto_impacto' | 'reincidencia';
    qrrId: string;
    message: string;
    emoji: string;
    color: string;
}

function generateAlerts(records: QRRRecord[]): QRRAlert[] {
    const alerts: QRRAlert[] = [];
    records.forEach(r => {
        if (r.estado === 'cerrado') return;
        const days = getDaysUntilDue(r.fechaCompromiso);
        if (days < 0) {
            alerts.push({ type: 'vencido', qrrId: r.id, message: `QRR ${r.id.slice(0, 8)} VENCIDO — Fecha compromiso superada por ${Math.abs(days)} días`, emoji: '🔴', color: '#ef4444' });
        } else if (days <= 5 && days >= 0) {
            alerts.push({ type: 'proximo', qrrId: r.id, message: `QRR ${r.id.slice(0, 8)} próximo a vencer — ${days} día${days !== 1 ? 's' : ''} restante${days !== 1 ? 's' : ''}`, emoji: '🟠', color: '#f97316' });
        }
        if (r.numCasos >= 10 || r.numUnidades >= 20 || r.impactoDinero >= 5000000) {
            alerts.push({ type: 'alto_impacto', qrrId: r.id, message: `QRR ${r.id.slice(0, 8)} ALTO IMPACTO — ${r.numCasos} casos, ${r.numUnidades} uds, ${fmt$(r.impactoDinero)}`, emoji: '🔴', color: '#dc2626' });
        }
    });
    // Reincidencia: mismo problema ya cerrado previamente
    const cerrados = records.filter(r => r.estado === 'cerrado');
    const abiertos = records.filter(r => r.estado !== 'cerrado');
    abiertos.forEach(a => {
        const reincidente = cerrados.find(c => c.problema.toLowerCase() === a.problema.toLowerCase());
        if (reincidente) {
            alerts.push({ type: 'reincidencia', qrrId: a.id, message: `Posible reincidencia en "${a.problema}" — revisar efectividad de acción correctiva anterior (QRR ${reincidente.id.slice(0, 8)})`, emoji: '🔴', color: '#7c3aed' });
        }
    });
    return alerts;
}

// ── Empty QRR Record ───────────────────────────────────────────────────────
function newQRR(partial?: Partial<QRRRecord>): QRRRecord {
    return {
        id: crypto.randomUUID ? crypto.randomUUID() : `qrr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fechaInicio: today(),
        origen: 'Análisis de indicadores',
        referencia: '',
        responsable: '',
        problema: '',
        numCasos: 0,
        numUnidades: 0,
        impactoDinero: 0,
        accion: '',
        plazo: '',
        estado: 'pendiente',
        fechaCompromiso: '',
        avancePorcentaje: 0,
        ultimaActualizacion: today(),
        observaciones: '',
        evidencia: '',
        registrosAsociados: [],
        prioridad: 'seguimiento',
        ...partial,
    };
}

// ── KPI Card ───────────────────────────────────────────────────────────────
const KpiCard = ({ title, value, color, emoji }: { title: string; value: number | string; color: string; emoji: string }) => (
    <div className="bg-white px-3 py-2.5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center min-h-[68px]">
        <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">{title}</h3>
        <div className="flex items-center gap-1.5">
            <span className="text-sm">{emoji}</span>
            <span className="text-lg font-black leading-tight" style={{ color }}>{typeof value === 'number' ? value.toLocaleString('es-CO') : value}</span>
        </div>
    </div>
);

// ── Kanban Card ────────────────────────────────────────────────────────────
const KanbanCard = ({ record, onClick }: { record: QRRRecord; onClick: () => void }) => {
    const cfg = QRR_ESTADO_CONFIG[computeEstado(record)];
    const days = getDaysUntilDue(record.fechaCompromiso);
    const priCfg = PRIORITY_CONFIG[record.prioridad];

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-all hover:border-gray-300 group"
        >
            <div className="flex items-start justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-400">QRR-{record.id.slice(0, 6)}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: priCfg.bgColor, color: priCfg.color, border: `1px solid ${priCfg.borderColor}` }}>
                    {priCfg.emoji}
                </span>
            </div>
            <p className="text-xs font-bold text-gray-800 mb-1 line-clamp-2">{record.problema || 'Sin problema definido'}</p>
            <p className="text-[10px] text-gray-500 mb-2 truncate">{record.referencia || 'Sin referencia'}</p>
            <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-500">{record.responsable || '—'}</span>
                {record.fechaCompromiso && (
                    <span className={`font-bold ${days < 0 ? 'text-red-600' : days <= 3 ? 'text-orange-500' : 'text-gray-400'}`}>
                        {days < 0 ? `⚠ ${Math.abs(days)}d vencido` : `${days}d`}
                    </span>
                )}
            </div>
            {record.avancePorcentaje > 0 && (
                <div className="mt-2">
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${record.avancePorcentaje}%`, backgroundColor: cfg.color }} />
                    </div>
                    <span className="text-[9px] text-gray-400 mt-0.5">{record.avancePorcentaje}%</span>
                </div>
            )}
        </div>
    );
};

// ── Main Component ─────────────────────────────────────────────────────────
export default function QrrMac({ data, prevData, filters, qrrRecords, setQrrRecords }: Props) {
    const [editingQRR, setEditingQRR] = useState<QRRRecord | null>(null);
    const [showRecords, setShowRecords] = useState<number[] | null>(null);
    const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

    // ── Alertas ─────────────────────────────────────────────────────────────
    const alerts = useMemo(() => generateAlerts(qrrRecords), [qrrRecords]);

    // ── KPIs ────────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const abiertos = qrrRecords.filter(r => r.estado !== 'cerrado');
        const vencidos = qrrRecords.filter(r => computeEstado(r) === 'vencido');
        const enEjecucion = qrrRecords.filter(r => r.estado === 'en_ejecucion');
        const enValidacion = qrrRecords.filter(r => r.estado === 'en_validacion');
        const cerrados = qrrRecords.filter(r => r.estado === 'cerrado');
        const impactoAbierto = abiertos.reduce((a, r) => a + r.impactoDinero, 0);
        const casosAfectados = abiertos.reduce((a, r) => a + r.numCasos, 0);
        const udsAfectadas = abiertos.reduce((a, r) => a + r.numUnidades, 0);
        return { abiertos: abiertos.length, vencidos: vencidos.length, enEjecucion: enEjecucion.length, enValidacion: enValidacion.length, cerrados: cerrados.length, impactoAbierto, casosAfectados, udsAfectadas };
    }, [qrrRecords]);

    // ── Kanban columns ──────────────────────────────────────────────────────
    const kanbanColumns: { key: QRREstado; label: string; emoji: string; color: string }[] = [
        { key: 'pendiente', label: 'Pendiente', emoji: '🔴', color: '#ef4444' },
        { key: 'en_analisis', label: 'En Análisis', emoji: '🟠', color: '#f97316' },
        { key: 'en_ejecucion', label: 'En Ejecución', emoji: '🟡', color: '#eab308' },
        { key: 'en_validacion', label: 'En Validación', emoji: '🔵', color: '#3b82f6' },
        { key: 'cerrado', label: 'Cerrado', emoji: '🟢', color: '#10b981' },
    ];

    const kanbanData = useMemo(() => {
        const map: Record<string, QRRRecord[]> = {};
        kanbanColumns.forEach(c => { map[c.key] = []; });
        qrrRecords.forEach(r => {
            const est = computeEstado(r);
            const col = est === 'vencido' ? 'pendiente' : est;
            if (map[col]) map[col].push(r);
        });
        return map;
    }, [qrrRecords]);

    // ── Handlers ────────────────────────────────────────────────────────────
    const handleSave = useCallback((record: QRRRecord) => {
        record.ultimaActualizacion = today();
        setQrrRecords(prev => {
            const existing = prev.findIndex(r => r.id === record.id);
            const next = existing >= 0
                ? prev.map(r => r.id === record.id ? record : r)
                : [...prev, record];
            localStorage.setItem('mac_qrr_records', JSON.stringify(next));
            return next;
        });
        setEditingQRR(null);
    }, [setQrrRecords]);

    const handleDelete = useCallback((id: string) => {
        if (!confirm('¿Eliminar este QRR?')) return;
        setQrrRecords(prev => {
            const next = prev.filter(r => r.id !== id);
            localStorage.setItem('mac_qrr_records', JSON.stringify(next));
            return next;
        });
        setEditingQRR(null);
    }, [setQrrRecords]);

    const handleExport = useCallback(() => {
        const rows = qrrRecords.map(r => ({
            'ID': r.id.slice(0, 8),
            'Fecha Inicio': r.fechaInicio,
            'Origen': r.origen,
            'Referencia': r.referencia,
            'Responsable': r.responsable,
            'Problema': r.problema,
            'Casos': r.numCasos,
            'Unidades': r.numUnidades,
            'Impacto $$$': r.impactoDinero,
            'Acción': r.accion,
            'Plazo': r.plazo,
            'Estado': QRR_ESTADO_CONFIG[r.estado]?.label || r.estado,
            'Fecha Compromiso': r.fechaCompromiso,
            'Avance %': r.avancePorcentaje,
            'Última Actualización': r.ultimaActualizacion,
            'Observaciones': r.observaciones,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'QRR');
        XLSX.writeFile(wb, `QRR_${today()}.xlsx`);
    }, [qrrRecords]);

    // ── Registros asociados ─────────────────────────────────────────────────
    const associatedRecords = useMemo(() => {
        if (!showRecords) return [];
        return prevData.filter(r => showRecords.includes(r.id));
    }, [showRecords, prevData]);

    return (
        <div className="space-y-5 animate-fade-in">
            {/* ── KPIs ───────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                <KpiCard title="QRR Abiertos" value={stats.abiertos} emoji="📋" color="#254153" />
                <KpiCard title="QRR Vencidos" value={stats.vencidos} emoji="⚫" color={stats.vencidos > 0 ? '#ef4444' : '#6b7280'} />
                <KpiCard title="En Ejecución" value={stats.enEjecucion} emoji="🟡" color="#eab308" />
                <KpiCard title="En Validación" value={stats.enValidacion} emoji="🔵" color="#3b82f6" />
                <KpiCard title="QRR Cerrados" value={stats.cerrados} emoji="🟢" color="#10b981" />
                <KpiCard title="Impacto $$$ abierto" value={fmt$(stats.impactoAbierto)} emoji="💰" color="#254153" />
                <KpiCard title="Casos afectados" value={stats.casosAfectados} emoji="📊" color="#c96a4e" />
                <KpiCard title="Uds. afectadas" value={stats.udsAfectadas} emoji="📦" color="#749094" />
            </div>

            {/* ── Alertas ────────────────────────────────────────────────────── */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.slice(0, 5).map((alert, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border shadow-sm" style={{ backgroundColor: alert.color + '08', borderColor: alert.color + '30' }}>
                            <span className="text-sm">{alert.emoji}</span>
                            <span className="text-xs font-semibold text-gray-700 flex-1">{alert.message}</span>
                            <button
                                onClick={() => {
                                    const rec = qrrRecords.find(r => r.id === alert.qrrId);
                                    if (rec) setEditingQRR({ ...rec });
                                }}
                                className="text-[10px] font-bold text-gray-500 hover:text-gray-800 transition-colors"
                            >
                                Ver →
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Toolbar ────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setViewMode('kanban')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === 'kanban' ? 'bg-[#254153] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        Kanban
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === 'table' ? 'bg-[#254153] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        Tabla
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setEditingQRR(newQRR())}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#254153] hover:bg-[#1a2f3d] rounded-lg shadow-sm transition-all"
                    >
                        <PlusIcon className="w-3.5 h-3.5" /> Nuevo QRR
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
                    >
                        <DownloadIcon className="w-3.5 h-3.5" /> Exportar
                    </button>
                </div>
            </div>

            {/* ── Vista Kanban ────────────────────────────────────────────────── */}
            {viewMode === 'kanban' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {kanbanColumns.map(col => (
                        <div key={col.key} className="bg-gray-50/80 rounded-xl p-3 min-h-[200px]">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm">{col.emoji}</span>
                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-wider">{col.label}</span>
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 bg-white rounded-full px-2 py-0.5 shadow-sm">
                                    {kanbanData[col.key]?.length || 0}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {(kanbanData[col.key] || []).map(rec => (
                                    <KanbanCard key={rec.id} record={rec} onClick={() => setEditingQRR({ ...rec })} />
                                ))}
                                {(kanbanData[col.key] || []).length === 0 && (
                                    <p className="text-center text-[10px] text-gray-400 py-8">Sin registros</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Vista Tabla ────────────────────────────────────────────────── */}
            {viewMode === 'table' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1200px]">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Fecha</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Origen</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Referencia</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Responsable</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Problema</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Casos</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Uds.</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">$$$</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Acción</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Compromiso</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500">Estado</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500 text-right">Avance</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-500"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {qrrRecords.length === 0 && (
                                    <tr><td colSpan={13} className="text-center py-12 text-sm text-gray-400">No hay registros QRR. Crea uno nuevo o genera desde Análisis.</td></tr>
                                )}
                                {qrrRecords.map((r, i) => {
                                    const est = computeEstado(r);
                                    const cfg = QRR_ESTADO_CONFIG[est];
                                    return (
                                        <tr key={r.id} className={`transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-blue-50/40`}>
                                            <td className="px-3 py-2.5 text-xs text-gray-600 border-b border-gray-100 whitespace-nowrap">{r.fechaInicio}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-600 border-b border-gray-100">{r.origen}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-700 border-b border-gray-100 max-w-[100px] truncate" title={r.referencia}>{r.referencia || '—'}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-700 border-b border-gray-100">{r.responsable || '—'}</td>
                                            <td className="px-3 py-2.5 text-xs font-medium text-gray-800 border-b border-gray-100 max-w-[150px] truncate" title={r.problema}>{r.problema}</td>
                                            <td className="px-3 py-2.5 text-xs font-bold text-gray-800 text-right border-b border-gray-100">{r.numCasos}</td>
                                            <td className="px-3 py-2.5 text-xs font-bold text-[#c96a4e] text-right border-b border-gray-100">{r.numUnidades}</td>
                                            <td className="px-3 py-2.5 text-xs font-bold text-[#254153] text-right border-b border-gray-100">{fmt$(r.impactoDinero)}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-600 border-b border-gray-100 max-w-[120px] truncate" title={r.accion}>{r.accion || '—'}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-600 border-b border-gray-100 whitespace-nowrap">{r.fechaCompromiso || '—'}</td>
                                            <td className="px-3 py-2.5 border-b border-gray-100">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: cfg.bgColor, color: cfg.color }}>
                                                    {cfg.emoji} {cfg.label}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-xs font-bold text-gray-700 text-right border-b border-gray-100">{r.avancePorcentaje}%</td>
                                            <td className="px-3 py-2.5 border-b border-gray-100">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => setEditingQRR({ ...r })} className="p-1 rounded hover:bg-gray-100 transition-colors" title="Editar">
                                                        <EditIcon className="w-3.5 h-3.5 text-gray-500" />
                                                    </button>
                                                    {r.registrosAsociados.length > 0 && (
                                                        <button onClick={() => setShowRecords(r.registrosAsociados)} className="p-1 rounded hover:bg-gray-100 transition-colors" title="Ver registros">
                                                            <EyeIcon className="w-3.5 h-3.5 text-gray-500" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Modal Edición QRR ───────────────────────────────────────────── */}
            {editingQRR && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setEditingQRR(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="bg-[#254153] px-6 py-4 flex items-center justify-between">
                            <h3 className="text-white font-black text-sm">
                                {qrrRecords.find(r => r.id === editingQRR.id) ? `Editar QRR — ${editingQRR.id.slice(0, 8)}` : 'Nuevo QRR'}
                            </h3>
                            <button onClick={() => setEditingQRR(null)} className="text-white/80 hover:text-white transition-colors"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-4">
                            {/* Flujo de cierre visual */}
                            <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold overflow-x-auto pb-2">
                                {['Problema', 'Causa', 'Acción', 'Responsable', 'Compromiso', 'Ejecución', 'Validación', 'Cierre'].map((step, i) => (
                                    <React.Fragment key={i}>
                                        <span className={`px-2 py-1 rounded ${i <= (['pendiente', 'en_analisis', 'en_ejecucion', 'en_validacion', 'cerrado'].indexOf(editingQRR.estado) + 1) ? 'bg-[#254153] text-white' : 'bg-gray-100 text-gray-400'}`}>{step}</span>
                                        {i < 7 && <span className="text-gray-300">→</span>}
                                    </React.Fragment>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Fecha Inicio</label>
                                    <input type="date" className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-brand focus:outline-none" value={editingQRR.fechaInicio} onChange={e => setEditingQRR({ ...editingQRR, fechaInicio: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Origen</label>
                                    <select className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-brand focus:outline-none" value={editingQRR.origen} onChange={e => setEditingQRR({ ...editingQRR, origen: e.target.value })}>
                                        {QRR_ORIGEN_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Problema</label>
                                <textarea className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-brand focus:outline-none resize-none" rows={2} value={editingQRR.problema} onChange={e => setEditingQRR({ ...editingQRR, problema: e.target.value })} placeholder="Descripción del problema detectado" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Referencia(s)</label>
                                    <input type="text" className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-brand focus:outline-none" value={editingQRR.referencia} onChange={e => setEditingQRR({ ...editingQRR, referencia: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Responsable</label>
                                    <input type="text" className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-brand focus:outline-none" value={editingQRR.responsable} onChange={e => setEditingQRR({ ...editingQRR, responsable: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">N° Casos</label>
                                    <input type="number" className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-brand focus:outline-none" value={editingQRR.numCasos} onChange={e => setEditingQRR({ ...editingQRR, numCasos: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">N° Unidades</label>
                                    <input type="number" className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-brand focus:outline-none" value={editingQRR.numUnidades} onChange={e => setEditingQRR({ ...editingQRR, numUnidades: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">$$$ Impacto</label>
                                    <input type="number" className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-brand focus:outline-none" value={editingQRR.impactoDinero} onChange={e => setEditingQRR({ ...editingQRR, impactoDinero: parseInt(e.target.value) || 0 })} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Acción Correctiva / Preventiva</label>
                                <textarea className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-brand focus:outline-none resize-none" rows={2} value={editingQRR.accion} onChange={e => setEditingQRR({ ...editingQRR, accion: e.target.value })} placeholder="Acción a ejecutar" />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Fecha Compromiso</label>
                                    <input type="date" className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-brand focus:outline-none" value={editingQRR.fechaCompromiso} onChange={e => setEditingQRR({ ...editingQRR, fechaCompromiso: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Estado</label>
                                    <select className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-brand focus:outline-none" value={editingQRR.estado} onChange={e => setEditingQRR({ ...editingQRR, estado: e.target.value as QRREstado })}>
                                        {Object.entries(QRR_ESTADO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Avance %</label>
                                    <input type="number" min={0} max={100} className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-brand focus:outline-none" value={editingQRR.avancePorcentaje} onChange={e => setEditingQRR({ ...editingQRR, avancePorcentaje: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })} />
                                </div>
                            </div>

                            {/* Campos de cierre formal */}
                            {(editingQRR.estado === 'en_validacion' || editingQRR.estado === 'cerrado') && (
                                <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                                    <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                                        <CheckCircleIcon className="w-4 h-4 text-green-600" />
                                        Cierre Formal
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Acción Ejecutada</label>
                                            <textarea className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-brand focus:outline-none resize-none" rows={2} value={editingQRR.accionEjecutada || ''} onChange={e => setEditingQRR({ ...editingQRR, accionEjecutada: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Fecha Ejecución</label>
                                            <input type="date" className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-brand focus:outline-none" value={editingQRR.fechaEjecucion || ''} onChange={e => setEditingQRR({ ...editingQRR, fechaEjecucion: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Responsable Ejecución</label>
                                            <input type="text" className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-brand focus:outline-none" value={editingQRR.responsableEjecucion || ''} onChange={e => setEditingQRR({ ...editingQRR, responsableEjecucion: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Evidencia / Observación</label>
                                            <textarea className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-brand focus:outline-none resize-none" rows={2} value={editingQRR.evidenciaCierre || ''} onChange={e => setEditingQRR({ ...editingQRR, evidenciaCierre: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Validación</label>
                                            <textarea className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-brand focus:outline-none resize-none" rows={2} value={editingQRR.validacion || ''} onChange={e => setEditingQRR({ ...editingQRR, validacion: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Resultado</label>
                                            <textarea className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-brand focus:outline-none resize-none" rows={2} value={editingQRR.resultado || ''} onChange={e => setEditingQRR({ ...editingQRR, resultado: e.target.value })} />
                                        </div>
                                    </div>
                                    {editingQRR.estado === 'cerrado' && !(editingQRR.accionEjecutada && editingQRR.fechaEjecucion && editingQRR.responsableEjecucion && editingQRR.validacion && editingQRR.resultado) && (
                                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                            <AlertCircleIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                            <p className="text-xs text-amber-700 font-semibold">
                                                Para cerrar un QRR se requiere: acción ejecutada, fecha de ejecución, responsable, validación y resultado.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Observaciones</label>
                                <textarea className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-brand focus:outline-none resize-none" rows={2} value={editingQRR.observaciones} onChange={e => setEditingQRR({ ...editingQRR, observaciones: e.target.value })} />
                            </div>

                            {editingQRR.registrosAsociados.length > 0 && (
                                <button
                                    onClick={() => setShowRecords(editingQRR.registrosAsociados)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#254153] bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    <EyeIcon className="w-3.5 h-3.5" />
                                    Ver {editingQRR.registrosAsociados.length} registros asociados
                                </button>
                            )}
                        </div>

                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
                            <div>
                                {qrrRecords.find(r => r.id === editingQRR.id) && (
                                    <button
                                        onClick={() => handleDelete(editingQRR.id)}
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2Icon className="w-3.5 h-3.5" /> Eliminar
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setEditingQRR(null)} className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                                <button
                                    onClick={() => {
                                        if (editingQRR.estado === 'cerrado' && !(editingQRR.accionEjecutada && editingQRR.fechaEjecucion && editingQRR.responsableEjecucion && editingQRR.validacion && editingQRR.resultado)) {
                                            alert('Para cerrar un QRR se requiere completar todos los campos de cierre formal.');
                                            return;
                                        }
                                        handleSave(editingQRR);
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#254153] hover:bg-[#1a2f3d] rounded-lg shadow-sm transition-all"
                                >
                                    <SaveIcon className="w-3.5 h-3.5" /> Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Registros Asociados ────────────────────────────────────── */}
            {showRecords && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowRecords(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="bg-[#254153] px-6 py-4 flex items-center justify-between">
                            <h3 className="text-white font-black text-sm">Registros Asociados ({associatedRecords.length})</h3>
                            <button onClick={() => setShowRecords(null)} className="text-white/80 hover:text-white transition-colors"><XIcon className="w-5 h-5" /></button>
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
