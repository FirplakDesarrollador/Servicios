if (typeof process !== 'undefined') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const SAP_BASE_URL = process.env.SAP_BASE_URL || 'https://200.7.96.194:50000/b1s/v1';
const SAP_COMPANY_DB = process.env.SAP_COMPANY_DB || 'Firplak_SA';
const SAP_USERNAME = process.env.SAP_USERNAME || 'manager';
const SAP_PASSWORD = process.env.SAP_PASSWORD || '2023Fir#.*';

let sapSessionCookie: string | null = null;
let sessionExpiresAt: number = 0;

/**
 * Login to SAP Service Layer and cache session cookie
 */
export async function getSapSessionCookie(): Promise<string> {
  const now = Date.now();
  if (sapSessionCookie && now < sessionExpiresAt) {
    return sapSessionCookie;
  }

  const loginUrl = `${SAP_BASE_URL}/Login`;
  console.log('[SAP Service Layer] Authenticating with:', loginUrl);

  const res = await fetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      CompanyDB: SAP_COMPANY_DB,
      UserName: SAP_USERNAME,
      Password: SAP_PASSWORD
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[SAP Service Layer] Login failed:', res.status, errText);
    throw new Error(`Error autenticando en SAP Service Layer (${res.status}): ${errText}`);
  }

  const cookieHeader = res.headers.get('set-cookie');
  if (!cookieHeader) {
    throw new Error('SAP Service Layer no retornó las galletas de sesión B1SESSION');
  }

  const data = await res.json();
  const timeoutMinutes = data.SessionTimeout || 30;

  sapSessionCookie = cookieHeader;
  sessionExpiresAt = now + (timeoutMinutes - 2) * 60 * 1000;

  console.log('[SAP Service Layer] Login exitoso. SessionId:', data.SessionId);
  return sapSessionCookie;
}

/**
 * Fetch Business Partners (Clientes/Proveedores OCRD) from SAP
 */
export async function fetchSapBusinessPartners(searchQuery?: string) {
  const cookie = await getSapSessionCookie();
  const url = `${SAP_BASE_URL}/BusinessPartners`;

  const res = await fetch(url, {
    headers: { 'Cookie': cookie }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error consultando BusinessPartners de SAP: ${err}`);
  }

  const data = await res.json();
  const list = data.value || [];

  if (searchQuery) {
    const q = searchQuery.toLowerCase().trim();
    return list.filter((bp: any) => 
      bp.CardCode?.toLowerCase().includes(q) || 
      bp.CardName?.toLowerCase().includes(q) ||
      bp.FederalTaxID?.toLowerCase().includes(q)
    );
  }

  return list;
}

/**
 * Fetch Items (Artículos OITM) from SAP
 */
export async function fetchSapItems(searchQuery?: string) {
  const cookie = await getSapSessionCookie();
  const url = `${SAP_BASE_URL}/Items`;

  const res = await fetch(url, {
    headers: { 'Cookie': cookie }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error consultando Artículos de SAP: ${err}`);
  }

  const data = await res.json();
  const list = data.value || [];

  if (searchQuery) {
    const q = searchQuery.toLowerCase().trim();
    return list.filter((item: any) => 
      item.ItemCode?.toLowerCase().includes(q) || 
      item.ItemName?.toLowerCase().includes(q)
    );
  }

  return list;
}

/**
 * Fetch a single Quotation (Oferta de Ventas OQUT) or Order (ORDR) by DocNum or DocEntry using OData $filter
 */
export async function fetchSapQuotationByDocNum(searchNum: string) {
  const cookie = await getSapSessionCookie();
  const target = String(searchNum).trim();
  const isNumeric = /^\d+$/.test(target);

  // 1. Try Quotations (OQUT) with $filter=DocNum eq target
  if (isNumeric) {
    const qUrl = `${SAP_BASE_URL}/Quotations?$filter=DocNum eq ${target}`;
    console.log('[SAP Service Layer] Querying Quotations filter:', qUrl);
    const qRes = await fetch(qUrl, { headers: { 'Cookie': cookie } });
    if (qRes.ok) {
      const qData = await qRes.json();
      if (qData.value && qData.value.length > 0) {
        return { documentType: 'Quotation', data: qData.value[0] };
      }
    }
  }

  // 2. Try Orders (ORDR) with $filter=DocNum eq target
  if (isNumeric) {
    const oUrl = `${SAP_BASE_URL}/Orders?$filter=DocNum eq ${target}`;
    console.log('[SAP Service Layer] Querying Orders filter:', oUrl);
    const oRes = await fetch(oUrl, { headers: { 'Cookie': cookie } });
    if (oRes.ok) {
      const oData = await oRes.json();
      if (oData.value && oData.value.length > 0) {
        return { documentType: 'Order', data: oData.value[0] };
      }
    }
  }

  // 3. Fallback: try fetching by internal DocEntry
  if (isNumeric) {
    const directQRes = await fetch(`${SAP_BASE_URL}/Quotations(${target})`, { headers: { 'Cookie': cookie } });
    if (directQRes.ok) {
      const directQData = await directQRes.json();
      if (directQData && directQData.DocNum) {
        return { documentType: 'Quotation', data: directQData };
      }
    }
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
