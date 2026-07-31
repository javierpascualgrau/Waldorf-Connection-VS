import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { releaseOrder } from "../_shared/releasePayment.ts";

// Llamada por el cron diario (ver migración 20260729090200_auto_release_payments_cron.sql).
// Auto-libera pedidos en 'enviado' que llevan más de 14 días sin confirmación del comprador,
// para que el vendedor no se quede sin cobrar indefinidamente si el comprador nunca actúa.
Deno.serve(async () => {
  const admin = getSupabaseAdmin();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: staleOrders } = await admin
    .from("orders")
    .select("id")
    .eq("status", "enviado")
    .lt("updated_at", fourteenDaysAgo);

  const results = [];
  for (const order of staleOrders ?? []) {
    const result = await releaseOrder(order.id);
    results.push({ order_id: order.id, ...result });
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
