// Explorador SAP (solo lectura): búsqueda global, vista 360 del cliente, mapa de relaciones y detalle de documentos.
// Todo se consulta con GET al Service Layer; no se crean ni modifican objetos en SAP.
import { sapGet, SapRequestError } from '@/lib/sapServiceLayer';
import {
  SAP_DOC_TYPES,
  SAP_DOC_TYPE_ORDER,
  docKey,
  type SapBusinessPartner,
  type SapCustomer360,
  type SapDocDetail,
  type SapDocLine,
  type SapDocList,
  type SapDocStatus,
  type SapDocSummary,
  type SapDocType,
  type SapRelationshipMap,
  type SapSearchResult,
} from '@/lib/sapExplorerTypes';

const MARKETING_DOC_SELECT =
  'DocEntry,DocNum,DocDate,DocDueDate,DocTotal,DocCurrency,DocumentStatus,Cancelled,CardCode,CardName,NumAtCard';
const PRODUCTION_ORDER_SELECT =
  'AbsoluteEntry,DocumentNumber,PostingDate,DueDate,ItemNo,ProductDescription,PlannedQuantity,CompletedQuantity,ProductionOrderStatus,CustomerCode,ProductionOrderOriginEntry,ProductionOrderOrigin';
const BP_SELECT =
  'CardCode,CardName,CardType,FederalTaxID,Phone1,Cellular,EmailAddress,City';
const BP_DETAIL_SELECT =
  'CardCode,CardName,CardType,FederalTaxID,Phone1,Phone2,Cellular,EmailAddress,City,Address,CurrentAccountBalance,OpenOrdersBalance,OpenDeliveryNotesBalance,CreditLimit,SalesPersonCode,ContactPerson,Frozen';

/** Documentos de marketing (todos menos la orden de fabricación). */
const MARKETING_TYPES = SAP_DOC_TYPE_ORDER.filter((t) => t !== 'ProductionOrder');

/** Documentos que se pueden crear "copiando a" desde cada tipo (vínculo por línea BaseType/BaseEntry). */
const FORWARD_TARGETS: Record<SapDocType, SapDocType[]> = {
  Quotation: ['Order', 'Delivery', 'Invoice'],
  Order: ['Delivery', 'Invoice', 'DownPayment'],
  DownPayment: [],
  ProductionOrder: [],
  Delivery: ['Invoice', 'Return'],
  Return: ['CreditNote'],
  Invoice: ['CreditNote'],
  CreditNote: [],
};

const TYPE_BY_OBJTYPE = new Map<number, SapDocType>(
  (Object.keys(SAP_DOC_TYPES) as SapDocType[]).map((t) => [SAP_DOC_TYPES[t].objType, t])
);

const MAX_MAP_NODES = 80;
const MAX_MAP_DEPTH = 8;

// ── Utilidades ─────────────────────────────────────────────────────────────────

const odataString = (value: string) => `'${value.replace(/'/g, "''")}'`;
const toDate = (v: unknown) => (typeof v === 'string' && v.length >= 10 ? v.slice(0, 10) : null);
const toNum = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const toStr = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function marketingStatus(raw: any): SapDocStatus {
  if (raw.Cancelled === 'tYES' || raw.Cancelled === 'Y') return 'Cancelado';
  if (raw.DocumentStatus === 'bost_Open' || raw.DocumentStatus === 'O') return 'Abierto';
  return 'Cerrado';
}

const PO_STATUS: Record<string, SapDocStatus> = {
  boposPlanned: 'Planificada',
  boposReleased: 'Liberada',
  boposClosed: 'Cerrada',
  boposCancelled: 'Cancelada',
};

