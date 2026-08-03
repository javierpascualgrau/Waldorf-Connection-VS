import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// Encapsula el ciclo de vida de un mapa Mapbox GL (init/destroy) para no duplicar este
// boilerplate en cada componente de mapa. Devuelve el ref a colocar en el contenedor y
// la instancia del mapa (null hasta que el contenedor exista y el mapa haya cargado).
export function useMapboxMap({ center, zoom = 12, scrollZoom = true, doubleClickZoom = true } = {}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    if (!mapboxgl.accessToken) {
      setError('Falta configurar VITE_MAPBOX_ACCESS_TOKEN en .env.local.');
      return;
    }

    // 💡 Un token ausente/inválido hace que mapboxgl.Map lance una excepción síncrona;
    // sin este try/catch, al no haber Error Boundary, se desmonta toda la app (no solo el mapa).
    try {
      const instance = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: center ? [center.lng, center.lat] : [-3.7038, 40.4168],
        zoom,
      });

      if (!scrollZoom) instance.scrollZoom.disable();
      if (!doubleClickZoom) instance.doubleClickZoom.disable();

      instance.on('load', () => setMap(instance));
      instance.on('error', (e) => setError(e?.error?.message || 'Error al cargar el mapa.'));
      mapRef.current = instance;

      return () => {
        instance.remove();
        mapRef.current = null;
        setMap(null);
      };
    } catch (err) {
      console.error('Error al inicializar Mapbox:', err);
      setError(err.message || 'Error al inicializar el mapa.');
    }
  }, []);

  return { containerRef, map, error };
}
