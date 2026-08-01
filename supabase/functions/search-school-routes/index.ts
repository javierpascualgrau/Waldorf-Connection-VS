import { corsHeaders } from "../_shared/cors.ts";
import { getCallerUser, getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { haversineKm } from "../_shared/geo.ts";

// Penalización por diferencia horaria: 10 minutos de diferencia ≈ 1km de distancia.
// Heurística de partida, documentada y fácil de ajustar.
const MINUTES_PER_KM_EQUIVALENT = 10;

function timeToMinutes(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

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
      radiusDestination,
      departure_time,
      trip_type,
      seats_needed,
    } = await req.json();

    if (
      typeof origin_lat !== "number" || typeof origin_lng !== "number" ||
      typeof destination_lat !== "number" || typeof destination_lng !== "number"
    ) {
      return json({ error: "Faltan las coordenadas de origen o destino." }, 400);
    }
    const radiusOriginKm = Number(radiusOrigin) || 10;
    const radiusDestinationKm = Number(radiusDestination) || 10;

    const admin = getSupabaseAdmin();

    let query = admin
      .from("school_routes")
      .select("*")
      .eq("status", "abierto")
      .not("origin_lat", "is", null)
      .not("origin_lng", "is", null)
      .not("destination_lat", "is", null)
      .not("destination_lng", "is", null);

    // Compatibilidad de trayecto: una ruta 'ambos' cubre cualquier búsqueda de ida/vuelta.
    if (trip_type) {
      query = query.or(`trip_type.eq.${trip_type},trip_type.eq.ambos`);
    }

    const { data: routes } = await query;
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

    const searchMinutes = timeToMinutes(departure_time ?? null);

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

        const routeMinutes = timeToMinutes(route.salida_time);
        const timeDiffMin =
          searchMinutes != null && routeMinutes != null ? Math.abs(searchMinutes - routeMinutes) : 0;

        return {
          ...route,
          seats_available: seatsAvailable,
          distance_origin_km: Math.round(distanceOriginKm * 10) / 10,
          distance_destination_km: Math.round(distanceDestinationKm * 10) / 10,
          score: distanceOriginKm + distanceDestinationKm + timeDiffMin / MINUTES_PER_KM_EQUIVALENT,
          _rawOriginKm: distanceOriginKm,
          _rawDestinationKm: distanceDestinationKm,
        };
      })
      .filter((r) => r._rawOriginKm <= radiusOriginKm && r._rawDestinationKm <= radiusDestinationKm)
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
