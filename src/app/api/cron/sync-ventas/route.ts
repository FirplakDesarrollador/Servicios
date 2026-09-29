import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// El túnel de Cloudflare cambia de URL al reiniciarse: se actualiza en la variable, no en el código.
const VENTAS_URL = process.env.VENTAS_URL!;
const VENTAS_API_KEY = process.env.VENTAS_API_KEY!;
const BATCH_SIZE = 500;

function toNumber(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function toDate(v: any): string | null {
  if (!v) return null;
  return String(v).split('T')[0];
}

function mapRow(row: any) {
  return {
    tipo_documento: row['Tipo Documento'],
    fecha_contabilizacion: toDate(row['Fecha contabilización']),
    num_documento: toNumber(row['Num Documento']),
    vendedor_senior: row['Vendedor Senior'],
    vendedor_junior: row['Vendedor Junior'],
    tipo_venta: row['Tipo Venta'],
    zona: row['Zona'],
    territorio: row['Territorio'],
    grupo_cliente: row['Grupo de Cliente'],
    subgrupo_cliente: row['Subgrupo de Cliente'],
    cod_cliente: row['Cod Cliente'],
    nombre_cliente: row['Nombre Cliente'],
    codigo_punto_venta: row['Código Punto de Venta'],
    descripcion_punto_venta: row['Descripción Punto de Venta'],
    centro_costos: row['Centro de Costos'],
    grupo_articulo: row['Grupo de Articulo'],
    familia: row['Familia'],
    codigo_articulo: row['Codigo Articulo'],
    descripcion_articulo: row['Descripcion de Articulo'],
    planta: row['Planta'],
    componente_kit: row['Componente KIT'],
    cantidad: toNumber(row['Cantidad']),
    precio_venta: toNumber(row['Precio de venta']),
    descuento_pct: toNumber(row['% Descuento']),
    precio_tras_descuento: toNumber(row['Precio tras el descuento']),
    valor_total: toNumber(row['Valor Total']),
    costo: toNumber(row['Costo']),
    costo_total: toNumber(row['Costo total']),
    contribucion_bruta: toNumber(row['Contribucion Bruta']),
    margen_bruta: toNumber(row['Margen Bruta']),
    obra: row['Obra'],
    ciudad: row['Ciudad'],
    telefono: row['Teléfono'],
    fecha_fin_novedad: toDate(row['Fecha Fin Novedad']),
    segmento_cliente: row['Segmento del cliente'],
    estrategia_cliente: row['Estrategia Cliente'],
    tipo_cliente: row['Tipo Cliente'],
    codigo_tipo_nc: row['Codigo del Tipo NC'],
    tipos_nc: row['TiposNC'],
    codigo_concepto_nc: row['Codigo Concepto Nc'],
    conceptos_notas_credito: row['Conceptos Notas Crédito'],
    comentarios: row['Comentarios'],
  };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const res = await fetch(VENTAS_URL, {
      headers: { 'api-key': VENTAS_API_KEY },
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Error consultando ventasmac (${res.status}): ${err}`);
    }

    const data = await res.json();
    const rows = data.response || [];

    const { searchParams } = new URL(request.url);
    if (searchParams.get('dry') === '1') {
      return NextResponse.json({ success: true, total: rows.length, sample: rows[0] ?? null });
    }

    const mapped = rows.map(mapRow);

    // Reemplaza toda la tabla: borra todo e inserta lo fresco del endpoint.
    const { error: deleteError } = await supabaseAdmin.from('Ventas').delete().gte('id', 0);
    if (deleteError) throw new Error(`Error borrando Ventas: ${deleteError.message}`);

    let inserted = 0;
    for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
      const batch = mapped.slice(i, i + BATCH_SIZE);
      const { error } = await supabaseAdmin.from('Ventas').insert(batch);
      if (error) {
        console.error(`[sync-ventas] Error en insert (batch ${i}):`, error.message);
      } else {
        inserted += batch.length;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const result = { success: true, total: rows.length, inserted, elapsed_seconds: elapsed };
    console.log('[sync-ventas] Completado:', JSON.stringify(result));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[sync-ventas] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
