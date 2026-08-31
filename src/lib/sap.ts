import { cookies } from 'next/headers';

// Evitar errores de certificado autofirmado en desarrollo (muy común en SAP B1)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export interface SapCredentials {
  CompanyDB: string;
  Password?: string;
  UserName?: string;
}

// Variables de entorno
const SAP_BASE_URL = process.env.SAP_BASE_URL;
const DEFAULT_CREDENTIALS = {
  CompanyDB: process.env.SAP_COMPANY_DB || '',
  Password: process.env.SAP_PASSWORD || '',
  UserName: process.env.SAP_USERNAME || '',
};

// Singleton para mantener la sesión en memoria si se requiere, o podemos basarlo en cookies/fetch
let b1Session: string | null = null;
let routeId: string | null = null;

export async function loginToSAP(): Promise<{ sessionId: string, routeId: string }> {
  if (!SAP_BASE_URL) throw new Error("Falta SAP_BASE_URL en .env");

  const response = await fetch(`${SAP_BASE_URL}/Login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(DEFAULT_CREDENTIALS),
    // next: { revalidate: 3600 } // opcional para no loguearse cada vez si se maneja caché
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error en login SAP: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const setCookieHeader = response.headers.get('set-cookie') || '';
  
  // Extraer cookies B1SESSION y ROUTEID
  const b1SessionMatch = setCookieHeader.match(/B1SESSION=([^;]+)/);
  const routeIdMatch = setCookieHeader.match(/ROUTEID=([^;]+)/);

  b1Session = b1SessionMatch ? b1SessionMatch[1] : data.SessionId;
  routeId = routeIdMatch ? routeIdMatch[1] : null;

  return {
    sessionId: b1Session || '',
    routeId: routeId || ''
  };
}

export async function querySAP(endpoint: string, method: string = 'GET', body?: any) {
  if (!SAP_BASE_URL) throw new Error("Falta SAP_BASE_URL en .env");

  // Si no hay sesión, loguearse primero
  if (!b1Session) {
    await loginToSAP();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cookie': `B1SESSION=${b1Session};${routeId ? ` ROUTEID=${routeId};` : ''}`
  };

  let response = await fetch(`${SAP_BASE_URL}/${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Si da 401 Unauthorized, la sesión pudo expirar
  if (response.status === 401) {
    console.log("Sesión SAP expirada, reintentando login...");
    await loginToSAP();
    headers['Cookie'] = `B1SESSION=${b1Session};${routeId ? ` ROUTEID=${routeId};` : ''}`;
    
    response = await fetch(`${SAP_BASE_URL}/${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error SAP [${method} ${endpoint}]: ${response.status} - ${errorText}`);
  }

  return response.json();
}
