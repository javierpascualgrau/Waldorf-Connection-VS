-- Seguir y recibir notificaciones de eventos pasan a ser cosas independientes:
-- solo se notifica a los followers con notify_events = true.
create or replace function public.notify_new_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_email text;
  v_actor_name text;
  v_actor_avatar text;
begin
  v_owner_email := coalesce(new.school_email, new.company_email);
  if v_owner_email is null then
    return new;
  end if;
  v_actor_name := coalesce(new.school_name, new.company_name);
  v_actor_avatar := coalesce(new.school_logo, new.company_logo);

  insert into public.notifications (recipient_id, type, actor_name, actor_avatar, message, link)
  select
    public.resolve_user_id_by_email(uf.follower_email),
    'new_event',
    v_actor_name,
    v_actor_avatar,
    'publicó un nuevo evento: ' || new.title,
    '/eventos/' || new.id
  from public.user_follows uf
  where lower(uf.following_email) = lower(v_owner_email)
    and uf.notify_events = true
    and public.resolve_user_id_by_email(uf.follower_email) is not null;

  return new;
end;
$$;
