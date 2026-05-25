import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom'; // 💡 IMPORTADO PARA IR AL PERFIL
import { Send, Loader2, MessageSquare, Pencil, Trash2, X, Check } from 'lucide-react'; // 💡 IMPORTADOS NUEVOS ICONOS
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Hilo() {
  const { user } = useAuth();
  const navigate = useNavigate(); // 💡 INICIALIZAMOS EL NAVEGADOR
  const [activeChat, setActiveChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);

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
      }
      setLoadingChats(false);
    };

    loadChats();
  }, [myEmail]);

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

    // 💡 CONFIGURADO EVENTO ESCUCHA TOTAL '*'
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
            // Sincroniza la edición del mensaje en tiempo real para ambos
            setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m));
          } else if (payload.eventType === 'DELETE') {
            // Elimina el globo de la pantalla en tiempo real para ambos
            setMessages((prev) => prev.filter(m => m.id === payload.old.id));
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

  // 💡 NUEVA FUNCIÓN: ACTUALIZAR MENSAJE EN SUPABASE
  const handleUpdateMessage = async (msgId) => {
    if (!editingText.trim()) return;
    
    // Cambiamos el estado local al instante para dar velocidad
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: editingText.trim() } : m));
    setEditingMessageId(null);

    const { error } = await supabase
      .from('chat_messages')
      .update({ content: editingText.trim() })
      .eq('id', msgId);

    if (error) console.error("Error al editar mensaje:", error);
  };

  // 💡 NUEVA FUNCIÓN: ELIMINAR MENSAJE EN SUPABASE
  const handleDeleteMessage = async (msgId) => {
    if (String(msgId).startsWith('temp-')) return;
    const confirmar = window.confirm("¿Quieres eliminar este mensaje para todos?");
    if (!confirmar) return;

    // Quitamos de pantalla de forma optimista
    setMessages(prev => prev.filter(m => m.id !== msgId));

    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', msgId);

    if (error) console.error("Error al borrar mensaje:", error);
  };

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
        <div className="p-4 border-b border-border bg-card">
          <h1 className="font-cormorant text-2xl font-bold text-foreground">Hilos</h1>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border/50">
          {loadingChats ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary w-5 h-5" /></div>
          ) : chats.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center p-6 italic">No tienes conversaciones abiertas todavía.</p>
          ) : (
            chats.map((chat) => {
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
            {/* 💡 CABECERA CON CLICK INTELIGENTE AL PERFIL PÚBLICO */}
            <div 
              onClick={() => {
                if (activeChat.otherUser.id) {
                  navigate(`/usuario/${activeChat.otherUser.id}`);
                } else {
                  navigate(`/usuario/${encodeURIComponent(activeChat.otherUser.user_email)}`);
                }
              }}
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

            {/* CONTENEDOR DE MENSAJES */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5">
              {loadingMessages ? (
                <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-primary w-5 h-5" /></div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_email === myEmail;
                  const isEditingThis = editingMessageId === msg.id;

                  return (
                    <div key={msg.id} className={`flex items-center gap-2 group ${isMe ? 'justify-end' : 'justify-start'}`}>
                      
                      {/* Acciones de mis mensajes (Aparecen a la izquierda al hacer hover en PC) */}
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

                      {/* Globo de texto */}
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

            {/* INPUT DE ENVÍO */}
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