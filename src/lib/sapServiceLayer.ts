if (typeof process !== 'undefined') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const SAP_BASE_URL = process.env.SAP_BASE_URL || 'https://200.7.96.194:50000/b1s/v1';
const SAP_COMPANY_DB = process.env.SAP_COMPANY_DB || 'Firplak_SA';
const SAP_USERNAME = process.env.SAP_USERNAME || 'manager';
const SAP_PASSWORD = process.env.SAP_PASSWORD || '2023Fir#.*';

export { SAP_BASE_URL };

// El Login del Service Layer tarda entre 2 y 10 s, mientras que una consulta tarda ~50 ms.
// Por eso la sesión se reutiliza al máximo: se comparte entre peticiones de la misma instancia,
// los logins simultáneos se unifican en uno solo y el vencimiento se extiende con cada uso
// (el timeout de SAP es por inactividad).
let sapSessionCookie: string | null = null;
let sessionExpiresAt: number = 0;
let sessionTimeoutMs = 30 * 60 * 1000;
let loginInFlight: Promise<string> | null = null;

async function loginToServiceLayer(): Promise<string> {
  const loginUrl = `${SAP_BASE_URL}/Login`;
  console.log('[SAP Service Layer] Authenticating with:', loginUrl);

  const res = await fetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      CompanyDB: SAP_COMPANY_DB,
      UserName: SAP_USERNAME,
      Password: SAP_PASSWORD
    }),
    signal: AbortSignal.timeout(30000),
    cache: 'no-store'
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[SAP Service Layer] Login failed:', res.status, errText);
    throw new Error(`Error autenticando en SAP Service Layer (${res.status}): ${errText}`);
  }

  // Solo el par nombre=valor de cada cookie (B1SESSION y ROUTEID), sin atributos.
  const setCookies = res.headers.getSetCookie();
  const cookie = setCookies.length > 0
    ? setCookies.map((c) => c.split(';')[0]).join('; ')
    : res.headers.get('set-cookie');
  if (!cookie) {
    throw new Error('SAP Service Layer no retornó las galletas de sesión B1SESSION');
  }

  const data = await res.json();
  sessionTimeoutMs = (data.SessionTimeout || 30) * 60 * 1000;

  sapSessionCookie = cookie;
  sessionExpiresAt = Date.now() + sessionTimeoutMs - 2 * 60 * 1000;

  console.log('[SAP Service Layer] Login exitoso. SessionId:', data.SessionId);
  return cookie;
}

/**
 * Login to SAP Service Layer and cache session cookie
 */
export async function getSapSessionCookie(forceNew = false): Promise<string> {
  if (!forceNew && sapSessionCookie && Date.now() < sessionExpiresAt) {
    return sapSessionCookie;
  }
  if (forceNew) {
    sapSessionCookie = null;
  }
  if (!loginInFlight) {
    loginInFlight = loginToServiceLayer().finally(() => {
      loginInFlight = null;
    });
  }
  return loginInFlight;
}

// El Service Layer bloquea las peticiones simultáneas sobre una misma sesión: con 2 a la vez responde en
// ~0.2 s, pero con 7 cada una espera ~7 s a la anterior y terminan en timeout. Por eso las peticiones
// se encolan y salen de a una (cada consulta tarda ~50 ms, así que en fila es mucho más rápido).
const SAP_MAX_CONCURRENT = 1;
let sapActive = 0;
const sapWaiting: Array<() => void> = [];

async function withSapSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (sapActive >= SAP_MAX_CONCURRENT) {
    await new Promise<void>((resolve) => sapWaiting.push(resolve));
  } else {
    sapActive++;
  }
  try {
    return await fn();
  } finally {
    const next = sapWaiting.shift();
    if (next) next();
    else sapActive--;
  }
}

/**
 * `fetch` al Service Layer pasando por la cola de la sesión compartida.
 * El timeout empieza a contar cuando la petición sale, no mientras espera turno.
 */
export function sapQueuedFetch(url: string, init: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  return withSapSlot(() => fetch(url, { cache: 'no-store', ...init, signal: AbortSignal.timeout(timeoutMs) }));
}

export class SapRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * GET de solo lectura al Service Layer. Reintenta una vez con sesión nueva si SAP la invalidó (401).
 * `path` es relativo a la base (ej. "Orders?$filter=...").
 */
