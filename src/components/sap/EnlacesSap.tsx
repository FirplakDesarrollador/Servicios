'use client';
import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, X } from 'lucide-react';
import type { ListaMateriales } from '@/lib/sapInventario';
import { CustomerView, DocumentView, type View } from './ExploradorSap';
import { DetalleArticulo } from './InventarioSap';

/** Lo que se puede abrir desde una flecha: lo del explorador (cliente, documento) o un artículo. */
export type VistaEnlace = Exclude<View, { kind: 'search' }> | { kind: 'articulo'; codigo: string };

/** Flecha de enlace de SAP: abre encima el dato maestro del valor que tiene al lado. */
export function FlechaEnlace({ titulo, onClick }: { titulo: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      aria-label={titulo}
      className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded text-amber-600 hover:bg-amber-100 hover:text-amber-800 focus-visible:outline-2 focus-visible:outline-brand-light transition-colors cursor-pointer"
    >
      <ArrowRight className="w-3.5 h-3.5" strokeWidth={3} aria-hidden />
    </button>
  );
}

function Aviso({ texto, cargando = false }: { texto: string; cargando?: boolean }) {
  const Icono = cargando ? Loader2 : AlertCircle;
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-stone-500">
      <Icono className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} aria-hidden />
      {texto}
    </div>
  );
}

function TablaMateriales({ lista, abrir }: { lista: ListaMateriales; abrir: (codigo: string) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5">
      <h3 className="text-lg font-semibold text-brand-dark">{lista.descripcion || lista.codigo}</h3>
      <p className="text-xs text-stone-500 mt-1">{lista.codigo} · Cantidad base: {lista.cantidad.toLocaleString('es-CO', { maximumFractionDigits: 4 })}</p>
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-stone-500 border-b border-border">
              <th className="py-2 pr-3 font-medium w-10">#</th>
              <th className="py-2 pr-4 font-medium">Número de artículo</th>
              <th className="py-2 pr-4 font-medium">Descripción</th>
              <th className="py-2 pr-4 font-medium text-right">Cantidad</th>
              <th className="py-2 font-medium">Almacén</th>
            </tr>
          </thead>
          <tbody>
            {lista.lineas.map((l, i) => (
              <tr key={`${l.codigo}-${i}`} className="border-b border-border last:border-0">
                <td className="py-2 pr-3 text-stone-500 tabular-nums">{i + 1}</td>
                <td className="py-2 pr-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 font-medium text-brand-dark">
                    {l.esArticulo && <FlechaEnlace titulo={`Abrir ${l.codigo}`} onClick={() => abrir(l.codigo)} />}
                    {l.codigo}
                  </span>
                </td>
                <td className="py-2 pr-4 text-stone-600 min-w-[220px]">{l.nombre || '—'}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{l.cantidad.toLocaleString('es-CO', { maximumFractionDigits: 4 })}</td>
                <td className="py-2 text-stone-600">{l.almacen || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Artículo: primero su lista de materiales si la tiene, y de ahí a sus datos de inventario. */
function VistaArticulo({ codigo, abrir }: { codigo: string; abrir: (codigo: string) => void }) {
  const [estado, setEstado] = useState<{ lista: ListaMateriales | null; error: string | null } | null>(null);
  const [pestana, setPestana] = useState<'materiales' | 'inventario'>('materiales');

  useEffect(() => {
    const control = new AbortController();
    fetch(`/api/sap/inventario?ldm=${encodeURIComponent(codigo)}`, { signal: control.signal })
      .then((r) => r.json())
      .then((j) => setEstado(j.success ? { lista: j.lista, error: null } : { lista: null, error: j.error || 'No se pudo consultar la lista de materiales.' }))
      .catch((e) => { if (e.name !== 'AbortError') setEstado({ lista: null, error: 'No se pudo conectar con SAP. Intenta de nuevo.' }); });
    return () => control.abort();
  }, [codigo]);

  if (!estado) return <Aviso cargando texto={`Consultando ${codigo} en SAP…`} />;
  if (estado.error) return <Aviso texto={estado.error} />;
  if (!estado.lista) return <DetalleArticulo codigo={codigo} />;

  const pestanas = [
    { id: 'materiales' as const, nombre: 'Lista de materiales' },
    { id: 'inventario' as const, nombre: 'Datos de inventario' },
  ];
  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Información del artículo" className="flex gap-1 border-b border-border">
        {pestanas.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={pestana === p.id}
            onClick={() => setPestana(p.id)}
            className={`min-h-[44px] px-4 text-sm font-medium border-b-2 -mb-px cursor-pointer transition-colors ${pestana === p.id ? 'border-brand text-brand' : 'border-transparent text-stone-500 hover:text-brand'}`}
          >
            {p.nombre}
          </button>
        ))}
      </div>
      {pestana === 'materiales' ? <TablaMateriales lista={estado.lista} abrir={abrir} /> : <DetalleArticulo codigo={codigo} />}
    </div>
  );
}

/** Ventana que abren las flechas, encima del documento y sin perderlo, como en SAP. */
export function VentanaEnlace({ inicial, cerrar }: { inicial: VistaEnlace; cerrar: () => void }) {
  const [pila, setPila] = useState<VistaEnlace[]>([inicial]);
  const vista = pila[pila.length - 1];
  const ir = (v: VistaEnlace) => setPila((p) => [...p, v]);
  const irDesdeExplorador = (v: View) => { if (v.kind !== 'search') ir(v); };
  const abrirArticulo = (codigo: string) => ir({ kind: 'articulo', codigo });

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [cerrar]);

  const titulo =
    vista.kind === 'articulo' ? `Artículo ${vista.codigo}`
    : vista.kind === 'customer' ? `Socio de negocios ${vista.label || vista.cardCode}`
    : vista.label || 'Documento';

  return (
    <div className="fixed inset-0 z-50 bg-brand-dark/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4" onClick={cerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="bg-cream rounded-2xl border border-border shadow-[0_30px_60px_-20px_rgba(37,65,83,0.45)] w-full max-w-6xl max-h-full flex flex-col overflow-hidden select-text"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
          {pila.length > 1 && (
            <button onClick={() => setPila((p) => p.slice(0, -1))} aria-label="Volver" title="Volver" className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-stone-600 hover:text-brand cursor-pointer">
              <ArrowLeft className="w-4 h-4" aria-hidden />
            </button>
          )}
          <h2 className="flex-1 min-w-0 truncate text-sm font-semibold text-brand-dark">{titulo}</h2>
          <button onClick={cerrar} aria-label="Cerrar" title="Cerrar" className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-stone-600 hover:text-brand cursor-pointer">
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto p-3 sm:p-4 text-left">
          {vista.kind === 'articulo' && <VistaArticulo key={vista.codigo} codigo={vista.codigo} abrir={abrirArticulo} />}
          {vista.kind === 'customer' && <CustomerView key={vista.cardCode} cardCode={vista.cardCode} go={irDesdeExplorador} />}
          {vista.kind === 'document' && <DocumentView key={`${vista.type}:${vista.docEntry}`} type={vista.type} docEntry={vista.docEntry} go={irDesdeExplorador} />}
        </div>
      </div>
    </div>
  );
}
