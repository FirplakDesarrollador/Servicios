import { NextResponse } from 'next/server';
import { exigirSesion } from '@/lib/sesionApi';
import { camposUsuarioDeDocumento, type CampoUsuario } from '@/lib/sapCamposUsuario';
import { createSapQuotation, fetchSapQuotationByDocNum, searchSapDocumentsList } from '@/lib/sapServiceLayer';

export async function GET(request: Request) {
  const rechazo = await exigirSesion(request);
  if (rechazo) return rechazo;

  try {
    const { searchParams } = new URL(request.url);
    const docNum = searchParams.get('docNum');
    const docType = searchParams.get('type') || 'Order';
    const search = searchParams.get('search');

    if (search) {
      const docList = await searchSapDocumentsList(search, docType);
      return NextResponse.json({ success: true, documents: docList });
    }

    if (!docNum) {
      return NextResponse.json({ error: 'Param docNum or search is required' }, { status: 400 });
    }

    const docResult = await fetchSapQuotationByDocNum(docNum, docType as any);
    if (!docResult) {
      return NextResponse.json({ success: false, message: 'Documento no encontrado en SAP B1' }, { status: 404 });
    }

    // Campos de usuario con la definición real de SAP; si fallan, el documento se muestra igual
    let camposUsuario: CampoUsuario[] | null = null;
    try {
      camposUsuario = await camposUsuarioDeDocumento(docResult.documentType, docResult.data);
    } catch (e) {
      console.error('No se pudieron leer los campos de usuario de SAP:', e);
    }

    return NextResponse.json({ success: true, document: { ...docResult, camposUsuario } });
  } catch (error: any) {
    console.error('Error fetching SAP quotation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rechazo = await exigirSesion(request);
  if (rechazo) return rechazo;

  try {
    const body = await request.json();
    const { CardCode, DocumentLines, Comments, DocDueDate } = body;

    if (!CardCode || !DocumentLines || DocumentLines.length === 0) {
      return NextResponse.json(
        { error: 'CardCode and DocumentLines are required' },
        { status: 400 }
      );
    }

    const sapResult = await createSapQuotation({
      CardCode,
      DocumentLines,
      Comments,
      DocDueDate
    });

    return NextResponse.json({ success: true, result: sapResult });
  } catch (error: any) {
    console.error('Error posting SAP quotation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
