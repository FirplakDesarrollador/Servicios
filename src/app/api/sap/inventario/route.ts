import { NextResponse } from 'next/server';
import { exigirSesion } from '@/lib/sesionApi';
import { buscarArticulos, obtenerArticulo, obtenerListaMateriales } from '@/lib/sapInventario';

// Stock e inventario (solo lectura): ?descripcion= y ?codigo= buscan artículos; ?articulo=ItemCode trae el detalle; ?ldm=ItemCode, su lista de materiales.
export async function GET(request: Request) {
  const rechazo = await exigirSesion(request);
  if (rechazo) return rechazo;

  try {
    const { searchParams } = new URL(request.url);
    const ldm = searchParams.get('ldm');
    if (ldm) return NextResponse.json({ success: true, lista: await obtenerListaMateriales(ldm) });
    const itemCode = searchParams.get('articulo');
    if (itemCode) {
      const articulo = await obtenerArticulo(itemCode);
      if (!articulo) return NextResponse.json({ success: false, error: 'Ese artículo no existe en SAP.' }, { status: 404 });
      return NextResponse.json({ success: true, articulo });
    }
    const articulos = await buscarArticulos(searchParams.get('descripcion') || '', searchParams.get('codigo') || '');
    return NextResponse.json({ success: true, articulos });
  } catch (error: any) {
    console.error('Error consultando inventario en SAP:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
