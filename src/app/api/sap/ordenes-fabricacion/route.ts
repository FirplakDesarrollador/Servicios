import { NextResponse } from 'next/server';
import { buscarOrdenesFabricacion } from '@/lib/sapExplorer';

// Órdenes de fabricación por pedido de cliente y/o producto (solo lectura).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ordenes = await buscarOrdenesFabricacion(searchParams.get('pedido') || '', searchParams.get('producto') || '');
    return NextResponse.json({ success: true, ordenes });
  } catch (error: any) {
    console.error('Error buscando órdenes de fabricación:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
