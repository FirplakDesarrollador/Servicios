'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Check, ChevronRight, Hash, Loader2, Minus, Package, Search } from 'lucide-react';
import type { ArticuloDetalle, ArticuloResumen, CampoArticulo } from '@/lib/sapInventario';
import { formatMoney } from './explorer/sapFormat';
import { fetchConSesion } from '@/lib/fetchConSesion';

const tarjeta = 'bg-white rounded-2xl border border-border';
const cantidad = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 2 });

/** Chulo si la marca está activa en SAP; raya si no. */
function Chulo({ activo, nombre }: { activo: boolean; nombre: string }) {
  const Icono = activo ? Check : Minus;
  return (
    <span title={`${nombre}: ${activo ? 'sí' : 'no'}`} aria-label={`${nombre}: ${activo ? 'sí' : 'no'}`} role="img" className="inline-flex">
      <Icono className={`w-4 h-4 ${activo ? 'text-[var(--c-oliva-texto)]' : 'text-stone-400'}`} strokeWidth={activo ? 3 : 2} aria-hidden />
    </span>
  );
}

function MarcaDetalle({ activo, nombre }: { activo: boolean; nombre: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${activo ? 'font-medium text-brand-dark' : 'text-stone-500'}`}>
      <Chulo activo={activo} nombre={nombre} />
      {nombre}
    </span>
  );
}

function Mensaje({ icono: Icono = AlertCircle, texto, girando = false }: { icono?: React.ElementType; texto: string; girando?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2 py-14 text-sm text-stone-500">
      <Icono className={`w-5 h-5 ${girando ? 'animate-spin' : ''}`} aria-hidden />
      <span>{texto}</span>
    </div>
  );
}

function Indicador({ titulo, valor, unidad, resaltar }: { titulo: string; valor: number; unidad: string | null; resaltar?: boolean }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-[11px] font-medium text-stone-500">{titulo}</dt>
      <dd className={`text-xl font-semibold tabular-nums mt-0.5 ${valor < 0 ? 'text-red-700' : resaltar ? 'text-[var(--c-oliva-texto)]' : 'text-brand-dark'}`}>
        {cantidad(valor)} {unidad && <span className="text-xs font-normal text-stone-500">{unidad}</span>}
      </dd>
    </div>
  );
}

function ListaCampos({ campos, vacio }: { campos: CampoArticulo[]; vacio: string }) {
  if (campos.length === 0) return <p className="py-8 text-sm text-center text-stone-500">{vacio}</p>;
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
      {campos.map((c) => (
        <div key={c.etiqueta} className="min-w-0 border-b border-border pb-2">
          <dt className="text-[11px] font-medium text-stone-500">{c.etiqueta}</dt>
          <dd className="text-sm text-brand-dark break-words mt-0.5">{c.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

function TablaAlmacenes({ articulo }: { articulo: ArticuloDetalle }) {
  const [todos, setTodos] = useState(false);
  const conMovimiento = useMemo(() => articulo.almacenes.filter((a) => a.enStock || a.comprometido || a.pedido), [articulo]);
  const visibles = todos ? articulo.almacenes : conMovimiento;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-xs text-stone-500">{conMovimiento.length} de {articulo.almacenes.length} almacenes con movimiento</p>
        <label className="inline-flex items-center gap-2 text-xs text-stone-600 cursor-pointer">
          <input type="checkbox" checked={todos} onChange={(e) => setTodos(e.target.checked)} />
          Ver todos los almacenes
        </label>
      </div>
      {visibles.length === 0 ? (
        <p className="py-8 text-sm text-center text-stone-500">Este artículo no tiene stock, compromisos ni pedidos en ningún almacén.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="text-[11px] text-stone-500 border-b border-border">
                <th className="py-2 pr-4 font-medium">Almacén</th>
                <th className="py-2 px-3 font-medium text-right">En stock</th>
                <th className="py-2 px-3 font-medium text-right">Comprometido</th>
                <th className="py-2 px-3 font-medium text-right">Pedido</th>
                <th className="py-2 px-3 font-medium text-right">Disponible</th>
                <th className="py-2 pl-3 font-medium text-right">Costo</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((a) => (
                <tr key={a.codigo} className="border-b border-border">
                  <td className="py-2.5 pr-4 whitespace-normal min-w-[200px]">
                    <span className="font-medium text-brand-dark">{a.nombre}</span>
                    <span className="block text-[11px] text-stone-500">
                      {a.codigo}{a.bloqueado ? ' · Bloqueado' : ''}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{cantidad(a.enStock)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{cantidad(a.comprometido)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{cantidad(a.pedido)}</td>
                  <td className={`py-2.5 px-3 text-right tabular-nums font-semibold ${a.disponible < 0 ? 'text-red-700' : 'text-brand-dark'}`}>{cantidad(a.disponible)}</td>
                  <td className="py-2.5 pl-3 text-right tabular-nums text-stone-600">{a.costo === null ? '—' : formatMoney(a.costo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type Pestana = 'stock' | 'general' | 'ventas' | 'planificacion';
const PESTANAS: Array<{ id: Pestana; nombre: string }> = [
  { id: 'stock', nombre: 'Stock por almacén' },
  { id: 'general', nombre: 'General' },
  { id: 'ventas', nombre: 'Precios' },
  { id: 'planificacion', nombre: 'Planificación' },
];

export function DetalleArticulo({ codigo, volver }: { codigo: string; volver?: () => void }) {
  const [articulo, setArticulo] = useState<ArticuloDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>('stock');

  useEffect(() => {
    const control = new AbortController();
    setArticulo(null);
    setError(null);
    fetchConSesion(`/api/sap/inventario?articulo=${encodeURIComponent(codigo)}`, { signal: control.signal })
      .then((r) => r.json())
      .then((j) => (j.success ? setArticulo(j.articulo) : setError(j.error || 'No se pudo cargar el artículo.')))
      .catch((e) => { if (e.name !== 'AbortError') setError('No se pudo conectar con SAP. Intenta de nuevo.'); });
    return () => control.abort();
  }, [codigo]);

  return (
    <div className="space-y-4">
      {volver && (
        <button onClick={volver} className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-medium text-stone-600 hover:text-brand cursor-pointer">
          <ArrowLeft className="w-4 h-4" aria-hidden /> Volver a los resultados
        </button>
      )}
      {error && <div className={tarjeta}><Mensaje texto={error} /></div>}
      {!error && !articulo && <div className={tarjeta}><Mensaje icono={Loader2} girando texto={`Cargando ${codigo} desde SAP…`} /></div>}
      {articulo && (
        <div className={`${tarjeta} p-5`}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-brand-dark">{articulo.nombre}</h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {articulo.codigo}{articulo.grupo ? ` · ${articulo.grupo}` : ''}{articulo.nombreExtranjero ? ` · ${articulo.nombreExtranjero}` : ''}
          </p>

          <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
            <MarcaDetalle activo={articulo.activo} nombre="Activo" />
            <MarcaDetalle activo={articulo.esInventario} nombre="Inventario" />
            <MarcaDetalle activo={articulo.venta} nombre="Venta" />
            <MarcaDetalle activo={articulo.compra} nombre="Compra" />
          </div>

          {articulo.propiedades.length > 0 && (
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 mt-4">
              {articulo.propiedades.map((c) => (
                <div key={c.etiqueta} className="min-w-0">
                  <dt className="text-[11px] font-medium text-stone-500">{c.etiqueta}</dt>
                  <dd className="text-sm font-medium text-brand-dark break-words mt-0.5">{c.valor || '—'}</dd>
                </div>
              ))}
            </dl>
          )}

          <dl className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border border-y border-border mt-4">
            <Indicador titulo="En stock" valor={articulo.enStock} unidad={articulo.unidad} />
            <Indicador titulo="Comprometido" valor={articulo.comprometido} unidad={articulo.unidad} />
            <Indicador titulo="Pedido" valor={articulo.pedido} unidad={articulo.unidad} />
            <Indicador titulo="Disponible" valor={articulo.disponible} unidad={articulo.unidad} resaltar />
          </dl>

          <div className="flex gap-1 overflow-x-auto mt-4 border-b border-border" role="tablist">
            {PESTANAS.map((p) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={pestana === p.id}
                onClick={() => setPestana(p.id)}
                className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 -mb-px cursor-pointer transition-colors ${pestana === p.id ? 'border-brand text-brand' : 'border-transparent text-stone-500 hover:text-brand-dark'}`}
              >
                {p.nombre}
              </button>
            ))}
          </div>

          <div className="pt-4">
            {pestana === 'stock' && <TablaAlmacenes articulo={articulo} />}
            {pestana === 'general' && (
              <div className="space-y-5">
                <ListaCampos campos={[...articulo.general, ...articulo.inventario]} vacio="Sin datos generales." />
                {articulo.comentarios && (
                  <div>
                    <h3 className="text-[11px] font-medium text-stone-500">Comentarios</h3>
                    <p className="text-sm text-brand-dark mt-1 whitespace-pre-line">{articulo.comentarios}</p>
                  </div>
                )}
              </div>
            )}
            {pestana === 'ventas' && (articulo.precios.length === 0 ? (
              <p className="py-8 text-sm text-center text-stone-500">Este artículo no tiene precios en ninguna lista.</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                {articulo.precios.map((p) => (
                  <li key={p.lista} className="flex items-baseline justify-between gap-4 py-2 border-b border-border text-sm">
                    <span className="text-stone-600 min-w-0">{p.lista}</span>
                    <span className="font-semibold tabular-nums text-brand-dark whitespace-nowrap">{formatMoney(p.precio, p.moneda)}</span>
                  </li>
                ))}
              </ul>
            ))}
            {pestana === 'planificacion' && <ListaCampos campos={articulo.planificacion} vacio="Sin datos de planificación." />}
          </div>
        </div>
      )}
    </div>
  );
}

