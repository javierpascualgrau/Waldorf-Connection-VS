import { corsHeaders } from "../_shared/cors.ts";
import { getCallerUser, getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";

// Lunes=1 .. viernes=5, misma convención que date-fns getISODay() (nunca getDay() nativo,
// que empieza en domingo=0) — GrupoRutaCalendario.jsx debe proyectar con la misma función.
const WEEKDAYS = [1, 2, 3, 4, 5];

function timeOfDayForTripType(tripType: string): string[] {
  if (tripType === "ida") return ["manana"];
  if (tripType === "vuelta") return ["tarde"];
  return ["manana", "tarde"];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const caller = await getCallerUser(req);
    if (!caller) return json({ error: "No autenticado." }, 401);

    const { route_id } = await req.json();
    if (!route_id) return json({ error: "Falta route_id." }, 400);

    const admin = getSupabaseAdmin();

    const { data: route } = await admin.from("school_routes").select("*").eq("id", route_id).maybeSingle();
    if (!route) return json({ error: "Ruta no encontrada." }, 404);
    if (route.author_id !== caller.id) return json({ error: "No eres el autor de esta ruta." }, 403);
    if (route.status === "cerrado") return json({ error: "El grupo ya está cerrado." }, 409);

    const { data: members } = await admin
      .from("school_route_members")
      .select("member_email")
      .eq("route_id", route_id)
      .is("left_at", null);

    if (!members || members.length === 0) {
      return json({ error: "Acepta al menos una solicitud antes de cerrar el grupo." }, 409);
    }

    const { error: statusError } = await admin
      .from("school_routes")
      .update({ status: "cerrado" })
      .eq("id", route_id);
    if (statusError) return json({ error: statusError.message }, 500);

    const { data: chat, error: chatError } = await admin
      .from("chats")
      .insert([{
        is_group: true,
        group_name: `Ruta ${route.location ?? route.school_name ?? ""}`.trim(),
        context_type: "school_route",
        context_id: route_id,
      }])
      .select()
      .single();
    if (chatError) return json({ error: chatError.message }, 500);

    const participantEmails = [route.author_email, ...members.map((m) => m.member_email)];
    const { error: participantsError } = await admin.from("chat_participants").insert(
      participantEmails.map((email) => ({ chat_id: chat.id, user_email: email })),
    );
    if (participantsError) return json({ error: participantsError.message }, 500);

    const shiftRows = WEEKDAYS.flatMap((weekday) =>
      timeOfDayForTripType(route.trip_type).map((timeOfDay) => ({
        route_id,
        weekday,
        time_of_day: timeOfDay,
        driver_member_id: null,
      }))
    );
    const { error: shiftsError } = await admin.from("school_route_shifts").insert(shiftRows);
    if (shiftsError) return json({ error: shiftsError.message }, 500);

    return json({ ok: true, chat_id: chat.id });
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
