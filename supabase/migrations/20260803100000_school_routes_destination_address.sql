-- Texto de la dirección de destino elegida al publicar (CreateSchoolRouteModal.jsx). No
-- existía ninguna columna para esto: solo se guardaban destination_lat/lng. Hace falta
-- porque el campo "Destino" ahora es editable de forma independiente al colegio elegido
-- (puede no coincidir con school_profiles.location), y RouteOfferDetail.jsx necesita
-- mostrar la dirección real usada, no solo la del colegio.
alter table public.school_routes
  add column destination_address text;
