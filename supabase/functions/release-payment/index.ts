import { corsHeaders } from "../_shared/cors.ts";
import { getCallerUser, getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { releaseOrder } from "../_shared/releasePayment.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const caller = await getCallerUser(req);
  if (!caller) return json({ error: "No autenticado." }, 401);

  const { order_id } = await req.json();
  if (!order_id) return json({ error: "Falta order_id." }, 400);

  const admin = getSupabaseAdmin();
  const { data: order } = await admin.from("orders").select("buyer_id").eq("id", order_id).maybeSingle();

  if (!order) return json({ error: "Pedido no encontrado." }, 404);
  if (order.buyer_id !== caller.id) return json({ error: "No eres el comprador de este pedido." }, 403);

  const result = await releaseOrder(order_id);
  if (!result.ok) return json({ error: result.error }, 409);
  return json({ ok: true });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
