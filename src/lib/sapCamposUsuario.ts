import { sapGet } from '@/lib/sapServiceLayer';

// Campos de usuario (UDF) de la cabecera de un documento, tal como los define SAP en UserFieldsMD:
// misma etiqueta, mismo orden y, si el campo tiene lista de valores, la descripción en vez del código.

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
const cache = new Map<string, { hasta: number; campos: DefinicionCampo[] }>();

async function definiciones(tabla: string): Promise<DefinicionCampo[]> {
  const guardado = cache.get(tabla);
  if (guardado && guardado.hasta > Date.now()) return guardado.campos;

  const campos: DefinicionCampo[] = [];
  let ruta: string | null =
    `UserFieldsMD?$filter=TableName eq '${tabla}'&$select=Name,Description,Type,SubType,FieldID,ValidValuesMD&$orderby=FieldID`;
  while (ruta) {
    const pagina: { value?: DefinicionCampo[]; 'odata.nextLink'?: string; '@odata.nextLink'?: string } =
      await sapGet(ruta, { maxPageSize: 200 });
    campos.push(...(pagina.value || []));
    const siguiente: string | undefined = pagina['odata.nextLink'] || pagina['@odata.nextLink'];
    ruta = siguiente ? siguiente.replace(/^.*?\/b1s\/v\d+\//, '') : null;
  }
  campos.sort((a, b) => a.FieldID - b.FieldID);
  cache.set(tabla, { hasta: Date.now() + UNA_HORA, campos });
  return campos;
}

function formatoFecha(v: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
}

function aTexto(def: DefinicionCampo, crudo: unknown): { valor: string; tipo: CampoUsuario['tipo'] } {
  if (crudo === null || crudo === undefined || crudo === '') {
    return { valor: '', tipo: def.Type === 'db_Date' ? 'fecha' : def.Type === 'db_Float' || def.Type === 'db_Numeric' ? 'numero' : def.Type === 'db_Memo' ? 'memo' : 'texto' };
  }
  const texto = String(crudo).trim();
  const lista = def.ValidValuesMD || [];
  if (lista.length > 0) {
    const opcion = lista.find((o) => o.Value === texto);
    return { valor: opcion ? opcion.Description : texto, tipo: 'texto' };
  }
  if (def.Type === 'db_Date') {
    // Los campos de hora (SubType st_Time) llegan como número HHMM o "HH:MM:SS"
    if (def.SubType === 'st_Time') return { valor: texto, tipo: 'texto' };
    return { valor: formatoFecha(texto), tipo: 'fecha' };
  }
  if (def.Type === 'db_Float' || def.Type === 'db_Numeric') {
    const n = Number(crudo);
    if (Number.isFinite(n)) {
      const decimales = def.Type === 'db_Float' ? 2 : 0;
      return { valor: n.toLocaleString('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: def.Type === 'db_Float' ? 6 : 0 }), tipo: 'numero' };
    }
  }
  return { valor: texto, tipo: def.Type === 'db_Memo' ? 'memo' : 'texto' };
}

/** Campos de usuario de la cabecera con el valor que tiene el documento. */
export async function camposUsuarioDeDocumento(tipo: string, doc: Record<string, unknown>): Promise<CampoUsuario[]> {
  const tabla = TABLA_POR_TIPO[tipo];
  if (!tabla) return [];
  const defs = await definiciones(tabla);
  return defs.map((def) => {
    const nombre = `U_${def.Name}`;
    const { valor, tipo: t } = aTexto(def, doc[nombre]);
    return { nombre, etiqueta: def.Description || def.Name, valor, tipo: t };
  });
}
