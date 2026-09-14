'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, MoreVertical, Paperclip, Mic, Smile, CheckCheck, Send, MessageSquarePlus, Trash2, UserCheck, Settings, ChevronDown, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import NewMessageModal from '@/components/whatsapp/NewMessageModal';
import AsesoresModal from '@/components/whatsapp/AsesoresModal';
import { getNextAssignedAsesor } from '@/lib/whatsappAssignment';

export default function WhatsAppPage() {
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [newMessageTemplate, setNewMessageTemplate] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResponsableFilter, setSelectedResponsableFilter] = useState('todos');
  const [asesoresList, setAsesoresList] = useState<string[]>(['Xime', 'Tati', 'Adrew']);
  const [isAsesoresModalOpen, setIsAsesoresModalOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [asesorFilterSearch, setAsesorFilterSearch] = useState('');
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob, url: string } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const [sending, setSending] = useState(false);
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Fetch Current Logged In User Profile ─────────────────────────────────────
  const fetchCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('Usuarios')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (profile) {
        setCurrentUser(profile);
        const name = profile.display_name?.trim() || `${profile.nombres || ''} ${profile.apellidos || ''}`.trim() || profile.correo;
        setCurrentUserName(name);
      } else {
        const fallbackName = session.user.email?.split('@')[0] || 'Usuario';
        setCurrentUserName(fallbackName);
      }
    }
  };

  // ── Fetch Asesores dynamically ────────────────────────────────────────────────
  const fetchAsesores = async () => {
    const { data } = await supabase
      .from('whatsapp_asesores')
      .select('nombre')
      .eq('activo', true)
      .order('nombre', { ascending: true });
    if (data && data.length > 0) {
      setAsesoresList(data.map(a => a.nombre));
    }
  };

  // ── Filter chats ──────────────────────────────────────────────────────────────
  const filteredChats = chats.filter((chat) => {
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = chat.contact_name?.toLowerCase().includes(q);
    const phoneMatch = chat.phone_number?.includes(q);
    const msgMatch = chat.last_message?.toLowerCase().includes(q);
    const respMatchText = chat.responsable?.toLowerCase().includes(q);
    const matchesSearch = !q || nameMatch || phoneMatch || msgMatch || respMatchText;

    let matchesResponsable = true;
    if (selectedResponsableFilter === 'mis_chats') {
      matchesResponsable = !!(currentUserName && chat.responsable?.toLowerCase().includes(currentUserName.toLowerCase()));
    } else if (selectedResponsableFilter === 'sin_asignar') {
      matchesResponsable = !chat.responsable;
    } else if (selectedResponsableFilter !== 'todos') {
      matchesResponsable = chat.responsable === selectedResponsableFilter;
    }

    return matchesSearch && matchesResponsable;
  });

  // ── Fetch chats ──────────────────────────────────────────────────────────────
  const fetchChats = async () => {
    const { data } = await supabase
      .from('whatsapp_chats')
      .select('*')
      .order('last_message_time', { ascending: false });
    if (data) setChats(data);
    setLoading(false);
  };

  // ── Update chat responsable ──────────────────────────────────────────────────
  const handleUpdateResponsable = async (chatId: string, value: string) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, responsable: value } : c));
    if (activeChat?.id === chatId) {
      setActiveChat((prev: any) => prev ? { ...prev, responsable: value } : prev);
    }
    await supabase
      .from('whatsapp_chats')
      .update({ responsable: value })
      .eq('id', chatId);
  };

  // ── Fetch messages ───────────────────────────────────────────────────────────
  const fetchMessages = async (chatId: string) => {
    const { data } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (data) {
      setMessages(data);
      setTimeout(scrollToBottom, 100);
    }
  };

  // ── Initial chat & asesores subscription ─────────────────────────────────────
  useEffect(() => {
    fetchCurrentUser();
    fetchChats();
    fetchAsesores();

    // Listen for any change in whatsapp_chats → refresh chat list
    const chatSub = supabase
      .channel('realtime-chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_chats' }, () => {
        fetchChats();
      })
      .subscribe();

    const asesoresSub = supabase
      .channel('realtime-asesores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_asesores' }, () => {
        fetchAsesores();
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(chatSub); 
      supabase.removeChannel(asesoresSub); 
    };
  }, []);

  // ── Message subscription when active chat changes ────────────────────────────
  useEffect(() => {
    if (!activeChat) return;

    fetchMessages(activeChat.id);

    // Clear unread
    if (activeChat.unread_count > 0) {
      supabase.from('whatsapp_chats').update({ unread_count: 0 }).eq('id', activeChat.id).then();
    }

    // Subscribe to ALL new messages, filter client-side
    // (server-side filter on realtime is unreliable without special config)
    const msgSub = supabase
      .channel(`realtime-messages-${activeChat.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
        (payload) => {
          // Only show messages belonging to the current active chat
          if (payload.new.chat_id !== activeChat.id) return;
          setMessages(prev => {
            // Avoid duplicates from optimistic updates
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          setTimeout(scrollToBottom, 100);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'whatsapp_messages' },
        (payload) => {
          if (payload.new.chat_id !== activeChat.id) return;
          setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
        }
      )
      .subscribe((status) => {
        console.log('Realtime status:', status);
      });

    return () => { supabase.removeChannel(msgSub); };
  }, [activeChat?.id]);

  // ── Send text message ────────────────────────────────────────────────────────
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim() || !activeChat || sending || isRecording) return;

    const text = messageText.trim();
    setMessageText('');

    // Optimistic update
    const msgId = crypto.randomUUID();
    const optimisticMsg = {
      id: msgId,
      chat_id: activeChat.id,
      text_body: text,
      sender: 'me',
      status: 'sent',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);

    setSending(true);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: activeChat.id, text_body: text, id: msgId }),
      });
      if (!res.ok) throw new Error('Error enviando');
    } catch (err) {
      console.error(err);
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      alert('Error enviando el mensaje. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  // ── Send template ────────────────────────────────────────────────────────────
  const handleSendTemplate = async (data: { phoneNumber: string; template: any; parameters: string[] }) => {
    try {
      setSending(true);
      const templateText = data.parameters.reduce(
        (acc, param, idx) => acc.replace(`{{${idx + 1}}}`, param),
        data.template.text
      );
      const res = await fetch('/api/whatsapp/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: data.phoneNumber,
          template_name: data.template.metaName,
          language_code: data.template.languageCode,
          parameters: data.parameters,
          template_text: templateText,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error enviando la plantilla');
      }
      const result = await res.json();
      setIsNewMessageModalOpen(false);
      await fetchChats();
      if (result.chat_id) {
        const { data: newChat } = await supabase.from('whatsapp_chats').select('*').eq('id', result.chat_id).single();
        if (newChat) setActiveChat(newChat);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  // ── Send media ───────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;
    
    e.target.value = ''; // Reset input

    const waType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('video/') ? 'video' : 'document';
    const textLabel = waType === 'image' ? 'Imagen' : waType === 'audio' ? 'Audio' : waType === 'video' ? 'Video' : 'Documento';

    const msgId = crypto.randomUUID();
    const optimisticMsg = {
      id: msgId,
      chat_id: activeChat.id,
      text_body: textLabel,
      sender: 'me',
      status: 'sending...',
      created_at: new Date().toISOString(),
      media_url: URL.createObjectURL(file), // Show local preview instantly
      media_type: waType,
      media_mime_type: file.type,
      media_filename: file.name
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('chat_id', activeChat.id);
    formData.append('id', msgId);

    try {
      const res = await fetch('/api/whatsapp/send-media', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Error enviando archivo');
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      alert('Error enviando el archivo. Intenta de nuevo.');
    }
  };

  // ── Audio Recording ──────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudio({ blob: audioBlob, url });
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('No se pudo acceder al micrófono. Por favor, permite el acceso en tu navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const discardAudio = () => {
    if (recordedAudio) URL.revokeObjectURL(recordedAudio.url);
    setRecordedAudio(null);
  };

  const sendAudio = async () => {
    if (!recordedAudio || !activeChat) return;

    // Send as WebM. The API route will send it as a document so it doesn't get dropped by WhatsApp.
    const file = new File([recordedAudio.blob], 'Nota_de_voz.webm', { type: 'audio/webm' });
    const msgId = crypto.randomUUID();
    const optimisticMsg = {
      id: msgId,
      chat_id: activeChat.id,
      text_body: 'Nota de voz',
      sender: 'me',
      status: 'sending...',
      created_at: new Date().toISOString(),
      media_url: recordedAudio.url,
      media_type: 'document',
      media_mime_type: 'audio/webm',
      media_filename: 'Nota_de_voz.webm'
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setRecordedAudio(null);
    setTimeout(scrollToBottom, 50);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('chat_id', activeChat.id);
    formData.append('id', msgId);

    try {
      const res = await fetch('/api/whatsapp/send-media', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Error enviando audio');
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      alert('Error enviando la nota de voz. Intenta de nuevo.');
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  return (
    // Use fixed positioning to ensure full viewport coverage
    <div className="fixed inset-0 flex bg-gradient-to-br from-indigo-50 via-slate-50 to-emerald-50 font-sans">

      {/* ── Sidebar ── */}
      <div className="w-[320px] lg:w-[350px] shrink-0 bg-white/60 backdrop-blur-xl border-r border-white/50 flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">

        {/* Header */}
        <div className="h-[72px] flex items-center px-6 justify-between shrink-0 border-b border-white/50 bg-white/40">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/registro-solicitudes')} className="p-2.5 bg-white shadow-sm hover:shadow-md rounded-full transition-all text-slate-600 border border-gray-100">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-11 h-11 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white text-xs uppercase" title={currentUserName || 'Usuario en sesión'}>
              {currentUserName ? currentUserName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'YO'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsNewMessageModalOpen(true)} className="p-2.5 hover:bg-white/80 hover:shadow-sm rounded-full transition-all text-indigo-500" title="Nueva Conversación">
              <MessageSquarePlus className="w-5 h-5" />
            </button>
            <button className="p-2.5 hover:bg-white/80 hover:shadow-sm rounded-full transition-all text-slate-500">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="p-4 shrink-0 space-y-2.5">
          <div className="bg-white/80 border border-white shadow-sm flex items-center px-4 py-2.5 rounded-2xl gap-3">
            <Search className="w-4 h-4 text-indigo-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar mensajes o chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none w-full text-sm text-slate-700 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-xs text-slate-400 hover:text-slate-600 font-bold px-1">✕</button>
            )}
          </div>

          {/* Searchable Dropdown & Asesores Settings Button */}
          <div className="flex items-center justify-between gap-2 relative z-30" ref={filterDropdownRef}>
            
            {/* Dropdown Button */}
            <button
              type="button"
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="flex-1 bg-white/80 hover:bg-white border border-white shadow-sm flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                <UserCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="text-slate-400">Responsable:</span>
                <span className="text-indigo-600 font-bold truncate">
                  {selectedResponsableFilter === 'todos' 
                    ? 'Todos' 
                    : selectedResponsableFilter === 'mis_chats'
                    ? 'Mis Chats'
                    : selectedResponsableFilter === 'sin_asignar' 
                    ? 'Sin asignar' 
                    : selectedResponsableFilter}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Button to open Asesores Modal */}
            <button
              onClick={() => setIsAsesoresModalOpen(true)}
              className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200/80 rounded-xl transition-all flex items-center gap-1 shrink-0 text-xs font-bold shadow-sm cursor-pointer"
              title="Gestionar Asesores"
            >
              <Settings className="w-4 h-4" />
              <span>Asesores</span>
            </button>

            {/* Dropdown Popover with Search */}
            {isFilterDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-40 animate-in fade-in zoom-in-95 duration-100">
                {/* Mini search input inside dropdown */}
                <div className="flex items-center px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200/70 mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    placeholder="Buscar asesor..."
                    value={asesorFilterSearch}
                    onChange={(e) => setAsesorFilterSearch(e.target.value)}
                    className="bg-transparent text-xs outline-none w-full text-slate-700 placeholder:text-slate-400"
                    autoFocus
                  />
                  {asesorFilterSearch && (
                    <button onClick={() => setAsesorFilterSearch('')} className="text-[10px] text-slate-400 hover:text-slate-600 font-bold">✕</button>
                  )}
                </div>

                {/* Options List */}
                <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5">
                  <button
                    onClick={() => {
                      setSelectedResponsableFilter('todos');
                      setIsFilterDropdownOpen(false);
                      setAsesorFilterSearch('');
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                      selectedResponsableFilter === 'todos' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Todos los responsables</span>
                    {selectedResponsableFilter === 'todos' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>

                  {currentUserName && (
                    <button
                      onClick={() => {
                        setSelectedResponsableFilter('mis_chats');
                        setIsFilterDropdownOpen(false);
                        setAsesorFilterSearch('');
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                        selectedResponsableFilter === 'mis_chats' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Mis Chats ({currentUserName})
                      </span>
                      {selectedResponsableFilter === 'mis_chats' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedResponsableFilter('sin_asignar');
                      setIsFilterDropdownOpen(false);
                      setAsesorFilterSearch('');
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                      selectedResponsableFilter === 'sin_asignar' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Sin asignar</span>
                    {selectedResponsableFilter === 'sin_asignar' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>

                  <div className="my-1 border-t border-slate-100"></div>

                  {asesoresList
                    .filter(a => a.toLowerCase().includes(asesorFilterSearch.toLowerCase().trim()))
                    .map((resp) => (
                      <button
                        key={resp}
                        onClick={() => {
                          setSelectedResponsableFilter(resp);
                          setIsFilterDropdownOpen(false);
                          setAsesorFilterSearch('');
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                          selectedResponsableFilter === resp ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{resp}</span>
                        {selectedResponsableFilter === resp && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </button>
                    ))}

                  {asesoresList.filter(a => a.toLowerCase().includes(asesorFilterSearch.toLowerCase().trim())).length === 0 && (
                    <p className="text-[11px] text-slate-400 text-center py-2 italic">No hay asesores con esa búsqueda</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <p className="font-medium text-slate-500 text-sm">No se encontraron chats</p>
              <p className="text-xs text-slate-400 mt-1">Prueba cambiando los filtros de búsqueda</p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={`flex items-center p-3 cursor-pointer rounded-2xl transition-all ${activeChat?.id === chat.id ? 'bg-white shadow-md border border-white/80' : 'hover:bg-white/50 border border-transparent'}`}
              >
                <div className="flex flex-col items-center shrink-0 mr-3 w-16">
                  <div className="relative">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shadow-sm ${activeChat?.id === chat.id ? 'bg-gradient-to-br from-indigo-500 to-blue-600' : 'bg-gradient-to-br from-slate-300 to-slate-400'}`}>
                      {(chat.contact_name && chat.contact_name !== 'Unknown') ? chat.contact_name.charAt(0).toUpperCase() : chat.phone_number?.slice(-2)}
                    </div>
                    {chat.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-col items-center w-full" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Responsable</span>
                    <select
                      value={chat.responsable || ''}
                      onChange={(e) => handleUpdateResponsable(chat.id, e.target.value)}
                      className={`text-[9px] leading-tight font-semibold truncate max-w-full text-center px-0.5 py-0.5 rounded cursor-pointer outline-none border transition-all ${chat.responsable ? 'text-indigo-600 bg-indigo-50 border-indigo-200 font-bold' : 'text-slate-400 bg-slate-100/80 border-slate-200/60'}`}
                      title={chat.responsable || 'Sin asignar'}
                    >
                      <option value="">Sin asignar</option>
                      {asesoresList.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h3 className="font-semibold text-sm text-slate-800 truncate">
                      {chat.contact_name && chat.contact_name !== 'Unknown' ? chat.contact_name : `+${chat.phone_number}`}
                    </h3>
                    <span className={`text-[10px] font-medium shrink-0 ml-2 ${chat.unread_count > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {formatTime(chat.last_message_time)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-500 truncate pr-2">{chat.last_message || 'Multimedia'}</p>
                    {chat.unread_count > 0 && (
                      <span className="bg-emerald-500 rounded-full px-1.5 py-0.5 text-white text-[10px] font-bold shrink-0">{chat.unread_count}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0 p-4 lg:p-6 pb-0 lg:pb-0">
        {activeChat ? (
          // This card must fill remaining height: flex-1 + min-h-0 is the key
          <div className="flex-1 flex flex-col min-h-0 bg-white/80 backdrop-blur-xl rounded-t-3xl shadow-lg border border-b-0 border-white overflow-hidden relative">

            {/* Glow effects */}
            <div className="pointer-events-none absolute top-0 left-0 w-64 h-64 bg-indigo-300/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
            <div className="pointer-events-none absolute bottom-0 right-0 w-64 h-64 bg-emerald-300/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>

            {/* Chat header */}
            <div className="shrink-0 h-[68px] bg-white/95 border-b border-gray-100 flex items-center px-6 justify-between z-10 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                    {(activeChat.contact_name && activeChat.contact_name !== 'Unknown') ? activeChat.contact_name.charAt(0).toUpperCase() : activeChat.phone_number?.slice(-2)}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">
                    {activeChat.contact_name && activeChat.contact_name !== 'Unknown' ? activeChat.contact_name : `+${activeChat.phone_number}`}
                  </h2>
                  <p className="text-xs text-emerald-500 font-medium">En línea</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Asignarme Button */}
                {currentUserName && activeChat.responsable !== currentUserName && (
                  <button
                    onClick={() => handleUpdateResponsable(activeChat.id, currentUserName)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-xl border border-indigo-200/80 transition-all shrink-0 flex items-center gap-1.5 shadow-sm cursor-pointer"
                    title={`Asignar este chat a ${currentUserName}`}
                  >
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    Asignarme
                  </button>
                )}

                {/* Selector Responsable */}
                <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200/70 transition-all">
                  <UserCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Responsable</span>
                    <select
                      value={activeChat.responsable || ''}
                      onChange={(e) => handleUpdateResponsable(activeChat.id, e.target.value)}
                      className="bg-transparent text-xs font-bold text-indigo-700 outline-none cursor-pointer border-none p-0 focus:ring-0"
                    >
                      <option value="">-- Sin Responsable --</option>
                      {asesoresList.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button className="p-2 bg-white hover:shadow-sm rounded-full transition-all border border-gray-100 text-indigo-400"><Search className="w-4 h-4" /></button>
                <button className="p-2 bg-white hover:shadow-sm rounded-full transition-all border border-gray-100 text-slate-400"><MoreVertical className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-2">
              {messages.map((msg) => {
                const isMe = msg.sender === 'me';
                const hasMedia = !!msg.media_url;
                const isImage = msg.media_type === 'image';
                const isAudio = msg.media_type === 'audio' || msg.media_type === 'voice' || (msg.media_type === 'document' && msg.media_filename?.endsWith('.webm'));
                const isVideo = msg.media_type === 'video';
                const isDoc = msg.media_type === 'document' && !msg.media_filename?.endsWith('.webm');

                return (
                  <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl shadow-sm overflow-hidden ${isMe
                      ? 'bg-indigo-600 text-white rounded-tr-sm'
                      : 'bg-white text-slate-800 border border-gray-100 rounded-tl-sm'
                    }`}>
                      {/* Image */}
                      {hasMedia && isImage && (
                        <img
                          src={msg.media_url}
                          alt="Imagen"
                          className="w-full max-w-[280px] object-cover rounded-t-2xl cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(msg.media_url, '_blank')}
                        />
                      )}
                      {/* Audio */}
                      {hasMedia && isAudio && (
                        <div className="px-2 pt-2 pb-1">
                          <audio controls src={msg.media_url} className="w-[260px] sm:w-[300px] h-[44px] outline-none" />
                        </div>
                      )}
                      {/* Video */}
                      {hasMedia && isVideo && (
                        <video controls src={msg.media_url} className="w-full max-w-[280px] rounded-t-2xl" />
                      )}
                      {/* Document */}
                      {hasMedia && isDoc && (
                        <a href={msg.media_url} target="_blank" rel="noreferrer"
                          className={`flex items-center gap-2 px-4 pt-3 hover:underline ${isMe ? 'text-white' : 'text-indigo-600'}`}>
                          <span className="text-2xl">📄</span>
                          <span className="text-sm truncate">{msg.media_filename || 'Documento'}</span>
                        </a>
                      )}
                      {/* Text body */}
                      <div className="px-4 py-2.5">
                        {msg.text_body && !['Imagen','Audio','Video','Documento','Nota de voz'].includes(msg.text_body) && (
                          <p className={`text-[14px] leading-relaxed whitespace-pre-wrap break-words ${isMe ? 'text-white' : 'text-slate-700'}`}>
                            {msg.text_body}
                          </p>
                        )}
                        <div className={`flex items-center justify-end gap-1 mt-0.5 ${isMe ? 'opacity-75' : 'opacity-50'}`}>
                          <span className="text-[10px] font-medium">{formatTime(msg.created_at)}</span>
                          {isMe && <CheckCheck className={`w-3.5 h-3.5 ${msg.status === 'read' ? 'text-blue-300' : ''}`} />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input — shrink-0 keeps it at the bottom always */}
            <div className="shrink-0 px-4 py-3 bg-white/60 border-t border-gray-100 z-10">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-white rounded-2xl border border-gray-200 px-3 py-2 shadow-sm focus-within:border-indigo-300 transition-colors">
                {recordedAudio ? (
                  <div className="flex-1 flex items-center gap-3 bg-indigo-50/50 rounded-xl px-3 py-1 border border-indigo-100">
                    <button type="button" onClick={discardAudio} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Eliminar audio">
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <audio controls src={recordedAudio.url} className="flex-1 h-[40px] outline-none" />
                    <button type="button" onClick={sendAudio} disabled={sending} className="p-1.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-full transition-colors shadow-sm ml-2" title="Enviar audio">
                      <Send className="w-5 h-5 ml-0.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button type="button" className="p-1.5 text-slate-400 hover:text-indigo-500 rounded-full transition-colors">
                      <Smile className="w-5 h-5" />
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1.5 text-slate-400 hover:text-indigo-500 rounded-full transition-colors" title="Adjuntar archivo">
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                    />

                    {isRecording ? (
                      <div className="flex-1 flex items-center justify-between gap-3 px-3 text-red-500 animate-pulse bg-red-50 rounded-xl py-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                          <span className="text-sm font-medium">Grabando...</span>
                        </div>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        className="flex-1 bg-transparent outline-none text-slate-700 placeholder:text-slate-400 text-[15px] py-1"
                      />
                    )}
                    
                    {messageText.trim() ? (
                      <button
                        type="submit"
                        disabled={sending}
                        className="p-2 rounded-xl transition-all bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    ) : isRecording ? (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="p-2 rounded-xl transition-all bg-red-500 text-white hover:bg-red-600 shadow-sm"
                        title="Detener y escuchar"
                      >
                        <CheckCheck className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="p-2 rounded-xl transition-all text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                        title="Grabar nota de voz"
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                    )}
                  </>
                )}
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-12 bg-white/60 rounded-3xl border border-white shadow-sm max-w-md">
              <div className="w-24 h-24 bg-gradient-to-tr from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Send className="w-10 h-10 text-indigo-500 translate-x-0.5" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3">Selecciona un chat</h2>
              <p className="text-slate-500 text-sm leading-relaxed">Elige una conversación de la lista o inicia una nueva con el botón +</p>
            </div>
          </div>
        )}
      </div>

      <NewMessageModal
        isOpen={isNewMessageModalOpen}
        onClose={() => setIsNewMessageModalOpen(false)}
        onSubmit={handleSendTemplate}
      />

      <AsesoresModal
        isOpen={isAsesoresModalOpen}
        onClose={() => setIsAsesoresModalOpen(false)}
        onAsesoresChanged={fetchAsesores}
      />
    </div>
  );
}
