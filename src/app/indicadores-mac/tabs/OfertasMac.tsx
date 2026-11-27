'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircleIcon, Loader2Icon, MailIcon, RefreshCwIcon } from 'lucide-react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchConSesion } from '@/lib/fetchConSesion';
import { supabase } from '@/lib/supabase';
import { iniciarSesionMicrosoft, leerEnviados, microsoftConfigurado, tokenVigente } from '@/lib/microsoftGraph';
import {
    aClave, porUsuario, resumenOfertas, serieOfertas, tiemposDesdeCorreo, vigentes,
    type Agrupacion, type OfertaIndicador,
} from '../utils/ofertasMetricas';
import { filasDeCorreos, type FilaOfertaCorreo } from '../utils/ofertasCorreos';

const BUZON = 'cotizaciones@firplak.com';

/** Respuestas guardadas de cotizaciones@ para estas ofertas (en lotes para no pasar el límite de la URL). */
async function leerCorreosGuardados(numeros: number[]): Promise<FilaOfertaCorreo[]> {
    const filas: FilaOfertaCorreo[] = [];
    for (let i = 0; i < numeros.length; i += 300) {
        const { data, error } = await supabase
            .from('ofertas_correos')
            .select('message_id,numero_oferta,fecha_respuesta,fecha_correo_asesor,asesor,asunto')
            .in('numero_oferta', numeros.slice(i, i + 300));
        if (error) throw error;
        filas.push(...((data || []) as FilaOfertaCorreo[]));
    }
    return filas;
}

const formatoHoras = (h: number | null) => {
    if (h === null) return '—';
    if (h < 1) return `${Math.round(h * 60)} min`;
    if (h < 48) return `${h.toFixed(1)} h`;
    return `${(h / 24).toFixed(1)} días`;
};

const tarjeta = 'bg-white rounded-xl border border-border';
const th = 'px-3 py-2 text-[10px] font-bold text-stone-500 uppercase tracking-wider';
const TODOS = 'todos';

const dinero = (v: number) => `$${Math.round(v).toLocaleString('es-CO')}`;
const dineroCorto = (v: number) => {
    const a = Math.abs(v);
    if (a >= 1e9) return `$${(v / 1e9).toFixed(1)}MM`;
    if (a >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (a >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
    return `$${Math.round(v)}`;
};
const uno = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 1 });

