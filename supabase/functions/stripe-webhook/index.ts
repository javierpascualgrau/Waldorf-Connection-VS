import Stripe from "https://esm.sh/stripe@17?target=deno";
import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { createPacklinkShipment } from "../_shared/packlink.ts";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" }) : null;

Deno.serve(async (req) => {
  if (!stripe || !webhookSecret) {
    return new Response("Stripe no configurado.", { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret);
  } catch (err) {
    return new Response(`Firma inválida: ${err}`, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const { data: order } = await admin
        .from("orders")
        // pendiente_envio ahora significa "pendiente de que se complete la entrega",
        // ya sea postal (Packlink) o en persona (coordinada por chat).
        .update({ status: "pendiente_envio", updated_at: new Date().toISOString() })
        .eq("stripe_payment_intent_id", pi.id)
        .select()
        .single();

      if (order && order.fulfillment_method === "envio") {
        await createPacklinkShipment(order.id);
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await admin
        .from("orders")
        .update({ status: "cancelado", updated_at: new Date().toISOString() })
        .eq("stripe_payment_intent_id", pi.id);
      break;
    }

    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      if (account.details_submitted && account.charges_enabled) {
        await admin
          .from("seller_shipping_profiles")
          .update({ onboarding_complete: true })
          .eq("stripe_account_id", account.id);
      }
      break;
    }

    default:
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
