import { NextResponse } from 'next/server';
import { exigirSesion } from '@/lib/sesionApi';
import { SapRequestError, sapGet } from '@/lib/sapServiceLayer';
import type { OfertaIndicador } from '@/app/indicadores-mac/utils/ofertasMetricas';

// Indicadores de ingreso de ofertas de venta (OQUT): solo lectura.
// Devuelve una fila liviana por oferta; los cálculos se hacen en la hoja Ofertas de Indicadores MAC.

export const dynamic = 'force-dynamic';

const CAMPOS_BASE = [
  'DocEntry', 'DocNum', 'DocDate', 'CreationDate', 'UpdateDate', 'CardCode', 'CardName',
  'DocTotal', 'VatSum', 'DocCurrency', 'DocumentStatus', 'Cancelled', 'UserSign',
];
// El campo de confirmación tiene dos nombres posibles según la base; se prueba en orden.
const CAMPOS_ESTADO = ['U_Estado_Oferta_Venta', 'U_Estado_Oferta', null];
const MAX_OFERTAS = 20000;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function estadoDe(raw: unknown): OfertaIndicador['estado'] {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === '01' || v === '1' || v.includes('conf')) return 'Confirmada';
  if (v === '02' || v === '2' || v.includes('pend') || v === '') return 'Pendiente';
  return 'Otro';
}

async function leerOfertas(desde: string, hasta: string, campoEstado: string | null) {
  const select = [...CAMPOS_BASE, ...(campoEstado ? [campoEstado] : [])].join(',');
  let path: string | null =
    `Quotations?$select=${select}&$filter=DocDate ge '${desde}' and DocDate le '${hasta}'&$orderby=DocEntry asc`;
  const filas: any[] = [];
  while (path && filas.length < MAX_OFERTAS) {
    const res: any = await sapGet(path, { maxPageSize: 500, timeoutMs: 90000 });
    filas.push(...(res.value || []));
    const siguiente: string | undefined = res['odata.nextLink'] || res['@odata.nextLink'];
    path = siguiente ? siguiente.replace(/^.*\/b1s\/v\d+\//, '').replace(/^\//, '') : null;
  }
  return filas;
}

async function nombresDeUsuarios(ids: number[]) {
  const nombres: Record<number, string> = {};
  await Promise.all(
    ids.map(async (id) => {
      try {
        const u: any = await sapGet(`Users(${id})?$select=UserName,UserCode`);
        nombres[id] = u.UserName || u.UserCode || `Usuario ${id}`;
      } catch {
        nombres[id] = `Usuario ${id}`;
      }
    }),
  );
  return nombres;
}

export async function GET(request: Request) {
  const rechazo = await exigirSesion(request);
  if (rechazo) return rechazo;

  const { searchParams } = new URL(request.url);
  const desde = searchParams.get('desde') || '';
  const hasta = searchParams.get('hasta') || '';
  if (!FECHA.test(desde) || !FECHA.test(hasta)) {
    return NextResponse.json({ success: false, error: 'Parámetros desde y hasta (AAAA-MM-DD) son obligatorios' }, { status: 400 });
  }

  try {
    let filas: any[] = [];
    let campoEstado: string | null = null;
    for (const campo of CAMPOS_ESTADO) {
      try {
        filas = await leerOfertas(desde, hasta, campo);
        campoEstado = campo;
        break;
      } catch (e) {
        // Campo de usuario inexistente en esta base: probar el siguiente
        if (!(e instanceof SapRequestError && e.status === 400) || campo === null) throw e;
      }
    }

    const ofertas: OfertaIndicador[] = filas.map((d) => {
      const total = Number(d.DocTotal) || 0;
      const iva = Number(d.VatSum) || 0;
      const estadoSap = campoEstado ? String(d[campoEstado] ?? '') : '';
      return {
        docEntry: d.DocEntry,
        docNum: d.DocNum,
        fecha: String(d.DocDate || '').slice(0, 10),
        creacion: String(d.CreationDate || d.DocDate || '').slice(0, 10),
        modificacion: d.UpdateDate ? String(d.UpdateDate).slice(0, 10) : null,
        cliente: d.CardName || d.CardCode || '',
        totalAntesIva: total - iva,
        iva,
        moneda: d.DocCurrency || '',
        estado: campoEstado ? estadoDe(estadoSap) : 'Otro',
        estadoSap,
        cancelada: d.Cancelled === 'tYES',
        cerrada: d.DocumentStatus === 'bost_Close',
        usuario: typeof d.UserSign === 'number' ? d.UserSign : null,
      };
    });

    const ids = [...new Set(ofertas.map((o) => o.usuario).filter((u): u is number => u !== null))];
    const usuarios = await nombresDeUsuarios(ids);

    return NextResponse.json({
      success: true,
      ofertas,
      usuarios,
      campoEstado,
      truncado: filas.length >= MAX_OFERTAS,
    });
  } catch (error: any) {
    console.error('Error leyendo ofertas de venta de SAP:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
