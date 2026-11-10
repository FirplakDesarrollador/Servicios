// Búsqueda aproximada de órdenes de venta y entregas por dirección de entrega y persona de contacto. Solo lectura.
//
// SAP solo sabe buscar texto exacto ("contains"), así que la búsqueda va en dos pasos:
//   1. SAP trae candidatos con las partes más seguras del texto (los números de la dirección, o las palabras
//      del nombre del contacto).
//   2. Aquí se califica cada candidato contra lo escrito, sin tildes ni mayúsculas y entendiendo abreviaturas
//      de direcciones (Calle = CL = CLL, Carrera = KR = CRA, # = No, ...). Se devuelven ordenados por coincidencia.
import { sapGet } from '@/lib/sapServiceLayer';

export type TipoBusqueda = 'Order' | 'Delivery';

export interface DocumentoAproximado {
  docEntry: number;
  docNum: number;
  fecha: string | null;
  cliente: string;
  nombreCliente: string;
  direccion: string;
  contacto: string | null;
  total: number | null;
  moneda: string | null;
  estado: 'Abierto' | 'Cerrado' | 'Cancelado';
  /** 0 a 100: qué tanto se parece a lo buscado. */
  coincidencia: number;
}

const ENTIDAD: Record<TipoBusqueda, string> = { Order: 'Orders', Delivery: 'DeliveryNotes' };
const SELECT = 'DocEntry,DocNum,DocDate,CardCode,CardName,Address2,ContactPersonCode,DocTotal,DocCurrency,DocumentStatus,Cancelled';
const MAX_CANDIDATOS = 300;
const MAX_RESULTADOS = 60;
const MINIMO = 45;

const odata = (s: string) => `'${s.replace(/'/g, "''")}'`;

/** Abreviaturas de direcciones colombianas: todas se llevan a una sola forma. */
const SINONIMOS: Record<string, string> = {
  calle: 'cl', cll: 'cl', cl: 'cl', call: 'cl',
  carrera: 'kr', cra: 'kr', cr: 'kr', kr: 'kr', kra: 'kr', carr: 'kr', crr: 'kr',
  avenida: 'av', av: 'av', avda: 'av', ave: 'av',
  diagonal: 'dg', dg: 'dg', diag: 'dg',
  transversal: 'tv', tv: 'tv', tr: 'tv', trans: 'tv', transv: 'tv', trv: 'tv',
  circular: 'cq', cq: 'cq', circ: 'cq',
  autopista: 'ak', autop: 'ak',
  apartamento: 'ap', apto: 'ap', ap: 'ap', apt: 'ap',
  torre: 'to', tor: 'to', to: 'to', t: 'to',
  bloque: 'bl', bl: 'bl', blq: 'bl',
  interior: 'in', int: 'in',
  casa: 'cs', cs: 'cs',
  local: 'lc', loc: 'lc', lc: 'lc',
  oficina: 'of', of: 'of', ofi: 'of',
  edificio: 'ed', ed: 'ed', edif: 'ed',
  conjunto: 'cj', conj: 'cj', cj: 'cj',
  barrio: 'br', br: 'br', bario: 'br',
  sur: 'sur', norte: 'norte', este: 'este', oeste: 'oeste',
};
/** Palabras que no aportan nada para comparar. */
const VACIAS = new Set(['no', 'n', 'nro', 'num', 'numero', 'de', 'del', 'la', 'el', 'los', 'las', 'y', 'en', 'con', 'via', 'km']);

function sinTildes(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Palabras normalizadas de un texto ("Calle 10 # 20-30 Apto 301" → cl 10 20 30 ap 301). */
function palabras(texto: string): string[] {
  return sinTildes(texto)
    .replace(/n[°º]/g, ' ')
    // "10a" y "10 a" quedan iguales; "20-30" se separa
    .replace(/(\d)([a-z])\b/g, '$1 $2')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((p) => SINONIMOS[p] ?? p)
    .filter((p) => !VACIAS.has(p));
}

/** Distancia de edición pequeña para tolerar errores de digitación en palabras. */
function distancia(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const fila = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previo = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, previo + (a[i - 1] === b[j - 1] ? 0 : 1));
      previo = temp;
    }
  }
  return fila[b.length];
}

