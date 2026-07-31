import { corsHeaders } from "../_shared/cors.ts";
import { getCallerUser, getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const caller = await getCallerUser(req);
  if (!caller) return json({ error: "No autenticado." }, 401);

  const { order_id } = await req.json();
  if (!order_id) return json({ error: "Falta order_id." }, 400);

  const admin = getSupabaseAdmin();
  const { data: order } = await admin.from("orders").select("*").eq("id", order_id).maybeSingle();

  if (!order) return json({ error: "Pedido no encontrado." }, 404);
  if (order.seller_id !== caller.id) return json({ error: "No eres el vendedor de este pedido." }, 403);
  if (order.status !== "pendiente_envio") {
    return json({ error: `El pedido está en estado '${order.status}', no se puede marcar como enviado.` }, 409);
  }

  const { error } = await admin
    .from("orders")
    .update({ status: "enviado", updated_at: new Date().toISOString() })
    .eq("id", order_id);

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
