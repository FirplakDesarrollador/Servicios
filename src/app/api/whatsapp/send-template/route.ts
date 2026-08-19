import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { phone_number, template_name, parameters, template_text } = await request.json();

    if (!phone_number || !template_name) {
      return NextResponse.json({ error: 'phone_number and template_name are required' }, { status: 400 });
    }

    // Clean phone number
    const cleanPhone = phone_number.replace(/\D/g, '');

    // 1. Find or create chat
    let chat_id;
    let contact_name = 'Unknown';
    
    const { data: existingChats, error: chatError } = await supabase
      .from('whatsapp_chats')
      .select('id, contact_name')
      .eq('phone_number', cleanPhone);

    if (chatError) {
      throw chatError;
    }

    if (existingChats && existingChats.length > 0) {
      chat_id = existingChats[0].id;
      contact_name = existingChats[0].contact_name;
    } else {
      // Create new chat
      const { data: newChat, error: newChatError } = await supabase
        .from('whatsapp_chats')
        .insert([{ phone_number: cleanPhone, contact_name: 'Unknown', unread_count: 0 }])
        .select()
        .single();
      
      if (newChatError) throw newChatError;
      chat_id = newChat.id;
    }

    // 2. Send template via WhatsApp API
    const WA_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const WA_TOKEN = process.env.WHATSAPP_PERMANENT_TOKEN;

    const components = parameters.length > 0 ? [
      {
        type: "body",
        parameters: parameters.map((p: string) => ({
          type: "text",
          text: p
        }))
      }
    ] : [];

    const waResponse = await fetch(`https://graph.facebook.com/v17.0/${WA_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'template',
        template: {
          name: template_name, // e.g., "apertura_inicial"
          language: {
            code: "es_CO" // assuming this from the user's screenshot
          },
          components: components
        },
      }),
    });

    const waData = await waResponse.json();

    if (!waResponse.ok) {
      console.error('WhatsApp API Template Error:', waData);
      return NextResponse.json({ error: 'Failed to send WhatsApp template', details: waData }, { status: 500 });
    }

    const wam_id = waData.messages?.[0]?.id;

    // 3. Save message to Supabase
    const { data: message, error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert([
        {
          chat_id,
          wam_id,
          text_body: template_text, // We save the rendered text so it shows in the UI
          sender: 'me',
          status: 'sent',
        }
      ])
      .select()
      .single();

    if (messageError) {
      console.error('Error saving template message to Supabase:', messageError);
    }

    // 4. Update chat last_message and time
    await supabase
      .from('whatsapp_chats')
      .update({
        last_message: 'Plantilla enviada',
        last_message_time: new Date().toISOString()
      })
      .eq('id', chat_id);

    return NextResponse.json({ success: true, message, chat_id });
  } catch (error: any) {
    console.error('Error in whatsapp send-template API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
