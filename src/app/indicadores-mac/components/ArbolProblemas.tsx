'use client';
import React, { useMemo, useState } from 'react';
import { ChevronRightIcon } from 'lucide-react';
import type { RegistroMAC } from '../types';
import { resumirPor, type LineaProblema, type Resumen } from '../utils/conteoProblemas';

const fmtN = (v: number) => Math.round(v).toLocaleString('es-CO');
const fmtPct = (v: number | null) => (v === null ? '—' : `${v.toFixed(2)}%`);

/** Flecha que despliega una fila sin activar el filtro de la fila. */
export function FlechaRama({ abierto, onClick, nombre }: { abierto: boolean; onClick: () => void; nombre: string }) {
    return (
        <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            aria-expanded={abierto}
            aria-label={`${abierto ? 'Ocultar' : 'Ver'} el detalle de ${nombre}`}
            className="inline-flex items-center justify-center w-6 h-6 -my-1 mr-1 rounded-md text-stone-500 hover:bg-stone-200 hover:text-brand-dark transition-colors cursor-pointer align-middle"
        >
            <ChevronRightIcon className={`w-3.5 h-3.5 transition-transform ${abierto ? 'rotate-90' : ''}`} />
        </button>
    );
}

/** Rayitas del árbol: una línea vertical por nivel y una horizontal hacia la fila. */
function Rayitas({ nivel }: { nivel: 1 | 2 }) {
    const posiciones = nivel === 1 ? [22] : [22, 46];
    return (
        <>
            {posiciones.map((x) => <span key={x} aria-hidden className="absolute inset-y-0 w-px bg-stone-300" style={{ left: x }} />)}
            <span aria-hidden className="absolute top-1/2 h-px w-2.5 bg-stone-300" style={{ left: posiciones[posiciones.length - 1] }} />
        </>
    );
}

interface Base {
    data: RegistroMAC[];
    /** Líneas que pertenecen a la fila desplegada */
    filtro: (l: LineaProblema) => boolean;
    vendidas: number;
    ventasTotales: number;
}

const ordenar = (m: Map<string, Resumen>) => [...m.entries()].sort((a, b) => b[1].unidades - a[1].unidades || b[1].problemas - a[1].problemas);

/** Celdas alineadas con las columnas de la tabla: Problemas, % Casos, Unds Vend., Unds Nov., % Nov., % Inv., Var. */
function Celdas({ r, vendidas, ventasTotales }: { r: Resumen; vendidas: number; ventasTotales: number }) {
    return (
        <>
            <td className="px-3 py-2 text-right tabular-nums">{fmtN(r.problemas)}</td>
            <td className="px-3 py-2 text-right tabular-nums text-stone-500">{fmtPct(vendidas > 0 ? (r.problemas / vendidas) * 100 : null)}</td>
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-right tabular-nums text-[var(--c-alerta)]">{fmtN(r.unidades)}</td>
            <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtPct(vendidas > 0 ? (r.unidades / vendidas) * 100 : null)}</td>
            <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtPct(ventasTotales > 0 ? (r.inversion / ventasTotales) * 100 : null)}</td>
            <td className="px-3 py-2" />
        </>
    );
}

function FilasResponsables({ data, filtro, vendidas, ventasTotales, defecto }: Base & { defecto: string }) {
    const responsables = useMemo(
        () => ordenar(resumirPor(data, (l) => l.responsable, (l) => filtro(l) && l.defecto === defecto)),
        [data, filtro, defecto],
    );
    return (
        <>
            {responsables.map(([nombre, r]) => (
                <tr key={nombre} className="bg-cream-light/70 text-[11px]">
                    <td className="relative py-2 pr-3 pl-[62px] text-stone-600 whitespace-normal min-w-[180px]">
                        <Rayitas nivel={2} />
                        {nombre}
                    </td>
                    <Celdas r={r} vendidas={vendidas} ventasTotales={ventasTotales} />
                </tr>
            ))}
        </>
    );
}

/** Defectos de un grupo o planta; cada defecto despliega sus responsables. */
export function RamasDefectos({ data, filtro, vendidas, ventasTotales }: Base) {
    const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
    const defectos = useMemo(() => ordenar(resumirPor(data, (l) => l.defecto, filtro)), [data, filtro]);
    const alternar = (nombre: string) => setAbiertos((actual) => {
        const siguiente = new Set(actual);
        if (siguiente.has(nombre)) siguiente.delete(nombre);
        else siguiente.add(nombre);
        return siguiente;
    });

    if (defectos.length === 0) {
        return <tr className="bg-cream-light/40"><td colSpan={8} className="py-2 pl-10 text-[11px] text-stone-400">Sin defectos para los filtros actuales.</td></tr>;
    }
    return (
        <>
            {defectos.map(([nombre, r]) => (
                <React.Fragment key={nombre}>
                    <tr className="bg-cream-light/40 text-[11px]">
                        <td className="relative py-2 pr-3 pl-9 font-medium text-stone-700 whitespace-normal min-w-[180px]">
                            <Rayitas nivel={1} />
                            <div className="flex items-center">
                                <FlechaRama abierto={abiertos.has(nombre)} onClick={() => alternar(nombre)} nombre={nombre} />
                                <span>{nombre}</span>
                            </div>
                        </td>
                        <Celdas r={r} vendidas={vendidas} ventasTotales={ventasTotales} />
                    </tr>
                    {abiertos.has(nombre) && <FilasResponsables data={data} filtro={filtro} vendidas={vendidas} ventasTotales={ventasTotales} defecto={nombre} />}
                </React.Fragment>
            ))}
        </>
    );
}
