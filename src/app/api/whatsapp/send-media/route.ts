import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    // Dos formas: JSON con el archivo ya subido a Storage por el navegador (adjuntos, sin límite de 4,5 MB
    // de Vercel) o formulario con el archivo (notas de voz, que son pequeñas).
    let file: File | null = null;
    let chat_id = '';
    let id: string | null = null;
    let subido: { path: string; filename: string; mime: string } | null = null;

    if ((request.headers.get('content-type') || '').includes('application/json')) {
      const body = await request.json();
      chat_id = body.chat_id;
      id = body.id || null;
      if (body.storage_path) {
        subido = { path: String(body.storage_path), filename: String(body.filename || 'archivo'), mime: String(body.mime_type || 'application/octet-stream') };
      }
    } else {
      const formData = await request.formData();
      file = formData.get('file') as File;
      chat_id = formData.get('chat_id') as string;
      id = formData.get('id') as string | null;
    }

    if ((!file && !subido) || !chat_id) {
      return NextResponse.json({ error: 'Falta el archivo o el chat' }, { status: 400 });
    }
    if (subido && !subido.path.startsWith('outgoing/')) {
      return NextResponse.json({ error: 'Ruta de archivo no válida' }, { status: 400 });
    }

    // 1. Get phone number
    const { data: chat, error: chatError } = await supabase
      .from('whatsapp_chats')
      .select('phone_number')
      .eq('id', chat_id)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // 2. Archivo en Supabase Storage (ya subido por el navegador, o se sube aquí)
    let filename: string;
    let nombreOriginal: string;
    let tipoCrudo: string;
    if (subido) {
      filename = subido.path;
      nombreOriginal = subido.filename;
      tipoCrudo = subido.mime;
    } else {
      const f = file as File;
      const ext = f.name.split('.').pop() ?? 'bin';
      filename = `outgoing/${Date.now()}.${ext}`;
      nombreOriginal = f.name;
      tipoCrudo = f.type;
      const { error: uploadError } = await supabase.storage
        .from('whatsapp-media')
        .upload(filename, await f.arrayBuffer(), { contentType: f.type.split(';')[0].trim(), upsert: false });
      if (uploadError) {
        return NextResponse.json({ error: `No se pudo guardar el archivo: ${uploadError.message}` }, { status: 500 });
      }
    }

    const { data: publicData } = supabase.storage.from('whatsapp-media').getPublicUrl(filename);
    const publicUrl = publicData.publicUrl;

    // 3. Determine WhatsApp media type
    // Sin parámetros tipo ";codecs=opus" para guardar un MIME limpio
    const mimeType = (tipoCrudo || 'application/octet-stream').split(';')[0].trim();
    let waType = 'document';

    if (mimeType.startsWith('image/')) {
      waType = 'image';
    } else if (mimeType.startsWith('video/')) {
      waType = 'video';
    } else if (mimeType.startsWith('audio/')) {
      // Las notas de voz llegan ya convertidas (OGG/MP3/MP4) desde el cliente; WhatsApp no acepta WebM
      waType = 'audio';
    }

    // 4. Send via WhatsApp API
    const WA_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const WA_TOKEN = process.env.WHATSAPP_PERMANENT_TOKEN;

    const mediaPayload: any = {
      messaging_product: 'whatsapp',
      to: chat.phone_number,
      type: waType,
      [waType]: { link: publicUrl },
    };

    // Add filename for documents
    if (waType === 'document') {
      mediaPayload[waType].filename = nombreOriginal;
    }

    const waResponse = await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(mediaPayload),
    });

    const waData = await waResponse.json();

    if (!waResponse.ok) {
      console.error('WhatsApp API Error:', waData);
      return NextResponse.json({ error: `WhatsApp rechazó el archivo: ${waData?.error?.message || waResponse.status}`, details: waData }, { status: 500 });
    }

    const wam_id = waData.messages?.[0]?.id;

    // 5. Save message to Supabase
    const textLabel = waType === 'image' ? 'Imagen' : waType === 'audio' ? 'Audio' : waType === 'video' ? 'Video' : 'Documento';

    const { data: message } = await supabase
      .from('whatsapp_messages')
      .insert([{
        ...(id ? { id } : {}),
        chat_id,
        wam_id,
        text_body: textLabel,
        sender: 'me',
        status: 'sent',
        media_url: publicUrl,
        media_type: waType,
        media_mime_type: mimeType,
        media_filename: nombreOriginal,
      }])
      .select()
      .single();

    // 6. Update chat preview
    await supabase
      .from('whatsapp_chats')
      .update({ last_message: textLabel, last_message_time: new Date().toISOString() })
      .eq('id', chat_id);

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error('Error sending media:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