function toSummary(type: SapDocType, raw: any): SapDocSummary {
  if (type === 'ProductionOrder') {
    return {
      key: docKey(type, raw.AbsoluteEntry),
      type,
      docEntry: raw.AbsoluteEntry,
      docNum: raw.DocumentNumber,
      date: toDate(raw.PostingDate),
      dueDate: toDate(raw.DueDate),
      total: null,
      currency: null,
      status: PO_STATUS[raw.ProductionOrderStatus] || 'Planificada',
      cardCode: toStr(raw.CustomerCode),
      cardName: null,
      numAtCard: null,
      itemCode: toStr(raw.ItemNo),
      itemName: toStr(raw.ProductDescription),
      plannedQty: toNum(raw.PlannedQuantity),
      completedQty: toNum(raw.CompletedQuantity),
      originEntry: raw.ProductionOrderOrigin === 'bopooSalesOrder' ? toNum(raw.ProductionOrderOriginEntry) : null,
    };
  }
  return {
    key: docKey(type, raw.DocEntry),
    type,
    docEntry: raw.DocEntry,
    docNum: raw.DocNum,
    date: toDate(raw.DocDate),
    dueDate: toDate(raw.DocDueDate),
    total: toNum(raw.DocTotal),
    currency: raw.DocCurrency === '$' ? 'COP' : toStr(raw.DocCurrency),
    status: marketingStatus(raw),
    cardCode: toStr(raw.CardCode),
    cardName: toStr(raw.CardName),
    numAtCard: toStr(raw.NumAtCard),
  };
}

function toPartner(raw: any): SapBusinessPartner {
  return {
    cardCode: raw.CardCode,
    cardName: raw.CardName || '',
    cardType: raw.CardType === 'cSupplier' ? 'Proveedor' : raw.CardType === 'cLid' ? 'Lead' : 'Cliente',
    federalTaxId: toStr(raw.FederalTaxID),
    phone: toStr(raw.Phone1) || toStr(raw.Phone2),
    cellular: toStr(raw.Cellular),
    email: toStr(raw.EmailAddress),
    city: toStr(raw.City),
  };
}

/** Lista una colección; si la consulta falla devuelve [] para que una entidad caída no tumbe la búsqueda completa. */
async function safeList(path: string): Promise<any[]> {
  try {
    const data = await sapGet<{ value: any[] }>(path);
    return data.value || [];
  } catch (err) {
    console.error('[SAP Explorer] Consulta fallida:', path, err);
    return [];
  }
}

// Nombres de empleados de ventas: se cargan una vez por instancia y se refrescan cada hora.
let salesPersonsCache: { at: number; map: Map<number, string> } | null = null;
async function salesPersonName(code: unknown): Promise<string | null> {
  if (typeof code !== 'number' || code < 0) return null;
  if (!salesPersonsCache || Date.now() - salesPersonsCache.at > 60 * 60 * 1000) {
    try {
      const data = await sapGet<{ value: any[] }>('SalesPersons?$select=SalesEmployeeCode,SalesEmployeeName', { maxPageSize: 5000 });
      salesPersonsCache = {
        at: Date.now(),
        map: new Map(data.value.map((s) => [s.SalesEmployeeCode as number, s.SalesEmployeeName as string])),
      };
    } catch {
      return String(code);
    }
  }
  return salesPersonsCache.map.get(code) || String(code);
}

// ── Búsqueda global ────────────────────────────────────────────────────────────

/**
 * Busca a la vez clientes (cédula/NIT, código o nombre) y documentos (número de documento u orden de compra).
 */
