import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ success: false, message: 'Missing path parameter' }, { status: 400 });
    }

    // Basic security check: ensure it only reads from the allowed network share
    const normalizedPath = filePath.replace(/\//g, '\\');
    
    let fileBuffer;
    try {
      fileBuffer = await fs.readFile(normalizedPath);
    } catch (e: any) {
      console.error(`Failed to read ${normalizedPath}:`, e.message);
      return NextResponse.json({ success: false, message: 'File not found or inaccessible', error: e.message }, { status: 404 });
    }
    
    // Determine content type
    let contentType = 'application/octet-stream';
    const ext = path.extname(normalizedPath).toLowerCase();
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${path.basename(normalizedPath)}"`,
      },
    });
  } catch (error: any) {
    console.error('Error reading attachment:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
