import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";

// TODO: activar cuando haya cuenta real de Packlink PRO con webhooks de estado configurados.
// Sin cuenta real no se puede verificar el formato exacto del payload/firma que envía Packlink,
// así que este stub documenta el contrato esperado en vez de adivinarlo:
//   - Verificar la firma/secreto del webhook (según lo que documente Packlink para tu cuenta).
//   - Localizar el pedido por packlink_shipment_id (no por email/ids propios).
//   - Mapear su estado ("in_transit"/"delivered" o equivalente) a 'enviado'/'entregado'.
// Mientras tanto, mark-shipped cubre el paso pendiente_envio -> enviado manualmente,
// y release-payment ya acepta 'enviado' sin depender de que 'entregado' llegue nunca.
Deno.serve(async (req) => {
  const payload = await req.json().catch(() => null);
  console.warn("packlink-webhook recibido pero no implementado todavía:", payload);

  const admin = getSupabaseAdmin();
  void admin; // referenciado para cuando se implemente la actualización real de estado

  return new Response(JSON.stringify({ received: true, implemented: false }), {
    headers: { "Content-Type": "application/json" },
  });
});
