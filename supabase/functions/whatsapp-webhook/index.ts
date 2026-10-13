import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Supabase client with service role (full access) ──────────────────────────
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN") ?? "Frp!2026_wH4ts4p_v3r1fy_T0k3n";
const WA_PERMANENT_TOKEN = Deno.env.get("WHATSAPP_PERMANENT_TOKEN") ?? "EAGJBa2zR4FgBSa4NtnItcwOKvxUutCKK0aShm98StSSkkxJZBVg0Cbr7ZCC94AMXf8HG955HwfSfaHesLU23wl50O1XrATZANFZBUPdIYGOWbpsZCVZBL0yVWsv2yriQU1o1bZBptDqCdtZBYXXIGAW5ZARHrQIw5Wcq8kjinXeiVujGTiDnv5wsZCKsdxBMSGzj3yZBgZDZD";

const DEFAULT_ASESORES = ['Xime', 'Tati', 'Andrew'];

// Helper to download media from Meta Graph API and upload to Supabase Storage
async function downloadAndSaveWhatsAppMedia(mediaId: string, mimeTypeFallback?: string) {
  try {
    // 1. Get media direct URL from Meta Graph API
    const metaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: {
        'Authorization': `Bearer ${WA_PERMANENT_TOKEN}`,
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
        'Authorization': `Bearer ${WA_PERMANENT_TOKEN}`,
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

    // 4. Upload to Supabase Storage whatsapp-media bucket
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

async function getNextAssignedAsesor(supabaseClient: any): Promise<string> {
  try {
    let asesorNames: string[] = [];
    const { data: asesores } = await supabaseClient
      .from('whatsapp_asesores')
      .select('nombre')
      .eq('activo', true)
      .order('created_at', { ascending: true });

    if (asesores && asesores.length > 0) {
      asesorNames = asesores.map((a: any) => a.nombre?.trim()).filter(Boolean);
    }

    if (asesorNames.length === 0) {
      asesorNames = DEFAULT_ASESORES;
    }

    const { data: stateRows } = await supabaseClient
      .from('whatsapp_assignment_state')
      .select('last_index')
      .eq('id', 1)
      .maybeSingle();

    let lastIndex = stateRows?.last_index ?? -1;
    const nextIndex = (lastIndex + 1) % asesorNames.length;
    const selectedAsesor = asesorNames[nextIndex];

    await supabaseClient
      .from('whatsapp_assignment_state')
      .upsert({ id: 1, last_index: nextIndex, updated_at: new Date().toISOString() });

    console.log(`[StrictRoundRobin] Last Index: ${lastIndex} -> Next: ${nextIndex} -> Assigned: "${selectedAsesor}"`);
    return selectedAsesor;
  } catch (error) {
    console.error('[StrictRoundRobin] Exception:', error);
    return DEFAULT_ASESORES[0];
  }
}

function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.length === 10 && clean.startsWith('3')) {
    clean = '57' + clean;
  }
  return clean;
}

// ────────────────────────────────────────────────────────────────────────────
serve(async (req) => {
  // ── GET: Meta webhook verification challenge ───────────────────────────────
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode      = url.searchParams.get("hub.mode");
    const token     = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified ✅");
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // ── POST: Incoming event from WhatsApp ─────────────────────────────────────
  if (req.method === "POST") {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    console.log("Webhook payload:", JSON.stringify(body, null, 2));

    try {
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value) {
        return new Response("OK", { status: 200 });
      }

      // ── 1. Handle incoming messages ────────────────────────────────────────
      if (value.messages && value.messages.length > 0) {
        for (const msg of value.messages) {
          const rawPhone = msg.from; // e.g. "573001234567"
          const phoneNumber = normalizePhoneNumber(rawPhone);
          const altPhone = phoneNumber.startsWith('57') ? phoneNumber.slice(2) : `57${phoneNumber}`;
          const messageId   = msg.id;
          const timestamp   = new Date(parseInt(msg.timestamp) * 1000).toISOString();
          const msgType     = msg.type;

          let media_url: string | null = null;
          let media_type: string | null = null;
          let media_mime_type: string | null = null;
          let media_filename: string | null = null;
          let textBody = "";

          if (msgType === "text") {
            textBody = msg.text?.body ?? "";
          } else if (msgType === "image") {
            media_type = "image";
            textBody = msg.image?.caption || "";
            const mediaId = msg.image?.id;
            if (mediaId) {
              const saved = await downloadAndSaveWhatsAppMedia(mediaId, msg.image?.mime_type);
              if (saved) {
                media_url = saved.publicUrl;
                media_mime_type = saved.mimeType;
              }
            }
            if (!textBody && !media_url) textBody = "📷 Imagen";
          } else if (msgType === "audio") {
            media_type = msg.audio?.voice ? "voice" : "audio";
            textBody = "";
            const mediaId = msg.audio?.id;
            if (mediaId) {
              const saved = await downloadAndSaveWhatsAppMedia(mediaId, msg.audio?.mime_type);
              if (saved) {
                media_url = saved.publicUrl;
                media_mime_type = saved.mimeType;
              }
            }
            if (!media_url) textBody = msg.audio?.voice ? "🎤 Mensaje de voz" : "🎵 Audio";
          } else if (msgType === "video") {
            media_type = "video";
            textBody = msg.video?.caption || "";
            const mediaId = msg.video?.id;
            if (mediaId) {
              const saved = await downloadAndSaveWhatsAppMedia(mediaId, msg.video?.mime_type);
              if (saved) {
                media_url = saved.publicUrl;
                media_mime_type = saved.mimeType;
              }
            }
            if (!textBody && !media_url) textBody = "🎥 Video";
          } else if (msgType === "document") {
            media_type = "document";
            media_filename = msg.document?.filename || "Documento";
            textBody = msg.document?.caption || "";
            const mediaId = msg.document?.id;
            if (mediaId) {
              const saved = await downloadAndSaveWhatsAppMedia(mediaId, msg.document?.mime_type);
              if (saved) {
                media_url = saved.publicUrl;
                media_mime_type = saved.mimeType;
              }
            }
            if (!textBody && !media_url) textBody = msg.document?.filename ? `📄 ${msg.document.filename}` : "📄 Documento";
          } else if (msgType === "sticker") {
            media_type = "sticker";
            textBody = "";
            const mediaId = msg.sticker?.id;
            if (mediaId) {
              const saved = await downloadAndSaveWhatsAppMedia(mediaId, msg.sticker?.mime_type);
              if (saved) {
                media_url = saved.publicUrl;
                media_mime_type = saved.mimeType;
              }
            }
            if (!media_url) textBody = "💟 Sticker";
          } else if (msgType === "location") {
            textBody = msg.location?.name ? `📍 ${msg.location.name}` : "📍 Ubicación";
          } else if (msgType === "interactive") {
            textBody = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "Respuesta interactiva";
          } else if (msgType === "button") {
            textBody = msg.button?.text || "Botón";
          } else {
            textBody = `[${msgType}]`;
          }

          const previewText = textBody || (
            media_type === "image" ? "📷 Imagen" :
            media_type === "voice" ? "🎤 Nota de voz" :
            media_type === "audio" ? "🎵 Audio" :
            media_type === "video" ? "🎥 Video" :
            media_type === "sticker" ? "💟 Sticker" :
            media_type === "document" ? (media_filename ? `📄 ${media_filename}` : "📄 Documento") :
            "Mensaje de WhatsApp"
          );

          // Get contact name from profile info if available
          const contactName = value.contacts?.[0]?.profile?.name ?? "Unknown";

          // ── Fetch existing chat (matching 57... or 10-digit) ───────────────
          const { data: existingChats } = await supabase
            .from("whatsapp_chats")
            .select("id, phone_number, unread_count, responsable")
            .in("phone_number", [phoneNumber, altPhone]);

          const existingChat = existingChats && existingChats.length > 0 ? existingChats[0] : null;

          let responsable = existingChat?.responsable;
          if (!responsable) {
            responsable = await getNextAssignedAsesor(supabase);
          }

          let chatId = existingChat?.id;

          if (!existingChat) {
            const { data: newChat, error: chatError } = await supabase
              .from("whatsapp_chats")
              .insert({
                phone_number:      phoneNumber,
                contact_name:      contactName,
                last_message:      previewText,
                last_message_time: timestamp,
                unread_count:      1,
                responsable:       responsable
              })
              .select("id")
              .single();

            if (chatError) {
              console.error("Error creating chat:", chatError);
              continue;
            }
            chatId = newChat.id;
          } else {
            const { error: updateError } = await supabase
              .from("whatsapp_chats")
              .update({
                phone_number:      phoneNumber, // Unify to international format
                unread_count:      (existingChat.unread_count ?? 0) + 1,
                last_message:      previewText,
                last_message_time: timestamp,
                contact_name:      contactName !== "Unknown" ? contactName : undefined,
                responsable:       responsable
              })
              .eq("id", existingChat.id);

            if (updateError) {
              console.error("Error updating chat:", updateError);
            }
          }

          // ── Insert message ─────────────────────────────────────────────────
          if (chatId) {
            const { error: msgError } = await supabase
              .from("whatsapp_messages")
              .upsert(
                {
                  chat_id:          chatId,
                  wam_id:           messageId,
                  text_body:        textBody,
                  sender:           "them",
                  status:           "received",
                  created_at:       timestamp,
                  media_url:        media_url,
                  media_type:       media_type,
                  media_mime_type:  media_mime_type,
                  media_filename:   media_filename,
                },
                { onConflict: "wam_id" }
              );

            if (msgError) {
              console.error("Error inserting message:", msgError);
            } else {
              console.log(`✅ Message saved from ${phoneNumber}: "${textBody}" (media: ${media_type || 'none'})`);
            }
          }
        }
      }

      // ── 2. Handle message status updates (sent/delivered/read) ─────────────
      if (value.statuses && value.statuses.length > 0) {
        for (const status of value.statuses) {
          const waMessageId = status.id;
          const newStatus   = status.status; // "sent" | "delivered" | "read" | "failed"

          await supabase
            .from("whatsapp_messages")
            .update({ status: newStatus })
            .eq("wam_id", waMessageId);

          console.log(`📬 Status update: ${waMessageId} → ${newStatus}`);
        }
      }

      return new Response("OK", { status: 200 });

    } catch (err) {
      console.error("Webhook processing error:", err);
      // Always return 200 to Meta so it doesn't retry infinitely
      return new Response("OK", { status: 200 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
});
