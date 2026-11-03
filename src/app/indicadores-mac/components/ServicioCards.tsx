import React, { useMemo } from 'react';
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FilterState, RegistroMAC } from '../types';
import { useRowLimit } from '../utils/useRowLimit';
import { SLA_DIAS_HABILES, VENTANA_REPETIDOS_DIAS, estaFueraDeSla, promedio, tiemposDeSolucion, type ProblemaRepetido } from '../utils/metricas';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const card = 'bg-white rounded-2xl border border-border shadow-sm';
const titulo = 'text-sm font-bold text-brand-dark uppercase tracking-wider';
const th = 'px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 whitespace-nowrap';

/** Cumplimiento del SLA y tiempo real de solución por mes de ingreso. Clic en una barra filtra ese mes. */
export function TendenciaSlaCard({ data, filters, onFilterToggle }: {
    data: RegistroMAC[];
    filters: FilterState;
    onFilterToggle: (key: keyof FilterState, value: string, e?: any) => void;
}) {
    const tendencia = useMemo(() => {
        const meses = new Map<string, RegistroMAC[]>();
        for (const d of data) {
            const key = d._mesCreacionKey;
            if (!key) continue;
            const lista = meses.get(key);
            if (lista) lista.push(d);
            else meses.set(key, [d]);
        }
        return [...meses.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, casos]) => {
                const [y, m] = key.split('-');
                const tiempo = promedio(tiemposDeSolucion(casos));
                return {
                    key,
                    mes: `${MESES[Number(m) - 1]} ${y.slice(2)}`,
                    Casos: casos.length,
                    'Cumplimiento SLA %': Number((((casos.length - casos.filter(estaFueraDeSla).length) / casos.length) * 100).toFixed(1)),
                    'Días promedio': tiempo === null ? null : Number(tiempo.toFixed(1)),
                };
            });
    }, [data]);

    return (
        <div className={`${card} p-6`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                <h3 className={titulo}>Cumplimiento y tiempo de solución por mes</h3>
                <span className="text-[11px] text-stone-400">Mes de ingreso · clic en una barra para filtrar</span>
            </div>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={tendencia} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e2d5" />
                        <XAxis dataKey="mes" interval={0} tick={{ fontSize: 11, fill: '#8a8780' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="izq" tick={{ fontSize: 11, fill: '#8a8780' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="der" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#8a8780' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="dias" hide domain={[0, (max: number) => Math.max(SLA_DIAS_HABILES, Math.ceil(max * 1.3))]} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e8e2d5', fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <ReferenceLine yAxisId="der" y={90} stroke="#3E6E5E" strokeDasharray="4 4" />
                        <Bar isAnimationActive={false} yAxisId="izq" dataKey="Casos" fill="#b3bec4" radius={[6, 6, 0, 0]} maxBarSize={44} className="cursor-pointer" onClick={(b: any, _i: number, e: any) => b?.payload?.key && onFilterToggle('mesCreacion', b.payload.key, e)}>
                            {tendencia.map((t) => <Cell key={t.key} fill="#b3bec4" fillOpacity={filters.mesCreacion.length === 0 || filters.mesCreacion.includes(t.key) ? 1 : 0.3} />)}
                        </Bar>
                        <Line isAnimationActive={false} yAxisId="dias" type="monotone" dataKey="Días promedio" stroke="#c96a4e" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                        <Line isAnimationActive={false} yAxisId="der" type="monotone" dataKey="Cumplimiento SLA %" stroke="#254153" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

/** El mismo cliente con el mismo problema repetido en ≤90 días. Clic en una fila filtra ese cliente. */
export function ProblemasRepetidosCard({ lista, filters, onFilterToggle }: {
    lista: ProblemaRepetido[];
    filters: FilterState;
    onFilterToggle: (key: keyof FilterState, value: string, e?: any) => void;
}) {
    const rows = useRowLimit([lista]);
    return (
        <div className={`${card} p-6 flex flex-col`}>
            <div className="flex items-baseline justify-between gap-2 mb-1">
                <h3 className={titulo}>Problemas repetidos por cliente</h3>
                <span className="text-[10px] font-semibold text-stone-400 bg-stone-100 rounded-full px-2 py-0.5">{lista.length} casos</span>
            </div>
            <p className="text-[11px] text-stone-400 mb-3">El mismo problema dos o más veces, con menos de {VENTANA_REPETIDOS_DIAS} días entre sí · clic para filtrar</p>
            {lista.length === 0 ? (
                <p className="text-sm text-stone-400 text-center py-10">Sin problemas repetidos en el periodo.</p>
            ) : (
                <div className="overflow-y-auto max-h-[288px]" onScroll={rows.onScroll}>
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
                            {lista.slice(0, rows.limit).map((r) => (
                                <tr
                                    key={r.key}
                                    onClick={(e) => onFilterToggle('clientes', r.cliente, e)}
                                    className={`cursor-pointer border-b border-border transition-colors ${filters.clientes.includes(r.cliente) ? 'bg-sage-soft' : 'hover:bg-cream-light'}`}
                                >
                                    <td className="px-3 py-2 text-xs">
                                        <div className="font-medium text-stone-700">{r.cliente}</div>
                                        <div className="text-[10px] text-stone-400 truncate max-w-[260px]">{r.problema}</div>
                                    </td>
                                    <td className="px-3 py-2 text-xs font-bold text-brand-dark text-right tabular-nums">{r.veces}</td>
                                    <td className="px-3 py-2 text-xs text-right tabular-nums">{Math.round(r.menorIntervalo)} días</td>
                                    <td className="px-3 py-2 text-xs text-stone-500 whitespace-nowrap">{new Date(r.ultimo).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
