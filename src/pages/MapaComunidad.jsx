import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import { supabase } from '@/api/supabaseClient';
import { useMapboxMap } from '@/hooks/useMapboxMap';
import { School, Building2 } from 'lucide-react';

const SCHOOL_COLOR = '#3A5F43';
const COMPANY_COLOR = '#2563eb';

const FILTERS = {
  colegios: {
    label: 'Colegios',
    icon: School,
    table: 'school_profiles',
    avatarField: 'avatar_url',
    idParam: 'cache_on_school_id',
    detailPath: '/colegios',
    color: SCHOOL_COLOR,
  },
  empresas: {
    label: 'Empresas',
    icon: Building2,
    table: 'company_profiles',
    avatarField: 'logo_url',
    idParam: 'cache_on_company_id',
    detailPath: '/empresas',
    color: COMPANY_COLOR,
  },
};

export default function MapaComunidad() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState('colegios');
  const [loading, setLoading] = useState(true);
  const { containerRef, map, error: mapError } = useMapboxMap({ center: { lat: 40.4168, lng: -3.7038 }, zoom: 5.5 });
  const markersRef = useRef([]);

  useEffect(() => {
    if (!map) return;

    const config = FILTERS[filtro];

    const clearMarkers = () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    };

    const loadAndPlot = async () => {
      setLoading(true);
      clearMarkers();

      const { data, error } = await supabase
        .from(config.table)
        .select(`id, name, ${config.avatarField}, location, location_lat, location_lng`);

      if (error) {
        console.error('Error cargando ubicaciones:', error);
        setLoading(false);
        return;
      }

      // 💡 Geocodificamos al vuelo (y se cachea en el perfil) lo que aún no tenga coordenadas
      const resolved = await Promise.all((data || []).map(async (item) => {
        if (item.location_lat != null && item.location_lng != null) return item;
        if (!item.location) return null;

        const { data: coords, error: geoError } = await supabase.functions.invoke('geocode-address', {
          body: { [config.idParam]: item.id },
        });
        if (geoError || !coords || coords.error) return null;
        return { ...item, location_lat: coords.lat, location_lng: coords.lng };
      }));

      const bounds = new mapboxgl.LngLatBounds();

      resolved.filter(Boolean).forEach(item => {
        const el = document.createElement('div');
        el.style.cursor = 'pointer';
        el.style.width = '16px';
        el.style.height = '16px';
        el.style.borderRadius = '9999px';
        el.style.background = config.color;
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.4)';

        const avatarUrl = item[config.avatarField];
        const popupHtml = `
          <div style="display:flex;align-items:center;gap:8px;font-family:inherit;">
            ${avatarUrl ? `<img src="${avatarUrl}" style="width:28px;height:28px;border-radius:9999px;object-fit:cover;flex-shrink:0;" />` : ''}
            <span style="font-size:13px;font-weight:600;">${item.name || 'Sin nombre'}</span>
          </div>
        `;

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([item.location_lng, item.location_lat])
          .setPopup(new mapboxgl.Popup({ offset: 16, closeButton: false }).setHTML(popupHtml))
          .addTo(map);

        el.addEventListener('click', () => navigate(`${config.detailPath}/${item.id}`));

        markersRef.current.push(marker);
        bounds.extend([item.location_lng, item.location_lat]);
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 500 });
      }

      setLoading(false);
    };

    loadAndPlot();

    return clearMarkers;
  }, [map, filtro]);

  return (
    <div className="max-w-3xl mx-auto pb-20 mt-4 px-4">
      <div className="text-center mb-6 space-y-1">
        <h1 className="font-cormorant text-4xl font-semibold text-foreground">Mapa Waldorf</h1>
        <p className="text-sm text-muted-foreground">Descubre dónde están los colegios y empresas de la comunidad</p>
      </div>

      <div className="flex gap-1.5 mb-5 bg-muted/50 p-1 rounded-2xl max-w-xs mx-auto">
        {Object.entries(FILTERS).map(([key, { label, icon: Icon }]) => (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${
              filtro === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {mapError ? (
        <div className="p-6 bg-card border border-dashed border-border rounded-3xl text-center text-sm text-muted-foreground">
          No se ha podido cargar el mapa: {mapError}
        </div>
      ) : (
        <div className="relative rounded-3xl overflow-hidden border border-border shadow-sm">
          <div ref={containerRef} className="h-[60vh] w-full" />
          {loading && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center text-sm text-muted-foreground">
              Cargando ubicaciones...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
