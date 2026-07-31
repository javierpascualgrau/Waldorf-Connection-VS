-- Ya aplicada manualmente en Supabase (ver conversación) — este archivo solo documenta el
-- cambio para que supabase/migrations/ quede completo y no repite nada al aplicarse de nuevo.
--
-- Pago protegido "en mano": permite cobrar y retener el pago para un encuentro en persona
-- (sin envío, sin dirección), reusando exactamente el mismo estado del pedido que "envío".
alter table public.orders
  add column fulfillment_method text not null default 'envio'
    check (fulfillment_method in ('mano','envio'));

alter table public.orders
  alter column delivery_address drop not null;
