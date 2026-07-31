import Stripe from "https://esm.sh/stripe@17?target=deno";
import { corsHeaders } from "../_shared/cors.ts";
import { getCallerUser, getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" }) : null;

// Crea (o reutiliza) la cuenta Stripe Connect Express del vendedor y devuelve el link de
// onboarding. onboarding_complete se marca más tarde por stripe-webhook (evento account.updated),
// nunca aquí directamente.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!stripe) return json({ error: "Los pagos no están configurados todavía (falta STRIPE_SECRET_KEY)." }, 503);

  const caller = await getCallerUser(req);
  if (!caller) return json({ error: "No autenticado." }, 401);

  const { return_url } = await req.json();
  const admin = getSupabaseAdmin();

  const { data: profile } = await admin
    .from("seller_shipping_profiles")
    .select("*")
    .eq("user_id", caller.id)
    .maybeSingle();

  let stripeAccountId = profile?.stripe_account_id;

  if (!stripeAccountId) {
    const account = await stripe.accounts.create({ type: "express", email: caller.email ?? undefined });
    stripeAccountId = account.id;

    await admin.from("seller_shipping_profiles").upsert({
      user_id: caller.id,
      email: caller.email ?? "",
      stripe_account_id: stripeAccountId,
      onboarding_complete: false,
    });
  }

  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: return_url,
    return_url,
    type: "account_onboarding",
  });

  return json({ url: accountLink.url });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
