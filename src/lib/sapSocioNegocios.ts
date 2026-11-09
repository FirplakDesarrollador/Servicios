// Datos maestros socio de negocios de SAP Business One (OCRD), con las pestañas de la ventana de SAP. Solo lectura.
import { sapGet, SapRequestError } from '@/lib/sapServiceLayer';

export interface CampoSocio {
  etiqueta: string;
  valor: string;
}

export interface ContactoSocio {
  nombre: string;
  cargo: string | null;
  telefono: string | null;
  celular: string | null;
  correo: string | null;
  activo: boolean;
  predeterminado: boolean;
}

export interface DireccionSocio {
  id: string;
  tipo: 'Facturación' | 'Entrega';
  direccion: string;
  ciudad: string | null;
  departamento: string | null;
  pais: string | null;
  predeterminada: boolean;
}

export interface SocioNegocios {
  codigo: string;
  nombre: string;
  nombreExtranjero: string | null;
  tipo: 'Cliente' | 'Proveedor' | 'Lead';
  nit: string | null;
  moneda: string | null;
  activo: boolean;
  saldoCuenta: number;
  entregasAbiertas: number;
  pedidosAbiertos: number;
  limiteCredito: number;
  general: CampoSocio[];
  condicionesPago: CampoSocio[];
  contactos: ContactoSocio[];
  direcciones: DireccionSocio[];
  comentarios: string | null;
}

export interface SocioResumen {
  codigo: string;
  nombre: string;
  nit: string | null;
  tipo: string;
  ciudad: string | null;
}

const texto = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v).trim();
  return s === '' || s === '-1' ? null : s;
};
const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
const odata = (s: string) => `'${s.replace(/'/g, "''")}'`;
const fecha = (v: unknown) => {
  const s = texto(v);
  if (!s) return null;
  const [y, m, d] = s.slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : s;
};
const pesos = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 0 });
const tipoSocio = (v: unknown): SocioNegocios['tipo'] => (v === 'cSupplier' ? 'Proveedor' : v === 'cLid' ? 'Lead' : 'Cliente');

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
const gruposSocio = catalogo('BusinessPartnerGroups?$select=Code,Name', 'Code', 'Name');
const condicionesPago = catalogo('PaymentTermsTypes?$select=GroupNumber,PaymentTermsGroupName', 'GroupNumber', 'PaymentTermsGroupName');
const listasPrecio = catalogo('PriceLists?$select=PriceListNo,PriceListName', 'PriceListNo', 'PriceListName');
const vendedores = catalogo('SalesPersons?$select=SalesEmployeeCode,SalesEmployeeName', 'SalesEmployeeCode', 'SalesEmployeeName');

const campos = (lista: Array<[string, string | null | undefined]>): CampoSocio[] =>
  lista.filter((c): c is [string, string] => !!c[1]).map(([etiqueta, valor]) => ({ etiqueta, valor }));

/** Busca socios por código, nombre o cédula/NIT (máximo 50). */
export async function buscarSocios(consulta: string): Promise<SocioResumen[]> {
  const q = consulta.trim();
  if (q.length < 2) return [];
  const v = odata(q);
  const parametros = new URLSearchParams({
    $select: 'CardCode,CardName,FederalTaxID,CardType,City',
    $filter: `contains(CardCode,${v}) or contains(CardName,${v}) or contains(FederalTaxID,${v})`,
    $orderby: 'CardName',
    $top: '50',
  });
  const datos = await sapGet<{ value: any[] }>(`BusinessPartners?${parametros}`.replace(/\+/g, '%20'));
  return (datos.value || []).map((s) => ({
    codigo: s.CardCode,
    nombre: s.CardName || '',
    nit: texto(s.FederalTaxID),
    tipo: tipoSocio(s.CardType),
    ciudad: texto(s.City),
  }));
}

