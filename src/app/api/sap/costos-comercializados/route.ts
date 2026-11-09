import { NextResponse } from 'next/server';
import { exigirSesion } from '@/lib/sesionApi';
import { obtenerCostosComercializados } from '@/lib/sapCostosComercializados';

export const maxDuration = 120;

// Costos Comercializados (solo lectura): costo promedio actual por artículo en MP-01 y PT-01. Sin caché: se consulta en el momento.
export async function GET(request: Request) {
  const rechazo = await exigirSesion(request);
  if (rechazo) return rechazo;

  try {
    const inicio = Date.now();
    const costos = await obtenerCostosComercializados();
    console.log(`[Costos Comercializados] ${costos.length} filas en ${Date.now() - inicio} ms`);
    return NextResponse.json({ success: true, costos, consultado: new Date().toISOString() });
  } catch (error: any) {
    console.error('[Costos Comercializados] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error consultando SAP' }, { status: 500 });
  }
}
