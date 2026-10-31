import React, { useState, useEffect } from 'react';
import { Search, Loader2, Download, Copy, Boxes, Minus, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

interface LDMCostosProps {
  onMinimizeChange?: (isMinimized: boolean) => void;
}

interface LDMRow {
  index: number;
  Codigo: string;
  Descripcion: string;
  UnidadMedida: string;
  Nivel: number;
  Cantidad: number;
  Costo_Unitario: number;
  Costo_Mp: number;
  Costo_Mo: number;
  Costo_Cif: number;
  Costo_Total: number;
}

const formatNumber = (num: number) => {
  if (num === null || num === undefined || isNaN(num)) return '—';
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

/** Paleta de colores por nivel, igual a SAP */
const NIVEL_STYLES: Record<number, { bg: string; text: string; weight: string; indent: number }> = {
  1: { bg: 'bg-cream', text: 'text-brand-dark', weight: 'font-bold', indent: 0 },
  2: { bg: 'bg-white', text: 'text-brand-dark', weight: 'font-semibold', indent: 16 },
  3: { bg: 'bg-white',    text: 'text-stone-600', weight: 'font-normal', indent: 32 },
  4: { bg: 'bg-cream-light', text: 'text-stone-500', weight: 'font-normal', indent: 48 },
};
const getNivelStyle = (nivel: number) =>
  NIVEL_STYLES[nivel] ?? { bg: 'bg-white', text: 'text-stone-500', weight: 'font-normal', indent: (nivel - 1) * 16 };

export default function LDMCostos({ onMinimizeChange }: LDMCostosProps) {
  const [code1, setCode1] = useState('');
  const [code2, setCode2] = useState('');
  const [data, setData] = useState<LDMRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const copyTableToClipboard = async () => {
    if (!data.length) return;
    const headers = ['Codigo','Descripcion','UnidadMedida','Nivel','Cantidad','Costo_Unitario','Costo_Mp','Costo_Mo','Costo_Cif','Costo_Total'];
    const rows = data.map(r =>
      [r.Codigo, r.Descripcion, r.UnidadMedida, r.Nivel, r.Cantidad, r.Costo_Unitario, r.Costo_Mp, r.Costo_Mo, r.Costo_Cif, r.Costo_Total].join('\t')
    );
    const tsv = [headers.join('\t'), ...rows].join('\n');
    try {
      await navigator.clipboard.writeText(tsv);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const exportExcel = () => {
    if (!data.length) return;
    
    const worksheetData = data.map(r => ({
      'Codigo': r.Codigo,
      'Descripcion': r.Descripcion,
      'UnidadMedida': r.UnidadMedida,
      'Nivel': r.Nivel,
      'Cantidad': r.Cantidad,
      'Costo_Unitario': r.Costo_Unitario,
      'Costo_Mp': r.Costo_Mp,
      'Costo_Mo': r.Costo_Mo,
      'Costo_Cif': r.Costo_Cif,
      'Costo_Total': r.Costo_Total
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Costos LDM");
    
    XLSX.writeFile(workbook, `LDM_Costos_${code1}.xlsx`);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    if (onMinimizeChange) onMinimizeChange(true);
  };

  const handleRestore = () => {
    setIsMinimized(false);
    if (onMinimizeChange) onMinimizeChange(false);
  };

  const fetchCostos = async () => {
    if (!code1.trim() || !code2.trim()) return;
    setIsLoading(true);
    setError(null);
    setData([]);
    try {
      const url = `/api/sap/ldm-costos?code1=${encodeURIComponent(code1.trim())}&code2=${encodeURIComponent(code2.trim())}`;
      const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });

      if (!res.ok) {
        let errStr = `Error API: ${res.status} ${res.statusText}`;
        try {
          const errJson = await res.json();
          if (errJson?.error) errStr = errJson.error;
        } catch (_) {}
        throw new Error(errStr);
      }

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      const formattedData: LDMRow[] = Array.isArray(json)
        ? json.map((item: any, idx: number) => ({
            index: idx + 1,
            Codigo: item.Codigo ?? item.codigo ?? item.Code ?? '',
            Descripcion: item.Descripcion ?? item.descripcion ?? item.Description ?? '',
            UnidadMedida: item.UnidadMedida ?? item.unidad_medida ?? item.UoM ?? '',
            Nivel: parseInt(item.Nivel ?? item.nivel ?? item.Level ?? '1') || 1,
            Cantidad: parseFloat(item.Cantidad ?? item.cantidad ?? item.Quantity ?? '0') || 0,
            Costo_Unitario: parseFloat(item.Costo_Unitario ?? item.costo_unitario ?? item.UnitCost ?? '0') || 0,
            Costo_Mp: parseFloat(item.Costo_Mp ?? item.costo_mp ?? item.MpCost ?? '0') || 0,
            Costo_Mo: parseFloat(item.Costo_Mo ?? item.costo_mo ?? item.MoCost ?? '0') || 0,
            Costo_Cif: parseFloat(item.Costo_Cif ?? item.costo_cif ?? item.CifCost ?? '0') || 0,
            Costo_Total: parseFloat(item.Costo_Total ?? item.costo_total ?? item.TotalCost ?? '0') || 0,
          }))
        : [];

      setData(formattedData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al consultar la API');
    } finally {
      setIsLoading(false);
    }
  };

  /* Totales: toma la fila nivel 1 (producto terminado) */
  const totals = data.length > 0 && data[0].Nivel === 1 ? data[0] : null;

  const getRowStyle = (nivel: number) => {
    let paddingLeft = '0.5rem';
    let bg = 'bg-white';
    let fontWeight = 'font-normal';
    let textColor = 'text-brand-dark';
    
    if (nivel === 1) {
      fontWeight = 'font-bold';
      bg = 'bg-cream-light';
      textColor = 'text-brand-dark';
    } else if (nivel === 2) {
      paddingLeft = '1.5rem';
      bg = 'bg-cream-light';
    } else if (nivel >= 3) {
      paddingLeft = `${(nivel - 1) * 1.5 + 1.5}rem`;
      textColor = 'text-stone-500';
    }

    return { paddingLeft, bg, fontWeight, textColor };
  };

  return (
    <>
      {/* ── Panel principal ── */}
      <div
        className={`transition-all duration-300 w-full h-full flex flex-col items-center ${
          isMinimized ? 'opacity-0 scale-95 pointer-events-none absolute' : 'opacity-100 scale-100 relative z-10'
        }`}
      >
        <div className="w-full max-w-[1700px] h-full rounded-2xl border border-border bg-white flex flex-col font-sans overflow-hidden min-h-[85vh]">

          {/* ── Encabezado ── */}
          <div className="px-5 py-3.5 border-b border-border flex justify-between items-center gap-4 select-none">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center shrink-0">
                <Boxes className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-medium tracking-[0.16em] uppercase text-brand-light">LDM Costos</p>
                <h2 className="text-base font-semibold text-brand-dark truncate">Costo actual de producto terminado</h2>
              </div>
            </div>
            <button
              onClick={handleMinimize}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-brand hover:bg-cream-light transition-colors cursor-pointer"
              title="Minimizar"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          {/* ── Formulario de búsqueda ── */}
          <div className="bg-cream-light px-5 py-4 border-b border-border flex flex-wrap items-end gap-4">
            {/* @Code1 */}
            <div className="flex flex-col min-w-[260px]">
              <label className="text-[10px] font-medium text-brand-light uppercase tracking-[0.14em] mb-1.5">
                Artículo superior desde
              </label>
              <input
                id="ldm-code1"
                type="text"
                value={code1}
                onChange={(e) => setCode1(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && fetchCostos()}
                className="h-10 border border-border rounded-xl px-3 text-sm text-brand-dark focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand-light uppercase bg-white font-medium w-full transition-colors"
                placeholder="Ej: VBAN01-0038-000-0100"
                autoComplete="off"
              />
            </div>

            {/* @Code2 */}
            <div className="flex flex-col min-w-[260px]">
              <label className="text-[10px] font-medium text-brand-light uppercase tracking-[0.14em] mb-1.5">
                Artículo superior hasta
              </label>
              <input
                id="ldm-code2"
                type="text"
                value={code2}
                onChange={(e) => setCode2(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && fetchCostos()}
                className="h-10 border border-border rounded-xl px-3 text-sm text-brand-dark focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand-light uppercase bg-white font-medium w-full transition-colors"
                placeholder="Ej: VBAN01-0038-000-0100"
                autoComplete="off"
              />
            </div>

            {/* Botón Ejecutar */}
            <button
              id="ldm-ejecutar"
              onClick={fetchCostos}
              disabled={isLoading || !code1.trim() || !code2.trim()}
              className={`h-10 px-5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 border cursor-pointer ${
                isLoading || !code1.trim() || !code2.trim()
                  ? 'bg-stone-100 text-stone-400 border-border cursor-not-allowed'
                  : 'bg-brand hover:bg-brand-hover text-white border-brand'
              }`}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {isLoading ? 'Consultando...' : 'Ejecutar'}
            </button>

            {/* Botón Cancelar */}
            <button
              id="ldm-cancelar"
              onClick={() => { setData([]); setError(null); setCode1(''); setCode2(''); }}
              className="h-10 px-5 rounded-xl text-sm font-medium border border-border bg-white hover:border-brand-light hover:text-brand text-stone-600 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            {/* Botón Copiar datos */}
            {data.length > 0 && (
              <button
                id="ldm-exportar"
                onClick={exportExcel}
                className="ml-auto h-10 px-4 rounded-xl text-sm font-medium border border-border bg-white hover:border-brand-light hover:text-brand text-stone-600 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Copiar datos
              </button>
            )}

            {/* Error */}
            {error && (
              <div className="w-full mt-1 text-xs font-medium text-red-700 bg-red-50 px-3 py-2 rounded-xl border border-red-200">
                {error}
              </div>
            )}
          </div>

          {/* ── Tabla de resultados ── */}
          <div className="flex-1 overflow-auto bg-white" onContextMenu={handleContextMenu}>
            <table className="w-full text-[11px] border-collapse" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '36px' }} />
                <col style={{ width: '180px' }} />
                <col style={{ width: 'auto' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '50px' }} />
                <col style={{ width: '90px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '110px' }} />
              </colgroup>
              <thead className="bg-cream-light sticky top-0 z-10 border-b border-border">
                <tr>
                  {['#','Código','Descripción','Unidad','Nivel','Cantidad','Costo unitario','Costo MP','Costo MO','Costo CIF','Costo total'].map((col) => (
                    <th key={col} className="border-b border-border px-2 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-stone-400 whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Vacío */}
                {data.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-stone-400 font-medium text-xs">
                      Ingrese los códigos de artículo y presione <strong>Ejecutar</strong> para consultar la lista de materiales con costos.
                    </td>
                  </tr>
                )}
                {/* Cargando */}
                {isLoading && (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-stone-400 font-medium text-xs">
                      <Loader2 className="w-6 h-6 animate-spin inline mr-2 text-brand-light" />
                      Consultando SAP Business One...
                    </td>
                  </tr>
                )}
                {/* Filas */}
                {!isLoading && data.map((row) => {
                  const s = getNivelStyle(row.Nivel);
                  return (
                    <tr key={row.index} className={`${s.bg} border-b border-border/70 hover:bg-sage-soft transition-colors`}>
                      <td className="border-r border-border/70 px-1 py-0.5 text-stone-400 text-center">{row.index}</td>
                      <td className={`border-r border-border/70 px-2 py-0.5 ${s.weight} ${s.text} font-mono truncate`}>{row.Codigo}</td>
                      <td
                        className={`border-r border-border/70 py-0.5 ${s.weight} ${s.text} truncate`}
                        style={{ paddingLeft: `${s.indent + 8}px` }}
                        title={row.Descripcion}
                      >{row.Descripcion}</td>
                      <td className="border-r border-border/70 px-2 py-0.5 text-center text-stone-500">{row.UnidadMedida}</td>
                      <td className="border-r border-border/70 px-2 py-0.5 text-center font-bold text-stone-600">{row.Nivel}</td>
                      <td className="border-r border-border/70 px-2 py-0.5 text-right text-stone-600">{formatNumber(row.Cantidad)}</td>
                      <td className="border-r border-border/70 px-2 py-0.5 text-right text-stone-600">{formatNumber(row.Costo_Unitario)}</td>
                      <td className={`border-r border-border/70 px-2 py-0.5 text-right ${row.Costo_Mp > 0 ? 'text-brand font-semibold' : 'text-stone-400'}`}>{formatNumber(row.Costo_Mp)}</td>
                      <td className={`border-r border-border/70 px-2 py-0.5 text-right ${row.Costo_Mo > 0 ? 'text-[#3E6E5E] font-semibold' : 'text-stone-400'}`}>{formatNumber(row.Costo_Mo)}</td>
                      <td className={`border-r border-border/70 px-2 py-0.5 text-right ${row.Costo_Cif > 0 ? 'text-[#9A7442] font-semibold' : 'text-stone-400'}`}>{formatNumber(row.Costo_Cif)}</td>
                      <td className={`px-2 py-0.5 text-right font-bold ${row.Costo_Total > 0 ? 'text-brand-dark' : 'text-stone-400'}`}>{formatNumber(row.Costo_Total)}</td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Fila de totales removida a petición */}
            </table>
          </div>

          {/* ── Barra de estado ── */}
          <div className="bg-white px-5 py-2.5 flex justify-between items-center border-t border-border text-[11px] text-stone-400 z-10 select-none">
            <span>FIRPLAK · LDM Costos</span>
            <span>{data.length > 0 ? `${data.length} líneas recuperadas` : 'Listo'}</span>
          </div>
        </div>
      </div>

      {/* Menú contextual (Clic derecho) */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-[9999] bg-white border border-border shadow-[0_20px_40px_-16px_rgba(37,65,83,0.45)] rounded-xl w-64 text-sm text-stone-600 p-1"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-cream-light flex items-center gap-2 cursor-pointer transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                copyTableToClipboard();
                setContextMenu(null);
              }}
            >
              <Copy className="w-4 h-4 text-stone-500" />
              Copiar tabla al portapapeles
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mensaje de confirmación */}
      <AnimatePresence>
        {copyFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-20 left-1/2 bg-brand text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium z-50 flex items-center gap-2"
          >
            <Copy className="w-4 h-4 text-brand-light" />
            ¡Tabla copiada al portapapeles! (Pega directamente en Excel)
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-4 left-6 z-50 w-72 flex items-center gap-3 bg-white rounded-2xl border border-border pl-2 pr-3 py-2 cursor-pointer shadow-[0_12px_30px_-12px_rgba(37,65,83,0.45)] hover:border-brand-light transition-colors"
            onClick={handleRestore}
            title="Restaurar"
          >
            <span className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center shrink-0"><Boxes className="w-4 h-4" /></span>
            <span className="flex-1 text-sm font-semibold text-brand-dark truncate">LDM Costos</span>
            <Maximize2 className="w-4 h-4 text-stone-400" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
