// Stock e inventario: datos maestros de artículo de SAP Business One. Solo lectura.
import { sapGet, SapRequestError } from '@/lib/sapServiceLayer';

export interface ArticuloResumen {
  codigo: string;
  nombre: string;
  grupo: string | null;
  enStock: number;
  comprometido: number;
  pedido: number;
  disponible: number;
  unidad: string | null;
  activo: boolean;
}

export interface StockAlmacen {
  codigo: string;
  nombre: string;
  bloqueado: boolean;
  enStock: number;
  comprometido: number;
  pedido: number;
  disponible: number;
  costo: number | null;
  minimo: number;
  maximo: number;
}

export interface CampoArticulo {
  etiqueta: string;
  valor: string;
}

export interface ArticuloDetalle extends ArticuloResumen {
  nombreExtranjero: string | null;
  almacenes: StockAlmacen[];
  precios: Array<{ lista: string; precio: number; moneda: string | null }>;
  general: CampoArticulo[];
  inventario: CampoArticulo[];
  planificacion: CampoArticulo[];
  propiedades: CampoArticulo[];
  comentarios: string | null;
}

const LISTA_SELECT = 'ItemCode,ItemName,ItemsGroupCode,QuantityOnStock,QuantityOrderedFromVendors,QuantityOrderedByCustomers,InventoryUOM,Valid,Frozen';

const texto = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v).trim();
  return s === '' || s === '-1' ? null : s;
};
const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
const odata = (s: string) => `'${s.replace(/'/g, "''")}'`;
const sino = (v: unknown) => (v === 'tYES' ? 'Sí' : v === 'tNO' ? 'No' : null);
const fecha = (v: unknown) => {
  const s = texto(v);
  if (!s) return null;
  const [y, m, d] = s.slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : s;
};

// Catálogos que casi no cambian: se guardan una hora en memoria
const UNA_HORA = 60 * 60 * 1000;
function catalogo(ruta: string, clave: string, valor: string) {
  let copia: { en: number; mapa: Map<string, string> } | null = null;
  return async () => {
    if (copia && Date.now() - copia.en < UNA_HORA) return copia.mapa;
    try {
      const datos = await sapGet<{ value: any[] }>(ruta, { maxPageSize: 5000 });
      copia = { en: Date.now(), mapa: new Map(datos.value.map((f) => [String(f[clave]), String(f[valor])])) };
      return copia.mapa;
    } catch {
      return copia?.mapa || new Map<string, string>();
    }
  };
}
const grupos = catalogo('ItemGroups?$select=Number,GroupName', 'Number', 'GroupName');
const bodegas = catalogo('Warehouses?$select=WarehouseCode,WarehouseName', 'WarehouseCode', 'WarehouseName');
const listasPrecio = catalogo('PriceLists?$select=PriceListNo,PriceListName', 'PriceListNo', 'PriceListName');
const fabricantes = catalogo('Manufacturers?$select=Code,ManufacturerName', 'Code', 'ManufacturerName');

function aResumen(raw: any, gruposMapa: Map<string, string>): ArticuloResumen {
  const enStock = numero(raw.QuantityOnStock);
  const comprometido = numero(raw.QuantityOrderedByCustomers);
  const pedido = numero(raw.QuantityOrderedFromVendors);
  return {
    codigo: raw.ItemCode,
    nombre: raw.ItemName || '',
    grupo: gruposMapa.get(String(raw.ItemsGroupCode)) || null,
    enStock,
    comprometido,
    pedido,
    // Misma fórmula de SAP: en stock - comprometido + pedido
    disponible: enStock - comprometido + pedido,
    unidad: texto(raw.InventoryUOM),
    activo: raw.Valid === 'tYES' && raw.Frozen !== 'tYES',
  };
}

export async function buscarArticulos(consulta: string): Promise<ArticuloResumen[]> {
  const q = consulta.trim();
  if (q.length < 2) return [];
  const filtro = `contains(ItemCode,${odata(q)}) or contains(ItemName,${odata(q)}) or BarCode eq ${odata(q)}`;
  const parametros = new URLSearchParams({ $select: LISTA_SELECT, $filter: filtro, $orderby: 'ItemCode', $top: '50' });
  const [datos, gruposMapa] = await Promise.all([
    sapGet<{ value: any[] }>(`Items?${parametros}`.replace(/\+/g, '%20'), { maxPageSize: 50 }),
    grupos(),
  ]);
  return datos.value.map((f) => aResumen(f, gruposMapa));
}

