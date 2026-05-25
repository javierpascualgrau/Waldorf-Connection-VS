import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useLocation } from 'react-router-dom'; // 💡 IMPORTADO useLocation
import { Send, Loader2, MessageSquare, Pencil, Trash2, X, Check, Search } from 'lucide-react'; // 💡 AÑADIDO ICONO SEARCH
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Hilo() {
  const { user } = useAuth();
  const location = useLocation(); // 💡 INICIALIZAMOS
  const [activeChat, setActiveChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);

  // 💡 NUEVO ESTADO: Guarda el texto escrito en el buscador
  const [searchQuery, setSearchQuery] = useState('');

  // Estados para la edición de mensajes en caliente
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const myEmail = user?.email?.toLowerCase().trim() || '';

  // 1. Cargar lista de conversaciones ordenadas por última actividad
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

            return { 
              ...chat, 
              otherUser: profile || { id: null, display_name: otherEmail.split('@')[0], user_email: otherEmail } 
            };
          })
        );
        setChats(chatsWithProfiles);

        // 💡 AUTO-APERTURA DIRECTA AL ENTRAR DESDE PERFIL
        if (location.state?.activeChatId) {
          const targetChat = chatsWithProfiles.find(c => c.id === location.state.activeChatId);
          if (targetChat) {
            setActiveChat(targetChat);
            // Limpia el maletero de la ruta para que no se reabra solo al cambiar de vista
            window.history.replaceState({}, document.title);
          }
        }
      }
      setLoadingChats(false);
    };

    loadChats();
  }, [myEmail, location.state]);

  // 2. Escuchar ordenación de barra lateral en tiempo real
  useEffect(() => {
    if (!myEmail) return;

    const chatsChannel = supabase
      .channel('realtime-sidebar-sorting')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chats' },
        (payload) => {
          if (payload.new.user_1_email === myEmail || payload.new.user_2_email === myEmail) {
            setChats((prevChats) => {
              const targetIndex = prevChats.findIndex(c => c.id === payload.new.id);
              if (targetIndex !== -1) {
                const updatedChat = { ...prevChats[targetIndex], last_message_at: payload.new.last_message_at };
                const cleanChats = prevChats.filter(c => c.id !== payload.new.id);
                return [updatedChat, ...cleanChats];
              }
              return prevChats;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatsChannel);
    };
  }, [myEmail]);

  // 3. Cargar mensajes del chat seleccionado y escuchar TODO en tiempo real (* INSERT, UPDATE, DELETE)
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
              if (payload.new.sender_email === myEmail) {
                const tempIndex = prev.findIndex(m => m.content === payload.new.content && String(m.id).startsWith('temp-'));
                if (tempIndex !== -1) {
                  const updated = [...prev];
                  updated[tempIndex] = payload.new;
                  return updated;
                }
              }
              return [...prev, payload.new];
            });
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
      created_at: nowIso
    };
    setMessages((prev) => [...prev, temporaryMessage]);

    setChats((prevChats) => {
      const filtered = prevChats.filter(c => c.id !== activeChat.id);
      const updatedActiveChat = { ...activeChat, last_message_at: nowIso };
      return [updatedActiveChat, ...filtered];
    });

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

    const { error } = await supabase
      .from('chat_messages')
      .update({ content: editingText.trim() })
      .eq('id', msgId);

    if (error) console.error("Error al editar mensaje:", error);
  };

  const handleDeleteMessage = async (msgId) => {
    if (String(msgId).startsWith('temp-')) return;
    const confirmar = window.confirm("¿Quieres eliminar este mensaje para todos?");
    if (!confirmar) return;

    setMessages(prev => prev.filter(m => m.id !== msgId));

    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', msgId);

    if (error) console.error("Error al borrar mensaje:", error);
  };

  // 💡 LÓGICA FILTRADORA EN CLIENTE PARA EL BUSCADOR
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
    <div className="max-w-4xl mx-auto bg-card border border-border rounded-2xl h-[calc(100vh-140px)] flex overflow-hidden shadow-sm mt-2">
      {/* BARRA LATERAL IZQUIERDA */}
      <div className="w-1/3 border-r border-border flex flex-col bg-muted/10">
        
        {/* 💡 CONTENEDOR BUSCADOR INTEGRADO */}
        <div className="p-4 border-b border-border bg-card space-y-3">
          <h1 className="font-cormorant text-2xl font-bold text-foreground">Hilos</h1>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground/70" />
            <input 
              type="text"
              placeholder="Buscar chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/50 border border-border/60 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border/50">
          {loadingChats ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary w-5 h-5" /></div>
          ) : filteredChats.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center p-6 italic">No se encontraron chats.</p>
          ) : (
            // 💡 MAPEAMOS LOS CHATS YA FILTRADOS
            filteredChats.map((chat) => {
              const isSelected = activeChat?.id === chat.id;
              const initials = chat.otherUser.display_name?.slice(0, 2).toUpperCase() || 'U';
              return (
                <div
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  className={`flex items-center gap-3 p-4 cursor-pointer transition-all ${
                    isSelected ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-muted/40'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden border border-border flex-shrink-0">
                    {chat.otherUser.avatar_url ? (
                      <img src={chat.otherUser.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-primary font-semibold text-xs">{initials}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate text-foreground">{chat.otherUser.display_name}</p>
                    <p className="text-xs text-muted-foreground truncate uppercase tracking-wider text-[10px]">
                      {chat.otherUser.role || 'Miembro'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* BLOQUE DE CHAT ACTIVO */}
      <div className="flex-1 flex flex-col bg-card">
        {activeChat ? (
          <>
            <div 
              onClick={() => navigate(`/usuario/${activeChat.otherUser.id || encodeURIComponent(activeChat.otherUser.user_email)}`)}
              className="p-4 border-b border-border flex items-center gap-3 shadow-inner bg-muted/5 cursor-pointer hover:bg-muted/20 transition-all select-none"
            >
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden border border-border">
                {activeChat.otherUser.avatar_url ? (
                  <img src={activeChat.otherUser.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary font-semibold text-xs">
                    {activeChat.otherUser.display_name?.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground group-hover:underline">{activeChat.otherUser.display_name}</h3>
                <p className="text-[10px] text-muted-foreground">Ver perfil de la comunidad ↗</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5">
              {loadingMessages ? (
                <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-primary w-5 h-5" /></div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_email === myEmail;
                  const isEditingThis = editingMessageId === msg.id;

                  return (
                    <div key={msg.id} className={`flex items-center gap-2 group ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {isMe && !isEditingThis && (
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1.5 transition-opacity self-center">
                          <button 
                            onClick={() => { setEditingMessageId(msg.id); setEditingText(msg.content); }}
                            className="text-muted-foreground hover:text-primary p-1 rounded-md hover:bg-muted transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-muted transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <div className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-xs shadow-sm relative ${
                        isMe 
                          ? 'bg-primary text-primary-foreground rounded-tr-none' 
                          : 'bg-muted/70 text-foreground rounded-tl-none border border-border/40'
                      }`}>
                        {isEditingThis ? (
                          <div className="flex items-center gap-2 py-0.5 min-w-[180px]">
                            <input
                              type="text"
                              className="flex-1 bg-card text-foreground rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary-foreground border border-border"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              autoFocus
                            />
                            <button onClick={() => handleUpdateMessage(msg.id)} className="text-primary-foreground bg-emerald-600 p-1 rounded-md hover:bg-emerald-700">
                              <Check className="w-3 h-3" />
                            </button>
                            <button onClick={() => setEditingMessageId(null)} className="text-primary-foreground bg-muted/30 p-1 rounded-md hover:bg-muted/50">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <span className={`text-[9px] block text-right mt-1 opacity-70 ${isMe ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
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

            <form onSubmit={handleSendMessage} className="p-4 border-t border-border flex gap-2 bg-card">
              <input
                type="text"
                placeholder="Escribe un mensaje en el hilo..."
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
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <MessageSquare className="w-10 h-10 text-muted-foreground/20 mb-2" />
            <h2 className="font-cormorant text-xl font-medium">Tus conversaciones</h2>
            <p className="text-xs max-w-xs mt-1">Selecciona un hilo de la izquierda para empezar a hablar con los miembros de la comunidad.</p>
          </div>
        )}
      </div>
    </div>
  );
}