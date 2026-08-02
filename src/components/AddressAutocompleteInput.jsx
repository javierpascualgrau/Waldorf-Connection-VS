/* eslint-disable react/prop-types */
import { useState, useRef, useEffect } from 'react';
import { School } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// Autocompletado de direcciones vía Mapbox Geocoding v6 (autocomplete=true, sesgado a
// España). Mismo patrón de debounce/dropdown que src/components/ProfileSearch.jsx.
// Solo renderiza el <input> + su desplegable — el icono y el fondo los pone quien lo use,
// para encajar en el estilo de cada sitio sin imponer un wrapper rígido.
//
// `schools` (opcional): colegios registrados en la comunidad ({id, name, location,
// location_lat, location_lng}) que aparecen como sugerencias destacadas por encima de los
// resultados libres de Mapbox — al hacer foco con el campo vacío se muestran todos; al
// escribir, se filtran por nombre. Solo se usa en el campo de "destino".
export default function AddressAutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder,
  className = '',
  inputClassName = 'bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground min-w-0 w-full',
  autoFocus = false,
  onKeyDown,
  schools,
}) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef();

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!value?.trim() || value.trim().length < 3) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(
          value.trim()
        )}&autocomplete=true&country=es&limit=5&access_token=${MAPBOX_TOKEN}`;
        const res = await fetch(url);
        const body = await res.json();
        setResults(res.ok ? body.features || [] : []);
      } catch (err) {
        console.error('Error buscando direcciones en Mapbox:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [value]);

  const schoolMatches = (schools || []).filter((s) => {
    if (s.location_lat == null || s.location_lng == null) return false;
    const q = value?.trim().toLowerCase();
    return !q || s.name.toLowerCase().includes(q);
  });

  const handleSelect = (feature) => {
    const address = feature.properties?.full_address || feature.properties?.name || value;
    const [lng, lat] = feature.geometry.coordinates;
    onSelect({ address, lat, lng });
    setResults([]);
    setOpen(false);
  };

  const handleSelectSchool = (school) => {
    onSelect({ address: school.location, lat: Number(school.location_lat), lng: Number(school.location_lng), schoolId: school.id });
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => (schoolMatches.length > 0 || results.length > 0) && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={inputClassName}
      />

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden max-h-64 overflow-y-auto">
          {schoolMatches.length > 0 && (
            <ul>
              {schoolMatches.map((school) => (
                <li
                  key={school.id}
                  onClick={() => handleSelectSchool(school)}
                  className="px-3 py-2.5 text-xs hover:bg-muted/50 transition-colors cursor-pointer border-b border-border/50 flex items-center gap-2"
                >
                  <School className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="flex-1 min-w-0 truncate">{school.name}</span>
                  <span className="text-[9px] font-medium uppercase tracking-widest px-1.5 py-0.5 bg-primary/10 text-primary rounded-md flex-shrink-0">Colegio</span>
                </li>
              ))}
            </ul>
          )}

          {loading ? (
            <div className="p-3 text-center text-xs text-muted-foreground">Buscando...</div>
          ) : results.length === 0 ? (
            schoolMatches.length === 0 && <div className="p-3 text-center text-xs text-muted-foreground">Sin resultados</div>
          ) : (
            <ul>
              {results.map((feature) => (
                <li
                  key={feature.properties?.mapbox_id || feature.properties?.full_address}
                  onClick={() => handleSelect(feature)}
                  className="px-3 py-2.5 text-xs hover:bg-muted/50 transition-colors cursor-pointer border-b border-border/50 last:border-0"
                >
                  {feature.properties?.full_address || feature.properties?.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
