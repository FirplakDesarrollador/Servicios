'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Search, Loader2, User, Building2, Phone, Mail, MapPin, FileText, ExternalLink,
  ChevronRight, AlertCircle, GitBranch, Users, X,
} from 'lucide-react';
import {
  SAP_DOC_TYPES,
  SAP_DOC_TYPE_ORDER,
  type SapBusinessPartner,
  type SapCustomer360,
  type SapDocDetail,
  type SapDocList,
  type SapDocSummary,
  type SapDocType,
  type SapRelationshipMap,
  type SapSearchResult,
} from '@/lib/sapExplorerTypes';
import MapaRelaciones from './explorer/MapaRelaciones';
import { DOC_TYPE_STYLE, formatDate, formatMoney, formatQty, statusStyle } from './explorer/sapFormat';

export type ClassicSapMode = 'Quotation' | 'Order' | 'Delivery' | 'Invoice' | 'ProductionOrder';

type View =
  | { kind: 'search'; query: string }
  | { kind: 'customer'; cardCode: string; label?: string }
  | { kind: 'document'; type: SapDocType; docEntry: number; label?: string };

// ── Datos ──────────────────────────────────────────────────────────────────────

// Caché en memoria del navegador: volver atrás o reabrir algo consultado hace poco es instantáneo.
const CACHE_TTL_MS = 2 * 60 * 1000;
const responseCache = new Map<string, { at: number; data: any }>();

function useSapData<T>(url: string | null): { data: T | null; error: string | null; loading: boolean } {
  const cached = url ? responseCache.get(url) : undefined;
  const fresh = cached && Date.now() - cached.at < CACHE_TTL_MS ? (cached.data as T) : null;
  const [state, setState] = useState<{ url: string | null; data: T | null; error: string | null }>({
    url,
    data: fresh,
    error: null,
  });

  useEffect(() => {
    if (!url) return;
    const hit = responseCache.get(url);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      setState({ url, data: hit.data as T, error: null });
      return;
    }
    setState({ url, data: null, error: null });
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || json.success === false || json.error) {
          throw new Error(json.error || json.message || `Error ${res.status}`);
        }
        responseCache.set(url, { at: Date.now(), data: json });
        setState({ url, data: json as T, error: null });
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        setState({ url, data: null, error: err.message || 'Error consultando SAP' });
      });
    return () => controller.abort();
  }, [url]);

  const current = state.url === url ? state : { data: fresh, error: null };
  return { data: current.data, error: current.error, loading: !!url && !current.data && !current.error };
}

// ── Piezas visuales ────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: SapDocType }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${DOC_TYPE_STYLE[type].badge}`}>
      {SAP_DOC_TYPES[type].label}
    </span>
  );
}

