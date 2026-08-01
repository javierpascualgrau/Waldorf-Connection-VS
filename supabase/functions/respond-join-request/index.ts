import { corsHeaders } from "../_shared/cors.ts";
import { getCallerUser, getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const caller = await getCallerUser(req);
    if (!caller) return json({ error: "No autenticado." }, 401);

    const { request_id, accept } = await req.json();
    if (!request_id || typeof accept !== "boolean") {
      return json({ error: "Faltan request_id o accept." }, 400);
    }

    const admin = getSupabaseAdmin();

    const { data: request } = await admin
      .from("school_route_requests")
      .select("*, school_routes(id, author_id, status)")
      .eq("id", request_id)
      .maybeSingle();

    if (!request) return json({ error: "Solicitud no encontrada." }, 404);
    const route = request.school_routes;
    if (route.author_id !== caller.id) return json({ error: "No eres el autor de esta ruta." }, 403);
    if (request.status !== "pendiente") return json({ error: "Esta solicitud ya se resolvió." }, 409);

    if (!accept) {
      const { error } = await admin
        .from("school_route_requests")
        .update({ status: "rechazada" })
        .eq("id", request_id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    const { error: updateError } = await admin
      .from("school_route_requests")
      .update({ status: "aceptada" })
      .eq("id", request_id);
    if (updateError) return json({ error: updateError.message }, 500);

    const { error: memberError } = await admin.from("school_route_members").insert([{
      route_id: route.id,
      member_id: request.requester_id,
      member_email: request.requester_email,
      member_name: request.requester_name,
      member_avatar: request.requester_avatar,
    }]);
    if (memberError) return json({ error: memberError.message }, 500);

    // Si el grupo ya tiene chat (se cerró y luego se reabrió al salir alguien, ver
    // leave-route-group), el nuevo miembro aceptado tras el cierre también entra al chat.
    const { data: groupChat } = await admin
      .from("chats")
      .select("id")
      .eq("context_type", "school_route")
      .eq("context_id", route.id)
      .maybeSingle();

    if (groupChat) {
      await admin.from("chat_participants").insert([{
        chat_id: groupChat.id,
        user_email: request.requester_email,
      }]);
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
