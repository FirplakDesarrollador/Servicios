// Costos Comercializados (réplica de la consulta "ANG - Costos Comercializados" del Query Manager). Solo lectura.
//
// La consulta original toma el CalcPrice del último movimiento de inventario (OINM), tabla que el Service Layer
// no expone. Aquí se usa el costo promedio actual del artículo en la bodega (OITW.AvgPrice), que es el valor
// que quedó después de ese último movimiento. No hay fecha del precio por la misma razón.
import { sapGet } from '@/lib/sapServiceLayer';

/** Grupos de artículo que entran completos. */
const GRUPOS_TODOS = [
  111, 112, 120, 123, 125, 126, 127, 128, 129, 130, 151, 152, 156, 159, 160, 167, 168, 169, 173, 174, 178, 180,
  202, 210, 211, 214, 216, 221, 222, 223, 224, 225,
];
/** Grupos de artículo de los que solo entran los códigos que empiezan por "C". */
const GRUPOS_SOLO_C = [113, 114, 118, 119, 172, 187, 201, 207, 212, 213];
/** Bodegas (desde el 03/09/2021 se excluyen PT-02 y MP-02). */
export const BODEGAS_COSTOS = ['MP-01', 'PT-01'];

export interface CostoComercializado {
  codigo: string;
  descripcion: string;
  grupo: number;
  bodega: string;
  nombreBodega: string;
  costoPromedio: number;
}

const UNA_HORA = 60 * 60 * 1000;
let bodegasCache: { en: number; mapa: Map<string, string> } | null = null;
async function nombresBodegas(): Promise<Map<string, string>> {
  if (bodegasCache && Date.now() - bodegasCache.en < UNA_HORA) return bodegasCache.mapa;
  try {
    const d = await sapGet<{ value: any[] }>('Warehouses?$select=WarehouseCode,WarehouseName', { maxPageSize: 5000 });
    bodegasCache = { en: Date.now(), mapa: new Map(d.value.map((w) => [String(w.WarehouseCode), String(w.WarehouseName)])) };
  } catch {
    return bodegasCache?.mapa || new Map();
  }
  return bodegasCache.mapa;
}

export async function obtenerCostosComercializados(): Promise<CostoComercializado[]> {
  const grupos = [...GRUPOS_TODOS, ...GRUPOS_SOLO_C];
  const soloC = new Set(GRUPOS_SOLO_C);
  const filtro =
    `Items/ItemCode eq Items/ItemWarehouseInfoCollection/ItemCode` +
    ` and (${grupos.map((g) => `Items/ItemsGroupCode eq ${g}`).join(' or ')})` +
    ` and (${BODEGAS_COSTOS.map((b) => `Items/ItemWarehouseInfoCollection/WarehouseCode eq '${b}'`).join(' or ')})`;
  const primera =
    `$crossjoin(Items,Items/ItemWarehouseInfoCollection)` +
    `?$expand=Items($select=ItemCode,ItemName,ItemsGroupCode,Valid,Frozen),` +
    `Items/ItemWarehouseInfoCollection($select=WarehouseCode,StandardAveragePrice)` +
    `&$filter=${filtro}`;

  const filas: CostoComercializado[] = [];
  const bodegas = await nombresBodegas();
  let ruta: string | null = encodeURI(primera).replace(/'/g, '%27');
  // SAP entrega por páginas: se siguen los enlaces hasta el final (con tope de seguridad)
  for (let pagina = 0; ruta && pagina < 50; pagina++) {
    const datos: any = await sapGet(ruta, { maxPageSize: 5000, timeoutMs: 120000 });
    for (const fila of datos.value || []) {
      const item = fila.Items;
      const bodega = fila['Items/ItemWarehouseInfoCollection'];
      if (!item?.ItemCode || !bodega) continue;
      const grupo = Number(item.ItemsGroupCode);
      if (soloC.has(grupo) && !String(item.ItemCode).toUpperCase().startsWith('C')) continue;
      // Solo artículos activos
      if (item.Valid === 'tNO' || item.Frozen === 'tYES') continue;
      const costo = Number(bodega.StandardAveragePrice) || 0;
      // Igual que la consulta: sin costos en cero
      if (costo === 0) continue;
      filas.push({
        codigo: item.ItemCode,
        descripcion: item.ItemName || '',
        grupo,
        bodega: bodega.WarehouseCode,
        nombreBodega: bodegas.get(String(bodega.WarehouseCode)) || bodega.WarehouseCode,
        costoPromedio: Math.round(costo * 100) / 100,
      });
    }
    const siguiente: string | undefined = datos['odata.nextLink'] || datos['@odata.nextLink'];
    ruta = siguiente ? siguiente.replace(/^.*\/b1s\/v[12]\//, '') : null;
  }

  return filas.sort((a, b) => a.codigo.localeCompare(b.codigo) || a.bodega.localeCompare(b.bodega));
}
