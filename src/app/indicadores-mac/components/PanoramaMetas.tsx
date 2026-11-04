'use client';
import React, { useMemo, useState } from 'react';
import { ChevronRightIcon, ImageIcon, MessageSquareIcon, TargetIcon } from 'lucide-react';
import type { RegistroMAC } from '../types';
import type { LecturaRadicado } from '../utils/temasComentarios';
import {
    ETIQUETA_DIMENSION, META_CALIDAD, META_ECONOMICA, etiquetaEntidad, excesoDeMeta, explicar, fmtPorcentaje,
    type Entidad, type FilaAporte, type Foco, type TipoFoco, type VentaPanorama,
} from '../utils/panorama';

const fmtN = (v: number) => Math.round(v).toLocaleString('es-CO');
const fmtPp = (v: number | null) => (v === null ? '—' : `${v.toFixed(2).replace('.', ',')} pp`);

/** Valor frente a su meta, con color y cambio frente al periodo anterior. */
function Indicador({ titulo, valor, meta, previo }: { titulo: string; valor: number | null; meta: number; previo?: number | null }) {
    const sobre = valor !== null && valor > meta;
    const cambio = valor !== null && previo !== null && previo !== undefined ? valor - previo : null;
    return (
        <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-wider font-semibold text-stone-400 truncate">{titulo}</div>
            <div className={`text-xs font-bold tabular-nums ${valor === null ? 'text-stone-400' : sobre ? 'text-red-700' : 'text-emerald-700'}`}>{fmtPorcentaje(valor)}</div>
            {cambio !== null && Math.abs(cambio) >= 0.005 && (
                <div className={`text-[9px] tabular-nums ${cambio > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{cambio > 0 ? '▲' : '▼'} {Math.abs(cambio).toFixed(2).replace('.', ',')}</div>
            )}
        </div>
    );
}

function TablaAporte({ titulo, filas, conPropio, onFoco, tipo, ayuda }: {
    titulo: string; filas: FilaAporte[]; conPropio?: boolean; tipo?: TipoFoco; onFoco?: (f: Foco) => void; ayuda?: string;
}) {
    const [todas, setTodas] = useState(false);
    const visibles = todas ? filas : filas.slice(0, 6);
    return (
        <div className="min-w-0 rounded-xl border border-border overflow-hidden">
            <div className="px-3 py-2 bg-cream-light border-b border-border flex items-baseline justify-between gap-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-dark">{titulo}</h4>
                {ayuda && <span className="text-[10px] text-stone-400 truncate">{ayuda}</span>}
            </div>
            {filas.length === 0 ? (
                <p className="p-4 text-xs text-stone-400 text-center">Sin datos para esta selección.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="text-[9px] uppercase text-stone-400">
                                <th className="px-3 py-1.5 font-semibold" />
                                <th className="px-2 py-1.5 font-semibold text-right" title="Problemas según la regla de conteo">Probl.</th>
                                <th className="px-2 py-1.5 font-semibold text-right" title="Productos con novedad">Prod.</th>
                                {conPropio && <th className="px-2 py-1.5 font-semibold text-right" title="Sus productos con novedad sobre lo que compró">Su %</th>}
                                <th className="px-3 py-1.5 font-semibold text-right" title="Puntos porcentuales que aporta al % de producto con novedad">Aporte</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibles.map((f) => (
                                <tr
                                    key={f.nombre}
                                    onClick={tipo && onFoco ? () => onFoco({ tipo, valor: f.nombre }) : undefined}
                                    className={`border-t border-border ${tipo ? 'cursor-pointer hover:bg-cream-light' : ''}`}
                                >
                                    <td className="px-3 py-1.5 max-w-[220px]">
                                        <div className="truncate font-medium text-stone-700" title={f.nombre}>{f.nombre}</div>
                                        {f.entraEnMeta && <div className="text-[9px] font-semibold text-emerald-700">Sin esto queda en meta ({fmtPorcentaje(f.quedaria)})</div>}
                                    </td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtN(f.problemas)}</td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtN(f.unidades)}</td>
                                    {conPropio && <td className={`px-2 py-1.5 text-right tabular-nums ${(f.pctPropio ?? 0) > META_CALIDAD ? 'text-red-700 font-semibold' : 'text-stone-500'}`}>{f.pctPropio == null ? '—' : fmtPorcentaje(f.pctPropio)}</td>}
                                    <td className="px-3 py-1.5 text-right tabular-nums font-bold text-brand-dark whitespace-nowrap">{fmtPp(f.aporte)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {filas.length > 6 && (
                <button onClick={() => setTodas(!todas)} className="w-full py-1.5 text-[10px] font-semibold text-brand hover:bg-cream-light border-t border-border cursor-pointer">
                    {todas ? 'Ver menos' : `Ver los ${filas.length}`}
                </button>
            )}
        </div>
    );
}

const ETIQUETA_FOCO: Record<TipoFoco, string> = { defecto: 'Defecto', cliente: 'Cliente', responsable: 'Responsable', compra: 'Compra' };

/** Cómo estamos frente a cada meta y qué explica el número, bajando hasta defecto, cliente y pieza. */
export default function PanoramaMetas({ entidades, data, ventas, lecturas }: {
    entidades: Entidad[];
    data: RegistroMAC[];
    ventas: VentaPanorama[];
    lecturas: Map<number, LecturaRadicado>;
}) {
    const [seleccion, setSeleccion] = useState('empresa:Empresa');
    const [foco, setFoco] = useState<Foco[]>([]);

    const entidad = entidades.find((e) => e.id === seleccion) || entidades[0];
    const explicacion = useMemo(
        () => (entidad ? explicar(entidad, foco, data, ventas, lecturas) : null),
        [entidad, foco, data, ventas, lecturas],
    );
    const elegir = (id: string) => { setSeleccion(id); setFoco([]); };
    const sumarFoco = (f: Foco) => setFoco((actual) => (actual.some((x) => x.tipo === f.tipo) ? actual.map((x) => (x.tipo === f.tipo ? f : x)) : [...actual, f]));

    const dimensiones = ['empresa', 'planta', 'grupo', 'canal', 'mercado'] as const;
    if (!entidad || !explicacion) return null;

    return (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-cream-light">
                <h3 className="text-sm font-bold text-[#254153] uppercase flex items-center gap-2"><TargetIcon className="w-4 h-4" /> ¿Por qué estamos así?</h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                    Metas: producto con novedad y casos ≤ {META_CALIDAD.toFixed(2).replace('.', ',')} %, inversión ≤ {META_ECONOMICA.toFixed(2).replace('.', ',')} %. Elige una fila y baja por defecto, cliente o responsable.
                </p>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)]">
                {/* Metas por empresa, planta, grupo, canal y mercado */}
                <div className="border-b xl:border-b-0 xl:border-r border-border xl:max-h-[760px] overflow-y-auto">
                    {dimensiones.map((dim) => {
                        const lista = entidades.filter((e) => e.dimension === dim).sort((a, b) => excesoDeMeta(b) - excesoDeMeta(a));
                        if (lista.length === 0) return null;
                        return (
                            <div key={dim}>
                                {dim !== 'empresa' && <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">{ETIQUETA_DIMENSION[dim]}s</div>}
                                {lista.map((e) => {
                                    const sobre = excesoDeMeta(e) > 0;
                                    return (
                                        <button
                                            key={e.id}
                                            onClick={() => elegir(e.id)}
                                            aria-pressed={e.id === entidad.id}
                                            className={`w-full text-left px-4 py-2 cursor-pointer transition-colors ${e.id === entidad.id ? 'bg-sage-soft' : 'hover:bg-cream-light'}`}
                                        >
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sobre ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                                <span className="text-xs font-semibold text-brand-dark truncate">{e.nombre}</span>
                                                <span className={`ml-auto text-[9px] font-bold shrink-0 ${sobre ? 'text-red-700' : 'text-emerald-700'}`}>{sobre ? 'Sobre meta' : 'En meta'}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <Indicador titulo="Novedad" valor={e.pctNovedad} meta={META_CALIDAD} previo={e.previo?.pctNovedad} />
                                                <Indicador titulo="Casos" valor={e.pctCasos} meta={META_CALIDAD} previo={e.previo?.pctCasos} />
                                                <Indicador titulo="Inversión" valor={e.pctInversion} meta={META_ECONOMICA} previo={e.previo?.pctInversion} />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Explicación */}
                <div className="p-4 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center gap-1 text-xs">
                        <button onClick={() => setFoco([])} className="font-bold text-brand-dark hover:underline cursor-pointer">
                            {entidad.dimension === 'empresa' ? 'Toda la empresa' : etiquetaEntidad(entidad)}
                        </button>
                        {foco.map((f, i) => (
                            <React.Fragment key={f.tipo}>
                                <ChevronRightIcon className="w-3 h-3 text-stone-400" />
                                <button onClick={() => setFoco(foco.slice(0, i + 1))} className="font-semibold text-brand hover:underline cursor-pointer max-w-[220px] truncate" title={f.valor}>
                                    {ETIQUETA_FOCO[f.tipo]}: {f.valor}
                                </button>
                            </React.Fragment>
                        ))}
                        {foco.length > 0 && <button onClick={() => setFoco([])} className="ml-2 text-[10px] text-stone-400 hover:text-brand-dark cursor-pointer">Quitar detalle</button>}
                    </div>

                    <p className="text-sm text-stone-700 leading-relaxed">
                        <strong className="tabular-nums">{fmtN(explicacion.problemas)}</strong> problemas en <strong className="tabular-nums">{fmtN(explicacion.radicados)}</strong> radicados, <strong className="tabular-nums">{fmtN(explicacion.unidades)}</strong> productos con novedad
                        {entidad.unidadesVendidas > 0 && <> de <strong className="tabular-nums">{fmtN(entidad.unidadesVendidas)}</strong> vendidos</>}.
                        {foco.length === 0 && explicacion.unidadesSobreMeta > 0 && <> Hay <strong className="tabular-nums text-red-700">{fmtN(explicacion.unidadesSobreMeta)}</strong> productos con novedad por encima de la meta de {META_CALIDAD.toFixed(0)} %.</>}
                        {foco.length === 0 && entidad.unidadesVendidas === 0 && <> Este {ETIQUETA_DIMENSION[entidad.dimension].toLowerCase()} no tiene ventas asociadas en el periodo, así que no se puede calcular su porcentaje.</>}
                    </p>

                    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
                        <TablaAporte titulo="Defectos" filas={explicacion.defectos} tipo={foco.some((f) => f.tipo === 'defecto') ? undefined : 'defecto'} onFoco={sumarFoco} />
                        <TablaAporte titulo="Clientes" filas={explicacion.clientes} conPropio tipo={foco.some((f) => f.tipo === 'cliente') ? undefined : 'cliente'} onFoco={sumarFoco} />
                        <TablaAporte titulo="Responsables" filas={explicacion.responsables} tipo={foco.some((f) => f.tipo === 'responsable') ? undefined : 'responsable'} onFoco={sumarFoco} />
                        <TablaAporte titulo="Productos de compra" filas={explicacion.compras} tipo={foco.some((f) => f.tipo === 'compra') ? undefined : 'compra'} onFoco={sumarFoco} ayuda="Lo que compró el cliente" />
                        <TablaAporte titulo="Productos con novedad" filas={explicacion.piezas} ayuda="La pieza afectada" />
                        <div className="min-w-0 rounded-xl border border-border overflow-hidden">
                            <div className="px-3 py-2 bg-cream-light border-b border-border flex items-center gap-1.5">
                                <MessageSquareIcon className="w-3 h-3 text-brand-dark" />
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-dark">Lo que dicen los comentarios</h4>
                            </div>
                            {explicacion.temas.length === 0 ? (
                                <p className="p-4 text-xs text-stone-400 text-center">Sin temas reconocidos en los comentarios.</p>
                            ) : (
                                <ul className="divide-y divide-border">
                                    {explicacion.temas.slice(0, 5).map((t) => (
                                        <li key={t.tema.id} className="px-3 py-2">
                                            <div className="flex items-baseline justify-between gap-2">
                                                <span className="text-xs font-semibold text-stone-700">{t.tema.nombre}</span>
                                                <span className="text-[10px] font-bold tabular-nums text-brand-dark whitespace-nowrap">{t.radicados} rad.</span>
                                            </div>
                                            {t.cita && <p className="text-[11px] text-stone-500 italic mt-0.5 line-clamp-2">{t.cita}</p>}
                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-stone-400">
                                                <span>Hablar con {t.tema.area}</span>
                                                {t.fotos > 0 && <span className="inline-flex items-center gap-0.5"><ImageIcon className="w-3 h-3" /> {t.fotos}</span>}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
