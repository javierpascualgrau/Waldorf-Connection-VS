/* eslint-disable react/prop-types */
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapboxMap } from '@/hooks/useMapboxMap';

const ORIGIN_COLOR = '#2563eb';
const DESTINATION_COLOR = '#dc2626';
const TRIP_LINE_SOURCE = 'route-map-trip-line';

// Mapa estático (sin círculos ni sliders) para RouteOfferDetail.jsx: los dos puntos fijos
// de una ruta ya publicada (origen del conductor, destino/colegio) unidos por una línea
// recta — no una ruta por carretera real, igual criterio que el resto de la app.
export default function RouteMap({ origin, destination, className = 'aspect-square rounded-2xl overflow-hidden' }) {
  const { containerRef, map } = useMapboxMap({ center: origin || destination, zoom: 11 });
  const originMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    if (origin && destination) {
      const lineGeojson = {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[origin.lng, origin.lat], [destination.lng, destination.lat]] },
        properties: {},
      };
      const source = map.getSource(TRIP_LINE_SOURCE);
      if (source) {
        source.setData(lineGeojson);
      } else {
        map.addSource(TRIP_LINE_SOURCE, { type: 'geojson', data: lineGeojson });
        map.addLayer({
          id: TRIP_LINE_SOURCE,
          type: 'line',
          source: TRIP_LINE_SOURCE,
          paint: { 'line-color': '#94a3b8', 'line-width': 2, 'line-dasharray': [2, 2] },
        });
      }
    }

    if (origin) {
      if (!originMarkerRef.current) {
        originMarkerRef.current = new mapboxgl.Marker({ color: ORIGIN_COLOR }).setLngLat([origin.lng, origin.lat]).addTo(map);
      } else {
        originMarkerRef.current.setLngLat([origin.lng, origin.lat]);
      }
    }

    if (destination) {
      if (!destinationMarkerRef.current) {
        destinationMarkerRef.current = new mapboxgl.Marker({ color: DESTINATION_COLOR }).setLngLat([destination.lng, destination.lat]).addTo(map);
      } else {
        destinationMarkerRef.current.setLngLat([destination.lng, destination.lat]);
      }
    }

    const bounds = new mapboxgl.LngLatBounds();
    if (origin) bounds.extend([origin.lng, origin.lat]);
    if (destination) bounds.extend([destination.lng, destination.lat]);
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 50, duration: 0, maxZoom: 13 });
  }, [map, origin, destination]);

  return <div ref={containerRef} className={className} />;
}
