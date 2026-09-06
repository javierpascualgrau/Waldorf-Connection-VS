-- user_1_email/user_2_email se diseñaron como obligatorias asumiendo que todo chat es 1 a 1.
-- Un chat de grupo (is_group = true) no las rellena, así que el insert fallaba con
-- "null value in column user_1_email violates not-null constraint". Las hacemos opcionales;
-- el 1 a 1 sigue funcionando igual porque ese flujo (openMarketplaceListingChat, "Contactar",
-- etc.) siempre las manda igualmente.
alter table public.chats
  alter column user_1_email drop not null,
  alter column user_2_email drop not null;
