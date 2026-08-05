import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { formatDistanceToNow, isThisWeek, isThisMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Bell, Check } from 'lucide-react';
import { goBack } from '@/lib/navigation';

export default function Notificaciones() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });
      setNotifications(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
    if (unreadIds.length === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
  };

  const handleClickNotification = async (notification) => {
    if (!notification.read_at) {
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n));
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notification.id);
    }
    navigate(notification.link || '/');
  };

  const groups = { semana: [], mes: [], anteriores: [] };
  notifications.forEach(n => {
    const date = new Date(n.created_at);
    if (isThisWeek(date, { weekStartsOn: 1 })) groups.semana.push(n);
    else if (isThisMonth(date)) groups.mes.push(n);
    else groups.anteriores.push(n);
  });
  const hasUnread = notifications.some(n => !n.read_at);

  const renderGroup = (title, items) => {
    if (items.length === 0) return null;
    return (
      <div key={title}>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 mt-5 first:mt-0">{title}</h2>
        <div className="space-y-1">
          {items.map(n => {
            const initials = n.actor_name?.slice(0, 2).toUpperCase() || 'W';
            return (
              <button
                key={n.id}
                onClick={() => handleClickNotification(n)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors ${
                  n.read_at ? 'hover:bg-muted/50' : 'bg-primary/5 hover:bg-primary/10'
                }`}
              >
                <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden border border-border flex-shrink-0">
                  {n.actor_avatar ? (
                    <img src={n.actor_avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary font-cormorant font-semibold text-sm">{initials}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground leading-snug">
                    {n.actor_name && <span className="font-semibold">{n.actor_name} </span>}
                    {n.message}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                  </p>
                </div>
                {!n.read_at && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pb-20 mt-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => goBack(navigate, '/')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Volver atrás
        </button>
        {hasUnread && (
          <button onClick={handleMarkAllRead} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
            <Check className="w-3.5 h-3.5" /> Marcar todo como leído
          </button>
        )}
      </div>

      <h1 className="font-cormorant text-3xl font-semibold text-foreground mb-6">Notificaciones</h1>

      {loading ? (
        <div className="text-center py-12 animate-pulse text-muted-foreground text-sm">Cargando...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl">
          <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Todavía no tienes notificaciones.</p>
        </div>
      ) : (
        <>
          {renderGroup('Esta semana', groups.semana)}
          {renderGroup('Este mes', groups.mes)}
          {renderGroup('Anteriores', groups.anteriores)}
        </>
      )}
    </div>
  );
}
