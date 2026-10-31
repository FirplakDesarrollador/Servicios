import { NextResponse } from 'next/server';
import { sapGet, SapRequestError } from '@/lib/sapServiceLayer';

// LDM Costos (solo lectura): explosión multinivel de la lista de materiales con costo promedio por bodega.
//
// Antes se hacía una consulta por cada código (incluidas las materias primas sin LDM) con 15 peticiones
// simultáneas sobre la misma sesión, que SAP bloquea entre sí: un producto con ~120 componentes tardaba
// cerca de un minuto. Ahora se recorre por niveles (una consulta trae las LDM de todos los códigos del nivel)
// y los costos se piden en lote: ~10 consultas en total. Sin caché: cada consulta lee los costos vigentes
// en SAP, porque se usan para simular negocios.

const BATCH = 25;
const MAX_LEVELS = 12;

interface TreeLine {
  ItemCode: string;
  ItemName: string | null;
  Quantity: number;
  Warehouse: string | null;
  InventoryUOM: string | null;
  VisualOrder: number;
}

const odataString = (v: string) => `'${v.replace(/'/g, "''")}'`;

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** LDM de todos los códigos dados (los que no tienen LDM simplemente no aparecen). */
async function fetchTrees(codes: string[]): Promise<Map<string, { description: string; lines: TreeLine[] }>> {
  const trees = new Map<string, { description: string; lines: TreeLine[] }>();
  for (const group of chunk(codes, BATCH)) {
    const params = new URLSearchParams({
      $select: 'TreeCode,ProductDescription,ProductTreeLines',
      $filter: group.map((c) => `TreeCode eq ${odataString(c)}`).join(' or '),
    });
    const data = await sapGet<{ value: any[] }>(`ProductTrees?${params}`, { maxPageSize: BATCH });
    for (const t of data.value || []) {
      const lines: TreeLine[] = (t.ProductTreeLines || [])
        .map((l: any) => ({
          ItemCode: l.ItemCode,
          ItemName: l.ItemName ?? null,
          Quantity: Number(l.Quantity) || 0,
          Warehouse: l.Warehouse ?? null,
          InventoryUOM: l.InventoryUOM ?? null,
          VisualOrder: Number(l.VisualOrder) || 0,
        }))
        // Mismo orden que la consulta original: VisOrder y luego código
        .sort((a: TreeLine, b: TreeLine) => a.VisualOrder - b.VisualOrder || a.ItemCode.localeCompare(b.ItemCode));
      trees.set(t.TreeCode, { description: t.ProductDescription || '', lines });
    }
  }
  return trees;
}

