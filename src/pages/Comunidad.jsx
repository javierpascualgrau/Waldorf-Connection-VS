import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Search, Users, MapPin, UserPlus, UserCheck, Loader2, Globe, Building2 } from 'lucide-react';
import ProfileSearch from '@/components/ProfileSearch';
import { Link } from 'react-router-dom';

const ROLES = [
  { value: 'todos', label: 'Todos' },
  { value: 'profesor', label: 'Profesores' },
  { value: 'alumno', label: 'Alumnos' },
  { value: 'padre_madre', label: 'Padres' },
  { value: 'exalumno', label: 'Exalumnos' },
  { value: 'colegio', label: 'Colegios' },
];

const ROLE_LABELS = {
  alumno: 'Alumno',
  padre_madre: 'Padre / Madre',
  profesor: 'Profesor',
  exalumno: 'Exalumno',
  colegio: 'Colegio',
  simpatizante: 'Simpatizante',
  empresa: 'Empresa',
};

export default function Comunidad() {
  const [profiles, setProfiles] = useState([]);
  const [followingEmails, setFollowingEmails] = useState(new Set());
  const [user, setUser] = useState(null);
  
  const [subTab, setSubTab] = useState('personas'); 
  const [roleFilter, setRoleFilter] = useState('todos');
  
  const [loading, setLoading] = useState(true);
  const [followLoadingId, setFollowLoadingId] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      const myEmailClean = authUser?.email?.toLowerCase().trim() || '';

      const [profilesRes, followsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        myEmailClean
          ? supabase.from('user_follows').select('following_email').eq('follower_email', myEmailClean)
          : Promise.resolve({ data: [], error: null })
      ]);

      if (profilesRes.data) {
        const filteredData = authUser?.id 
          ? profilesRes.data.filter(p => p.id !== authUser.id)
          : profilesRes.data;
        setProfiles(filteredData);
      }

      if (followsRes.data) {
        const emailsEnSeguimiento = new Set(followsRes.data.map(f => f.following_email?.toLowerCase().trim()));
        setFollowingEmails(emailsEnSeguimiento);
      }

      setLoading(false);
    };
    load();
  }, []);

  const handleFollowToggle = async (profileEmail) => {
    if (!user?.email || !profileEmail || followLoadingId) return;

    const follower = user.email.toLowerCase().trim();
    const followed = profileEmail.toLowerCase().trim();
    const isCurrentlyFollowing = followingEmails.has(followed);

    setFollowLoadingId(profileEmail);

    if (isCurrentlyFollowing) {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_email', follower)
        .eq('following_email', followed);

      if (!error) {
        setFollowingEmails(prev => {
          const next = new Set(prev);
          next.delete(followed);
          return next;
        });
      } else {
        console.error("Error al dejar de seguir:", error);
        alert("No se pudo procesar la solicitud en la base de datos.");
      }
    } else {
      const { error } = await supabase
        .from('user_follows')
        .insert([{ follower_email: follower, following_email: followed }]);

      if (!error) {
        setFollowingEmails(prev => {
          const next = new Set(prev);
          next.add(followed);
          return next;
        });
      } else {
        console.error("Error al seguir:", error);
        alert("No se pudo guardar el seguimiento en la base de datos.");
      }
    }
    setFollowLoadingId(null);
  };

  const filteredProfiles = profiles.filter(p => {
    if (subTab === 'empresas') {
      return p.role === 'empresa';
    } else {
      if (p.role === 'empresa') return false;
      return roleFilter === 'todos' || p.role === roleFilter;
    }
  });

  return (
    <div>
      {/* Header y Selector Centrado */}
      <div className="flex flex-col items-center text-center mb-8 pt-4">
        <h1 className="font-cormorant text-4xl font-bold mb-2 text-foreground">Comunidad</h1>
        <p className="text-base text-muted-foreground mb-6">Conecta con la comunidad Waldorf</p>

        {/* Píldora de navegación */}
        <div className="bg-muted/60 p-1.5 rounded-full inline-flex items-center border border-border/60 shadow-inner">
          <button
            onClick={() => setSubTab('personas')}
            className={`flex items-center gap-2 px-7 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
              subTab === 'personas' 
                ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            {/* 💡 CAMBIO AQUÍ: De "Mi Red" a "Raíz" */}
            Raíz
          </button>
          
          <button
            onClick={() => setSubTab('empresas')}
            className={`flex items-center gap-2 px-7 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
              subTab === 'empresas' 
                ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Empresas
          </button>
        </div>
      </div>

      {/* Buscador Avanzado */}
      <div className="mb-6 relative z-50">
        <ProfileSearch />
      </div>

      {/* Role filter (Solo se muestra en la pestaña de Personas) */}
      {subTab === 'personas' && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {ROLES.map(r => (
            <button
              key={r.value}
              onClick={() => setRoleFilter(r.value)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                roleFilter === r.value 
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {/* Grid de Perfiles interactivos */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4 animate-pulse">
              <div className="w-14 h-14 rounded-full bg-muted flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-3xl border border-border/50 border-dashed">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-cormorant text-xl text-muted-foreground">
            {subTab === 'empresas' ? 'Aún no hay empresas registradas' : 'No hay perfiles en esta categoría'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredProfiles.map(profile => {
            const displayName = profile.display_name || profile.full_name || 'Miembro';
            const initials = displayName.slice(0, 2).toUpperCase();
            
            const profileEmailClean = (profile.user_email || profile.email)?.toLowerCase().trim();
            const isCurrentlyFollowing = followingEmails.has(profileEmailClean);
            const isButtonLoading = followLoadingId === profileEmailClean;

            return (
              <div key={profile.id} className="bg-card rounded-2xl border border-border p-4 hover:shadow-md hover:border-primary/20 transition-all flex justify-between items-start gap-3">
                
                {/* Contenedor izquierdo enlace */}
                <Link 
                  to={`/usuario/${profile.id}`} 
                  className="flex items-start gap-4 flex-1 min-w-0 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
                    profile.role === 'empresa' ? 'bg-indigo-100 border-2 border-indigo-200' : 'bg-primary/10 border border-primary/20'
                  }`}>
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className={`font-cormorant text-xl font-bold ${profile.role === 'empresa' ? 'text-indigo-600' : 'text-primary'}`}>
                        {initials}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <h3 className="font-semibold text-foreground truncate text-base">{displayName}</h3>
                    <p className={`text-xs font-medium mb-1 ${profile.role === 'empresa' ? 'text-indigo-600' : 'text-primary'}`}>
                      {ROLE_LABELS[profile.role] || profile.role || 'Simpatizante'}
                    </p>
                    
                    {profile.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5 truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{profile.location}</span>
                      </div>
                    )}

                    {profile.company_website && (
                      <a 
                        href={profile.company_website.startsWith('http') ? profile.company_website : `https://${profile.company_website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()} 
                        className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 hover:underline mb-2 truncate w-fit relative z-10"
                      >
                        <Globe className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{profile.company_website.replace(/^https?:\/\//, '')}</span>
                      </a>
                    )}

                    {profile.interests && profile.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {profile.interests.slice(0, 2).map((interest, idx) => (
                          <span key={idx} className="text-[9px] uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded-md">
                            {interest}
                          </span>
                        ))}
                        {profile.interests.length > 2 && (
                          <span className="text-[9px] uppercase bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded-md">
                            +{profile.interests.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>

                {/* Botón de seguir */}
                {profileEmailClean && (
                  <button
                    onClick={() => handleFollowToggle(profileEmailClean)}
                    disabled={isButtonLoading}
                    className={`flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all flex-shrink-0 shadow-sm border mt-1 relative z-10 ${
                      isCurrentlyFollowing 
                        ? 'bg-primary/10 text-primary border-primary/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30' 
                        : 'bg-muted text-muted-foreground border-transparent hover:bg-primary hover:text-primary-foreground'
                    }`}
                  >
                    {isButtonLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isCurrentlyFollowing ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Siguiendo</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Seguir</span>
                      </>
                    )}
                  </button>
                )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}