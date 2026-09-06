-- La política anterior (20260906100000) dejaba insertar una fila en chat_participants para
-- CUALQUIER chat de grupo existente, con cualquier user_email — en teoría, alguien podía
-- añadirse a sí mismo a un grupo ajeno adivinando su id numérico y así ver sus mensajes.
-- Se sustituye por una versión que solo deja tocar la lista de participantes al creador del
-- grupo o a quien ya sea participante activo de él.

-- Necesitamos saber quién creó cada chat de grupo para poder comprobarlo en la política.
alter table public.chats
  add column if not exists created_by_email text;

drop policy if exists "Cualquiera autenticado puede crear un chat de grupo" on public.chats;
drop policy if exists "Cualquiera autenticado puede añadir participantes a un chat de grupo" on public.chat_participants;

create policy "Solo el creador puede dar de alta un chat de grupo"
on public.chats for insert
to authenticated
with check (is_group = true and created_by_email = (select auth.jwt()) ->> 'email');

create policy "Solo el creador o un participante activo añade gente al grupo"
on public.chat_participants for insert
to authenticated
with check (
  exists (
    select 1 from public.chats c
    where c.id = chat_id
      and c.is_group = true
      and (
        c.created_by_email = (select auth.jwt()) ->> 'email'
        or public.is_active_chat_participant(chat_id)
      )
  )
);