export async function sapGet<T = any>(path: string, opts: { maxPageSize?: number; timeoutMs?: number } = {}): Promise<T> {
  const doRequest = async (cookie: string) => {
    const headers: Record<string, string> = { Cookie: cookie, Accept: 'application/json' };
    if (opts.maxPageSize) headers.Prefer = `odata.maxpagesize=${opts.maxPageSize}`;
    return sapQueuedFetch(`${SAP_BASE_URL}/${path}`, { headers }, opts.timeoutMs);
  };

  let res = await doRequest(await getSapSessionCookie());
  if (res.status === 401) {
    res = await doRequest(await getSapSessionCookie(true));
  }

  if (!res.ok) {
    const body = await res.text();
    let message = body.slice(0, 300);
    try {
      message = JSON.parse(body)?.error?.message?.value || message;
    } catch {
      // respuesta no JSON
    }
    throw new SapRequestError(`SAP ${res.status}: ${message}`, res.status);
  }

  sessionExpiresAt = Math.max(sessionExpiresAt, Date.now() + sessionTimeoutMs - 2 * 60 * 1000);
  return res.json() as Promise<T>;
}

/**
 * Fetch Business Partners (Clientes/Proveedores OCRD) from SAP
 */
export async function fetchSapBusinessPartners(searchQuery?: string) {
  // El filtro se hace en SAP: antes se traía la primera página sin filtrar (20 registros) y se filtraba aquí.
  const q = (searchQuery || '').trim().replace(/'/g, "''");
  const params = new URLSearchParams({
    $select: 'CardCode,CardName,FederalTaxID,ContactPerson,CardType',
    $orderby: 'CardName',
    $top: '50'
  });
  if (q) {
    params.set('$filter', `contains(CardCode,'${q}') or contains(CardName,'${q}') or contains(FederalTaxID,'${q}')`);
  }
  const data = await sapGet<{ value: any[] }>(`BusinessPartners?${params.toString()}`);
  return data.value || [];
}

/**
 * Fetch Items (Artículos OITM) from SAP
 */
export async function fetchSapItems(searchQuery?: string) {
  const q = (searchQuery || '').trim().replace(/'/g, "''");
  const params = new URLSearchParams({
    $select: 'ItemCode,ItemName,ItemPrices',
    $orderby: 'ItemCode',
    $top: '50'
  });
  if (q) {
    params.set('$filter', `contains(ItemCode,'${q}') or contains(ItemName,'${q}')`);
  }
  const data = await sapGet<{ value: any[] }>(`Items?${params.toString()}`);
  return data.value || [];
}

/**
 * Fetch Sales Person name by Code
 */
export async function fetchSapSalesPersonName(code: number | string): Promise<string> {
  if (!code || code === -1) return '-Ningún empleado del departamento-';
  try {
    const cookie = await getSapSessionCookie();
    const res = await sapQueuedFetch(`${SAP_BASE_URL}/SalesPersons(${code})`, { headers: { 'Cookie': cookie } });
    if (res.ok) {
      const data = await res.json();
      return data.SalesEmployeeName || String(code);
    }
  } catch (err) {
    console.error('Error fetching SalesPerson:', err);
  }
  return String(code);
}

/**
 * Fetch Contact Person Name for a BusinessPartner and ContactPersonCode
 */
export async function fetchSapContactPersonName(cardCode: string, contactCode: number | string): Promise<string> {
  if (!cardCode || !contactCode) return '';
  try {
    const cookie = await getSapSessionCookie();
    const res = await sapQueuedFetch(`${SAP_BASE_URL}/BusinessPartners('${encodeURIComponent(cardCode)}')?$select=ContactEmployees`, { headers: { 'Cookie': cookie } });
    if (res.ok) {
      const data = await res.json();
      const contacts = data.ContactEmployees || [];
      const found = contacts.find((c: any) => String(c.InternalCode) === String(contactCode) || String(c.Code) === String(contactCode));
      if (found) {
        return found.Name || `${found.FirstName || ''} ${found.LastName || ''}`.trim();
      }
    }
  } catch (err) {
    console.error('Error fetching ContactPerson:', err);
  }
  return String(contactCode);
}

/**
 * Fetch Employee Name by EmpID (Owner)
 */
export async function fetchSapEmployeeName(empID: number | string): Promise<string> {
  if (!empID) return '';
  try {
    const cookie = await getSapSessionCookie();
    const res = await sapQueuedFetch(`${SAP_BASE_URL}/EmployeesInfo(${empID})`, { headers: { 'Cookie': cookie } });
    if (res.ok) {
      const data = await res.json();
      if (data.LastName && data.FirstName) {
        return `${data.LastName}, ${data.FirstName}`;
      }
      return data.LastName || data.FirstName || String(empID);
    }
  } catch (err) {
    console.error('Error fetching EmployeeInfo:', err);
  }
  return String(empID);
}

/**
 * Fetch a single Quotation (Oferta de Ventas OQUT) or Order (ORDR) by DocNum or DocEntry using OData $filter
 */
export async function fetchSapQuotationByDocNum(
  docNumOrEntry: string,
  preferType?: 'Order' | 'Quotation' | 'Delivery' | 'ProductionOrder' | 'Invoice'
) {
  const cookie = await getSapSessionCookie();
  const target = docNumOrEntry.trim();
  const isNumeric = /^\d+$/.test(target);

  let docData: any = null;
  let documentType: 'Quotation' | 'Order' | 'Delivery' | 'ProductionOrder' | 'Invoice' = preferType || 'Quotation';

  if (preferType === 'Invoice') {
    // 1. Try Invoices (OINV) first
    if (isNumeric) {
      const iUrl = `${SAP_BASE_URL}/Invoices?$filter=DocNum eq ${target}`;
      console.log('[SAP Service Layer] Querying Invoices filter:', iUrl);
      const iRes = await sapQueuedFetch(iUrl, { headers: { 'Cookie': cookie } });
      if (iRes.ok) {
        const iData = await iRes.json();
        if (iData.value && iData.value.length > 0) {
          docData = iData.value[0];
          documentType = 'Invoice';
        }
      }
    }
    // 2. Fallback to DeliveryNotes
    if (!docData && isNumeric) {
      const dUrl = `${SAP_BASE_URL}/DeliveryNotes?$filter=DocNum eq ${target}`;
      console.log('[SAP Service Layer] Querying DeliveryNotes filter:', dUrl);
      const dRes = await sapQueuedFetch(dUrl, { headers: { 'Cookie': cookie } });
      if (dRes.ok) {
        const dData = await dRes.json();
        if (dData.value && dData.value.length > 0) {
          docData = dData.value[0];
          documentType = 'Delivery';
        }
      }
    }
  } else if (preferType === 'Delivery') {
    // 1. Try DeliveryNotes (ODLN) first
    if (isNumeric) {
      const dUrl = `${SAP_BASE_URL}/DeliveryNotes?$filter=DocNum eq ${target}`;
      console.log('[SAP Service Layer] Querying DeliveryNotes filter:', dUrl);
      const dRes = await sapQueuedFetch(dUrl, { headers: { 'Cookie': cookie } });
      if (dRes.ok) {
        const dData = await dRes.json();
        if (dData.value && dData.value.length > 0) {
          docData = dData.value[0];
          documentType = 'Delivery';
        }
      }
    }
    // 2. Fallback to Orders
    if (!docData && isNumeric) {
      const oUrl = `${SAP_BASE_URL}/Orders?$filter=DocNum eq ${target}`;
      console.log('[SAP Service Layer] Querying Orders filter:', oUrl);
      const oRes = await sapQueuedFetch(oUrl, { headers: { 'Cookie': cookie } });
      if (oRes.ok) {
        const oData = await oRes.json();
        if (oData.value && oData.value.length > 0) {
          docData = oData.value[0];
          documentType = 'Order';
        }
      }
    }
  } else if (preferType === 'ProductionOrder') {
    // 1. Try ProductionOrders (OWOR)
    if (isNumeric) {
      const poUrl = `${SAP_BASE_URL}/ProductionOrders?$filter=DocumentNumber eq ${target}`;
      console.log('[SAP Service Layer] Querying ProductionOrders filter:', poUrl);
      const poRes = await sapQueuedFetch(poUrl, { headers: { 'Cookie': cookie } });
      if (poRes.ok) {
        const poData = await poRes.json();
        if (poData.value && poData.value.length > 0) {
          docData = poData.value[0];
          documentType = 'ProductionOrder';
          console.log('[SAP PO] Raw document keys:', Object.keys(docData));
          console.log('[SAP PO] ProductionOrderLines count:', docData.ProductionOrderLines?.length ?? 'N/A');
          console.log('[SAP PO] Sample fields:', {
            DocumentNumber: docData.DocumentNumber,
            PostingDate: docData.PostingDate,
            StartDate: docData.StartDate,
            DueDate: docData.DueDate,
            UserSignature: docData.UserSignature,
            CustomerCode: docData.CustomerCode,
            Comments: docData.Comments,
            ItemNo: docData.ItemNo,
            ProductDescription: docData.ProductDescription,
            PlannedQuantity: docData.PlannedQuantity,
            ProductionOrderStatus: docData.ProductionOrderStatus,
            U_NumLote: docData.U_NumLote,
          });
          if (docData.ProductionOrderLines?.length > 0) {
            console.log('[SAP PO] Sample line keys:', Object.keys(docData.ProductionOrderLines[0]));
          }
        }
      }
    }
    // 1b. Try by AbsoluteEntry if DocumentNumber didn't match
    if (!docData && isNumeric) {
      const poUrl2 = `${SAP_BASE_URL}/ProductionOrders(${target})`;
      console.log('[SAP Service Layer] Querying ProductionOrders by entry:', poUrl2);
      const poRes2 = await sapQueuedFetch(poUrl2, { headers: { 'Cookie': cookie } });
      if (poRes2.ok) {
        const poData2 = await poRes2.json();
        if (poData2 && (poData2.DocumentNumber || poData2.AbsoluteEntry)) {
          docData = poData2;
          documentType = 'ProductionOrder';
          console.log('[SAP PO by entry] Keys:', Object.keys(docData));
        }
      }
    }
  } else if (preferType === 'Order') {
    // 1. Try Orders (ORDR) first
    if (isNumeric) {
      const oUrl = `${SAP_BASE_URL}/Orders?$filter=DocNum eq ${target}`;
      console.log('[SAP Service Layer] Querying Orders filter:', oUrl);
      const oRes = await sapQueuedFetch(oUrl, { headers: { 'Cookie': cookie } });
      if (oRes.ok) {
        const oData = await oRes.json();
        if (oData.value && oData.value.length > 0) {
          docData = oData.value[0];
          documentType = 'Order';
        }
      }
    }
    // 2. Fallback to Quotations (OQUT)
    if (!docData && isNumeric) {
      const qUrl = `${SAP_BASE_URL}/Quotations?$filter=DocNum eq ${target}`;
      console.log('[SAP Service Layer] Querying Quotations filter:', qUrl);
      const qRes = await sapQueuedFetch(qUrl, { headers: { 'Cookie': cookie } });
      if (qRes.ok) {
        const qData = await qRes.json();
        if (qData.value && qData.value.length > 0) {
          docData = qData.value[0];
          documentType = 'Quotation';
        }
      }
    }
  } else {
    // 1. Try Quotations (OQUT) first
    if (isNumeric) {
      const qUrl = `${SAP_BASE_URL}/Quotations?$filter=DocNum eq ${target}`;
      console.log('[SAP Service Layer] Querying Quotations filter:', qUrl);
      const qRes = await sapQueuedFetch(qUrl, { headers: { 'Cookie': cookie } });
      if (qRes.ok) {
        const qData = await qRes.json();
        if (qData.value && qData.value.length > 0) {
          docData = qData.value[0];
          documentType = 'Quotation';
        }
      }
    }

    // 2. Try Orders (ORDR)
    if (!docData && isNumeric) {
      const oUrl = `${SAP_BASE_URL}/Orders?$filter=DocNum eq ${target}`;
      console.log('[SAP Service Layer] Querying Orders filter:', oUrl);
      const oRes = await sapQueuedFetch(oUrl, { headers: { 'Cookie': cookie } });
      if (oRes.ok) {
        const oData = await oRes.json();
        if (oData.value && oData.value.length > 0) {
          docData = oData.value[0];
          documentType = 'Order';
        }
      }
    }
  }

  // 3. Fallback: try fetching by internal DocEntry
  if (!docData && isNumeric) {
    const directQRes = await sapQueuedFetch(`${SAP_BASE_URL}/Quotations(${target})`, { headers: { 'Cookie': cookie } });
    if (directQRes.ok) {
      const directQData = await directQRes.json();
      if (directQData && directQData.DocNum) {
        docData = directQData;
        documentType = 'Quotation';
      }
    }
  }

  if (docData) {
    // Enriquecer con nombres de empleado de ventas, contacto y titular (en paralelo)
    const [slpName, contactName, ownerName] = await Promise.all([
      docData.SalesPersonCode
        ? fetchSapSalesPersonName(docData.SalesPersonCode)
        : Promise.resolve('-Ningún empleado del departamento-'),
      docData.ContactPersonCode && docData.CardCode
        ? fetchSapContactPersonName(docData.CardCode, docData.ContactPersonCode)
        : Promise.resolve(''),
      docData.DocumentsOwner ? fetchSapEmployeeName(docData.DocumentsOwner) : Promise.resolve('')
    ]);
    docData._SalesEmployeeName = slpName;
    docData._ContactPersonName = contactName || String(docData.ContactPersonCode || '');
    docData._OwnerName = ownerName || String(docData.DocumentsOwner || '');

    // Enrich UserSignature (Production Order user) → get name from EmployeesInfo
    if (documentType === 'ProductionOrder' && docData.UserSignature) {
      try {
        const cookie2 = await getSapSessionCookie();
        // Try Users endpoint first (SBO_SP_Users)
        const userRes = await sapQueuedFetch(`${SAP_BASE_URL}/Users(${docData.UserSignature})`, { headers: { 'Cookie': cookie2 } });
        if (userRes.ok) {
          const userData = await userRes.json();
          docData._UserSignatureName = userData.UserName || userData.FullName || String(docData.UserSignature);
          console.log('[SAP PO] User name resolved:', docData._UserSignatureName);
        } else {
          // Fallback to EmployeesInfo
          const empRes = await sapQueuedFetch(`${SAP_BASE_URL}/EmployeesInfo(${docData.UserSignature})`, { headers: { 'Cookie': cookie2 } });
          if (empRes.ok) {
            const empData = await empRes.json();
            const fullName = [empData.FirstName, empData.LastName].filter(Boolean).join(' ');
            docData._UserSignatureName = fullName || String(docData.UserSignature);
          } else {
            docData._UserSignatureName = String(docData.UserSignature);
          }
        }
      } catch (e) {
        docData._UserSignatureName = String(docData.UserSignature);
      }
    }

    return { documentType, data: docData };
  }

  return null;
}

/**
 * Create a new Sales Quotation (Oferta de Ventas OQUT) in SAP Business One
 */
export async function createSapQuotation(quotationData: {
  CardCode: string;
  DocDueDate?: string;
  Comments?: string;
  DocumentLines: Array<{
    ItemCode: string;
    ItemDescription?: string;
    Quantity: number;
    UnitPrice: number;
    DiscountPercent?: number;
  }>;
}) {
  const cookie = await getSapSessionCookie();
  const url = `${SAP_BASE_URL}/Quotations`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    },
    body: JSON.stringify(quotationData)
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('[SAP Service Layer] Error creating Quotation:', data);
    throw new Error(data.error?.message?.value || 'Error creando Oferta de Ventas en SAP');
  }

  console.log('[SAP Service Layer] Quotation creada exitosamente! DocNum:', data.DocNum, 'DocEntry:', data.DocEntry);
  return data;
}

