import { NextResponse } from 'next/server';
import { getDocumentDetail, resolveDocEntry } from '@/lib/sapExplorer';
import { SAP_DOC_TYPES, type SapDocType } from '@/lib/sapExplorerTypes';

// Detalle de un documento (solo lectura): ?type=Order&docEntry=123  o  ?type=Order&docNum=456
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';
    if (!(type in SAP_DOC_TYPES)) {
      return NextResponse.json({ success: false, error: 'Tipo de documento no válido' }, { status: 400 });
    }

    let docEntry = Number(searchParams.get('docEntry')) || null;
    const docNum = searchParams.get('docNum');
    if (!docEntry && docNum) docEntry = await resolveDocEntry(type as SapDocType, docNum);
    if (!docEntry) {
      return NextResponse.json({ success: false, error: 'Documento no encontrado en SAP' }, { status: 404 });
    }

    const detail = await getDocumentDetail(type as SapDocType, docEntry);
    if (!detail) {
      return NextResponse.json({ success: false, error: 'Documento no encontrado en SAP' }, { status: 404 });
    }
    return NextResponse.json({ success: true, detail });
  } catch (error: any) {
    console.error('Error en detalle de documento SAP:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
