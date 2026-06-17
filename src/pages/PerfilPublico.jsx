import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; 
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import PostCard from '@/components/PostCard';
import { MapPin, ArrowLeft, Loader2, MessageSquare } from 'lucide-react';

export default function PerfilPublico() {
  const { id } = useParams(); 
  const navigate = useNavigate(); 
  const { user } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [likedIds, setLikedIds] = useState(new Set());
  const [followingIds, setFollowingIds] = useState(new Set());

  const ROLE_LABELS = {
    alumno: 'Alumno',
    padre_madre: 'Padre / Madre',
    profesor: 'Profesor',
    exalumno: 'Exalumno',
    colegio: 'Colegio',
    simpatizante: 'Simpatizante',
  };

  useEffect(() => {
    const fetchPublicData = async () => {
      setLoading(true);
      
      const decodedId = decodeURIComponent(id).toLowerCase().trim();

      // 1️⃣ INTERCEPCIÓN DE EMPRESAS: Comprobamos si el ID o Email pertenece a una Empresa
      let compQuery = supabase.from('company_profiles').select('id');
      if (decodedId.includes('@')) {
        compQuery = compQuery.ilike('company_email', decodedId);
      } else {
        compQuery = compQuery.eq('id', decodedId);
      }
      const { data: compData } = await compQuery.maybeSingle();

      if (compData) {
        // 🚀 ¡Redirección maestra! Lo mandamos directo a tu CompanyProfile.jsx exclusivo
        navigate(`/empresas/${compData.id}`, { replace: true });
        return;
      }

      // 2️⃣ INTERCEPCIÓN DE COLEGIOS: Comprobamos si pertenece a un Colegio
      let schoolQuery = supabase.from('school_profiles').select('id');
      if (decodedId.includes('@')) {
        schoolQuery = schoolQuery.ilike('school_email', decodedId);
      } else {
        schoolQuery = schoolQuery.eq('id', decodedId);
      }
      const { data: schoolData } = await schoolQuery.maybeSingle();

      if (schoolData) {
        navigate(`/colegios/${schoolData.id}`, { replace: true });
        return;
      }

      // 3️⃣ VISTA DE PERSONAS: Si no es empresa ni colegio, cargamos el flujo de perfil humano habitual
      let query = supabase.from('profiles').select('*');
      if (decodedId.includes('@')) {
        query = query.ilike('user_email', decodedId);
      } else {
        query = query.eq('id', decodedId);
      }
      
      const { data: profileData } = await query.maybeSingle();

      if (profileData) {
        setProfile(profileData);
        
        const cleanEmail = profileData.user_email?.toLowerCase().trim();
        const myEmailClean = user?.email?.toLowerCase().trim() || '';
        
        if (cleanEmail) {
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
      }
      
      setLoading(false);
    };

    fetchPublicData();
  }, [id, user, navigate]);

  const handleContactar = async () => {
    if (!user?.email || !profile?.user_email) return;
    
    const emails = [user.email.toLowerCase().trim(), profile.user_email.toLowerCase().trim()].sort();
    
    const { data } = await supabase
      .from('chats')
      .upsert({ user_1_email: emails[0], user_2_email: emails[1] }, { onConflict: 'user_1_email,user_2_email' })
      .select()
      .single();

    if (data) {
      navigate('/hilo', { state: { activeChatId: data.id } }); 
    }
  };

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
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Volver
      </button>

      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="relative h-40 w-full bg-muted/50 border-b border-border/40">
          {profile.banner_url ? <img src={profile.banner_url} alt="Portada" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-r from-primary/10 to-primary/5" />}
        </div>

        <div className="p-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 relative gap-4 text-center sm:text-left">
            <div className="relative w-24 h-24 flex-shrink-0 -mt-12 mx-auto sm:mx-0">
              <div className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden border-4 border-card shadow-md bg-primary/10 border border-primary/20">
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="font-cormorant text-3xl font-bold text-primary">{initials}</span>}
              </div>
            </div>
            <div className="pt-2 sm:pt-0">
              <button onClick={handleContactar} className="flex items-center gap-2 text-xs bg-primary text-primary-foreground px-4 py-2 rounded-full font-medium hover:opacity-90 transition-opacity shadow-sm mx-auto sm:mx-0">
                <MessageSquare className="w-3.5 h-3.5" /> Contactar
              </button>
            </div>
          </div>

          <div className="space-y-2 text-center sm:text-left">
            <div>
              <h2 className="font-cormorant text-2xl font-bold text-foreground">{displayName}</h2>
              <p className="text-sm font-medium text-primary">{ROLE_LABELS[profile.role] || profile.role || 'Simpatizante'}</p>
            </div>
            {profile.location && <div className="flex items-center justify-center sm:justify-start gap-1 text-sm text-muted-foreground"><MapPin className="w-4 h-4" /> <span>{profile.location}</span></div>}
            {profile.bio ? <p className="text-sm text-muted-foreground pt-1 whitespace-pre-wrap">{profile.bio}</p> : <p className="text-sm text-muted-foreground/60 italic pt-1">Sin biografía disponible.</p>}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-cormorant text-xl font-bold text-foreground px-1">Publicaciones antiguas</h3>
        {userPosts.length === 0 ? (
          <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-8 text-center text-muted-foreground">Este usuario aún no ha publicado nada en el feed.</div>
        ) : (
          <div className="space-y-4">
            {userPosts.map(post => <PostCard key={`post-${post.id}`} post={post} userEmail={user?.email} likedIds={likedIds} followingIds={followingIds} onDeleted={(id) => setUserPosts(prev => prev.filter(p => p.id !== id))} />)}
          </div>
        )}
      </div>
    </div>
  );
}