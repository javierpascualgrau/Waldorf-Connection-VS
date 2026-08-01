import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import PostCard from '@/components/PostCard';
import SchoolEventCard from '@/components/SchoolEventCard';
import { Sparkles, TrendingUp, Users } from 'lucide-react';

const TABS = [
  { id: 'para_ti', label: 'Para ti', icon: Sparkles },
  { id: 'siguiendo', label: 'Siguiendo', icon: Users },
  { id: 'tendencias', label: 'Tendencias', icon: TrendingUp },
];

const PAGE_SIZE = 15;
const TRENDING_LIMIT = 10;

// Lunes 00:00 de la semana natural en curso
function getStartOfWeek() {
  const start = new Date();
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  return start;
}

export default function Feed() {
  const [tab, setTab] = useState('para_ti');
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [likedIds, setLikedIds] = useState(new Set());
  const [likedEventIds, setLikedEventIds] = useState(new Set());
  const [followingIds, setFollowingIds] = useState(new Set());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const handlePostDeleted = (id) => setPosts(prev => prev.filter(p => p.id !== id));

  // 💡 NUEVO CONECTOR RE REACTIVIDAD: Sincroniza al instante el Set de seguimientos del inicio
  const handleFollowToggle = (email, isFollowing) => {
    setFollowingIds(prev => {
      const next = new Set(prev);
      if (isFollowing) {
        next.add(email.toLowerCase().trim());
      } else {
        next.delete(email.toLowerCase().trim());
      }
      return next;
    });
  };

  const enrichEvents = (rawEvents, schoolsData) => {
    const schoolsMap = {};
    (schoolsData || []).forEach(s => {
      schoolsMap[s.id] = s;
    });

    // EL MAPEO CAMALEÓNICO ENRIQUECIDO
    return (rawEvents || []).map(ev => {
      const schoolInfo = schoolsMap[ev.school_id];
      if (schoolInfo) {
        const schoolDataCombo = [schoolInfo];
        schoolDataCombo.avatar_url = schoolInfo.avatar_url;
        schoolDataCombo.name = schoolInfo.name;
        schoolDataCombo.id = schoolInfo.id;

        return {
          ...ev,
          school_profiles: schoolDataCombo,
          school_profile: schoolDataCombo,
          avatar_url: schoolInfo.avatar_url,
          school_avatar: schoolInfo.avatar_url,
          author_avatar: schoolInfo.avatar_url,
          school_logo: schoolInfo.avatar_url,
          // 💡 INYECCIÓN CLAVE: Pasamos el email del colegio a la raíz del evento para poder filtrarlo
          school_email: schoolInfo.school_email?.toLowerCase().trim()
        };
      }
      return ev;
    });
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      const myEmailClean = authUser?.email?.toLowerCase().trim() || '';
      const from = 0;
      const to = PAGE_SIZE - 1;

      const [postsRes, eventsRes, followsRes, likesRes, eventLikesRes, schoolsRes] = await Promise.all([
        supabase.from('posts').select('*').order('created_date', { ascending: false }).range(from, to),
        supabase.from('school_events').select('*').order('created_date', { ascending: false }).range(from, to),
        myEmailClean
          ? supabase.from('user_follows').select('following_email').eq('follower_email', myEmailClean)
          : Promise.resolve({ data: [], error: null }),
        myEmailClean
          ? supabase.from('post_likes').select('post_id').eq('user_email', myEmailClean)
          : Promise.resolve({ data: [], error: null }),
        myEmailClean
          ? supabase.from('school_event_likes').select('event_id').eq('user_email', myEmailClean)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('school_profiles').select('*')
      ]);

      if (followsRes.data) {
        const emailsEnSeguimiento = new Set(followsRes.data.map(f => f.following_email?.toLowerCase().trim()));
        setFollowingIds(emailsEnSeguimiento);
      }

      if (likesRes.data) {
        const idsConLike = new Set(likesRes.data.map(l => String(l.post_id)));
        setLikedIds(idsConLike);
      }

      if (eventLikesRes.data) {
        const eventIdsConLike = new Set(eventLikesRes.data.map(l => String(l.event_id)));
        setLikedEventIds(eventIdsConLike);
      }

      const newPosts = postsRes.data || [];
      const newEvents = eventsRes.data || [];

      setPosts(newPosts);
      setEvents(enrichEvents(newEvents, schoolsRes.data));
      setHasMore(newPosts.length === PAGE_SIZE || newEvents.length === PAGE_SIZE);
      setPage(0);
      setLoading(false);
    };
    load();
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const nextPage = page + 1;
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const [postsRes, eventsRes, schoolsRes] = await Promise.all([
      supabase.from('posts').select('*').order('created_date', { ascending: false }).range(from, to),
      supabase.from('school_events').select('*').order('created_date', { ascending: false }).range(from, to),
      supabase.from('school_profiles').select('*')
    ]);

    const newPosts = postsRes.data || [];
    const newEvents = eventsRes.data || [];

    setPosts(prev => [...prev, ...newPosts]);
    setEvents(prev => [...prev, ...enrichEvents(newEvents, schoolsRes.data)]);
    setHasMore(newPosts.length === PAGE_SIZE || newEvents.length === PAGE_SIZE);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const getFilteredFeed = () => {
    if (tab === 'tendencias') {
      const startOfWeek = getStartOfWeek();
      // 💡 Persona, empresa (posts) y colegio (events) se combinan y rankean por igual: misma ventana de fecha, mismo criterio de likes
      return [
        ...posts.map(p => ({ type: 'post', data: p })),
        ...events.map(e => ({ type: 'event', data: e })),
      ]
        .filter(({ data }) => data.created_date && new Date(data.created_date) >= startOfWeek)
        .sort((a, b) => (b.data.likes_count || 0) - (a.data.likes_count || 0))
        .slice(0, TRENDING_LIMIT);
    }

    let filteredPosts = posts;
    let filteredEvents = events;

    if (tab === 'siguiendo') {
      filteredPosts = posts.filter(p => p.author_email && followingIds.has(p.author_email.toLowerCase().trim()));
      // 💡 CORREGIDO: En lugar de vaciar el array con un [], filtramos de forma real usando los seguimientos activos
      filteredEvents = events.filter(e => e.school_email && followingIds.has(e.school_email.toLowerCase().trim()));
    }

    const feed = [];
    let pi = 0, ei = 0;
    while (pi < filteredPosts.length || ei < filteredEvents.length) {
      if (pi < filteredPosts.length) feed.push({ type: 'post', data: filteredPosts[pi++] });
      if (ei < filteredEvents.length) feed.push({ type: 'event', data: filteredEvents[ei++] });
    }
    return feed;
  };

  const feed = getFilteredFeed();

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1.5 mb-5 bg-muted/50 p-1 rounded-2xl">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${
              tab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4 animate-pulse">
              <div className="flex gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2 pt-2">
                  <div className="h-3 bg-muted rounded w-1/3" />
                  <div className="h-2 bg-muted rounded w-1/5" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'siguiendo' && followingIds.size === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">🌿</div>
          <p className="font-cormorant text-xl text-muted-foreground">Aún no sigues a nadie</p>
          <p className="text-sm text-muted-foreground mt-1">Sigue a personas de la comunidad para ver sus publicaciones aquí</p>
        </div>
      ) : tab === 'siguiendo' && feed.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">🌱</div>
          <p className="font-cormorant text-xl text-muted-foreground">Nadie que sigues ha publicado aún</p>
        </div>
      ) : feed.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">🌱</div>
          <p className="font-cormorant text-xl text-muted-foreground">Aún no hay publicaciones</p>
          <p className="text-sm text-muted-foreground mt-1">¡Sé el primero en compartir algo!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feed.map((item) =>
            item.type === 'post' ? (
              <PostCard
                key={`post-${item.data.id}`}
                post={item.data}
                userEmail={user?.email}
                likedIds={likedIds} 
                followingIds={followingIds}
                onDeleted={handlePostDeleted}
              />
            ) : (
              <SchoolEventCard
                key={`event-${item.data.id}`}
                event={item.data}
                userEmail={user?.email}
                likedEventIds={likedEventIds}
                followingIds={followingIds}
                /* 💡 PASO EXTRA: Conectamos la sincronización reactiva */
                onFollowToggle={handleFollowToggle} 
              />
            )
          )}
        </div>
      )}

      {!loading && feed.length > 0 && hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="text-xs font-medium text-primary hover:opacity-80 disabled:opacity-40 transition-opacity px-4 py-2"
          >
            {loadingMore ? 'Cargando...' : 'Cargar más'}
          </button>
        </div>
      )}
    </div>
  );
}