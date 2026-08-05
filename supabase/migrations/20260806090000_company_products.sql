create table public.company_products (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  company_name text,
  title text not null,
  description text,
  price numeric,
  image_url text,
  link_buy text
);

create index company_products_company_id_idx on public.company_products(company_id);

alter table public.company_products enable row level security;

create policy "Lectura pública de productos" on public.company_products
  for select using (true);

create policy "La empresa gestiona sus propios productos" on public.company_products
  for all using ((select auth.uid()) = company_id) with check ((select auth.uid()) = company_id);