/** Ficha completa del socio de negocios; null si no existe. */
export async function obtenerSocio(codigo: string): Promise<SocioNegocios | null> {
  let raw: any;
  try {
    raw = await sapGet(`BusinessPartners(${odata(codigo)})`);
  } catch (err) {
    if (err instanceof SapRequestError && err.status === 404) return null;
    throw err;
  }
  const [grupos, pagos, listas, ventas] = await Promise.all([gruposSocio(), condicionesPago(), listasPrecio(), vendedores()]);

  const contactos: ContactoSocio[] = (raw.ContactEmployees || []).map((c: any) => ({
    nombre: texto([c.FirstName, c.LastName].filter(Boolean).join(' ')) || c.Name || '',
    cargo: texto(c.Position),
    telefono: texto(c.Phone1) || texto(c.Phone2),
    celular: texto(c.MobilePhone),
    correo: texto(c.E_Mail),
    activo: c.Active !== 'tNO',
    predeterminado: !!c.Name && c.Name === raw.ContactPerson,
  }));

  const direcciones: DireccionSocio[] = (raw.BPAddresses || []).map((d: any) => {
    const tipo = d.AddressType === 'bo_BillTo' ? 'Facturación' : 'Entrega';
    return {
      id: d.AddressName || '',
      tipo,
      direccion: [d.Street, d.Block, d.BuildingFloorRoom].map(texto).filter(Boolean).join(', '),
      ciudad: texto(d.City),
      departamento: texto(d.County) || texto(d.State),
      pais: texto(d.Country),
      predeterminada: tipo === 'Facturación' ? d.AddressName === raw.BilltoDefault : d.AddressName === raw.ShipToDefault,
    };
  });

  const vendedor = numero(raw.SalesPersonCode) >= 0 ? ventas.get(String(raw.SalesPersonCode)) : null;
  const descuento = numero(raw.DiscountPercent);

  return {
    codigo: raw.CardCode,
    nombre: raw.CardName || '',
    nombreExtranjero: texto(raw.CardForeignName),
    tipo: tipoSocio(raw.CardType),
    nit: texto(raw.FederalTaxID),
    moneda: texto(raw.Currency),
    activo: raw.Frozen !== 'tYES' && raw.Valid !== 'tNO',
    saldoCuenta: numero(raw.CurrentAccountBalance),
    entregasAbiertas: numero(raw.OpenDeliveryNotesBalance),
    pedidosAbiertos: numero(raw.OpenOrdersBalance),
    limiteCredito: numero(raw.CreditLimit),
    comentarios: texto(raw.FreeText) || texto(raw.Notes),
    general: campos([
      ['Grupo', grupos.get(String(raw.GroupCode))],
      ['Teléfono 1', texto(raw.Phone1)],
      ['Teléfono 2', texto(raw.Phone2)],
      ['Teléfono móvil', texto(raw.Cellular)],
      ['Correo electrónico', texto(raw.EmailAddress)],
      ['Sitio web', texto(raw.Website)],
      ['Persona de contacto', texto(raw.ContactPerson)],
      ['Empleado de ventas', vendedor],
      ['Ciudad', texto(raw.City)],
      ['Dirección', texto(raw.Address)],
      ['Creado', fecha(raw.CreateDate)],
      ['Actualizado', fecha(raw.UpdateDate)],
    ]),
    condicionesPago: campos([
      ['Condición de pago', pagos.get(String(raw.PayTermsGrpCode))],
      ['Lista de precios', listas.get(String(raw.PriceListNum))],
      ['Descuento total (%)', descuento ? String(descuento) : null],
      ['Límite de crédito', numero(raw.CreditLimit) ? pesos(numero(raw.CreditLimit)) : null],
      ['Límite de deuda', numero(raw.MaxCommitment) ? pesos(numero(raw.MaxCommitment)) : null],
      ['Intereses por mora (%)', numero(raw.IntrestRatePercent) ? String(numero(raw.IntrestRatePercent)) : null],
    ]),
    contactos,
    direcciones,
  };
}
