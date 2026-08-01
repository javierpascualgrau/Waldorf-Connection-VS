// Distancia entre dos puntos (km), fórmula de Haversine estándar.
// Réplica en JS de supabase/functions/_shared/geo.ts (el backend no puede importar código
// del frontend ni viceversa, así que se mantienen ambas copias en sincronía manualmente).
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Genera un polígono GeoJSON que aproxima un círculo de radio `radiusKm` centrado en
// (lat, lng), usando la fórmula de punto-destino sobre una esfera. Se usa para dibujar
// los círculos de radio ajustable en Mapbox GL (no hace falta turf.js solo para esto).
export function circlePolygonGeoJSON(lat, lng, radiusKm, points = 64) {
  const R = 6371;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const angularDistance = radiusKm / R;

  const coordinates = [];
  for (let i = 0; i <= points; i++) {
    const bearing = (i * 2 * Math.PI) / points;
    const pointLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(angularDistance) +
        Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing)
    );
    const pointLngRad =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
        Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(pointLatRad)
      );
    coordinates.push([(pointLngRad * 180) / Math.PI, (pointLatRad * 180) / Math.PI]);
  }

  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coordinates] },
    properties: {},
  };
}
