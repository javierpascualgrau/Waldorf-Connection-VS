-- Los advisors marcaron notify_route_request/notify_marketplace_offer/notify_post_comment/
-- notify_new_event/safe_uuid como RPC pública ejecutable por anon/authenticated. Postgres ya
-- impide llamar a una función "returns trigger" fuera de un trigger real (los 4 notify_*),
-- así que no son explotables tal cual, pero no tienen ninguna razón para ser invocables
-- directamente — solo las dispara el propio trigger, sin necesidad de que ningún rol tenga
-- EXECUTE. Mismo criterio de higiene ya aplicado esta sesión a is_active_chat_participant.
revoke execute on function public.notify_route_request() from public, anon, authenticated;
revoke execute on function public.notify_marketplace_offer() from public, anon, authenticated;
revoke execute on function public.notify_post_comment() from public, anon, authenticated;
revoke execute on function public.notify_new_event() from public, anon, authenticated;

revoke execute on function public.safe_uuid(text) from public, anon;
grant execute on function public.safe_uuid(text) to authenticated;
