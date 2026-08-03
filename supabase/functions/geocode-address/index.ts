import { corsHeaders } from "../_shared/cors.ts";
import { getCallerUser, getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { geocodeAddress } from "../_shared/mapbox.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const caller = await getCallerUser(req);
    if (!caller) return json({ error: "No autenticado." }, 401);

    const { address, cache_on_school_id, cache_on_company_id } = await req.json();
    const admin = getSupabaseAdmin();

    // Si se pide cachear la dirección de un colegio o empresa, se ignora por completo el
    // `address` del body (nunca escribimos en un perfil a partir de un texto que no sea el
    // suyo propio) y se hace una única llamada a Mapbox con su location real.
    if (cache_on_school_id) {
      const { data: school } = await admin
        .from("school_profiles")
        .select("location")
        .eq("id", cache_on_school_id)
        .maybeSingle();

      if (!school?.location) {
        return json({ error: "El colegio no tiene ubicación configurada." }, 409);
      }

      const coords = await geocodeAddress(school.location);
      if (!coords) return json({ error: "No se ha podido geocodificar la ubicación del colegio." }, 502);

      await admin
        .from("school_profiles")
        .update({ location_lat: coords.lat, location_lng: coords.lng })
        .eq("id", cache_on_school_id);

      return json(coords);
    }

    if (cache_on_company_id) {
      const { data: company } = await admin
        .from("company_profiles")
        .select("location")
        .eq("id", cache_on_company_id)
        .maybeSingle();

      if (!company?.location) {
        return json({ error: "La empresa no tiene ubicación configurada." }, 409);
      }

      const coords = await geocodeAddress(company.location);
      if (!coords) return json({ error: "No se ha podido geocodificar la ubicación de la empresa." }, 502);

      await admin
        .from("company_profiles")
        .update({ location_lat: coords.lat, location_lng: coords.lng })
        .eq("id", cache_on_company_id);

      return json(coords);
    }

    if (!address?.trim()) return json({ error: "Falta address." }, 400);

    const coords = await geocodeAddress(address);
    if (!coords) return json({ error: "No se ha podido geocodificar esa dirección." }, 502);

    return json(coords);
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
