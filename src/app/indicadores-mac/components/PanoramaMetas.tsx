'use client';
import React, { useMemo, useState } from 'react';
import type { FilterState, RegistroMAC } from '../types';
import { META_CALIDAD, META_ECONOMICA, VENTAS_MINIMAS_PARA_DECIDIR, causaPrincipal, fmtPorcentaje, type Dimension, type Entidad } from '../utils/panorama';

type Metrica = 'pctNovedad' | 'pctCasos' | 'pctInversion';

const METRICAS: Array<{ id: Metrica; nombre: string; meta: number }> = [
    { id: 'pctNovedad', nombre: 'Productos', meta: META_CALIDAD },
    { id: 'pctCasos', nombre: 'Casos', meta: META_CALIDAD },
    { id: 'pctInversion', nombre: 'Inversión', meta: META_ECONOMICA },
];

const COLUMNAS: Array<{ dimension: Dimension; titulo: string }> = [
    { dimension: 'grupo', titulo: 'Grupos' },
    { dimension: 'planta', titulo: 'Plantas' },
    { dimension: 'canal', titulo: 'Canales' },
];

const filtroDe = (e: Entidad): { clave: keyof FilterState; valor: string } => {
    if (e.dimension === 'planta') return { clave: 'plantas', valor: e.nombre };
    if (e.dimension === 'grupo') return { clave: 'productos', valor: `GF:${e.nombre}` };
    return { clave: 'canalVenta', valor: e.nombre };
};

/** Lectura general: en qué grupos, plantas y canales estamos mal. Un clic filtra toda la hoja. */
export default function PanoramaMetas({ entidades, data, filters, onFilterToggle }: {
    entidades: Entidad[];
    data: RegistroMAC[];
    filters: FilterState;
    onFilterToggle: (key: keyof FilterState, value: string, e?: any) => void;
}) {
    const [metricaId, setMetricaId] = useState<Metrica>('pctNovedad');
    const metrica = METRICAS.find((m) => m.id === metricaId)!;

    const columnas = useMemo(() => COLUMNAS.map((c) => {
        const comparables = entidades.filter((e) => e.dimension === c.dimension && e.nombre !== 'En Blanco' && e.unidadesVendidas >= VENTAS_MINIMAS_PARA_DECIDIR && e[metricaId] !== null);
        const filas = comparables
            .map((e) => ({
                e,
                valor: e[metricaId] as number,
                causa: (e[metricaId] as number) > metrica.meta ? causaPrincipal(e, data) : null,
            }))
            .sort((a, b) => b.valor - a.valor);
        const tope = Math.max(metrica.meta * 2, ...filas.map((f) => f.valor));
        const sobre = filas.filter((f) => f.valor > metrica.meta).length;
        return { ...c, filas, tope, sobre };
    }), [entidades, data, metricaId, metrica.meta]);

    const sinCategorizar = entidades.find((e) => e.dimension === 'grupo' && e.nombre === 'En Blanco')?.unidadesNovedad || 0;

    return (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                    <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider">¿Dónde estamos mal?</h3>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                        La línea marca la meta de {fmtPorcentaje(metrica.meta)}. Clic en una fila para filtrar la hoja.
                    </p>
                </div>
                <div className="flex p-0.5 rounded-lg bg-cream-light border border-border" role="group" aria-label="Indicador">
                    {METRICAS.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => setMetricaId(m.id)}
                            aria-pressed={m.id === metricaId}
                            className={`h-7 px-3 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${m.id === metricaId ? 'bg-white text-brand shadow-[0_1px_3px_rgba(37,65,83,0.15)]' : 'text-stone-500 hover:text-brand-dark'}`}
                        >
                            {m.nombre}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-6">
                {columnas.map((c) => (
                    <section key={c.dimension} className="min-w-0">
                        <div className="flex items-baseline justify-between mb-2">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500">{c.titulo}</h4>
                            <span className="text-[10px] text-stone-400">{c.sobre === 0 ? 'Todo en meta' : `${c.sobre} sobre la meta`}</span>
                        </div>
                        {c.filas.length === 0 && <p className="text-xs text-stone-400 py-3">Sin ventas suficientes para comparar.</p>}
                        <ul className="space-y-0.5">
                            {c.filas.map(({ e, valor, causa }) => {
                                const { clave, valor: valorFiltro } = filtroDe(e);
                                const activa = ((filters[clave] as string[]) || []).includes(valorFiltro);
                                const fuera = valor > metrica.meta;
                                return (
                                    <li key={e.id}>
                                        <button
                                            onClick={(ev) => onFilterToggle(clave, valorFiltro, ev)}
                                            aria-pressed={activa}
                                            title={`${e.nombre}: ${fmtPorcentaje(valor)} · ${fuera ? 'sobre la meta' : 'en meta'}`}
                                            className={`w-full text-left rounded-lg px-2 py-1.5 transition-colors cursor-pointer ${activa ? 'bg-sage-soft' : 'hover:bg-cream-light'}`}
                                        >
                                            <div className="flex items-baseline justify-between gap-2">
                                                <span className="text-xs font-semibold text-brand-dark truncate">{e.nombre}</span>
                                                <span className={`text-xs font-bold tabular-nums shrink-0 ${fuera ? 'text-red-700' : 'text-stone-600'}`}>{fmtPorcentaje(valor)}</span>
                                            </div>
                                            <div className="relative h-2 mt-1 rounded-full bg-stone-100">
                                                <div className={`absolute inset-y-0 left-0 rounded-full ${fuera ? 'bg-[var(--c-alerta)]' : 'bg-[var(--c-oliva)]'}`} style={{ width: `${(valor / c.tope) * 100}%` }} />
                                                <div className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-brand-dark" style={{ left: `${(metrica.meta / c.tope) * 100}%` }} />
                                            </div>
                                            {causa && <div className="text-[10px] text-stone-500 mt-1 truncate" title={causa}>{causa}</div>}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                ))}
            </div>

            {sinCategorizar > 0 && (
                <p className="text-[11px] text-stone-500 mt-4 pt-3 border-t border-border">
                    {sinCategorizar} productos con novedad están pendientes de categorizar y no entran en estas barras. Las filas con menos de {VENTAS_MINIMAS_PARA_DECIDIR} productos vendidos tampoco se comparan.
                </p>
            )}
        </div>
    );
}
