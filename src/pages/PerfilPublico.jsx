import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext'; // 1. IMPORTAMOS EL CONTEXTO DE AUTH
import PostCard from '@/components/PostCard'; // 2. REUTILIZAMOS TU COMPONENTE POSTCARD
import { MapPin, ArrowLeft, Loader2, MessageSquare } from 'lucide-react';

export default function PerfilPublico() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const { user } = useAuth(); // Obtenemos el usuario logueado en la app
  
  const [profile, setProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para que los likes y seguidos funcionen de forma interactiva aquí dentro
  const [likedIds, setLikedIds] = useState(new Set());
  const [followingIds, setFollowingIds] = useState(new Set());

  const ROLE_LABELS = {
    alumno: 'Alumno',
    padre_madre: 'Padre / Madre',
    profesor: 'Profesor',
    exalumno: 'Exalumno',
    colegio: 'Colegio',
    simpatizante: 'Simpatizante',
    empresa: 'Empresa',
  };

  useEffect(() => {
    const fetchPublicData = async () => {
      setLoading(true);
      
      const decodedId = decodeURIComponent(id);
      let query = supabase.from('profiles').select('*');
      
      if (decodedId.includes('@')) {
        query = query.ilike('user_email', decodedId);
      } else {
        query = query.eq('id', decodedId);
      }
      
      const { data: profileData, error: profileErr } = await query.maybeSingle();

      if (profileData) {
        setProfile(profileData);
        
        const cleanEmail = profileData.user_email?.toLowerCase().trim();
        const myEmailClean = user?.email?.toLowerCase().trim() || '';
        
        if (cleanEmail) {
          // Lanzamos en paralelo la carga de posts, likes y seguidos del usuario actual
          const [postsRes, followsRes, likesRes] = await Promise.all([
            supabase.from('posts').select('*').ilike('author_email', cleanEmail).order('created_date', { ascending: false }),
            myEmailClean ? supabase.from('user_follows').select('following_email').eq('follower_email', myEmailClean) : Promise.resolve({ data: [] }),
            myEmailClean ? supabase.from('post_likes').select('post_id').eq('user_email', myEmailClean) : Promise.resolve({ data: [] })
          ]);

          if (postsRes.data) setUserPosts(postsRes.data);
          
          if (followsRes.data) {
            const emailsEnSeguimiento = new Set(followsRes.data.map(f => f.following_email?.toLowerCase().trim()));
            setFollowingIds(emailsEnSeguimiento);
          }

          if (likesRes.data) {
            const idsConLike = new Set(likesRes.data.map(l => String(l.post_id)));
            setLikedIds(idsConLike);
          }
        }
      } else {
        console.error("Error al cargar perfil:", profileErr);
      }
      
      setLoading(false);
    };

    fetchPublicData();
  }, [id, user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No se encontró el usuario solicitado.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-primary font-medium hover:underline flex items-center gap-2 mx-auto">
          <ArrowLeft className="w-4 h-4" /> Volver atrás
        </button>
      </div>
    );
  }

  const displayName = profile.display_name || profile.full_name || 'Miembro';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Volver
      </button>

      {/* Tarjeta del perfil */}
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
            profile.role === 'empresa' ? 'bg-indigo-100 border-2 border-indigo-200' : 'bg-primary/10 border border-primary/20'
          }`}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className={`font-cormorant text-3xl font-bold ${profile.role === 'empresa' ? 'text-indigo-600' : 'text-primary'}`}>
                {initials}
              </span>
            )}
          </div>

          <div className="flex-1 space-y-2 min-w-0">
            <div>
              <h2 className="font-cormorant text-2xl font-bold text-foreground">{displayName}</h2>
              <p className={`text-sm font-medium ${profile.role === 'empresa' ? 'text-indigo-600' : 'text-primary'}`}>
                {ROLE_LABELS[profile.role] || profile.role || 'Simpatizante'}
              </p>
            </div>

            {profile.location && (
              <div className="flex items-center justify-center sm:justify-start gap-1 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>{profile.location}</span>
              </div>
            )}

            {profile.bio ? (
              <p className="text-sm text-muted-foreground pt-1 whitespace-pre-wrap">{profile.bio}</p>
            ) : (
              <p className="text-sm text-muted-foreground/60 italic pt-1">Sin biografía disponible.</p>
            )}

            <div className="pt-2">
              <button 
                onClick={() => alert("El sistema de mensajería estará disponible próximamente 🚀")}
                className="flex items-center gap-2 text-xs bg-primary text-primary-foreground px-4 py-2 rounded-full font-medium hover:opacity-90 transition-opacity shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Contactar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Listado de publicaciones */}
      <div className="space-y-4">
        <h3 className="font-cormorant text-xl font-bold text-foreground px-1">Publicaciones antiguas</h3>
        
        {userPosts.length === 0 ? (
          <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-8 text-center text-muted-foreground">
            Este usuario aún no ha publicado nada en el feed.
          </div>
        ) : (
          <div className="space-y-4">
            {userPosts.map(post => (
              /* 3. SUSTITUIMOS EL DIV VIEJO POR TU COMPONENTE ORIGINAL CONECTADO */
              <PostCard
                key={`post-${post.id}`}
                post={post}
                userEmail={user?.email}
                likedIds={likedIds}
                followingIds={followingIds}
                onDeleted={(id) => setUserPosts(prev => prev.filter(p => p.id !== id))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}