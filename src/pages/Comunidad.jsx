import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
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
  const navigate = useNavigate(); 
  const [activeTab, setActiveTab] = useState('raiz');
  const [activeSubTab, setActiveSubTab] = useState('perfiles');
  const [selectedRole, setSelectedRole] = useState('Todos');

  // Estados de datos
  const [miembros, setMiembros] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [ofertas, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [currentUser, setCurrentUser] = useState(null);
  const [followingIds, setFollowingIds] = useState(new Set());

  useEffect(() => {
    const loadComunidadData = async () => {
      setLoading(true);
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setCurrentUser(authUser);
        const myEmailClean = authUser?.email?.toLowerCase().trim() || '';

        // 1. Cargar miembros
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

        // 💡 SOLUCIÓN A: Cargar los seguimientos reales de la base de datos al arrancar
        if (myEmailClean) {
          const { data: follows } = await supabase
            .from('user_follows')
            .select('following_email')
            .eq('follower_email', myEmailClean);
          
          if (follows) {
            const followedEmails = new Set(follows.map(f => f.following_email?.toLowerCase().trim()).filter(Boolean));
            setFollowingIds(followedEmails);
          }
        }

      } catch (error) {
        console.error("Error sincronizando el ecosistema:", error);
      } finally {
        setLoading(false);
      }
    };
    loadComunidadData();
  }, []);

  // 💡 SOLUCIÓN B: Mutación asíncrona real en Supabase mapeada por correos electrónicos
  const toggleFollow = async (targetIdentifier) => {
    if (!currentUser || !targetIdentifier) return;
    
    const myEmailClean = currentUser.email?.toLowerCase().trim();
    const targetClean = targetIdentifier.toLowerCase().trim();
    
    const next = new Set(followingIds);
    const alreadyFollowing = next.has(targetClean);
    
    // UI Optimista: Cambiamos el botón al instante para que no tenga lag
    if (alreadyFollowing) {
      next.delete(targetClean);
    } else {
      next.add(targetClean);
    }
    setFollowingIds(next);
    
    if (alreadyFollowing) {
      // Dejar de seguir en la Base de Datos
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_email', myEmailClean)
        .eq('following_email', targetClean);
        
      if (error) {
        console.error("Error al dejar de seguir:", error);
        // Revertimos el estado si Supabase falla
        setFollowingIds(prev => {
          const reverted = new Set(prev);
          reverted.add(targetClean);
          return reverted;
        });
      }
    } else {
      // Guardar seguimiento real en la Base de Datos
      const { error } = await supabase
        .from('user_follows')
        .insert([{ follower_email: myEmailClean, following_email: targetClean }]);
        
      if (error) {
        console.error("Error al seguir:", error);
        // Revertimos el estado si Supabase falla
        setFollowingIds(prev => {
          const reverted = new Set(prev);
          reverted.delete(targetClean);
          return reverted;
        });
      }
    }
  };

  // Filtrados inteligentes
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

      {/* BOTONES PRINCIPALES GRANDES */}
      <div className="flex justify-center gap-3 mb-8">
        <button
          onClick={() => { setActiveTab('raiz'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-7 py-2.5 rounded-full text-sm font-medium tracking-wide transition-all duration-200 ${
            activeTab === 'raiz' 
              ? 'bg-[#3A5F43] text-white shadow-md font-semibold scale-102' 
              : 'bg-muted/60 text-muted-foreground border border-border/20 hover:bg-muted'
          }`}
        >
          <Users className="w-4 h-4" /> Raíz
        </button>
        <button
          onClick={() => { setActiveTab('empresas'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-7 py-2.5 rounded-full text-sm font-medium tracking-wide transition-all duration-200 ${
            activeTab === 'empresas' 
              ? 'bg-[#3A5F43] text-white shadow-md font-semibold scale-102' 
              : 'bg-muted/60 text-muted-foreground border border-border/20 hover:bg-muted'
          }`}
        >
          <Building className="w-4 h-4" /> Empresas
        </button>
      </div>

      {/* SUB-APARTADOS DE EMPRESAS */}
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
                // 💡 COMPROBACIÓN REPARADA: Evaluamos por su email limpio para sincronizar con el Feed
                const memberEmail = m.user_email?.toLowerCase().trim() || '';
                const isFollowing = followingIds.has(memberEmail);
                const initials = m.display_name?.slice(0, 2).toUpperCase() || 'W';
                return (
                  <div 
                    key={m.id} 
                    onClick={() => navigate(`/usuario/${m.id}`)}
                    className="p-4 bg-card border border-border rounded-2xl shadow-sm flex items-center justify-between transition-all hover:border-primary/20 hover:shadow-md cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border border-border flex-shrink-0 group-hover:border-primary/30 transition-colors">
                        {m.avatar_url ? (
                          <img src={m.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                        ) : (
                          <span className="text-xs font-bold text-primary">{initials}</span>
                        )}
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-foreground text-sm leading-tight group-hover:text-primary transition-colors">{m.display_name}</h3>
                        <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{m.role || 'Simpatizante'}</p>
                        {m.location && (
                          <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1 mt-1">
                            <MapPin className="w-2.5 h-2.5 text-primary" /> {m.location}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFollow(memberEmail); // Ejecutamos la acción real con su email
                      }}
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
          
          {/* Sub-Pestaña de Perfiles de Empresa */}
          {activeSubTab === 'perfiles' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredEmpresas.length > 0 ? (
                filteredEmpresas.map(emp => {
                  // 💡 COMPROBACIÓN REPARADA PARA EMPRESAS: Usamos su email o ID de respaldo
                  const companyIdentifier = (emp.email || emp.company_email || emp.id)?.toLowerCase().trim() || '';
                  const isFollowingCompany = followingIds.has(companyIdentifier); 
                  const initials = emp.name?.slice(0, 2).toUpperCase() || 'EM';
                  return (
                    <div 
                      key={emp.id} 
                      onClick={() => navigate(`/empresas/${emp.id}`)} 
                      className="p-4 bg-card border border-border rounded-2xl shadow-sm flex items-center justify-between transition-all hover:border-primary/20 hover:shadow-md cursor-pointer group animate-in fade-in duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/5 flex items-center justify-center border border-border flex-shrink-0">
                          {emp.logo_url ? (
                            <img src={emp.logo_url} className="w-full h-full object-cover" alt="logo de la empresa" />
                          ) : (
                            <span className="text-xs font-bold text-primary">{initials}</span>
                          )}
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-foreground text-sm leading-tight group-hover:text-primary transition-colors">{emp.name}</h3>
                          <p className="text-[11px] text-primary font-medium mt-0.5">Empresa Colaboradora</p>
                          <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1 mt-1">
                            <MapPin className="w-2.5 h-2.5 text-primary" /> {emp.location || 'Sede no definida'}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          toggleFollow(companyIdentifier); 
                        }} 
                        className={`flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-semibold border transition-all ${
                          isFollowingCompany 
                            ? 'bg-muted text-muted-foreground border-border' 
                            : 'bg-primary/5 text-primary border-primary/10 hover:bg-primary hover:text-white'
                        }`}
                      >
                        {isFollowingCompany ? <UserCheck className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                        {isFollowingCompany ? 'Siguiendo' : 'Seguir'}
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-muted-foreground italic text-center col-span-2 py-8 bg-card border border-dashed border-border rounded-2xl">No hay empresas registradas con ese criterio.</p>
              )}
            </div>
          )}

          {/* Sub-Pestaña de Ofertas de Trabajo */}
          {activeSubTab === 'ofertas' && (
            filteredOfertas.length > 0 ? (
              filteredOfertas.map(off => {
                const offerCompany = empresas.find(e => e.id === off.company_id);
                const logoUrl = offerCompany?.logo_url;
                const initials = off.company_name?.slice(0, 2).toUpperCase() || 'EM';

                return (
                  <div key={off.id} className="p-5 bg-card border border-border rounded-3xl shadow-sm flex items-start gap-4 text-left animate-in fade-in duration-200 hover:border-primary/20 transition-colors">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-primary/5 flex items-center justify-center border border-border flex-shrink-0 shadow-sm">
                      {logoUrl ? (
                        <img src={logoUrl} className="w-full h-full object-cover" alt={`Logo de ${off.company_name}`} />
                      ) : (
                        <span className="text-sm font-bold text-primary">{initials}</span>
                      )}
                    </div>

                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 bg-primary/5 text-primary border border-primary/10 rounded-md">
                          {off.type}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">publicado por <strong className="text-foreground">{off.company_name}</strong></span>
                      </div>
                      <h3 className="text-base font-semibold text-foreground leading-tight">{off.title}</h3>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-primary/70" /> {off.location}
                      </p>
                      <p className="text-sm text-foreground/80 pt-2 pb-1 leading-relaxed">{off.description}</p>
                      
                      {off.link_apply && (
                        <div className="pt-2 border-t border-border/50 mt-2">
                          <a href={off.link_apply} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                            Inscribirse u obtener detalles <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground italic text-center py-8 bg-card border border-dashed border-border rounded-2xl">No hay oportunidades disponibles en este momento.</p>
            )
          )}

        </div>
      )}

    </div>
  );
}