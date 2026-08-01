import { corsHeaders } from "../_shared/cors.ts";
import { getCallerUser, getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const caller = await getCallerUser(req);
    if (!caller) return json({ error: "No autenticado." }, 401);

    const { route_id, zona, zona_lat, zona_lng, requester_name, requester_avatar } = await req.json();
    if (!route_id) return json({ error: "Falta route_id." }, 400);

    const admin = getSupabaseAdmin();

    const { data: route } = await admin.from("school_routes").select("status").eq("id", route_id).maybeSingle();
    if (!route) return json({ error: "Ruta no encontrada." }, 404);
    if (route.status !== "abierto") return json({ error: "Esta ruta ya no admite solicitudes." }, 409);

    const { data: existing } = await admin
      .from("school_route_requests")
      .select("id")
      .eq("route_id", route_id)
      .eq("requester_id", caller.id)
      .eq("status", "pendiente")
      .maybeSingle();
    if (existing) return json({ error: "Ya tienes una solicitud pendiente para esta ruta." }, 409);

    const { error } = await admin.from("school_route_requests").insert([{
      route_id,
      requester_id: caller.id,
      requester_email: caller.email ?? "",
      requester_name: requester_name ?? null,
      requester_avatar: requester_avatar ?? null,
      zona: zona ?? null,
      zona_lat: zona_lat ?? null,
      zona_lng: zona_lng ?? null,
    }]);

    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
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
