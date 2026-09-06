-- El verdadero motivo del "row-level security policy" en el insert de chats de grupo: tanto
-- el modal (.insert().select()) como cualquier INSERT ... RETURNING necesitan, además de pasar
-- el WITH CHECK, poder LEER la fila recién creada — y la única política de SELECT en chats
-- solo cubre el caso 1 a 1 (user_1_email/user_2_email), que en un chat de grupo están vacíos.
-- Sin esto tampoco se podrían listar los chats de grupo después de crearlos (ver Hilo.jsx).
create policy "El creador o un participante activo ve el chat de grupo"
on public.chats for select
to authenticated
using (
  is_group = true and (
    lower(coalesce(created_by_email, '')) = lower(trim(((select auth.jwt()) ->> 'email')))
    or public.is_active_chat_participant(id)
  )
);
