import React, { useState, useEffect } from 'react';
import { Search, Loader2, Download, Copy } from 'lucide-react';
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
  1: { bg: 'bg-[#CBD5E1]', text: 'text-slate-900', weight: 'font-black', indent: 0 },
  2: { bg: 'bg-[#EFF6FF]', text: 'text-slate-800', weight: 'font-semibold', indent: 16 },
  3: { bg: 'bg-white',    text: 'text-slate-700', weight: 'font-normal', indent: 32 },
  4: { bg: 'bg-slate-50', text: 'text-slate-600', weight: 'font-normal', indent: 48 },
};
const getNivelStyle = (nivel: number) =>
  NIVEL_STYLES[nivel] ?? { bg: 'bg-white', text: 'text-slate-500', weight: 'font-normal', indent: (nivel - 1) * 16 };

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
    let textColor = 'text-slate-800';
    
    if (nivel === 1) {
      fontWeight = 'font-bold';
      bg = 'bg-slate-100';
      textColor = 'text-slate-900';
    } else if (nivel === 2) {
      paddingLeft = '1.5rem';
      bg = 'bg-slate-50';
    } else if (nivel >= 3) {
      paddingLeft = `${(nivel - 1) * 1.5 + 1.5}rem`;
      textColor = 'text-slate-600';
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
        <div className="w-full max-w-[1700px] h-full rounded shadow-2xl border border-slate-300 bg-[#E2E8F0] flex flex-col font-sans overflow-hidden min-h-[85vh]">

          {/* ── Barra de título estilo SAP ── */}
          <div className="bg-gradient-to-r from-[#475569] to-[#334155] text-white px-3 py-1.5 flex justify-between items-center shadow-md z-10 select-none">
            <span className="font-bold text-[11px] tracking-wide uppercase">
              HBT — Costo Actual de Producto Terminado
            </span>
            <div className="flex gap-2 text-white/80">
              <button onClick={handleMinimize} className="hover:text-white text-lg leading-none cursor-pointer px-1" title="Minimizar">_</button>
              <span className="hover:text-white text-lg leading-none cursor-pointer px-1">□</span>
              <span className="hover:text-white text-sm leading-none cursor-pointer font-bold px-1">✕</span>
            </div>
          </div>

          {/* ── Formulario de búsqueda ── */}
          <div className="bg-[#F1F5F9] px-4 py-3 border-b border-slate-300 flex flex-wrap items-end gap-4 shadow-inner">
            {/* @Code1 */}
            <div className="flex flex-col min-w-[260px]">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Artículo superior &nbsp;<span className="text-slate-400 font-normal normal-case">(@Code1)</span>
              </label>
              <input
                id="ldm-code1"
                type="text"
                value={code1}
                onChange={(e) => setCode1(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && fetchCostos()}
                className="border border-[#a1a1aa] rounded-sm px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400 uppercase bg-[#FFF4C2] font-semibold shadow-inner w-full"
                placeholder="Ej: VBAN01-0038-000-0100"
                autoComplete="off"
              />
            </div>

            {/* @Code2 */}
            <div className="flex flex-col min-w-[260px]">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Artículo superior &nbsp;<span className="text-slate-400 font-normal normal-case">(@Code2)</span>
              </label>
              <input
                id="ldm-code2"
                type="text"
                value={code2}
                onChange={(e) => setCode2(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && fetchCostos()}
                className="border border-[#a1a1aa] rounded-sm px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400 uppercase bg-[#FFF4C2] font-semibold shadow-inner w-full"
                placeholder="Ej: VBAN01-0038-000-0100"
                autoComplete="off"
              />
            </div>

            {/* Botón Ejecutar */}
            <button
              id="ldm-ejecutar"
              onClick={fetchCostos}
              disabled={isLoading || !code1.trim() || !code2.trim()}
              className={`px-5 py-1.5 rounded text-xs font-bold shadow-sm transition-all flex items-center gap-2 border cursor-pointer ${
                isLoading || !code1.trim() || !code2.trim()
                  ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                  : 'bg-[#F0C050] hover:bg-amber-400 text-slate-900 border-amber-500'
              }`}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {isLoading ? 'Consultando...' : 'Ejecutar'}
            </button>

            {/* Botón Cancelar */}
            <button
              id="ldm-cancelar"
              onClick={() => { setData([]); setError(null); setCode1(''); setCode2(''); }}
              className="px-5 py-1.5 rounded text-xs font-bold shadow-sm border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer"
            >
              Cancelar
            </button>

            {/* Botón Copiar datos */}
            {data.length > 0 && (
              <button
                id="ldm-exportar"
                onClick={exportExcel}
                className="ml-auto px-4 py-1.5 rounded text-xs font-bold shadow-sm border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Copiar datos
              </button>
            )}

            {/* Error */}
            {error && (
              <div className="w-full mt-1 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded border border-red-200">
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
              <thead className="bg-[#CBD5E1] sticky top-0 z-10 border-b-2 border-slate-400">
                <tr>
                  {['#','Codigo','Descripcion','UnidadMedida','Nivel','Cantidad','Costo_Unitario','Costo_Mp','Costo_Mo','Costo_Cif','Costo_Total'].map((col) => (
                    <th key={col} className="border border-slate-300 px-2 py-1.5 text-left font-bold text-slate-700 whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Vacío */}
                {data.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-slate-400 font-medium text-xs">
                      Ingrese los códigos de artículo y presione <strong>Ejecutar</strong> para consultar la lista de materiales con costos.
                    </td>
                  </tr>
                )}
                {/* Cargando */}
                {isLoading && (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-slate-400 font-medium text-xs">
                      <Loader2 className="w-6 h-6 animate-spin inline mr-2 text-amber-500" />
                      Consultando SAP Business One...
                    </td>
                  </tr>
                )}
                {/* Filas */}
                {!isLoading && data.map((row) => {
                  const s = getNivelStyle(row.Nivel);
                  return (
                    <tr key={row.index} className={`${s.bg} border-b border-slate-200 hover:bg-amber-50 transition-colors`}>
                      <td className="border-r border-slate-200 px-1 py-0.5 text-slate-400 text-center">{row.index}</td>
                      <td className={`border-r border-slate-200 px-2 py-0.5 ${s.weight} ${s.text} font-mono truncate`}>{row.Codigo}</td>
                      <td
                        className={`border-r border-slate-200 py-0.5 ${s.weight} ${s.text} truncate`}
                        style={{ paddingLeft: `${s.indent + 8}px` }}
                        title={row.Descripcion}
                      >{row.Descripcion}</td>
                      <td className="border-r border-slate-200 px-2 py-0.5 text-center text-slate-600">{row.UnidadMedida}</td>
                      <td className="border-r border-slate-200 px-2 py-0.5 text-center font-bold text-slate-700">{row.Nivel}</td>
                      <td className="border-r border-slate-200 px-2 py-0.5 text-right text-slate-700">{formatNumber(row.Cantidad)}</td>
                      <td className="border-r border-slate-200 px-2 py-0.5 text-right text-slate-700">{formatNumber(row.Costo_Unitario)}</td>
                      <td className={`border-r border-slate-200 px-2 py-0.5 text-right ${row.Costo_Mp > 0 ? 'text-blue-700 font-semibold' : 'text-slate-400'}`}>{formatNumber(row.Costo_Mp)}</td>
                      <td className={`border-r border-slate-200 px-2 py-0.5 text-right ${row.Costo_Mo > 0 ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>{formatNumber(row.Costo_Mo)}</td>
                      <td className={`border-r border-slate-200 px-2 py-0.5 text-right ${row.Costo_Cif > 0 ? 'text-violet-700 font-semibold' : 'text-slate-400'}`}>{formatNumber(row.Costo_Cif)}</td>
                      <td className={`px-2 py-0.5 text-right font-black ${row.Costo_Total > 0 ? 'text-slate-800' : 'text-slate-400'}`}>{formatNumber(row.Costo_Total)}</td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Fila de totales removida a petición */}
            </table>
          </div>

          {/* ── Barra de estado ── */}
          <div className="bg-[#E2E8F0] px-3 py-1.5 flex justify-between items-center border-t border-slate-400 text-[10px] text-slate-600 font-semibold shadow-inner z-10 select-none">
            <span>FIRPLAK SA &nbsp;|&nbsp; LDM Costos &nbsp;·&nbsp; HBT Costo Actual de Producto Terminado</span>
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
            className="fixed z-[9999] bg-white border border-slate-300 shadow-xl rounded w-64 text-sm text-slate-700 py-1"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              className="w-full text-left px-4 py-2 hover:bg-slate-100 flex items-center gap-2 cursor-pointer transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                copyTableToClipboard();
                setContextMenu(null);
              }}
            >
              <Copy className="w-4 h-4 text-slate-500" />
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
            className="fixed bottom-20 left-1/2 bg-slate-800 text-white px-4 py-2 rounded shadow-lg text-xs font-bold z-50 flex items-center gap-2"
          >
            <Copy className="w-4 h-4 text-green-400" />
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
            className="fixed bottom-4 left-6 z-50 flex items-center bg-white rounded shadow-xl border border-slate-300 overflow-hidden cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all"
            onClick={handleRestore}
          >
            <div className="bg-[#475569] w-2 h-full absolute left-0"></div>
            <div className="pl-4 pr-3 py-2 flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
                <Search className="w-4 h-4 text-slate-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">HBT - Costos</span>
                <span className="text-xs font-black text-slate-800">Costo Producto</span>
              </div>
              <div className="ml-2 w-6 h-6 flex items-center justify-center bg-slate-100 rounded hover:bg-slate-200 text-slate-500 text-lg font-bold">
                □
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
