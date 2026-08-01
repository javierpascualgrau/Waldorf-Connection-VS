alter table public.school_routes
  add column seats integer not null default 4;

update public.school_routes sr
set author_id = p.id
from public.profiles p
where sr.author_id is null and lower(p.user_email) = lower(sr.author_email);
update public.school_routes sr
set author_id = sp.id
from public.school_profiles sp
where sr.author_id is null and lower(sp.school_email) = lower(sr.author_email);
update public.school_routes sr
set author_id = cp.id
from public.company_profiles cp
where sr.author_id is null and lower(cp.company_email) = lower(sr.author_email);

alter table public.school_profiles
  add column location_lat numeric,
  add column location_lng numeric;

-- Convenciones cerradas para evitar desfases entre lo que escribe close-route-group y lo
-- que lee GrupoRutaCalendario.jsx: weekday usa date-fns getISODay() (lunes=1..viernes=5,
-- NUNCA getDay() nativo que empieza en domingo=0), time_of_day solo 'manana'|'tarde'.
alter table public.school_route_shifts
  add constraint school_route_shifts_weekday_laborable check (weekday between 1 and 5),
  add constraint school_route_shifts_time_of_day_check check (time_of_day in ('manana','tarde'));

-- Evita solicitudes duplicadas del mismo usuario a la misma ruta mientras esté pendiente
-- (defensa en profundidad además del guard en request-join-route).
create unique index school_route_requests_unique_pending
  on public.school_route_requests (route_id, requester_id)
  where status = 'pendiente';

-- Hueco de RLS encontrado: falta la rama de grupo en el UPDATE de chat_messages
-- (necesaria para marcar como leído en chats de grupo; el resto de la política se deja igual).
create policy "Participantes de grupo pueden marcar mensajes como leídos"
  on public.chat_messages for update
  using (exists (
    select 1 from public.chat_participants cp
    where cp.chat_id = chat_messages.chat_id
      and cp.user_email = (select auth.jwt()) ->> 'email'
      and cp.left_at is null
  ));
