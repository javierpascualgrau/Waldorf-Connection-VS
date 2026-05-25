import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Send, Loader2, MessageSquare, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Hilo() {
  const { user } = useAuth();
  const [activeChat, setActiveChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);

  const myEmail = user?.email?.toLowerCase().trim() || '';

  // 1. Cargar lista de conversaciones activas
  useEffect(() => {
    if (!myEmail) return;

    const loadChats = async () => {
      setLoadingChats(true);
      // Traemos chats donde participas
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .or(`user_1_email.eq.${myEmail},user_2_email.eq.${myEmail}`);

      if (!error && data) {
        // Buscamos los datos de perfil de la otra persona del chat
        const chatsWithProfiles = await Promise.all(
          data.map(async (chat) => {
            const otherEmail = chat.user_1_email === myEmail ? chat.user_2_email : chat.user_1_email;
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .ilike('user_email', otherEmail)
              .maybeSingle();

            return { ...chat, otherUser: profile || { display_name: otherEmail.split('@')[0], user_email: otherEmail } };
          })
        );
        setChats(chatsWithProfiles);
      }
      setLoadingChats(false);
    };

    loadChats();
  }, [myEmail]);

  // 2. Cargar mensajes del chat seleccionado e iniciar suscripción en tiempo real
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

    // 🔴 CANAL EN TIEMPO REAL: Escucha nuevos mensajes de este chat instantáneamente
    const channel = supabase
      .channel(`chat-${activeChat.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', scheme: 'public', table: 'chat_messages', filter: `chat_id=eq.${activeChat.id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat]);

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

    const { error } = await supabase
      .from('chat_messages')
      .insert([
        {
          chat_id: activeChat.id,
          sender_email: myEmail,
          content: messageText,
        },
      ]);

    if (error) {
      console.error('Error al enviar mensaje:', error);
    }
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
      {/* COLUMNA IZQUIERDA: LISTA DE CHATS */}
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

      {/* COLUMNA DERECHA: CHAT ACTIVO */}
      <div className="flex-1 flex flex-col bg-card">
        {activeChat ? (
          <>
            {/* Cabecera del chat activo */}
            <div className="p-4 border-b border-border flex items-center gap-3 shadow-inner bg-muted/5">
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
                <h3 className="text-sm font-bold text-foreground">{activeChat.otherUser.display_name}</h3>
                <p className="text-[10px] text-muted-foreground">{activeChat.otherUser.location || 'Comunidad Waldorf'}</p>
              </div>
            </div>

            {/* Globo de mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5">
              {loadingMessages ? (
                <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-primary w-5 h-5" /></div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_email === myEmail;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-xs shadow-sm ${
                        isMe 
                          ? 'bg-primary text-primary-foreground rounded-tr-none' 
                          : 'bg-muted/70 text-foreground rounded-tl-none border border-border/40'
                      }`}>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <span className={`text-[9px] block text-right mt-1 opacity-70 ${isMe ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de envío */}
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