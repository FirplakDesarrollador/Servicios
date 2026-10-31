import { NextResponse } from 'next/server';
import { sapGet, sapGetRaw, SapRequestError } from '@/lib/sapServiceLayer';

// Anexos de documentos SAP (solo lectura), servidos por el Service Layer: el servidor de SAP sí tiene acceso
// a la carpeta \\PES\Adjuntossap, Vercel no. Solo se entregan archivos registrados en SAP (Attachments2);
// antes la ruta leía cualquier archivo cuya ruta le pasaran.
//   ?absEntry=123           → lista de anexos del documento (AttachmentEntry)
//   ?absEntry=123&line=1    → el archivo, para verlo en el navegador (&download=1 para descargarlo)

const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  txt: 'text/plain; charset=utf-8',
  xml: 'application/xml',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
};

interface AttachmentLine {
  LineNum: number;
  FileName: string;
  FileExtension: string | null;
  AttachmentDate: string | null;
  FreeText: string | null;
}

async function getLines(absEntry: number): Promise<AttachmentLine[] | null> {
  try {
    const data = await sapGet<{ Attachments2_Lines?: AttachmentLine[] }>(`Attachments2(${absEntry})`);
    return data.Attachments2_Lines || [];
  } catch (err) {
    if (err instanceof SapRequestError && err.status === 404) return null;
    throw err;
  }
}

const fullName = (l: AttachmentLine) => (l.FileExtension ? `${l.FileName}.${l.FileExtension}` : l.FileName);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const absEntry = Number(searchParams.get('absEntry'));
    if (!Number.isInteger(absEntry) || absEntry <= 0) {
      return NextResponse.json({ success: false, message: 'Falta el parámetro absEntry' }, { status: 400 });
    }

    const lines = await getLines(absEntry);
    if (!lines) {
      return NextResponse.json({ success: false, message: 'El documento no tiene anexos en SAP' }, { status: 404 });
    }

    const lineParam = searchParams.get('line');
    if (lineParam === null) {
      return NextResponse.json({
        success: true,
        attachments: lines.map((l) => {
          const ext = (l.FileExtension || '').toLowerCase();
          return {
            line: l.LineNum,
            name: fullName(l),
            extension: ext,
            date: l.AttachmentDate ? l.AttachmentDate.slice(0, 10) : null,
            note: l.FreeText,
            viewable: ext === 'pdf' || (ext in CONTENT_TYPES && CONTENT_TYPES[ext].startsWith('image/')),
          };
        }),
      });
    }

    const line = lines.find((l) => String(l.LineNum) === lineParam);
    if (!line) {
      return NextResponse.json({ success: false, message: 'Anexo no encontrado' }, { status: 404 });
    }

    const name = fullName(line);
    const res = await sapGetRaw(`Attachments2(${absEntry})/$value?filename='${encodeURIComponent(name.replace(/'/g, "''"))}'`);
    if (!res.ok) {
      const body = await res.text();
      console.error('[SAP Anexos] Error descargando', absEntry, name, res.status, body.slice(0, 300));
      return NextResponse.json({ success: false, message: `SAP no pudo entregar el anexo (${res.status})` }, { status: 502 });
    }

    const ext = (line.FileExtension || '').toLowerCase();
    const disposition = searchParams.get('download') === '1' ? 'attachment' : 'inline';
    return new NextResponse(res.body, {
      headers: {
        'Content-Type': CONTENT_TYPES[ext] || res.headers.get('content-type') || 'application/octet-stream',
        'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(name)}`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error: any) {
    console.error('Error leyendo anexo SAP:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