/** Qué tanto aparece cada palabra buscada en el texto del documento (0 a 1). */
function parecido(buscado: string[], texto: string): number {
  if (buscado.length === 0) return 0;
  const enTexto = palabras(texto);
  if (enTexto.length === 0) return 0;
  let puntos = 0;
  let peso = 0;
  for (const p of buscado) {
    const esNumero = /^\d+$/.test(p);
    // Los números pesan más: son lo que de verdad ubica una dirección
    const w = esNumero ? 2 : p.length <= 2 ? 0.5 : 1;
    peso += w;
    if (enTexto.includes(p)) { puntos += w; continue; }
    if (esNumero) continue; // un número distinto es otra dirección
    if (p.length >= 3 && enTexto.some((t) => t.startsWith(p) || p.startsWith(t) && t.length >= 3)) { puntos += w * 0.8; continue; }
    if (p.length >= 4 && enTexto.some((t) => t.length >= 4 && distancia(p, t) <= (p.length >= 7 ? 2 : 1))) puntos += w * 0.7;
  }
  return peso === 0 ? 0 : puntos / peso;
}

function estado(d: any): DocumentoAproximado['estado'] {
  if (d.Cancelled === 'tYES') return 'Cancelado';
  return d.DocumentStatus === 'bost_Close' ? 'Cerrado' : 'Abierto';
}

async function listar(entidad: string, filtro: string): Promise<any[]> {
  const p = new URLSearchParams({ $select: SELECT, $filter: filtro, $orderby: 'DocDate desc', $top: String(MAX_CANDIDATOS) });
  const datos = await sapGet<{ value: any[] }>(`${entidad}?${p}`.replace(/\+/g, '%20'), { maxPageSize: MAX_CANDIDATOS });
  return datos.value || [];
}

/** Candidatos por dirección: primero con todos los números; si no hay, con cualquiera de las palabras clave. */
async function candidatosPorDireccion(entidad: string, buscado: string[], texto: string): Promise<any[]> {
  const numeros = [...new Set(buscado.filter((p) => /^\d+$/.test(p)))].slice(0, 4);
  const claves = [...new Set(buscado.filter((p) => !/^\d+$/.test(p) && p.length >= 4))].slice(0, 4);
  const crudas = [...new Set(sinTildes(texto).split(/[^a-z0-9]+/).filter((p) => p.length >= 4 && !/^\d+$/.test(p)))].slice(0, 4);

  if (numeros.length > 0) {
    const todos = await listar(entidad, numeros.map((n) => `contains(Address2,${odata(n)})`).join(' and '));
    if (todos.length > 0) return todos;
    // Con algún número mal escrito: basta con que estén la mayoría
    return listar(entidad, numeros.map((n) => `contains(Address2,${odata(n)})`).join(' or '));
  }
  const palabrasClave = [...new Set([...claves, ...crudas])];
  if (palabrasClave.length === 0) return [];
  return listar(entidad, palabrasClave.map((w) => `contains(Address2,${odata(w)})`).join(' or '));
}

interface Contacto { codigo: number; nombre: string; parecido: number }

