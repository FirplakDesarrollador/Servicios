import { sapGet } from '@/lib/sapServiceLayer';

// Campos de usuario (UDF) de la cabecera de un documento, tal como los define SAP en UserFieldsMD:
// misma etiqueta, mismo orden y, si el campo tiene lista de valores o tabla vinculada,
// la descripción en vez del código.

export interface CampoUsuario {
  nombre: string;      // U_xxx
  etiqueta: string;    // Description en SAP
  valor: string;       // texto listo para mostrar
  tipo: 'texto' | 'fecha' | 'numero' | 'memo';
}

interface DefinicionCampo {
  Name: string;
  Description: string;
  Type: string;
  SubType?: string;
  FieldID: number;
  LinkedTable?: string | null;
  ValidValuesMD?: Array<{ Value: string; Description: string }>;
}

export const TABLA_POR_TIPO: Record<string, string> = {
  Quotation: 'OQUT',
  Order: 'ORDR',
  Delivery: 'ODLN',
  Invoice: 'OINV',
  CreditNote: 'ORIN',
  ProductionOrder: 'OWOR',
};

const UNA_HORA = 60 * 60 * 1000;
const cacheCampos = new Map<string, { hasta: number; campos: DefinicionCampo[] }>();
const cacheTablas = new Map<string, { hasta: number; nombres: Map<string, string> }>();

function rutaSiguiente(pagina: Record<string, unknown>): string | null {
  const siguiente = (pagina['odata.nextLink'] || pagina['@odata.nextLink']) as string | undefined;
  return siguiente ? siguiente.replace(/^.*?\/b1s\/v\d+\//, '') : null;
}

async function definiciones(tabla: string): Promise<DefinicionCampo[]> {
  const guardado = cacheCampos.get(tabla);
  if (guardado && guardado.hasta > Date.now()) return guardado.campos;

  const campos: DefinicionCampo[] = [];
  let ruta: string | null =
    `UserFieldsMD?$filter=TableName eq '${tabla}'&$orderby=FieldID`;
  while (ruta) {
    const pagina: { value?: DefinicionCampo[] } & Record<string, unknown> = await sapGet(ruta, { maxPageSize: 200 });
    campos.push(...(pagina.value || []));
    ruta = rutaSiguiente(pagina);
  }
  campos.sort((a, b) => a.FieldID - b.FieldID);
  cacheCampos.set(tabla, { hasta: Date.now() + UNA_HORA, campos });
  return campos;
}

/** Code → Name de una tabla de usuario (ej. @VIAPEDIDO). Si no se puede leer, queda vacía y se muestra el código. */
async function nombresDeTabla(tabla: string): Promise<Map<string, string>> {
  const guardado = cacheTablas.get(tabla);
  if (guardado && guardado.hasta > Date.now()) return guardado.nombres;

  const nombres = new Map<string, string>();
  try {
    let ruta: string | null = `U_${tabla.replace(/^@/, '')}?$select=Code,Name`;
    while (ruta) {
      const pagina: { value?: Array<{ Code: string; Name: string }> } & Record<string, unknown> =
        await sapGet(ruta, { maxPageSize: 500 });
      for (const fila of pagina.value || []) nombres.set(String(fila.Code).trim(), fila.Name);
      ruta = rutaSiguiente(pagina);
    }
  } catch (e) {
    console.error(`No se pudo leer la tabla de usuario ${tabla}:`, e);
  }
  cacheTablas.set(tabla, { hasta: Date.now() + UNA_HORA, nombres });
  return nombres;
}

function formatoFecha(v: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
}

function tipoDe(def: DefinicionCampo): CampoUsuario['tipo'] {
  if (def.Type === 'db_Date' && def.SubType !== 'st_Time') return 'fecha';
  if (def.Type === 'db_Float' || def.Type === 'db_Numeric') return 'numero';
  if (def.Type === 'db_Memo') return 'memo';
  return 'texto';
}

function aTexto(def: DefinicionCampo, crudo: unknown, tablaVinculada?: Map<string, string>): { valor: string; tipo: CampoUsuario['tipo'] } {
  if (crudo === null || crudo === undefined || crudo === '') return { valor: '', tipo: tipoDe(def) };
  const texto = String(crudo).trim();

  const lista = def.ValidValuesMD || [];
  if (lista.length > 0) {
    const opcion = lista.find((o) => o.Value === texto);
    return { valor: opcion ? opcion.Description : texto, tipo: 'texto' };
  }
  if (tablaVinculada && tablaVinculada.size > 0) {
    return { valor: tablaVinculada.get(texto) || texto, tipo: 'texto' };
  }
  if (def.Type === 'db_Date') {
    // Los campos de hora (SubType st_Time) llegan como "HH:MM:SS"
    if (def.SubType === 'st_Time') return { valor: texto, tipo: 'texto' };
    return { valor: formatoFecha(texto), tipo: 'fecha' };
  }
  if (def.Type === 'db_Float' || def.Type === 'db_Numeric') {
    const n = Number(crudo);
    if (Number.isFinite(n)) {
      return {
        valor: n.toLocaleString('es-CO', {
          minimumFractionDigits: def.Type === 'db_Float' ? 2 : 0,
          maximumFractionDigits: def.Type === 'db_Float' ? 6 : 0,
        }),
        tipo: 'numero',
      };
    }
  }
  return { valor: texto, tipo: tipoDe(def) };
}

/** Campos de usuario de la cabecera con el valor que tiene el documento. */
export async function camposUsuarioDeDocumento(tipo: string, doc: Record<string, unknown>): Promise<CampoUsuario[]> {
  const tabla = TABLA_POR_TIPO[tipo];
  if (!tabla) return [];
  const defs = await definiciones(tabla);

  // Solo se leen las tablas vinculadas de los campos que tienen valor en este documento
  const tablas = new Set<string>();
  for (const def of defs) {
    const v = doc[`U_${def.Name}`];
    if (def.LinkedTable && !(def.ValidValuesMD || []).length && v !== null && v !== undefined && v !== '') tablas.add(def.LinkedTable);
  }
  const vinculadas = new Map<string, Map<string, string>>();
  for (const t of tablas) vinculadas.set(t, await nombresDeTabla(t));

  return defs.map((def) => {
    const nombre = `U_${def.Name}`;
    const { valor, tipo: t } = aTexto(def, doc[nombre], def.LinkedTable ? vinculadas.get(def.LinkedTable) : undefined);
    return { nombre, etiqueta: def.Description || def.Name, valor, tipo: t };
  });
}
