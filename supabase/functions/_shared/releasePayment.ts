import Stripe from "https://esm.sh/stripe@17?target=deno";
import { getSupabaseAdmin } from "./supabaseAdmin.ts";
import { toCents } from "./pricing.ts";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" }) : null;

// Compartido por release-payment (manual, dispara el comprador) y auto-release-payments
// (cron de seguridad a los 14 días). El transfer es SOLO por item_price — el envío y la
// comisión de plataforma se quedan en el balance de la plataforma, no se transfieren.
export async function releaseOrder(orderId: number) {
  const admin = getSupabaseAdmin();
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();

  if (!order) return { ok: false, error: "Pedido no encontrado." };
  if (!["enviado", "entregado"].includes(order.status)) {
    return { ok: false, error: `El pedido está en estado '${order.status}', no se puede liberar todavía.` };
  }
  if (!stripe) return { ok: false, error: "Los pagos no están configurados todavía." };

  const { data: sellerProfile } = await admin
    .from("seller_shipping_profiles")
    .select("stripe_account_id")
    .eq("user_id", order.seller_id)
    .maybeSingle();

  if (!sellerProfile?.stripe_account_id) {
    return { ok: false, error: "El vendedor no tiene una cuenta Stripe Connect asociada." };
  }

  const transfer = await stripe.transfers.create({
    amount: toCents(Number(order.item_price)),
    currency: order.currency ?? "eur",
    destination: sellerProfile.stripe_account_id,
    source_transaction: undefined, // el cargo ya se capturó por separado (separate charges and transfers)
    metadata: { order_id: String(orderId) },
  });

  await admin
    .from("orders")
    .update({ status: "confirmado", stripe_transfer_id: transfer.id, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  await admin
    .from("marketplace_listings")
    .update({ sold_at: new Date().toISOString() })
    .eq("id", order.listing_id);

  return { ok: true };
}
