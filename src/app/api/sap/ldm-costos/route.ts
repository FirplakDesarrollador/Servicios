import { NextResponse } from 'next/server';
import { getSapSessionCookie } from '@/lib/sapServiceLayer';

if (typeof process !== 'undefined') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const SAP_BASE_URL = process.env.SAP_BASE_URL || 'https://200.7.96.194:50000/b1s/v1';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code1 = searchParams.get('code1');
    const code2 = searchParams.get('code2');

    if (!code1) {
      return NextResponse.json({ error: 'Falta el parámetro code1 (Artículo superior inicio)' }, { status: 400 });
    }
    if (!code2) {
      return NextResponse.json({ error: 'Falta el parámetro code2 (Artículo superior fin)' }, { status: 400 });
    }

    const cookie = await getSapSessionCookie();

    // 1. Validar que el artículo padre exista realmente en SAP
    let padreDesc = '';
    const itemRes = await fetch(`${SAP_BASE_URL}/Items('${encodeURIComponent(code1)}')?$select=ItemName`, {
      headers: { 'Cookie': cookie, 'Accept': 'application/json' }
    });

    if (itemRes.status === 404) {
      return NextResponse.json({ error: `El código de artículo '${code1}' no existe en SAP.` }, { status: 404 });
    } else if (itemRes.ok) {
      const itemData = await itemRes.json();
      padreDesc = itemData.ItemName || '';
    }

    const requestBomCache = new Map<string, Promise<any[]>>();

    // Limitador de concurrencia para evitar que SAP SL colapse con muchas peticiones simultáneas
    const CONCURRENCY_LIMIT = 15;
    let activeRequests = 0;
    const requestQueue: (() => void)[] = [];

    async function acquireLock() {
      if (activeRequests < CONCURRENCY_LIMIT) {
        activeRequests++;
        return;
      }
      return new Promise<void>(resolve => {
        requestQueue.push(resolve);
      });
    }

    function releaseLock() {
      if (requestQueue.length > 0) {
        const next = requestQueue.shift()!;
        next();
      } else {
        activeRequests--;
      }
    }

    function fetchBaseBom(parentCode: string): Promise<any[]> {
      // 1. Revisar caché de la petición actual (promesa en curso) para no duplicar llamadas en la misma explosión
      if (requestBomCache.has(parentCode)) {
        return requestBomCache.get(parentCode)!;
      }
      
      const promise = (async () => {
        await acquireLock();
        try {
          const sqlQueryUrl = `${SAP_BASE_URL}/SQLQueries('ldm_costos_bom')/List?code1='${encodeURIComponent(parentCode)}'&code2='${encodeURIComponent(parentCode)}'`;
          const res = await fetch(sqlQueryUrl, {
            method: 'GET',
            headers: { 'Cookie': cookie, 'Prefer': 'odata.maxpagesize=500', 'Accept': 'application/json' },
          });

          if (!res.ok) {
            return [];
          }
          const data = await res.json();
          return data.value || [];
        } finally {
          releaseLock();
        }
      })();

      requestBomCache.set(parentCode, promise);
      return promise;
    }

    // Función recursiva para obtener todos los niveles del BOM
    async function fetchBomRecursive(parentCode: string, parentQty: number, level: number): Promise<any[]> {
      const rows = await fetchBaseBom(parentCode);

      // Procesar hijos en paralelo
      const childPromises = rows.map(async (r: any) => {
        const qty = parseFloat(r.Cantidad) || 0;
        const totalQty = parentQty * qty;
        const unitCost = parseFloat(r.Costo_Unitario) || 0;
        
        let costoMp = 0, costoMo = 0, costoCif = 0;
        const upperDesc = (r.Descripcion ?? '').toUpperCase();
        const upperCode = (r.Codigo ?? '').toUpperCase();
        
        if (upperDesc.includes('MANO OBRA') || upperCode.includes('MANO OBRA')) {
          costoMo = unitCost * totalQty;
        } else if (upperDesc.includes('CIF') || upperCode.includes('CIF')) {
          costoCif = unitCost * totalQty;
        } else {
          costoMp = unitCost * totalQty;
        }

        const rowData = {
          Codigo: r.Codigo ?? '',
          Descripcion: r.Descripcion ?? '',
          UnidadMedida: r.UnidadMedida ?? '',
          Nivel: level,
          Cantidad: totalQty,
          Costo_Unitario: unitCost,
          Costo_Mp: costoMp,
          Costo_Mo: costoMo,
          Costo_Cif: costoCif,
        };

        // Buscar sub-componentes (nivel + 1)
        const children = await fetchBomRecursive(r.Codigo, totalQty, level + 1);
        
        if (children.length > 0) {
          rowData.Costo_Unitario = 0;
          rowData.Costo_Mp = 0;
          rowData.Costo_Mo = 0;
          rowData.Costo_Cif = 0;
        }
        
        return [rowData, ...children];
      });

      const results = await Promise.all(childPromises);
      return results.flat();
    }

    console.log(`[LDM Costos] Iniciando búsqueda recursiva para: ${code1}`);
    const bomRows = await fetchBomRecursive(code1, 1, 2);
    console.log(`[LDM Costos] Búsqueda completada. Total componentes encontrados: ${bomRows.length}`);

    // Calcular costos totales para el padre sumando todos los componentes (ya que los padres con hijos tienen costo 0)
    const totalCostoMp = bomRows.reduce((acc, r) => acc + r.Costo_Mp, 0);
    const totalCostoMo = bomRows.reduce((acc, r) => acc + r.Costo_Mo, 0);
    const totalCostoCif = bomRows.reduce((acc, r) => acc + r.Costo_Cif, 0);
    const totalCostoTotal = totalCostoMp + totalCostoMo + totalCostoCif;

    const result = [
      {
        index: 1,
        Codigo: code1,
        Descripcion: padreDesc,
        UnidadMedida: 'UN',
        Nivel: 1,
        Cantidad: 1,
        Costo_Unitario: 0,
        Costo_Mp: totalCostoMp,
        Costo_Mo: totalCostoMo,
        Costo_Cif: totalCostoCif,
        Costo_Total: totalCostoTotal,
      },
      ...bomRows.map((r, i) => ({ 
        ...r, 
        Costo_Total: r.Costo_Mp + r.Costo_Mo + r.Costo_Cif,
        index: i + 2 
      }))
    ];

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[LDM Costos] Error:', error);
    return NextResponse.json({ error: error.message || 'Error consultando SAP Service Layer' }, { status: 500 });
  }
}
