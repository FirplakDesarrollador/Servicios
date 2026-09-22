import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Supabase client with service role (full access) ──────────────────────────
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN") ?? "Frp!2026_wH4ts4p_v3r1fy_T0k3n";

const DEFAULT_ASESORES = ['Xime', 'Tati', 'Andrew'];

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

          // Only handle text messages for now (can be extended for media, etc.)
          let textBody = "";
          if (msg.type === "text") {
            textBody = msg.text?.body ?? "";
          } else if (msg.type === "image") {
            textBody = msg.image?.caption || "📷 Imagen";
          } else if (msg.type === "audio") {
            textBody = msg.audio?.voice ? "🎤 Mensaje de voz" : "🎵 Audio";
          } else if (msg.type === "video") {
            textBody = msg.video?.caption || "🎥 Video";
          } else if (msg.type === "document") {
            textBody = msg.document?.filename ? `📄 ${msg.document.filename}` : "📄 Documento";
          } else if (msg.type === "location") {
            textBody = "📍 Ubicación";
          } else if (msg.type === "interactive") {
            textBody = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "Respuesta interactiva";
          } else if (msg.type === "button") {
            textBody = msg.button?.text || "Botón";
          } else {
            textBody = `[${msg.type}]`;
          }

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
                last_message:      textBody,
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
                last_message:      textBody,
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
                  chat_id:    chatId,
                  wam_id:     messageId,
                  text_body:  textBody,
                  sender:     "them",
                  status:     "received",
                  created_at: timestamp,
                },
                { onConflict: "wam_id" }
              );

            if (msgError) {
              console.error("Error inserting message:", msgError);
            } else {
              console.log(`✅ Message saved from ${phoneNumber}: "${textBody}"`);
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
