/* eslint-disable react/prop-types */
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapboxMap } from '@/hooks/useMapboxMap';
import { circlePolygonGeoJSON } from '@/lib/geo';

const ORIGIN_COLOR = '#2563eb';
const DESTINATION_COLOR = '#dc2626';

function upsertCircleLayer(map, id, point, radiusKm, color) {
  const fillId = `${id}-fill`;
  const lineId = `${id}-line`;

  if (!point) {
    if (map.getLayer(fillId)) map.removeLayer(fillId);
    if (map.getLayer(lineId)) map.removeLayer(lineId);
    if (map.getSource(id)) map.removeSource(id);
    return;
  }

  const geojson = circlePolygonGeoJSON(point.lat, point.lng, radiusKm);
  const source = map.getSource(id);
  if (source) {
    source.setData(geojson);
    return;
  }
  map.addSource(id, { type: 'geojson', data: geojson });
  map.addLayer({ id: fillId, type: 'fill', source: id, paint: { 'fill-color': color, 'fill-opacity': 0.15 } });
  map.addLayer({ id: lineId, type: 'line', source: id, paint: { 'line-color': color, 'line-width': 2 } });
}

// Mapa interactivo de BuscarRuta.jsx: marcadores de origen/destino + círculos de radio
// ajustable (radiusOrigin/radiusDestination en km) que se actualizan en vivo con los sliders.
export default function RouteSearchMap({ origin, destination, radiusOrigin, radiusDestination, className = 'h-64 rounded-2xl overflow-hidden' }) {
  const { containerRef, map } = useMapboxMap({ center: origin || destination, zoom: 11 });
  const originMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    upsertCircleLayer(map, 'route-search-origin', origin, radiusOrigin, ORIGIN_COLOR);
    upsertCircleLayer(map, 'route-search-destination', destination, radiusDestination, DESTINATION_COLOR);

    if (origin) {
      if (!originMarkerRef.current) {
        originMarkerRef.current = new mapboxgl.Marker({ color: ORIGIN_COLOR }).setLngLat([origin.lng, origin.lat]).addTo(map);
      } else {
        originMarkerRef.current.setLngLat([origin.lng, origin.lat]);
      }
    } else if (originMarkerRef.current) {
      originMarkerRef.current.remove();
      originMarkerRef.current = null;
    }

    if (destination) {
      if (!destinationMarkerRef.current) {
        destinationMarkerRef.current = new mapboxgl.Marker({ color: DESTINATION_COLOR }).setLngLat([destination.lng, destination.lat]).addTo(map);
      } else {
        destinationMarkerRef.current.setLngLat([destination.lng, destination.lat]);
      }
    } else if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }

    const bounds = new mapboxgl.LngLatBounds();
    if (origin) circlePolygonGeoJSON(origin.lat, origin.lng, radiusOrigin).geometry.coordinates[0].forEach((c) => bounds.extend(c));
    if (destination) circlePolygonGeoJSON(destination.lat, destination.lng, radiusDestination).geometry.coordinates[0].forEach((c) => bounds.extend(c));
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 40, duration: 300 });
  }, [map, origin, destination, radiusOrigin, radiusDestination]);

  return <div ref={containerRef} className={className} />;
}
