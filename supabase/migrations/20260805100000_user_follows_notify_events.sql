-- Seguir una entidad y recibir notificaciones de sus eventos pasan a ser cosas
-- independientes: puedes seguir sin activar notificaciones.
alter table public.user_follows
  add column notify_events boolean not null default false;
