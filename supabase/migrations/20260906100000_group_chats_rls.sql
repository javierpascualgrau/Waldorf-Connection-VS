-- Los chats de grupo (is_group = true) no tenían ninguna política de INSERT que los cubriera:
-- la política de "Contactar" ya existente en chats solo contempla el caso 1 a 1 (vía
-- user_1_email/user_2_email), así que crear un grupo desde CreateGroupChatModal.jsx fallaba
-- con "new row violates row-level security policy for table chats". Se añade una política
-- nueva específica para el caso de grupo, sin tocar la 1 a 1 que ya funciona.
create policy "Cualquiera autenticado puede crear un chat de grupo"
on public.chats for insert
to authenticated
with check (is_group = true);

-- Igual en chat_participants: hace falta poder insertar las filas de participantes (el
-- creador + los invitados) justo al crear el grupo. Se restringe a chats de grupo para no
-- abrir la puerta a tocar la lista de participantes de un chat 1 a 1 (que ni siquiera usa
-- esta tabla para determinar quién es parte de la conversación).
create policy "Cualquiera autenticado puede añadir participantes a un chat de grupo"
on public.chat_participants for insert
to authenticated
with check (
  exists (
    select 1 from public.chats c
    where c.id = chat_id and c.is_group = true
  )
);
