'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, MoreVertical, Paperclip, Mic, Smile, CheckCheck, Loader2, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function WhatsAppPage() {
  const router = useRouter();
  const [activeChat, setActiveChat] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch Chats
  const fetchChats = async () => {
    const { data, error } = await supabase
      .from('whatsapp_chats')
      .select('*')
      .order('last_message_time', { ascending: false });
    
    if (data) {
      setChats(data);
    }
    setLoading(false);
  };

  // Fetch Messages for active chat
  const fetchMessages = async (chatId: string) => {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    
    if (data) {
      setMessages(data);
      setTimeout(scrollToBottom, 100);
    }
  };

  useEffect(() => {
    fetchChats();

    // Subscribe to new chats or updates
    const chatSubscription = supabase
      .channel('whatsapp_chats_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_chats' }, (payload) => {
        fetchChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatSubscription);
    };
  }, []);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.id);
      
      // Mark as read (clear unread count locally and in db)
      if (activeChat.unread_count > 0) {
        supabase.from('whatsapp_chats').update({ unread_count: 0 }).eq('id', activeChat.id).then();
      }

      const messageSubscription = supabase
        .channel('whatsapp_messages_changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages', filter: `chat_id=eq.${activeChat.id}` }, (payload) => {
          setMessages(prev => [...prev, payload.new]);
          setTimeout(scrollToBottom, 100);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_messages', filter: `chat_id=eq.${activeChat.id}` }, (payload) => {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
        })
        .subscribe();

      return () => {
        supabase.removeChannel(messageSubscription);
      };
    }
  }, [activeChat]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim() || !activeChat) return;
    
    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: activeChat.id,
          text_body: text
        })
      });

      if (!res.ok) {
        throw new Error('Error sending message');
      }
    } catch (error) {
      console.error(error);
      alert('Error enviando el mensaje');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-full md:w-[35%] lg:w-[30%] min-w-[300px] bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="h-16 bg-[#f0f2f5] flex items-center px-4 justify-between shrink-0 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/registro-solicitudes')} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-slate-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center text-slate-600 font-bold">
              YO
            </div>
          </div>
          <div className="flex items-center text-slate-600 gap-4">
            <button className="p-2 hover:bg-gray-200 rounded-full transition-colors"><MoreVertical className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Search */}
        <div className="p-2 bg-white border-b border-gray-200 shrink-0">
          <div className="bg-[#f0f2f5] flex items-center px-3 py-1.5 rounded-lg gap-3">
            <Search className="w-4 h-4 text-slate-500" />
            <input type="text" placeholder="Busca un chat o inicia uno nuevo" className="bg-transparent border-none outline-none w-full text-sm text-slate-700" />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-slate-400 p-6 text-center">
              <p>No hay chats aún.</p>
              <p className="text-xs mt-2">Los mensajes entrantes de WhatsApp aparecerán aquí.</p>
            </div>
          ) : (
            chats.map((chat) => (
              <div 
                key={chat.id} 
                onClick={() => setActiveChat(chat)}
                className={`flex items-center px-3 py-3 cursor-pointer hover:bg-[#f5f6f6] transition-colors border-b border-gray-100 ${activeChat?.id === chat.id ? 'bg-[#f0f2f5]' : 'bg-white'}`}
              >
                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold mr-3 shrink-0">
                  {(chat.contact_name && chat.contact_name !== 'Unknown') ? chat.contact_name.charAt(0).toUpperCase() : chat.phone_number.slice(-2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-semibold text-slate-800 text-base truncate">
                      {chat.contact_name && chat.contact_name !== 'Unknown' ? chat.contact_name : `+${chat.phone_number}`}
                    </h3>
                    <span className={`text-xs ${chat.unread_count > 0 ? 'text-green-600 font-medium' : 'text-slate-500'}`}>
                      {formatTime(chat.last_message_time)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-slate-500 truncate">{chat.last_message || 'Media/No text'}</p>
                    {chat.unread_count > 0 && (
                      <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ml-2">
                        {chat.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex-col bg-[#efeae2] relative ${activeChat ? 'flex' : 'hidden md:flex'}`}>
        {activeChat ? (
          <>
            {/* Background Pattern Mock */}
            <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'url("https://static.whatsapp.net/rsrc.php/v3/yl/r/r_QxeC2wX-s.png")' }}></div>
            
            {/* Header */}
            <div className="h-16 bg-[#f0f2f5] flex items-center px-4 justify-between shrink-0 relative z-10 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center text-slate-600 font-bold">
                   {(activeChat.contact_name && activeChat.contact_name !== 'Unknown') ? activeChat.contact_name.charAt(0).toUpperCase() : activeChat.phone_number.slice(-2)}
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800">
                    {activeChat.contact_name && activeChat.contact_name !== 'Unknown' ? activeChat.contact_name : `+${activeChat.phone_number}`}
                  </h2>
                  <p className="text-xs text-slate-500">en línea</p>
                </div>
              </div>
              <div className="flex items-center text-slate-600 gap-2">
                <button className="p-2 hover:bg-gray-200 rounded-full transition-colors"><Search className="w-5 h-5" /></button>
                <button className="p-2 hover:bg-gray-200 rounded-full transition-colors"><MoreVertical className="w-5 h-5" /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 relative z-10">
              {messages.length === 0 && (
                 <div className="flex justify-center mb-4">
                  <span className="bg-yellow-100/90 text-yellow-800 text-xs px-3 py-1.5 rounded-lg shadow-sm text-center">
                    Los mensajes y las llamadas están cifrados de extremo a extremo. Nadie fuera de este chat, ni siquiera WhatsApp, puede leerlos ni escucharlos.
                  </span>
                 </div>
              )}
              
              {messages.map((msg) => {
                const isMe = msg.sender === 'me';
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-lg px-3 py-1.5 shadow-sm relative ${isMe ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                      <p className="text-slate-800 text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text_body}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] text-slate-500 font-medium">{formatTime(msg.created_at)}</span>
                        {isMe && (
                          <CheckCheck className={`w-3.5 h-3.5 ${msg.status === 'read' ? 'text-blue-500' : 'text-slate-400'}`} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="min-h-[62px] bg-[#f0f2f5] px-4 py-2.5 flex items-end gap-3 shrink-0 relative z-10">
              <button type="button" className="p-2 text-slate-500 hover:text-slate-700 transition-colors shrink-0 mb-1">
                <Smile className="w-6 h-6" />
              </button>
              <button type="button" className="p-2 text-slate-500 hover:text-slate-700 transition-colors shrink-0 mb-1">
                <Paperclip className="w-6 h-6" />
              </button>
              <div className="flex-1 bg-white rounded-lg border border-white shadow-sm overflow-hidden flex items-center min-h-[40px] px-3">
                <input 
                  type="text" 
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Escribe un mensaje" 
                  className="w-full py-2 outline-none text-slate-700 bg-transparent" 
                />
              </div>
              <button 
                type="submit"
                disabled={sending || !messageText.trim()}
                className={`p-2 transition-colors shrink-0 mb-1 ${messageText.trim() ? 'text-brand' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {messageText.trim() ? <Send className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] border-l border-gray-200">
             <div className="w-80 max-w-full text-center">
                <div className="w-full h-48 bg-slate-200 mb-8 rounded-lg bg-cover bg-center opacity-60" style={{ backgroundImage: 'url("https://static.whatsapp.net/rsrc.php/v3/y6/r/wa66cgSqA5m.png")' }}></div>
                <h2 className="text-3xl font-light text-slate-700 mb-4">WhatsApp para Windows</h2>
                <p className="text-slate-500 text-sm">Envía y recibe mensajes sin mantener tu teléfono conectado.<br/>Usa WhatsApp en hasta 4 dispositivos vinculados y 1 teléfono a la vez.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