export async function searchSap(rawQuery: string): Promise<SapSearchResult> {
  const started = Date.now();
  const query = rawQuery.trim();
  if (query.length < 2) return { query, partners: [], documents: [], tookMs: 0 };

  const q = odataString(query);
  const isNumber = /^\d+$/.test(query);

  const partnerFilter = isNumber
    ? `contains(FederalTaxID,${q}) or contains(CardCode,${q})`
    : `contains(CardName,${q}) or contains(CardCode,${q}) or contains(FederalTaxID,${q})`;

  const partnerPromise = safeList(
    `BusinessPartners?${new URLSearchParams({ $select: BP_SELECT, $filter: partnerFilter, $orderby: 'CardName', $top: '25' })}`
  );

  // Documentos: por número exacto o por orden de compra del cliente (NumAtCard).
  const docFilter = (isNumber ? `DocNum eq ${query} or ` : '') + `NumAtCard eq ${q}` +
    (query.length >= 4 ? ` or startswith(NumAtCard,${q})` : '');

  const docPromises = MARKETING_TYPES.map(async (type) => {
    const rows = await safeList(
      `${SAP_DOC_TYPES[type].entity}?${new URLSearchParams({
        $select: MARKETING_DOC_SELECT,
        $filter: docFilter,
        $orderby: 'DocEntry desc',
        $top: '15',
      })}`
    );
    return rows.map((r) => toSummary(type, r));
  });

  const productionPromise = isNumber
    ? safeList(
        `ProductionOrders?${new URLSearchParams({
          $select: PRODUCTION_ORDER_SELECT,
          $filter: `DocumentNumber eq ${query}`,
          $top: '5',
        })}`
      ).then((rows) => rows.map((r) => toSummary('ProductionOrder', r)))
    : Promise.resolve([] as SapDocSummary[]);

  const [partnersRaw, productionDocs, ...docGroups] = await Promise.all([partnerPromise, productionPromise, ...docPromises]);

  const documents = [...docGroups.flat(), ...productionDocs];
  // Primero las coincidencias exactas de número de documento, luego las más recientes.
  documents.sort((a, b) => {
    const aExact = String(a.docNum) === query ? 0 : 1;
    const bExact = String(b.docNum) === query ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    return (b.date || '').localeCompare(a.date || '');
  });

  return {
    query,
    partners: partnersRaw.map(toPartner),
    documents,
    tookMs: Date.now() - started,
  };
}

// ── Cliente 360 ────────────────────────────────────────────────────────────────

function cardCodeFilter(field: string, cardCodes: string[]) {
  return cardCodes.map((c) => `${field} eq ${odataString(c)}`).join(' or ');
}

/** Documentos de un tipo para una o varias cuentas, del más reciente al más antiguo. */
export async function listCustomerDocuments(cardCodes: string[], type: SapDocType, skip = 0, top = 50): Promise<SapDocList> {
  const isPO = type === 'ProductionOrder';
  const params = new URLSearchParams({
    $select: isPO ? PRODUCTION_ORDER_SELECT : MARKETING_DOC_SELECT,
    $filter: cardCodeFilter(isPO ? 'CustomerCode' : 'CardCode', cardCodes),
    $orderby: isPO ? 'AbsoluteEntry desc' : 'DocEntry desc',
    $top: String(top),
    $skip: String(skip),
    $inlinecount: 'allpages',
  });
  try {
    const data = await sapGet<{ value: any[]; 'odata.count'?: number | string }>(`${SAP_DOC_TYPES[type].entity}?${params}`);
    return {
      type,
      count: Number(data['odata.count'] ?? data.value.length),
      items: data.value.map((r) => toSummary(type, r)),
    };
  } catch (err) {
    console.error('[SAP Explorer] Error listando', type, err);
    return { type, count: 0, items: [] };
  }
}

