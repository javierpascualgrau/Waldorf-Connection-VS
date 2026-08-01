-- La política de SELECT de chat_participants se referenciaba a sí misma dentro de su propio
-- USING (una subconsulta "from chat_participants" evaluada bajo la misma política), lo que
-- provocaba "infinite recursion detected in policy for relation chat_participants" en CUALQUIER
-- operación sobre chats/chat_participants para un usuario autenticado (incluida la bandeja de
-- Hilo.jsx entera y el "Contactar" de cualquier listado, no solo el de rutas).
--
-- Fix: mover el chequeo "¿soy participante activo de este chat?" a una función security definer
-- (patrón estándar de Supabase para evitar recursión RLS) — al ejecutarse con los privilegios del
-- dueño de la función, la consulta interna a chat_participants no vuelve a disparar esta política.
create or replace function public.is_active_chat_participant(p_chat_id bigint)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.chat_participants
    where chat_id = p_chat_id
      and user_email = (select auth.jwt()) ->> 'email'
      and left_at is null
  );
$$;

drop policy "Un participante puede ver la lista de participantes de su chat" on public.chat_participants;

create policy "Un participante puede ver la lista de participantes de su chat"
on public.chat_participants for select
using (public.is_active_chat_participant(chat_id));

-- La función security definer queda expuesta como RPC pública por defecto (PostgREST).
-- Solo la necesita el motor de RLS al evaluar la política para usuarios autenticados;
-- revocamos el acceso directo a anon/public.
revoke execute on function public.is_active_chat_participant(bigint) from public;
revoke execute on function public.is_active_chat_participant(bigint) from anon;
grant execute on function public.is_active_chat_participant(bigint) to authenticated;
