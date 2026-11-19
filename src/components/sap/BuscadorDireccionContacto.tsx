'use client';
import React, { useState } from 'react';
import { Building2, ChevronDown, ChevronRight, Loader2, MapPin, Search, UserRound } from 'lucide-react';
import type { DocumentoAproximado } from '@/lib/sapBusquedaAproximada';
import { formatDate, formatMoney } from './explorer/sapFormat';
import { fetchConSesion } from '@/lib/fetchConSesion';

const colorCoincidencia = (v: number) =>
  v >= 90 ? 'bg-sage-soft text-brand' : v >= 70 ? 'bg-amber-50 text-amber-800' : 'bg-stone-100 text-stone-600';

/**
 * Busca órdenes de venta o entregas por cliente, dirección de entrega y/o persona de contacto, aunque lo escrito
 * no sea exacto (abreviaturas, tildes, errores de digitación). Al elegir una, la abre en la pantalla.
 */
export default function BuscadorDireccionContacto({ tipo, onAbrir }: { tipo: 'Order' | 'Delivery'; onAbrir: (docNum: string) => void }) {
  const [cliente, setCliente] = useState('');
  const [direccion, setDireccion] = useState('');
  const [contacto, setContacto] = useState('');
  const [documentos, setDocumentos] = useState<DocumentoAproximado[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(true);
  const [elegido, setElegido] = useState<number | null>(null);

  const nombre = tipo === 'Order' ? 'órdenes de venta' : 'entregas';

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cliente.trim().length < 3 && direccion.trim().length < 3 && contacto.trim().length < 3) {
      setError('Escribe al menos 3 caracteres del cliente, la dirección de entrega o la persona de contacto.');
      return;
    }
    setBuscando(true);
    setError(null);
    setDocumentos(null);
    setElegido(null);
    setAbierto(true);
    try {
      const parametros = new URLSearchParams({ tipo, cliente: cliente.trim(), direccion: direccion.trim(), contacto: contacto.trim() });
      const res = await fetchConSesion(`/api/sap/busqueda-aproximada?${parametros}`);
      const json = await res.json();
      if (json.success) setDocumentos(json.documentos);
      else setError(json.error || 'No se pudo hacer la búsqueda.');
    } catch {
      setError('No se pudo conectar con SAP. Intenta de nuevo.');
    } finally {
      setBuscando(false);
    }
  };

  const abrir = (d: DocumentoAproximado) => {
    setElegido(d.docEntry);
    onAbrir(String(d.docNum));
  };

  return (
    <div className="px-5 py-3 border-b border-border text-xs select-text">
      <form onSubmit={buscar} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,2fr)_auto] gap-2">
        <label className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border">
          <Building2 className="w-4 h-4 text-brand-light shrink-0" aria-hidden />
          <span className="sr-only">Cliente</span>
          <input
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Cliente: nombre, código o NIT"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-brand-dark placeholder:text-stone-500"
          />
        </label>
        <label className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border">
          <MapPin className="w-4 h-4 text-brand-light shrink-0" aria-hidden />
          <span className="sr-only">Dirección de entrega</span>
          <input
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Dirección de entrega, ej.: calle 10 # 20-30"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-brand-dark placeholder:text-stone-500"
          />
        </label>
        <label className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border">
          <UserRound className="w-4 h-4 text-brand-light shrink-0" aria-hidden />
          <span className="sr-only">Persona de contacto</span>
          <input
            value={contacto}
            onChange={(e) => setContacto(e.target.value)}
            placeholder="Persona de contacto"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-brand-dark placeholder:text-stone-500"
          />
        </label>
        <button type="submit" disabled={buscando} className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover disabled:opacity-60 transition-colors cursor-pointer">
          {buscando ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Search className="w-4 h-4" aria-hidden />}
          Buscar {nombre}
        </button>
      </form>
      <p className="mt-1.5 text-[11px] text-stone-500">
        No tiene que ser exacto: entiende abreviaturas (Calle, CL, Carrera, KR, #, Apto…), tildes y errores de digitación. Llena uno o varios campos; con el cliente la búsqueda es más corta.
      </p>

      {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
      {buscando && <p className="mt-3 text-stone-500">Buscando posibles coincidencias en SAP…</p>}
      {documentos?.length === 0 && <p className="mt-3 text-stone-500">No hay {nombre} que se parezcan a lo que escribiste.</p>}

      {documentos && documentos.length > 0 && (
        <div className="mt-3">
          <button type="button" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto} className="inline-flex items-center gap-1 min-h-[32px] font-medium text-stone-600 hover:text-brand cursor-pointer">
            {abierto ? <ChevronDown className="w-4 h-4" aria-hidden /> : <ChevronRight className="w-4 h-4" aria-hidden />}
            {documentos.length} posible(s) coincidencia(s), de la más parecida a la menos
          </button>
          {abierto && (
            <div className="overflow-auto max-h-80 mt-1">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-[11px] text-stone-500 border-b border-border">
                    <th className="py-2 pr-3 font-medium">Coincide</th>
                    <th className="py-2 pr-4 font-medium">Número</th>
                    <th className="py-2 pr-4 font-medium">Cliente</th>
                    <th className="py-2 pr-4 font-medium">Dirección de entrega</th>
                    <th className="py-2 pr-4 font-medium">Persona de contacto</th>
                    <th className="py-2 pr-4 font-medium">Estado</th>
                    <th className="py-2 pr-4 font-medium">Fecha</th>
                    <th className="py-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {documentos.map((d) => (
                    <tr
                      key={d.docEntry}
                      onClick={() => abrir(d)}
                      className={`border-b border-border cursor-pointer transition-colors ${elegido === d.docEntry ? 'bg-sage-soft' : 'hover:bg-cream-light'}`}
                    >
                      <td className="py-2 pr-3">
                        <span className={`inline-block px-1.5 py-px rounded-full text-[10px] font-semibold tabular-nums ${colorCoincidencia(d.coincidencia)}`}>{d.coincidencia}%</span>
                      </td>
                      <td className="py-2 pr-4">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); abrir(d); }}
                          className="font-semibold text-brand-dark hover:text-brand tabular-nums cursor-pointer"
                        >
                          {d.docNum}
                        </button>
                      </td>
                      <td className="py-2 pr-4 whitespace-normal min-w-[180px]">
                        <span className="text-brand-dark">{d.nombreCliente}</span>
                        <span className="block text-[11px] text-stone-500">{d.cliente}</span>
                      </td>
                      <td className="py-2 pr-4 whitespace-normal min-w-[240px] text-brand-dark">{d.direccion || '—'}</td>
                      <td className="py-2 pr-4 whitespace-normal min-w-[140px] text-stone-600">{d.contacto || '—'}</td>
                      <td className="py-2 pr-4 text-stone-600">{d.estado}</td>
                      <td className="py-2 pr-4 tabular-nums text-stone-600">{formatDate(d.fecha)}</td>
                      <td className="py-2 text-right tabular-nums">{d.total === null ? '—' : formatMoney(d.total, d.moneda)}</td>
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
