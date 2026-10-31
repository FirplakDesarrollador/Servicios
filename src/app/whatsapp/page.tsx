'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, MoreVertical, Paperclip, Mic, Smile, CheckCheck, Send, MessageSquarePlus, Trash2, UserCheck, Settings, ChevronDown, Check, Phone, Video, UserPlus, Edit2, X, Star, Reply, Mail, MailOpen, User, AudioLines, Zap, Settings2, BookmarkPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import NewMessageModal from '@/components/whatsapp/NewMessageModal';
import AsesoresModal from '@/components/whatsapp/AsesoresModal';
import RespuestasRapidasModal, { type RespuestaRapida } from '@/components/whatsapp/RespuestasRapidasModal';
import { getNextAssignedAsesor } from '@/lib/whatsappAssignment';

// Deja la grabación en un formato que acepte WhatsApp: OGG/Opus se envía tal cual; cualquier otro
// (WebM de Chrome/Edge, MP4 de Safari) se decodifica y se recodifica a MP3 mono.
// No se envía MP4 directo: Chrome lo graba con Opus y WhatsApp solo acepta MP4 con AAC (falla la entrega).
async function toWhatsAppAudio(blob: Blob): Promise<File> {
  const baseType = blob.type.split(';')[0].trim();
  if (baseType === 'audio/ogg') return new File([blob], 'Nota_de_voz.ogg', { type: 'audio/ogg' });

  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const ctx = new AudioContext();
  try {
    const audioBuffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    const samples = audioBuffer.getChannelData(0);
    const pcm = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    const encoder = new Mp3Encoder(1, audioBuffer.sampleRate, 64);
    const chunks: Uint8Array[] = [];
    const blockSize = 1152;
    for (let i = 0; i < pcm.length; i += blockSize) {
      const buf = encoder.encodeBuffer(pcm.subarray(i, i + blockSize));
      if (buf.length > 0) chunks.push(buf);
    }
    const end = encoder.flush();
    if (end.length > 0) chunks.push(end);

    return new File(chunks as BlobPart[], 'Nota_de_voz.mp3', { type: 'audio/mpeg' });
  } finally {
    ctx.close();
  }
}

