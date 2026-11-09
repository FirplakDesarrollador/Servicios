'use client';
import React, { useEffect, useState } from 'react';
import { AlertCircle, Boxes, ChevronRight, CornerDownRight, Hash, Loader2, Package } from 'lucide-react';
import type { ListaMateriales } from '@/lib/sapInventario';
import { formatMoney } from './explorer/sapFormat';
import { fetchConSesion } from '@/lib/fetchConSesion';

const tarjeta = 'bg-white rounded-2xl border border-border';
const cantidad = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 4 });

function Mensaje({ icono: Icono = AlertCircle, texto, girando = false }: { icono?: React.ElementType; texto: string; girando?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2 py-14 text-sm text-stone-500">
      <Icono className={`w-5 h-5 ${girando ? 'animate-spin' : ''}`} aria-hidden />
      <span>{texto}</span>
    </div>
  );
}

/**
 * Lista de materiales de SAP (Producción → Lista de materiales), solo consulta.
 * Un nivel a la vez como la ventana de SAP; los componentes con LDM propia se abren con un clic
 * y la ruta de arriba permite volver a cualquier nivel.
 */
export default function ListaMaterialesSap({ codigoInicial, onVerCostos, onVerArticulo }: {
  codigoInicial?: string;
  onVerCostos?: (codigo: string) => void;
  onVerArticulo?: (codigo: string) => void;
}) {
  const [codigo, setCodigo] = useState(codigoInicial || '');
  const [ruta, setRuta] = useState<string[]>(codigoInicial ? [codigoInicial] : []);
  const [lista, setLista] = useState<ListaMateriales | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actual = ruta[ruta.length - 1];

  useEffect(() => {
    if (!actual) return;
    const control = new AbortController();
    setCargando(true);
    setError(null);
    setLista(null);
    fetchConSesion(`/api/sap/inventario?ldm=${encodeURIComponent(actual)}`, { signal: control.signal })
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) return setError(j.error || 'No se pudo consultar la lista de materiales.');
        if (!j.lista) return setError(`El artículo ${actual} no tiene lista de materiales en SAP.`);
        setLista(j.lista);
      })
      .catch((e) => { if (e.name !== 'AbortError') setError('No se pudo conectar con SAP. Intenta de nuevo.'); })
      .finally(() => { if (!control.signal.aborted) setCargando(false); });
    return () => control.abort();
  }, [actual]);

  const total = lista?.lineas.reduce((s, l) => s + (l.precio ?? 0) * l.cantidad, 0) ?? 0;
  const hayPrecios = !!lista?.lineas.some((l) => (l.precio ?? 0) > 0);

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => { e.preventDefault(); const c = codigo.trim(); if (c) setRuta([c]); }}
        className={`${tarjeta} flex gap-2 p-2`}
      >
        <label className="flex-1 min-w-0 flex items-center gap-2 h-11 px-3 rounded-xl border border-border">
          <Hash className="w-4 h-4 text-brand-light shrink-0" aria-hidden />
          <span className="sr-only">Código del producto</span>
          <input
            autoFocus
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Código del producto, ej.: 10101010"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-brand-dark placeholder:text-stone-500"
          />
        </label>
        <button type="submit" disabled={!codigo.trim()} className="h-11 px-6 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover disabled:opacity-50 transition-colors cursor-pointer">
          Consultar
        </button>
      </form>

      {ruta.length > 1 && (
        <nav aria-label="Niveles de la lista de materiales" className="flex flex-wrap items-center gap-1 text-xs">
          {ruta.map((c, i) => (
            <React.Fragment key={`${c}-${i}`}>
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-stone-400" aria-hidden />}
              <button
                onClick={() => setRuta(ruta.slice(0, i + 1))}
                disabled={i === ruta.length - 1}
                className={`px-2 py-1 rounded-md ${i === ruta.length - 1 ? 'font-semibold text-brand-dark' : 'text-brand hover:bg-cream-light cursor-pointer'}`}
              >
                {i === 0 ? 'Nivel 1' : `Nivel ${i + 1}`} · {c}
              </button>
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className={tarjeta}>
        {!actual && <Mensaje icono={Boxes} texto="Escribe el código de un producto para ver su lista de materiales." />}
        {cargando && <Mensaje icono={Loader2} girando texto={`Cargando la lista de materiales de ${actual}…`} />}
        {error && <Mensaje texto={error} />}
        {lista && !cargando && (
          <>
            <div className="p-5 flex flex-wrap items-start justify-between gap-3 border-b border-border">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-brand-dark">{lista.descripcion || lista.codigo}</h2>
                <p className="text-xs text-stone-500 mt-1">
                  {lista.codigo}
                  {lista.tipo ? ` · Tipo ${lista.tipo}` : ''}
                  {` · Cantidad ${cantidad(lista.cantidad)}`}
                  {lista.almacen ? ` · Almacén ${lista.almacen}` : ''}
                  {` · ${lista.lineas.length} componentes`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {onVerArticulo && (
                  <button onClick={() => onVerArticulo(lista.codigo)} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border text-sm font-medium text-brand hover:border-brand-light hover:bg-cream-light transition-colors cursor-pointer">
                    <Package className="w-4 h-4" aria-hidden /> Ver artículo
                  </button>
                )}
                {onVerCostos && (
                  <button onClick={() => onVerCostos(lista.codigo)} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors cursor-pointer">
                    <Boxes className="w-4 h-4" aria-hidden /> Ver costos (LDM Costos)
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-[11px] text-stone-500 border-b border-border">
                    <th className="py-2 pl-5 pr-2 font-medium text-right">#</th>
                    <th className="py-2 px-3 font-medium">Tipo</th>
                    <th className="py-2 px-3 font-medium">Nº de artículo</th>
                    <th className="py-2 px-3 font-medium">Descripción</th>
                    <th className="py-2 px-3 font-medium text-right">Cantidad</th>
                    <th className="py-2 px-3 font-medium">UdM</th>
                    <th className="py-2 px-3 font-medium">Almacén</th>
                    <th className="py-2 px-3 font-medium">Método de emisión</th>
                    {hayPrecios && <th className="py-2 px-3 font-medium text-right">Precio unitario</th>}
                    {hayPrecios && <th className="py-2 pr-5 pl-3 font-medium text-right">Total</th>}
                  </tr>
                </thead>
                <tbody>
                  {lista.lineas.map((l, i) => (
                    <tr key={`${l.codigo}-${i}`} className="border-b border-border last:border-0 hover:bg-cream-light transition-colors">
                      <td className="py-2 pl-5 pr-2 text-right tabular-nums text-stone-500">{i + 1}</td>
                      <td className="py-2 px-3 text-stone-600">{l.tipo}</td>
                      <td className="py-2 px-3 font-medium">
                        {l.tieneLdm ? (
                          <button
                            onClick={() => setRuta([...ruta, l.codigo])}
                            title="Abrir la lista de materiales de este componente"
                            className="inline-flex items-center gap-1 text-brand hover:underline cursor-pointer"
                          >
                            <CornerDownRight className="w-3.5 h-3.5 text-[var(--c-oliva-texto)]" aria-hidden />
                            {l.codigo}
                          </button>
                        ) : (
                          <span className="text-brand-dark">{l.codigo}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 whitespace-normal min-w-[240px] text-brand-dark">
                        {l.nombre || '—'}
                        {l.comentario && <span className="block text-[11px] text-stone-500">{l.comentario}</span>}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">{cantidad(l.cantidad)}</td>
                      <td className="py-2 px-3 text-stone-600">{l.unidad || '—'}</td>
                      <td className="py-2 px-3 text-stone-600">{l.almacen || '—'}</td>
                      <td className="py-2 px-3 text-stone-600">{l.emision || '—'}</td>
                      {hayPrecios && <td className="py-2 px-3 text-right tabular-nums">{l.precio === null ? '—' : formatMoney(l.precio, l.moneda)}</td>}
                      {hayPrecios && <td className="py-2 pr-5 pl-3 text-right tabular-nums">{formatMoney((l.precio ?? 0) * l.cantidad, l.moneda)}</td>}
                    </tr>
                  ))}
                </tbody>
                {hayPrecios && (
                  <tfoot>
                    <tr className="border-t border-border">
                      <td colSpan={9} className="py-2.5 px-3 text-right text-xs font-medium text-stone-500">Total según precio de la LDM</td>
                      <td className="py-2.5 pr-5 pl-3 text-right tabular-nums font-semibold text-brand-dark">{formatMoney(total)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <p className="px-5 py-3 text-[11px] text-stone-500 border-t border-border">
              Los códigos con <CornerDownRight className="w-3 h-3 inline text-[var(--c-oliva-texto)]" aria-hidden /> tienen su propia lista de materiales: haz clic para bajar de nivel.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
