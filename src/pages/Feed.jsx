import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import PostCard from '@/components/PostCard';
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
  const [likedIds, setLikedIds] = useState(new Set());
  const [followingIds, setFollowingIds] = useState(new Set());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const handlePostDeleted = (id) => setPosts(prev => prev.filter(p => p.id !== id));

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      const myEmailClean = authUser?.email?.toLowerCase().trim() || '';
      const from = 0;
      const to = PAGE_SIZE - 1;

      // 💡 El Feed general solo muestra contenido "Día a día" (type='daily'); los eventos futuros de colegios viven en el Tablón de Eventos de Colegios
      const [postsRes, followsRes, likesRes] = await Promise.all([
        supabase.from('posts').select('*').eq('type', 'daily').order('created_date', { ascending: false }).range(from, to),
        myEmailClean
          ? supabase.from('user_follows').select('following_email').eq('follower_email', myEmailClean)
          : Promise.resolve({ data: [], error: null }),
        myEmailClean
          ? supabase.from('post_likes').select('post_id').eq('user_email', myEmailClean)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (followsRes.data) {
        const emailsEnSeguimiento = new Set(followsRes.data.map(f => f.following_email?.toLowerCase().trim()));
        setFollowingIds(emailsEnSeguimiento);
      }

      if (likesRes.data) {
        const idsConLike = new Set(likesRes.data.map(l => String(l.post_id)));
        setLikedIds(idsConLike);
      }

      const newPosts = postsRes.data || [];

      setPosts(newPosts);
      setHasMore(newPosts.length === PAGE_SIZE);
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

    const { data } = await supabase.from('posts').select('*').eq('type', 'daily').order('created_date', { ascending: false }).range(from, to);

    const newPosts = data || [];

    setPosts(prev => [...prev, ...newPosts]);
    setHasMore(newPosts.length === PAGE_SIZE);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const getFilteredFeed = () => {
    if (tab === 'tendencias') {
      const startOfWeek = getStartOfWeek();
      return [...posts]
        .filter(p => p.created_date && new Date(p.created_date) >= startOfWeek)
        .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
        .slice(0, TRENDING_LIMIT);
    }

    if (tab === 'siguiendo') {
      return posts.filter(p => p.author_email && followingIds.has(p.author_email.toLowerCase().trim()));
    }

    return posts;
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
          {feed.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              userEmail={user?.email}
              likedIds={likedIds}
              followingIds={followingIds}
              onDeleted={handlePostDeleted}
            />
          ))}
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