function StatusBadge({ status }: { status: SapDocSummary['status'] }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${statusStyle(status)}`}>{status}</span>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <Loader2 className="w-5 h-5 animate-spin text-brand" />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <AlertCircle className="w-5 h-5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function Section({ title, icon: Icon, right, children }: { title: string; icon: React.ElementType; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-tight">
          <Icon className="w-4 h-4 text-brand" />
          {title}
        </h3>
        {right}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Tabla de documentos. Clic en una fila abre el documento. */
function DocTable({ docs, onOpen, showType = true, showCustomer = true }: {
  docs: SapDocSummary[];
  onOpen: (doc: SapDocSummary) => void;
  showType?: boolean;
  showCustomer?: boolean;
}) {
  if (docs.length === 0) {
    return <p className="text-sm text-slate-400 py-6 text-center">Sin documentos.</p>;
  }
  const isPO = docs.every((d) => d.type === 'ProductionOrder');
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
            {showType && <th className="px-5 py-2 font-bold">Tipo</th>}
            <th className="px-3 py-2 font-bold">Número</th>
            <th className="px-3 py-2 font-bold">Fecha</th>
            {showCustomer && <th className="px-3 py-2 font-bold">Cliente</th>}
            {isPO ? <th className="px-3 py-2 font-bold">Artículo</th> : <th className="px-3 py-2 font-bold">Orden de compra</th>}
            <th className="px-3 py-2 font-bold text-right">{isPO ? 'Cant.' : 'Total'}</th>
            <th className="px-5 py-2 font-bold">Estado</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.key} onClick={() => onOpen(d)} className="border-t border-slate-100 hover:bg-amber-50/60 cursor-pointer transition-colors">
              {showType && <td className="px-5 py-2.5"><TypeBadge type={d.type} /></td>}
              <td className="px-3 py-2.5 font-black text-slate-800 tabular-nums">{d.docNum}</td>
              <td className="px-3 py-2.5 text-slate-600 tabular-nums whitespace-nowrap">{formatDate(d.date)}</td>
              {showCustomer && (
                <td className="px-3 py-2.5 text-slate-700 max-w-[260px]">
                  <div className="truncate font-semibold">{d.cardName || d.cardCode || '—'}</div>
                  {d.cardName && <div className="text-[11px] text-slate-400">{d.cardCode}</div>}
                </td>
              )}
              {isPO ? (
                <td className="px-3 py-2.5 text-slate-600 max-w-[280px] truncate">{d.itemName || d.itemCode}</td>
              ) : (
                <td className="px-3 py-2.5 text-slate-600 tabular-nums">{d.numAtCard || '—'}</td>
              )}
              <td className="px-3 py-2.5 text-right font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                {d.type === 'ProductionOrder' ? `${formatQty(d.completedQty)}/${formatQty(d.plannedQty)}` : formatMoney(d.total, d.currency)}
              </td>
              <td className="px-5 py-2.5"><StatusBadge status={d.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PartnerCard({ p, onOpen }: { p: SapBusinessPartner; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="text-left bg-white rounded-2xl border border-slate-200 p-4 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5 transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center shrink-0">
          {p.cardCode.startsWith('CN') ? <User className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-800 leading-tight group-hover:text-brand transition-colors">{p.cardName}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {p.cardCode} · NIT/CC {p.federalTaxId || '—'} · <span className="font-semibold">{p.cardType}</span>
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-500">
            {p.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{p.city}</span>}
            {(p.cellular || p.phone) && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{p.cellular || p.phone}</span>}
            {p.email && <span className="inline-flex items-center gap-1 truncate max-w-[220px]"><Mail className="w-3 h-3" />{p.email}</span>}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand group-hover:translate-x-0.5 transition-all mt-1" />
      </div>
    </button>
  );
}

// ── Vistas ─────────────────────────────────────────────────────────────────────

function SearchView({ query, go }: { query: string; go: (v: View) => void }) {
  const { data, error, loading } = useSapData<SapSearchResult>(query.length >= 2 ? `/api/sap/search?q=${encodeURIComponent(query)}` : null);
  const [typeFilter, setTypeFilter] = useState<SapDocType | 'all'>('all');

  if (query.length < 2) return <SearchHelp />;
  if (loading) return <Loading label={`Buscando "${query}" en SAP…`} />;
  if (error) return <ErrorBox message={error} />;
  if (!data) return null;

  const typesFound = SAP_DOC_TYPE_ORDER.filter((t) => data.documents.some((d) => d.type === t));
  const docs = typeFilter === 'all' ? data.documents : data.documents.filter((d) => d.type === typeFilter);

  if (data.partners.length === 0 && data.documents.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-black text-slate-700">Sin resultados para &quot;{query}&quot;</p>
        <p className="text-sm text-slate-500 mt-1">Prueba con la cédula/NIT sin dígito de verificación, parte del nombre o el número exacto del documento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500">
        {data.partners.length} socio(s) y {data.documents.length} documento(s) · {(data.tookMs / 1000).toFixed(1)} s
      </p>
      {data.partners.length > 0 && (
        <Section title="Clientes y socios de negocio" icon={Users}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {data.partners.map((p) => (
              <PartnerCard key={p.cardCode} p={p} onOpen={() => go({ kind: 'customer', cardCode: p.cardCode, label: p.cardName })} />
            ))}
          </div>
        </Section>
      )}
      {data.documents.length > 0 && (
        <Section
          title="Documentos"
          icon={FileText}
          right={
            typesFound.length > 1 && (
              <div className="flex flex-wrap gap-1.5 justify-end">
                {(['all', ...typesFound] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                      typeFilter === t ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {t === 'all' ? 'Todos' : SAP_DOC_TYPES[t].short}
                  </button>
                ))}
              </div>
            )
          }
        >
          <DocTable docs={docs} onOpen={(d) => go({ kind: 'document', type: d.type, docEntry: d.docEntry, label: `${SAP_DOC_TYPES[d.type].short} ${d.docNum}` })} />
        </Section>
      )}
    </div>
  );
}

function SearchHelp() {
  const tips = [
    { title: 'Cédula o NIT', example: '71619197', text: 'Trae el cliente y todas sus cuentas.' },
    { title: 'Nombre o razón social', example: 'gomez zuluaga', text: 'Coincidencia parcial, sin importar mayúsculas.' },
    { title: 'Número de documento', example: '165165', text: 'Oferta, pedido, entrega, factura, OF…' },
    { title: 'Orden de compra del cliente', example: '83118', text: 'Busca en la referencia del cliente (NumAtCard).' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {tips.map((t) => (
        <div key={t.title} className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-black uppercase tracking-tight text-slate-800">{t.title}</p>
          <p className="text-[11px] text-slate-500 mt-1">{t.text}</p>
          <code className="inline-block mt-3 px-2 py-1 rounded-lg bg-slate-100 text-xs text-slate-700">{t.example}</code>
        </div>
      ))}
    </div>
  );
}

function CustomerView({ cardCode, go }: { cardCode: string; go: (v: View) => void }) {
  const [includeRelated, setIncludeRelated] = useState(true);
  const { data, error, loading } = useSapData<{ customer: SapCustomer360 }>(
    `/api/sap/customer?cardCode=${encodeURIComponent(cardCode)}${includeRelated ? '' : '&related=0'}`
  );
  const [activeType, setActiveType] = useState<SapDocType>('Order');
  const [extra, setExtra] = useState<Record<string, SapDocSummary[]>>({});
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => setExtra({}), [cardCode, includeRelated]);

  if (loading) return <Loading label="Cargando cliente desde SAP…" />;
  if (error) return <ErrorBox message={error} />;
  if (!data) return null;

  const { partner: p, relatedAccounts, documents, cardCodes } = data.customer;
  const listOf = (t: SapDocType) => documents.find((d) => d.type === t) as SapDocList;
  const active = listOf(activeType);
  const extraKey = `${activeType}|${cardCodes.join(',')}`;
  const rows = [...active.items, ...(extra[extraKey] || [])];

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/sap/customer?cardCodes=${encodeURIComponent(cardCodes.join(','))}&type=${activeType}&skip=${rows.length}`);
      const json = await res.json();
      if (json.success) setExtra((prev) => ({ ...prev, [extraKey]: [...(prev[extraKey] || []), ...json.list.items] }));
    } finally {
      setLoadingMore(false);
    }
  };

  const kpis = [
    { label: 'Saldo de cuenta', value: formatMoney(p.balance) },
    { label: 'Pedidos abiertos', value: formatMoney(p.openOrdersBalance) },
    { label: 'Entregas abiertas', value: formatMoney(p.openDeliveriesBalance) },
    { label: 'Empleado de ventas', value: p.salesPerson || '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center shadow-md shrink-0">
            {p.cardCode.startsWith('CN') ? <User className="w-7 h-7" /> : <Building2 className="w-7 h-7" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{p.cardName}</h2>
              {p.frozen && <span className="px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-600 text-[10px] font-bold">INACTIVO</span>}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {p.cardCode} · NIT/CC <span className="font-semibold text-slate-700">{p.federalTaxId || '—'}</span> · {p.cardType}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-600">
              {p.contactPerson && <span className="inline-flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" />{p.contactPerson}</span>}
              {(p.cellular || p.phone) && <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" />{[p.cellular, p.phone].filter(Boolean).join(' · ')}</span>}
              {p.email && <span className="inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" />{p.email}</span>}
              {(p.address || p.city) && <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" />{[p.address, p.city].filter(Boolean).join(', ')}</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:w-[420px] shrink-0">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-2xl bg-slate-50 border border-slate-100 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{k.label}</p>
                <p className="text-sm font-black text-slate-800 truncate tabular-nums">{k.value}</p>
              </div>
            ))}
          </div>
        </div>

        {relatedAccounts.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="text-xs font-bold text-slate-600">
                {relatedAccounts.length} cuenta(s) más con la misma cédula/NIT
              </p>
              <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input type="checkbox" checked={includeRelated} onChange={(e) => setIncludeRelated(e.target.checked)} className="rounded" />
                Incluir sus documentos
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {relatedAccounts.map((a) => (
                <button
                  key={a.cardCode}
                  onClick={() => go({ kind: 'customer', cardCode: a.cardCode, label: a.cardName })}
                  className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[11px] text-slate-600 hover:border-brand/40 hover:text-brand transition-colors cursor-pointer"
                  title={a.cardName}
                >
                  <span className="font-bold">{a.cardCode}</span> {a.cardName.length > 32 ? `${a.cardName.slice(0, 32)}…` : a.cardName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] px-3 pt-3 border-b border-slate-100">
          {SAP_DOC_TYPE_ORDER.map((t) => {
            const count = listOf(t).count;
            const isActive = t === activeType;
            return (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className={`shrink-0 px-3.5 py-2 rounded-t-xl text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  isActive ? 'border-brand text-brand bg-slate-50' : 'border-transparent text-slate-500 hover:text-slate-800'
                } ${count === 0 && !isActive ? 'opacity-50' : ''}`}
              >
                {SAP_DOC_TYPES[t].label}
                <span className={`ml-1.5 px-1.5 py-px rounded-full text-[10px] ${isActive ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {count.toLocaleString('es-CO')}
                </span>
              </button>
            );
          })}
        </div>
        <div className="p-5">
          <DocTable
            docs={rows}
            showType={false}
            showCustomer={cardCodes.length > 1}
            onOpen={(d) => go({ kind: 'document', type: d.type, docEntry: d.docEntry, label: `${SAP_DOC_TYPES[d.type].short} ${d.docNum}` })}
          />
          {rows.length < active.count && (
            <div className="text-center mt-4">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
              >
                {loadingMore ? 'Cargando…' : `Cargar más (${rows.length} de ${active.count.toLocaleString('es-CO')})`}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function DocumentView({ type, docEntry, go, onOpenClassic }: {
  type: SapDocType;
  docEntry: number;
  go: (v: View) => void;
  onOpenClassic?: (mode: ClassicSapMode, docNum: string) => void;
}) {
  const detailRes = useSapData<{ detail: SapDocDetail }>(`/api/sap/document?type=${type}&docEntry=${docEntry}`);
  const mapRes = useSapData<SapRelationshipMap>(`/api/sap/relationship-map?type=${type}&docEntry=${docEntry}`);
  const info = SAP_DOC_TYPES[type];

  const openNode = (n: SapDocSummary) => {
    if (n.type === type && n.docEntry === docEntry) return;
    go({ kind: 'document', type: n.type, docEntry: n.docEntry, label: `${SAP_DOC_TYPES[n.type].short} ${n.docNum}` });
  };

  if (detailRes.loading) return <Loading label={`Cargando ${info.label.toLowerCase()}…`} />;
  if (detailRes.error) return <ErrorBox message={detailRes.error} />;
  if (!detailRes.data) return null;

  const d = detailRes.data.detail;
  const s = d.summary;
  const isPO = type === 'ProductionOrder';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={type} />
              <StatusBadge status={s.status} />
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight mt-2 tabular-nums">{s.docNum}</h2>
            {isPO ? (
              <p className="text-sm text-slate-600 mt-1">
                <span className="font-bold">{s.itemCode}</span> · {s.itemName}
              </p>
            ) : (
              s.cardCode && (
                <button
                  onClick={() => go({ kind: 'customer', cardCode: s.cardCode!, label: s.cardName || s.cardCode! })}
                  className="text-sm text-slate-600 mt-1 hover:text-brand transition-colors cursor-pointer text-left"
                >
                  <span className="font-bold">{s.cardName}</span> · {s.cardCode} <ChevronRight className="inline w-3.5 h-3.5" />
                </button>
              )
            )}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {isPO && s.cardCode && (
              <button
                onClick={() => go({ kind: 'customer', cardCode: s.cardCode!, label: s.cardCode! })}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" /> Ver cliente
              </button>
            )}
            {info.classicMode && onOpenClassic && (
              <button
                onClick={() => onOpenClassic(info.classicMode!, String(s.docNum))}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand text-white text-xs font-bold hover:opacity-90 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir en pantalla SAP
              </button>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {[
            { label: isPO ? 'Fecha de orden' : 'Fecha contabilización', value: formatDate(s.date) },
            { label: isPO ? 'Fecha de vencimiento' : 'Fecha de entrega', value: formatDate(s.dueDate) },
            isPO
              ? { label: 'Completada / planificada', value: `${formatQty(s.completedQty)} / ${formatQty(s.plannedQty)}` }
              : { label: 'Total documento', value: formatMoney(s.total, s.currency) },
            isPO ? { label: 'Cliente', value: s.cardCode || '—' } : { label: 'Orden de compra', value: s.numAtCard || '—' },
            ...(d.salesPerson ? [{ label: 'Empleado de ventas', value: d.salesPerson }] : []),
            ...(d.vatSum !== null ? [{ label: 'IVA', value: formatMoney(d.vatSum, s.currency) }] : []),
            ...d.extra,
          ].map((f) => (
            <div key={f.label} className="rounded-2xl bg-slate-50 border border-slate-100 px-3 py-2 min-w-0">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">{f.label}</dt>
              <dd className="text-sm font-bold text-slate-800 truncate tabular-nums" title={f.value}>{f.value}</dd>
            </div>
          ))}
        </dl>

        {(d.shipTo || d.comments) && (
          <div className="grid md:grid-cols-2 gap-3 mt-3 text-xs text-slate-600">
            {d.shipTo && (
              <div className="rounded-2xl border border-slate-100 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Destino</p>
                <p className="whitespace-pre-line">{d.shipTo.replace(/\|:=:\|/g, '')}</p>
              </div>
            )}
            {d.comments && (
              <div className="rounded-2xl border border-slate-100 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Comentarios</p>
                <p className="whitespace-pre-line">{d.comments}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Section title="Mapa de relaciones" icon={GitBranch} right={mapRes.data && <span className="text-[11px] text-slate-400">{mapRes.data.nodes.length} documento(s) · clic para abrir</span>}>
        {mapRes.loading && <Loading label="Recorriendo documentos vinculados…" />}
        {mapRes.error && <ErrorBox message={mapRes.error} />}
        {mapRes.data && <MapaRelaciones map={mapRes.data} onOpen={openNode} />}
      </Section>

      <Section title={isPO ? 'Componentes' : 'Contenido'} icon={FileText} right={<span className="text-[11px] text-slate-400">{d.lines.length} línea(s)</span>}>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-5 py-2 font-bold">#</th>
                <th className="px-3 py-2 font-bold">Artículo</th>
                <th className="px-3 py-2 font-bold">Descripción</th>
                <th className="px-3 py-2 font-bold text-right">{isPO ? 'Planificada' : 'Cantidad'}</th>
                <th className="px-3 py-2 font-bold text-right">{isPO ? 'Emitida' : 'Pendiente'}</th>
                {!isPO && <th className="px-3 py-2 font-bold text-right">Total línea</th>}
                <th className="px-3 py-2 font-bold">Almacén</th>
                {!isPO && <th className="px-5 py-2 font-bold">Origen</th>}
              </tr>
            </thead>
            <tbody>
              {d.lines.map((l, i) => (
                <tr key={`${l.lineNum}-${i}`} className="border-t border-slate-100">
                  <td className="px-5 py-2 text-slate-400 tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2 font-semibold text-slate-800 whitespace-nowrap">{l.itemCode}</td>
                  <td className="px-3 py-2 text-slate-600 min-w-[240px]">{l.description}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatQty(l.quantity)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">{formatQty(l.openQty)}</td>
                  {!isPO && <td className="px-3 py-2 text-right tabular-nums font-semibold whitespace-nowrap">{formatMoney(l.lineTotal, s.currency)}</td>}
                  <td className="px-3 py-2 text-slate-500">{l.warehouse || '—'}</td>
                  {!isPO && (
                    <td className="px-5 py-2 whitespace-nowrap">
                      {l.base?.type && l.base.docEntry ? (
                        <button
                          onClick={() => go({ kind: 'document', type: l.base!.type!, docEntry: l.base!.docEntry! })}
                          className="text-xs font-bold text-brand hover:underline cursor-pointer"
                        >
                          {SAP_DOC_TYPES[l.base.type].short}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

// ── Contenedor ─────────────────────────────────────────────────────────────────

/**
 * Explorador SAP: un solo buscador para clientes (cédula/NIT, nombre) y documentos (número u orden de compra),
 * con vista 360 del cliente, detalle de documentos y mapa de relaciones navegable. Solo lectura.
 */
export default function ExploradorSap({
  initialQuery = '',
  onOpenClassic,
}: {
  initialQuery?: string;
  onOpenClassic?: (mode: ClassicSapMode, docNum: string) => void;
}) {
  const [input, setInput] = useState(initialQuery);
  const [stack, setStack] = useState<View[]>([{ kind: 'search', query: initialQuery.trim() }]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const view = stack[stack.length - 1];

  const go = useCallback((v: View) => {
    setStack((prev) => [...prev, v]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const runSearch = useCallback((raw: string) => {
    const query = raw.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setStack([{ kind: 'search', query }]);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const onChange = (value: string) => {
    setInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Búsqueda automática al dejar de escribir; Enter busca de inmediato.
    if (value.trim().length >= 3) debounceRef.current = setTimeout(() => runSearch(value), 600);
  };

  const crumbs = stack.map((v) =>
    v.kind === 'search'
      ? v.query ? `Búsqueda "${v.query}"` : 'Búsqueda'
      : v.label || (v.kind === 'customer' ? v.cardCode : `${SAP_DOC_TYPES[v.type].short} ${v.docEntry}`)
  );

  return (
    <div className="max-w-[1400px] mx-auto pb-10">
      <div className="sticky top-[3.5rem] z-30 -mx-4 px-4 pt-4 pb-3 bg-[#F1F5F9]/95 backdrop-blur">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(input);
          }}
          className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-2 focus-within:border-brand/50 focus-within:ring-4 focus-within:ring-brand/10 transition-all"
        >
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Cédula / NIT, nombre del cliente, número de documento u orden de compra…"
            className="flex-1 min-w-0 bg-transparent outline-none text-base font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-medium py-1.5"
          />
          {input && (
            <button
              type="button"
              onClick={() => {
                setInput('');
                runSearch('');
                inputRef.current?.focus();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              title="Limpiar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button type="submit" className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-bold hover:opacity-90 cursor-pointer">
            Buscar
          </button>
        </form>

        {stack.length > 1 && (
          <nav className="flex items-center gap-1.5 mt-3 text-xs overflow-x-auto whitespace-nowrap">
            <button
              onClick={() => setStack((prev) => prev.slice(0, -1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Atrás
            </button>
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />}
                <button
                  onClick={() => setStack((prev) => prev.slice(0, i + 1))}
                  disabled={i === crumbs.length - 1}
                  className={`px-1.5 py-0.5 rounded ${i === crumbs.length - 1 ? 'font-bold text-slate-800' : 'text-slate-500 hover:text-brand cursor-pointer'}`}
                >
                  {c}
                </button>
              </React.Fragment>
            ))}
          </nav>
        )}
      </div>

      <div className="mt-3">
        {view.kind === 'search' && <SearchView key={view.query} query={view.query} go={go} />}
        {view.kind === 'customer' && <CustomerView key={view.cardCode} cardCode={view.cardCode} go={go} />}
        {view.kind === 'document' && (
          <DocumentView key={`${view.type}:${view.docEntry}`} type={view.type} docEntry={view.docEntry} go={go} onOpenClassic={onOpenClassic} />
        )}
      </div>
    </div>
  );
}
