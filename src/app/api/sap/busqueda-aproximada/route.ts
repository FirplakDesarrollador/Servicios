import { NextResponse } from 'next/server';
import { exigirSesion } from '@/lib/sesionApi';
import { buscarPorDireccionYContacto, type TipoBusqueda } from '@/lib/sapBusquedaAproximada';

export const maxDuration = 60;

// Órdenes de venta y entregas por dirección de entrega y/o persona de contacto, con coincidencias aproximadas (solo lectura).
//   ?tipo=Order|Delivery&direccion=...&contacto=...
export async function GET(request: Request) {
  const rechazo = await exigirSesion(request);
  if (rechazo) return rechazo;

  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo') === 'Delivery' ? 'Delivery' : 'Order';
    const direccion = (searchParams.get('direccion') || '').trim().slice(0, 200);
    const contacto = (searchParams.get('contacto') || '').trim().slice(0, 120);
    if (!direccion && !contacto) {
      return NextResponse.json({ success: false, error: 'Escribe una dirección de entrega o una persona de contacto.' }, { status: 400 });
    }
    const documentos = await buscarPorDireccionYContacto(tipo as TipoBusqueda, direccion, contacto);
    return NextResponse.json({ success: true, documentos });
  } catch (error: any) {
    console.error('[Búsqueda aproximada SAP] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error consultando SAP' }, { status: 500 });
  }
}
