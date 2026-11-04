import React, { useMemo } from 'react';
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FilterState, RegistroMAC } from '../types';
import { SLA_DIAS_HABILES, estaFueraDeSla, promedio, tiemposDeSolucion } from '../utils/metricas';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const card = 'bg-white rounded-2xl border border-border shadow-sm';
const titulo = 'text-sm font-bold text-brand-dark uppercase tracking-wider';

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
