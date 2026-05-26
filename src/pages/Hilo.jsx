import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Send, Loader2, MessageSquare, Pencil, Trash2, X, Check, Search, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Hilo() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeChat, setActiveChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const myEmail = user?.email?.toLowerCase().trim() || '';

  // 1. Cargar lista de hilos y contar mensajes no leídos
  useEffect(() => {
    if (!myEmail) return;

    const loadChats = async () => {
      setLoadingChats(true);
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .or(`user_1_email.eq.${myEmail},user_2_email.eq.${myEmail}`)
        .order('last_message_at', { ascending: false });

      if (!error && data) {
        const chatsWithProfiles = await Promise.all(
          data.map(async (chat) => {
            const otherEmail = chat.user_1_email === myEmail ? chat.user_2_email : chat.user_1_email;
            
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .ilike('user_email', otherEmail)
              .maybeSingle();

            const { count } = await supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('chat_id', chat.id)
              .eq('is_read', false)
              .not('sender_email', 'eq', myEmail);

            return { 
              ...chat, 
              unread_count: count || 0,
              otherUser: profile || { id: null, display_name: otherEmail.split('@')[0], user_email: otherEmail } 
            };
          })
        );
        setChats(chatsWithProfiles);

        if (location.state?.activeChatId) {
          const targetChat = chatsWithProfiles.find(c => c.id === location.state.activeChatId);
          if (targetChat) {
            setActiveChat(targetChat);
            window.history.replaceState({}, document.title);
          }
        }
      }
      setLoadingChats(false);
    };

    loadChats();
  }, [myEmail, location.state]);

  // 2. Escuchar mensajes nuevos globales para actualizar el puntito verde y mover arriba
  useEffect(() => {
    if (!myEmail) return;

    const globalMessagesChannel = supabase
      .channel('realtime-sidebar-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          setChats((prevChats) => {
            const targetIndex = prevChats.findIndex(c => c.id === payload.new.chat_id);
            if (targetIndex === -1) return prevChats;

            const targetChat = prevChats[targetIndex];
            const isFromMe = payload.new.sender_email === myEmail;
            const isChatActiveNow = activeChat?.id === payload.new.chat_id;

            const newUnreadCount = (!isFromMe && !isChatActiveNow) 
              ? (targetChat.unread_count || 0) + 1 
              : targetChat.unread_count;

            const updatedChat = { 
              ...targetChat, 
              last_message_at: payload.new.created_at,
              unread_count: newUnreadCount
            };

            const cleanChats = prevChats.filter(c => c.id !== payload.new.chat_id);
            return [updatedChat, ...cleanChats];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalMessagesChannel);
    };
  }, [myEmail, activeChat]);

  // 3. Cargar mensajes del chat seleccionado y limpiar notificaciones
  useEffect(() => {
    if (!activeChat) return;

    const loadMessages = async () => {
      setLoadingMessages(true);
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', activeChat.id)
        .order('created_at', { ascending: true });

      if (data) setMessages(data);
      setLoadingMessages(false);
      scrollToBottom();

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
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => {
              if (prev.some(m => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });

            if (payload.new.sender_email !== myEmail) {
              await supabase
                .from('chat_messages')
                .update({ is_read: true })
                .eq('id', payload.new.id);
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m));
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter(m => m.id !== payload.old.id));
          }
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat, myEmail]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    const nowIso = new Date().toISOString();

    const temporaryMessage = {
      id: `temp-${Date.now()}`,
      chat_id: activeChat.id,
      sender_email: myEmail,
      content: messageText,
      created_at: nowIso,
      is_read: false
    };
    setMessages((prev) => [...prev, temporaryMessage]);

    const { error: msgError } = await supabase
      .from('chat_messages')
      .insert([{ chat_id: activeChat.id, sender_email: myEmail, content: messageText }]);

    if (!msgError) {
      await supabase.from('chats').update({ last_message_at: nowIso }).eq('id', activeChat.id);
    }
  };

  const handleUpdateMessage = async (msgId) => {
    if (!editingText.trim()) return;
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: editingText.trim() } : m));
    setEditingMessageId(null);
    await supabase.from('chat_messages').update({ content: editingText.trim() }).eq('id', msgId);
  };

  const handleDeleteMessage = async (msgId) => {
    if (String(msgId).startsWith('temp-')) return;
    const confirmar = window.confirm("¿Quieres eliminar este mensaje?");
    if (!confirmar) return;
    setMessages(prev => prev.filter(m => m.id !== msgId));
    await supabase.from('chat_messages').delete().eq('id', msgId);
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

  return (
    <div className="max-w-2xl mx-auto bg-card border border-border rounded-3xl h-[calc(100vh-140px)] flex flex-col overflow-hidden shadow-sm mt-2">
      
      {/* 💡 ESTILOS INLINE PARA UNA BARRA DE SCROLL LIMPIA Y MINIMALISTA */}
      <style>{`
        .chat-scroll-area::-webkit-scrollbar {
          width: 5px;
        }
        .chat-scroll-area::-webkit-scrollbar-track {
          background: transparent;
        }
        .chat-scroll-area::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 9999px;
        }
        .chat-scroll-area::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>

      {/* SECCIÓN LISTA DE CHATS */}
      {!activeChat ? (
        <div className="flex-1 flex flex-col bg-card animate-fade-in min-h-0">
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

          <div className="flex-1 overflow-y-auto divide-y divide-border/40 chat-scroll-area">
            {loadingChats ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>
            ) : filteredChats.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center p-8 italic">No se encontraron conversaciones.</p>
            ) : (
              filteredChats.map((chat) => {
                const initials = chat.otherUser.display_name?.slice(0, 2).toUpperCase() || 'U';
                const hasUnread = chat.unread_count > 0;
                
                return (
                  <div
                    key={chat.id}
                    onClick={() => setActiveChat(chat)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden border border-border flex-shrink-0">
                        {chat.otherUser.avatar_url ? (
                          <img src={chat.otherUser.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-primary font-semibold text-sm">{initials}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm truncate ${hasUnread ? 'font-bold text-foreground' : 'font-medium text-foreground/90'}`}>
                          {chat.otherUser.display_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wider">
                          {chat.otherUser.role || 'Miembro'}
                        </p>
                      </div>
                    </div>

                    {hasUnread && (
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2 shadow-sm animate-pulse flex-shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        
        /* SECCIÓN CONVERSACIÓN ABIERTA FIJA CON SCROLL SEPARADO */
        /* 💡 min-h-0 obliga a este contenedor a respetar la altura del padre y no estirarse */
        <div className="flex-1 flex flex-col bg-card animate-fade-in min-h-0">
          
          {/* Cabecera del Chat (Fija arriba gracias a flex-shrink-0) */}
          <div className="p-3 border-b border-border flex items-center gap-2 bg-muted/5 select-none flex-shrink-0">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setActiveChat(null);
              }}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors mr-1 flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div 
              onClick={() => {
                const targetId = activeChat.otherUser.id || encodeURIComponent(activeChat.otherUser.user_email);
                navigate(`/usuario/${targetId}`);
              }}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity min-w-0 flex-1"
            >
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden border border-border flex-shrink-0">
                {activeChat.otherUser.avatar_url ? (
                  <img src={activeChat.otherUser.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary font-semibold text-xs">
                    {activeChat.otherUser.display_name?.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-foreground truncate">{activeChat.otherUser.display_name}</h3>
                <p className="text-[10px] text-muted-foreground truncate">Ver perfil de la comunidad ↗</p>
              </div>
            </div>
          </div>

          {/* Burbujas de chat (ÚNICO CONTENEDOR CON SCROLL ACTIVO) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5 chat-scroll-area">
            {loadingMessages ? (
              <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-primary w-5 h-5" /></div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_email === myEmail;
                const isEditingThis = editingMessageId === msg.id;

                return (
                  <div key={msg.id} className={`flex items-center gap-2 group ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {isMe && !isEditingThis && (
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1.5 transition-opacity">
                        <button 
                          onClick={() => { setEditingMessageId(msg.id); setEditingText(msg.content); }}
                          className="text-muted-foreground hover:text-primary p-0.5"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="text-muted-foreground hover:text-destructive p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs shadow-sm ${
                      isMe 
                        ? 'bg-primary text-primary-foreground rounded-tr-none' 
                        : 'bg-muted/70 text-foreground rounded-tl-none border border-border/40'
                    }`}>
                      {isEditingThis ? (
                        <div className="flex items-center gap-2 min-w-[180px]">
                          <input
                            type="text"
                            className="flex-1 bg-card text-foreground rounded-md px-2 py-0.5 text-xs outline-none focus:ring-1 focus:ring-primary-foreground"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            autoFocus
                          />
                          <button onClick={() => handleUpdateMessage(msg.id)} className="text-primary-foreground bg-emerald-600 p-1 rounded-md"><Check className="w-3 h-3" /></button>
                          <button onClick={() => setEditingMessageId(null)} className="text-primary-foreground bg-muted/30 p-1 rounded-md"><X className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        <>
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          <span className={`text-[9px] block text-right mt-1 opacity-70 ${isMe ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                            {format(new Date(msg.created_at), 'HH:mm')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Formulario de entrada (Fijo abajo gracias a flex-shrink-0) */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-border flex gap-2 bg-card flex-shrink-0">
            <input
              type="text"
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-muted/40 border border-border/60 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-primary text-primary-foreground p-2.5 rounded-xl hover:opacity-90 disabled:opacity-40 transition-all shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}