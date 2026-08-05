alter table public.school_events rename to events;
alter table public.school_event_likes rename to event_likes;

alter table public.events
  add column company_id text,
  add column company_name text,
  add column company_email text,
  add column company_logo text,
  add constraint events_owner_check check (
    (school_id is not null and company_id is null) or
    (school_id is null and company_id is not null)
  ) not valid;

-- not valid + validate por separado: evita bloquear/fallar si alguna fila existente no
-- cumpliera el check (todas las filas actuales son de colegio, deberían cumplirlo, pero
-- se valida explícitamente después para confirmarlo sin arriesgar la migración en sí).
alter table public.events validate constraint events_owner_check;
