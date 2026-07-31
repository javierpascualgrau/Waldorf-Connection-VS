import { loadStripe } from '@stripe/stripe-js';

// Mismo patrón que src/api/supabaseClient.js: una sola instancia, clave pública
// (segura de exponer en el cliente) leída de las env vars de Vite.
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
