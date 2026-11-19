import { NextResponse } from 'next/server';
import { exigirSesion } from '@/lib/sesionApi';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// Vercel rechaza cuerpos de más de 4,5 MB, así que los adjuntos no pasan por el servidor:
// esta ruta da una URL firmada y el navegador sube el archivo directo a Supabase Storage.
export async function POST(request: Request) {
  const rechazo = await exigirSesion(request);
  if (rechazo) return rechazo;

  try {
    const { filename } = (await request.json()) as { filename?: string };
    const ext = (filename || '').split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const path = `outgoing/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const { data, error } = await getSupabaseAdmin().storage.from('whatsapp-media').createSignedUploadUrl(path);
    if (error || !data) {
      return NextResponse.json({ error: `No se pudo preparar la subida: ${error?.message || 'sin respuesta'}` }, { status: 500 });
    }
    return NextResponse.json({ path: data.path, token: data.token });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
