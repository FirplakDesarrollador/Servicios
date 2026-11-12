'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SAP_DOC_TYPES, SAP_DOC_TYPE_ORDER, type SapDocSummary, type SapRelationshipMap } from '@/lib/sapExplorerTypes';
import { DOC_TYPE_STYLE, formatDate, formatMoney, formatQty, statusStyle } from './sapFormat';

const CARD_W = 208;
const CARD_H = 92;
const COL_GAP = 44;
const ROW_GAP = 14;
const PILL_H = 34;
/** Si un tipo tiene más documentos que esto en el mapa, se agrupan con un botón "+N más". */
const COLLAPSE_AFTER = 5;
/** Lo más que se achica el mapa para que quepa a lo ancho; si con eso no cabe, se desplaza. */
const ESCALA_MINIMA = 0.85;

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
    // Columna según el tipo; si un documento sale de otro de la misma columna o de una posterior
    // (p. ej. la cancelación de una nota crédito), pasa a la siguiente, como en SAP.
    const nodo = new Map(map.nodes.map((n) => [n.key, n]));
    const colOf = new Map<string, number>(map.nodes.map((n) => [n.key, SAP_DOC_TYPES[n.type].column]));
    for (let pasada = 0; pasada < map.nodes.length; pasada++) {
      let cambio = false;
      for (const e of map.edges) {
        const desde = colOf.get(e.from);
        const hasta = colOf.get(e.to);
        if (desde === undefined || hasta === undefined || hasta > desde) continue;
        // Solo hacia adelante en el flujo: un vínculo hacia un tipo anterior no mueve nada
        if (SAP_DOC_TYPE_ORDER.indexOf(nodo.get(e.to)!.type) < SAP_DOC_TYPE_ORDER.indexOf(nodo.get(e.from)!.type)) continue;
        colOf.set(e.to, desde + 0.5);
        cambio = true;
      }
      if (!cambio) break;
    }
    const byColumn = new Map<number, SapDocSummary[]>();
    for (const n of map.nodes) {
      const col = colOf.get(n.key)!;
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
      return [{ id, referencia: !!e.referencia, d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2 - 6} ${y2}` }];
    });

    return { boxes, lines, conReferencias: lines.some((l) => l.referencia), width: Math.max(CARD_W, columns.length * (CARD_W + COL_GAP) - COL_GAP), height };
  }, [map, expanded]);

  // Ancho disponible para calcular cuánto achicar el mapa
  const contenedor = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const medir = () => setAncho(el.clientWidth);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, []);
  const escala = ancho > 0 && layout.width > ancho ? Math.max(ESCALA_MINIMA, ancho / layout.width) : 1;

  return (
    <div ref={contenedor} className="w-full overflow-x-auto pb-2">
      {/* Se achica para que el mapa completo quepa a lo ancho; por debajo de ESCALA_MINIMA se desplaza */}
      <div className="mx-auto" style={{ width: layout.width * escala, height: layout.height * escala }}>
      <div className="relative origin-top-left" style={{ width: layout.width, height: layout.height, transform: escala < 1 ? `scale(${escala})` : undefined }}>
        <svg className="absolute inset-0 pointer-events-none overflow-visible" width={layout.width} height={layout.height}>
          <defs>
            <marker id="mapa-flecha" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--serie-oliva)" />
            </marker>
            <marker id="mapa-flecha-ref" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-red-500, #ef4444)" />
            </marker>
          </defs>
          {layout.lines.map((l) =>
            l.referencia ? (
              <path key={l.id} d={l.d} fill="none" stroke="var(--color-red-500, #ef4444)" strokeOpacity={0.8} strokeWidth={1.5} strokeDasharray="3 4" markerEnd="url(#mapa-flecha-ref)" />
            ) : (
              <path key={l.id} d={l.d} fill="none" stroke="var(--serie-oliva)" strokeOpacity={0.7} strokeWidth={1.5} markerEnd="url(#mapa-flecha)" />
            )
          )}
        </svg>

        {layout.boxes.map((b) => {
          if (b.more) {
            const type = b.more.type;
            return (
              <button
                key={b.key}
                onClick={() => setExpanded((prev) => new Set(prev).add(type))}
                className="absolute rounded-xl border border-dashed border-brand-light/60 bg-cream-light hover:bg-sage-soft text-xs font-medium text-brand transition-colors cursor-pointer"
                style={{ left: b.x, top: b.y, width: CARD_W, height: b.h }}
              >
                Ver {b.more.hidden} más · {SAP_DOC_TYPES[type].label}
              </button>
            );
          }
          const n = b.node!;
          const info = SAP_DOC_TYPES[n.type];
          const style = DOC_TYPE_STYLE[n.type];
          const Icon = style.icon;
          const isRoot = n.key === map.rootKey;
          return (
            <button
              key={b.key}
              onClick={() => onOpen?.(n)}
              title={isRoot ? 'Documento consultado' : 'Abrir documento'}
              className={`absolute text-left rounded-xl bg-white border transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-14px_rgba(37,65,83,0.45)] ${
                isRoot ? 'border-brand ring-4 ring-brand/10' : 'border-border hover:border-brand-light'
              }`}
              style={{ left: b.x, top: b.y, width: CARD_W, height: b.h }}
            >
              <div className="px-3 py-2.5 h-full flex flex-col justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-6 h-6 shrink-0 rounded-md flex items-center justify-center ${style.soft} ${style.text}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="flex-1 text-[11px] font-medium text-stone-500 truncate">{info.label}</span>
                  <span className={`shrink-0 px-1.5 py-px rounded-full text-[9px] font-semibold ${statusStyle(n.status)}`}>{n.status}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[17px] font-semibold text-brand-dark tabular-nums">{n.docNum}</span>
                  <span className="text-[10px] text-stone-400 tabular-nums">{formatDate(n.date)}</span>
                </div>
                <div className="text-[11px] text-stone-500 truncate tabular-nums">
                  {n.type === 'ProductionOrder'
                    ? `${formatQty(n.completedQty)}/${formatQty(n.plannedQty)} · ${n.itemName || n.itemCode || ''}`
                    : formatMoney(n.total, n.currency)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      </div>
      {layout.conReferencias && (
        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-ink-muted">
          <svg width="28" height="6" aria-hidden><line x1="0" y1="3" x2="28" y2="3" stroke="var(--color-red-500, #ef4444)" strokeWidth="1.5" strokeDasharray="3 4" /></svg>
          Documento referenciado (pestaña &quot;Documentos referenciados&quot; de SAP)
        </p>
      )}
      {map.truncated && (
        <p className="mt-4 text-center text-xs text-ink-muted">
          El mapa tiene muchos documentos vinculados; se muestran los primeros {map.nodes.length}.
        </p>
      )}
    </div>
  );
}
