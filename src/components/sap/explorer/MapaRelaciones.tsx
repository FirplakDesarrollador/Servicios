'use client';

import React, { useMemo, useState } from 'react';
import { SAP_DOC_TYPES, SAP_DOC_TYPE_ORDER, type SapDocSummary, type SapRelationshipMap } from '@/lib/sapExplorerTypes';
import { DOC_TYPE_STYLE, formatDate, formatMoney, formatQty, statusStyle } from './sapFormat';

const CARD_W = 196;
const CARD_H = 92;
const COL_GAP = 64;
const ROW_GAP = 14;
const PILL_H = 34;
/** Si un tipo tiene más documentos que esto en el mapa, se agrupan con un botón "+N más". */
const COLLAPSE_AFTER = 5;

interface Box {
  key: string;
  x: number;
  y: number;
  h: number;
  node?: SapDocSummary;
  /** Botón de grupo colapsado. */
  more?: { type: SapDocSummary['type']; hidden: number };
}

/**
 * Mapa de relaciones al estilo SAP B1: un documento por tarjeta, en columnas según el flujo
 * (oferta → pedido → OF/anticipo → entrega → factura/devolución → nota crédito) con flechas entre vínculos.
 */
export default function MapaRelaciones({
  map,
  onOpen,
}: {
  map: SapRelationshipMap;
  onOpen?: (node: SapDocSummary) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const layout = useMemo(() => {
    const byColumn = new Map<number, SapDocSummary[]>();
    for (const n of map.nodes) {
      const col = SAP_DOC_TYPES[n.type].column;
      byColumn.set(col, [...(byColumn.get(col) || []), n]);
    }
    const columns = [...byColumn.keys()].sort((a, b) => a - b);

    const boxes: Box[] = [];
    const boxOf = new Map<string, Box>();
    const colHeights: number[] = [];

    columns.forEach((col, colIdx) => {
      const nodes = byColumn.get(col)!.sort((a, b) => {
        const t = SAP_DOC_TYPE_ORDER.indexOf(a.type) - SAP_DOC_TYPE_ORDER.indexOf(b.type);
        if (t !== 0) return t;
        if (a.key === map.rootKey) return -1;
        if (b.key === map.rootKey) return 1;
        return (a.date || '').localeCompare(b.date || '') || a.docNum - b.docNum;
      });

      let y = 0;
      const x = colIdx * (CARD_W + COL_GAP);
      const types = [...new Set(nodes.map((n) => n.type))];
      for (const type of types) {
        const ofType = nodes.filter((n) => n.type === type);
        const collapse = ofType.length > COLLAPSE_AFTER + 1 && !expanded.has(type);
        // El documento consultado siempre queda visible.
        const visible = collapse
          ? [...ofType.filter((n) => n.key === map.rootKey), ...ofType.filter((n) => n.key !== map.rootKey)].slice(0, COLLAPSE_AFTER)
          : ofType;
        for (const node of visible) {
          const box: Box = { key: node.key, x, y, h: CARD_H, node };
          boxes.push(box);
          boxOf.set(node.key, box);
          y += CARD_H + ROW_GAP;
        }
        if (collapse) {
          const more: Box = { key: `more:${type}`, x, y, h: PILL_H, more: { type, hidden: ofType.length - visible.length } };
          boxes.push(more);
          for (const node of ofType) if (!boxOf.has(node.key)) boxOf.set(node.key, more);
          y += PILL_H + ROW_GAP;
        }
      }
      colHeights.push(Math.max(0, y - ROW_GAP));
    });

    // Centrar verticalmente cada columna respecto a la más alta.
    const height = Math.max(CARD_H, ...colHeights);
    columns.forEach((_, colIdx) => {
      const offset = (height - colHeights[colIdx]) / 2;
      for (const b of boxes) if (b.x === colIdx * (CARD_W + COL_GAP)) b.y += offset;
    });

    const seen = new Set<string>();
    const lines = map.edges.flatMap((e) => {
      const from = boxOf.get(e.from);
      const to = boxOf.get(e.to);
      if (!from || !to || from === to) return [];
      const id = `${from.key}>${to.key}`;
      if (seen.has(id)) return [];
      seen.add(id);
      const x1 = from.x + CARD_W;
      const y1 = from.y + from.h / 2;
      const x2 = to.x;
      const y2 = to.y + to.h / 2;
      const dx = Math.max(24, (x2 - x1) / 2);
      return [{ id, d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2 - 6} ${y2}` }];
    });

    return { boxes, lines, width: Math.max(CARD_W, columns.length * (CARD_W + COL_GAP) - COL_GAP), height };
  }, [map, expanded]);

  return (
    <div className="w-full overflow-x-auto">
      <div className="relative mx-auto" style={{ width: layout.width, height: layout.height }}>
        <svg className="absolute inset-0 pointer-events-none overflow-visible" width={layout.width} height={layout.height}>
          <defs>
            <marker id="mapa-flecha" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#94A3B8" />
            </marker>
          </defs>
          {layout.lines.map((l) => (
            <path key={l.id} d={l.d} fill="none" stroke="#94A3B8" strokeWidth={1.75} markerEnd="url(#mapa-flecha)" />
          ))}
        </svg>

        {layout.boxes.map((b) => {
          if (b.more) {
            const type = b.more.type;
            return (
              <button
                key={b.key}
                onClick={() => setExpanded((prev) => new Set(prev).add(type))}
                className="absolute rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 transition-colors cursor-pointer"
                style={{ left: b.x, top: b.y, width: CARD_W, height: b.h }}
              >
                Ver {b.more.hidden} más · {SAP_DOC_TYPES[type].label}
              </button>
            );
          }
          const n = b.node!;
          const info = SAP_DOC_TYPES[n.type];
          const style = DOC_TYPE_STYLE[n.type];
          const isRoot = n.key === map.rootKey;
          return (
            <button
              key={b.key}
              onClick={() => onOpen?.(n)}
              title={isRoot ? 'Documento consultado' : 'Abrir documento'}
              className={`absolute text-left rounded-xl bg-white border shadow-sm overflow-hidden transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                isRoot ? 'border-amber-400 ring-4 ring-amber-300/40' : 'border-slate-200 hover:border-slate-300'
              }`}
              style={{ left: b.x, top: b.y, width: CARD_W, height: b.h }}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.bar}`} />
              <div className="pl-3.5 pr-2.5 py-2 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">{info.label}</span>
                  <span className={`shrink-0 px-1.5 py-px rounded-full border text-[9px] font-bold ${statusStyle(n.status)}`}>{n.status}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-base font-black text-slate-800 tabular-nums">{n.docNum}</span>
                  <span className="text-[10px] text-slate-500 tabular-nums">{formatDate(n.date)}</span>
                </div>
                <div className="text-[11px] text-slate-600 truncate tabular-nums">
                  {n.type === 'ProductionOrder'
                    ? `${formatQty(n.completedQty)}/${formatQty(n.plannedQty)} · ${n.itemName || n.itemCode || ''}`
                    : formatMoney(n.total, n.currency)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {map.truncated && (
        <p className="mt-4 text-center text-xs text-amber-700">
          El mapa tiene muchos documentos vinculados; se muestran los primeros {map.nodes.length}.
        </p>
      )}
    </div>
  );
}