function Indicador({ titulo, valor, nota, tono }: { titulo: string; valor: string; nota?: string; tono?: 'alerta' }) {
    return (
        <div className={`${tarjeta} p-4 min-w-0`}>
            <p className="text-xs text-stone-500">{titulo}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums truncate ${tono === 'alerta' ? 'text-[var(--c-alerta)]' : 'text-brand-dark'}`}>{valor}</p>
            {nota && <p className="mt-0.5 text-[11px] text-stone-500">{nota}</p>}
        </div>
    );
}

/** Hoja Ofertas: ingreso de ofertas de venta en SAP (cuántas, por cuánto y cuántas quedan confirmadas o pendientes). */
export default function OfertasMac() {
    const hoy = new Date();
    const [desde, setDesde] = useState(aClave(new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1)));
    const [hasta, setHasta] = useState(aClave(hoy));
    const [usuario, setUsuario] = useState(TODOS);
    const [agrupacion, setAgrupacion] = useState<Agrupacion>('semana');
    const [ofertas, setOfertas] = useState<OfertaIndicador[] | null>(null);
    const [usuarios, setUsuarios] = useState<Record<number, string>>({});
    const [campoEstado, setCampoEstado] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);
    const [recarga, setRecarga] = useState(0);

    useEffect(() => {
        if (!desde || !hasta || desde > hasta) return;
        let vivo = true;
        setCargando(true);
        setError(null);
        fetchConSesion(`/api/sap/ofertas-indicadores?desde=${desde}&hasta=${hasta}`)
            .then(async (r) => {
                const j = await r.json();
                if (!r.ok || !j.success) throw new Error(j.error || `Error ${r.status}`);
                if (!vivo) return;
                setOfertas(j.ofertas as OfertaIndicador[]);
                setUsuarios(j.usuarios || {});
                setCampoEstado(j.campoEstado ?? null);
            })
            .catch((e: Error) => vivo && setError(e.message))
            .finally(() => vivo && setCargando(false));
        return () => { vivo = false; };
    }, [desde, hasta, recarga]);

    // ── Correos de cotizaciones@ ──────────────────────────────────────────────
    const [correos, setCorreos] = useState<FilaOfertaCorreo[]>([]);
    const [errorCorreos, setErrorCorreos] = useState<string | null>(null);
    const [sincronizando, setSincronizando] = useState<string | null>(null);
    const [avisoSync, setAvisoSync] = useState<string | null>(null);
    const [recargaCorreos, setRecargaCorreos] = useState(0);

    useEffect(() => {
        if (!ofertas || ofertas.length === 0) {
            setCorreos([]);
            return;
        }
        let vivo = true;
        leerCorreosGuardados([...new Set(ofertas.map((o) => o.docNum))])
            .then((f) => {
                if (!vivo) return;
                setCorreos(f);
                setErrorCorreos(null);
            })
            .catch((e: { message?: string }) => vivo && setErrorCorreos(e.message || 'No se pudieron leer los correos guardados'));
        return () => { vivo = false; };
    }, [ofertas, recargaCorreos]);

    const sincronizarCorreos = async () => {
        setErrorCorreos(null);
        setAvisoSync(null);
        try {
            setSincronizando('Iniciando sesión en Microsoft…');
            const token = tokenVigente() || (await iniciarSesionMicrosoft(BUZON));
            if (token.cuenta && token.cuenta !== BUZON) {
                throw new Error(`Iniciaste sesión con ${token.cuenta}. Cierra la ventana y entra con ${BUZON}.`);
            }
            setSincronizando('Leyendo correos enviados…');
            const enviados = await leerEnviados(token.accessToken, `${desde}T05:00:00Z`, (n) => setSincronizando(`Leyendo correos enviados… ${n}`));
            const filas = filasDeCorreos(enviados);
            setSincronizando(`Guardando ${filas.length} respuestas…`);
            for (let i = 0; i < filas.length; i += 500) {
                const { error: e } = await supabase.from('ofertas_correos').upsert(filas.slice(i, i + 500), { onConflict: 'message_id,numero_oferta' });
                if (e) throw e;
            }
            setAvisoSync(`Listo: ${enviados.length} correos revisados, ${filas.length} respuestas con número de oferta.`);
            setRecargaCorreos((n) => n + 1);
        } catch (e) {
            setErrorCorreos((e as { message?: string }).message || 'No se pudo sincronizar');
        } finally {
            setSincronizando(null);
        }
    };

    const opcionesUsuario = useMemo(() => {
        const conteo = new Map<number, number>();
        for (const o of vigentes(ofertas || [])) if (o.usuario !== null) conteo.set(o.usuario, (conteo.get(o.usuario) || 0) + 1);
        return [...conteo.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id: String(id), nombre: usuarios[id] || `Usuario ${id}`, n }));
    }, [ofertas, usuarios]);

    const seleccion = useMemo(
        () => (ofertas || []).filter((o) => usuario === TODOS || String(o.usuario) === usuario),
        [ofertas, usuario],
    );
    const resumen = useMemo(() => resumenOfertas(seleccion, desde, hasta), [seleccion, desde, hasta]);
    const serie = useMemo(() => serieOfertas(seleccion, agrupacion, desde, hasta), [seleccion, agrupacion, desde, hasta]);
    const tablaUsuarios = useMemo(() => porUsuario(ofertas || [], usuarios, desde, hasta), [ofertas, usuarios, desde, hasta]);
    const pendientes = useMemo(
        () => vigentes(seleccion).filter((o) => o.estado === 'Pendiente').sort((a, b) => a.creacion.localeCompare(b.creacion)).slice(0, 15),
        [seleccion],
    );

    const tiempos = useMemo(() => tiemposDesdeCorreo(seleccion, correos), [seleccion, correos]);

    const pct = (n: number) => (resumen.total ? `${Math.round((n / resumen.total) * 100)}%` : '—');

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Controles */}
            <div className={`${tarjeta} p-4 flex flex-wrap items-end gap-4`}>
                <label className="text-xs text-stone-500 flex flex-col gap-1">
                    Desde
                    <input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} className="h-9 px-2 rounded-lg border border-border text-sm text-brand-dark bg-white" />
                </label>
                <label className="text-xs text-stone-500 flex flex-col gap-1">
                    Hasta
                    <input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} className="h-9 px-2 rounded-lg border border-border text-sm text-brand-dark bg-white" />
                </label>
                <label className="text-xs text-stone-500 flex flex-col gap-1 min-w-[220px]">
                    Usuario SAP que ingresó
                    <select value={usuario} onChange={(e) => setUsuario(e.target.value)} className="h-9 px-2 rounded-lg border border-border text-sm text-brand-dark bg-white">
                        <option value={TODOS}>Todos</option>
                        {opcionesUsuario.map((u) => <option key={u.id} value={u.id}>{u.nombre} ({u.n})</option>)}
                    </select>
                </label>
                <button
                    type="button"
                    onClick={() => setRecarga((n) => n + 1)}
                    disabled={cargando}
                    className="h-9 px-3 rounded-lg border border-border text-sm text-brand-dark hover:bg-cream-light inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                    {cargando ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <RefreshCwIcon className="w-4 h-4" />}
                    Actualizar desde SAP
                </button>
                <p className="text-[11px] text-stone-400 ml-auto max-w-md">
                    Ofertas de venta de SAP por fecha de creación. Valores antes de IVA; las canceladas no cuentan.
                </p>
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircleIcon className="w-4 h-4 flex-shrink-0" /> No se pudieron leer las ofertas de SAP: {error}
                </div>
            )}

            {ofertas === null && !error ? (
                <div className="flex items-center justify-center gap-2 py-20 text-sm text-stone-500">
                    <Loader2Icon className="w-5 h-5 animate-spin" /> Leyendo ofertas de venta de SAP…
                </div>
            ) : ofertas !== null && (
                <>
                    {campoEstado === null && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                            No se encontró el campo de estado de la oferta en SAP; confirmadas y pendientes no se pueden separar.
                        </div>
                    )}

                    {/* KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
                        <Indicador titulo="Ofertas ingresadas" valor={resumen.total.toLocaleString('es-CO')} nota={resumen.canceladas ? `${resumen.canceladas} canceladas aparte` : 'En el periodo'} />
                        <Indicador titulo="Promedio por día" valor={uno(resumen.porDiaHabil)} nota="Por día hábil" />
                        <Indicador titulo="Promedio semanal" valor={uno(resumen.porSemana)} nota={dineroCorto(resumen.valorPorSemana) + ' / semana'} />
                        <Indicador titulo="Promedio mensual" valor={uno(resumen.porMes)} nota={dineroCorto(resumen.valorPorMes) + ' / mes'} />
                        <Indicador titulo="Valor antes de IVA" valor={dineroCorto(resumen.valor)} nota={`Ticket prom. ${dineroCorto(resumen.ticket)}`} />
                        <Indicador titulo="Confirmadas" valor={resumen.confirmadas.toLocaleString('es-CO')} nota={pct(resumen.confirmadas)} />
                        <Indicador titulo="Pendientes" valor={resumen.pendientes.toLocaleString('es-CO')} nota={`${pct(resumen.pendientes)} · ${dineroCorto(resumen.valorPendiente)}`} tono={resumen.pendientes ? 'alerta' : undefined} />
                        <Indicador titulo="Días a confirmar" valor={resumen.diasConfirmar === null ? '—' : uno(resumen.diasConfirmar)} nota="Aprox. (última modificación)" />
                    </div>

                    {/* Tiempos desde el correo del asesor */}
                    <div className={`${tarjeta} p-4`}>
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                            <div>
                                <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider">Desde el correo del asesor</h3>
                                <p className="text-[11px] text-stone-400">
                                    Respuestas &quot;Oferta de venta n° ####&quot; enviadas desde {BUZON}, cruzadas con la oferta en SAP.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={sincronizarCorreos}
                                disabled={sincronizando !== null || !microsoftConfigurado()}
                                title={microsoftConfigurado() ? `Lee los Enviados de ${BUZON} desde ${desde.split('-').reverse().join('/')}` : 'Falta registrar la app en Microsoft (NEXT_PUBLIC_MS_CLIENT_ID)'}
                                className="h-9 px-3 rounded-lg bg-[var(--c-navy)] text-white text-sm inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                            >
                                {sincronizando ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <MailIcon className="w-4 h-4" />}
                                {sincronizando || 'Sincronizar correos'}
                            </button>
                        </div>
                        {!microsoftConfigurado() && (
                            <p className="mb-3 text-xs text-amber-800">Falta conectar la app con Microsoft para poder leer el buzón.</p>
                        )}
                        {errorCorreos && <p className="mb-3 text-xs text-red-700">{errorCorreos}</p>}
                        {avisoSync && <p className="mb-3 text-xs text-[var(--c-oliva-texto)]">{avisoSync}</p>}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Indicador titulo="Respuesta al asesor" valor={formatoHoras(tiempos.horasRespuesta)} nota={`Promedio · ${tiempos.medidas} medidas`} />
                            <Indicador titulo="Correo → creada en SAP" valor={tiempos.diasSap === null ? '—' : `${uno(tiempos.diasSap)} días`} nota="Días hábiles promedio" />
                            <Indicador titulo="Ofertas con correo" valor={tiempos.conCorreo.toLocaleString('es-CO')} nota={pct(tiempos.conCorreo)} />
                            <Indicador titulo="Ofertas sin correo" valor={tiempos.sinCorreo.toLocaleString('es-CO')} nota="No se encontró la respuesta" />
                        </div>
                    </div>

                    {/* Tendencia */}
                    <div className={`${tarjeta} p-6`}>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider">Ofertas ingresadas y valor</h3>
                            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                                {(['dia', 'semana', 'mes'] as Agrupacion[]).map((g) => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => setAgrupacion(g)}
                                        className={`px-3 py-1.5 cursor-pointer ${agrupacion === g ? 'bg-[var(--c-navy)] text-white' : 'text-stone-600 hover:bg-cream-light'}`}
                                    >
                                        {g === 'dia' ? 'Día' : g === 'semana' ? 'Semana' : 'Mes'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={serie} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--c-linea)" />
                                    <XAxis dataKey="etiqueta" tick={{ fontSize: 11, fill: 'var(--c-apagado)' }} axisLine={false} tickLine={false} minTickGap={8} />
                                    <YAxis yAxisId="n" allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--c-apagado)' }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="v" orientation="right" tickFormatter={dineroCorto} tick={{ fontSize: 11, fill: 'var(--c-apagado)' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 12, border: '1px solid #e8e2d5', fontSize: 12 }}
                                        formatter={(v: any, name: any) => (name === 'Valor antes de IVA' ? dinero(Number(v)) : v)}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Bar isAnimationActive={false} yAxisId="n" dataKey="Confirmadas" stackId="e" fill="var(--serie-oliva)" maxBarSize={40} />
                                    <Bar isAnimationActive={false} yAxisId="n" dataKey="Pendientes" stackId="e" fill="var(--serie-arena)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                    <Line isAnimationActive={false} yAxisId="v" type="monotone" dataKey="Valor" name="Valor antes de IVA" stroke="var(--serie-navy)" strokeWidth={2} dot={{ r: 2 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* Por usuario */}
                        <div className={`${tarjeta} p-6`}>
                            <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider mb-4">Por usuario SAP</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-cream-light">
                                            <th className={th}>Usuario</th>
                                            <th className={`${th} text-right`}>Ofertas</th>
                                            <th className={`${th} text-right`}>Por día</th>
                                            <th className={`${th} text-right`}>Valor antes de IVA</th>
                                            <th className={`${th} text-right`}>Confirmadas</th>
                                            <th className={`${th} text-right`}>Pendientes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tablaUsuarios.map((u) => (
                                            <tr key={u.nombre} className="border-b border-border">
                                                <td className="px-3 py-2 text-xs font-bold text-brand-dark">{u.nombre}</td>
                                                <td className="px-3 py-2 text-xs text-right tabular-nums">{u.ofertas}</td>
                                                <td className="px-3 py-2 text-xs text-right tabular-nums">{uno(u.porDia)}</td>
                                                <td className="px-3 py-2 text-xs text-right tabular-nums">{dinero(u.valor)}</td>
                                                <td className="px-3 py-2 text-xs text-right tabular-nums text-[var(--c-oliva-texto)] font-bold">{u.confirmadas}</td>
                                                <td className="px-3 py-2 text-xs text-right tabular-nums text-[var(--c-alerta)] font-bold">{u.pendientes}</td>
                                            </tr>
                                        ))}
                                        {tablaUsuarios.length === 0 && (
                                            <tr><td colSpan={6} className="px-3 py-6 text-center text-xs text-stone-400">Sin ofertas en el periodo</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pendientes más antiguas */}
                        <div className={`${tarjeta} p-6`}>
                            <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider mb-4">Pendientes más antiguas</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-cream-light">
                                            <th className={th}>Oferta</th>
                                            <th className={th}>Creada</th>
                                            <th className={th}>Cliente</th>
                                            <th className={`${th} text-right`}>Antes de IVA</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendientes.map((o) => (
                                            <tr key={o.docEntry} className="border-b border-border">
                                                <td className="px-3 py-2 text-xs font-bold text-brand-dark tabular-nums">{o.docNum}</td>
                                                <td className="px-3 py-2 text-xs tabular-nums text-stone-600">{o.creacion.split('-').reverse().join('/')}</td>
                                                <td className="px-3 py-2 text-xs text-stone-700 truncate max-w-[220px]" title={o.cliente}>{o.cliente}</td>
                                                <td className="px-3 py-2 text-xs text-right tabular-nums">{dinero(o.totalAntesIva)}</td>
                                            </tr>
                                        ))}
                                        {pendientes.length === 0 && (
                                            <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-stone-400">No hay ofertas pendientes</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
