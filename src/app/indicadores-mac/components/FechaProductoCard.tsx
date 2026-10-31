'use client';

import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RegistroMAC } from '../types';

// Solicitudes según la fecha de compra o de fabricación del producto, en dos lecturas fáciles:
//   · Por antigüedad: cuánto tiempo tenía el producto cuando llegó la solicitud (útil para garantías).
//   · Por mes: últimos 12 meses; los anteriores se agrupan en una sola barra.
// "Sin fecha" se muestra como dato aparte para no aplastar la gráfica.

type Campo = 'fecha_compra' | 'fecha_fabricacion';
type Vista = 'antiguedad' | 'mes';
type Medida = 'casos' | 'unidades';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_EN_GRAFICA = 12;

const TRAMOS: Array<{ label: string; hasta: number }> = [
    { label: '0 a 3 meses', hasta: 3 },
    { label: '3 a 6 meses', hasta: 6 },
    { label: '6 a 12 meses', hasta: 12 },
    { label: '1 a 2 años', hasta: 24 },
    { label: 'Más de 2 años', hasta: Infinity },
];

/** Misma interpretación de fechas que se usaba antes (YYYY-MM-DD, DD/MM/YYYY, YYYY/MM/DD u otras). */
function parseFecha(raw: unknown): Date | null {
    if (!raw || typeof raw !== 'string' || !raw.trim()) return null;
    const s = raw.trim();
    let d: Date | null = null;
    if (s.includes('-')) {
        const [y, m, dd] = s.split('T')[0].split('-').map((p) => parseInt(p, 10));
        if (!isNaN(y) && !isNaN(m)) d = new Date(y, m - 1, dd || 1);
    } else if (s.includes('/')) {
        const parts = s.split('/');
        if (parts.length === 3) {
            d = parts[0].length === 4
                ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
                : new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
    }
    if (!d || isNaN(d.getTime())) d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

function fechaDelRegistro(d: RegistroMAC, campo: Campo): Date | null {
    const directa = parseFecha((d as any)[campo]);
    if (directa) return directa;
    const enCompra = Array.isArray(d.productos_compra) ? d.productos_compra.find((p: any) => p?.[campo]) : null;
    if (enCompra) return parseFecha(enCompra[campo]);
    const enNovedad = Array.isArray(d.productos_novedad) ? d.productos_novedad.find((p: any) => p?.[campo]) : null;
    return enNovedad ? parseFecha(enNovedad[campo]) : null;
}

const mesesEntre = (desde: Date, hasta: Date) =>
    (hasta.getFullYear() - desde.getFullYear()) * 12 + (hasta.getMonth() - desde.getMonth()) + (hasta.getDate() - desde.getDate()) / 31;

const fmtMeses = (m: number | null) => {
    if (m === null) return '—';
    if (m < 12) return `${Math.max(0, Math.round(m))} ${Math.round(m) === 1 ? 'mes' : 'meses'}`;
    const anios = m / 12;
    return `${anios.toFixed(1).replace('.0', '')} años`;
};

export default function FechaProductoCard({ titulo, campo, color, data }: {
    titulo: string;
    campo: Campo;
    color: string;
    data: RegistroMAC[];
}) {
    const [vista, setVista] = useState<Vista>('antiguedad');
    const [medida, setMedida] = useState<Medida>('casos');

    const calc = useMemo(() => {
        const filas: Array<{ fecha: Date; edadMeses: number | null; unidades: number }> = [];
        let sinFecha = 0;
        let sinFechaUnidades = 0;
        for (const d of data) {
            const unidades = Array.isArray(d.productos_novedad)
                ? d.productos_novedad.reduce((acc: number, p: any) => acc + (p?.cantidad || 1), 0)
                : 0;
            const fecha = fechaDelRegistro(d, campo);
            if (!fecha) {
                sinFecha++;
                sinFechaUnidades += unidades;
                continue;
            }
            const creado = new Date(d.created_at);
            const edad = isNaN(creado.getTime()) ? null : mesesEntre(fecha, creado);
            filas.push({ fecha, edadMeses: edad !== null && edad >= -1 ? Math.max(0, edad) : null, unidades });
        }

        // Por antigüedad
        const tramos = TRAMOS.map((t) => ({ nombre: t.label, casos: 0, unidades: 0 }));
        const edades: number[] = [];
        for (const f of filas) {
            if (f.edadMeses === null) continue;
            edades.push(f.edadMeses);
            const i = TRAMOS.findIndex((t) => f.edadMeses! < t.hasta);
            tramos[i].casos++;
            tramos[i].unidades += f.unidades;
        }
        const conEdad = edades.length || 1;
        const sorted = [...edades].sort((a, b) => a - b);
        const mediana = sorted.length ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2) : null;
        const menos6 = edades.filter((e) => e < 6).length / conEdad;

        // Por mes: últimos 12 meses con datos (hasta el mes más reciente), anteriores agrupados
        // Las fechas posteriores al mes actual son errores de digitación: se cuentan aparte, no mueven la gráfica.
        const claveMes = (dt: Date) => dt.getFullYear() * 12 + dt.getMonth();
        const mesActual = claveMes(new Date());
        const futuras = filas.filter((f) => claveMes(f.fecha) > mesActual).length;
        const validas = filas.filter((f) => claveMes(f.fecha) <= mesActual);
        const ultimo = validas.length ? Math.max(...validas.map((f) => claveMes(f.fecha))) : mesActual;
        const primeroVisible = ultimo - (MESES_EN_GRAFICA - 1);
        const anteriores = { nombre: 'Anteriores', casos: 0, unidades: 0, anterior: true };
        const porMes = Array.from({ length: MESES_EN_GRAFICA }, (_, i) => {
            const k = primeroVisible + i;
            return { nombre: `${MESES[k % 12]} ${String(Math.floor(k / 12)).slice(2)}`, casos: 0, unidades: 0, anterior: false };
        });
        for (const f of validas) {
            const k = claveMes(f.fecha);
            const destino = k < primeroVisible ? anteriores : porMes[k - primeroVisible];
            if (!destino) continue;
            destino.casos++;
            destino.unidades += f.unidades;
        }
        const mesesData = anteriores.casos > 0 ? [anteriores, ...porMes] : porMes;
        const pico = porMes.reduce((max, m) => (m.casos > max.casos ? m : max), porMes[0]);

        return { tramos, mesesData, sinFecha, sinFechaUnidades, total: data.length, conFecha: filas.length, mediana, menos6, pico, futuras };
    }, [data, campo]);

    const datos = vista === 'antiguedad' ? calc.tramos : calc.mesesData;
    const pctSinFecha = calc.total ? Math.round((calc.sinFecha / calc.total) * 100) : 0;

    const segmentBtn = (activo: boolean) =>
        `h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${activo ? 'bg-white text-brand shadow-[0_1px_3px_rgba(37,65,83,0.15)]' : 'text-stone-500 hover:text-brand-dark'}`;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                    <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider">{titulo}</h3>
                    <p className="text-[11px] text-stone-400 font-medium mt-0.5">
                        {vista === 'antiguedad'
                            ? `Tiempo entre la ${campo === 'fecha_compra' ? 'compra' : 'fabricación'} y la solicitud`
                            : `Últimos ${MESES_EN_GRAFICA} meses de ${campo === 'fecha_compra' ? 'compra' : 'fabricación'}`}
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
                <div className="rounded-xl bg-cream-light px-3 py-2" title={`${calc.sinFechaUnidades} unidades sin fecha registrada`}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Sin fecha</p>
                    <p className="text-base font-bold text-stone-500 tabular-nums">{calc.sinFecha} <span className="text-[11px] font-medium">({pctSinFecha}%)</span></p>
                </div>
            </div>

            {calc.conFecha === 0 ? (
                <p className="text-sm text-stone-400 text-center py-16">Ningún caso tiene esta fecha registrada.</p>
            ) : vista === 'antiguedad' ? (
                <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8e2d5" />
                            <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8a8780' }} />
                            <YAxis type="category" dataKey="nombre" width={112} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#1d1d1b', fontWeight: 600 }} />
                            <Tooltip
                                cursor={{ fill: '#faf8f4' }}
                                contentStyle={{ borderRadius: 12, border: '1px solid #e8e2d5', fontSize: 12 }}
                                formatter={(v: any) => [v, medida === 'casos' ? 'Casos' : 'Unidades']}
                            />
                            <Bar isAnimationActive={false} dataKey={medida} fill={color} radius={[0, 6, 6, 0]} maxBarSize={30}>
                                <LabelList dataKey={medida} position="right" style={{ fill: '#1d1d1b', fontSize: 12, fontWeight: 700 }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={datos} margin={{ top: 22, right: 8, left: -18, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e2d5" />
                            <XAxis dataKey="nombre" interval={0} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8780' }} />
                            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8a8780' }} />
                            <Tooltip
                                cursor={{ fill: '#faf8f4' }}
                                contentStyle={{ borderRadius: 12, border: '1px solid #e8e2d5', fontSize: 12 }}
                                formatter={(v: any) => [v, medida === 'casos' ? 'Casos' : 'Unidades']}
                            />
                            <Bar isAnimationActive={false} dataKey={medida} radius={[6, 6, 0, 0]} maxBarSize={34}>
                                {datos.map((d: any) => (
                                    <Cell key={d.nombre} fill={d.anterior ? '#b3bec4' : color} />
                                ))}
                                <LabelList dataKey={medida} position="top" style={{ fill: '#1d1d1b', fontSize: 11, fontWeight: 700 }} formatter={(v: any) => (v ? v : '')} />
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
                    <span className="text-[#b86835]"> {calc.futuras} {calc.futuras === 1 ? 'caso tiene' : 'casos tienen'} una fecha posterior a hoy (revisar digitación).</span>
                )}
            </p>
        </div>
    );
}
