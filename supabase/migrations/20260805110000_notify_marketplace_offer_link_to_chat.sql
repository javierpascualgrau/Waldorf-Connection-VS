-- El enlace de la notificación de oferta debía llevar al chat donde se hizo la oferta
-- (es donde se responde), no al anuncio. /hilo/:chatId ya existe como ruta en el frontend
-- y Hilo.jsx resuelve el chat activo con chats.find(c => c.id === Number(chatId)).
create or replace function public.notify_marketplace_offer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing record;
  v_actor record;
  v_recipient uuid;
begin
  select ml.id, ml.author_id, ml.author_email, ml.title
    into v_listing
    from public.chats c
    join public.marketplace_listings ml on ml.id = c.context_id
    where c.id = new.chat_id and c.context_type = 'marketplace_listing';

  if v_listing.id is null then
    return new;
  end if;

  if lower(coalesce(v_listing.author_email, '')) = lower(new.sender_email) then
    return new;
  end if;

  v_recipient := coalesce(v_listing.author_id, public.resolve_user_id_by_email(v_listing.author_email));
  if v_recipient is null then
    return new;
  end if;

  select * into v_actor from public.resolve_identity_by_email(new.sender_email);

  insert into public.notifications (recipient_id, type, actor_name, actor_avatar, message, link)
  values (
    v_recipient, 'marketplace_offer', v_actor.name, v_actor.avatar,
    'te ha hecho una oferta de ' || new.offer_amount || ' € por "' || v_listing.title || '"',
    '/hilo/' || new.chat_id
  );
  return new;
end;
$$;
