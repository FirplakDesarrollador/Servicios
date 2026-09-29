import { NextResponse } from 'next/server';
import { fetchSapSqlQuery } from '@/lib/sapServiceLayer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const SAP_QUERY = 'fir_productos_mdrc';
const BATCH_SIZE = 200;

// El sync completo tarda ~90s (15k filas paginadas de a 20 en SAP).
export const maxDuration = 300;

// El enum product_group en Supabase no tiene tildes/eñes (ej. BANO, BANERA),
// pero SAP devuelve "BAÑO", "BAÑERA". Se normaliza quitando diacríticos.
function normalizeGrupo(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();
}

// El query SAP trae otros nombres de columna que la tabla Productos.
// El id que trae SAP es interno de SAP, nunca se manda (pisaría el id real de la fila en Supabase).
function mapRow(row: any) {
  return {
    sku: row.producto_sku,
    nombre: row.producto_descripcion,
    grupo: normalizeGrupo(row.grupo),
    color_base: row.color_codigo,
    planta: row.planta_codigo,
  };
}

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

    const { searchParams } = new URL(request.url);
    if (searchParams.get('dry') === '1') {
      return NextResponse.json({ success: true, sap_total: rows.length, sample: rows[0] ?? null });
    }
    if (searchParams.get('debug') === 'grupos') {
      const grupos = Array.from(new Set(rows.map((r: any) => r.grupo))).sort();
      return NextResponse.json({ success: true, sap_total: rows.length, grupos });
    }

    if (rows.length === 0) {
      return NextResponse.json({ success: true, sap_total: 0, upserted: 0 });
    }

    const mapped = rows.map(mapRow);

    let upserted = 0;
    for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
      const batch = mapped.slice(i, i + BATCH_SIZE);
      const { error } = await getSupabaseAdmin()
        .from('Productos')
        .upsert(batch, { onConflict: 'sku' });

      if (error) {
        console.error(`[sync-productos-mdrc] Error en upsert (batch ${i}):`, error.message);
      } else {
        upserted += batch.length;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const result = { success: true, sap_total: rows.length, upserted, elapsed_seconds: elapsed };
    console.log('[sync-productos-mdrc] Completado:', JSON.stringify(result));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[sync-productos-mdrc] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
