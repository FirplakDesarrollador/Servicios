import type { SapDocStatus, SapDocType } from '@/lib/sapExplorerTypes';

export const formatMoney = (value: number | null | undefined, currency?: string | null) => {
  if (value === null || value === undefined) return '—';
  const cur = !currency || currency === 'COP' ? 'COP' : currency;
  try {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: cur, maximumFractionDigits: cur === 'COP' ? 0 : 2 }).format(value);
  } catch {
    return `${cur} ${value.toLocaleString('es-CO')}`;
  }
};

export const formatDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
};

export const formatQty = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : value.toLocaleString('es-CO', { maximumFractionDigits: 2 });

/** Colores por tipo de documento (alineados con las tarjetas del menú de Consultas SAP). */
export const DOC_TYPE_STYLE: Record<SapDocType, { badge: string; bar: string; dot: string }> = {
  Quotation: { badge: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-500', dot: 'bg-amber-500' },
  Order: { badge: 'bg-blue-50 text-blue-700 border-blue-200', bar: 'bg-blue-600', dot: 'bg-blue-600' },
  ProductionOrder: { badge: 'bg-purple-50 text-purple-700 border-purple-200', bar: 'bg-purple-600', dot: 'bg-purple-600' },
  DownPayment: { badge: 'bg-cyan-50 text-cyan-700 border-cyan-200', bar: 'bg-cyan-600', dot: 'bg-cyan-600' },
  Delivery: { badge: 'bg-teal-50 text-teal-700 border-teal-200', bar: 'bg-teal-600', dot: 'bg-teal-600' },
  Invoice: { badge: 'bg-rose-50 text-rose-700 border-rose-200', bar: 'bg-rose-500', dot: 'bg-rose-500' },
  Return: { badge: 'bg-orange-50 text-orange-700 border-orange-200', bar: 'bg-orange-500', dot: 'bg-orange-500' },
  CreditNote: { badge: 'bg-slate-100 text-slate-700 border-slate-300', bar: 'bg-slate-500', dot: 'bg-slate-500' },
};

export const statusStyle = (status: SapDocStatus) => {
  switch (status) {
    case 'Abierto':
    case 'Liberada':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Planificada':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Cancelado':
    case 'Cancelada':
      return 'bg-red-50 text-red-600 border-red-200';
    default:
      return 'bg-slate-100 text-slate-500 border-slate-200';
  }
};
