// Duplicado intencionadamente de src/lib/pricing.js: los Edge Functions (Deno) no pueden
// importar directamente de src/ (deploys aislados), y el desglose que se COBRA de verdad
// tiene que calcularse aquí, server-side, nunca confiando en lo que mande el cliente.
export const SHIPPING_FLAT_RATE = 4.99;
export const PLATFORM_FEE_RATE = 0.05; // sobre item_price, no sobre el envío

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function computeBreakdown(itemPrice: number, { incluirEnvio = true }: { incluirEnvio?: boolean } = {}) {
  const item_price = round2(itemPrice);
  const shipping_price = incluirEnvio ? round2(SHIPPING_FLAT_RATE) : 0;
  const platform_fee = round2(item_price * PLATFORM_FEE_RATE);
  const total = round2(item_price + shipping_price + platform_fee);
  return { item_price, shipping_price, platform_fee, total };
}

// Stripe cobra en la unidad mínima de la moneda (céntimos para EUR).
export function toCents(amountEur: number) {
  return Math.round(amountEur * 100);
}
