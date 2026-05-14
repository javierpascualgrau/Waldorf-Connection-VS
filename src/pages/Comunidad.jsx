import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import PostCard from '@/components/PostCard';
import { Search, Users } from 'lucide-react';

const CATEGORIES = [
  { value: 'todos', label: 'Todo' },
  { value: 'taller', label: 'Talleres' },
  { value: 'profesor_particular', label: 'Profesores' },
  { value: 'arte', label: 'Arte' },
  { value: 'musica', label: 'Música' },
  { value: 'teatro', label: 'Teatro' },
  { value: 'naturaleza', label: 'Naturaleza' },
  { value: 'carpinteria', label: 'Carpintería' },
  { value: 'evento_espiritual', label: 'Espiritual' },
  { value: 'asociacion', label: 'Asociaciones' },
];

const ROLES = [
  { value: 'todos', label: 'Todos' },
  { value: 'profesor', label: 'Profesores' },
  { value: 'alumno', label: 'Alumnos' },
  { value: 'padre_madre', label: 'Padres' },
  { value: 'exalumno', label: 'Exalumnos' },
];

export default function Comunidad() {
  const [posts, setPosts] = useState([]);
  const [likedIds, setLikedIds] = useState(new Set());
  const [user, setUser] = useState(null);
  const [category, setCategory] = useState('todos');
  const [role, setRole] = useState('todos');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      
      // 1. Obtenemos el usuario oficial desde Supabase
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // 2. Pedimos los posts ordenados por nuestra nueva columna created_date
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_date', { ascending: false });

      if (error) {
        console.error("Error cargando posts en comunidad:", error);
      }

      // 3. Limpiamos likes temporalmente
      setLikedIds(new Set());
      setPosts(postsData || []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = posts.filter(p => {
    const matchCat = category === 'todos' || p.category === category;
    const matchRole = role === 'todos' || p.author_role === role;
    const matchSearch = !search || p.content?.toLowerCase().includes(search.toLowerCase()) || p.author_name?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchRole && matchSearch;
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="font-cormorant text-3xl font-semibold mb-1">Comunidad</h1>
        <p className="text-sm text-muted-foreground">Alumnos, padres, profesores y exalumnos Waldorf</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-muted/50 rounded-2xl px-4 py-2.5 mb-4">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar en la comunidad..."
          className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Role filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {ROLES.map(r => (
          <button
            key={r.value}
            onClick={() => setRole(r.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              role === r.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              category === c.value
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'border-border text-muted-foreground hover:border-muted-foreground'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4 animate-pulse">
              <div className="flex gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-1/3" />
                  <div className="h-2 bg-muted rounded w-1/5" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-cormorant text-xl text-muted-foreground">No hay publicaciones</p>
          <p className="text-sm text-muted-foreground mt-1">Sé el primero en compartir algo con la comunidad</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(post => (
            <PostCard
              key={post.id}
              post={post}
              userEmail={user?.email}
              likedIds={likedIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}