export async function getCustomer360(cardCode: string, includeRelated = true): Promise<SapCustomer360 | null> {
  let raw: any;
  try {
    raw = await sapGet(`BusinessPartners(${odataString(cardCode)})?$select=${BP_DETAIL_SELECT}`);
  } catch (err) {
    if (err instanceof SapRequestError && err.status === 404) return null;
    throw err;
  }

  const partner: SapBusinessPartner = {
    ...toPartner(raw),
    address: toStr(raw.Address),
    balance: toNum(raw.CurrentAccountBalance),
    openOrdersBalance: toNum(raw.OpenOrdersBalance),
    openDeliveriesBalance: toNum(raw.OpenDeliveryNotesBalance),
    creditLimit: toNum(raw.CreditLimit),
    contactPerson: toStr(raw.ContactPerson),
    frozen: raw.Frozen === 'tYES',
  };

  const [salesPerson, related] = await Promise.all([
    salesPersonName(raw.SalesPersonCode),
    partner.federalTaxId
      ? safeList(
          `BusinessPartners?${new URLSearchParams({
            $select: 'CardCode,CardName',
            $filter: `FederalTaxID eq ${odataString(partner.federalTaxId)}`,
            $orderby: 'CardCode',
            $top: '30',
          })}`
        )
      : Promise.resolve([] as any[]),
  ]);
  partner.salesPerson = salesPerson;

  const relatedAccounts = related
    .filter((r) => r.CardCode !== cardCode)
    .map((r) => ({ cardCode: r.CardCode as string, cardName: (r.CardName as string) || '' }));

  const cardCodes = [cardCode, ...(includeRelated ? relatedAccounts.map((r) => r.cardCode) : [])];
  const documents = await Promise.all(SAP_DOC_TYPE_ORDER.map((t) => listCustomerDocuments(cardCodes, t, 0, 25)));

  return { partner, relatedAccounts, cardCodes, documents };
}

// ── Resolución de documentos ───────────────────────────────────────────────────

/** Convierte un número de documento (DocNum) en su DocEntry. */
export async function resolveDocEntry(type: SapDocType, docNum: string): Promise<number | null> {
  if (!/^\d+$/.test(docNum)) return null;
  const isPO = type === 'ProductionOrder';
  const rows = await safeList(
    `${SAP_DOC_TYPES[type].entity}?${new URLSearchParams({
      $select: isPO ? 'AbsoluteEntry' : 'DocEntry',
      $filter: `${isPO ? 'DocumentNumber' : 'DocNum'} eq ${docNum}`,
      $orderby: isPO ? 'AbsoluteEntry desc' : 'DocEntry desc',
      $top: '1',
    })}`
  );
  if (rows.length === 0) return null;
  return isPO ? rows[0].AbsoluteEntry : rows[0].DocEntry;
}

/** Resúmenes de varios documentos del mismo tipo, en lotes de 20 por consulta. */
async function fetchSummaries(type: SapDocType, entries: number[]): Promise<SapDocSummary[]> {
  if (entries.length === 0) return [];
  const isPO = type === 'ProductionOrder';
  const keyField = isPO ? 'AbsoluteEntry' : 'DocEntry';
  const batches = await Promise.all(
    chunk(entries, 20).map((group) =>
      safeList(
        `${SAP_DOC_TYPES[type].entity}?${new URLSearchParams({
          $select: isPO ? PRODUCTION_ORDER_SELECT : MARKETING_DOC_SELECT,
          $filter: group.map((e) => `${keyField} eq ${e}`).join(' or '),
          $top: String(group.length),
        })}`
      )
    )
  );
  return batches.flat().map((r) => toSummary(type, r));
}

// ── Mapa de relaciones ─────────────────────────────────────────────────────────

/** Documentos origen de un documento, leídos de sus líneas (BaseType/BaseEntry). */
async function findBaseDocs(node: SapDocSummary): Promise<string[]> {
  if (node.type === 'ProductionOrder') {
    return node.originEntry ? [docKey('Order', node.originEntry)] : [];
  }
  const entity = SAP_DOC_TYPES[node.type].entity;
  const path =
    `$crossjoin(${entity},${entity}/DocumentLines)?$expand=${entity}/DocumentLines($select=BaseType,BaseEntry)` +
    `&$filter=${entity}/DocEntry eq ${entity}/DocumentLines/DocEntry and ${entity}/DocEntry eq ${node.docEntry}`;
  try {
    const data = await sapGet<{ value: any[] }>(path.replace(/ /g, '%20'), { maxPageSize: 1000 });
    const keys = new Set<string>();
    for (const row of data.value) {
      const line = row[`${entity}/DocumentLines`];
      const baseType = TYPE_BY_OBJTYPE.get(line?.BaseType);
      if (baseType && typeof line.BaseEntry === 'number') keys.add(docKey(baseType, line.BaseEntry));
    }
    return [...keys];
  } catch (err) {
    console.error('[SAP Explorer] Error leyendo documentos base de', node.key, err);
    return [];
  }
}

