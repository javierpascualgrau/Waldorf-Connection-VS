import Stripe from "https://esm.sh/stripe@17?target=deno";
import { corsHeaders } from "../_shared/cors.ts";
import { getCallerUser, getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { computeBreakdown, toCents } from "../_shared/pricing.ts";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" }) : null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const caller = await getCallerUser(req);
    if (!caller) {
      return json({ error: "No autenticado." }, 401);
    }

    const { listing_id, delivery_address, fulfillment_method } = await req.json();
    if (!listing_id || !fulfillment_method) {
      return json({ error: "Faltan listing_id o fulfillment_method." }, 400);
    }
    if (!["mano", "envio"].includes(fulfillment_method)) {
      return json({ error: "fulfillment_method inválido." }, 400);
    }
    // Pago protegido "en mano": el encuentro se coordina por chat, no hace falta dirección.
    if (fulfillment_method === "envio" && !delivery_address) {
      return json({ error: "Falta delivery_address." }, 400);
    }

    const admin = getSupabaseAdmin();
    const { data: listing } = await admin
      .from("marketplace_listings")
      .select("*")
      .eq("id", listing_id)
      .maybeSingle();

    if (!listing) return json({ error: "Anuncio no encontrado." }, 404);

    // Guard: anuncio con author_id huérfano (email ya no coincide con ningún usuario actual,
    // ver backfill en la migración). No se puede resolver el vendedor de forma segura.
    if (!listing.author_id) {
      return json({
        error: "Este anuncio no admite compra protegida ahora mismo, contacta con el vendedor por chat.",
      }, 409);
    }

    if (listing.listing_type !== "vendo") {
      return json({ error: "Este anuncio no está en venta." }, 400);
    }
    if (fulfillment_method === "envio" && listing.delivery_method === "mano") {
      return json({ error: "Este anuncio solo admite recogida en mano." }, 400);
    }
    if (fulfillment_method === "mano" && listing.delivery_method === "envio") {
      return json({ error: "Este anuncio solo admite envío." }, 400);
    }
    if (listing.author_id === caller.id) {
      return json({ error: "No puedes comprar tu propio anuncio." }, 400);
    }
    if (listing.sold_at) {
      return json({ error: "Este anuncio ya se ha vendido." }, 409);
    }

    const { data: activeOrder } = await admin
      .from("orders")
      .select("id")
      .eq("listing_id", listing_id)
      .not("status", "eq", "cancelado")
      .maybeSingle();
    if (activeOrder) {
      return json({ error: "Ya hay una compra en curso para este anuncio." }, 409);
    }

    const { data: shippingProfile } = await admin
      .from("seller_shipping_profiles")
      .select("*")
      .eq("user_id", listing.author_id)
      .maybeSingle();

    if (!shippingProfile?.onboarding_complete) {
      return json({
        error: "El vendedor todavía no ha activado los cobros con envío para sus anuncios.",
      }, 409);
    }

    if (!stripe) {
      return json({ error: "Los pagos no están configurados todavía (falta STRIPE_SECRET_KEY)." }, 503);
    }

    // Si el comprador tiene una oferta aceptada para este anuncio, se cobra ese importe en
    // vez del precio publicado. Se resuelve aquí, server-side, nunca a partir de lo que
    // mande el cliente — el chat es la fuente de verdad (accepted_offer_price).
    let itemPrice = Number(listing.price);
    if (caller.email && listing.author_email) {
      const emails = [caller.email.toLowerCase().trim(), listing.author_email.toLowerCase().trim()].sort();
      const { data: chat } = await admin
        .from("chats")
        .select("context_type, context_id, accepted_offer_price")
        .eq("user_1_email", emails[0])
        .eq("user_2_email", emails[1])
        .maybeSingle();

      if (
        chat?.context_type === "marketplace_listing" &&
        chat?.context_id === listing.id &&
        chat?.accepted_offer_price != null
      ) {
        itemPrice = Number(chat.accepted_offer_price);
      }
    }

    const breakdown = computeBreakdown(itemPrice, { incluirEnvio: fulfillment_method === "envio" });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: toCents(breakdown.total),
      currency: "eur",
      // Separate charges and transfers: el cobro va a la cuenta de la plataforma.
      // El transfer al vendedor (solo item_price) se crea después, en release-payment.
      metadata: { listing_id: String(listing_id), buyer_id: caller.id, seller_id: listing.author_id },
    });

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert([{
        listing_id,
        buyer_id: caller.id,
        seller_id: listing.author_id,
        buyer_email: caller.email ?? "",
        seller_email: listing.author_email ?? "",
        item_price: breakdown.item_price,
        shipping_price: breakdown.shipping_price,
        platform_fee: breakdown.platform_fee,
        total_amount: breakdown.total,
        delivery_address: fulfillment_method === "envio" ? delivery_address : null,
        fulfillment_method,
        status: "pendiente_pago",
        stripe_payment_intent_id: paymentIntent.id,
      }])
      .select()
      .single();

    if (orderError) {
      return json({ error: "Error al crear el pedido: " + orderError.message }, 500);
    }

    return json({ client_secret: paymentIntent.client_secret, order_id: order.id, breakdown });
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
