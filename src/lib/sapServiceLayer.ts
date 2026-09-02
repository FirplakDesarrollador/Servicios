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
 * Fetch Sales Person name by Code
 */
export async function fetchSapSalesPersonName(code: number | string): Promise<string> {
  if (!code || code === -1) return '-Ningún empleado del departamento-';
  try {
    const cookie = await getSapSessionCookie();
    const res = await fetch(`${SAP_BASE_URL}/SalesPersons(${code})`, { headers: { 'Cookie': cookie } });
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
    const res = await fetch(`${SAP_BASE_URL}/BusinessPartners('${encodeURIComponent(cardCode)}')?$select=ContactEmployees`, { headers: { 'Cookie': cookie } });
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
    const res = await fetch(`${SAP_BASE_URL}/EmployeesInfo(${empID})`, { headers: { 'Cookie': cookie } });
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
      const iRes = await fetch(iUrl, { headers: { 'Cookie': cookie } });
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
      const dRes = await fetch(dUrl, { headers: { 'Cookie': cookie } });
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
      const dRes = await fetch(dUrl, { headers: { 'Cookie': cookie } });
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
      const oRes = await fetch(oUrl, { headers: { 'Cookie': cookie } });
      if (oRes.ok) {
        const oData = await oRes.json();
        if (oData.value && oData.value.length > 0) {
          docData = oData.value[0];
          documentType = 'Order';
        }
      }
    }
  } else if (preferType === 'ProductionOrder') {
    // 1. Try ProductionOrders (OWOR) first
    if (isNumeric) {
      const poUrl = `${SAP_BASE_URL}/ProductionOrders?$filter=DocumentNumber eq ${target} or AbsoluteEntry eq ${target}`;
      console.log('[SAP Service Layer] Querying ProductionOrders filter:', poUrl);
      const poRes = await fetch(poUrl, { headers: { 'Cookie': cookie } });
      if (poRes.ok) {
        const poData = await poRes.json();
        if (poData.value && poData.value.length > 0) {
          docData = poData.value[0];
          documentType = 'ProductionOrder';
        }
      }
    }
    // 2. Fallback to Orders
    if (!docData && isNumeric) {
      const oUrl = `${SAP_BASE_URL}/Orders?$filter=DocNum eq ${target}`;
      console.log('[SAP Service Layer] Querying Orders filter:', oUrl);
      const oRes = await fetch(oUrl, { headers: { 'Cookie': cookie } });
      if (oRes.ok) {
        const oData = await oRes.json();
        if (oData.value && oData.value.length > 0) {
          docData = oData.value[0];
          documentType = 'Order';
        }
      }
    }
  } else if (preferType === 'Order') {
    // 1. Try Orders (ORDR) first
    if (isNumeric) {
      const oUrl = `${SAP_BASE_URL}/Orders?$filter=DocNum eq ${target}`;
      console.log('[SAP Service Layer] Querying Orders filter:', oUrl);
      const oRes = await fetch(oUrl, { headers: { 'Cookie': cookie } });
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
      const qRes = await fetch(qUrl, { headers: { 'Cookie': cookie } });
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
      const qRes = await fetch(qUrl, { headers: { 'Cookie': cookie } });
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
      const oRes = await fetch(oUrl, { headers: { 'Cookie': cookie } });
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
    const directQRes = await fetch(`${SAP_BASE_URL}/Quotations(${target})`, { headers: { 'Cookie': cookie } });
    if (directQRes.ok) {
      const directQData = await directQRes.json();
      if (directQData && directQData.DocNum) {
        docData = directQData;
        documentType = 'Quotation';
      }
    }
  }

  if (docData) {
    // Enrich with Sales Employee Name
    let slpName = '-Ningún empleado del departamento-';
    if (docData.SalesPersonCode) {
      slpName = await fetchSapSalesPersonName(docData.SalesPersonCode);
    }
    docData._SalesEmployeeName = slpName;

    // Enrich with Contact Person Name
    let contactName = '';
    if (docData.ContactPersonCode && docData.CardCode) {
      contactName = await fetchSapContactPersonName(docData.CardCode, docData.ContactPersonCode);
    }
    docData._ContactPersonName = contactName || String(docData.ContactPersonCode || '');

    // Enrich with Owner Name
    let ownerName = '';
    if (docData.DocumentsOwner) {
      ownerName = await fetchSapEmployeeName(docData.DocumentsOwner);
    }
    docData._OwnerName = ownerName || String(docData.DocumentsOwner || '');

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
