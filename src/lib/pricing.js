// Reflejo intencionado de supabase/functions/_shared/pricing.ts: esto es solo para MOSTRAR
// el desglose en el checkout. El importe real que se cobra lo calcula el Edge Function
// create-payment-intent server-side — nunca confiar en el cálculo del cliente para el cargo.
export const SHIPPING_FLAT_RATE = 4.99;
export const PLATFORM_FEE_RATE = 0.05; // sobre item_price, no sobre el envío

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function computeBreakdown(itemPrice, { incluirEnvio = true } = {}) {
  const item_price = round2(Number(itemPrice) || 0);
  const shipping_price = incluirEnvio ? round2(SHIPPING_FLAT_RATE) : 0;
  const platform_fee = round2(item_price * PLATFORM_FEE_RATE);
  const total = round2(item_price + shipping_price + platform_fee);
  return { item_price, shipping_price, platform_fee, total };
}