/** Documentos destino ("copiar a") de un documento. */
async function findTargetDocs(node: SapDocSummary): Promise<string[]> {
  const sourceObjType = SAP_DOC_TYPES[node.type].objType;
  const lookups = FORWARD_TARGETS[node.type].map(async (target) => {
    const entity = SAP_DOC_TYPES[target].entity;
    const path =
      `$crossjoin(${entity},${entity}/DocumentLines)?$expand=${entity}($select=DocEntry)` +
      `&$filter=${entity}/DocEntry eq ${entity}/DocumentLines/DocEntry` +
      ` and ${entity}/DocumentLines/BaseType eq ${sourceObjType} and ${entity}/DocumentLines/BaseEntry eq ${node.docEntry}`;
    try {
      const data = await sapGet<{ value: any[] }>(path.replace(/ /g, '%20'), { maxPageSize: 1000 });
      // En $crossjoin SAP nombra el campo de forma inconsistente ("DocEntry", "Numerator" o "Internal Number"),
      // por eso se pide un único campo y se toma su valor sin importar el nombre.
      const entries = new Set<number>(
        data.value
          .map((row) => (row[entity] ? Object.values(row[entity])[0] : null))
          .filter((e): e is number => typeof e === 'number')
      );
      return [...entries].map((e) => docKey(target, e));
    } catch (err) {
      console.error('[SAP Explorer] Error leyendo', target, 'desde', node.key, err);
      return [] as string[];
    }
  });

  if (node.type === 'Order') {
    lookups.push(
      safeList(
        `ProductionOrders?${new URLSearchParams({
          $select: 'AbsoluteEntry',
          $filter: `ProductionOrderOriginEntry eq ${node.docEntry}`,
          $top: '200',
        })}`
      ).then((rows) => rows.map((r) => docKey('ProductionOrder', r.AbsoluteEntry)))
    );
  }

  return (await Promise.all(lookups)).flat();
}

/**
 * Recorre en ambos sentidos todos los documentos vinculados (como el mapa de relaciones de SAP B1):
 * oferta → pedido → OF / anticipo → entrega → factura / devolución → nota crédito.
 */
export async function buildRelationshipMap(type: SapDocType, docEntry: number): Promise<SapRelationshipMap | null> {
  const [root] = await fetchSummaries(type, [docEntry]);
  if (!root) return null;

  const nodes = new Map<string, SapDocSummary>([[root.key, root]]);
  const edges = new Set<string>();
  let frontier: SapDocSummary[] = [root];
  let truncated = false;

  for (let depth = 0; depth < MAX_MAP_DEPTH && frontier.length > 0; depth++) {
    const found = await Promise.all(
      frontier.map(async (node) => {
        const [bases, targets] = await Promise.all([findBaseDocs(node), findTargetDocs(node)]);
        return { node, bases, targets };
      })
    );

    const newKeys = new Set<string>();
    for (const { node, bases, targets } of found) {
      for (const b of bases) {
        edges.add(`${b}>${node.key}`);
        if (!nodes.has(b)) newKeys.add(b);
      }
      for (const t of targets) {
        edges.add(`${node.key}>${t}`);
        if (!nodes.has(t)) newKeys.add(t);
      }
    }

    let pending = [...newKeys];
    if (nodes.size + pending.length > MAX_MAP_NODES) {
      truncated = true;
      pending = pending.slice(0, Math.max(0, MAX_MAP_NODES - nodes.size));
    }

    const byType = new Map<SapDocType, number[]>();
    for (const key of pending) {
      const [t, e] = key.split(':') as [SapDocType, string];
      byType.set(t, [...(byType.get(t) || []), Number(e)]);
    }
    const summaries = (await Promise.all([...byType].map(([t, entries]) => fetchSummaries(t, entries)))).flat();
    for (const s of summaries) nodes.set(s.key, s);
    frontier = summaries;
  }

  return {
    rootKey: root.key,
    nodes: [...nodes.values()],
    edges: [...edges]
      .map((e) => {
        const [from, to] = e.split('>');
        return { from, to };
      })
      .filter((e) => nodes.has(e.from) && nodes.has(e.to)),
    truncated,
  };
}

