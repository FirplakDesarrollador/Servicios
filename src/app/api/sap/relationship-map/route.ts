import { NextResponse } from 'next/server';
import { buildRelationshipMap, resolveDocEntry } from '@/lib/sapExplorer';
import { SAP_DOC_TYPES, type SapDocType } from '@/lib/sapExplorerTypes';

// Mapa de relaciones (solo lectura). Antes creaba/modificaba consultas guardadas (SQLQueries) en SAP en cada llamada;
// ahora recorre los vínculos de las líneas de cada documento con GET, sin escribir nada en SAP.
//   ?type=Order&docEntry=123   o   ?type=Order&docNum=456
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'Order';
    if (!(type in SAP_DOC_TYPES)) {
      return NextResponse.json({ error: 'Tipo de documento no válido' }, { status: 400 });
    }

    let docEntry = Number(searchParams.get('docEntry')) || null;
    const docNum = searchParams.get('docNum');
    if (!docEntry && docNum) docEntry = await resolveDocEntry(type as SapDocType, docNum);
    if (!docEntry) {
      return NextResponse.json({ error: 'Falta el parámetro docNum o docEntry, o el documento no existe' }, { status: 404 });
    }

    const map = await buildRelationshipMap(type as SapDocType, docEntry);
    if (!map) {
      return NextResponse.json({ error: 'Documento no encontrado en SAP' }, { status: 404 });
    }
    return NextResponse.json(map);
  } catch (error: any) {
    console.error('Relationship map API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
