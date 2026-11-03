import React, { useMemo } from 'react';
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, ReferenceLine } from 'recharts';
import { RegistroMAC, FilterState } from '../types';
import { useRowLimit } from '../utils/useRowLimit';
import { EN_BLANCO } from '../utils/filterEngine';

// Indicadores de experiencia del cliente (adicionales; no reemplazan los de las otras pestañas).
// Regla de fechas:
//   · fecha_verificacion = fecha REAL en que se le dio solución al cliente → estado, SLA y tiempos.
//   · fecha_cierre       = día en que el agente registró el cierre → productividad del agente.

interface Props {
    data: RegistroMAC[];
    /** Vistas cruzadas: todo menos el filtro propio, para resaltar en vez de vaciar */
    dataForMesCreacion?: RegistroMAC[];
    dataForDefectos?: RegistroMAC[];
    dataForAgente?: RegistroMAC[];
    prevData: RegistroMAC[];
    filters: FilterState;
    onFilterToggle: (key: keyof FilterState, value: string, e?: any) => void;
}

const SLA_DIAS_HABILES = 15;
const VENTANA_REINCIDENCIA_DIAS = 90;
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DIA_MS = 86400000;

const card = 'bg-white rounded-2xl border border-border';
const titulo = 'text-sm font-bold text-brand-dark uppercase tracking-wider';
const th = 'px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 whitespace-nowrap';

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmtDias = (n: number | null) => (n === null || Number.isNaN(n) ? '—' : `${n.toFixed(1)} d`);
const fmtMoney = (n: number) =>
    n >= 1e9 ? `$${(n / 1e9).toFixed(1)}MM` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n).toLocaleString('es-CO')}`;
const fmtFecha = (ts: number) => new Date(ts).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

const mediana = (xs: number[]) => {
    if (xs.length === 0) return null;
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const promedio = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
/** Número de día calendario (zona local). Las fechas sin hora ('YYYY-MM-DD') se toman tal cual, sin desfase UTC. */
const diaCalendario = (v?: string | null) => {
    if (!v) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
    if (m) return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DIA_MS;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DIA_MS;
};
const ts = (v?: string | null) => {
    if (!v) return null;
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? null : t;
};

function Kpi({ label, value, hint, tone = 'neutral' }: { label: string; value: string; hint: string; tone?: 'good' | 'warn' | 'bad' | 'neutral' }) {
    const color = tone === 'good' ? 'text-[#3E6E5E]' : tone === 'warn' ? 'text-[#b86835]' : tone === 'bad' ? 'text-red-700' : 'text-brand-dark';
    return (
        <div className={`${card} px-5 py-4`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">{label}</p>
            <p className={`text-2xl font-bold mt-1 tabular-nums ${color}`}>{value}</p>
            <p className="text-[11px] text-stone-400 mt-0.5">{hint}</p>
        </div>
    );
}

export default function ExperienciaMac({ data, dataForMesCreacion, dataForDefectos, dataForAgente, onFilterToggle, filters }: Props) {
    const datosMes = dataForMesCreacion || data;
    const datosProblema = dataForDefectos || data;
    const datosAgente = dataForAgente || data;
    // ── Indicadores generales ─────────────────────────────────────────────────
    const kpis = useMemo(() => {
        const cerrados = data.filter((d) => d.estado === 'Cerrado' && typeof d._tiempoCierre === 'number');
        const tiempos = cerrados.map((d) => d._tiempoCierre as number);
        const dentroSla = tiempos.filter((t) => t <= SLA_DIAS_HABILES).length;
        const abiertos = data.filter((d) => d.estado === 'Abierto');
        const abiertosFueraSla = abiertos.filter((d) => (d._diasHabilesAbierta || 0) > SLA_DIAS_HABILES).length;
        return {
            cerrados: cerrados.length,
            sla: cerrados.length ? dentroSla / cerrados.length : null,
            promedio: promedio(tiempos),
            mediana: mediana(tiempos),
            abiertos: abiertos.length,
            abiertosFueraSla,
        };
    }, [data]);

    // ── Tendencia mensual (por mes de ingreso) ────────────────────────────────
    const tendencia = useMemo(() => {
        const meses = new Map<string, { casos: number; cerrados: number; dentro: number; tiempos: number[] }>();
        for (const d of datosMes) {
            const key = d._mesCreacionKey;
            if (!key) continue;
            const m = meses.get(key) || { casos: 0, cerrados: 0, dentro: 0, tiempos: [] };
            m.casos++;
            if (d.estado === 'Cerrado' && typeof d._tiempoCierre === 'number') {
                m.cerrados++;
                m.tiempos.push(d._tiempoCierre);
                if (d._tiempoCierre <= SLA_DIAS_HABILES) m.dentro++;
            }
            meses.set(key, m);
        }
        return [...meses.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, m]) => {
                const [y, mm] = key.split('-');
                return {
                    key,
                    mes: `${MESES[Number(mm) - 1]} ${y.slice(2)}`,
                    Casos: m.casos,
                    'Cumplimiento SLA %': m.cerrados ? Number(((m.dentro / m.cerrados) * 100).toFixed(1)) : null,
                    'Días promedio': m.tiempos.length ? Number((promedio(m.tiempos) as number).toFixed(1)) : null,
                };
            });
    }, [datosMes]);

    // ── Pareto por experiencia: casos primero, dinero como dato secundario ────
    const pareto = useMemo(() => {
        const map = new Map<string, { casos: number; unidades: number; tiempos: number[]; valor: number }>();
        for (const d of datosProblema) {
            const problemas = d._defectosNombres && d._defectosNombres.length > 0 ? d._defectosNombres : [EN_BLANCO];
            const unidades = (d.productos_novedad || []).reduce((a: number, p: any) => a + (Number(p.cantidad) || 1), 0) || 1;
            for (const p of problemas) {
                const e = map.get(p) || { casos: 0, unidades: 0, tiempos: [], valor: 0 };
                e.casos++;
                e.unidades += unidades;
                e.valor += d._valorInvertido || 0;
                if (d.estado === 'Cerrado' && typeof d._tiempoCierre === 'number') e.tiempos.push(d._tiempoCierre);
                map.set(p, e);
            }
        }
        const total = [...map.values()].reduce((a, e) => a + e.casos, 0) || 1;
        let acumulado = 0;
        return [...map.entries()]
            .sort((a, b) => b[1].casos - a[1].casos)
            .map(([nombre, e]) => {
                acumulado += e.casos;
                return {
                    nombre,
                    casos: e.casos,
                    participacion: e.casos / total,
                    acumulado: acumulado / total,
                    unidades: e.unidades,
                    diasPromedio: promedio(e.tiempos),
                    valor: e.valor,
                };
            });
    }, [datosProblema]);
    const paretoVital = pareto.filter((p, i) => i === 0 || pareto[i - 1].acumulado < 0.8).length;
    const paretoChart = pareto.slice(0, 12).map((p) => ({
        nombre: p.nombre.length > 22 ? `${p.nombre.slice(0, 22)}…` : p.nombre,
        Casos: p.casos,
        '% acumulado': Number((p.acumulado * 100).toFixed(1)),
        completo: p.nombre,
    }));

    // ── Problemas repetidos: mismo cliente + mismo problema en ≤90 días ───────
    // (Un distribuidor tiene muchos radicados por volumen; lo que afecta la experiencia es que
    // el MISMO problema se le repita.)
    const reincidentes = useMemo(() => {
        const pares = new Map<string, { cliente: string; problema: string; fechas: number[] }>();
        let radicadosConCliente = 0;
        for (const d of data) {
            const cliente = d._clientePrincipalFinal;
            const fecha = ts(d.created_at);
            if (!cliente || cliente === 'Desconocido' || fecha === null) continue;
            radicadosConCliente++;
            for (const problema of new Set(d._defectosNombres || [])) {
                const key = `${cliente}\u0000${problema}`;
                const e = pares.get(key) || { cliente, problema, fechas: [] };
                e.fechas.push(fecha);
                pares.set(key, e);
            }
        }
        const lista: Array<{ key: string; cliente: string; problema: string; veces: number; menorBrecha: number; ultimo: number }> = [];
        let repeticiones = 0;
        for (const [key, e] of pares) {
            if (e.fechas.length < 2) continue;
            const f = e.fechas.sort((a, b) => a - b);
            let menor = Infinity;
            for (let i = 1; i < f.length; i++) menor = Math.min(menor, (f[i] - f[i - 1]) / DIA_MS);
            if (menor > VENTANA_REINCIDENCIA_DIAS) continue;
            repeticiones += f.length - 1;
            lista.push({ key, cliente: e.cliente, problema: e.problema, veces: f.length, menorBrecha: menor, ultimo: f[f.length - 1] });
        }
        return {
            lista: lista.sort((a, b) => b.veces - a.veces || a.menorBrecha - b.menorBrecha),
            tasa: radicadosConCliente ? repeticiones / radicadosConCliente : 0,
            clientes: new Set(lista.map((l) => l.cliente)).size,
        };
    }, [data]);

    // ── Cierre del agente (fecha_cierre) vs solución real (fecha_verificacion) ─
    const agentes = useMemo(() => {
        const map = new Map<string, { cierres: number; brechas: number[]; mismoDia: number; sinFechaCierre: number; inconsistentes: number }>();
        for (const d of datosAgente) {
            if (d.estado !== 'Cerrado') continue;
            const agente = d._agenteNombre || 'Sin Asignar';
            const e = map.get(agente) || { cierres: 0, brechas: [], mismoDia: 0, sinFechaCierre: 0, inconsistentes: 0 };
            const verif = diaCalendario(d.fecha_verificacion);
            const cierre = diaCalendario(d.fecha_cierre);
            if (cierre === null) {
                e.sinFechaCierre++;
            } else {
                e.cierres++;
                if (verif !== null) {
                    // Desfase en días calendario. Un cierre más de 1 día ANTES de la solución o más de un año
                    // después es un error de digitación de alguna de las fechas: se cuenta aparte.
                    const brecha = cierre - verif;
                    if (brecha < -1 || brecha > 365) {
                        e.inconsistentes++;
                    } else {
                        const b = Math.max(0, brecha);
                        e.brechas.push(b);
                        if (b === 0) e.mismoDia++;
                    }
                }
            }
            map.set(agente, e);
        }
        return [...map.entries()]
            .map(([agente, e]) => ({
                agente,
                cierres: e.cierres,
                brechaMediana: mediana(e.brechas),
                mismoDia: e.brechas.length ? e.mismoDia / e.brechas.length : null,
                sinFechaCierre: e.sinFechaCierre,
                inconsistentes: e.inconsistentes,
            }))
            .sort((a, b) => b.cierres - a.cierres);
    }, [datosAgente]);

    const paretoRows = useRowLimit([pareto]);
    const reincRows = useRowLimit([reincidentes]);

    const slaTone = kpis.sla === null ? 'neutral' : kpis.sla >= 0.9 ? 'good' : kpis.sla >= 0.75 ? 'warn' : 'bad';

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h2 className="text-lg font-bold text-brand-dark">Experiencia del cliente</h2>
                    <p className="text-xs text-stone-500">
                        Medida con la fecha real de solución (fecha de verificación). SLA: {SLA_DIAS_HABILES} días hábiles.
                    </p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Kpi label="Cumplimiento SLA" value={kpis.sla === null ? '—' : pct(kpis.sla)} hint={`${kpis.cerrados} casos resueltos`} tone={slaTone} />
                <Kpi label="Tiempo real de solución" value={fmtDias(kpis.promedio)} hint={`Mediana ${fmtDias(kpis.mediana)} · días hábiles`} />
                <Kpi label="Abiertos fuera de SLA" value={String(kpis.abiertosFueraSla)} hint={`de ${kpis.abiertos} abiertos`} tone={kpis.abiertosFueraSla > 0 ? 'bad' : 'good'} />
                <Kpi label="Problemas repetidos" value={pct(reincidentes.tasa)} hint={`de los casos · ${reincidentes.clientes} clientes · ≤${VENTANA_REINCIDENCIA_DIAS} días`} tone={reincidentes.tasa > 0.1 ? 'warn' : 'neutral'} />
                <Kpi label="Problemas que suman 80%" value={String(paretoVital)} hint={`de ${pareto.length} tipos de problema`} />
            </div>

            {/* Tendencia */}
            <div className={`${card} p-6`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                    <h3 className={titulo}>Cumplimiento de SLA y tiempo de solución por mes</h3>
                    <span className="text-[11px] text-stone-400">Mes de ingreso del caso · clic en una barra para filtrar</span>
                </div>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={tendencia} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e2d5" />
                            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#8a8780' }} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="izq" tick={{ fontSize: 11, fill: '#8a8780' }} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="der" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#8a8780' }} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="dias" hide domain={[0, (max: number) => Math.max(SLA_DIAS_HABILES, Math.ceil(max * 1.3))]} />
                            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e8e2d5', fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <ReferenceLine yAxisId="der" y={90} stroke="#3E6E5E" strokeDasharray="4 4" />
                            <Bar yAxisId="izq" dataKey="Casos" fill="#b3bec4" radius={[6, 6, 0, 0]} maxBarSize={44} className="cursor-pointer" onClick={(b: any, _i: number, e: any) => b?.payload?.key && onFilterToggle('mesCreacion', b.payload.key, e)}>
                                {tendencia.map((t) => <Cell key={t.key} fill="#b3bec4" fillOpacity={filters.mesCreacion.length === 0 || filters.mesCreacion.includes(t.key) ? 1 : 0.3} />)}
                            </Bar>
                            <Line yAxisId="dias" type="monotone" dataKey="Días promedio" stroke="#c96a4e" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                            <Line yAxisId="der" type="monotone" dataKey="Cumplimiento SLA %" stroke="#254153" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Pareto por experiencia */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <div className={`${card} p-6 xl:col-span-2`}>
                    <h3 className={`${titulo} mb-1`}>Pareto de problemas</h3>
                    <p className="text-[11px] text-stone-400 mb-4">Por número de casos (experiencia), no por dinero · clic para filtrar</p>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={paretoChart} margin={{ top: 10, right: 0, left: -20, bottom: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e2d5" />
                                <XAxis dataKey="nombre" interval={0} angle={-40} textAnchor="end" tick={{ fontSize: 9, fill: '#8a8780' }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="izq" tick={{ fontSize: 11, fill: '#8a8780' }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="der" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#8a8780' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e8e2d5', fontSize: 12 }} />
                                <ReferenceLine yAxisId="der" y={80} stroke="#c96a4e" strokeDasharray="4 4" />
                                <Bar yAxisId="izq" dataKey="Casos" fill="#254153" radius={[6, 6, 0, 0]} maxBarSize={36} className="cursor-pointer" onClick={(b: any, _i: number, e: any) => b?.payload?.completo && onFilterToggle('defectos', b.payload.completo, e)}>
                                    {paretoChart.map((p) => <Cell key={p.completo} fill="#254153" fillOpacity={filters.defectos.length === 0 || filters.defectos.includes(p.completo) ? 1 : 0.3} />)}
                                </Bar>
                                <Line yAxisId="der" type="monotone" dataKey="% acumulado" stroke="#c96a4e" strokeWidth={2} dot={{ r: 2.5 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className={`${card} p-6 xl:col-span-3 flex flex-col`}>
                    <div className="flex items-baseline justify-between gap-2 mb-3">
                        <h3 className={titulo}>Detalle del pareto</h3>
                        <span className="text-[11px] text-stone-400">Clic en un problema para filtrar</span>
                    </div>
                    <div className="overflow-y-auto max-h-[360px]" onScroll={paretoRows.onScroll}>
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-cream-light">
                                    <th className={th}>Problema</th>
                                    <th className={`${th} text-right`}>Casos</th>
                                    <th className={`${th} text-right`}>% acum.</th>
                                    <th className={`${th} text-right`}>Unid.</th>
                                    <th className={`${th} text-right`}>Días solución</th>
                                    <th className={`${th} text-right`}>Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pareto.slice(0, paretoRows.limit).map((p, i) => {
                                    const activo = filters.defectos.includes(p.nombre);
                                    return (
                                        <tr
                                            key={p.nombre}
                                            onClick={(e) => onFilterToggle('defectos', p.nombre, e)}
                                            className={`cursor-pointer transition-colors border-b border-border ${activo ? 'bg-sage-soft' : i < paretoVital ? 'bg-white hover:bg-cream-light' : 'bg-cream-light/40 hover:bg-cream-light text-stone-500'}`}
                                        >
                                            <td className="px-3 py-2 text-xs font-medium text-stone-700">
                                                {i < paretoVital && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#c96a4e] mr-2 align-middle" />}
                                                {p.nombre}
                                            </td>
                                            <td className="px-3 py-2 text-xs font-bold text-brand-dark text-right tabular-nums">{p.casos}</td>
                                            <td className="px-3 py-2 text-xs text-right tabular-nums">{pct(p.acumulado)}</td>
                                            <td className="px-3 py-2 text-xs text-right tabular-nums">{p.unidades}</td>
                                            <td className="px-3 py-2 text-xs text-right tabular-nums">{fmtDias(p.diasPromedio)}</td>
                                            <td className="px-3 py-2 text-[11px] text-stone-400 text-right tabular-nums">{fmtMoney(p.valor)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-3">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#c96a4e] mr-1.5 align-middle" />
                        Los problemas marcados concentran el 80% de los casos.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Reincidencia */}
                <div className={`${card} p-6 flex flex-col`}>
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                        <h3 className={titulo}>Problemas repetidos por cliente</h3>
                        <span className="text-[10px] font-semibold text-stone-400 bg-stone-100 rounded-full px-2 py-0.5">{reincidentes.lista.length} casos</span>
                    </div>
                    <p className="text-[11px] text-stone-400 mb-3">El mismo cliente con el mismo problema dos o más veces, con menos de {VENTANA_REINCIDENCIA_DIAS} días entre sí</p>
                    {reincidentes.lista.length === 0 ? (
                        <p className="text-sm text-stone-400 text-center py-10">Sin problemas repetidos en el periodo.</p>
                    ) : (
                        <div className="overflow-y-auto max-h-[380px]" onScroll={reincRows.onScroll}>
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-cream-light">
                                        <th className={th}>Cliente</th>
                                        <th className={`${th} text-right`}>Veces</th>
                                        <th className={`${th} text-right`}>Menor intervalo</th>
                                        <th className={th}>Último</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reincidentes.lista.slice(0, reincRows.limit).map((r) => (
                                        <tr key={r.key} onClick={(e) => onFilterToggle('clientes', r.cliente, e)} className="cursor-pointer border-b border-border hover:bg-cream-light transition-colors">
                                            <td className="px-3 py-2 text-xs">
                                                <div className="font-medium text-stone-700">{r.cliente}</div>
                                                <div className="text-[10px] text-stone-400 truncate max-w-[260px]">{r.problema}</div>
                                            </td>
                                            <td className="px-3 py-2 text-xs font-bold text-brand-dark text-right tabular-nums">{r.veces}</td>
                                            <td className="px-3 py-2 text-xs text-right tabular-nums">{Math.round(r.menorBrecha)} días</td>
                                            <td className="px-3 py-2 text-xs text-stone-500 whitespace-nowrap">{fmtFecha(r.ultimo)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Cierre del agente vs solución real */}
                <div className={`${card} p-6 flex flex-col`}>
                    <h3 className={`${titulo} mb-1`}>Cierre del agente vs. solución real</h3>
                    <p className="text-[11px] text-stone-400 mb-3">
                        Días entre la solución al cliente (verificación) y el registro del cierre por el agente (fecha de cierre)
                    </p>
                    <div className="overflow-y-auto max-h-[380px]">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-cream-light">
                                    <th className={th}>Agente</th>
                                    <th className={`${th} text-right`}>Cierres</th>
                                    <th className={`${th} text-right`}>Desfase (mediana)</th>
                                    <th className={`${th} text-right`}>Mismo día</th>
                                    <th className={`${th} text-right`}>Sin fecha cierre</th>
                                    <th className={`${th} text-right`}>Fechas a revisar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {agentes.map((a) => (
                                    <tr key={a.agente} onClick={(e) => onFilterToggle('agenteMac', a.agente, e)} className={`border-b border-border cursor-pointer transition-colors ${filters.agenteMac.includes(a.agente) ? 'bg-sage-soft' : filters.agenteMac.length > 0 ? 'opacity-50 hover:opacity-100' : 'hover:bg-cream-light'}`}>
                                        <td className="px-3 py-2 text-xs font-medium text-stone-700">{a.agente}</td>
                                        <td className="px-3 py-2 text-xs font-bold text-brand-dark text-right tabular-nums">{a.cierres}</td>
                                        <td className={`px-3 py-2 text-xs text-right tabular-nums ${a.brechaMediana !== null && a.brechaMediana > 5 ? 'text-[#b86835] font-semibold' : ''}`}>
                                            {a.brechaMediana === null ? '—' : `${a.brechaMediana.toFixed(0)} días`}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-right tabular-nums">{a.mismoDia === null ? '—' : pct(a.mismoDia)}</td>
                                        <td className="px-3 py-2 text-xs text-right tabular-nums text-stone-400">{a.sinFechaCierre || '—'}</td>
                                        <td className={`px-3 py-2 text-xs text-right tabular-nums ${a.inconsistentes ? 'text-red-700 font-semibold' : 'text-stone-400'}`}>{a.inconsistentes || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
