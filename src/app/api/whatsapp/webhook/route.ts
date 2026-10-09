import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getNextAssignedAsesor } from '@/lib/whatsappAssignment';

// Helper to download media from Meta Graph API and upload to Supabase Storage
async function downloadAndSaveWhatsAppMedia(mediaId: string, mimeTypeFallback?: string) {
  const WA_TOKEN = process.env.WHATSAPP_PERMANENT_TOKEN;
  if (!WA_TOKEN) {
    console.error('WHATSAPP_PERMANENT_TOKEN is not defined');
    return null;
  }

  try {
    // 1. Get media URL from Meta Graph API
    const metaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: {
        'Authorization': `Bearer ${WA_TOKEN}`,
      },
    });

    if (!metaRes.ok) {
      const errText = await metaRes.text();
      console.error(`Meta media metadata fetch failed (${metaRes.status}):`, errText);
      return null;
    }

    const metaData = await metaRes.json();
    const mediaDownloadUrl = metaData.url;
    const mimeType = metaData.mime_type || mimeTypeFallback || 'application/octet-stream';

    if (!mediaDownloadUrl) {
      console.error('Meta media metadata has no url:', metaData);
      return null;
    }

    // 2. Download binary media data
    const binaryRes = await fetch(mediaDownloadUrl, {
      headers: {
        'Authorization': `Bearer ${WA_TOKEN}`,
        'User-Agent': 'curl/7.64.1',
      },
    });

    if (!binaryRes.ok) {
      console.error(`Meta media binary download failed (${binaryRes.status}):`, binaryRes.statusText);
      return null;
    }

    const arrayBuffer = await binaryRes.arrayBuffer();

    // 3. Determine file extension
    let ext = 'bin';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('ogg')) ext = 'ogg';
    else if (mimeType.includes('mp4')) ext = 'mp4';
    else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) ext = 'mp3';
    else if (mimeType.includes('pdf')) ext = 'pdf';
    else if (mimeType.includes('quicktime')) ext = 'mov';
    else {
      const sub = mimeType.split('/')[1]?.split(';')[0];
      if (sub && sub.length <= 4) ext = sub;
    }

    const filePath = `incoming/${Date.now()}_${mediaId}.${ext}`;

    // 4. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('whatsapp-media')
      .upload(filePath, arrayBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return null;
    }

    const { data: publicData } = supabase.storage
      .from('whatsapp-media')
      .getPublicUrl(filePath);

    return {
      publicUrl: publicData.publicUrl,
      mimeType,
    };
  } catch (error) {
    console.error('Error downloading/storing WhatsApp media:', error);
    return null;
  }
}

// Helper to handle GET request for Webhook Verification
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'my_super_secret_verify_token_123';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK_VERIFIED');
    return new NextResponse(challenge, { status: 200 });
  } else {
    return new NextResponse('Forbidden', { status: 403 });
  }
}

