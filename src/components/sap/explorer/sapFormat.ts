import { ClipboardList, Factory, FileMinus, FileText, Receipt, Truck, Undo2, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

/**
 * Identidad de cada tipo de documento: un ícono y un tono sobrio derivado de la paleta FIRPLAK
 * (navy #254153, salvia #749094, crema #f5f1ea) para reconocerlos de un vistazo sin recargar la pantalla.
 */
export const DOC_TYPE_STYLE: Record<SapDocType, { icon: LucideIcon; text: string; soft: string; bar: string }> = {
  Quotation: { icon: FileText, text: 'text-[#9A7442]', soft: 'bg-[#9A7442]/10', bar: 'bg-[#9A7442]' },
  Order: { icon: ClipboardList, text: 'text-[#254153]', soft: 'bg-[#254153]/10', bar: 'bg-[#254153]' },
  ProductionOrder: { icon: Factory, text: 'text-[#5B7A7E]', soft: 'bg-[#749094]/15', bar: 'bg-[#749094]' },
  DownPayment: { icon: Wallet, text: 'text-[#4F7F86]', soft: 'bg-[#4F7F86]/10', bar: 'bg-[#4F7F86]' },
  Delivery: { icon: Truck, text: 'text-[#3E6E5E]', soft: 'bg-[#3E6E5E]/10', bar: 'bg-[#3E6E5E]' },
  Invoice: { icon: Receipt, text: 'text-[#9C5545]', soft: 'bg-[#9C5545]/10', bar: 'bg-[#9C5545]' },
  Return: { icon: Undo2, text: 'text-[#A8743A]', soft: 'bg-[#A8743A]/10', bar: 'bg-[#A8743A]' },
  CreditNote: { icon: FileMinus, text: 'text-[#6F6C66]', soft: 'bg-[#8A8780]/12', bar: 'bg-[#8A8780]' },
};

export const statusStyle = (status: SapDocStatus) => {
  switch (status) {
    case 'Abierto':
    case 'Liberada':
      return 'bg-[#3E6E5E]/10 text-[#3E6E5E]';
    case 'Planificada':
      return 'bg-[#254153]/10 text-[#254153]';
    case 'Cancelado':
    case 'Cancelada':
      return 'bg-red-50 text-red-700';
    default:
      return 'bg-stone-100 text-stone-500';
  }
};
