import { NextResponse } from 'next/server';
import { getCustomer360, listCustomerDocuments } from '@/lib/sapExplorer';
import { SAP_DOC_TYPES, type SapDocType } from '@/lib/sapExplorerTypes';

// Vista 360 del cliente (solo lectura).
//   ?cardCode=X                         → datos del socio, cuentas con la misma cédula/NIT y documentos recientes
//   ?cardCodes=A,B&type=Order&skip=25   → página siguiente de un tipo de documento
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const cardCodes = (searchParams.get('cardCodes') || '').split(',').map((c) => c.trim()).filter(Boolean);

    if (type && cardCodes.length > 0) {
      if (!(type in SAP_DOC_TYPES)) {
        return NextResponse.json({ success: false, error: 'Tipo de documento no válido' }, { status: 400 });
      }
      const skip = Math.max(0, Number(searchParams.get('skip')) || 0);
      const list = await listCustomerDocuments(cardCodes.slice(0, 30), type as SapDocType, skip, 50);
      return NextResponse.json({ success: true, list });
    }

    const cardCode = searchParams.get('cardCode');
    if (!cardCode) {
      return NextResponse.json({ success: false, error: 'Falta el parámetro cardCode' }, { status: 400 });
    }
    const includeRelated = searchParams.get('related') !== '0';
    const customer = await getCustomer360(cardCode, includeRelated);
    if (!customer) {
      return NextResponse.json({ success: false, error: `El socio ${cardCode} no existe en SAP` }, { status: 404 });
    }
    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    console.error('Error en cliente 360 SAP:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
