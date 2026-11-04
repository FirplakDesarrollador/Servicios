'use client';

import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FilterState, RegistroMAC } from '../types';
import {
    MESES_CORTOS, TRAMOS_ANTIGUEDAD, VALOR_SIN_FECHA, clasificarFecha, claveMesNum,
    valorAnteriores, valorMes, valorTramo, type CampoFecha,
} from '../utils/fechaProducto';

// Solicitudes según la fecha de compra o de fabricación del producto, en dos lecturas fáciles:
//   · Por antigüedad: cuánto tiempo tenía el producto cuando llegó la solicitud (útil para garantías).
//   · Por mes: últimos 12 meses; los anteriores se agrupan en una sola barra.
// "Sin fecha" se muestra como dato aparte para no aplastar la gráfica.
// Clic en una barra o en "Sin fecha" = filtro cruzado (Ctrl/Cmd + clic para sumar varios).

type Vista = 'antiguedad' | 'mes';
type Medida = 'casos' | 'unidades';
const MESES_EN_GRAFICA = 12;

const fmtMeses = (m: number | null) => {
    if (m === null) return '—';
    if (m < 12) return `${Math.max(0, Math.round(m))} ${Math.round(m) === 1 ? 'mes' : 'meses'}`;
    return `${(m / 12).toFixed(1).replace('.0', '')} años`;
};

