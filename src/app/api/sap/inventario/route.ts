import { NextResponse } from 'next/server';
import { buscarArticulos, obtenerArticulo } from '@/lib/sapInventario';

// Stock e inventario (solo lectura): ?q=texto busca artículos; ?codigo=ItemCode trae el detalle.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codigo = searchParams.get('codigo');
    if (codigo) {
      const articulo = await obtenerArticulo(codigo);
      if (!articulo) return NextResponse.json({ success: false, error: 'Ese artículo no existe en SAP.' }, { status: 404 });
      return NextResponse.json({ success: true, articulo });
    }
    const articulos = await buscarArticulos(searchParams.get('q') || '');
    return NextResponse.json({ success: true, articulos });
  } catch (error: any) {
    console.error('Error consultando inventario en SAP:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
