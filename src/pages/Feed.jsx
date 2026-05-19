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

export default function Feed() {
  const [tab, setTab] = useState('para_ti');
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [likedIds, setLikedIds] = useState(new Set()); // Aquí guardamos los IDs con likes reales
  const [followingIds, setFollowingIds] = useState(new Set());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const handlePostDeleted = (id) => setPosts(prev => prev.filter(p => p.id !== id));

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      const myEmailClean = authUser?.email?.toLowerCase().trim() || '';

      // Descargamos posts, eventos, seguimientos y LIKES en paralelo
      const [postsRes, eventsRes, followsRes, likesRes] = await Promise.all([
        supabase.from('posts').select('*').order('created_date', { ascending: false }),
        supabase.from('school_events').select('*').order('created_date', { ascending: false }),
        myEmailClean 
          ? supabase.from('user_follows').select('following_email').eq('follower_email', myEmailClean)
          : Promise.resolve({ data: [], error: null }),
        myEmailClean
          ? supabase.from('post_likes').select('post_id').eq('user_email', myEmailClean)
          : Promise.resolve({ data: [], error: null })
      ]);

      // Sincronizamos los seguimientos
      if (followsRes.data) {
        const emailsEnSeguimiento = new Set(followsRes.data.map(f => f.following_email?.toLowerCase().trim()));
        setFollowingIds(emailsEnSeguimiento);
      }

      // Sincronizamos los LIKES persistentes 
      if (likesRes.data) {
        const idsConLike = new Set(likesRes.data.map(l => l.post_id));
        setLikedIds(idsConLike);
      }

      setPosts(postsRes.data || []);
      setEvents(eventsRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  const getFilteredFeed = () => {
    let filteredPosts = posts;
    let filteredEvents = events;

    if (tab === 'tendencias') {
      filteredPosts = [...posts].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
      filteredEvents = [...events].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    } else if (tab === 'siguiendo') {
      filteredPosts = posts.filter(p => p.author_email && followingIds.has(p.author_email.toLowerCase().trim()));
      filteredEvents = [];
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
      {/* Hero */}
      <div className="mb-6">
        <h1 className="font-cormorant text-3xl font-semibold mb-1">Waldorf Connect</h1>
        <p className="text-sm text-muted-foreground">Tu comunidad Waldorf en un solo lugar</p>
      </div>

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
                likedIds={likedIds} // Pasamos el Set real con los likes cargados de la BD
                followingIds={followingIds}
                onDeleted={handlePostDeleted}
              />
            ) : (
              <SchoolEventCard
                key={`event-${item.data.id}`}
                event={item.data}
                userEmail={user?.email}
                likedIds={likedIds}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}