export default function WhatsAppPage() {
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  // Mensaje que se está respondiendo (se envía como cita con context.message_id)
  const [replyTo, setReplyTo] = useState<any>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const MESSAGE_INPUT_MAX_HEIGHT = 200;

  // El cuadro de texto crece con el contenido (como WhatsApp) hasta un máximo y luego hace scroll
  useEffect(() => {
    const el = messageInputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MESSAGE_INPUT_MAX_HEIGHT)}px`;
    el.style.overflowY = el.scrollHeight > MESSAGE_INPUT_MAX_HEIGHT ? 'auto' : 'hidden';
  }, [messageText]);
  const [newMessageTemplate, setNewMessageTemplate] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResponsableFilter, setSelectedResponsableFilter] = useState('todos');
  const [asesoresList, setAsesoresList] = useState<string[]>(['Xime', 'Tati', 'Andrey']);
  const [isAsesoresModalOpen, setIsAsesoresModalOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [asesorFilterSearch, setAsesorFilterSearch] = useState('');
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  // Menú de opciones de un chat (tres puntos o clic derecho), en coordenadas de pantalla
  const [chatMenu, setChatMenu] = useState<{ chat: any; x: number; y: number; fromHeader?: boolean } | null>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [showContactInfo, setShowContactInfo] = useState(false);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob, url: string } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  // Segundos transcurridos de la grabación en curso (se muestra como m:ss)
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  useEffect(() => {
    if (!isRecording) return;
    setRecordingSeconds(0);
    const startedAt = Date.now();
    const timer = setInterval(() => setRecordingSeconds(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => clearInterval(timer);
  }, [isRecording]);

  // Dictado (voz a texto) con la Web Speech API del navegador (Chrome/Edge; Firefox no la soporta)
  const [dictationSupported, setDictationSupported] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const w = window as any;
    setDictationSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const stopDictation = () => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    // abort() descarta resultados pendientes para que no reaparezca texto tras enviar
    recognition?.abort();
    setIsDictating(false);
  };

  // Al cambiar de chat o salir de la página se corta el dictado
  useEffect(() => stopDictation, [activeChat?.id]);

  const startDictation = () => {
    const w = window as any;
    const SpeechRecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'es-CO';
    recognition.continuous = true;
    recognition.interimResults = true;

    // El texto dictado se agrega a lo que ya estaba escrito
    const baseText = messageText.trim() ? messageText.trimEnd() + ' ' : '';

    recognition.onresult = (event: any) => {
      if (recognitionRef.current !== recognition) return;
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      const dictated = transcript.trim();
      setMessageText(baseText + dictated.charAt(0).toUpperCase() + dictated.slice(1));
    };
    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        alert('No se pudo usar el dictado. Permite el acceso al micrófono en tu navegador.');
      } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.error('Error de dictado:', event.error);
      }
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
        setIsDictating(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsDictating(true);
    messageInputRef.current?.focus();
  };

  // Respuestas rápidas (tabla respuestas_rapidas, compartidas por todo el equipo).
  // Se abren con el botón ⚡ o escribiendo "/" al inicio del mensaje.
  const [respuestasRapidas, setRespuestasRapidas] = useState<RespuestaRapida[]>([]);
  const [isQuickPickerOpen, setIsQuickPickerOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [quickIndex, setQuickIndex] = useState(0);
  const [slashDismissed, setSlashDismissed] = useState(false);
  const [respuestasModal, setRespuestasModal] = useState<{ texto: string } | null>(null);
  const quickPickerAreaRef = useRef<HTMLDivElement>(null);
  const quickListRef = useRef<HTMLDivElement>(null);

  const fetchRespuestasRapidas = async () => {
    const { data, error } = await supabase
      .from('respuestas_rapidas')
      .select('id, nombre_respuesta, respuesta_rapida')
      .order('nombre_respuesta', { ascending: true });
    if (error) console.error('Error cargando respuestas rápidas:', error);
    if (data) setRespuestasRapidas(data);
  };

  useEffect(() => { fetchRespuestasRapidas(); }, []);

  // Modo "/": el mensaje empieza con "/" y es de una sola línea; lo que sigue filtra la lista
  const slashQuery = !slashDismissed && messageText.startsWith('/') && !messageText.includes('\n') ? messageText.slice(1) : null;
  const showQuickPicker = isQuickPickerOpen || slashQuery !== null;
  const quickQuery = (slashQuery ?? quickSearch).trim().toLowerCase();
  const quickMatches = respuestasRapidas.filter(r =>
    !quickQuery || r.nombre_respuesta.toLowerCase().includes(quickQuery) || r.respuesta_rapida.toLowerCase().includes(quickQuery)
  );

  useEffect(() => {
    if (!messageText.startsWith('/')) setSlashDismissed(false);
  }, [messageText]);

  useEffect(() => { setQuickIndex(0); }, [quickQuery, showQuickPicker]);

  useEffect(() => {
    quickListRef.current?.querySelector(`[data-quick-index="${quickIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [quickIndex]);

  // Cerrar el selector al hacer clic fuera de la zona del campo de mensaje
  useEffect(() => {
    if (!isQuickPickerOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!quickPickerAreaRef.current?.contains(e.target as Node)) setIsQuickPickerOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isQuickPickerOpen]);

  const closeQuickPicker = () => {
    setIsQuickPickerOpen(false);
    setQuickSearch('');
    if (messageText.startsWith('/')) setSlashDismissed(true);
  };

  // Pone la respuesta en el campo (no la envía) reemplazando {nombre} y {asesor}
  const applyQuickReply = (r: RespuestaRapida) => {
    const texto = r.respuesta_rapida
      // Se acepta con o sin espacios: {nombre} o { nombre }
      .replace(/\{\s*nombre\s*\}/gi, getContactName(activeChat))
      .replace(/\{\s*asesor\s*\}/gi, currentUserName || '')
      // Si una variable quedó vacía, no dejar "Hola , ..." ni espacios dobles
      .replace(/[ \t]+([,.!?;:])/g, '$1')
      .replace(/[ \t]{2,}/g, ' ');

    stopDictation();
    setMessageText(slashQuery !== null || !messageText.trim() ? texto : messageText.trimEnd() + ' ' + texto);
    setIsQuickPickerOpen(false);
    setQuickSearch('');
    setTimeout(() => {
      const el = messageInputRef.current;
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 0);
  };

  // Flechas, Enter/Tab y Esc dentro del selector; devuelve true si consumió la tecla
  const handleQuickPickerKey = (e: React.KeyboardEvent): boolean => {
    if (!showQuickPicker) return false;
    if (e.key === 'Escape') { e.preventDefault(); closeQuickPicker(); return true; }
    if (quickMatches.length === 0) return false;
    if (e.key === 'ArrowDown') { e.preventDefault(); setQuickIndex(i => (i + 1) % quickMatches.length); return true; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setQuickIndex(i => (i - 1 + quickMatches.length) % quickMatches.length); return true; }
    if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Tab') {
      e.preventDefault();
      applyQuickReply(quickMatches[Math.min(quickIndex, quickMatches.length - 1)]);
      return true;
    }
    return false;
  };

  const [sending, setSending] = useState(false);
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<any[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const scrollToBottom = () => {
    // No usar scrollIntoView: también desplaza la columna del chat y el encabezado
    // sticky termina tapando el inicio de la lista de mensajes.
    const container = messagesContainerRef.current;
    if (container) container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessagePreview = (msg: any) => {
    if (msg.text_body?.trim()) return msg.text_body;
    if (msg.media_type === 'image') return '📷 Imagen';
    if (msg.media_type === 'video') return '🎥 Video';
    if (msg.media_type === 'audio' || msg.media_type === 'voice') return '🎤 Audio';
    if (msg.media_type === 'sticker') return '💟 Sticker';
    if (msg.media_type === 'document') return `📄 ${msg.media_filename || 'Documento'}`;
    return 'Mensaje';
  };

  // Un nombre de perfil sin letras (".", emojis, "Unknown") no sirve para mostrar ni para iniciales
  const hasProfileName = (chat: any) =>
    !!chat?.contact_name && chat.contact_name !== 'Unknown' && /\p{L}/u.test(chat.contact_name);

  // Prioridad: nombre guardado por un asesor > nombre de perfil de WhatsApp > nada
  const getContactName = (chat: any): string =>
    chat?.nombre_guardado?.trim() || (hasProfileName(chat) ? chat.contact_name.trim() : '');

  const hasRealName = (chat: any) => !!getContactName(chat);

  const getDisplayName = (chat: any) => getContactName(chat) || `+${chat?.phone_number}`;

  // Iniciales de las dos primeras palabras con letras: "Martha Velandia" → "MV"
  const getInitials = (chat: any) => {
    if (!hasRealName(chat)) return '';
    const words = getContactName(chat).split(/\s+/)
      .map((w: string) => w.replace(/[^\p{L}]/gu, ''))
      .filter(Boolean);
    return words.slice(0, 2).map((w: string) => w.charAt(0).toUpperCase()).join('');
  };

  // La API de WhatsApp no entrega la foto de perfil del cliente: se usa contact_avatar solo si existe
  const renderAvatarContent = (chat: any, iconClassName: string) => {
    const initials = getInitials(chat);
    return initials || <User className={iconClassName} />;
  };

  const getSenderLabel = (msg: any) => {
    if (msg.sender === 'me') return 'Tú';
    return getDisplayName(activeChat);
  };

  const startReply = (msg: any) => {
    setReplyTo(msg);
    messageInputRef.current?.focus();
  };

  const scrollToMessage = (wamId: string) => {
    const el = document.getElementById(`wa-msg-${wamId}`);
    if (!el) return;
    const container = messagesContainerRef.current;
    if (container) {
      const cRect = container.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      const top = container.scrollTop + (eRect.top - cRect.top) - (cRect.height - eRect.height) / 2;
      container.scrollTo({ top, behavior: 'smooth' });
    }
    el.classList.add('ring-2', 'ring-indigo-300');
    setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-300'), 1500);
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

  // Close chat options menu on outside click, Escape, scroll or resize
  useEffect(() => {
    if (!chatMenu) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) setChatMenu(null);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setChatMenu(null); };
    const close = () => setChatMenu(null);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [chatMenu]);

  const openChatMenuAtButton = (e: React.MouseEvent<HTMLElement>, chat: any, fromHeader = false) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setChatMenu({ chat, x: rect.right, y: rect.bottom + 4, fromHeader });
  };

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
      setAsesoresList(data.map(a => a.nombre?.trim()).filter(Boolean));
    }
  };

  // ── Filter chats ──────────────────────────────────────────────────────────────
  const filteredChats = chats.filter((chat) => {
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = chat.contact_name?.toLowerCase().includes(q) || chat.nombre_guardado?.toLowerCase().includes(q);
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

  // ── Guardar contacto (nombre_guardado) ───────────────────────────────────────
  // Va en una columna aparte porque el webhook sobrescribe contact_name con el nombre de perfil
  const [contactEditor, setContactEditor] = useState<{ chat: any; value: string } | null>(null);
  const [savingContact, setSavingContact] = useState(false);

  const openContactEditor = (chat: any) => {
    setContactEditor({ chat, value: chat.nombre_guardado || '' });
  };

  const handleSaveContactName = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!contactEditor || savingContact) return;
    const chatId = contactEditor.chat.id;
    const value: string | null = contactEditor.value.trim() || null;
    setSavingContact(true);
    const { error } = await supabase
      .from('whatsapp_chats')
      .update({ nombre_guardado: value })
      .eq('id', chatId);
    setSavingContact(false);
    if (error) {
      console.error('Error guardando el contacto:', error);
      alert('No se pudo guardar el contacto. Intenta de nuevo.');
      return;
    }
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, nombre_guardado: value } : c));
    setActiveChat((prev: any) => prev?.id === chatId ? { ...prev, nombre_guardado: value } : prev);
    setContactEditor(null);
  };

  // Esc cierra el panel de info del contacto (si no hay otra ventana o menú abierto encima)
  useEffect(() => {
    if (!showContactInfo) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !chatMenu && !contactEditor) setShowContactInfo(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showContactInfo, chatMenu, contactEditor]);

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

  // ── Read / unread ────────────────────────────────────────────────────────────
  // Se actualiza primero el estado local para que el cambio se vea de inmediato,
  // sin esperar el refresco por realtime.
  const setChatUnread = async (chatId: string, unreadCount: number) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, unread_count: unreadCount } : c));
    const { error } = await supabase
      .from('whatsapp_chats')
      .update({ unread_count: unreadCount })
      .eq('id', chatId);
    if (error) console.error('Error actualizando leído/no leído:', error);
  };

  const markChatAsUnread = (chatId: string) => {
    // Si es el chat abierto se cierra; si no, se volvería a marcar como leído al verlo
    if (activeChat?.id === chatId) setActiveChat(null);
    setChatUnread(chatId, 1);
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

    // Respaldo de la lista de chats si realtime no entrega eventos
    const refreshChats = () => { if (!document.hidden) fetchChats(); };
    const chatsInterval = setInterval(refreshChats, 10000);
    document.addEventListener('visibilitychange', refreshChats);

    return () => {
      supabase.removeChannel(chatSub);
      supabase.removeChannel(asesoresSub);
      clearInterval(chatsInterval);
      document.removeEventListener('visibilitychange', refreshChats);
    };
  }, []);

  // ── Message subscription when active chat changes ────────────────────────────
  useEffect(() => {
    if (!activeChat) return;

    setReplyTo(null);
    fetchMessages(activeChat.id);

    // Al abrir el chat sus mensajes quedan leídos
    if (activeChat.unread_count > 0) {
      setChatUnread(activeChat.id, 0);
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
          // Un mensaje que llega con el chat abierto ya se está viendo
          if (payload.new.sender === 'them') {
            setChatUnread(activeChat.id, 0);
          }
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

    // Respaldo por si realtime no entrega eventos (conexión caída, pestaña en segundo plano):
    // se consulta el chat abierto cada pocos segundos y se fusiona con lo que hay en pantalla.
    const chatId = activeChat.id;
    const pollMessages = async () => {
      if (document.hidden) return;
      const { data } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      if (!data) return;
      const prev = messagesRef.current;
      const prevIds = new Set(prev.map(m => m.id));
      const added = data.filter(m => !prevIds.has(m.id));
      const changed = added.length > 0 || data.some(m => {
        const local = prev.find(p => p.id === m.id);
        return local && (local.status !== m.status || local.wam_id !== m.wam_id);
      });
      if (!changed) return;
      setMessages(current => {
        // Se conservan los mensajes optimistas que el servidor aún no ha guardado
        const serverIds = new Set(data.map(m => m.id));
        return [...data, ...current.filter(m => !serverIds.has(m.id))];
      });
      if (added.length > 0) setTimeout(scrollToBottom, 100);
      if (added.some(m => m.sender === 'them')) setChatUnread(chatId, 0);
    };
    const pollInterval = setInterval(pollMessages, 5000);
    document.addEventListener('visibilitychange', pollMessages);

    return () => {
      supabase.removeChannel(msgSub);
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', pollMessages);
    };
  }, [activeChat?.id]);

  // ── Send text message ────────────────────────────────────────────────────────
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim() || !activeChat || sending || isRecording) return;

    stopDictation();
    const text = messageText.trim();
    const replyToWamId: string | null = replyTo?.wam_id || null;
    setMessageText('');
    setReplyTo(null);

    // Optimistic update
    const msgId = crypto.randomUUID();
    const optimisticMsg = {
      id: msgId,
      chat_id: activeChat.id,
      text_body: text,
      sender: 'me',
      status: 'sent',
      created_at: new Date().toISOString(),
      reply_to_wam_id: replyToWamId,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);

    setSending(true);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: activeChat.id, text_body: text, id: msgId, reply_to_wam_id: replyToWamId }),
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
          // Rol MAC: la conversación que abre queda asignada a esa persona
          responsable: currentUser?.rol === 'mac' ? currentUserName : null,
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
  // WhatsApp Cloud API solo acepta audio AAC, AMR, MP3, MP4 u OGG/Opus (no WebM).
  // Se graba en OGG/Opus si el navegador lo soporta (Firefox); si no (Chrome/Edge graban WebM),
  // se convierte a MP3 antes de enviar.
  const startRecording = async () => {
    stopDictation();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? new MediaRecorder(stream, { mimeType: 'audio/ogg;codecs=opus' })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
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

    const msgId = crypto.randomUUID();
    const optimisticMsg = {
      id: msgId,
      chat_id: activeChat.id,
      text_body: 'Audio',
      sender: 'me',
      status: 'sending...',
      created_at: new Date().toISOString(),
      media_url: recordedAudio.url,
      media_type: 'audio',
      media_mime_type: recordedAudio.blob.type,
      media_filename: 'Nota_de_voz'
    };

    setMessages(prev => [...prev, optimisticMsg]);
    const audioBlob = recordedAudio.blob;
    setRecordedAudio(null);
    setTimeout(scrollToBottom, 50);

    let file: File;
    try {
      file = await toWhatsAppAudio(audioBlob);
    } catch (err) {
      console.error('Error convirtiendo la nota de voz:', err);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      alert('No se pudo procesar la nota de voz. Intenta de nuevo.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('chat_id', activeChat.id);
    formData.append('id', msgId);

    try {
      const res = await fetch('/api/whatsapp/send-media', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.details?.error?.message || data?.error || 'Error enviando audio');
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      alert('Error enviando la nota de voz: ' + err.message);
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
                onContextMenu={(e) => {
                  e.preventDefault();
                  setChatMenu({ chat, x: e.clientX, y: e.clientY });
                }}
                className={`group flex items-center p-3 cursor-pointer rounded-2xl transition-all ${activeChat?.id === chat.id ? 'bg-white shadow-md border border-white/80' : 'hover:bg-white/50 border border-transparent'}`}
              >
                <div className="flex flex-col items-center shrink-0 mr-3 w-16">
                  <div className="relative">
                    {chat.contact_avatar ? (
                      <img src={chat.contact_avatar} alt="Avatar" className="w-11 h-11 rounded-full object-cover shadow-sm" />
                    ) : (
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${activeChat?.id === chat.id ? 'bg-gradient-to-br from-indigo-500 to-blue-600' : 'bg-gradient-to-br from-slate-300 to-slate-400'}`}>
                        {renderAvatarContent(chat, 'w-5 h-5')}
                      </div>
                    )}
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
                      {Array.from(new Set([...asesoresList, ...(chat.responsable ? [chat.responsable] : [])])).map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h3 className="font-semibold text-sm text-slate-800 truncate">
                      {getDisplayName(chat)}
                    </h3>
                    <span className={`text-[10px] font-medium shrink-0 ml-2 ${chat.unread_count > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {formatTime(chat.last_message_time)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-500 truncate pr-2">{chat.last_message || 'Multimedia'}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => openChatMenuAtButton(e, chat)}
                        className={`p-1 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-opacity ${chatMenu?.chat.id === chat.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        title="Más opciones"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {chat.unread_count > 0 && (
                        <span className="bg-emerald-500 rounded-full px-1.5 py-0.5 text-white text-[10px] font-bold">{chat.unread_count}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Main Chat Area & Info Panel ── */}
      <div className="flex-1 flex min-w-0 min-h-0 h-full">
        {activeChat ? (
          <>
          {/* Main Chat Column */}
          {/* overflow-clip (no hidden): recorta igual pero el navegador no puede desplazar esta columna */}
          <div className="flex-1 h-full flex flex-col min-h-0 bg-white/80 backdrop-blur-xl overflow-clip relative">

            {/* Glow effects */}
            <div className="pointer-events-none absolute top-0 left-0 w-64 h-64 bg-indigo-300/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
            <div className="pointer-events-none absolute bottom-0 right-0 w-64 h-64 bg-emerald-300/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>

            {/* Chat header - Always fixed at the top */}
            <div 
              className="shrink-0 h-[72px] bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center px-6 justify-between z-30 shadow-sm transition-colors sticky top-0 cursor-pointer hover:bg-slate-50/80"
              onClick={() => setShowContactInfo(!showContactInfo)}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative shrink-0">
                  {activeChat.contact_avatar ? (
                     <img src={activeChat.contact_avatar} alt="Avatar" className="w-11 h-11 rounded-full object-cover shadow-sm border border-slate-200" />
                  ) : (
                    <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm text-base">
                      {renderAvatarContent(activeChat, 'w-5 h-5')}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-xs"></span>
                </div>
                <div className="flex flex-col min-w-0">
                  <h2 className="font-bold text-slate-900 text-[16px] leading-tight truncate">
                    {getDisplayName(activeChat)}
                  </h2>
                  <div className="flex items-center gap-2 text-xs leading-tight mt-0.5">
                    {hasRealName(activeChat) && (
                      <span className="text-slate-500 font-medium">+{activeChat.phone_number}</span>
                    )}
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      En línea
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
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
                      {Array.from(new Set([...asesoresList, ...(activeChat.responsable ? [activeChat.responsable] : [])])).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => setShowContactInfo(!showContactInfo)}
                  className="p-2 bg-white hover:bg-slate-50 rounded-full transition-all border border-slate-200 text-slate-600 shadow-xs"
                  title="Ver información del contacto"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => openChatMenuAtButton(e, activeChat, true)}
                  className="p-2 bg-white hover:bg-slate-50 rounded-full transition-all border border-slate-200 text-slate-600 shadow-xs"
                  title="Más opciones"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            {/* Bloque normal (no flex) para que los mensajes no se encojan y se vean completos al subir */}
            <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-2">
              {messages.map((msg) => {
                const isMe = msg.sender === 'me';
                const hasMedia = !!msg.media_url;
                const isImage = msg.media_type === 'image' || msg.media_type === 'sticker';
                const isAudio = msg.media_type === 'audio' || msg.media_type === 'voice' || (msg.media_type === 'document' && (msg.media_filename?.endsWith('.webm') || msg.media_mime_type?.includes('audio') || msg.media_mime_type?.includes('ogg')));
                const isVideo = msg.media_type === 'video';
                const isDoc = msg.media_type === 'document' && !isAudio;
                const isDefaultLabel = !msg.text_body || ['Imagen','Audio','Video','Documento','Nota de voz','📷 Imagen','🎤 Mensaje de voz','🎵 Audio','🎥 Video','💟 Sticker','📄 Documento'].includes(msg.text_body.trim());
                const quotedMsg = msg.reply_to_wam_id ? messages.find(m => m.wam_id === msg.reply_to_wam_id) : null;

                return (
                  <div key={msg.id} className={`group flex w-full shrink-0 items-center gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {/* Solo se puede citar un mensaje que ya tiene id de WhatsApp */}
                    {isMe && msg.wam_id && (
                      <button
                        type="button"
                        onClick={() => startReply(msg)}
                        className="p-1.5 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Responder"
                      >
                        <Reply className="w-4 h-4" />
                      </button>
                    )}
                    <div
                      id={msg.wam_id ? `wa-msg-${msg.wam_id}` : undefined}
                      className={`max-w-[75%] rounded-2xl shadow-sm overflow-hidden transition-shadow ${isMe
                      ? 'bg-indigo-50 border border-indigo-100 text-slate-800 rounded-tr-sm'
                      : 'bg-white text-slate-800 border border-gray-100 rounded-tl-sm'
                    }`}>
                      {/* Mensaje citado */}
                      {msg.reply_to_wam_id && (
                        <button
                          type="button"
                          onClick={() => scrollToMessage(msg.reply_to_wam_id)}
                          className={`block w-[calc(100%-1rem)] text-left mx-2 mt-2 px-3 py-1.5 rounded-lg border-l-4 border-indigo-400 ${isMe ? 'bg-indigo-100/70' : 'bg-slate-100'}`}
                        >
                          <p className="text-[11px] font-bold text-indigo-600">{quotedMsg ? getSenderLabel(quotedMsg) : 'Mensaje citado'}</p>
                          <p className="text-[12px] text-slate-600 line-clamp-2 whitespace-pre-wrap break-words">
                            {quotedMsg ? getMessagePreview(quotedMsg) : 'Mensaje no disponible'}
                          </p>
                        </button>
                      )}
                      {/* Image or Sticker */}
                      {hasMedia && isImage && (
                        <div className="overflow-hidden rounded-t-2xl bg-black/5">
                          <img
                            src={msg.media_url}
                            alt="Imagen"
                            className="w-full max-w-[320px] max-h-[380px] object-cover cursor-pointer hover:opacity-95 transition-opacity"
                            onClick={() => window.open(msg.media_url, '_blank')}
                          />
                        </div>
                      )}
                      {/* Audio or Voice Note */}
                      {hasMedia && isAudio && (
                        <div className="px-3 pt-3 pb-1 flex items-center gap-2">
                          <audio controls preload="metadata" src={msg.media_url} className="w-[260px] sm:w-[300px] h-[40px] outline-none" />
                        </div>
                      )}
                      {/* Video */}
                      {hasMedia && isVideo && (
                        <div className="overflow-hidden rounded-t-2xl bg-black/5">
                          <video controls src={msg.media_url} className="w-full max-w-[320px] rounded-t-2xl" />
                        </div>
                      )}
                      {/* Document */}
                      {hasMedia && isDoc && (
                        <a href={msg.media_url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-3 px-4 pt-3 pb-1 hover:underline text-indigo-600 group">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">📄</div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-semibold truncate text-slate-800 group-hover:text-indigo-600">{msg.media_filename || 'Documento'}</p>
                            <span className="text-[11px] text-slate-400">Descargar archivo</span>
                          </div>
                        </a>
                      )}
                      {/* Text body */}
                      {((!hasMedia && msg.text_body) || (hasMedia && !isDefaultLabel)) && (
                        <div className="px-4 py-2">
                          <p className="text-[14px] font-medium leading-relaxed whitespace-pre-wrap break-words text-slate-800">
                            {msg.text_body}
                          </p>
                        </div>
                      )}
                      {/* Message Footer / Timestamp */}
                      <div className="px-3 pb-1.5 flex items-center justify-end gap-1 text-slate-400">
                        <span className="text-[10px] font-medium">{formatTime(msg.created_at)}</span>
                        {isMe && <CheckCheck className={`w-3.5 h-3.5 ${msg.status === 'read' ? 'text-blue-500' : 'text-slate-400'}`} />}
                      </div>
                    </div>
                    {!isMe && msg.wam_id && (
                      <button
                        type="button"
                        onClick={() => startReply(msg)}
                        className="p-1.5 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Responder"
                      >
                        <Reply className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Input — shrink-0 keeps it at the bottom always */}
            <div ref={quickPickerAreaRef} className="relative shrink-0 px-4 py-3 bg-white/60 border-t border-gray-100 z-10">
              {showQuickPicker && !recordedAudio && !isRecording && (
                <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col max-h-[340px]">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-indigo-50/40 shrink-0">
                    <Zap className="w-4 h-4 text-indigo-500 shrink-0" />
                    {slashQuery !== null ? (
                      <span className="flex-1 text-xs font-semibold text-slate-500">
                        Respuestas rápidas <span className="font-normal text-slate-400">· ↑↓ para elegir, Enter para usar, Esc para cerrar</span>
                      </span>
                    ) : (
                      <input
                        autoFocus
                        type="text"
                        value={quickSearch}
                        onChange={(e) => setQuickSearch(e.target.value)}
                        onKeyDown={(e) => { handleQuickPickerKey(e); }}
                        placeholder="Buscar respuesta rápida..."
                        className="flex-1 min-w-0 bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
                      />
                    )}
                    <button type="button" onClick={closeQuickPicker} className="p-1 text-slate-400 hover:text-slate-600 rounded-full" title="Cerrar">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div ref={quickListRef} className="overflow-y-auto">
                    {quickMatches.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-6 text-center">
                        {respuestasRapidas.length === 0 ? 'Aún no hay respuestas rápidas guardadas.' : 'Ninguna respuesta coincide.'}
                      </p>
                    ) : (
                      quickMatches.map((r, i) => (
                        <button
                          key={r.id}
                          type="button"
                          data-quick-index={i}
                          onMouseEnter={() => setQuickIndex(i)}
                          onClick={() => applyQuickReply(r)}
                          className={`w-full text-left px-4 py-2.5 border-b border-gray-50 last:border-b-0 transition-colors ${i === quickIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                        >
                          <span className="block text-xs font-bold text-indigo-600">/{r.nombre_respuesta}</span>
                          <span className="block text-[13px] text-slate-600 line-clamp-2 whitespace-pre-wrap">{r.respuesta_rapida}</span>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-100 bg-slate-50/60 shrink-0">
                    <button
                      type="button"
                      onClick={() => { closeQuickPicker(); setRespuestasModal({ texto: '' }); }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      Gestionar respuestas
                    </button>
                    {slashQuery === null && messageText.trim() && (
                      <button
                        type="button"
                        onClick={() => { closeQuickPicker(); setRespuestasModal({ texto: messageText.trim() }); }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        Guardar mensaje actual
                      </button>
                    )}
                  </div>
                </div>
              )}
              {replyTo && !recordedAudio && (
                <div className="flex items-center gap-2 mb-2 bg-white rounded-xl border border-gray-200 px-3 py-2 shadow-sm">
                  <Reply className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div className="flex-1 min-w-0 border-l-4 border-indigo-400 pl-3">
                    <p className="text-[11px] font-bold text-indigo-600">Respondiendo a {getSenderLabel(replyTo)}</p>
                    <p className="text-[12px] text-slate-600 truncate">{getMessagePreview(replyTo)}</p>
                  </div>
                  <button type="button" onClick={() => setReplyTo(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full" title="Cancelar respuesta">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-end gap-2 bg-white rounded-2xl border border-gray-200 px-3 py-2 shadow-sm focus-within:border-indigo-300 transition-colors">
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
                    {dictationSupported && !isRecording && (
                      <button
                        type="button"
                        onClick={isDictating ? stopDictation : startDictation}
                        className={`p-1.5 rounded-full transition-colors ${isDictating ? 'text-red-500 bg-red-50 animate-pulse' : 'text-slate-400 hover:text-indigo-500'}`}
                        title={isDictating ? 'Detener dictado' : 'Dictar mensaje (voz a texto)'}
                      >
                        <AudioLines className="w-5 h-5" />
                      </button>
                    )}
                    {!isRecording && (
                      <button
                        type="button"
                        onClick={() => (isQuickPickerOpen ? closeQuickPicker() : setIsQuickPickerOpen(true))}
                        className={`p-1.5 rounded-full transition-colors ${isQuickPickerOpen ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-500'}`}
                        title="Respuestas rápidas (o escribe / en el mensaje)"
                      >
                        <Zap className="w-5 h-5" />
                      </button>
                    )}

                    {isRecording ? (
                      <div className="flex-1 flex items-center justify-between gap-3 px-3 text-red-500 bg-red-50 rounded-xl py-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                          <span className="text-sm font-medium">Grabando...</span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">
                          {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}
                        </span>
                      </div>
                    ) : (
                      <textarea
                        ref={messageInputRef}
                        rows={1}
                        value={messageText}
                        onKeyDown={(e) => {
                          if (handleQuickPickerKey(e)) return;
                          if (e.key === 'Escape') setReplyTo(null);
                          // Enter envía; Shift+Enter agrega un salto de línea
                          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder={isDictating ? 'Escuchando... habla ahora' : 'Escribe un mensaje...'}
                        className="flex-1 min-w-0 bg-transparent outline-none resize-none text-slate-700 placeholder:text-slate-400 text-[15px] leading-6 py-1 max-h-[200px] overflow-hidden"
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

          {/* ── Contact Info Sidebar ── */}
          {showContactInfo && (
            <div className="w-[340px] h-full shrink-0 bg-[#0b141a] text-gray-200 overflow-y-auto overflow-x-hidden flex flex-col border-l border-white/10 shadow-xl transition-all duration-300 animate-in slide-in-from-right-8">
              {/* Sidebar Header: sticky para que el botón de cerrar siempre esté visible */}
              <div className="sticky top-0 z-10 h-[72px] shrink-0 flex items-center justify-between px-4 border-b border-white/10 bg-[#202c33]">
                <div className="flex items-center min-w-0">
                  <button onClick={() => setShowContactInfo(false)} className="mr-3 hover:bg-white/10 p-2 rounded-full transition-colors" title="Cerrar">
                    <X className="w-5 h-5 text-gray-300" />
                  </button>
                  <h2 className="text-[15px] font-medium text-gray-100 truncate">Info. del contacto</h2>
                </div>
                <button
                  onClick={() => setShowContactInfo(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-200 bg-white/10 hover:bg-white/20 rounded-lg transition-colors shrink-0"
                >
                  Cerrar
                </button>
              </div>
              
              {/* Profile Details */}
              <div className="flex flex-col items-center pt-8 pb-6 bg-[#111b21] border-b border-white/10">
                {activeChat.contact_avatar ? (
                    <img src={activeChat.contact_avatar} alt="Avatar" className="w-48 h-48 rounded-full object-cover shadow-2xl mb-5 border-4 border-[#202c33]" />
                ) : (
                    <div className="w-48 h-48 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-2xl text-6xl mb-5 border-4 border-[#202c33]">
                    {renderAvatarContent(activeChat, 'w-20 h-20')}
                    </div>
                )}
                <h2 className="text-2xl font-normal text-gray-100 mb-1 px-4 text-center">
                  {getDisplayName(activeChat)}
                </h2>
                {hasRealName(activeChat) && (
                  <p className="text-[15px] text-gray-300 mb-1">+{activeChat.phone_number}</p>
                )}
                <p className="text-[15px] text-gray-400 mb-6">
                  {hasProfileName(activeChat) ? `~${activeChat.contact_name.trim()}` : ''}
                </p>
                
                {/* Action Buttons (4 × 72px + gaps caben en los 340px del panel) */}
                <div className="flex items-center justify-center gap-1 px-2 w-full">
                  <button className="flex flex-col items-center gap-2 hover:bg-[#202c33] p-3 rounded-2xl w-[72px] transition-colors">
                    <Phone className="w-6 h-6 text-emerald-500" />
                    <span className="text-[11px] font-medium">Llamar</span>
                  </button>
                  <button className="flex flex-col items-center gap-2 hover:bg-[#202c33] p-3 rounded-2xl w-[72px] transition-colors">
                    <Video className="w-6 h-6 text-emerald-500" />
                    <span className="text-[11px] font-medium">Video</span>
                  </button>
                  <button
                    onClick={() => openContactEditor(activeChat)}
                    className="flex flex-col items-center gap-2 hover:bg-[#202c33] p-3 rounded-2xl w-[72px] transition-colors"
                    title={activeChat.nombre_guardado ? 'Editar contacto' : 'Guardar contacto'}
                  >
                    {activeChat.nombre_guardado ? <Edit2 className="w-6 h-6 text-emerald-500" /> : <UserPlus className="w-6 h-6 text-emerald-500" />}
                    <span className="text-[11px] font-medium">{activeChat.nombre_guardado ? 'Editar' : 'Guardar'}</span>
                  </button>
                  <button className="flex flex-col items-center gap-2 hover:bg-[#202c33] p-3 rounded-2xl w-[72px] transition-colors">
                    <Search className="w-6 h-6 text-emerald-500" />
                    <span className="text-[11px] font-medium">Buscar</span>
                  </button>
                </div>
              </div>

              {/* Notes Section */}
              <div className="p-4 bg-[#111b21] border-b border-white/10 mt-2 hover:bg-[#202c33] cursor-pointer transition-colors flex justify-between items-center">
                <span className="text-emerald-500 text-[15px]">Añade notas sobre tu cliente</span>
                <Edit2 className="w-5 h-5 text-gray-400" />
              </div>

              {/* Media Section */}
              <div className="p-4 bg-[#111b21] border-b border-white/10 mt-2 cursor-pointer transition-colors">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-300 text-[14px]">Archivos, enlaces y documentos</span>
                  <span className="text-gray-400 text-[14px]">0</span>
                </div>
              </div>
              
              {/* Starred Messages */}
              <div className="p-4 bg-[#111b21] border-b border-white/10 mt-2 hover:bg-[#202c33] cursor-pointer transition-colors flex items-center gap-4">
                <Star className="w-5 h-5 text-gray-400" />
                <span className="text-gray-300 text-[15px]">Mensajes destacados</span>
              </div>
            </div>
          )}
          </>
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

      {/* ── Chat options menu (tres puntos / clic derecho) ── */}
      {chatMenu && (() => {
        const menuChat = chats.find(c => c.id === chatMenu.chat.id) || chatMenu.chat;
        const isUnread = menuChat.unread_count > 0;
        const menuWidth = 220;
        // Se alinea a la derecha del punto y se mantiene dentro de la ventana
        const left = Math.max(8, Math.min(chatMenu.x - (chatMenu.fromHeader ? menuWidth : 0), window.innerWidth - menuWidth - 8));
        const top = Math.min(chatMenu.y, window.innerHeight - 180);
        return (
          <div
            ref={chatMenuRef}
            style={{ left, top, width: menuWidth }}
            className="fixed z-50 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 animate-in fade-in zoom-in-95 duration-100"
            onContextMenu={(e) => e.preventDefault()}
          >
            <button
              type="button"
              onClick={() => {
                if (isUnread) setChatUnread(menuChat.id, 0);
                else markChatAsUnread(menuChat.id);
                setChatMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {isUnread ? <MailOpen className="w-4 h-4 text-indigo-500" /> : <Mail className="w-4 h-4 text-indigo-500" />}
              {isUnread ? 'Marcar como leído' : 'Marcar como no leído'}
            </button>
            <button
              type="button"
              onClick={() => {
                openContactEditor(menuChat);
                setChatMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {menuChat.nombre_guardado ? <Edit2 className="w-4 h-4 text-indigo-500" /> : <UserPlus className="w-4 h-4 text-indigo-500" />}
              {menuChat.nombre_guardado ? 'Editar contacto' : 'Guardar contacto'}
            </button>
            {chatMenu.fromHeader && (
              <button
                type="button"
                onClick={() => {
                  setShowContactInfo(true);
                  setChatMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <UserCheck className="w-4 h-4 text-indigo-500" />
                Info. del contacto
              </button>
            )}
          </div>
        );
      })()}

      {/* ── Guardar / editar contacto ── */}
      {contactEditor && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setContactEditor(null); }}
        >
          <form onSubmit={handleSaveContactName} className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {contactEditor.chat.nombre_guardado ? 'Editar contacto' : 'Guardar contacto'}
              </h3>
              <button type="button" onClick={() => setContactEditor(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-1">Número</p>
            <p className="text-sm font-semibold text-slate-800 mb-4">+{contactEditor.chat.phone_number}</p>
            {hasProfileName(contactEditor.chat) && (
              <>
                <p className="text-sm text-slate-500 mb-1">Nombre en WhatsApp</p>
                <p className="text-sm text-slate-700 mb-4">~{contactEditor.chat.contact_name.trim()}</p>
              </>
            )}
            <label className="block text-sm text-slate-500 mb-1" htmlFor="nombre-guardado">Nombre del contacto</label>
            <input
              id="nombre-guardado"
              autoFocus
              value={contactEditor.value}
              onChange={(e) => setContactEditor(prev => prev ? { ...prev, value: e.target.value } : prev)}
              onKeyDown={(e) => { if (e.key === 'Escape') setContactEditor(null); }}
              placeholder="Ej: Carlos Pérez – Obra Bogotá"
              maxLength={80}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 outline-none focus:border-indigo-300 focus:bg-white transition-colors"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">Déjalo vacío y guarda para quitar el nombre guardado.</p>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={() => setContactEditor(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={savingContact} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {savingContact ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <NewMessageModal
        isOpen={isNewMessageModalOpen}
        onClose={() => setIsNewMessageModalOpen(false)}
        onSubmit={handleSendTemplate}
      />

      <RespuestasRapidasModal
        isOpen={respuestasModal !== null}
        initialTexto={respuestasModal?.texto}
        onClose={() => setRespuestasModal(null)}
        onChanged={fetchRespuestasRapidas}
      />

      <AsesoresModal
        isOpen={isAsesoresModalOpen}
        onClose={() => setIsAsesoresModalOpen(false)}
        onAsesoresChanged={fetchAsesores}
      />
    </div>
  );
}