/** Módulo Stock e inventario: Datos maestros de artículo de SAP, solo consulta. */
export default function InventarioSap() {
  const [descripcion, setDescripcion] = useState('');
  const [codigo, setCodigo] = useState('');
  const [consulta, setConsulta] = useState<{ descripcion: string; codigo: string } | null>(null);
  const [articulos, setArticulos] = useState<ArticuloResumen[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  useEffect(() => {
    if (!consulta) return;
    const control = new AbortController();
    setCargando(true);
    setError(null);
    setArticulos(null);
    fetchConSesion(`/api/sap/inventario?${new URLSearchParams(consulta)}`, { signal: control.signal })
      .then((r) => r.json())
      .then((j) => (j.success ? setArticulos(j.articulos) : setError(j.error || 'No se pudo hacer la búsqueda.')))
      .catch((e) => { if (e.name !== 'AbortError') setError('No se pudo conectar con SAP. Intenta de nuevo.'); })
      .finally(() => { if (!control.signal.aborted) setCargando(false); });
    return () => control.abort();
  }, [consulta]);

  if (seleccionado) return <DetalleArticulo codigo={seleccionado} volver={() => setSeleccionado(null)} />;

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => { e.preventDefault(); setConsulta({ descripcion: descripcion.trim(), codigo: codigo.trim() }); }}
        className={`${tarjeta} grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] gap-2 p-2`}
      >
        <label className="flex items-center gap-2 h-11 px-3 rounded-xl border border-border">
          <Search className="w-4 h-4 text-brand-light shrink-0" aria-hidden />
          <span className="sr-only">Buscar por descripción</span>
          <input
            autoFocus
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción, ej.: lavamanos doha"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-brand-dark placeholder:text-stone-500"
          />
        </label>
        <label className="flex items-center gap-2 h-11 px-3 rounded-xl border border-border">
          <Hash className="w-4 h-4 text-brand-light shrink-0" aria-hidden />
          <span className="sr-only">Buscar por código</span>
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Código o código de barras"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-brand-dark placeholder:text-stone-500"
          />
        </label>
        <button type="submit" disabled={descripcion.trim().length < 2 && codigo.trim().length < 2} className="h-11 px-6 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover disabled:opacity-50 transition-colors cursor-pointer">
          Buscar
        </button>
      </form>

      <div className={tarjeta}>
        {cargando && <Mensaje icono={Loader2} girando texto={`Buscando “${[consulta?.descripcion, consulta?.codigo].filter(Boolean).join(' · ')}” en SAP…`} />}
        {error && <Mensaje texto={error} />}
        {!cargando && !error && articulos === null && <Mensaje icono={Package} texto="Busca un artículo por su descripción o por su código." />}
        {!cargando && !error && articulos?.length === 0 && <Mensaje icono={Package} texto={`No hay artículos para “${[consulta?.descripcion, consulta?.codigo].filter(Boolean).join(' · ')}”.`} />}
        {!cargando && !error && articulos && articulos.length > 0 && (
          <>
            <p className="px-5 pt-4 pb-2 text-xs text-stone-500">
              {articulos.length === 50 ? 'Primeros 50 artículos; afina la búsqueda si no ves el tuyo.' : `${articulos.length} artículo(s)`}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-[11px] text-stone-500 border-b border-border">
                    <th className="py-2 pl-5 pr-4 font-medium">Artículo</th>
                    <th className="py-2 px-3 font-medium text-right">En stock</th>
                    <th className="py-2 px-3 font-medium text-right">Comprometido</th>
                    <th className="py-2 px-3 font-medium text-right">Pedido</th>
                    <th className="py-2 px-3 font-medium text-right">Disponible</th>
                    <th className="py-2 px-2 font-medium text-center">Activo</th>
                    <th className="py-2 px-2 font-medium text-center">Inventario</th>
                    <th className="py-2 px-2 font-medium text-center">Venta</th>
                    <th className="py-2 px-2 font-medium text-center">Compra</th>
                    <th className="py-2 pr-5" />
                  </tr>
                </thead>
                <tbody>
                  {articulos.map((a) => (
                    <tr key={a.codigo} onClick={() => setSeleccionado(a.codigo)} className="border-b border-border last:border-0 cursor-pointer hover:bg-cream-light transition-colors">
                      <td className="py-2.5 pl-5 pr-4 whitespace-normal min-w-[260px]">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSeleccionado(a.codigo); }}
                          className="text-left font-medium text-brand-dark hover:text-brand cursor-pointer"
                        >
                          {a.nombre}
                        </button>
                        <span className="block text-[11px] text-stone-500">
                          {a.codigo}{a.grupo ? ` · ${a.grupo}` : ''}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{cantidad(a.enStock)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{cantidad(a.comprometido)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{cantidad(a.pedido)}</td>
                      <td className={`py-2.5 px-3 text-right tabular-nums font-semibold ${a.disponible < 0 ? 'text-red-700' : 'text-brand-dark'}`}>{cantidad(a.disponible)}</td>
                      <td className="py-2.5 px-2 text-center"><Chulo activo={a.activo} nombre="Activo" /></td>
                      <td className="py-2.5 px-2 text-center"><Chulo activo={a.inventario} nombre="Inventario" /></td>
                      <td className="py-2.5 px-2 text-center"><Chulo activo={a.venta} nombre="Venta" /></td>
                      <td className="py-2.5 px-2 text-center"><Chulo activo={a.compra} nombre="Compra" /></td>
                      <td className="py-2.5 pr-5 text-right"><ChevronRight className="w-4 h-4 inline text-stone-400" aria-hidden /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
