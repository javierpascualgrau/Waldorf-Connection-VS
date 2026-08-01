// Geocoding API v6 de Mapbox. MAPBOX_ACCESS_TOKEN vive solo como secret de Supabase,
// nunca en el repo ni en variables VITE_ (esas se empaquetan en el cliente).
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const token = Deno.env.get("MAPBOX_ACCESS_TOKEN");
  if (!token || !address?.trim()) return null;

  const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(address)}&access_token=${token}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;

  const [lng, lat] = feature.geometry.coordinates;
  return { lat, lng };
}
