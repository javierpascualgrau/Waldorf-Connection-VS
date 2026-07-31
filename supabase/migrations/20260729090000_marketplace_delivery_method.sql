-- Compraventa: elección en mano / envío / ambos por anuncio, y marcado de "vendido".
alter table public.marketplace_listings
  add column delivery_method text not null default 'ambos'
    check (delivery_method in ('mano','envio','ambos')),
  add column sold_at timestamptz,
  add column author_id uuid;  -- = auth.users.id; permite resolver seller_id sin depender de que
                               -- author_email siga coincidiendo con el email de login actual

create index marketplace_listings_author_id_idx on public.marketplace_listings (author_id);

-- Backfill de author_id a partir de author_email, cruzando contra las 3 tablas de identidad
-- que ya usa getMemberIdentity (src/lib/identity.js). Idempotente: si no hay anuncios previos
-- con author_id nulo, no actualiza nada.
update public.marketplace_listings ml
set author_id = p.id
from public.profiles p
where ml.author_id is null
  and lower(p.user_email) = lower(ml.author_email);

update public.marketplace_listings ml
set author_id = sp.id
from public.school_profiles sp
where ml.author_id is null
  and lower(sp.school_email) = lower(ml.author_email);

update public.marketplace_listings ml
set author_id = cp.id
from public.company_profiles cp
where ml.author_id is null
  and lower(cp.company_email) = lower(ml.author_email);

-- Perfil de envíos del vendedor: cuenta Stripe Connect + dirección de recogida.
-- Keyed por user_id (auth.users.id), no por email: el email puede cambiar y no debe
-- poder desligar una cuenta bancaria real de su dueño (ver justificación en el plan).
create table public.seller_shipping_profiles (
  user_id uuid primary key,
  email text not null,
  stripe_account_id text,
  onboarding_complete boolean not null default false,
  pickup_address jsonb,
  created_at timestamptz not null default now()
);
alter table public.seller_shipping_profiles enable row level security;

create policy "Owner can read their own shipping profile"
  on public.seller_shipping_profiles for select
  using ((select auth.uid()) = user_id);

create policy "Owner can upsert their own pickup address"
  on public.seller_shipping_profiles for insert
  with check ((select auth.uid()) = user_id);

create policy "Owner can update their own pickup address"
  on public.seller_shipping_profiles for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
-- stripe_account_id / onboarding_complete los escribe solo la service role (Edge Functions);
-- ninguna policy de update para authenticated cubre esas columnas por diseño.
