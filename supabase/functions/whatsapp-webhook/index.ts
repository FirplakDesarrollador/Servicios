import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Supabase client with service role (full access) ──────────────────────────
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN") ?? "Frp!2026_wH4ts4p_v3r1fy_T0k3n";

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
          const phoneNumber = msg.from; // e.g. "573001234567"
          const messageId   = msg.id;
          const timestamp   = new Date(parseInt(msg.timestamp) * 1000).toISOString();

          // Only handle text messages for now (can be extended for media, etc.)
          let textBody = "";
          if (msg.type === "text") {
            textBody = msg.text?.body ?? "";
          } else if (msg.type === "image") {
            textBody = "📷 Imagen";
          } else if (msg.type === "audio") {
            textBody = "🎤 Audio";
          } else if (msg.type === "video") {
            textBody = "🎬 Video";
          } else if (msg.type === "document") {
            textBody = "📄 Documento";
          } else if (msg.type === "location") {
            textBody = "📍 Ubicación";
          } else {
            textBody = `[${msg.type}]`;
          }

          // Get contact name from profile info if available
          const contactName = value.contacts?.[0]?.profile?.name ?? "Unknown";

          // ── Upsert chat ────────────────────────────────────────────────────
          const { data: chat, error: chatError } = await supabase
            .from("whatsapp_chats")
            .upsert(
              {
                phone_number:      phoneNumber,
                contact_name:      contactName,
                last_message:      textBody,
                last_message_time: timestamp,
                // Increment unread_count: we use a raw expression via rpc if needed,
                // but for simplicity we fetch first then update
              },
              { onConflict: "phone_number" }
            )
            .select("id, unread_count")
            .single();

          if (chatError) {
            console.error("Error upserting chat:", chatError);
            continue;
          }

          // Increment unread_count separately
          await supabase
            .from("whatsapp_chats")
            .update({
              unread_count:      (chat.unread_count ?? 0) + 1,
              last_message:      textBody,
              last_message_time: timestamp,
              contact_name:      contactName,
            })
            .eq("id", chat.id);

          // ── Insert message ─────────────────────────────────────────────────
          const { error: msgError } = await supabase
            .from("whatsapp_messages")
            .upsert(
              {
                chat_id:    chat.id,
                wam_id:  messageId,
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