/** Personas de contacto (de cualquier socio) cuyo nombre se parece a lo buscado. */
async function contactosParecidos(texto: string): Promise<Contacto[]> {
  const buscado = palabras(texto).filter((p) => p.length >= 3);
  if (buscado.length === 0) return [];
  // La palabra más larga es la que menos se repite: con ella SAP trae los candidatos
  const clave = [...buscado].sort((a, b) => b.length - a.length).slice(0, 2);
  const filtro =
    `BusinessPartners/CardCode eq BusinessPartners/ContactEmployees/CardCode and (` +
    clave.map((w) => `contains(BusinessPartners/ContactEmployees/Name,${odata(w)})`).join(' or ') + ')';
  const ruta =
    `$crossjoin(BusinessPartners,BusinessPartners/ContactEmployees)` +
    `?$expand=BusinessPartners($select=CardCode),BusinessPartners/ContactEmployees($select=Name,FirstName,LastName,InternalCode)` +
    `&$filter=${filtro}`;
  const datos = await sapGet<{ value: any[] }>(encodeURI(ruta).replace(/'/g, '%27'), { maxPageSize: 500 });
  const vistos = new Map<number, Contacto>();
  for (const fila of datos.value || []) {
    const c = fila['BusinessPartners/ContactEmployees'];
    if (typeof c?.InternalCode !== 'number') continue;
    const nombre = [c.Name, [c.FirstName, c.LastName].filter(Boolean).join(' ')].filter(Boolean).join(' ');
    const puntaje = parecido(buscado, nombre);
    if (puntaje * 100 >= MINIMO) vistos.set(c.InternalCode, { codigo: c.InternalCode, nombre: c.Name || nombre, parecido: puntaje });
  }
  return [...vistos.values()].sort((a, b) => b.parecido - a.parecido).slice(0, 100);
}

export async function buscarPorDireccionYContacto(tipo: TipoBusqueda, direccion: string, contacto: string): Promise<DocumentoAproximado[]> {
  const entidad = ENTIDAD[tipo];
  const buscadoDir = palabras(direccion);
  const conDireccion = buscadoDir.length > 0;
  const conContacto = palabras(contacto).some((p) => p.length >= 3);
  if (!conDireccion && !conContacto) return [];

  let contactos: Contacto[] = [];
  let candidatos: any[] = [];
  if (conContacto) {
    contactos = await contactosParecidos(contacto);
    if (contactos.length === 0) return [];
    const codigos = contactos.map((c) => c.codigo);
    for (let i = 0; i < codigos.length && candidatos.length < MAX_CANDIDATOS; i += 25) {
      const grupo = codigos.slice(i, i + 25).map((c) => `ContactPersonCode eq ${c}`).join(' or ');
      candidatos.push(...(await listar(entidad, `(${grupo})`)));
    }
  } else {
    candidatos = await candidatosPorDireccion(entidad, buscadoDir, direccion);
  }

  const porContacto = new Map(contactos.map((c) => [c.codigo, c]));
  const resultados: DocumentoAproximado[] = [];
  const vistos = new Set<number>();
  for (const d of candidatos) {
    if (vistos.has(d.DocEntry)) continue;
    vistos.add(d.DocEntry);
    const c = porContacto.get(d.ContactPersonCode);
    const puntajeDir = conDireccion ? parecido(buscadoDir, d.Address2 || '') : null;
    const puntajeCon = conContacto ? c?.parecido ?? 0 : null;
    const partes = [puntajeDir, puntajeCon].filter((v): v is number => v !== null);
    const coincidencia = Math.round((partes.reduce((s, v) => s + v, 0) / partes.length) * 100);
    if (coincidencia < MINIMO || (puntajeDir !== null && puntajeDir * 100 < MINIMO)) continue;
    resultados.push({
      docEntry: d.DocEntry,
      docNum: d.DocNum,
      fecha: typeof d.DocDate === 'string' ? d.DocDate.slice(0, 10) : null,
      cliente: d.CardCode,
      nombreCliente: d.CardName || '',
      direccion: d.Address2 || '',
      contacto: c?.nombre ?? null,
      total: typeof d.DocTotal === 'number' ? d.DocTotal : null,
      moneda: d.DocCurrency || null,
      estado: estado(d),
      coincidencia,
    });
  }
  return resultados
    .sort((a, b) => b.coincidencia - a.coincidencia || (b.fecha || '').localeCompare(a.fecha || ''))
    .slice(0, MAX_RESULTADOS);
}
