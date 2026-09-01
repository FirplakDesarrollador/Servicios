import { NextResponse } from 'next/server';
import { createSapQuotation } from '@/lib/sapServiceLayer';

export async function POST(request: Request) {
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
