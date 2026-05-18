import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Search, Users, MapPin, UserPlus } from 'lucide-react';
import ProfileSearch from '@/components/ProfileSearch'; // Corregido el acceso con el alias @/components

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
};

export default function Comunidad() {
  const [profiles, setProfiles] = useState([]);
  const [user, setUser] = useState(null);
  const [roleFilter, setRoleFilter] = useState('todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      // Pedimos todos los perfiles de la base de datos (menos el tuyo propio para no salirte a ti mismo)
      let query = supabase.from('profiles').select('*');
      if (authUser?.id) {
        query = query.neq('id', authUser.id);
      }

      const { data: profilesData, error } = await query;

      if (error) {
        console.error("Error cargando perfiles:", error);
      } else {
        setProfiles(profilesData || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  // Filtrado por botones de rol
  const filteredProfiles = profiles.filter(p => {
    return roleFilter === 'todos' || p.role === roleFilter;
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-cormorant text-3xl font-semibold mb-1">Mi Red</h1>
          <p className="text-sm text-muted-foreground">Conecta con la comunidad Waldorf</p>
        </div>
      </div>

      {/* Buscador Avanzado (El que trajimos de Layout) */}
      <div className="mb-6 relative z-50">
        <ProfileSearch />
      </div>

      {/* Role filter */}
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

      {/* Grid de Perfiles (Tipo LinkedIn) */}
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
          <p className="font-cormorant text-xl text-muted-foreground">No hay perfiles en esta categoría</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredProfiles.map(profile => {
            const displayName = profile.display_name || profile.full_name || 'Miembro';
            const initials = displayName.slice(0, 2).toUpperCase();
            
            return (
              <div key={profile.id} className="bg-card rounded-2xl border border-border p-4 hover:shadow-md hover:border-primary/20 transition-all flex items-start gap-4">
                
                {/* Avatar */}
                <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-cormorant text-xl font-bold text-primary">{initials}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate text-base">{displayName}</h3>
                  <p className="text-xs text-primary font-medium mb-1">
                    {ROLE_LABELS[profile.role] || profile.role || 'Simpatizante'}
                  </p>
                  
                  {profile.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{profile.location}</span>
                    </div>
                  )}

                  {/* Intereses en chips pequeñitos */}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}