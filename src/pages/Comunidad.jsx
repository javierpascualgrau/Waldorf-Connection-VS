import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Search, MapPin, Users, Building, Briefcase, GraduationCap, Heart, ExternalLink, Globe, ArrowRight, UserCheck, UserPlus } from 'lucide-react';

const ROLE_FILTERS = [
  { label: 'Todos', value: 'Todos' },
  { label: 'Profesores', value: 'profesor' },
  { label: 'Alumnos', value: 'alumno' },
  { label: 'Padres', value: 'padre_madre' },
  { label: 'Exalumnos', value: 'exalumno' },
  { label: 'Colegios', value: 'colegio' }
];

export default function Comunidad() {
  const [activeTab, setActiveTab] = useState('raiz');
  
  // 💡 CORREGIDO: Ahora 'perfiles' (Empresas) es la pestaña por defecto al entrar
  const [activeSubTab, setActiveSubTab] = useState('perfiles');
  const [selectedRole, setSelectedRole] = useState('Todos');

  // Estados de datos
  const [miembros, setMiembros] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [ofertas, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 💡 NUEVO ESTADO: Guarda el usuario que está logueado actualmente
  const [currentUser, setCurrentUser] = useState(null);
  const [followingIds, setFollowingIds] = useState(new Set());

  useEffect(() => {
    const loadComunidadData = async () => {
      setLoading(true);
      try {
        // 💡 Recuperamos el usuario de la sesión actual
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setCurrentUser(authUser);

        // 1. Cargar los miembros de la comunidad
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .order('display_name', { ascending: true });
        setMiembros(profiles || []);

        // 2. Cargar perfiles de empresas
        const { data: companies } = await supabase
          .from('company_profiles')
          .select('*')
          .order('name', { ascending: true });
        setEmpresas(companies || []);

        // 3. Cargar ofertas
        const { data: offers } = await supabase
          .from('company_offers')
          .select('*')
          .order('created_at', { ascending: false });
        setOffers(offers || []);

      } catch (error) {
        console.error("Error sincronizando el ecosistema:", error);
      } finally {
        setLoading(false);
      }
    };
    loadComunidadData();
  }, []);

  const toggleFollow = (id) => {
    const next = new Set(followingIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFollowingIds(next);
  };

  const getOfferIcon = (type) => {
    if (type === 'Prácticas') return <GraduationCap className="w-4 h-4 text-amber-600" />;
    if (type === 'Voluntariado') return <Heart className="w-4 h-4 text-emerald-600" />;
    return <Briefcase className="w-4 h-4 text-blue-600" />;
  };

  // 🔍 Lógica de Filtrado Raíz: ¡Excluimos al usuario logueado con m.id !== currentUser?.id!
  const filteredMiembros = miembros.filter(m => {
    const isNotMe = m.id !== currentUser?.id;
    const matchesSearch = m.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) || m.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'Todos' || m.role === selectedRole;
    return isNotMe && matchesSearch && matchesRole;
  });

  const filteredOfertas = ofertas.filter(o => 
    o.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEmpresas = empresas.filter(e => 
    e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="p-10 text-center animate-pulse text-muted-foreground">Sincronizando comunidad...</div>;

  return (
    <div className="max-w-3xl mx-auto pb-20 animate-in fade-in duration-300">
      
      {/* ENCABEZADO */}
      <div className="text-center my-6 space-y-1">
        <h1 className="font-cormorant text-4xl font-semibold text-foreground tracking-wide">Comunidad</h1>
        <p className="text-sm text-muted-foreground">Conecta con la comunidad Waldorf</p>
      </div>

      {/* SELECTOR DE PESTAÑAS PRINCIPALES */}
      <div className="flex justify-center gap-2 mb-6">
        <button
          onClick={() => { setActiveTab('raiz'); setSearchQuery(''); }}
          className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
            activeTab === 'raiz' 
              ? 'bg-primary text-white shadow-md' 
              : 'bg-muted/60 text-muted-foreground border border-border/20 hover:bg-muted'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Raíz
        </button>
        <button
          onClick={() => { setActiveTab('empresas'); setSearchQuery(''); }}
          className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
            activeTab === 'empresas' 
              ? 'bg-primary text-white shadow-md' 
              : 'bg-muted/60 text-muted-foreground border border-border/20 hover:bg-muted'
          }`}
        >
          <Building className="w-3.5 h-3.5" /> Empresas
        </button>
      </div>

      {/* 💡 SUB-APARTADOS DE EMPRESAS ORDENADOS: Perfiles (Izquierda) | Ofertas (Derecha) */}
      {activeTab === 'empresas' && (
        <div className="flex gap-2 mb-6 bg-muted/40 p-1 rounded-2xl max-w-xs mx-auto border border-border/40">
          <button
            onClick={() => { setActiveSubTab('perfiles'); setSearchQuery(''); }}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'perfiles' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building className="w-3.5 h-3.5" /> Perfiles de Empresa
          </button>
          <button
            onClick={() => { setActiveSubTab('ofertas'); setSearchQuery(''); }}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'ofertas' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" /> Ofertas de Trabajo
          </button>
        </div>
      )}

      {/* BUSCADOR DINÁMICO */}
      <div className="relative mb-6 max-w-2xl mx-auto">
        <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground/60" />
        <input
          type="text"
          placeholder={activeTab === 'raiz' ? "Buscar personas en la comunidad..." : activeSubTab === 'ofertas' ? "Buscar por puesto o empresa..." : "Buscar empresas..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-muted/30 border border-border/60 rounded-2xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
        />
      </div>

      {/* 👤 CONTENIDO DE PESTAÑA RAÍZ */}
      {activeTab === 'raiz' && (
        <>
          <div className="flex flex-wrap gap-1.5 mb-6 justify-start overflow-x-auto pb-1">
            {ROLE_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setSelectedRole(f.value)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  selectedRole === f.value
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-muted/40 text-muted-foreground border-border/40 hover:border-border'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredMiembros.length > 0 ? (
              filteredMiembros.map(m => {
                const isFollowing = followingIds.has(m.id);
                const initials = m.display_name?.slice(0, 2).toUpperCase() || 'W';
                return (
                  <div key={m.id} className="p-4 bg-card border border-border rounded-2xl shadow-sm flex items-center justify-between transition-all hover:border-primary/10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border border-border flex-shrink-0">
                        {m.avatar_url ? (
                          <img src={m.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                        ) : (
                          <span className="text-xs font-bold text-primary">{initials}</span>
                        )}
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-foreground text-sm leading-tight">{m.display_name}</h3>
                        <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{m.role || 'Simpatizante'}</p>
                        {m.location && (
                          <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1 mt-1">
                            <MapPin className="w-2.5 h-2.5 text-primary" /> {m.location}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => toggleFollow(m.id)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-semibold border transition-all ${
                        isFollowing 
                          ? 'bg-muted text-muted-foreground border-border' 
                          : 'bg-primary/5 text-primary border-primary/10 hover:bg-primary hover:text-white'
                      }`}
                    >
                      {isFollowing ? <UserCheck className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                      {isFollowing ? 'Siguiendo' : 'Seguir'}
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground italic text-center col-span-2 py-6">No hay otros perfiles en este momento.</p>
            )}
          </div>
        </>
      )}

      {/* 💼 CONTENIDO DE PESTAÑA EMPRESAS */}
      {activeTab === 'empresas' && (
        <div className="space-y-4">
          
          {/* Sub-Pestaña Izquierda: Perfiles de Empresa */}
          {activeSubTab === 'perfiles' && (
            filteredEmpresas.length > 0 ? (
              filteredEmpresas.map(emp => (
                <div key={emp.id} className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden flex flex-col sm:flex-row text-left animate-in fade-in duration-200">
                  <div className="sm:w-32 h-24 sm:h-auto bg-muted relative flex-shrink-0">
                    <img src={emp.banner_url || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab'} className="w-full h-full object-cover" alt="banner" />
                    <div className="absolute -bottom-6 left-4 sm:top-4 sm:left-4 w-12 h-12 rounded-xl border-2 border-card bg-card overflow-hidden shadow">
                      <img src={emp.logo_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3'} className="w-full h-full object-cover" alt="logo" />
                    </div>
                  </div>

                  <div className="p-5 pt-8 sm:pt-5 flex-1 space-y-2">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{emp.name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {emp.location || 'Sede no definida'}</p>
                    </div>
                    <p className="text-xs text-foreground/70 leading-relaxed line-clamp-2">{emp.description || 'Sin descripción corporativa.'}</p>
                    
                    {emp.waldorf_connection && (
                      <p className="text-[11px] text-primary bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10 italic">
                        Unión Waldorf: "{emp.waldorf_connection}"
                      </p>
                    )}

                    {emp.website && (
                      <div className="pt-1 flex justify-end">
                        <a href={emp.website} target="_blank" rel="noreferrer" className="text-xs font-bold text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                          <Globe className="w-3 h-3" /> Sitio Web <ArrowRight className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic text-center py-8 bg-card border border-dashed border-border rounded-2xl">No hay empresas registradas con ese criterio.</p>
            )
          )}

          {/* Sub-Pestaña Derecha: Ofertas de Trabajo */}
          {activeSubTab === 'ofertas' && (
            filteredOfertas.length > 0 ? (
              filteredOfertas.map(off => (
                <div key={off.id} className="p-5 bg-card border border-border rounded-3xl shadow-sm flex items-start gap-4 text-left animate-in fade-in duration-200">
                  <div className="p-2.5 bg-muted rounded-2xl border border-border/40 shadow-sm flex-shrink-0">
                    {getOfferIcon(off.type)}
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 bg-primary/5 text-primary border border-primary/10 rounded-md">{off.type}</span>
                      <span className="text-xs font-medium text-muted-foreground">publicado por <strong className="text-foreground">{off.company_name}</strong></span>
                    </div>
                    <h3 className="text-base font-semibold text-foreground pt-0.5">{off.title}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {off.location}</p>
                    <p className="text-sm text-foreground/70 pt-2 leading-relaxed">{off.description}</p>
                    
                    {off.link_apply && (
                      <div className="pt-2">
                        <a href={off.link_apply} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                          Inscribirse u obtener detalles <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic text-center py-8 bg-card border border-dashed border-border rounded-2xl">No hay oportunidades disponibles en este momento.</p>
            )
          )}

        </div>
      )}

    </div>
  );
}