const COSTEO: Record<string, string> = { bis_MovingAverage: 'Promedio móvil', bis_Standard: 'Estándar', bis_FIFO: 'FIFO', bis_SNB: 'Por serie o lote' };
const PLANIFICACION: Record<string, string> = { bop_MRP: 'MRP', bop_None: 'Ninguno' };
const OBTENCION: Record<string, string> = { bom_Make: 'Fabricar', bom_Buy: 'Comprar' };
const EMISION: Record<string, string> = { im_Backflush: 'Notificación posterior', im_Manual: 'Manual' };
const LISTA_MATERIALES: Record<string, string> = { iNotATree: 'No tiene', iProductionTree: 'Producción', iSalesTree: 'Ventas', iAssemblyTree: 'Montaje', iTemplateTree: 'Plantilla' };
const TIPO_MATERIAL: Record<string, string> = { mt_FinishedGoods: 'Producto terminado', mt_GoodsInProcess: 'Producto en proceso', mt_RawMaterial: 'Materia prima' };

// ── Campos definidos por usuario ───────────────────────────────────────
// Nombres, orden y valores válidos salen de la definición de SAP (tabla OITM), igual que en su ventana.
interface DefinicionCampo {
  campo: string;
  etiqueta: string;
  valores: Map<string, string>;
  tablaVinculada: string | null;
}

let copiaDefiniciones: { en: number; lista: DefinicionCampo[] } | null = null;
async function definicionesCampos(): Promise<DefinicionCampo[]> {
  if (copiaDefiniciones && Date.now() - copiaDefiniciones.en < UNA_HORA) return copiaDefiniciones.lista;
  const parametros = new URLSearchParams({ $filter: "TableName eq 'OITM'", $orderby: 'FieldID' });
  const datos = await sapGet<{ value: any[] }>(`UserFieldsMD?${parametros}`.replace(/\+/g, '%20'), { maxPageSize: 500 });
  const lista = datos.value.map((f) => ({
    campo: `U_${f.Name}`,
    etiqueta: texto(f.Description) || String(f.Name),
    valores: new Map<string, string>((f.ValidValuesMD || []).map((v: any) => [String(v.Value), String(v.Description ?? v.Value)])),
    tablaVinculada: texto(f.LinkedTable),
  }));
  copiaDefiniciones = { en: Date.now(), lista };
  return lista;
}

// Valores que SAP toma de una tabla de usuario (por ejemplo, Color)
const copiasTablas = new Map<string, { en: number; mapa: Map<string, string> }>();
async function valoresTabla(tabla: string): Promise<Map<string, string>> {
  const copia = copiasTablas.get(tabla);
  if (copia && Date.now() - copia.en < UNA_HORA) return copia.mapa;
  try {
    const datos = await sapGet<{ value: any[] }>(`U_${tabla}?$select=Code,Name`, { maxPageSize: 5000 });
    const mapa = new Map<string, string>(datos.value.map((f) => [String(f.Code), String(f.Name)]));
    copiasTablas.set(tabla, { en: Date.now(), mapa });
    return mapa;
  } catch {
    return copia?.mapa || new Map<string, string>();
  }
}

// Los campos de usuario que le importan al negocio, con el nombre que tienen en SAP
const CAMPOS_IMPORTANTES = ['Color', 'Línea', 'Familia', 'TypeOC', 'Molde', 'Grupo', 'Garantia', 'Articulo TOC'];

async function camposDeUsuario(raw: any): Promise<CampoArticulo[]> {
  const definiciones = (await definicionesCampos()).filter((d) => CAMPOS_IMPORTANTES.includes(d.etiqueta));
  return Promise.all(definiciones.map(async (d) => {
    const crudo = raw[d.campo];
    const valor = crudo === null || crudo === undefined ? '' : String(crudo).trim();
    if (!valor) return { etiqueta: d.etiqueta, valor: '' };
    const tabla = d.tablaVinculada ? await valoresTabla(d.tablaVinculada) : null;
    return { etiqueta: d.etiqueta, valor: d.valores.get(valor) || tabla?.get(valor) || valor };
  }));
}

const campos = (lista: Array<[string, string | null | undefined]>): CampoArticulo[] =>
  lista.filter((c): c is [string, string] => !!c[1]).map(([etiqueta, valor]) => ({ etiqueta, valor }));

