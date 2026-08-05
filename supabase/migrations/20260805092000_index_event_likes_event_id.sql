-- FK sin índice detectada por el advisor de rendimiento tras el rename de esta sesión
-- (school_event_likes -> event_likes, Fase 5 de notificaciones).
create index event_likes_event_id_idx on public.event_likes (event_id);
