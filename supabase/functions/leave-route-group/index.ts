import { corsHeaders } from "../_shared/cors.ts";
import { getCallerUser, getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const caller = await getCallerUser(req);
    if (!caller) return json({ error: "No autenticado." }, 401);

    const { route_id } = await req.json();
    if (!route_id) return json({ error: "Falta route_id." }, 400);

    const admin = getSupabaseAdmin();

    const { data: membership } = await admin
      .from("school_route_members")
      .select("id")
      .eq("route_id", route_id)
      .eq("member_id", caller.id)
      .is("left_at", null)
      .maybeSingle();

    if (!membership) return json({ error: "No eres miembro activo de esta ruta." }, 404);

    const { error: leaveError } = await admin
      .from("school_route_members")
      .update({ left_at: new Date().toISOString() })
      .eq("id", membership.id);
    if (leaveError) return json({ error: leaveError.message }, 500);

    const { data: route } = await admin.from("school_routes").select("status").eq("id", route_id).maybeSingle();
    if (route?.status === "cerrado") {
      await admin.from("school_routes").update({ status: "abierto" }).eq("id", route_id);
    }

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
