-- Un mismo hilo (chats) puede ahora agrupar ofertas de varios anuncios distintos entre las
-- mismas dos personas (ver fusión de hilos duplicados en Hilo.jsx), así que la tarjeta fija
-- de "producto" al principio de la conversación ya no basta para saber a qué anuncio se
-- refiere cada oferta. Denormalizamos el producto en el propio mensaje al crearlo (mismo
-- criterio que author_name/author_avatar en el resto de tablas de contenido), en vez de
-- depender del contexto único del chat.
alter table public.chat_messages
  add column if not exists offer_listing_id bigint references public.marketplace_listings(id),
  add column if not exists offer_listing_title text,
  add column if not exists offer_listing_image text;
