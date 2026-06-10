import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Search, PlusCircle, MapPin, Filter, Calendar, Clock } from 'lucide-react';
import CreateSchoolEventModal from './CreateSchoolEventModal';
import { Link, useNavigate } from 'react-router-dom';

const CATEGORIAS_EVENTOS = ['Todos', 'Puertas Abiertas', 'Taller', 'Charla', 'Fiesta', 'Mercadillo'];

export default function Colegios() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('directorio'); 
  const [search, setSearch] = useState('');
  const [eventoFiltro, setEventoFiltro] = useState('Todos'); 
  const [schools, setSchools] = useState([]);
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [currentUserSchool, setCurrentUserSchool] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: sData, error: sError } = await supabase.from('school_profiles').select('*');
      const { data: eData } = await supabase.from('school_events').select('*').order('created_date', { ascending: false });
      
      if (sError) console.error("Error cargando colegios:", sError);

      setSchools(sData || []);
      setEvents(eData || []);

      // Verificamos la sesión del usuario actual de forma segura
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: userSchool } = await supabase
          .from('school_profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();
        
        // Si no se localiza el perfil de colegio, userSchool vendrá como null
        setCurrentUserSchool(userSchool);
      } else {
        setCurrentUserSchool(null);
      }

      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredSchools = schools.filter(s => 
    (s.name?.toLowerCase().includes(search.toLowerCase()) || false) || 
    (s.location?.toLowerCase().includes(search.toLowerCase()) || false)
  );

  const filteredEvents = events.filter(e => {
    const coincideTexto = e.title.toLowerCase().includes(search.toLowerCase()) || e.school_name?.toLowerCase().includes(search.toLowerCase());
    const coincideCategoria = eventoFiltro === 'Todos' || 
                              e.event_type?.toLowerCase() === eventoFiltro.toLowerCase();
    return coincideTexto && coincideCategoria;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20 mt-6">
      {/* HEADER */}
      <div className="text-center mb-8">
        <h1 className="font-cormorant text-5xl font-semibold mb-2 text-foreground">Colegios Waldorf</h1>
        <p className="text-muted-foreground text-lg">Encuentra tu centro y descubre sus actividades</p>
      </div>

      {/* SELECTOR DE PESTAÑAS */}
      <div className="flex justify-center gap-4 mb-8 border-b border-border pb-4">
        <button 
          onClick={() => setActiveTab('directorio')}
          className={`px-8 py-2.5 rounded-full font-medium transition-all ${activeTab === 'directorio' ? 'bg-primary text-white shadow-md' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
        >
          Directorio de Centros
        </button>
        <button 
          onClick={() => setActiveTab('eventos')}
          className={`px-8 py-2.5 rounded-full font-medium transition-all ${activeTab === 'eventos' ? 'bg-primary text-white shadow-md' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
        >
          Tablón de Eventos
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="flex items-center gap-3 bg-card border border-border rounded-2xl px-6 py-3 shadow-sm mb-6 max-w-2xl mx-auto">
        <Search className="w-5 h-5 text-muted-foreground" />
        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          placeholder={activeTab === 'directorio' ? "Buscar colegio o ubicación..." : "Buscar eventos..."}
          className="bg-transparent flex-1 outline-none text-base"
        />
      </div>

      {activeTab === 'eventos' && (
        <div className="flex flex-wrap justify-center gap-2 mb-10 max-w-3xl mx-auto">
          <Filter className="w-4 h-4 text-muted-foreground mr-1 self-center" />
          {CATEGORIAS_EVENTOS.map(cat => (
            <button 
              key={cat}
              onClick={() => setEventoFiltro(cat)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all border ${eventoFiltro === cat ? 'bg-primary/10 text-primary border-primary/30 shadow-sm' : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* CONTENIDO */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground animate-pulse">Cargando centros educativos...</div>
      ) : activeTab === 'directorio' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in zoom-in duration-300">
          {filteredSchools.length > 0 ? (
            filteredSchools.map(school => (
              <Link to={`/colegios/${school.id}`} key={school.id} className="group bg-card border border-border rounded-3xl p-6 hover:border-primary/50 transition-all hover:shadow-lg flex flex-col">
                <div className="relative mb-6">
                  <img src={school.avatar_url || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=200&q=80'} className="w-24 h-24 rounded-2xl object-cover mx-auto bg-muted shadow-sm group-hover:scale-105 transition-transform" alt={school.name} />
                </div>
                <div className="text-center flex-1 flex flex-col">
                  <h3 className="text-xl font-semibold mb-1 text-foreground">{school.name}</h3>
                  <p className="text-primary text-sm flex items-center justify-center gap-1 mb-4">
                    <MapPin className="w-3.5 h-3.5" /> {school.location}
                  </p>
                  <p className="text-muted-foreground text-sm line-clamp-2 mb-6 flex-1">
                    {school.description || 'Sin descripción disponible.'}
                  </p>
                  <div className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 py-2.5 rounded-xl border border-primary/20 group-hover:bg-primary group-hover:text-white transition-colors">
                    Ver Perfil
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-12 col-span-3 bg-card rounded-3xl border border-border">
              <p className="text-muted-foreground">No se han encontrado colegios dados de alta.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* 💡 BLINDAJE ESTRICTO: Comprobamos la existencia real de la ID del perfil del colegio */}
          {currentUserSchool?.id && (
            <div className="flex justify-end mb-4">
               <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md hover:scale-105 transition-transform">
                 <PlusCircle className="w-4 h-4" /> Publicar Nuevo Evento
               </button>
            </div>
          )}
          
          {filteredEvents.length > 0 ? (
            filteredEvents.map(event => {
              const targetSchool = schools.find(s => s.id === event.school_id || s.name === event.school_name);
              const logoUrl = targetSchool?.avatar_url;
              const initials = (event.school_name || 'CL').slice(0, 2).toUpperCase();

              return (
                <div key={event.id} className="p-6 bg-card border border-border rounded-3xl shadow-sm text-left transition-all hover:border-primary/20">
                  
                  {/* CABECERA VINCULADA */}
                  <div 
                    onClick={() => targetSchool && navigate(`/colegios/${targetSchool.id}`)}
                    className="flex items-center gap-3 cursor-pointer group mb-4 inline-flex"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border border-border flex-shrink-0 group-hover:border-primary/40 transition-colors">
                      {logoUrl ? (
                        <img src={logoUrl} className="w-full h-full object-cover" alt="logo colegio" />
                      ) : (
                        <span className="text-xs font-bold text-primary">{initials}</span>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-foreground text-sm leading-tight group-hover:text-primary transition-colors">
                        {event.school_name || targetSchool?.name}
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/5 border border-primary/10 px-2 py-0.5 rounded-md mt-1 inline-block">
                        {event.event_type || 'Evento'}
                      </span>
                    </div>
                  </div>

                  {/* CONTENIDO REDIRIGIBLE */}
                  <Link to={`/eventos/${event.id}`} className="block group space-y-2">
                    <h2 className="font-cormorant text-2xl font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                      {event.title}
                    </h2>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {event.description}
                    </p>
                  </Link>

                  {/* METADATOS */}
                  <div className="flex flex-wrap gap-4 items-center justify-between pt-4 border-t border-border/50 mt-4 text-xs text-muted-foreground">
                    <div className="flex gap-4">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-primary/70" /> {event.date || 'Sin fecha'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-primary/70" /> {event.time || 'Sin hora'}
                      </span>
                    </div>
                  </div>

                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-card rounded-3xl border border-border">
              <p className="text-muted-foreground">No se han encontrado eventos de este tipo.</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <CreateSchoolEventModal 
          onClose={() => setShowModal(false)} 
          onCreated={() => window.location.reload()} 
          defaultSchoolName={currentUserSchool?.name || 'Mi Colegio'}
          defaultSchoolId={currentUserSchool?.id}
        />
      )}
    </div>
  );
}