/**
 * Search for documents by CardCode or CardName
 */
export async function searchSapDocumentsList(query: string, docType: string) {
  const cookie = await getSapSessionCookie();
  
  let endpoint = 'Orders';
  if (docType === 'Quotation') endpoint = 'Quotations';
  else if (docType === 'Delivery') endpoint = 'DeliveryNotes';
  else if (docType === 'Invoice') endpoint = 'Invoices';
  else if (docType === 'ProductionOrder') endpoint = 'ProductionOrders';

  // For Production Orders, the field is CustomerCode. For others, CardCode/CardName
  let filterStr = ``;
  if (endpoint === 'ProductionOrders') {
    filterStr = `CustomerCode eq '${query}' or startswith(ProductDescription, '${query}')`;
  } else {
    filterStr = `CardCode eq '${query}' or startswith(CardName, '${query}') or startswith(NumAtCard, '${query}')`;
  }

  // Use a select to minimize payload and optimize
  const url = `${SAP_BASE_URL}/${endpoint}?` + new URLSearchParams({
    $filter: filterStr,
    $select: endpoint === 'ProductionOrders' 
      ? 'DocumentNumber,ItemNo,ProductDescription,PlannedQuantity,CustomerCode,PostingDate,DueDate,ProductionOrderStatus' 
      : 'DocNum,DocDate,DocDueDate,CardCode,CardName,DocTotal,DocCurrency,NumAtCard,DocumentStatus',
    $orderby: endpoint === 'ProductionOrders' ? 'DocumentNumber desc' : 'DocNum desc',
    $top: '50'
  }).toString();

  const res = await sapQueuedFetch(url, { headers: { Cookie: cookie } });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error buscando documentos en SAP: ${err}`);
  }
  
  const data = await res.json();
  return data.value || [];
}
