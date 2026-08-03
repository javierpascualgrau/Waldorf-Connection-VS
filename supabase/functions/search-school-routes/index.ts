import { corsHeaders } from "../_shared/cors.ts";
import { getCallerUser, getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { haversineKm } from "../_shared/geo.ts";

// Radio de destino fijo (no ajustable desde la UI, a diferencia del de origen): el destino
// es un colegio conocido, así que un margen pequeño basta para admitir imprecisiones de
// geocoding sin necesidad de que el usuario lo controle.
const DESTINATION_RADIUS_KM = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const caller = await getCallerUser(req);
    if (!caller) return json({ error: "No autenticado." }, 401);

    const {
      origin_lat,
      origin_lng,
      destination_lat,
      destination_lng,
      radiusOrigin,
      seats_needed,
    } = await req.json();

    if (
      typeof origin_lat !== "number" || typeof origin_lng !== "number" ||
      typeof destination_lat !== "number" || typeof destination_lng !== "number"
    ) {
      return json({ error: "Faltan las coordenadas de origen o destino." }, 400);
    }
    const radiusOriginKm = Number(radiusOrigin) || 10;

    const admin = getSupabaseAdmin();

    const { data: routes } = await admin
      .from("school_routes")
      .select("*")
      .eq("status", "abierto")
      .not("origin_lat", "is", null)
      .not("origin_lng", "is", null)
      .not("destination_lat", "is", null)
      .not("destination_lng", "is", null);

    if (!routes || routes.length === 0) return json({ routes: [] });

    const routeIds = routes.map((r) => r.id);
    const { data: memberRows } = await admin
      .from("school_route_members")
      .select("route_id")
      .in("route_id", routeIds)
      .is("left_at", null);

    const memberCounts: Record<number, number> = {};
    (memberRows ?? []).forEach((m) => {
      memberCounts[m.route_id] = (memberCounts[m.route_id] ?? 0) + 1;
    });

    const scored = routes
      .map((route) => {
        const seatsAvailable = route.seats - (memberCounts[route.id] ?? 0);
        const distanceOriginKm = haversineKm(origin_lat, origin_lng, route.origin_lat, route.origin_lng);
        const distanceDestinationKm = haversineKm(
          destination_lat,
          destination_lng,
          route.destination_lat,
          route.destination_lng,
        );

        return {
          ...route,
          seats_available: seatsAvailable,
          distance_origin_km: Math.round(distanceOriginKm * 10) / 10,
          distance_destination_km: Math.round(distanceDestinationKm * 10) / 10,
          score: distanceOriginKm + distanceDestinationKm,
          _rawOriginKm: distanceOriginKm,
          _rawDestinationKm: distanceDestinationKm,
        };
      })
      .filter((r) => r._rawOriginKm <= radiusOriginKm && r._rawDestinationKm <= DESTINATION_RADIUS_KM)
      .filter((r) => (seats_needed ? r.seats_available >= seats_needed : true))
      .sort((a, b) => a.score - b.score)
      .map(({ _rawOriginKm, _rawDestinationKm, ...r }) => r);

    return json({ routes: scored });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
