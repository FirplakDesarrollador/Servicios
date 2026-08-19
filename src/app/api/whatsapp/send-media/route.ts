import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const chat_id = formData.get('chat_id') as string;
    const id = formData.get('id') as string | null;

    if (!file || !chat_id) {
      return NextResponse.json({ error: 'file and chat_id are required' }, { status: 400 });
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

    // 2. Upload file to Supabase Storage
    const ext = file.name.split('.').pop() ?? 'bin';
    const filename = `outgoing/${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('whatsapp-media')
      .upload(filename, arrayBuffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: 'Upload failed', details: uploadError }, { status: 500 });
    }

    const { data: publicData } = supabase.storage.from('whatsapp-media').getPublicUrl(filename);
    const publicUrl = publicData.publicUrl;

    // 3. Determine WhatsApp media type
    const mimeType = file.type;
    let waType = 'document';
    
    if (mimeType.startsWith('image/')) {
      waType = 'image';
    } else if (mimeType.startsWith('video/')) {
      waType = 'video';
    } else if (mimeType.startsWith('audio/')) {
      // Chrome records in WebM format which Meta API rejects for "audio" type messages.
      // To ensure delivery, we send WebM recordings as "document" so it arrives as an audio file.
      if (mimeType.includes('webm')) {
        waType = 'document';
      } else {
        waType = 'audio';
      }
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
      mediaPayload[waType].filename = file.name;
    }

    const waResponse = await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(mediaPayload),
    });

    const waData = await waResponse.json();

    if (!waResponse.ok) {
      console.error('WhatsApp API Error:', waData);
      return NextResponse.json({ error: 'Failed to send media', details: waData }, { status: 500 });
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
        media_filename: file.name,
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
