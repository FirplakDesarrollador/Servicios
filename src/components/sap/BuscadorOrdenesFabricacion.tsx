'use client';
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, ClipboardList, Loader2, Package, Search } from 'lucide-react';
import type { SapDocSummary } from '@/lib/sapExplorerTypes';
import { formatDate } from './explorer/sapFormat';
import { fetchConSesion } from '@/lib/fetchConSesion';

const cantidad = (v: number | null | undefined) => (v === null || v === undefined ? '—' : v.toLocaleString('es-CO', { maximumFractionDigits: 2 }));

/** Busca órdenes de fabricación por pedido de cliente y por producto. Al elegir una, la abre en la pantalla. */
export default function BuscadorOrdenesFabricacion({ onAbrir }: { onAbrir: (docNum: string) => void }) {
  const [pedido, setPedido] = useState('');
  const [producto, setProducto] = useState('');
  const [ordenes, setOrdenes] = useState<SapDocSummary[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(true);
  const [elegida, setElegida] = useState<number | null>(null);

  const pedidoValido = /^\d+$/.test(pedido.trim());
  const puedeBuscar = pedidoValido || producto.trim().length >= 2;

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!puedeBuscar) {
      setError(pedido.trim() ? 'El pedido debe ser un número.' : 'Escribe un pedido, o al menos 2 caracteres del producto.');
      return;
    }
    setBuscando(true);
    setError(null);
    setOrdenes(null);
    setElegida(null);
    setAbierto(true);
    try {
      const parametros = new URLSearchParams({ pedido: pedido.trim(), producto: producto.trim() });
      const res = await fetchConSesion(`/api/sap/ordenes-fabricacion?${parametros}`);
      const json = await res.json();
      if (json.success) setOrdenes(json.ordenes);
      else setError(json.error || 'No se pudo hacer la búsqueda.');
    } catch {
      setError('No se pudo conectar con SAP. Intenta de nuevo.');
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="px-5 py-3 border-b border-border text-xs select-text">
      <form onSubmit={buscar} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] gap-2">
        <label className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border">
          <ClipboardList className="w-4 h-4 text-brand-light shrink-0" aria-hidden />
          <span className="sr-only">Pedido de cliente</span>
          <input
            value={pedido}
            onChange={(e) => setPedido(e.target.value)}
            inputMode="numeric"
            placeholder="Pedido de cliente"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-brand-dark placeholder:text-stone-500"
          />
        </label>
        <label className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border">
          <Package className="w-4 h-4 text-brand-light shrink-0" aria-hidden />
          <span className="sr-only">Producto o código</span>
          <input
            value={producto}
            onChange={(e) => setProducto(e.target.value)}
            placeholder="Producto o código"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-brand-dark placeholder:text-stone-500"
          />
        </label>
        <button type="submit" disabled={buscando} className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover disabled:opacity-60 transition-colors cursor-pointer">
          {buscando ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Search className="w-4 h-4" aria-hidden />}
          Buscar órdenes
        </button>
      </form>

      {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
      {ordenes?.length === 0 && <p className="mt-3 text-stone-500">No hay órdenes de fabricación para esa búsqueda.</p>}

      {ordenes && ordenes.length > 0 && (
        <div className="mt-3">
          <button type="button" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto} className="inline-flex items-center gap-1 min-h-[32px] font-medium text-stone-600 hover:text-brand cursor-pointer">
            {abierto ? <ChevronDown className="w-4 h-4" aria-hidden /> : <ChevronRight className="w-4 h-4" aria-hidden />}
            {ordenes.length === (pedidoValido ? 200 : 50) ? `Primeras ${ordenes.length} órdenes; afina la búsqueda si no ves la tuya` : `${ordenes.length} orden(es) de fabricación`}
          </button>
          {abierto && (
            <div className="overflow-auto max-h-72 mt-1">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-[11px] text-stone-500 border-b border-border">
                    <th className="py-2 pr-4 font-medium">Orden</th>
                    <th className="py-2 pr-4 font-medium">Producto</th>
                    <th className="py-2 pr-4 font-medium">Estado</th>
                    <th className="py-2 pr-4 font-medium text-right">Planificada</th>
                    <th className="py-2 pr-4 font-medium text-right">Completada</th>
                    <th className="py-2 pr-4 font-medium">Fecha</th>
                    <th className="py-2 font-medium">Vencimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenes.map((o) => (
                    <tr
                      key={o.key}
                      onClick={() => { setElegida(o.docNum); onAbrir(String(o.docNum)); }}
                      className={`border-b border-border cursor-pointer transition-colors ${elegida === o.docNum ? 'bg-sage-soft' : 'hover:bg-cream-light'}`}
                    >
                      <td className="py-2 pr-4">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setElegida(o.docNum); onAbrir(String(o.docNum)); }}
                          className="font-semibold text-brand-dark hover:text-brand tabular-nums cursor-pointer"
                        >
                          {o.docNum}
                        </button>
                      </td>
                      <td className="py-2 pr-4 whitespace-normal min-w-[240px]">
                        <span className="text-brand-dark">{o.itemName || '—'}</span>
                        <span className="block text-[11px] text-stone-500">{o.itemCode}</span>
                      </td>
                      <td className="py-2 pr-4 text-stone-600">{o.status}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{cantidad(o.plannedQty)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{cantidad(o.completedQty)}</td>
                      <td className="py-2 pr-4 tabular-nums text-stone-600">{formatDate(o.date)}</td>
                      <td className="py-2 tabular-nums text-stone-600">{formatDate(o.dueDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
