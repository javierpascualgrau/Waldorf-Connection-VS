-- Coordenadas de la zona del solicitante (elegidas vía autocompletado Mapbox en el
-- formulario de "Solicitar unirse"), para que el admin del grupo pueda ver distancia
-- real y un mini-mapa en GestionRuta.jsx. Nullable: solicitudes antiguas no lo tendrán.
alter table public.school_route_requests
  add column zona_lat numeric,
  add column zona_lng numeric;
