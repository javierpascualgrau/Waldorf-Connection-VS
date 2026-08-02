/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import { X, MapPin, Compass } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import AddressAutocompleteInput from '@/components/AddressAutocompleteInput';

export default function CreateSchoolRouteModal({ user, identity, onClose, onCreated, editRoute = null, prefill = null }) {
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState(editRoute?.school_id || prefill?.schoolId || '');
  const [location, setLocation] = useState(editRoute?.location || prefill?.location || '');
  const [originCoords, setOriginCoords] = useState(
    editRoute?.origin_lat != null && editRoute?.origin_lng != null
      ? { lat: editRoute.origin_lat, lng: editRoute.origin_lng }
      : null
  );
  // Destino: independiente del desplegable de Colegio una vez editado a mano — solo
  // controla las coordenadas del cálculo de distancia (es intencional que pueda
  // desincronizarse del colegio elegido si el usuario lo cambia).
  const [destination, setDestination] = useState(editRoute?.destination_address || editRoute?.school_name || prefill?.destination || '');
  const [destinationCoords, setDestinationCoords] = useState(
    editRoute?.destination_lat != null && editRoute?.destination_lng != null
      ? { lat: editRoute.destination_lat, lng: editRoute.destination_lng }
      : prefill?.destinationCoords || null
  );
  const [notes, setNotes] = useState(editRoute?.notes || '');
  const [seats, setSeats] = useState(editRoute?.seats ?? 4);
  const [salidaTime, setSalidaTime] = useState(editRoute?.salida_time?.slice(0, 5) || '');
  const [entradaTime, setEntradaTime] = useState(editRoute?.entrada_time?.slice(0, 5) || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSchools = async () => {
      const { data } = await supabase
        .from('school_profiles')
        .select('id, name, location, location_lat, location_lng')
        .order('name', { ascending: true });
      setSchools(data || []);
      if (!editRoute && data?.length && !schoolId) {
        setSchoolId(data[0].id);
        if (!prefill?.destination) {
          setDestination(data[0].location || data[0].name);
          setDestinationCoords(
            data[0].location_lat != null && data[0].location_lng != null
              ? { lat: data[0].location_lat, lng: data[0].location_lng }
              : null
          );
        }
      }
    };
    loadSchools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSchoolChange = (newSchoolId) => {
    setSchoolId(newSchoolId);
    const school = schools.find(s => s.id === newSchoolId);
    if (school) {
      setDestination(school.location || school.name);
      setDestinationCoords(
        school.location_lat != null && school.location_lng != null
          ? { lat: school.location_lat, lng: school.location_lng }
          : null
      );
    }
  };

  const handleSubmit = async () => {
    if (!schoolId) return;
    // author_id es obligatorio para poder gestionar el grupo/turnos más tarde. `user` llega
    // como prop desde supabase.auth.getUser() en el padre — si por lo que sea (sesión
    // desactualizada, pestaña abierta desde antes de iniciar sesión) todavía no tiene id,
    // mejor bloquear la publicación con un aviso claro que insertar la ruta sin dueño.
    if (!editRoute && !user?.id) {
      alert('Tu sesión parece desactualizada. Recarga la página e inténtalo de nuevo.');
      return;
    }
    setLoading(true);

    const selectedSchool = schools.find(s => s.id === schoolId);

    // Origen: si el usuario eligió una sugerencia del autocompletado ya tenemos coordenadas
    // precisas sin llamar a ningún backend. Si escribió texto libre sin seleccionar nada,
    // se mantiene el fallback de geocodificar en el submit (solo si es nuevo o cambió).
    let originLat = editRoute?.origin_lat ?? null;
    let originLng = editRoute?.origin_lng ?? null;
    if (originCoords && location.trim()) {
      originLat = originCoords.lat;
      originLng = originCoords.lng;
    } else if (location.trim() && (!editRoute || location !== editRoute.location)) {
      const { data } = await supabase.functions.invoke('geocode-address', { body: { address: location } });
      if (data && !data.error) {
        originLat = data.lat;
        originLng = data.lng;
      }
    }

    // Destino: igual que el origen — coordenadas directas si se eligió una sugerencia
    // (colegio o dirección libre), si no, fallback de geocodificar el texto escrito.
    let destinationLat = editRoute?.destination_lat ?? null;
    let destinationLng = editRoute?.destination_lng ?? null;
    if (destinationCoords && destination.trim()) {
      destinationLat = destinationCoords.lat;
      destinationLng = destinationCoords.lng;
    } else if (destination.trim() && (!editRoute || destination !== (editRoute.destination_address || editRoute.school_name || ''))) {
      const { data } = await supabase.functions.invoke('geocode-address', { body: { address: destination } });
      if (data && !data.error) {
        destinationLat = data.lat;
        destinationLng = data.lng;
      }
    }

    const routeData = {
      school_id: schoolId,
      school_name: selectedSchool?.name || editRoute?.school_name || '',
      location,
      destination_address: destination,
      notes,
      seats: Number(seats) || 1,
      salida_time: salidaTime || null,
      entrada_time: entradaTime || null,
      origin_lat: originLat,
      origin_lng: originLng,
      destination_lat: destinationLat,
      destination_lng: destinationLng,
    };

    let error;
    if (editRoute) {
      ({ error } = await supabase
        .from('school_routes')
        .update(routeData)
        .eq('id', editRoute.id));
    } else {
      ({ error } = await supabase
        .from('school_routes')
        .insert([{
          ...routeData,
          author_id: user?.id || null,
          author_email: user?.email || '',
          author_name: identity?.name || user?.email?.split('@')[0] || 'Miembro de la comunidad',
          author_avatar: identity?.avatar || null,
        }]));
    }

    setLoading(false);

    if (error) {
      console.error('Error al guardar la ruta:', error);
      alert('Error al guardar: ' + error.message);
      return;
    }

    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 animate-fade-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-cormorant text-2xl font-semibold">
            {editRoute ? 'Editar ruta escolar' : 'Nueva ruta escolar'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Colegio *</label>
            <select
              value={schoolId}
              onChange={e => handleSchoolChange(e.target.value)}
              className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <AddressAutocompleteInput
              value={location}
              onChange={(text) => { setLocation(text); setOriginCoords(null); }}
              onSelect={({ address, lat, lng }) => { setLocation(address); setOriginCoords({ lat, lng }); }}
              placeholder="Zona donde vives (ej: Majadahonda)"
              className="flex-1"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Destino</label>
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
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Hora de salida</label>
              <input
                type="time"
                value={salidaTime}
                onChange={e => setSalidaTime(e.target.value)}
                className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Hora de entrada</label>
              <input
                type="time"
                value={entradaTime}
                onChange={e => setEntradaTime(e.target.value)}
                className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Plazas libres</label>
            <input
              type="number"
              min="1"
              max="8"
              value={seats}
              onChange={e => setSeats(e.target.value)}
              className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notas (días, coche...)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Todos los días, tengo sitio para 2 niños más"
              className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !schoolId}
          className="mt-5 w-full bg-primary text-primary-foreground py-3 rounded-2xl font-medium text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          {loading ? 'Guardando...' : editRoute ? 'Guardar cambios' : 'Publicar ruta'}
        </button>
      </div>
    </div>
  );
}