// ── Detalle de documento ───────────────────────────────────────────────────────

const EXTRA_FIELDS: Array<[string, string]> = [
  ['U_Segmentacion', 'Segmento'],
  ['U_TipoVentas', 'Tipo de venta'],
  ['U_TipoFacturacion', 'Tipo de facturación'],
  ['U_Bloqueado', 'Bloqueo de despacho'],
  ['U_Despachado', 'Despachado'],
  ['U_Fecha_Plan_Ent_Cliente', 'Entrega planeada al cliente'],
  ['U_FechaCierre', 'Fecha cierre (pedido)'],
  ['U_EtapaObra', 'Obra / etapa'],
  ['U_NumLote', 'Número de lote'],
  ['U_Tipo_Orden', 'Tipo de orden'],
  ['U_HBT_Tercero', 'Tercero'],
];

export async function getDocumentDetail(type: SapDocType, docEntry: number): Promise<SapDocDetail | null> {
  let raw: any;
  try {
    raw = await sapGet(`${SAP_DOC_TYPES[type].entity}(${docEntry})`);
  } catch (err) {
    if (err instanceof SapRequestError && err.status === 404) return null;
    throw err;
  }

  const summary = toSummary(type, raw);
  const extra = EXTRA_FIELDS.flatMap(([field, label]) => {
    const v = raw[field];
    if (v === null || v === undefined || v === '') return [];
    const value = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10).split('-').reverse().join('/') : String(v);
    return [{ label, value }];
  });

  if (type === 'ProductionOrder') {
    const lines: SapDocLine[] = (raw.ProductionOrderLines || []).map((l: any, i: number) => ({
      lineNum: l.LineNumber ?? i,
      itemCode: l.ItemNo || '',
      description: l.ItemName || '',
      quantity: toNum(l.PlannedQuantity) ?? 0,
      openQty: toNum(l.IssuedQuantity),
      price: null,
      lineTotal: null,
      warehouse: toStr(l.Warehouse),
      status: null,
      base: null,
    }));
    return {
      summary,
      salesPerson: null,
      comments: toStr(raw.Remarks) || toStr(raw.JournalRemarks),
      address: null,
      shipTo: null,
      vatSum: null,
      extra: [
        { label: 'Almacén', value: raw.Warehouse || '' },
        ...(summary.originEntry ? [{ label: 'Pedido origen', value: String(raw.ProductionOrderOriginNumber ?? '') }] : []),
        ...extra,
      ],
      lines,
    };
  }

  const lines: SapDocLine[] = (raw.DocumentLines || []).map((l: any) => {
    const baseType = TYPE_BY_OBJTYPE.get(l.BaseType) || null;
    return {
      lineNum: l.LineNum,
      itemCode: l.ItemCode || '',
      description: l.ItemDescription || '',
      quantity: toNum(l.Quantity) ?? 0,
      openQty: toNum(l.RemainingOpenQuantity),
      price: toNum(l.Price),
      lineTotal: toNum(l.LineTotal),
      warehouse: toStr(l.WarehouseCode),
      status: l.LineStatus === 'bost_Open' ? 'Abierta' : 'Cerrada',
      base: baseType ? { type: baseType, docEntry: toNum(l.BaseEntry) } : null,
    };
  });

  return {
    summary,
    salesPerson: await salesPersonName(raw.SalesPersonCode),
    comments: toStr(raw.Comments),
    address: toStr(raw.Address),
    shipTo: toStr(raw.Address2),
    vatSum: toNum(raw.VatSum),
    extra,
    lines,
  };
}
