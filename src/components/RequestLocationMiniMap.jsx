/* eslint-disable react/prop-types */
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapboxMap } from '@/hooks/useMapboxMap';

const ZONA_COLOR = '#d97706';
const ORIGIN_COLOR = '#2563eb';
const DESTINATION_COLOR = '#dc2626';
const TRIP_LINE_SOURCE = 'request-mini-map-trip-line';

// Mini-mapa de contexto para GestionRuta.jsx: dónde vive quien solicita unirse frente al
// trayecto real de la ruta (línea recta origen→destino, no una ruta por carretera).
// Poco interactivo a propósito: solo sirve como referencia visual rápida.
export default function RequestLocationMiniMap({ zona, routeOrigin, routeDestination, className = 'h-40 rounded-xl overflow-hidden' }) {
  const { containerRef, map } = useMapboxMap({ center: zona, zoom: 10, scrollZoom: false, doubleClickZoom: false });
  const markersRef = useRef([]);

  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = new mapboxgl.LngLatBounds();

    if (routeOrigin && routeDestination) {
      const lineGeojson = {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[routeOrigin.lng, routeOrigin.lat], [routeDestination.lng, routeDestination.lat]] },
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

    if (zona) {
      markersRef.current.push(new mapboxgl.Marker({ color: ZONA_COLOR }).setLngLat([zona.lng, zona.lat]).addTo(map));
      bounds.extend([zona.lng, zona.lat]);
    }
    if (routeOrigin) {
      markersRef.current.push(new mapboxgl.Marker({ color: ORIGIN_COLOR }).setLngLat([routeOrigin.lng, routeOrigin.lat]).addTo(map));
      bounds.extend([routeOrigin.lng, routeOrigin.lat]);
    }
    if (routeDestination) {
      markersRef.current.push(new mapboxgl.Marker({ color: DESTINATION_COLOR }).setLngLat([routeDestination.lng, routeDestination.lat]).addTo(map));
      bounds.extend([routeDestination.lng, routeDestination.lat]);
    }

    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 30, duration: 0, maxZoom: 13 });
  }, [map, zona, routeOrigin, routeDestination]);

  return <div ref={containerRef} className={className} />;
}
