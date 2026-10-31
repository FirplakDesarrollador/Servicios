'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Search, Loader2, User, Building2, Phone, Mail, MapPin, FileText, ExternalLink,
  ChevronRight, AlertCircle, GitBranch, Users, X, ListOrdered,
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

const card = 'bg-white rounded-2xl border border-border';
const eyebrow = 'text-[10px] font-medium tracking-[0.16em] uppercase text-brand-light';
const ghostBtn = 'inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border bg-white text-xs font-medium text-stone-600 hover:border-brand-light hover:text-brand transition-colors cursor-pointer';
const primaryBtn = 'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors cursor-pointer';

function TypeIcon({ type, size = 'md' }: { type: SapDocType; size?: 'sm' | 'md' | 'lg' }) {
  const s = DOC_TYPE_STYLE[type];
  const Icon = s.icon;
  const box = size === 'lg' ? 'w-12 h-12 rounded-xl' : size === 'sm' ? 'w-6 h-6 rounded-md' : 'w-8 h-8 rounded-lg';
  const ico = size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <span className={`${box} shrink-0 flex items-center justify-center ${s.soft} ${s.text}`} title={SAP_DOC_TYPES[type].label}>
      <Icon className={ico} />
    </span>
  );
}

function StatusBadge({ status }: { status: SapDocSummary['status'] }) {
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${statusStyle(status)}`}>{status}</span>;
}

function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ink-muted">
      <Loader2 className="w-5 h-5 animate-spin text-brand-light" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-700">
      <AlertCircle className="w-5 h-5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function Section({ title, icon: Icon, right, children, flush = false }: {
  title: string;
  icon: React.ElementType;
  right?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <section className={`${card} overflow-hidden`}>
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-border">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-dark">
          <Icon className="w-4 h-4 text-brand-light" />
          {title}
        </h3>
        {right}
      </header>
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className={eyebrow}>{label}</dt>
      <dd className="mt-1 text-sm font-medium text-brand-dark truncate tabular-nums" title={value}>{value}</dd>
    </div>
  );
}

const th = 'px-3 py-2.5 text-[10px] font-medium tracking-[0.12em] uppercase text-stone-400';

/** Tabla de documentos. Clic en una fila abre el documento. */
function DocTable({ docs, onOpen, showType = true, showCustomer = true }: {
  docs: SapDocSummary[];
  onOpen: (doc: SapDocSummary) => void;
  showType?: boolean;
  showCustomer?: boolean;
}) {
  if (docs.length === 0) {
    return <p className="text-sm text-stone-400 py-10 text-center">Sin documentos.</p>;
  }
  const isPO = docs.every((d) => d.type === 'ProductionOrder');
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-cream-light">
          <tr className="text-left">
            <th className={`${th} pl-5`}>Documento</th>
            <th className={th}>Fecha</th>
            {showCustomer && <th className={th}>Cliente</th>}
            <th className={th}>{isPO ? 'Artículo' : 'Orden de compra'}</th>
            <th className={`${th} text-right`}>{isPO ? 'Cantidad' : 'Total'}</th>
            <th className={`${th} pr-5`}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.key} onClick={() => onOpen(d)} className="group border-t border-border hover:bg-cream-light cursor-pointer transition-colors">
              <td className="pl-5 pr-3 py-3">
                <div className="flex items-center gap-3">
                  {showType && <TypeIcon type={d.type} />}
                  <div className="min-w-0">
                    <div className="font-semibold text-brand-dark tabular-nums group-hover:text-brand">{d.docNum}</div>
                    {showType && <div className="text-[11px] text-stone-400 whitespace-nowrap">{SAP_DOC_TYPES[d.type].label}</div>}
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 text-stone-500 tabular-nums whitespace-nowrap">{formatDate(d.date)}</td>
              {showCustomer && (
                <td className="px-3 py-3 max-w-[280px]">
                  <div className="truncate text-brand-dark">{d.cardName || d.cardCode || '—'}</div>
                  {d.cardName && <div className="text-[11px] text-stone-400">{d.cardCode}</div>}
                </td>
              )}
              <td className="px-3 py-3 text-stone-500 max-w-[280px] truncate tabular-nums">
                {isPO ? d.itemName || d.itemCode : d.numAtCard || '—'}
              </td>
              <td className="px-3 py-3 text-right font-medium text-brand-dark tabular-nums whitespace-nowrap">
                {d.type === 'ProductionOrder' ? `${formatQty(d.completedQty)} / ${formatQty(d.plannedQty)}` : formatMoney(d.total, d.currency)}
              </td>
              <td className="pl-3 pr-5 py-3"><StatusBadge status={d.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const PartnerAvatar = ({ cardCode, large = false }: { cardCode: string; large?: boolean }) => (
  <span className={`${large ? 'w-14 h-14 rounded-2xl' : 'w-10 h-10 rounded-xl'} shrink-0 bg-brand text-white flex items-center justify-center`}>
    {cardCode.startsWith('CN') ? <User className={large ? 'w-6 h-6' : 'w-5 h-5'} /> : <Building2 className={large ? 'w-6 h-6' : 'w-5 h-5'} />}
  </span>
);

function PartnerCard({ p, onOpen }: { p: SapBusinessPartner; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className={`${card} text-left p-4 hover:border-brand-light hover:shadow-[0_10px_24px_-16px_rgba(37,65,83,0.45)] transition-all cursor-pointer group`}>
      <div className="flex items-start gap-3">
        <PartnerAvatar cardCode={p.cardCode} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-brand-dark leading-tight group-hover:text-brand transition-colors">{p.cardName}</p>
          <p className="text-xs text-stone-500 mt-1">
            {p.cardCode} · CC/NIT {p.federalTaxId || '—'}
            <span className="ml-2 px-1.5 py-px rounded-full bg-sage-soft text-brand text-[10px] font-medium">{p.cardType}</span>
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-stone-400">
            {p.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{p.city}</span>}
            {(p.cellular || p.phone) && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{p.cellular || p.phone}</span>}
            {p.email && <span className="inline-flex items-center gap-1 truncate max-w-[220px]"><Mail className="w-3 h-3" />{p.email}</span>}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-brand group-hover:translate-x-0.5 transition-all mt-1" />
      </div>
    </button>
  );
}

const docLabel = (d: SapDocSummary) => `${SAP_DOC_TYPES[d.type].short} ${d.docNum}`;

// ── Vistas ─────────────────────────────────────────────────────────────────────

function SearchView({ query, go }: { query: string; go: (v: View) => void }) {
  const { data, error, loading } = useSapData<SapSearchResult>(query.length >= 2 ? `/api/sap/search?q=${encodeURIComponent(query)}` : null);
  const [typeFilter, setTypeFilter] = useState<SapDocType | 'all'>('all');

  if (query.length < 2) return <SearchHelp />;
  if (loading) return <Loading label={`Buscando “${query}” en SAP…`} />;
  if (error) return <ErrorBox message={error} />;
  if (!data) return null;

  const typesFound = SAP_DOC_TYPE_ORDER.filter((t) => data.documents.some((d) => d.type === t));
  const docs = typeFilter === 'all' ? data.documents : data.documents.filter((d) => d.type === typeFilter);

  if (data.partners.length === 0 && data.documents.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-semibold text-brand-dark">Sin resultados para “{query}”</p>
        <p className="text-sm text-ink-muted mt-1">Prueba con la cédula o NIT sin dígito de verificación, parte del nombre o el número exacto del documento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-ink-muted">
        {data.partners.length} cliente(s) · {data.documents.length} documento(s) · {(data.tookMs / 1000).toFixed(1)} s
      </p>
      {data.partners.length > 0 && (
        <Section title="Clientes" icon={Users}>
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
          flush
          right={
            typesFound.length > 1 && (
              <div className="flex flex-wrap gap-1.5 justify-end">
                {(['all', ...typesFound] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`h-7 px-2.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                      typeFilter === t ? 'bg-brand text-white border-brand' : 'bg-white text-stone-600 border-border hover:border-brand-light'
                    }`}
                  >
                    {t === 'all' ? 'Todos' : SAP_DOC_TYPES[t].short}
                  </button>
                ))}
              </div>
            )
          }
        >
          <DocTable docs={docs} onOpen={(d) => go({ kind: 'document', type: d.type, docEntry: d.docEntry, label: docLabel(d) })} />
        </Section>
      )}
    </div>
  );
}

function SearchHelp() {
  const tips = [
    { title: 'Cédula o NIT', text: 'Trae el cliente y todas sus cuentas.', icon: User },
    { title: 'Nombre o razón social', text: 'Coincidencia parcial, sin importar mayúsculas.', icon: Users },
    { title: 'Número de documento', text: 'Oferta, pedido, OF, entrega, factura, NC…', icon: FileText },
    { title: 'Orden de compra', text: 'La referencia del cliente en el documento.', icon: ListOrdered },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
      {tips.map((t) => (
        <div key={t.title} className={`${card} p-4`}>
          <span className="w-9 h-9 rounded-xl bg-sage-soft text-brand flex items-center justify-center"><t.icon className="w-4 h-4" /></span>
          <p className="mt-3 text-sm font-semibold text-brand-dark">{t.title}</p>
          <p className="text-xs text-ink-muted mt-0.5">{t.text}</p>
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
    <div className="space-y-5">
      <div className={`${card} p-5 sm:p-6`}>
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <PartnerAvatar cardCode={p.cardCode} large />
          <div className="flex-1 min-w-0">
            <p className={eyebrow}>{p.cardType}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <h2 className="text-2xl font-semibold tracking-tight text-brand-dark">{p.cardName}</h2>
              {p.frozen && <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-semibold">Inactivo</span>}
            </div>
            <p className="text-sm text-stone-500 mt-1">
              {p.cardCode} · CC/NIT <span className="font-medium text-brand-dark">{p.federalTaxId || '—'}</span>
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs text-stone-500">
              {p.contactPerson && <span className="inline-flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-brand-light" />{p.contactPerson}</span>}
              {(p.cellular || p.phone) && <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-brand-light" />{[p.cellular, p.phone].filter(Boolean).join(' · ')}</span>}
              {p.email && <span className="inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-brand-light" />{p.email}</span>}
              {(p.address || p.city) && <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-brand-light" />{[p.address, p.city].filter(Boolean).join(', ')}</span>}
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-px mt-6 rounded-xl overflow-hidden border border-border bg-border">
          {kpis.map((k) => (
            <div key={k.label} className="bg-cream-light px-4 py-3">
              <Field label={k.label} value={k.value} />
            </div>
          ))}
        </dl>

        {relatedAccounts.length > 0 && (
          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="text-xs text-stone-500">
                <span className="font-semibold text-brand-dark">{relatedAccounts.length}</span> cuenta(s) más con la misma cédula/NIT
              </p>
              <label className="inline-flex items-center gap-2 text-xs text-stone-500 cursor-pointer select-none">
                <input type="checkbox" checked={includeRelated} onChange={(e) => setIncludeRelated(e.target.checked)} className="accent-[#254153]" />
                Incluir sus documentos
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {relatedAccounts.map((a) => (
                <button
                  key={a.cardCode}
                  onClick={() => go({ kind: 'customer', cardCode: a.cardCode, label: a.cardName })}
                  className="h-7 px-2.5 rounded-full border border-border bg-white text-[11px] text-stone-500 hover:border-brand-light hover:text-brand transition-colors cursor-pointer"
                  title={a.cardName}
                >
                  <span className="font-medium text-brand-dark">{a.cardCode}</span> {a.cardName.length > 30 ? `${a.cardName.slice(0, 30)}…` : a.cardName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <section className={`${card} overflow-hidden`}>
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] p-2 border-b border-border">
          {SAP_DOC_TYPE_ORDER.map((t) => {
            const count = listOf(t).count;
            const isActive = t === activeType;
            const Icon = DOC_TYPE_STYLE[t].icon;
            return (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className={`shrink-0 inline-flex items-center gap-2 h-9 px-3 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isActive ? 'bg-brand-soft text-brand' : count === 0 ? 'text-stone-300 hover:text-stone-500' : 'text-stone-500 hover:bg-cream-light hover:text-brand'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {SAP_DOC_TYPES[t].label}
                <span className={`min-w-[20px] px-1.5 py-px rounded-full text-[10px] tabular-nums ${isActive ? 'bg-brand text-white' : 'bg-stone-100 text-stone-500'}`}>
                  {count.toLocaleString('es-CO')}
                </span>
              </button>
            );
          })}
        </div>
        <DocTable
          docs={rows}
          showType={false}
          showCustomer={cardCodes.length > 1}
          onOpen={(d) => go({ kind: 'document', type: d.type, docEntry: d.docEntry, label: docLabel(d) })}
        />
        {rows.length < active.count && (
          <div className="text-center p-4 border-t border-border">
            <button onClick={loadMore} disabled={loadingMore} className={`${ghostBtn} disabled:opacity-60`}>
              {loadingMore ? 'Cargando…' : `Cargar más · ${rows.length} de ${active.count.toLocaleString('es-CO')}`}
            </button>
          </div>
        )}
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
    go({ kind: 'document', type: n.type, docEntry: n.docEntry, label: docLabel(n) });
  };

  if (detailRes.loading) return <Loading label={`Cargando ${info.label.toLowerCase()}…`} />;
  if (detailRes.error) return <ErrorBox message={detailRes.error} />;
  if (!detailRes.data) return null;

  const d = detailRes.data.detail;
  const s = d.summary;
  const isPO = type === 'ProductionOrder';

  const fields = [
    { label: isPO ? 'Fecha de orden' : 'Fecha contabilización', value: formatDate(s.date) },
    { label: isPO ? 'Fecha de vencimiento' : 'Fecha de entrega', value: formatDate(s.dueDate) },
    isPO ? { label: 'Cliente', value: s.cardCode || '—' } : { label: 'Orden de compra', value: s.numAtCard || '—' },
    ...(d.salesPerson ? [{ label: 'Empleado de ventas', value: d.salesPerson }] : []),
    ...(d.vatSum !== null ? [{ label: 'IVA', value: formatMoney(d.vatSum, s.currency) }] : []),
    ...d.extra,
  ];

  return (
    <div className="space-y-5">
      <div className={`${card} p-5 sm:p-6`}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <TypeIcon type={type} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className={eyebrow}>{info.label}</p>
                <StatusBadge status={s.status} />
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-brand-dark mt-1 tabular-nums">{s.docNum}</h2>
              {isPO ? (
                <p className="text-sm text-stone-500 mt-1">
                  <span className="font-medium text-brand-dark">{s.itemCode}</span> · {s.itemName}
                </p>
              ) : (
                s.cardCode && (
                  <button
                    onClick={() => go({ kind: 'customer', cardCode: s.cardCode!, label: s.cardName || s.cardCode! })}
                    className="text-sm text-stone-500 mt-1 hover:text-brand transition-colors cursor-pointer text-left"
                  >
                    <span className="font-medium text-brand-dark">{s.cardName}</span> · {s.cardCode} <ChevronRight className="inline w-3.5 h-3.5" />
                  </button>
                )
              )}
            </div>
          </div>
          <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
            <div className="md:text-right">
              <p className={eyebrow}>{isPO ? 'Completada / planificada' : 'Total documento'}</p>
              <p className="text-2xl font-semibold text-brand-dark tabular-nums mt-1">
                {isPO ? `${formatQty(s.completedQty)} / ${formatQty(s.plannedQty)}` : formatMoney(s.total, s.currency)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isPO && s.cardCode && (
                <button onClick={() => go({ kind: 'customer', cardCode: s.cardCode!, label: s.cardCode! })} className={ghostBtn}>
                  <User className="w-3.5 h-3.5" /> Ver cliente
                </button>
              )}
              {info.classicMode && onOpenClassic && (
                <button onClick={() => onOpenClassic(info.classicMode!, String(s.docNum))} className={primaryBtn}>
                  <ExternalLink className="w-3.5 h-3.5" /> Abrir en pantalla SAP
                </button>
              )}
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-4 mt-6 pt-5 border-t border-border">
          {fields.map((f) => <Field key={f.label} label={f.label} value={f.value} />)}
        </dl>

        {(d.shipTo || d.comments) && (
          <div className="grid md:grid-cols-2 gap-3 mt-5">
            {d.shipTo && (
              <div className="rounded-xl bg-cream-light px-4 py-3">
                <p className={eyebrow}>Destino</p>
                <p className="mt-1 text-xs text-stone-600 whitespace-pre-line">{d.shipTo.replace(/\|:=:\|/g, '')}</p>
              </div>
            )}
            {d.comments && (
              <div className="rounded-xl bg-cream-light px-4 py-3">
                <p className={eyebrow}>Comentarios</p>
                <p className="mt-1 text-xs text-stone-600 whitespace-pre-line">{d.comments}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Section
        title="Mapa de relaciones"
        icon={GitBranch}
        right={mapRes.data && <span className="text-[11px] text-stone-400">{mapRes.data.nodes.length} documento(s) · clic para abrir</span>}
      >
        {mapRes.loading && <Loading label="Recorriendo documentos vinculados…" />}
        {mapRes.error && <ErrorBox message={mapRes.error} />}
        {mapRes.data && <div className="py-2"><MapaRelaciones map={mapRes.data} onOpen={openNode} /></div>}
      </Section>

      <Section title={isPO ? 'Componentes' : 'Contenido'} icon={FileText} flush right={<span className="text-[11px] text-stone-400">{d.lines.length} línea(s)</span>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-light">
              <tr className="text-left">
                <th className={`${th} pl-5`}>#</th>
                <th className={th}>Artículo</th>
                <th className={th}>Descripción</th>
                <th className={`${th} text-right`}>{isPO ? 'Planificada' : 'Cantidad'}</th>
                <th className={`${th} text-right`}>{isPO ? 'Emitida' : 'Pendiente'}</th>
                {!isPO && <th className={`${th} text-right`}>Total línea</th>}
                <th className={th}>Almacén</th>
                {!isPO && <th className={`${th} pr-5`}>Origen</th>}
              </tr>
            </thead>
            <tbody>
              {d.lines.map((l, i) => (
                <tr key={`${l.lineNum}-${i}`} className="border-t border-border">
                  <td className="pl-5 pr-3 py-2.5 text-stone-400 tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2.5 font-medium text-brand-dark whitespace-nowrap">{l.itemCode}</td>
                  <td className="px-3 py-2.5 text-stone-600 min-w-[240px]">{l.description}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatQty(l.quantity)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-stone-400">{formatQty(l.openQty)}</td>
                  {!isPO && <td className="px-3 py-2.5 text-right tabular-nums font-medium whitespace-nowrap">{formatMoney(l.lineTotal, s.currency)}</td>}
                  <td className="px-3 py-2.5 text-stone-500">{l.warehouse || '—'}</td>
                  {!isPO && (
                    <td className="pl-3 pr-5 py-2.5 whitespace-nowrap">
                      {l.base?.type && l.base.docEntry ? (
                        <button
                          onClick={() => go({ kind: 'document', type: l.base!.type!, docEntry: l.base!.docEntry! })}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline cursor-pointer"
                        >
                          <TypeIcon type={l.base.type} size="sm" />
                          {SAP_DOC_TYPES[l.base.type].short}
                        </button>
                      ) : (
                        <span className="text-xs text-stone-300">—</span>
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
      ? v.query ? `“${v.query}”` : 'Búsqueda'
      : v.label || (v.kind === 'customer' ? v.cardCode : `${SAP_DOC_TYPES[v.type].short} ${v.docEntry}`)
  );

  return (
    <div className="max-w-[1320px] mx-auto pb-12">
      <div className="sticky top-14 z-30 -mx-4 px-4 pt-5 pb-3 bg-cream/95 backdrop-blur">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(input);
          }}
          className="flex items-center gap-2 bg-white rounded-2xl border border-border shadow-[0_8px_30px_-16px_rgba(37,65,83,0.25)] pl-4 pr-2 h-14 focus-within:border-brand-light transition-colors"
        >
          <Search className="w-5 h-5 text-brand-light shrink-0" />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Cédula, NIT, nombre, documento u orden de compra"
            className="flex-1 min-w-0 bg-transparent outline-none text-base text-brand-dark placeholder:text-stone-400"
          />
          {input && (
            <button
              type="button"
              onClick={() => {
                setInput('');
                runSearch('');
                inputRef.current?.focus();
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-brand hover:bg-cream-light cursor-pointer"
              title="Limpiar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button type="submit" className="h-10 px-5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors cursor-pointer">
            Buscar
          </button>
        </form>

        {stack.length > 1 && (
          <nav className="flex items-center gap-1 mt-3 text-xs overflow-x-auto [scrollbar-width:none] whitespace-nowrap">
            <button
              onClick={() => setStack((prev) => prev.slice(0, -1))}
              className="inline-flex items-center gap-1 h-7 px-2.5 mr-1 rounded-lg bg-white border border-border font-medium text-stone-600 hover:text-brand hover:border-brand-light cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Atrás
            </button>
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight className="w-3 h-3 text-stone-300 shrink-0" />}
                <button
                  onClick={() => setStack((prev) => prev.slice(0, i + 1))}
                  disabled={i === crumbs.length - 1}
                  className={`px-1.5 py-0.5 rounded ${i === crumbs.length - 1 ? 'font-semibold text-brand-dark' : 'text-stone-400 hover:text-brand cursor-pointer'}`}
                >
                  {c}
                </button>
              </React.Fragment>
            ))}
          </nav>
        )}
      </div>

      <div className="mt-2">
        {view.kind === 'search' && <SearchView key={view.query} query={view.query} go={go} />}
        {view.kind === 'customer' && <CustomerView key={view.cardCode} cardCode={view.cardCode} go={go} />}
        {view.kind === 'document' && (
          <DocumentView key={`${view.type}:${view.docEntry}`} type={view.type} docEntry={view.docEntry} go={go} onOpenClassic={onOpenClassic} />
        )}
      </div>
    </div>
  );
}
