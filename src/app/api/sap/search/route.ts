import { NextResponse } from 'next/server';
import { exigirSesion } from '@/lib/sesionApi';
import { searchSap } from '@/lib/sapExplorer';

// Búsqueda global (solo lectura): clientes por cédula/NIT, código o nombre y documentos por número u orden de compra.
export async function GET(request: Request) {
  const rechazo = await exigirSesion(request);
  if (rechazo) return rechazo;

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const result = await searchSap(q);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error en búsqueda SAP:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
