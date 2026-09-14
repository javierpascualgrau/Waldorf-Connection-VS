-- Publicación destacada por perfil. featured_post_type discrimina de qué tabla es el id
-- (posts / events / company_products / company_offers) — igual patrón polimórfico que ya usa
-- chats.context_id/context_type, así que no lleva FK (el id puede venir de tablas distintas
-- según el tipo de perfil). "Solo una destacada a la vez" se cumple solo con sobreescribir
-- estas dos columnas, no hace falta lógica adicional de "quitar la anterior".
alter table public.profiles
  add column featured_post_id bigint,
  add column featured_post_type text check (featured_post_type in ('post'));

alter table public.company_profiles
  add column featured_post_id bigint,
  add column featured_post_type text check (featured_post_type in ('post', 'product', 'offer'));

alter table public.school_profiles
  add column featured_post_id bigint,
  add column featured_post_type text check (featured_post_type in ('post', 'event'));
