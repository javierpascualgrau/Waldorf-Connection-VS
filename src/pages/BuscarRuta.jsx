import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { getMemberIdentity } from '@/lib/identity';
import { ArrowLeft, MapPin, ArrowLeftRight, Users, Clock, Compass } from 'lucide-react';
import CreateSchoolRouteModal from '@/components/CreateSchoolRouteModal';
import AddressAutocompleteInput from '@/components/AddressAutocompleteInput';
import RouteSearchMap from '@/components/RouteSearchMap';
import { Slider } from '@/components/ui/slider';
import { goBack } from '@/lib/navigation';

const TRIP_TYPE_LABELS = { ida: 'Ida', vuelta: 'Vuelta', ambos: 'Ida y vuelta' };

export default function BuscarRuta() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [schools, setSchools] = useState([]);

  const [origin, setOrigin] = useState('');
  const [originCoords, setOriginCoords] = useState(null);
  const [destination, setDestination] = useState('');
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [radiusOrigin, setRadiusOrigin] = useState(10);
  const [seatsNeeded, setSeatsNeeded] = useState('');

  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
      if (authUser) setIdentity(await getMemberIdentity(authUser.id));

      const { data } = await supabase.from('school_profiles').select('id, name, location, location_lat, location_lng').order('name', { ascending: true });
      setSchools(data || []);
    };
    init();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!originCoords || !destinationCoords) return;

    setSearching(true);
    setError('');
    setSearched(true);

    const { data, error: fnError } = await supabase.functions.invoke('search-school-routes', {
      body: {
        origin_lat: originCoords.lat,
        origin_lng: originCoords.lng,
        destination_lat: destinationCoords.lat,
        destination_lng: destinationCoords.lng,
        radiusOrigin,
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
          <AddressAutocompleteInput
            value={origin}
            onChange={(text) => { setOrigin(text); setOriginCoords(null); }}
            onSelect={({ address, lat, lng }) => { setOrigin(address); setOriginCoords({ lat, lng }); }}
            placeholder="Origen (tu zona, ej: Majadahonda)"
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
          <Compass className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <AddressAutocompleteInput
            value={destination}
            onChange={(text) => { setDestination(text); setDestinationCoords(null); }}
            onSelect={({ address, lat, lng }) => { setDestination(address); setDestinationCoords({ lat, lng }); }}
            placeholder="Destino (colegio o dirección)"
            className="flex-1"
            schools={schools}
          />
        </div>

        {(originCoords || destinationCoords) && (
          <div className="space-y-2 pt-1">
            <RouteSearchMap
              origin={originCoords}
              destination={destinationCoords}
              radiusOrigin={radiusOrigin}
            />
            <div>
              <label className="text-[10px] text-muted-foreground mb-1.5 block">Radio origen: {radiusOrigin} km</label>
              <Slider value={[radiusOrigin]} onValueChange={([v]) => setRadiusOrigin(v)} min={1} max={25} step={1} />
              <p className="text-[10px] text-muted-foreground mt-1.5">Ajusta la distancia para encontrar personas que viven cerca de tu zona.</p>
            </div>
          </div>
        )}

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

        <button
          type="submit"
          disabled={searching || !originCoords || !destinationCoords}
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
              const initials = route.author_name?.slice(0, 2).toUpperCase() || 'W';
              return (
                <div
                  key={route.id}
                  onClick={() => navigate(`/rutas/oferta/${route.id}`)}
                  className="p-4 bg-card border border-border rounded-2xl shadow-sm flex flex-col gap-2 cursor-pointer hover:border-primary/30 hover:shadow-md transition-all"
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
                      {route.distance_origin_km} km origen
                    </span>
                    <span className="text-[9px] font-medium uppercase tracking-widest px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
                      {route.distance_destination_km} km destino
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
          prefill={{
            location: origin,
            schoolId: matchedSchoolId,
            destination: destinationCoords ? destination : undefined,
            destinationCoords: destinationCoords || undefined,
          }}
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
