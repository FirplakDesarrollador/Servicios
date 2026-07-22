import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { chat_id, text_body } = await request.json();

    if (!chat_id || !text_body) {
      return NextResponse.json({ error: 'chat_id and text_body are required' }, { status: 400 });
    }

    // 1. Get the phone number from chat_id
    const { data: chat, error: chatError } = await supabase
      .from('whatsapp_chats')
      .select('phone_number')
      .eq('id', chat_id)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const phoneNumber = chat.phone_number;

    // 2. Send message via WhatsApp API
    const WA_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const WA_TOKEN = process.env.WHATSAPP_PERMANENT_TOKEN;

    const waResponse = await fetch(`https://graph.facebook.com/v17.0/${WA_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: text_body },
      }),
    });

    const waData = await waResponse.json();

    if (!waResponse.ok) {
      console.error('WhatsApp API Error:', waData);
      return NextResponse.json({ error: 'Failed to send WhatsApp message', details: waData }, { status: 500 });
    }

    const wam_id = waData.messages?.[0]?.id;

    // 3. Save message to Supabase
    const { data: message, error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert([
        {
          chat_id,
          wam_id,
          text_body,
          sender: 'me',
          status: 'sent',
        }
      ])
      .select()
      .single();

    if (messageError) {
      console.error('Error saving message to Supabase:', messageError);
    }

    // 4. Update chat last_message and time
    await supabase
      .from('whatsapp_chats')
      .update({
        last_message: text_body,
        last_message_time: new Date().toISOString()
      })
      .eq('id', chat_id);

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error('Error in whatsapp send API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
