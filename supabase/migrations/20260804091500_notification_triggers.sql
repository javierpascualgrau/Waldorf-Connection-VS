-- Cast defensivo: algunas columnas de "author_id" son text en vez de uuid (posts.author_id,
-- school_events.school_id) y no siempre contienen un uuid válido (dato inconsistente ya
-- confirmado en posts.author_id). Nunca debe reventar el insert que dispara el trigger.
create or replace function public.safe_uuid(p_text text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return p_text::uuid;
exception when others then
  return null;
end;
$$;

-- 1) Solicitud de unirse a una ruta escolar -> avisa al autor de la ruta.
create or replace function public.notify_route_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
begin
  select author_id into v_recipient from public.school_routes where id = new.route_id;
  if v_recipient is null or v_recipient = new.requester_id then
    return new;
  end if;
  insert into public.notifications (recipient_id, type, actor_name, actor_avatar, message, link)
  values (v_recipient, 'route_request', new.requester_name, new.requester_avatar,
          'quiere unirse a tu ruta escolar', '/rutas/oferta/' || new.route_id);
  return new;
end;
$$;

create trigger trg_notify_route_request
after insert on public.school_route_requests
for each row execute function public.notify_route_request();

-- 2) Oferta recibida por un producto de Compraventa -> avisa al autor del anuncio.
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
    '/anuncios/' || v_listing.id
  );
  return new;
end;
$$;

create trigger trg_notify_marketplace_offer
after insert on public.chat_messages
for each row when (new.message_type = 'offer')
execute function public.notify_marketplace_offer();

-- 3) Comentario en una publicación -> avisa al autor del post.
create or replace function public.notify_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post record;
  v_recipient uuid;
  v_actor record;
begin
  select id, author_id, author_email into v_post from public.posts where id = new.post_id;
  if v_post.id is null then
    return new;
  end if;

  if lower(coalesce(v_post.author_email, '')) = lower(new.user_email) then
    return new;
  end if;

  v_recipient := coalesce(public.safe_uuid(v_post.author_id), public.resolve_user_id_by_email(v_post.author_email));
  if v_recipient is null then
    return new;
  end if;

  select * into v_actor from public.resolve_identity_by_email(new.user_email);

  insert into public.notifications (recipient_id, type, actor_name, actor_avatar, message, link)
  values (
    v_recipient, 'post_comment', coalesce(new.author_name, v_actor.name), v_actor.avatar,
    'comentó tu publicación: "' || left(new.content, 60) || case when length(new.content) > 60 then '...' else '' end || '"',
    '/'
  );
  return new;
end;
$$;

create trigger trg_notify_post_comment
after insert on public.post_comments
for each row execute function public.notify_post_comment();
