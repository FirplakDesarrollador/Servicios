// Tipos y catálogo de documentos del Explorador SAP. Sin código de servidor: se importa desde el cliente y las rutas API.

export type SapDocType =
  | 'Quotation'
  | 'Order'
  | 'DownPayment'
  | 'ProductionOrder'
  | 'Delivery'
  | 'Return'
  | 'Invoice'
  | 'CreditNote';

export interface SapDocTypeInfo {
  objType: number;
  entity: string;
  label: string;
  short: string;
  /** Columna en el mapa de relaciones (flujo de izquierda a derecha). */
  column: number;
  /** Pantalla clásica de Consultas SAP que puede abrir el documento. */
  classicMode?: 'Quotation' | 'Order' | 'Delivery' | 'Invoice' | 'ProductionOrder';
}

export const SAP_DOC_TYPES: Record<SapDocType, SapDocTypeInfo> = {
  Quotation: { objType: 23, entity: 'Quotations', label: 'Oferta de venta', short: 'Oferta', column: 0, classicMode: 'Quotation' },
  Order: { objType: 17, entity: 'Orders', label: 'Orden de venta', short: 'Pedido', column: 1, classicMode: 'Order' },
  DownPayment: { objType: 203, entity: 'DownPayments', label: 'Factura de anticipo', short: 'Anticipo', column: 2 },
  ProductionOrder: { objType: 202, entity: 'ProductionOrders', label: 'Orden de fabricación', short: 'OF', column: 2, classicMode: 'ProductionOrder' },
  Delivery: { objType: 15, entity: 'DeliveryNotes', label: 'Entrega', short: 'Entrega', column: 3, classicMode: 'Delivery' },
  Return: { objType: 16, entity: 'Returns', label: 'Devolución', short: 'Devolución', column: 4 },
  Invoice: { objType: 13, entity: 'Invoices', label: 'Factura de clientes', short: 'Factura', column: 4, classicMode: 'Invoice' },
  CreditNote: { objType: 14, entity: 'CreditNotes', label: 'Nota crédito', short: 'NC', column: 5 },
};

export const SAP_DOC_TYPE_ORDER: SapDocType[] = [
  'Quotation', 'Order', 'ProductionOrder', 'DownPayment', 'Delivery', 'Invoice', 'Return', 'CreditNote',
];

export type SapDocStatus = 'Abierto' | 'Cerrado' | 'Cancelado' | 'Planificada' | 'Liberada' | 'Cerrada' | 'Cancelada';

export interface SapDocSummary {
  /** `${type}:${docEntry}` */
  key: string;
  type: SapDocType;
  docEntry: number;
  docNum: number;
  date: string | null;
  dueDate: string | null;
  total: number | null;
  currency: string | null;
  status: SapDocStatus;
  cardCode: string | null;
  cardName: string | null;
  /** Orden de compra del cliente (NumAtCard). */
  numAtCard: string | null;
  /** Solo órdenes de fabricación. */
  itemCode?: string | null;
  itemName?: string | null;
  plannedQty?: number | null;
  completedQty?: number | null;
  originEntry?: number | null;
}

export interface SapBusinessPartner {
  cardCode: string;
  cardName: string;
  cardType: string;
  federalTaxId: string | null;
  phone: string | null;
  cellular: string | null;
  email: string | null;
  city: string | null;
  address?: string | null;
  balance?: number | null;
  openOrdersBalance?: number | null;
  openDeliveriesBalance?: number | null;
  creditLimit?: number | null;
  salesPerson?: string | null;
  contactPerson?: string | null;
  frozen?: boolean;
}

export interface SapSearchResult {
  query: string;
  partners: SapBusinessPartner[];
  documents: SapDocSummary[];
  tookMs: number;
}

export interface SapDocList {
  type: SapDocType;
  count: number;
  items: SapDocSummary[];
}

export interface SapCustomer360 {
  partner: SapBusinessPartner;
  /** Otras cuentas (CardCode) con la misma cédula/NIT. */
  relatedAccounts: Array<{ cardCode: string; cardName: string }>;
  /** Cuentas incluidas en las listas de documentos. */
  cardCodes: string[];
  documents: SapDocList[];
}

export interface SapRelationshipMap {
  rootKey: string;
  nodes: SapDocSummary[];
  edges: Array<{ from: string; to: string }>;
  truncated: boolean;
}

export interface SapDocLine {
  lineNum: number;
  itemCode: string;
  description: string;
  quantity: number;
  openQty: number | null;
  price: number | null;
  lineTotal: number | null;
  warehouse: string | null;
  status: string | null;
  base: { type: SapDocType | null; docEntry: number | null } | null;
}

export interface SapDocDetail {
  summary: SapDocSummary;
  salesPerson: string | null;
  comments: string | null;
  address: string | null;
  shipTo: string | null;
  vatSum: number | null;
  /** Campos de usuario relevantes con etiqueta legible. */
  extra: Array<{ label: string; value: string }>;
  lines: SapDocLine[];
}

export const docKey = (type: SapDocType, docEntry: number) => `${type}:${docEntry}`;

export function parseDocKey(key: string): { type: SapDocType; docEntry: number } | null {
  const [type, entry] = key.split(':');
  if (!(type in SAP_DOC_TYPES) || !/^\d+$/.test(entry || '')) return null;
  return { type: type as SapDocType, docEntry: Number(entry) };
}