export async function obtenerArticulo(codigo: string): Promise<ArticuloDetalle | null> {
  let raw: any;
  try {
    raw = await sapGet(`Items(${odata(codigo)})`);
  } catch (err) {
    if (err instanceof SapRequestError && err.status === 404) return null;
    throw err;
  }
  const [gruposMapa, bodegasMapa, listasMapa, fabricantesMapa] = await Promise.all([grupos(), bodegas(), listasPrecio(), fabricantes()]);

  const almacenes: StockAlmacen[] = (raw.ItemWarehouseInfoCollection || [])
    .map((a: any) => {
      const enStock = numero(a.InStock);
      const comprometido = numero(a.Committed);
      const pedido = numero(a.Ordered);
      return {
        codigo: a.WarehouseCode,
        nombre: bodegasMapa.get(String(a.WarehouseCode)) || a.WarehouseCode,
        bloqueado: a.Locked === 'tYES',
        enStock,
        comprometido,
        pedido,
        disponible: enStock - comprometido + pedido,
        costo: numero(a.StandardAveragePrice) || null,
        minimo: numero(a.MinimalStock),
        maximo: numero(a.MaximalStock),
      };
    })
    .sort((a: StockAlmacen, b: StockAlmacen) => b.enStock - a.enStock || a.codigo.localeCompare(b.codigo));

  const precios = (raw.ItemPrices || [])
    .filter((p: any) => numero(p.Price) > 0)
    .map((p: any) => ({ lista: listasMapa.get(String(p.PriceList)) || `Lista ${p.PriceList}`, precio: numero(p.Price), moneda: texto(p.Currency) }));

  const propiedades = await camposDeUsuario(raw);

  return {
    ...aResumen(raw, gruposMapa),
    nombreExtranjero: texto(raw.ForeignName),
    almacenes,
    precios,
    comentarios: texto(raw.User_Text),
    general: campos([
      ['Grupo de artículos', gruposMapa.get(String(raw.ItemsGroupCode))],
      ['Fabricante', numero(raw.Manufacturer) > 0 ? fabricantesMapa.get(String(raw.Manufacturer)) : null],
      ['Código de barras', texto(raw.BarCode)],
      ['Proveedor principal', texto(raw.Mainsupplier)],
      ['Catálogo de proveedor', texto(raw.SupplierCatalogNo)],
      ['Artículo de inventario', sino(raw.InventoryItem)],
      ['Artículo de venta', sino(raw.SalesItem)],
      ['Artículo de compra', sino(raw.PurchaseItem)],
      ['Activo', sino(raw.Valid)],
      ['Inactivo', raw.Frozen === 'tYES' ? 'Sí' : null],
      ['Creado', fecha(raw.CreateDate)],
      ['Actualizado', fecha(raw.UpdateDate)],
    ]),
    inventario: campos([
      ['Unidad de inventario', texto(raw.InventoryUOM)],
      ['Unidad de venta', texto(raw.SalesUnit)],
      ['Unidad de compra', texto(raw.PurchaseUnit)],
      ['Método de costeo', COSTEO[raw.CostAccountingMethod] || texto(raw.CostAccountingMethod)],
      ['Costo promedio', numero(raw.MovingAveragePrice) ? String(numero(raw.MovingAveragePrice)) : null],
      ['Stock por almacén', sino(raw.ManageStockByWarehouse)],
      ['Stock mínimo', numero(raw.MinInventory) ? String(numero(raw.MinInventory)) : null],
      ['Stock máximo', numero(raw.MaxInventory) ? String(numero(raw.MaxInventory)) : null],
      ['Stock deseado', numero(raw.DesiredInventory) ? String(numero(raw.DesiredInventory)) : null],
    ]),
    planificacion: campos([
      ['Sistema de planificación', PLANIFICACION[raw.PlanningSystem] || texto(raw.PlanningSystem)],
      ['Método de obtención', OBTENCION[raw.ProcurementMethod] || texto(raw.ProcurementMethod)],
      ['Lista de materiales', LISTA_MATERIALES[raw.TreeType] || texto(raw.TreeType)],
      ['Método de emisión', EMISION[raw.IssueMethod] || texto(raw.IssueMethod)],
      ['Tipo de material', TIPO_MATERIAL[raw.MaterialType] || texto(raw.MaterialType)],
      ['Tiempo de entrega (días)', numero(raw.LeadTime) ? String(numero(raw.LeadTime)) : null],
      ['Cantidad mínima de pedido', numero(raw.MinOrderQuantity) ? String(numero(raw.MinOrderQuantity)) : null],
      ['Múltiplo de pedido', numero(raw.OrderMultiple) ? String(numero(raw.OrderMultiple)) : null],
    ]),
    propiedades,
  };
}