// Helper to handle POST request for Webhook Events (incoming messages and statuses)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          const value = change.value;

          // 1. Handle Incoming Messages (Meta ONLY provides value.contacts for genuine INCOMING customer messages)
          if (value.messages && value.messages.length > 0) {
            // Outbound message echoes do not have value.contacts → ignore them so outbound chats stay unassigned (null)
            if (!value.contacts || value.contacts.length === 0) {
              continue;
            }

            for (const message of value.messages) {
              const wa_id = message.from; // Phone number
              const wam_id = message.id;
              const msgType = message.type;
              
              let media_url: string | null = null;
              let media_type: string | null = null;
              let media_mime_type: string | null = null;
              let media_filename: string | null = null;
              let text_body = message.text?.body;

              // Extract and download media if present
              if (msgType === 'image') {
                media_type = 'image';
                text_body = message.image?.caption || '';
                const mediaId = message.image?.id;
                if (mediaId) {
                  const saved = await downloadAndSaveWhatsAppMedia(mediaId, message.image?.mime_type);
                  if (saved) {
                    media_url = saved.publicUrl;
                    media_mime_type = saved.mimeType;
                  }
                }
                if (!text_body && !media_url) text_body = '📷 Imagen';
              } else if (msgType === 'audio') {
                media_type = message.audio?.voice ? 'voice' : 'audio';
                text_body = '';
                const mediaId = message.audio?.id;
                if (mediaId) {
                  const saved = await downloadAndSaveWhatsAppMedia(mediaId, message.audio?.mime_type);
                  if (saved) {
                    media_url = saved.publicUrl;
                    media_mime_type = saved.mimeType;
                  }
                }
                if (!media_url) text_body = message.audio?.voice ? '🎤 Mensaje de voz' : '🎵 Audio';
              } else if (msgType === 'video') {
                media_type = 'video';
                text_body = message.video?.caption || '';
                const mediaId = message.video?.id;
                if (mediaId) {
                  const saved = await downloadAndSaveWhatsAppMedia(mediaId, message.video?.mime_type);
                  if (saved) {
                    media_url = saved.publicUrl;
                    media_mime_type = saved.mimeType;
                  }
                }
                if (!text_body && !media_url) text_body = '🎥 Video';
              } else if (msgType === 'document') {
                media_type = 'document';
                media_filename = message.document?.filename || 'Documento';
                text_body = message.document?.caption || '';
                const mediaId = message.document?.id;
                if (mediaId) {
                  const saved = await downloadAndSaveWhatsAppMedia(mediaId, message.document?.mime_type);
                  if (saved) {
                    media_url = saved.publicUrl;
                    media_mime_type = saved.mimeType;
                  }
                }
                if (!text_body && !media_url) text_body = message.document?.filename ? `📄 ${message.document.filename}` : '📄 Documento';
              } else if (msgType === 'sticker') {
                media_type = 'sticker';
                text_body = '';
                const mediaId = message.sticker?.id;
                if (mediaId) {
                  const saved = await downloadAndSaveWhatsAppMedia(mediaId, message.sticker?.mime_type);
                  if (saved) {
                    media_url = saved.publicUrl;
                    media_mime_type = saved.mimeType;
                  }
                }
                if (!media_url) text_body = '💟 Sticker';
              } else if (msgType === 'location') {
                text_body = message.location?.name ? `📍 ${message.location.name}` : '📍 Ubicación';
              } else if (msgType === 'interactive') {
                text_body = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || 'Respuesta interactiva';
              } else if (msgType === 'button') {
                text_body = message.button?.text || 'Botón';
              } else if (!text_body) {
                text_body = message.caption || 'Mensaje de WhatsApp';
              }

              const previewText = text_body || (
                media_type === 'image' ? '📷 Imagen' :
                media_type === 'voice' ? '🎤 Nota de voz' :
                media_type === 'audio' ? '🎵 Audio' :
                media_type === 'video' ? '🎥 Video' :
                media_type === 'sticker' ? '💟 Sticker' :
                media_type === 'document' ? (media_filename ? `📄 ${media_filename}` : '📄 Documento') :
                'Mensaje de WhatsApp'
              );

              // Find contact name from the contacts array
              let contactName = 'Unknown';
              const contact = value.contacts.find((c: any) => c.wa_id === wa_id);
              if (contact && contact.profile?.name) {
                contactName = contact.profile.name;
              }

              // Check if message was already created by our system (outbound message/template sent by us)
              const { data: existingWam } = await supabase
                .from('whatsapp_messages')
                .select('id, sender')
                .eq('wam_id', wam_id)
                .maybeSingle();

              if (existingWam && existingWam.sender === 'me') {
                // Ignore outbound messages sent by our system so they remain unassigned (null)
                continue;
              }

              // Find or create chat
              let { data: chat, error: chatFindError } = await supabase
                .from('whatsapp_chats')
                .select('id, unread_count, responsable')
                .eq('phone_number', wa_id)
                .maybeSingle();

              let chatId = chat?.id;

              if (!chat) {
                // If chat did not exist, it's an incoming customer message -> auto-assign Round-Robin
                const autoAssignedResponsable = await getNextAssignedAsesor();
                const { data: newChat, error: createError } = await supabase
                  .from('whatsapp_chats')
                  .insert([{
                    phone_number: wa_id,
                    contact_name: contactName,
                    last_message: previewText,
                    last_message_time: new Date().toISOString(),
                    unread_count: 1,
                    responsable: autoAssignedResponsable
                  }])
                  .select()
                  .single();
                
                if (!createError && newChat) {
                  chatId = newChat.id;
                }
              } else {
                // Update existing chat
                // AUTO-ASSIGN: If the chat currently has no responsable assigned, assign via Round-Robin
                let updatedResponsable = chat.responsable;
                if (!chat.responsable) {
                  updatedResponsable = await getNextAssignedAsesor();
                }

                await supabase
                  .from('whatsapp_chats')
                  .update({
                    contact_name: contactName !== 'Unknown' ? contactName : undefined,
                    last_message: previewText,
                    last_message_time: new Date().toISOString(),
                    unread_count: (chat.unread_count || 0) + 1,
                    responsable: updatedResponsable
                  })
                  .eq('id', chatId);
              }

              // Insert message
              if (chatId) {
                await supabase
                  .from('whatsapp_messages')
                  .insert([{
                    chat_id: chatId,
                    wam_id: wam_id,
                    text_body: text_body,
                    sender: 'them',
                    status: 'received',
                    media_url: media_url,
                    media_type: media_type,
                    media_mime_type: media_mime_type,
                    media_filename: media_filename
                  }]);
              }
            }
          }

          // 2. Handle Message Statuses (Sent, Delivered, Read)
          if (value.statuses && value.statuses.length > 0) {
            for (const status of value.statuses) {
              const wam_id = status.id;
              const msgStatus = status.status; // sent, delivered, read, failed

              await supabase
                .from('whatsapp_messages')
                .update({ status: msgStatus })
                .eq('wam_id', wam_id);
            }
          }
        }
      }
      return NextResponse.json({ success: true });
    } else {
      return new NextResponse('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
