import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import SchoolEventCard from '@/components/SchoolEventCard';
import { Search, PlusCircle, School, MapPin } from 'lucide-react';
import CreateSchoolEventModal from '@/components/CreateSchoolEventModal';
import { Link } from 'react-router-dom';

const EVENT_TYPES = [
  { value: 'todos', label: 'Todos' },
  { value: 'mercadillo', label: 'Mercadillo' },
  { value: 'fiesta_trimestral', label: 'Fiestas' },
  { value: 'obra_teatro', label: 'Teatro' },
  { value: 'jornada_puertas_abiertas', label: 'Puertas Abiertas' },
  { value: 'taller_familias', label: 'Talleres' },
  { value: 'festival', label: 'Festival' },
];

export default function Colegios() {
  const [activeTab, setActiveTab] = useState('eventos');
  const [user, setUser] = useState(null);

  const [events, setEvents] = useState([]);
  const [likedIds, setLikedIds] = useState(new Set());
  const [filter, setFilter] = useState('todos');
  const [searchEvents, setSearchEvents] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [schools, setSchools] = useState([]);
  const [searchSchoolName, setSearchSchoolName] = useState('');
  const [searchSchoolLocation, setSearchSchoolLocation] = useState('');
  const [loadingSchools, setLoadingSchools] = useState(true);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    setLoadingEvents(true);
    const { data: eventsData, error: eventsError } = await supabase
      .from('school_events')
      .select('*')
      .order('created_date', { ascending: false });

    if (eventsError) console.error("Error cargando eventos:", eventsError);
    setLikedIds(new Set());
    setEvents(eventsData || []);
    setLoadingEvents(false);

    setLoadingSchools(true);
    const { data: schoolsData, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name, location, description, avatar_url');

    if (schoolsError) console.error("Error cargando colegios:", schoolsError);
    setSchools(schoolsData || []);
    setLoadingSchools(false);
  };

  useEffect(() => { load(); }, []);

  const filteredEvents = events.filter(e => {
    const matchType = filter === 'todos' || e.event_type === filter;
    const matchSearch = !searchEvents || e.school_name?.toLowerCase().includes(searchEvents.toLowerCase()) || e.title?.toLowerCase().includes(searchEvents.toLowerCase());
    return matchType && matchSearch;
  });

  const filteredSchools = schools.filter((school) => {
    const matchesName = school.name.toLowerCase().includes(searchSchoolName.toLowerCase());
    const matchesLocation = school.location.toLowerCase().includes(searchSchoolLocation.toLowerCase());
    return matchesName && matchesLocation;
  });
  return (
    <div>
      <div className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-cormorant text-3xl font-semibold">Colegios Waldorf</h1>
          {activeTab === 'eventos' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Nuevo evento
            </button>
          )}
        </div>

        <div className="flex gap-4 border-b border-border pb-1">
          <button 
            onClick={() => setActiveTab('eventos')}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'eventos' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Tablón de Eventos
          </button>
          <button 
            onClick={() => setActiveTab('directorio')}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'directorio' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Directorio de Colegios
          </button>
        </div>
      </div>

      {activeTab === 'eventos' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 bg-muted/50 rounded-2xl px-4 py-2.5 mb-4">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              value={searchEvents}
              onChange={e => setSearchEvents(e.target.value)}
              placeholder="Buscar por colegio o título de evento..."
              className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
            {EVENT_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setFilter(t.value)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filter === t.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loadingEvents ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
                  <div className="h-40 bg-muted" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20">
              <School className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-cormorant text-xl text-muted-foreground">No hay eventos disponibles</p>
              <p className="text-sm text-muted-foreground mt-1">Los colegios publicarán sus eventos aquí</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map(event => (
                <SchoolEventCard
                  key={event.id}
                  event={event}
                  userEmail={user?.email}
                  likedIds={likedIds}
                />
              ))}
            </div>
          )}
        </div>
      )}
      {activeTab === 'directorio' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <div className="flex items-center gap-2 bg-muted/50 rounded-2xl px-4 py-2.5">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                value={searchSchoolName}
                onChange={e => setSearchSchoolName(e.target.value)}
                placeholder="Buscar colegio por nombre..."
                className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-2xl px-4 py-2.5">
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                value={searchSchoolLocation}
                onChange={e => setSearchSchoolLocation(e.target.value)}
                placeholder="Ubicación (Ej: Madrid)..."
                className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {loadingSchools ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-card rounded-2xl border border-border h-48 animate-pulse"></div>
              ))}
            </div>
          ) : filteredSchools.length === 0 ? (
            <div className="text-center py-20">
              <School className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-cormorant text-xl text-muted-foreground">No se encontraron colegios</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSchools.map((school) => (
                <div key={school.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
                  <div className="h-16 bg-muted"></div>
                  <div className="p-4 relative flex-1 flex flex-col">
                    <img 
                      src={school.avatar_url || 'https://via.placeholder.com/150'} 
                      alt={school.name}
                      className="w-16 h-16 rounded-full border-4 border-card absolute -top-8 left-4 object-cover bg-muted"
                    />
                    <div className="mt-8 mb-2">
                      <h2 className="font-semibold text-lg leading-tight">{school.name}</h2>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" /> {school.location}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{school.description}</p>
                    
                    <Link 
                      to={`/colegios/${school.id}`} 
                      className="block text-center bg-muted hover:bg-muted/80 text-foreground font-medium text-sm py-2.5 px-4 rounded-xl transition-colors"
                    >
                      Ver perfil
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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