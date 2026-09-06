-- La política anterior (20260906110000) exigía que created_by_email, tal y como lo manda el
-- navegador, coincidiera EXACTO con el email de la sesión — cualquier diferencia de
-- mayúsculas/minúsculas o espacios entre los dos (ya nos pasó con los chats duplicados de
-- Hilo) hacía fallar el insert con "row-level security policy". Para no depender de que
-- coincidan, un trigger rellena created_by_email a partir del JWT de la sesión directamente
-- en el servidor, ignorando lo que mande el cliente — así nunca puede desincronizarse.
create or replace function public.set_chat_creator_email()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_group then
    new.created_by_email := lower(trim(((select auth.jwt()) ->> 'email')));
  end if;
  return new;
end;
$$;

drop trigger if exists set_chat_creator_email_trigger on public.chats;
create trigger set_chat_creator_email_trigger
  before insert on public.chats
  for each row
  execute function public.set_chat_creator_email();

-- Ya no hace falta comprobar el email en esta política: el trigger de arriba garantiza que
-- created_by_email siempre es correcto, así que solo queda validar que es un chat de grupo.
drop policy if exists "Solo el creador puede dar de alta un chat de grupo" on public.chats;
create policy "Solo el creador puede dar de alta un chat de grupo"
on public.chats for insert
to authenticated
with check (is_group = true);

drop policy if exists "Solo el creador o un participante activo añade gente al grupo" on public.chat_participants;
create policy "Solo el creador o un participante activo añade gente al grupo"
on public.chat_participants for insert
to authenticated
with check (
  exists (
    select 1 from public.chats c
    where c.id = chat_id
      and c.is_group = true
      and (
        lower(coalesce(c.created_by_email, '')) = lower(trim(((select auth.jwt()) ->> 'email')))
        or public.is_active_chat_participant(chat_id)
      )
  )
);