/** Costo promedio (OITW.AvgPrice) por artículo y bodega, en lote. Clave: `${item}|${bodega}`. */
async function fetchAvgCosts(pairs: Array<{ item: string; whs: string }>): Promise<Map<string, number>> {
  const costs = new Map<string, number>();
  const items = [...new Set(pairs.map((p) => p.item))];
  const warehouses = [...new Set(pairs.map((p) => p.whs))];
  const whsFilter = warehouses.map((w) => `Items/ItemWarehouseInfoCollection/WarehouseCode eq ${odataString(w)}`).join(' or ');

  for (const group of chunk(items, BATCH)) {
    const itemFilter = group.map((c) => `Items/ItemCode eq ${odataString(c)}`).join(' or ');
    const path =
      `$crossjoin(Items,Items/ItemWarehouseInfoCollection)` +
      `?$expand=Items/ItemWarehouseInfoCollection($select=ItemCode,WarehouseCode,StandardAveragePrice)` +
      `&$filter=Items/ItemCode eq Items/ItemWarehouseInfoCollection/ItemCode and (${itemFilter}) and (${whsFilter})`;
    const data = await sapGet<{ value: any[] }>(encodeURI(path).replace(/'/g, '%27'), { maxPageSize: 5000 });
    for (const row of data.value || []) {
      const w = row['Items/ItemWarehouseInfoCollection'];
      if (w?.ItemCode) costs.set(`${w.ItemCode}|${w.WarehouseCode}`, Number(w.StandardAveragePrice) || 0);
    }
  }
  return costs;
}

async function buildLdm(code1: string) {
  // 1. Recorrer la estructura por niveles
  const trees = new Map<string, { description: string; lines: TreeLine[] }>();
  const requested = new Set<string>([code1]);
  let level = [code1];
  for (let depth = 0; depth < MAX_LEVELS && level.length > 0; depth++) {
    const found = await fetchTrees(level);
    for (const [code, tree] of found) trees.set(code, tree);
    const next = new Set<string>();
    for (const code of level) {
      for (const line of found.get(code)?.lines || []) {
        if (!requested.has(line.ItemCode)) {
          requested.add(line.ItemCode);
          next.add(line.ItemCode);
        }
      }
    }
    level = [...next];
  }

  // 2. Descripción del padre (y validar que exista si no tiene LDM)
  let padreDesc = trees.get(code1)?.description || '';
  if (!trees.has(code1)) {
    try {
      const item = await sapGet<{ ItemName?: string }>(`Items(${encodeURIComponent(odataString(code1))})?$select=ItemName`);
      padreDesc = item.ItemName || '';
    } catch (err) {
      if (err instanceof SapRequestError && err.status === 404) return null;
      throw err;
    }
  }

  // 3. Costos de todos los componentes en lote
  const pairs: Array<{ item: string; whs: string }> = [];
  for (const tree of trees.values()) {
    for (const l of tree.lines) if (l.Warehouse) pairs.push({ item: l.ItemCode, whs: l.Warehouse });
  }
  const costs = pairs.length > 0 ? await fetchAvgCosts(pairs) : new Map<string, number>();

  // 4. Explosión (misma lógica de antes: los componentes con LDM propia quedan en 0 y suman sus hijos)
  const explode = (parentCode: string, parentQty: number, nivel: number, path: Set<string>): any[] => {
    const tree = trees.get(parentCode);
    if (!tree) return [];
    return tree.lines.flatMap((l) => {
      const totalQty = parentQty * l.Quantity;
      const unitCost = l.Warehouse ? costs.get(`${l.ItemCode}|${l.Warehouse}`) ?? 0 : 0;
      const upperDesc = (l.ItemName ?? '').toUpperCase();
      const upperCode = l.ItemCode.toUpperCase();
      let costoMp = 0, costoMo = 0, costoCif = 0;
      if (upperDesc.includes('MANO OBRA') || upperCode.includes('MANO OBRA')) costoMo = unitCost * totalQty;
      else if (upperDesc.includes('CIF') || upperCode.includes('CIF')) costoCif = unitCost * totalQty;
      else costoMp = unitCost * totalQty;

      const row = {
        Codigo: l.ItemCode,
        Descripcion: l.ItemName ?? '',
        UnidadMedida: l.InventoryUOM ?? '',
        Nivel: nivel,
        Cantidad: totalQty,
        Costo_Unitario: unitCost,
        Costo_Mp: costoMp,
        Costo_Mo: costoMo,
        Costo_Cif: costoCif,
      };
      // Evita ciclos si una LDM se contiene a sí misma
      const children = path.has(l.ItemCode) ? [] : explode(l.ItemCode, totalQty, nivel + 1, new Set(path).add(l.ItemCode));
      if (children.length > 0) {
        row.Costo_Unitario = 0;
        row.Costo_Mp = 0;
        row.Costo_Mo = 0;
        row.Costo_Cif = 0;
      }
      return [row, ...children];
    });
  };

  const bomRows = explode(code1, 1, 2, new Set([code1]));
  const totalCostoMp = bomRows.reduce((acc, r) => acc + r.Costo_Mp, 0);
  const totalCostoMo = bomRows.reduce((acc, r) => acc + r.Costo_Mo, 0);
  const totalCostoCif = bomRows.reduce((acc, r) => acc + r.Costo_Cif, 0);

  return [
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
      Costo_Total: totalCostoMp + totalCostoMo + totalCostoCif,
    },
    ...bomRows.map((r, i) => ({ ...r, Costo_Total: r.Costo_Mp + r.Costo_Mo + r.Costo_Cif, index: i + 2 })),
  ];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code1 = searchParams.get('code1')?.trim();
    const code2 = searchParams.get('code2')?.trim();

    if (!code1) {
      return NextResponse.json({ error: 'Falta el parámetro code1 (Artículo superior inicio)' }, { status: 400 });
    }
    if (!code2) {
      return NextResponse.json({ error: 'Falta el parámetro code2 (Artículo superior fin)' }, { status: 400 });
    }

    const started = Date.now();
    const result = await buildLdm(code1);
    if (!result) {
      return NextResponse.json({ error: `El código de artículo '${code1}' no existe en SAP.` }, { status: 404 });
    }
    console.log(`[LDM Costos] ${code1}: ${result.length} líneas en ${Date.now() - started} ms`);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[LDM Costos] Error:', error);
    return NextResponse.json({ error: error.message || 'Error consultando SAP Service Layer' }, { status: 500 });
  }
}
