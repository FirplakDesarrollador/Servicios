import { NextResponse } from 'next/server';
import { fetchSapSqlQuery } from '@/lib/sapServiceLayer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const SAP_QUERY = 'fir_productos_mdrc';
const BATCH_SIZE = 200;

// El sync completo tarda ~90s (15k+ filas paginadas de a 20 en SAP).
export const maxDuration = 300;

// Valores del enum product_group en Supabase. Un valor fuera de esta lista hace
// fallar la tanda completa del upsert, por eso se filtra antes.
const GRUPOS_VALIDOS = new Set([
  'BANERA', 'BANO', 'COCINAS', 'EXHIBIDOR', 'GRIFERIA', 'HIDROEMP', 'HIDROPOR',
  'MPDIRECT', 'PLOMERIA', 'REPUESTO', 'ROPAS', 'SERVICIOS', 'ZOCALOS', 'QUARTZSTONE',
]);

// Nombres que usa SAP distintos al enum de Supabase.
const ALIAS_GRUPO: Record<string, string> = {
  EXHIBICN: 'EXHIBIDOR',
};

// SAP devuelve "BAÑO", "BAÑERA"; el enum no tiene tildes ni eñes.
function normalizeGrupo(value: unknown): string {
  const g = String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase();
  return ALIAS_GRUPO[g] ?? g;
}

type ProductoRow = { sku: string; nombre: string; grupo: string; planta?: string };

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const rows = await fetchSapSqlQuery(SAP_QUERY);
    console.log(`[sync-productos-mdrc] Filas recibidas de SAP: ${rows.length}`);

    // Si el query en SAP cambia de columnas, abortar en vez de escribir basura.
    const faltantes = ['sku', 'nombre', 'grupo', 'planta'].filter(c => rows[0] && !(c in rows[0]));
    if (faltantes.length) {
      throw new Error(`El query ${SAP_QUERY} no trae las columnas: ${faltantes.join(', ')}`);
    }

    // Deduplica por SKU (quitando espacios) y separa filas con grupo desconocido.
    const porSku = new Map<string, ProductoRow>();
    const gruposDesconocidos: Record<string, number> = {};
    for (const r of rows) {
      const sku = String(r.sku ?? '').trim();
      if (!sku) continue;
      const grupo = normalizeGrupo(r.grupo);
      if (!GRUPOS_VALIDOS.has(grupo)) {
        gruposDesconocidos[grupo || '(vacío)'] = (gruposDesconocidos[grupo || '(vacío)'] ?? 0) + 1;
        continue;
      }
      const planta = String(r.planta ?? '').trim();
      porSku.set(sku, { sku, nombre: String(r.nombre ?? '').trim(), grupo, ...(planta ? { planta } : {}) });
    }
    const productos = Array.from(porSku.values());

    const { searchParams } = new URL(request.url);
    if (searchParams.get('dry') === '1') {
      return NextResponse.json({
        success: true,
        sap_total: rows.length,
        a_sincronizar: productos.length,
        grupos_desconocidos: gruposDesconocidos,
        sample: productos[0] ?? null,
      });
    }

    // Filas sin planta se suben aparte y sin esa columna, para no borrar la planta ya cargada.
    const conPlanta = productos.filter(p => p.planta);
    const sinPlanta = productos.filter(p => !p.planta);

    let upserted = 0;
    const errores: string[] = [];
    for (const lote of [conPlanta, sinPlanta]) {
      for (let i = 0; i < lote.length; i += BATCH_SIZE) {
        const batch = lote.slice(i, i + BATCH_SIZE);
        const { error } = await getSupabaseAdmin()
          .from('Productos')
          .upsert(batch, { onConflict: 'sku' });
        if (error) {
          console.error(`[sync-productos-mdrc] Error en upsert (batch ${i}):`, error.message);
          errores.push(error.message);
        } else {
          upserted += batch.length;
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const result = {
      success: errores.length === 0,
      sap_total: rows.length,
      upserted,
      sin_planta: sinPlanta.length,
      grupos_desconocidos: gruposDesconocidos,
      errores: errores.slice(0, 5),
      elapsed_seconds: elapsed,
    };
    console.log('[sync-productos-mdrc] Completado:', JSON.stringify(result));

    return NextResponse.json(result, { status: errores.length ? 500 : 200 });
  } catch (error: any) {
    console.error('[sync-productos-mdrc] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