export default function FechaProductoCard({ titulo, campo, color, data, filterKey, activeValues, onFilterToggle }: {
    titulo: string;
    campo: CampoFecha;
    color: string;
    /** Datos con todos los filtros excepto el propio (para que el filtro cruzado resalte en vez de vaciar) */
    data: RegistroMAC[];
    filterKey: keyof FilterState;
    activeValues: string[];
    onFilterToggle: (key: keyof FilterState, value: string, e?: any) => void;
}) {
    const [vista, setVista] = useState<Vista>('antiguedad');
    const [medida, setMedida] = useState<Medida>('casos');

    const calc = useMemo(() => {
        const mesActual = claveMesNum(new Date());
        const filas: Array<{ mesNum: number; tramo: string | null; edad: number | null; unidades: number }> = [];
        let sinFecha = 0;
        for (const d of data) {
            const unidades = Array.isArray(d.productos_novedad)
                ? d.productos_novedad.reduce((acc: number, p: any) => acc + (p?.cantidad || 1), 0)
                : 0;
            const c = clasificarFecha(d, campo);
            if (c.mesNum === null) {
                sinFecha++;
                continue;
            }
            filas.push({ mesNum: c.mesNum, tramo: c.tramo, edad: c.edadMeses, unidades });
        }

        // Por antigüedad
        const tramos = TRAMOS_ANTIGUEDAD.map((t) => ({ nombre: t.label, valor: valorTramo(t.label), casos: 0, unidades: 0, gris: false }));
        const edades: number[] = [];
        for (const f of filas) {
            if (f.tramo === null || f.edad === null) continue;
            edades.push(f.edad);
            const t = tramos.find((x) => x.nombre === f.tramo)!;
            t.casos++;
            t.unidades += f.unidades;
        }
        const sorted = [...edades].sort((a, b) => a - b);
        const mediana = sorted.length ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2) : null;
        const menos6 = edades.length ? edades.filter((e) => e < 6).length / edades.length : 0;

        // Por mes: ventana de 12 meses que termina en el mes más reciente válido (nunca después de hoy).
        // Fechas posteriores al mes actual son errores de digitación: se cuentan aparte.
        const futuras = filas.filter((f) => f.mesNum > mesActual).length;
        const validas = filas.filter((f) => f.mesNum <= mesActual);
        const ultimo = validas.length ? Math.max(...validas.map((f) => f.mesNum)) : mesActual;
        const primeroVisible = ultimo - (MESES_EN_GRAFICA - 1);
        const anteriores = { nombre: 'Anteriores', valor: valorAnteriores(primeroVisible), casos: 0, unidades: 0, gris: true };
        const porMes = Array.from({ length: MESES_EN_GRAFICA }, (_, i) => {
            const k = primeroVisible + i;
            return { nombre: `${MESES_CORTOS[k % 12]} ${String(Math.floor(k / 12)).slice(2)}`, valor: valorMes(k), casos: 0, unidades: 0, gris: false };
        });
        for (const f of validas) {
            const destino = f.mesNum < primeroVisible ? anteriores : porMes[f.mesNum - primeroVisible];
            destino.casos++;
            destino.unidades += f.unidades;
        }
        const mesesData = anteriores.casos > 0 ? [anteriores, ...porMes] : porMes;
        const pico = porMes.reduce((max, m) => (m.casos > max.casos ? m : max), porMes[0]);

        return { tramos, mesesData, sinFecha, total: data.length, conFecha: filas.length, mediana, menos6, pico, futuras };
    }, [data, campo]);

    const datos = vista === 'antiguedad' ? calc.tramos : calc.mesesData;
    const hayFiltro = activeValues.length > 0;
    const pctSinFecha = calc.total ? Math.round((calc.sinFecha / calc.total) * 100) : 0;
    const sinFechaActivo = activeValues.includes(VALOR_SIN_FECHA);

    const colorBarra = (d: { valor: string; gris: boolean }) => {
        const base = d.gris ? 'var(--serie-arena)' : color;
        return base;
    };
    const opacidad = (d: { valor: string }) => (!hayFiltro || activeValues.includes(d.valor) ? 1 : 0.3);
    const alClic = (barData: any, _i: number, e: any) => {
        const valor = barData?.payload?.valor ?? barData?.valor;
        if (valor) onFilterToggle(filterKey, valor, e);
    };

    const segmentBtn = (activo: boolean) =>
        `h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${activo ? 'bg-white text-brand shadow-[0_1px_3px_rgba(37,65,83,0.15)]' : 'text-stone-500 hover:text-brand-dark'}`;
    const etiquetaMedida = medida === 'casos' ? 'Casos' : 'Unidades';

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                    <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider">{titulo}</h3>
                    <p className="text-[11px] text-stone-400 font-medium mt-0.5">
                        {vista === 'antiguedad'
                            ? `Tiempo entre la ${campo === 'fecha_compra' ? 'compra' : 'fabricación'} y la solicitud`
                            : `Últimos ${MESES_EN_GRAFICA} meses de ${campo === 'fecha_compra' ? 'compra' : 'fabricación'}`}
                        {' · clic para filtrar'}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <div className="flex p-0.5 rounded-lg bg-cream-light border border-border">
                        <button className={segmentBtn(vista === 'antiguedad')} onClick={() => setVista('antiguedad')}>Antigüedad</button>
                        <button className={segmentBtn(vista === 'mes')} onClick={() => setVista('mes')}>Por mes</button>
                    </div>
                    <div className="flex p-0.5 rounded-lg bg-cream-light border border-border">
                        <button className={segmentBtn(medida === 'casos')} onClick={() => setMedida('casos')}>Casos</button>
                        <button className={segmentBtn(medida === 'unidades')} onClick={() => setMedida('unidades')}>Unidades</button>
                    </div>
                </div>
            </div>

            {/* Datos clave */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="rounded-xl bg-cream-light px-3 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Antigüedad mediana</p>
                    <p className="text-base font-bold text-brand-dark tabular-nums">{fmtMeses(calc.mediana)}</p>
                </div>
                <div className="rounded-xl bg-cream-light px-3 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Menos de 6 meses</p>
                    <p className="text-base font-bold text-brand-dark tabular-nums">{calc.conFecha ? `${Math.round(calc.menos6 * 100)}%` : '—'}</p>
                </div>
                <button
                    onClick={(e) => onFilterToggle(filterKey, VALOR_SIN_FECHA, e)}
                    title="Clic para ver los casos sin fecha"
                    className={`text-left rounded-xl px-3 py-2 transition-colors cursor-pointer ${sinFechaActivo ? 'bg-sage-soft ring-2 ring-brand-light' : 'bg-cream-light hover:bg-sage-soft'} ${hayFiltro && !sinFechaActivo ? 'opacity-50' : ''}`}
                >
                    <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Sin fecha</p>
                    <p className="text-base font-bold text-stone-500 tabular-nums">{calc.sinFecha} <span className="text-[11px] font-medium">({pctSinFecha}%)</span></p>
                </button>
            </div>

            {calc.conFecha === 0 ? (
                <p className="text-sm text-stone-400 text-center py-16">Ningún caso tiene esta fecha registrada.</p>
            ) : vista === 'antiguedad' ? (
                <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--c-linea)" />
                            <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--c-apagado)' }} />
                            <YAxis type="category" dataKey="nombre" width={112} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--c-tinta)', fontWeight: 600 }} />
                            <Tooltip cursor={{ fill: '#faf8f4' }} contentStyle={{ borderRadius: 12, border: '1px solid #e8e2d5', fontSize: 12 }} formatter={(v: any) => [v, etiquetaMedida]} />
                            <Bar isAnimationActive={false} dataKey={medida} radius={[0, 6, 6, 0]} maxBarSize={30} onClick={alClic} className="cursor-pointer">
                                {datos.map((d) => <Cell key={d.valor} fill={colorBarra(d)} fillOpacity={opacidad(d)} />)}
                                <LabelList dataKey={medida} position="right" style={{ fill: 'var(--c-tinta)', fontSize: 12, fontWeight: 700 }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={datos} margin={{ top: 22, right: 8, left: -18, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--c-linea)" />
                            <XAxis dataKey="nombre" interval={0} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--c-apagado)' }} />
                            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--c-apagado)' }} />
                            <Tooltip cursor={{ fill: '#faf8f4' }} contentStyle={{ borderRadius: 12, border: '1px solid #e8e2d5', fontSize: 12 }} formatter={(v: any) => [v, etiquetaMedida]} />
                            <Bar isAnimationActive={false} dataKey={medida} radius={[6, 6, 0, 0]} maxBarSize={34} onClick={alClic} className="cursor-pointer">
                                {datos.map((d) => <Cell key={d.valor} fill={colorBarra(d)} fillOpacity={opacidad(d)} />)}
                                <LabelList dataKey={medida} position="top" style={{ fill: 'var(--c-tinta)', fontSize: 11, fontWeight: 700 }} formatter={(v: any) => (v ? v : '')} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            <p className="text-[11px] text-stone-400 mt-3">
                {vista === 'antiguedad'
                    ? `${calc.conFecha} de ${calc.total} casos tienen fecha de ${campo === 'fecha_compra' ? 'compra' : 'fabricación'}.`
                    : `Mes con más casos: ${calc.pico?.casos ? `${calc.pico.nombre} (${calc.pico.casos})` : '—'}. "Anteriores" agrupa los meses más antiguos.`}
                {calc.futuras > 0 && (
                    <span className="text-[var(--c-alerta)]"> {calc.futuras} {calc.futuras === 1 ? 'caso tiene' : 'casos tienen'} una fecha posterior a hoy (revisar digitación).</span>
                )}
            </p>
        </div>
    );
}
