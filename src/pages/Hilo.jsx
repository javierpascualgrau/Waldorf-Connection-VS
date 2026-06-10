import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Send, Loader2, MessageSquare, Trash2, Search, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

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

  const myEmail = user?.email?.toLowerCase().trim() || '';

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

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
            const otherEmail = chat.user_1_email?.toLowerCase().trim() === myEmail 
              ? chat.user_2_email?.toLowerCase().trim() 
              : chat.user_1_email?.toLowerCase().trim();
            
            // 1. Buscamos el perfil base en la tabla profiles
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .ilike('user_email', otherEmail)
              .maybeSingle();

            let displayName = profile?.display_name || otherEmail.split('@')[0];
            let avatarUrl = profile?.avatar_url || null;

            // 2. Si existe el usuario, buscamos si tiene un colegio asociado mediante el manager_id
            if (profile?.id) {
              const { data: schoolProf } = await supabase
                .from('school_profiles')
                .select('name, avatar_url')
                .eq('manager_id', profile.id) // Vinculación limpia por ID de gestor
                .maybeSingle();

              if (schoolProf) {
                displayName = schoolProf.name;
                if (schoolProf.avatar_url) avatarUrl = schoolProf.avatar_url;
              }
            }

            const { count } = await supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('chat_id', chat.id)
              .eq('is_read', false)
              .not('sender_email', 'eq', myEmail);

            return { 
              ...chat, 
              unread_count: count || 0,
              otherUser: { 
                id: profile?.id || null, 
                display_name: displayName, 
                avatar_url: avatarUrl,
                user_email: otherEmail,
                role: profile?.role || 'Miembro'
              } 
            };
          })
        );
        setChats(chatsWithProfiles);

        if (location.state?.activeChatId) {
          const targetChat = chatsWithProfiles.find(c => c.id === location.state.activeChatId);
          if (targetChat) setActiveChat(targetChat);
        }
      }
      setLoadingChats(false);
    };
    loadChats();
  }, [myEmail, location.state]);

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
          }
          setTimeout(scrollToBottom, 50);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat, myEmail]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('chat_messages')
      .insert([{ chat_id: activeChat.id, sender_email: myEmail, content: messageText }]);

    if (!error) {
      await supabase.from('chats').update({ last_message_at: nowIso }).eq('id', activeChat.id);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (window.confirm("¿Quieres eliminar este mensaje?")) {
      setMessages(prev => prev.filter(m => m.id !== msgId));
      await supabase.from('chat_messages').delete().eq('id', msgId);
    }
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
    <div className="w-full max-w-2xl mx-auto bg-card md:border md:border-border md:rounded-3xl h-[calc(100vh-145px)] flex flex-col overflow-hidden relative shadow-sm">
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>

      {/* LISTA DE CHATS ABIERTOS */}
      {!activeChat ? (
        <div className="absolute inset-0 flex flex-col bg-card animate-fade-in">
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
                return (
                  <div
                    key={chat.id}
                    onClick={() => setActiveChat(chat)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden border border-border flex-shrink-0">
                        {chat.otherUser.avatar_url ? (
                          <img src={chat.otherUser.avatar_url} className="w-full h-full object-cover" />
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
      ) : (
        
        /* CUERPO DEL CHAT ACTIVO */
        <div className="absolute inset-0 flex flex-col bg-card animate-fade-in overflow-hidden">
          <div className="h-16 border-b border-border flex items-center gap-2 bg-muted/5 z-10 px-3 flex-shrink-0 select-none">
            <button onClick={() => setActiveChat(null)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors mr-1">
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden border border-border flex-shrink-0">
                {activeChat.otherUser.avatar_url ? (
                  <img src={activeChat.otherUser.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary font-semibold text-xs">{activeChat.otherUser.display_name?.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <h3 className="text-sm font-bold text-foreground truncate">{activeChat.otherUser.display_name}</h3>
                <p className="text-[10px] text-muted-foreground truncate">{activeChat.otherUser.role}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5 no-scrollbar">
            {loadingMessages ? (
              <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-primary w-5 h-5" /></div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_email === myEmail;
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
              })
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
        </div>
      )}
    </div>
  );
}