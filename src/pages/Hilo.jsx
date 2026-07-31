import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Send, Loader2, MessageSquare, Trash2, Search, ArrowLeft, Tag, Check, X as XIcon } from 'lucide-react';
import { format } from 'date-fns';
import { goBack } from '@/lib/navigation';
import { useMediaQuery } from '@/lib/useMediaQuery';

const MESSAGES_PAGE_SIZE = 50;

// Cuerpo de una conversación (cabecera + tarjeta de contexto + mensajes + input). Se
// reutiliza tal cual tanto en la pantalla completa de móvil como en la columna derecha de
// escritorio — solo cambia si se muestra el botón de volver (showBackButton/onBack) y el
// contenedor que lo envuelve (cada caller decide su propio posicionamiento).
function ConversationPanel({
  activeChat,
  contextListing,
  messages,
  loadingMessages,
  hasMoreMessages,
  loadingOlderMessages,
  loadOlderMessages,
  myEmail,
  navigate,
  handleDeleteMessage,
  handleAcceptOffer,
  handleRejectOffer,
  newMessage,
  setNewMessage,
  handleSendMessage,
  messagesEndRef,
  showBackButton,
  onBack,
  showExternalBack,
  onExternalBack,
}) {
  return (
    <>
      <div className="h-16 border-b border-border flex items-center gap-2 bg-muted/5 z-10 px-3 flex-shrink-0 select-none">
        {showBackButton && (
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors mr-1 flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        {showExternalBack && (
          <button
            onClick={onExternalBack}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-muted text-xs font-medium text-muted-foreground hover:text-primary transition-colors mr-1 flex-shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver
          </button>
        )}

        <div
          onClick={() => {
            if (activeChat.otherUser.isSchool) {
              navigate(`/colegios/${activeChat.otherUser.id}`);
            } else if (activeChat.otherUser.isCompany) {
              navigate(`/empresas/${activeChat.otherUser.id}`);
            } else {
              navigate(`/usuario/${activeChat.otherUser.id}`);
            }
          }}
          className="flex items-center gap-2 cursor-pointer min-w-0 flex-1"
        >
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden border border-border flex-shrink-0">
            {activeChat.otherUser.avatar_url ? (
              <img src={activeChat.otherUser.avatar_url} className="w-full h-full object-cover" alt="" />
            ) : (
              <span className="text-primary font-semibold text-xs">{activeChat.otherUser.display_name?.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <h3 className="text-sm font-bold text-foreground truncate">{activeChat.otherUser.display_name}</h3>
            <p className="text-[10px] text-muted-foreground truncate">Ver perfil ↗</p>
          </div>
        </div>
      </div>

      {contextListing && (
        <button
          onClick={() => navigate(`/anuncios/${contextListing.id}`)}
          className="flex items-center gap-2.5 p-2.5 border-b border-border bg-muted/20 hover:bg-muted/40 transition-colors text-left flex-shrink-0"
        >
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted border border-border flex-shrink-0 flex items-center justify-center">
            {contextListing.image_urls?.[0] ? (
              <img src={contextListing.image_urls[0]} className="w-full h-full object-cover" alt="" />
            ) : (
              <Tag className="w-4 h-4 text-muted-foreground/40" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">{contextListing.title}</p>
            {contextListing.price != null && (
              <p className="text-xs font-semibold text-primary">{contextListing.price} €</p>
            )}
          </div>
        </button>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5 no-scrollbar">
        {loadingMessages ? (
          <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-primary w-5 h-5" /></div>
        ) : (
          <>
          {hasMoreMessages && (
            <div className="flex justify-center pb-2">
              <button
                onClick={loadOlderMessages}
                disabled={loadingOlderMessages}
                className="text-[10px] font-medium text-primary hover:opacity-80 disabled:opacity-40 transition-opacity px-3 py-1.5"
              >
                {loadingOlderMessages ? 'Cargando...' : 'Cargar mensajes anteriores'}
              </button>
            </div>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender_email === myEmail;

            if (msg.message_type === 'offer') {
              const statusStyles = {
                pendiente: 'bg-primary/5 border-primary/20',
                aceptada: 'bg-emerald-500/10 border-emerald-500/30',
                rechazada: 'bg-muted border-border opacity-60',
              };
              const statusLabels = { pendiente: 'Pendiente', aceptada: 'Aceptada', rechazada: 'Rechazada' };
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-xs shadow-sm border ${statusStyles[msg.offer_status] || statusStyles.pendiente}`}>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Oferta</p>
                    <p className="text-lg font-bold text-foreground">{Number(msg.offer_amount).toFixed(2)} €</p>
                    <p className="text-[10px] mt-1 font-medium text-muted-foreground">{statusLabels[msg.offer_status] || msg.offer_status}</p>
                    {!isMe && msg.offer_status === 'pendiente' && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleAcceptOffer(msg)}
                          className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-lg py-1.5 text-[11px] font-semibold hover:bg-primary/90 transition-colors"
                        >
                          <Check className="w-3 h-3" /> Aceptar
                        </button>
                        <button
                          onClick={() => handleRejectOffer(msg)}
                          className="flex-1 flex items-center justify-center gap-1 bg-muted text-foreground rounded-lg py-1.5 text-[11px] font-semibold hover:bg-muted/70 transition-colors"
                        >
                          <XIcon className="w-3 h-3" /> Rechazar
                        </button>
                      </div>
                    )}
                    <span className="text-[9px] block text-right mt-1.5 opacity-70 text-muted-foreground">
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex items-center gap-2 group ${isMe ? 'justify-end' : 'justify-start'}`}>
                {isMe && (
                  <button onClick={() => handleDeleteMessage(msg.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-0.5 transition-opacity">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs shadow-sm ${
                  isMe ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted/70 text-foreground rounded-tl-none border border-border/40'
                }`}>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <span className={`text-[9px] block text-right mt-1 opacity-70 ${isMe ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {format(new Date(msg.created_at), 'HH:mm')}
                  </span>
                </div>
              </div>
            );
          })}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="h-[73px] p-4 border-t border-border flex gap-2 bg-card z-10 flex-shrink-0">
        <input
          type="text"
          placeholder="Escribe un mensaje..."
          className="flex-1 bg-muted/40 border border-border/60 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button type="submit" disabled={!newMessage.trim()} className="bg-primary text-primary-foreground p-2.5 rounded-xl hover:opacity-90 disabled:opacity-40 transition-all shadow-sm">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </>
  );
}

export default function Hilo() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { chatId } = useParams();
  const [activeChat, setActiveChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const messagesEndRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextListing, setContextListing] = useState(null);
  // Distingue si el chat activo se abrió por navegación externa (p.ej. desde el flujo de
  // compra, con navigate('/hilo', {state:{activeChatId}})) o por click en la lista interna
  // de chats — solo en el primer caso "volver atrás" (móvil) debe navegar fuera de /hilo.
  const [chatOpenedFromNav, setChatOpenedFromNav] = useState(false);

  const myEmail = user?.email?.toLowerCase().trim() || '';
  // Decide en cuál de los dos huecos (móvil o escritorio) se monta ConversationPanel — solo
  // uno a la vez, para no tener dos instancias compartiendo el mismo messagesEndRef.
  const isDesktop = useMediaQuery('(min-width: 768px)');

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  // 1. CARGA MASIVA Y CRUCE RELACIONAL DE PERFILES (una sola vez por sesión de usuario;
  // cambiar de hilo activo no repite esta carga, ver efecto 1.5 más abajo).
  useEffect(() => {
    if (!myEmail) return;
    const loadChats = async () => {
      setLoadingChats(true);
      try {
        // A. Traemos todos los hilos de conversación del usuario
        const { data: chatsData, error: chatsError } = await supabase
          .from('chats')
          .select('*')
          .or(`user_1_email.eq.${myEmail},user_2_email.eq.${myEmail}`)
          .order('last_message_at', { ascending: false });

        if (chatsError) throw chatsError;
        if (!chatsData || chatsData.length === 0) {
          setChats([]);
          setLoadingChats(false);
          return;
        }

        // B. CARGA EN PARALELO DE DICCIONARIOS (Evita saturar la base de datos en bucles)
        const [schoolsRes, companiesRes, profilesRes] = await Promise.all([
          supabase.from('school_profiles').select('*'),
          supabase.from('company_profiles').select('*'),
          supabase.from('profiles').select('*')
        ]);

        // Avisos de diagnóstico en consola por si las políticas RLS bloquean la lectura
        if (schoolsRes.error) console.error("Error RLS en colegios:", schoolsRes.error);
        if (companiesRes.error) console.error("Error RLS en empresas:", companiesRes.error);

        // Mapeamos los datos en objetos indexados para cruzar al instante
        const schoolsMap = {};
        (schoolsRes.data || []).forEach(s => {
          if (s.school_email) {
            const cleanEmail = s.school_email.toLowerCase().trim();
            schoolsMap[cleanEmail] = s;
            // 💡 Guardamos también la primera parte del correo para evitar errores de dominio cruzado
            schoolsMap[cleanEmail.split('@')[0]] = s;
          }
        });

        const companiesMap = {};
        (companiesRes.data || []).forEach(c => {
          if (c.company_email) {
            const cleanEmail = c.company_email.toLowerCase().trim();
            companiesMap[cleanEmail] = c;
            // 💡 CRUCIAL: Indexamos por la primera parte (ej: "startupcircle.grupo") para enlazar chats antiguos
            companiesMap[cleanEmail.split('@')[0]] = c;
          }
          if (c.id) companiesMap[c.id] = c; // Doble indexación por ID de respaldo
        });

        const profilesMap = {};
        (profilesRes.data || []).forEach(p => {
          if (p.user_email) profilesMap[p.user_email.toLowerCase().trim()] = p;
        });

        // Contador de mensajes no leídos: una sola consulta agrupada en vez de
        // una consulta por cada chat (evita N+1 round trips a la base de datos)
        const chatIds = chatsData.map(c => c.id);
        const { data: unreadRows } = await supabase
          .from('chat_messages')
          .select('chat_id')
          .in('chat_id', chatIds)
          .eq('is_read', false)
          .not('sender_email', 'eq', myEmail);

        const unreadCounts = {};
        (unreadRows || []).forEach(r => {
          unreadCounts[r.chat_id] = (unreadCounts[r.chat_id] || 0) + 1;
        });

        // Último mensaje por chat (una sola consulta, ordenada, quedándonos con la primera
        // fila que veamos de cada chat_id) — usado para la vista previa de la columna de
        // escritorio. Limitado a los 200 mensajes más recientes en total: de sobra para
        // cubrir el último mensaje de cada hilo sin traer el historial completo.
        const { data: lastMessagesRows } = await supabase
          .from('chat_messages')
          .select('chat_id, content, created_at')
          .in('chat_id', chatIds)
          .order('created_at', { ascending: false })
          .limit(200);

        const lastMessageByChat = {};
        (lastMessagesRows || []).forEach(m => {
          if (!lastMessageByChat[m.chat_id]) lastMessageByChat[m.chat_id] = m;
        });

        // Miniatura del anuncio para los chats de Compraventa (mismo dato que la tarjeta
        // fija de la conversación, pero para todos los hilos de la lista a la vez)
        const listingContextIds = [...new Set(
          chatsData
            .filter(c => c.context_type === 'marketplace_listing' && c.context_id)
            .map(c => c.context_id)
        )];
        const listingsMap = {};
        if (listingContextIds.length > 0) {
          const { data: listingsRows } = await supabase
            .from('marketplace_listings')
            .select('id, title, image_urls')
            .in('id', listingContextIds);
          (listingsRows || []).forEach(l => { listingsMap[l.id] = l; });
        }

        // C. CRUCE DE IDENTIDADES EN MEMORIA LOCAL
        const chatsWithProfiles = chatsData.map((chat) => {
            const u1 = chat.user_1_email?.toLowerCase().trim() || '';
            const u2 = chat.user_2_email?.toLowerCase().trim() || '';
            const otherEmail = u1 === myEmail ? u2 : u1;

            // 💡 CRUCIAL: Extraemos la parte delantera del correo por si el dominio (@) no coincide
            const otherPrefix = otherEmail.split('@')[0];

            let displayName = otherPrefix;
            let avatarUrl = null;
            let role = 'Miembro';
            let targetId = null;
            let isSchool = false;
            let isCompany = false;

            // Evaluamos prioridades de identidad usando los mapas locales (buscando email entero O prefijo)
            const schoolMatch = schoolsMap[otherEmail] || schoolsMap[otherPrefix];
            const companyMatch = companiesMap[otherEmail] || companiesMap[otherPrefix];
            const profileMatch = profilesMap[otherEmail];

            if (schoolMatch) {
              displayName = schoolMatch.name;
              avatarUrl = schoolMatch.avatar_url;
              role = 'Colegio';
              targetId = schoolMatch.id;
              isSchool = true;
            } else if (companyMatch) {
              displayName = companyMatch.name;
              avatarUrl = companyMatch.logo_url;
              role = 'Empresa';
              targetId = companyMatch.id;
              isCompany = true;
            } else if (profileMatch) {
              targetId = profileMatch.id;
              displayName = profileMatch.display_name || displayName;
              avatarUrl = profileMatch.avatar_url;
              role = profileMatch.role || 'Miembro';

              // Fallback: Si figura en profiles, verificamos si su ID está ligado a empresas
              const companyById = companiesMap[profileMatch.id];
              if (companyById) {
                displayName = companyById.name;
                avatarUrl = companyById.logo_url;
                role = 'Empresa';
                isCompany = true;
              }
            }

            return {
              ...chat,
              unread_count: unreadCounts[chat.id] || 0,
              last_message: lastMessageByChat[chat.id] || null,
              context_listing: (chat.context_type === 'marketplace_listing' && chat.context_id)
                ? listingsMap[chat.context_id] || null
                : null,
              otherUser: {
                id: targetId,
                display_name: displayName,
                avatar_url: avatarUrl,
                user_email: otherEmail,
                role: role,
                isSchool: isSchool,
                isCompany: isCompany
              }
            };
          });

        setChats(chatsWithProfiles);
      } catch (err) {
        console.error("Error crítico cargando el feed de hilos:", err);
      } finally {
        setLoadingChats(false);
      }
    };
    loadChats();
  }, [myEmail]);

  // 1.5 Resuelve cuál es el chat activo a partir del parámetro de ruta /hilo/:chatId
  // (columna de escritorio, o enlaces con id explícito) o del state de navegación
  // (flujo de compra). Es barato: no vuelve a pedir nada, solo busca en `chats` ya cargados.
  useEffect(() => {
    if (chats.length === 0) return;

    // Importante: reusar la misma referencia si el chat resuelto ya es el activo. `chats`
    // muta (nuevas referencias) cada vez que se marca un mensaje como leído (efecto 2), y
    // sin este guard eso generaba un activeChat "nuevo" en cada vuelta, que a su vez
    // reiniciaba el efecto 2 (recarga de mensajes + resuscripción realtime) — un bucle
    // infinito de parpadeo entre spinner y mensajes.
    if (location.state?.activeChatId) {
      const targetChat = chats.find(c => c.id === location.state.activeChatId);
      if (targetChat) {
        setActiveChat(prev => (prev?.id === targetChat.id ? prev : targetChat));
        setChatOpenedFromNav(true);
      }
    } else if (chatId) {
      const targetChat = chats.find(c => c.id === Number(chatId));
      if (targetChat) {
        setActiveChat(prev => (prev?.id === targetChat.id ? prev : targetChat));
      }
    }
  }, [chats, chatId, location.state]);

  // 1.6 Tarjeta fija del anuncio del que trata la conversación (si el chat tiene contexto)
  useEffect(() => {
    if (activeChat?.context_type !== 'marketplace_listing' || !activeChat?.context_id) {
      setContextListing(null);
      return;
    }
    const loadContextListing = async () => {
      const { data } = await supabase
        .from('marketplace_listings')
        .select('id, title, price, image_urls')
        .eq('id', activeChat.context_id)
        .maybeSingle();
      setContextListing(data);
    };
    loadContextListing();
  }, [activeChat]);

  // 2. Escuchar tiempo real de la conversación seleccionada
  useEffect(() => {
    if (!activeChat) return;

    const loadMessages = async () => {
      setLoadingMessages(true);
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', activeChat.id)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PAGE_SIZE);

      const ordered = (data || []).slice().reverse();
      setMessages(ordered);
      setHasMoreMessages(ordered.length === MESSAGES_PAGE_SIZE);
      setLoadingMessages(false);
      setTimeout(scrollToBottom, 50);

      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('chat_id', activeChat.id)
        .eq('is_read', false)
        .not('sender_email', 'eq', myEmail);

      setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, unread_count: 0 } : c));
    };

    loadMessages();

    const channel = supabase
      .channel(`chat-room-${activeChat.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${activeChat.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => {
              if (prev.some(m => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter(m => m.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            // Necesario para que aceptar/rechazar una oferta se refleje en vivo también
            // en la pantalla de la otra persona, no solo en la de quien pulsó el botón.
            setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m));
          }
          setTimeout(scrollToBottom, 50);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat, myEmail]);

  const loadOlderMessages = async () => {
    if (loadingOlderMessages || !hasMoreMessages || messages.length === 0) return;
    setLoadingOlderMessages(true);

    const oldestCreatedAt = messages[0].created_at;
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', activeChat.id)
      .lt('created_at', oldestCreatedAt)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PAGE_SIZE);

    const olderOrdered = (data || []).slice().reverse();
    setMessages(prev => [...olderOrdered, ...prev]);
    setHasMoreMessages(olderOrdered.length === MESSAGES_PAGE_SIZE);
    setLoadingOlderMessages(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const messageText = newMessage.trim();
    const nowIso = new Date().toISOString();
    setNewMessage('');

    const { error } = await supabase
      .from('chat_messages')
      .insert([{ chat_id: activeChat.id, sender_email: myEmail, content: messageText }]);

    if (!error) {
      await supabase.from('chats').update({ last_message_at: nowIso }).eq('id', activeChat.id);
    }
  };

  const handleAcceptOffer = async (msg) => {
    const { error } = await supabase
      .from('chat_messages')
      .update({ offer_status: 'aceptada' })
      .eq('id', msg.id);
    if (!error) {
      await supabase.from('chats').update({ accepted_offer_price: msg.offer_amount }).eq('id', activeChat.id);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, offer_status: 'aceptada' } : m));
    }
  };

  const handleRejectOffer = async (msg) => {
    const { error } = await supabase
      .from('chat_messages')
      .update({ offer_status: 'rechazada' })
      .eq('id', msg.id);
    if (!error) {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, offer_status: 'rechazada' } : m));
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (window.confirm("¿Quieres eliminar este mensaje?")) {
      setMessages(prev => prev.filter(m => m.id !== msgId));
      await supabase.from('chat_messages').delete().eq('id', msgId);
    }
  };

  // Escritorio: cambiar de hilo solo actualiza el parámetro de ruta (replace, para no
  // llenar el historial con cada click) — el contenido de la derecha cambia sin recargar
  // la vista ni volver a pedir la lista de chats. Al elegir un hilo desde la propia lista,
  // ya no hay "origen externo" del que volver, así que se limpia el flag explícitamente
  // (si no, se quedaría pegado del chat anterior si ese sí venía de fuera).
  const handleSelectChatDesktop = (chat) => {
    setChatOpenedFromNav(false);
    navigate(`/hilo/${chat.id}`, { replace: true });
  };

  const handleSelectChatMobile = (chat) => {
    setActiveChat(chat);
    setChatOpenedFromNav(false);
  };

  // Arrow icon (solo móvil): siempre vuelve a la bandeja de hilos, nunca navega fuera —
  // eso es lo que hace el enlace "Volver" aparte (ver handleExternalBack), para no mezclar
  // dos comportamientos distintos en un mismo botón.
  const handleMobileBack = () => {
    setActiveChat(null);
  };

  // Enlace "Volver" (visible en móvil y escritorio cuando el chat se abrió desde un sitio
  // externo del flujo de compra: Contactar/Chatear con el vendedor en ListingDetail.jsx,
  // DeliveryMethodChoice.jsx o ShippingCheckout.jsx). Reutiliza el mismo goBack con
  // fallback que ya usa móvil, para volver de verdad a esa pantalla y no solo a la lista.
  const handleExternalBack = () => {
    goBack(navigate, () => setActiveChat(null));
  };

  const filteredChats = chats.filter(chat =>
    chat.otherUser.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="text-center py-20 bg-card rounded-2xl border border-border max-w-md mx-auto mt-10">
        <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="font-cormorant text-xl text-muted-foreground">Inicia sesión para revisar tus hilos</p>
      </div>
    );
  }

  const conversationProps = {
    activeChat,
    contextListing,
    messages,
    loadingMessages,
    hasMoreMessages,
    loadingOlderMessages,
    loadOlderMessages,
    myEmail,
    navigate,
    handleDeleteMessage,
    handleAcceptOffer,
    handleRejectOffer,
    newMessage,
    setNewMessage,
    handleSendMessage,
    messagesEndRef,
    showExternalBack: chatOpenedFromNav,
    onExternalBack: handleExternalBack,
  };

  return (
    <>
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>

      {/* MÓVIL — bandeja de hilos: dentro del flujo normal de <main>, para que la barra de
          navegación inferior (fixed, en Layout.jsx) siga visible y se pueda volver a Inicio. */}
      {!activeChat && (
        <div className="md:hidden w-full max-w-2xl mx-auto bg-card h-full flex flex-col overflow-hidden shadow-sm animate-fade-in">
          <div className="p-4 border-b border-border space-y-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/')}
                className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Volver a Inicio"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h1 className="font-cormorant text-2xl font-bold text-foreground">Hilos</h1>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground/70" />
              <input
                type="text"
                placeholder="Buscar conversación..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-muted/50 border border-border/60 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/40 no-scrollbar">
            {loadingChats ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>
            ) : filteredChats.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center p-8 italic">No hay conversaciones activas.</p>
            ) : (
              filteredChats.map((chat) => {
                const initials = chat.otherUser.display_name?.slice(0, 2).toUpperCase() || 'U';
                return (
                  <div
                    key={chat.id}
                    onClick={() => handleSelectChatMobile(chat)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden border border-border flex-shrink-0">
                        {chat.otherUser.avatar_url ? (
                          <img src={chat.otherUser.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="text-primary font-semibold text-xs">{initials}</span>
                        )}
                      </div>

                      <div className="min-w-0 text-left">
                        <p className={`text-sm truncate ${chat.unread_count > 0 ? 'font-bold text-foreground' : 'font-medium text-foreground/90'}`}>
                          {chat.otherUser.display_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                          {chat.otherUser.role}
                        </p>
                      </div>

                    </div>
                    {chat.unread_count > 0 && <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MÓVIL — chat abierto: pantalla completa de verdad (por encima de cabecera y barra
          inferior a propósito), ya que tiene su propia flecha para volver a la bandeja. */}
      {activeChat && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-card overflow-hidden animate-fade-in">
          {!isDesktop && <ConversationPanel {...conversationProps} showBackButton onBack={handleMobileBack} />}
        </div>
      )}

      {/* ESCRITORIO (md+): dos columnas, lista de hilos siempre visible a la izquierda */}
      <div className="hidden md:flex w-full h-[calc(100vh-145px)] bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="w-80 flex-shrink-0 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border space-y-3 flex-shrink-0">
            <h1 className="font-cormorant text-2xl font-bold text-foreground">Hilos</h1>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground/70" />
              <input
                type="text"
                placeholder="Buscar conversación..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-muted/50 border border-border/60 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/40 no-scrollbar">
            {loadingChats ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>
            ) : filteredChats.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center p-8 italic">No hay conversaciones activas.</p>
            ) : (
              filteredChats.map((chat) => {
                const initials = chat.otherUser.display_name?.slice(0, 2).toUpperCase() || 'U';
                const isActive = activeChat?.id === chat.id;
                return (
                  <div
                    key={chat.id}
                    onClick={() => handleSelectChatDesktop(chat)}
                    className={`flex items-start gap-3 p-4 cursor-pointer border-l-2 transition-colors ${
                      isActive ? 'bg-primary/5 border-l-primary' : 'border-l-transparent hover:bg-muted/30'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden border border-border flex-shrink-0">
                      {chat.otherUser.avatar_url ? (
                        <img src={chat.otherUser.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="text-primary font-semibold text-xs">{initials}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${chat.unread_count > 0 ? 'font-bold text-foreground' : 'font-medium text-foreground/90'}`}>
                          {chat.otherUser.display_name}
                        </p>
                        {chat.last_message && (
                          <span className="text-[9px] text-muted-foreground flex-shrink-0">
                            {format(new Date(chat.last_message.created_at), 'd MMM')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {chat.last_message?.content || 'Sin mensajes todavía'}
                      </p>
                      {chat.context_listing && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-5 h-5 rounded overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                            {chat.context_listing.image_urls?.[0] ? (
                              <img src={chat.context_listing.image_urls[0]} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <Tag className="w-2.5 h-2.5 text-muted-foreground/40" />
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate">{chat.context_listing.title}</span>
                        </div>
                      )}
                    </div>
                    {chat.unread_count > 0 && <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {!activeChat ? (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Selecciona una conversación para empezar</p>
              </div>
            </div>
          ) : (
            isDesktop && <ConversationPanel {...conversationProps} showBackButton={false} />
          )}
        </div>
      </div>
    </>
  );
}
