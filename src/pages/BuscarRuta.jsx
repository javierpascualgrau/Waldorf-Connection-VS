import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { getMemberIdentity } from '@/lib/identity';
import { ArrowLeft, MapPin, ArrowLeftRight, Users, Clock, MessageCircle, UserPlus, Compass, Check, X as XIcon } from 'lucide-react';
import CreateSchoolRouteModal from '@/components/CreateSchoolRouteModal';
import { goBack } from '@/lib/navigation';

const TRIP_TYPE_FILTERS = [
  { label: 'Todos', value: '' },
  { label: 'Ida', value: 'ida' },
  { label: 'Vuelta', value: 'vuelta' },
  { label: 'Ida y vuelta', value: 'ambos' },
];

const TRIP_TYPE_LABELS = { ida: 'Ida', vuelta: 'Vuelta', ambos: 'Ida y vuelta' };

export default function BuscarRuta() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [schools, setSchools] = useState([]);

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [tripType, setTripType] = useState('');
  const [seatsNeeded, setSeatsNeeded] = useState('');

  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [requestingRouteId, setRequestingRouteId] = useState(null);
  const [joinRequestRouteId, setJoinRequestRouteId] = useState(null);
  const [zonaDraft, setZonaDraft] = useState('');
  const [requestedRouteIds, setRequestedRouteIds] = useState(new Set());

  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
      if (authUser) setIdentity(await getMemberIdentity(authUser.id));

      const { data } = await supabase.from('school_profiles').select('id, name').order('name', { ascending: true });
      setSchools(data || []);
    };
    init();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) return;

    setSearching(true);
    setError('');
    setSearched(true);

    const { data, error: fnError } = await supabase.functions.invoke('search-school-routes', {
      body: {
        origin,
        destination,
        departure_time: departureTime || undefined,
        trip_type: tripType || undefined,
        seats_needed: seatsNeeded ? Number(seatsNeeded) : undefined,
      },
    });

    setSearching(false);

    if (fnError || data?.error) {
      setError(data?.error || 'No se ha podido completar la búsqueda.');
      setResults([]);
      return;
    }
    setResults(data.routes || []);
  };

  const handleContactar = async (route) => {
    if (!user?.email || !route.author_email) return;
    const emails = [user.email.toLowerCase().trim(), route.author_email.toLowerCase().trim()].sort();

    const { data, error } = await supabase
      .from('chats')
      .upsert({ user_1_email: emails[0], user_2_email: emails[1] }, { onConflict: 'user_1_email,user_2_email' })
      .select()
      .single();

    if (error) {
      alert('No se ha podido abrir el chat: ' + error.message);
      return;
    }
    navigate('/hilo', { state: { activeChatId: data.id } });
  };

  const handleRequestJoin = async (route, zona) => {
    setRequestingRouteId(route.id);
    const { data, error: fnError } = await supabase.functions.invoke('request-join-route', {
      body: { route_id: route.id, zona, requester_name: identity?.name, requester_avatar: identity?.avatar },
    });
    setRequestingRouteId(null);

    if (fnError || data?.error) {
      alert(data?.error || 'No se ha podido enviar la solicitud.');
      return;
    }
    setRequestedRouteIds(prev => new Set(prev).add(route.id));
    setJoinRequestRouteId(null);
    setZonaDraft('');
  };

  // Coincidencia laxa con el nombre de un colegio ya existente, para prellenar el modal
  // de "crear ruta" si no hay resultados (el destino buscado es texto libre).
  const matchedSchoolId = schools.find(s => {
    const name = s.name.toLowerCase();
    const dest = destination.toLowerCase().trim();
    return dest && (name.includes(dest) || dest.includes(name));
  })?.id;

  return (
    <div className="max-w-2xl mx-auto px-4 pb-20 mt-6 animate-in fade-in duration-300">
      <button onClick={() => goBack(navigate, '/servicios')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver atrás
      </button>

      <div className="text-center mb-6 space-y-1">
        <h1 className="font-cormorant text-3xl font-semibold text-foreground">Buscar ruta escolar</h1>
        <p className="text-sm text-muted-foreground">Encuentra a otras familias que hacen tu mismo trayecto</p>
      </div>

      <form onSubmit={handleSearch} className="bg-card border border-border rounded-2xl p-4 space-y-3 mb-6">
        <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            value={origin}
            onChange={e => setOrigin(e.target.value)}
            placeholder="Origen (tu zona, ej: Majadahonda)"
            className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
          <Compass className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            value={destination}
            onChange={e => setDestination(e.target.value)}
            placeholder="Destino (colegio o dirección)"
            className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="time"
              value={departureTime}
              onChange={e => setDepartureTime(e.target.value)}
              className="bg-transparent text-sm flex-1 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
            <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="number"
              min="1"
              value={seatsNeeded}
              onChange={e => setSeatsNeeded(e.target.value)}
              placeholder="Plazas"
              className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {TRIP_TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setTripType(f.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                tripType === f.value
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-muted/40 text-muted-foreground border-border/40 hover:border-border'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={searching || !origin.trim() || !destination.trim()}
          className="w-full bg-primary text-primary-foreground py-3 rounded-2xl font-medium text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          {searching ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {error && (
        <p className="text-xs text-destructive text-center mb-4">{error}</p>
      )}

      {searched && !searching && !error && (
        results.length === 0 ? (
          <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl">
            <Compass className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-cormorant text-xl text-muted-foreground">No hay rutas que encajen todavía</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Sé el primero en publicar esta ruta.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              Crear esta ruta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {results.map(route => {
              const isMine = user?.email && route.author_email?.toLowerCase().trim() === user.email.toLowerCase().trim();
              const initials = route.author_name?.slice(0, 2).toUpperCase() || 'W';
              return (
                <div
                  key={route.id}
                  className="p-4 bg-card border border-border rounded-2xl shadow-sm flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden border border-border flex-shrink-0">
                      {route.author_avatar ? (
                        <img src={route.author_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-primary font-cormorant font-semibold text-[10px]">{initials}</span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-foreground">{route.author_name || 'Miembro de la comunidad'}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border bg-primary/5 text-primary border-primary/10 flex items-center gap-1">
                      <ArrowLeftRight className="w-2.5 h-2.5" /> {TRIP_TYPE_LABELS[route.trip_type] || route.trip_type}
                    </span>
                    <span className="text-[9px] font-medium uppercase tracking-widest px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
                      {route.seats_available > 0 ? `${route.seats_available} plazas` : 'Sin plazas'}
                    </span>
                    <span className="text-[9px] font-medium uppercase tracking-widest px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
                      {route.distance_km} km
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-foreground leading-tight">{route.school_name}</h3>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-primary/70" /> {route.location}
                  </p>
                  {(route.salida_time || route.entrada_time) && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 text-primary/70" />
                      {route.salida_time?.slice(0, 5)}{route.salida_time && route.entrada_time ? ' → ' : ''}{route.entrada_time?.slice(0, 5)}
                    </p>
                  )}

                  {!isMine && (
                    <div className="pt-2 border-t border-border/50 mt-1 flex flex-col gap-1.5">
                      <button
                        onClick={() => handleContactar(route)}
                        className="w-full flex items-center justify-center gap-1.5 bg-muted text-foreground rounded-xl text-xs font-semibold py-1.5 hover:bg-muted/70 transition-all"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> Contactar
                      </button>
                      {joinRequestRouteId === route.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={zonaDraft}
                            onChange={e => setZonaDraft(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && zonaDraft.trim()) handleRequestJoin(route, zonaDraft.trim());
                              if (e.key === 'Escape') { setJoinRequestRouteId(null); setZonaDraft(''); }
                            }}
                            placeholder="¿En qué zona vives?"
                            className="flex-1 min-w-0 bg-muted/50 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <button
                            onClick={() => handleRequestJoin(route, zonaDraft.trim())}
                            disabled={!zonaDraft.trim() || requestingRouteId === route.id}
                            className="p-2 rounded-full bg-primary text-white disabled:opacity-50 flex-shrink-0"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setJoinRequestRouteId(null); setZonaDraft(''); }}
                            className="p-2 rounded-full bg-muted text-muted-foreground flex-shrink-0"
                          >
                            <XIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setJoinRequestRouteId(route.id); setZonaDraft(''); }}
                          disabled={requestedRouteIds.has(route.id)}
                          className="w-full flex items-center justify-center gap-1.5 bg-primary/5 text-primary border border-primary/10 rounded-xl text-xs font-semibold py-1.5 hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:hover:bg-primary/5 disabled:hover:text-primary"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          {requestedRouteIds.has(route.id) ? 'Solicitud enviada' : 'Solicitar unirse'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {showCreateModal && (
        <CreateSchoolRouteModal
          user={user}
          identity={identity}
          prefill={{ location: origin, tripType: tripType || 'ambos', schoolId: matchedSchoolId }}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            navigate('/servicios');
          }}
        />
      )}
    </div>
  );
}
