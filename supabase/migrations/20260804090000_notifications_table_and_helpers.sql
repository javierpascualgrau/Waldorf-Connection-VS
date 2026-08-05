create table public.notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null,
  type text not null check (type in ('route_request','marketplace_offer','post_comment','new_event')),
  actor_name text,
  actor_avatar text,
  message text not null,
  link text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_created_idx on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Cada uno ve solo sus notificaciones"
  on public.notifications for select
  using (recipient_id = (select auth.uid()));

create policy "Cada uno marca como leídas solo las suyas"
  on public.notifications for update
  using (recipient_id = (select auth.uid()));

-- Sin política de INSERT para authenticated/anon a propósito: solo los triggers
-- (SECURITY DEFINER, dueño postgres) escriben notificaciones. Un usuario nunca debe
-- poder insertarse notificaciones falsas a sí mismo o a otros directamente.

-- Resuelve un email a auth.users.id. Necesario porque user_follows/chat_messages/posts
-- guardan email (mutable), y recipient_id de notifications debe ser siempre uuid.
create or replace function public.resolve_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

-- Replica en SQL la prioridad colegio -> empresa -> perfil de src/lib/identity.js,
-- para poder rellenar actor_name/actor_avatar cuando el actor solo se conoce por email.
create or replace function public.resolve_identity_by_email(p_email text)
returns table(name text, avatar text)
language sql
security definer
set search_path = public
stable
as $$
  select sp.name, sp.avatar_url from public.school_profiles sp where lower(sp.school_email) = lower(p_email)
  union all
  select cp.name, cp.logo_url from public.company_profiles cp where lower(cp.company_email) = lower(p_email)
  and not exists (select 1 from public.school_profiles sp2 where lower(sp2.school_email) = lower(p_email))
  union all
  select pr.display_name, pr.avatar_url from public.profiles pr where lower(pr.user_email) = lower(p_email)
  and not exists (select 1 from public.school_profiles sp3 where lower(sp3.school_email) = lower(p_email))
  and not exists (select 1 from public.company_profiles cp3 where lower(cp3.company_email) = lower(p_email))
  limit 1;
$$;

revoke execute on function public.resolve_user_id_by_email(text) from public;
revoke execute on function public.resolve_user_id_by_email(text) from anon;
grant execute on function public.resolve_user_id_by_email(text) to authenticated;

revoke execute on function public.resolve_identity_by_email(text) from public;
revoke execute on function public.resolve_identity_by_email(text) from anon;
grant execute on function public.resolve_identity_by_email(text) to authenticated;
