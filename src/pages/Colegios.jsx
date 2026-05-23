import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import SchoolEventCard from '@/components/SchoolEventCard';
import { Search, PlusCircle, School, MapPin } from 'lucide-react';
import CreateSchoolEventModal from '@/components/CreateSchoolEventModal';
import { Link } from 'react-router-dom';

// Colegios de prueba que me has pedido con sus fotos e información inventada
const MOCK_COLEGIOS = [
  {
    id: 'micael-id-prueba',
    name: 'Escuela Libre Micael',
    location: 'Las Rozas, Madrid',
    description: 'Colegio Waldorf pionero enfocado en el desarrollo integral, talleres artísticos y un entorno rodeado de naturaleza.',
    avatar_url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'aravaca-id-prueba',
    name: 'Waldorf Aravaca',
    location: 'Aravaca, Madrid',
    description: 'Espacio educativo basado en la pedagogía activa, el respeto al ritmo del niño y el aprendizaje vivencial.',
    avatar_url: 'https://images.unsplash.com/photo-1595250924457-39d4442dfc70?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'artaban-id-prueba',
    name: 'Artabán',
    location: 'Torrelodones, Madrid',
    description: 'Comunidad educativa Waldorf en la sierra, comprometida con el arte, el huerto escolar y el pensamiento libre.',
    avatar_url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=200&q=80'
  }
];

export default function Colegios() {
  const [user, setUser] = useState(null);

  // Estados de Eventos (Columna derecha)
  const [events, setEvents] = useState([]);
  const [likedIds, setLikedIds] = useState(new Set());
  const [searchEventLocation, setSearchEventLocation] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Estados de Colegios (Columna principal)
  const [schools, setSchools] = useState([]);
  const [searchSchoolName, setSearchSchoolName] = useState('');
  const [searchSchoolLocation, setSearchSchoolLocation] = useState('');
  const [loadingSchools, setLoadingSchools] = useState(true);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    // Cargar Eventos reales de la base de datos
    setLoadingEvents(true);
    const { data: eventsData, error: eventsError } = await supabase
      .from('school_events')
      .select('*')
      .order('created_date', { ascending: false });

    if (eventsError) console.error("Error cargando eventos:", eventsError);
    setLikedIds(new Set());
    setEvents(eventsData || []);
    setLoadingEvents(false);

    // Cargar Colegios de la base de datos y fusionar con los de prueba
    setLoadingSchools(true);
    const { data: schoolsData, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name, location, description, avatar_url');

    if (schoolsError) console.error("Error cargando colegios:", schoolsError);
    
    // Aquí juntamos los 3 colegios de prueba con los que vengan de Supabase
    const dbSchools = schoolsData || [];
    setSchools([...MOCK_COLEGIOS, ...dbSchools]);
    setLoadingSchools(false);
  };

  useEffect(() => { load(); }, []);

  // Filtro para el tablón de eventos (por ubicación)
  const filteredEvents = events.filter(e => {
    return !searchEventLocation || e.school_name?.toLowerCase().includes(searchEventLocation.toLowerCase());
  });

  // Filtro para el directorio principal (por nombre y ubicación)
  const filteredSchools = schools.filter((school) => {
    const matchesName = school.name.toLowerCase().includes(searchSchoolName.toLowerCase());
    const matchesLocation = school.location.toLowerCase().includes(searchSchoolLocation.toLowerCase());
    return matchesName && matchesLocation;
  });
  return (
    <div className="max-w-7xl mx-auto px-1">
      {/* TÍTULO GENERAL DE LA PÁGINA */}
      <div className="mb-6">
        <h1 className="font-cormorant text-4xl font-semibold text-foreground">Comunidad de Colegios</h1>
        <p className="text-sm text-muted-foreground mt-1">Explora los centros educativos y sus últimas novedades</p>
      </div>

      {/* REJILLA PRINCIPAL DE DOS COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ========================================================
            COLUMNA IZQUIERDA (2/3): DIRECTORIO PRINCIPAL DE COLEGIOS
            ======================================================== */}
        <div className="lg:col-span-2 space-y-6">
          <div className="border-b border-border pb-2">
            <h2 className="text-xl font-medium text-foreground flex items-center gap-2">
              <School className="w-5 h-5 text-primary" /> Centros Educativos
            </h2>
          </div>

          {/* Buscadores de Colegios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 bg-muted/50 rounded-2xl px-4 py-2.5 border border-border/40">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                value={searchSchoolName}
                onChange={e => setSearchSchoolName(e.target.value)}
                placeholder="Buscar colegio por nombre..."
                className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-2xl px-4 py-2.5 border border-border/40">
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                value={searchSchoolLocation}
                onChange={e => setSearchSchoolLocation(e.target.value)}
                placeholder="Filtrar por municipio o ubicación..."
                className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Mapeo de Tarjetas de Colegios */}
          {loadingSchools ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-card rounded-2xl border border-border h-48 animate-pulse" />
              ))}
            </div>
          ) : filteredSchools.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-border">
              <School className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No se han encontrado colegios con esos filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSchools.map((school) => (
                <div key={school.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow">
                  {/* Foto de portada inventada usando un degradado estético */}
                  <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/5 to-muted"></div>
                  <div className="p-4 relative flex-1 flex flex-col">
                    <img 
                      src={school.avatar_url} 
                      alt={school.name}
                      className="w-14 h-14 rounded-2xl border-4 border-card absolute -top-7 left-4 object-cover shadow-sm bg-muted"
                    />
                    <div className="mt-7 mb-2">
                      <h3 className="font-semibold text-base leading-tight text-foreground">{school.name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-primary" /> {school.location}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4 flex-1">{school.description}</p>
                    
                    <Link 
                      to={`/colegios/${school.id}`} 
                      className="block text-center bg-muted hover:bg-muted/80 text-foreground font-medium text-xs py-2 px-4 rounded-xl transition-colors border border-border/40"
                    >
                      Ver perfil completo
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ========================================================
            COLUMNA DERECHA (1/3): TABLÓN DE EVENTOS SECUNDARIO
            ======================================================== */}
        <div className="space-y-4 border-l border-border/60 pl-0 lg:pl-6">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="text-lg font-medium text-foreground">Tablón de Anuncios</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Publicar
            </button>
          </div>

          {/* Filtro de ubicación para eventos */}
          <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-1.5 border border-border/30">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              value={searchEventLocation}
              onChange={e => setSearchEventLocation(e.target.value)}
              placeholder="Filtrar eventos por zona..."
              className="bg-transparent text-xs flex-1 focus:outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Listado vertical de Eventos */}
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin">
            {loadingEvents ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="bg-card rounded-xl h-24 border border-border animate-pulse" />
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-10 bg-muted/20 rounded-xl border border-dashed border-border">
                <p className="text-xs text-muted-foreground">No hay eventos en esta zona</p>
              </div>
            ) : (
              filteredEvents.map(event => (
                <div key={event.id} className="transform scale-95 origin-top-left">
                  <SchoolEventCard
                    event={event}
                    userEmail={user?.email}
                    likedIds={likedIds}
                  />
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* MODAL DE CREACIÓN */}
      {showCreateModal && (
        <CreateSchoolEventModal
          user={user}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); load(); }}
        />
      )}
    </div>
  );
}