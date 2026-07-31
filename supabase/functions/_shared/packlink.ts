import { getSupabaseAdmin } from "./supabaseAdmin.ts";

// Paquete por defecto: el anuncio no captura peso/dimensiones (fuera de alcance actual),
// así que se usa un valor fijo razonable para un "paquete estándar" de segunda mano.
const DEFAULT_PACKAGE = { weight_kg: 1, length_cm: 30, width_cm: 20, height_cm: 10 };

// Crea el envío en Packlink PRO para un pedido ya cobrado. Si no hay PACKLINK_API_KEY
// configurada todavía (no hay cuenta real), degrada con gracia: deja el pedido en
// pendiente_envio sin packlink_shipment_id, sin romper el resto del flujo.
export async function createPacklinkShipment(orderId: number) {
  const apiKey = Deno.env.get("PACKLINK_API_KEY");
  const admin = getSupabaseAdmin();

  if (!apiKey) {
    console.warn(`PACKLINK_API_KEY no configurada — order ${orderId} queda sin shipment de Packlink.`);
    return;
  }

  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return;

  const { data: sellerProfile } = await admin
    .from("seller_shipping_profiles")
    .select("pickup_address")
    .eq("user_id", order.seller_id)
    .maybeSingle();

  if (!sellerProfile?.pickup_address) {
    console.warn(`Vendedor sin pickup_address — order ${orderId} queda sin shipment de Packlink.`);
    return;
  }

  // TODO: sustituir por la llamada real a la API de Packlink PRO (plan Free) cuando haya
  // cuenta y API key reales. Contrato esperado: POST a su endpoint de shipments con
  // origin=sellerProfile.pickup_address, destination=order.delivery_address, package=DEFAULT_PACKAGE,
  // devolviendo { shipment_id, label_url, tracking_url }.
  try {
    const res = await fetch("https://api.packlink.com/v1/shipments", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: sellerProfile.pickup_address,
        destination: order.delivery_address,
        package: DEFAULT_PACKAGE,
      }),
    });
    if (!res.ok) throw new Error(`Packlink respondió ${res.status}`);
    const data = await res.json();

    await admin.from("orders").update({
      packlink_shipment_id: data.shipment_id ?? null,
      packlink_label_url: data.label_url ?? null,
      packlink_tracking_url: data.tracking_url ?? null,
      updated_at: new Date().toISOString(),
    }).eq("id", orderId);
  } catch (err) {
    console.error(`Error creando envío en Packlink para order ${orderId}:`, err);
  }
}
