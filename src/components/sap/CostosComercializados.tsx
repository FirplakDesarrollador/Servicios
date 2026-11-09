'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, Loader2, RefreshCw, Search, Tags } from 'lucide-react';
import type { CostoComercializado } from '@/lib/sapCostosComercializados';
import { formatMoney } from './explorer/sapFormat';
import { fetchConSesion } from '@/lib/fetchConSesion';

const tarjeta = 'bg-white rounded-2xl border border-border';
const MAX_FILAS = 500;

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function Mensaje({ icono: Icono = AlertCircle, texto, girando = false }: { icono?: React.ElementType; texto: string; girando?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2 py-14 text-sm text-stone-500">
      <Icono className={`w-5 h-5 ${girando ? 'animate-spin' : ''}`} aria-hidden />
      <span>{texto}</span>
    </div>
  );
}

/**
 * Costos Comercializados: réplica de la consulta "ANG - Costos Comercializados" del Query Manager.
 * Muestra el costo promedio actual por artículo en MP-01 y PT-01 (artículos activos de los grupos de la consulta).
 */
export default function CostosComercializados() {
  const [costos, setCostos] = useState<CostoComercializado[] | null>(null);
  const [consultado, setConsultado] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [bodega, setBodega] = useState('');
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    const control = new AbortController();
    setCargando(true);
    setError(null);
    fetchConSesion('/api/sap/costos-comercializados', { signal: control.signal })
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) return setError(j.error || 'No se pudo hacer la consulta.');
        setCostos(j.costos);
        setConsultado(j.consultado);
      })
      .catch((e) => { if (e.name !== 'AbortError') setError('No se pudo conectar con SAP. Intenta de nuevo.'); })
      .finally(() => { if (!control.signal.aborted) setCargando(false); });
    return () => control.abort();
  }, [recarga]);

  const bodegas = useMemo(() => [...new Set((costos || []).map((c) => c.bodega))].sort(), [costos]);

  const filtrados = useMemo(() => {
    const q = normalizar(texto.trim());
    return (costos || []).filter((c) =>
      (!bodega || c.bodega === bodega) &&
      (!q || normalizar(`${c.codigo} ${c.descripcion}`).includes(q))
    );
  }, [costos, texto, bodega]);

  const exportarExcel = async () => {
    if (filtrados.length === 0) return;
    const XLSX = await import('xlsx');
    const hoja = XLSX.utils.json_to_sheet(filtrados.map((c) => ({
      ItemCode: c.codigo,
      ItemName: c.descripcion,
      Warehouse: c.bodega,
      WhsName: c.nombreBodega,
      AvgPrice: c.costoPromedio,
    })));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Costos Comercializados');
    XLSX.writeFile(libro, `Costos_Comercializados_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className={`${tarjeta} grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-2 p-2`}>
        <label className="flex items-center gap-2 h-11 px-3 rounded-xl border border-border">
          <Search className="w-4 h-4 text-brand-light shrink-0" aria-hidden />
          <span className="sr-only">Buscar por código o descripción</span>
          <input
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Código o descripción del artículo"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-brand-dark placeholder:text-stone-500"
          />
        </label>
        <label className="flex items-center h-11 px-3 rounded-xl border border-border text-sm">
          <span className="sr-only">Bodega</span>
          <select value={bodega} onChange={(e) => setBodega(e.target.value)} className="bg-transparent outline-none text-brand-dark cursor-pointer">
            <option value="">Todas las bodegas</option>
            {bodegas.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <button
          onClick={() => setRecarga((n) => n + 1)}
          disabled={cargando}
          className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-border text-sm font-medium text-brand hover:border-brand-light hover:bg-cream-light disabled:opacity-50 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} aria-hidden /> Actualizar
        </button>
        <button
          onClick={exportarExcel}
          disabled={filtrados.length === 0}
          className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover disabled:opacity-50 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" aria-hidden /> Excel
        </button>
      </div>

      <div className={tarjeta}>
        {cargando && <Mensaje icono={Loader2} girando texto="Consultando los costos en SAP… puede tardar unos segundos." />}
        {!cargando && error && <Mensaje texto={error} />}
        {!cargando && !error && costos && filtrados.length === 0 && (
          <Mensaje icono={Tags} texto={texto || bodega ? 'No hay artículos con esa búsqueda.' : 'La consulta no devolvió artículos.'} />
        )}
        {!cargando && !error && filtrados.length > 0 && (
          <>
            <div className="px-5 pt-4 pb-2 flex flex-wrap items-baseline justify-between gap-2 text-xs text-stone-500">
              <span>
                {filtrados.length.toLocaleString('es-CO')} artículo(s)
                {filtrados.length > MAX_FILAS ? ` · se muestran los primeros ${MAX_FILAS}; busca o exporta a Excel para verlos todos` : ''}
              </span>
              {consultado && <span>Costo promedio actual de SAP · consultado el {fechaHora(consultado)}</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-[11px] text-stone-500 border-b border-border">
                    <th className="py-2 pl-5 pr-3 font-medium">Código</th>
                    <th className="py-2 px-3 font-medium">Descripción</th>
                    <th className="py-2 px-3 font-medium">Bodega</th>
                    <th className="py-2 pl-3 pr-5 font-medium text-right">Costo promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.slice(0, MAX_FILAS).map((c) => (
                    <tr key={`${c.codigo}-${c.bodega}`} className="border-b border-border last:border-0 hover:bg-cream-light transition-colors">
                      <td className="py-2 pl-5 pr-3 font-medium text-brand-dark">{c.codigo}</td>
                      <td className="py-2 px-3 whitespace-normal min-w-[260px] text-brand-dark">{c.descripcion}</td>
                      <td className="py-2 px-3 text-stone-600" title={c.nombreBodega}>{c.bodega}</td>
                      <td className="py-2 pl-3 pr-5 text-right tabular-nums font-semibold text-brand-dark">{formatMoney(c.costoPromedio)}</td>
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
