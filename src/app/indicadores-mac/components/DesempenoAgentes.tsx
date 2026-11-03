import React, { useMemo } from 'react';
import type { FilterState, RegistroMAC } from '../types';
import { estaFueraDeSla, mediana, promedio, tiemposDeSolucion } from '../utils/metricas';

// Tabla única de desempeño por agente. Dos fechas distintas, a propósito:
//   · fecha_verificacion: solución real al cliente → cumplimiento y tiempo de solución.
//   · fecha_cierre: día en que el agente registró el cierre → cierres registrados y desfase.

const DIA_MS = 86400000;

/** Número de día calendario (zona local). Las fechas sin hora ('YYYY-MM-DD') se toman tal cual, sin desfase UTC. */
const diaCalendario = (v?: string | null) => {
    if (!v) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
    if (m) return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DIA_MS;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DIA_MS;
};

const th = 'px-3 py-2.5 text-[10px] font-bold uppercase text-stone-500 whitespace-nowrap';

export default function DesempenoAgentes({ data, filters, onFilterToggle }: {
    /** Datos con todos los filtros excepto el de agente: el seleccionado resalta y el resto sigue visible */
    data: RegistroMAC[];
    filters: FilterState;
    onFilterToggle: (key: keyof FilterState, value: string, e?: any) => void;
}) {
    const agentes = useMemo(() => {
        const porAgente = new Map<string, RegistroMAC[]>();
        for (const d of data) {
            const nombre = d._agenteNombre || 'Sin Asignar';
            const lista = porAgente.get(nombre);
            if (lista) lista.push(d);
            else porAgente.set(nombre, [d]);
        }
        return [...porAgente.entries()]
            .map(([nombre, casos]) => {
                const cerrados = casos.filter((d) => d.estado === 'Cerrado');
                const desfases: number[] = [];
                let cierres = 0;
                let inconsistentes = 0;
                for (const d of cerrados) {
                    const cierre = diaCalendario(d.fecha_cierre);
                    if (cierre === null) continue;
                    cierres++;
                    const verificacion = diaCalendario(d.fecha_verificacion);
                    if (verificacion === null) continue;
                    // Más de 1 día antes de la solución o más de un año después es un error de digitación
                    const desfase = cierre - verificacion;
                    if (desfase < -1 || desfase > 365) inconsistentes++;
                    else desfases.push(Math.max(0, desfase));
                }
                return {
                    nombre,
                    registros: casos.length,
                    participacion: data.length ? (casos.length / data.length) * 100 : 0,
                    abiertos: casos.length - cerrados.length,
                    cerrados: cerrados.length,
                    cumplimiento: casos.length ? ((casos.length - casos.filter(estaFueraDeSla).length) / casos.length) * 100 : 0,
                    tiempo: promedio(tiemposDeSolucion(casos)),
                    cierres,
                    desfase: mediana(desfases),
                    mismoDia: desfases.length ? (desfases.filter((x) => x === 0).length / desfases.length) * 100 : null,
                    sinFechaCierre: cerrados.length - cierres,
                    inconsistentes,
                };
            })
            .sort((a, b) => b.registros - a.registros);
    }, [data]);

    const seleccion = filters.agenteMac || [];

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider">Desempeño por agente</h3>
                <span className="text-[11px] text-stone-400">Clic en un agente para filtrar</span>
            </div>
            <p className="text-[11px] text-stone-400 mb-4">
                Cumplimiento y tiempo se miden con la solución real al cliente; el desfase es lo que tarda el agente en registrar el cierre después de esa solución.
            </p>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-cream-light">
                            <th className={th}>Agente</th>
                            <th className={`${th} text-right`}>Registros</th>
                            <th className={`${th} text-right`}>% del total</th>
                            <th className={`${th} text-right`}>Abiertos</th>
                            <th className={`${th} text-right`}>Cerrados</th>
                            <th className={`${th} text-right`}>Cumplimiento</th>
                            <th className={`${th} text-right`}>Tiempo solución</th>
                            <th className={`${th} text-right`}>Cierres registrados</th>
                            <th className={`${th} text-right`}>Desfase (mediana)</th>
                            <th className={`${th} text-right`}>Mismo día</th>
                            <th className={`${th} text-right`}>Sin fecha cierre</th>
                            <th className={`${th} text-right`}>Fechas a revisar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {agentes.map((a) => {
                            const activo = seleccion.includes(a.nombre);
                            return (
                                <tr
                                    key={a.nombre}
                                    onClick={(e) => onFilterToggle('agenteMac', a.nombre, e)}
                                    className={`border-b border-border cursor-pointer transition-colors ${activo ? 'bg-sage-soft' : seleccion.length > 0 ? 'opacity-50 hover:opacity-100' : 'hover:bg-cream-light'}`}
                                >
                                    <td className="px-3 py-2.5 text-xs font-bold text-brand-dark whitespace-nowrap">{a.nombre}</td>
                                    <td className="px-3 py-2.5 text-xs text-right tabular-nums">{a.registros}</td>
                                    <td className="px-3 py-2.5 text-xs text-right tabular-nums text-stone-500">{a.participacion.toFixed(1)}%</td>
                                    <td className="px-3 py-2.5 text-xs text-right tabular-nums font-bold text-[#b86835]">{a.abiertos}</td>
                                    <td className="px-3 py-2.5 text-xs text-right tabular-nums font-bold text-[#3E6E5E]">{a.cerrados}</td>
                                    <td className="px-3 py-2.5 text-right">
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${a.cumplimiento >= 95 ? 'bg-emerald-100 text-emerald-700' : a.cumplimiento >= 85 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                            {a.cumplimiento.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-xs text-right tabular-nums">{a.tiempo === null ? '—' : `${a.tiempo.toFixed(1)} d`}</td>
                                    <td className="px-3 py-2.5 text-xs text-right tabular-nums">{a.cierres}</td>
                                    <td className={`px-3 py-2.5 text-xs text-right tabular-nums ${a.desfase !== null && a.desfase > 5 ? 'text-[#b86835] font-semibold' : ''}`}>
                                        {a.desfase === null ? '—' : `${a.desfase.toFixed(0)} días`}
                                    </td>
                                    <td className="px-3 py-2.5 text-xs text-right tabular-nums">{a.mismoDia === null ? '—' : `${a.mismoDia.toFixed(1)}%`}</td>
                                    <td className="px-3 py-2.5 text-xs text-right tabular-nums text-stone-400">{a.sinFechaCierre || '—'}</td>
                                    <td className={`px-3 py-2.5 text-xs text-right tabular-nums ${a.inconsistentes ? 'text-red-700 font-semibold' : 'text-stone-400'}`}>{a.inconsistentes || '—'}</td>
                                </tr>
                            );
                        })}
                        {agentes.length === 0 && (
                            <tr><td colSpan={12} className="p-6 text-center text-xs text-stone-400">Sin casos para los filtros seleccionados.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
