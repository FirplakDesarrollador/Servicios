import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

          // 1. Handle Incoming Messages
          if (value.messages && value.messages.length > 0) {
            for (const message of value.messages) {
              const wa_id = message.from; // Phone number
              const text_body = message.text?.body;
              const wam_id = message.id;
              
              // Find contact name from the contacts array
              let contactName = 'Unknown';
              if (value.contacts && value.contacts.length > 0) {
                const contact = value.contacts.find((c: any) => c.wa_id === wa_id);
                if (contact && contact.profile?.name) {
                  contactName = contact.profile.name;
                }
              }

              if (text_body) {
                // Find or create chat
                let { data: chat, error: chatFindError } = await supabase
                  .from('whatsapp_chats')
                  .select('id, unread_count')
                  .eq('phone_number', wa_id)
                  .single();

                let chatId = chat?.id;

                if (!chat) {
                  const { data: newChat, error: createError } = await supabase
                    .from('whatsapp_chats')
                    .insert([{
                      phone_number: wa_id,
                      contact_name: contactName,
                      last_message: text_body,
                      last_message_time: new Date().toISOString(),
                      unread_count: 1
                    }])
                    .select()
                    .single();
                  
                  if (!createError && newChat) {
                    chatId = newChat.id;
                  }
                } else {
                  // Update existing chat
                  await supabase
                    .from('whatsapp_chats')
                    .update({
                      contact_name: contactName !== 'Unknown' ? contactName : undefined,
                      last_message: text_body,
                      last_message_time: new Date().toISOString(),
                      unread_count: (chat.unread_count || 0) + 1
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
                      status: 'received'
                    }]);
                }
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
