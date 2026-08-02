-- Se deja de pedir "Ida/Vuelta/Ida y vuelta" al publicar una ruta (CreateSchoolRouteModal.jsx).
-- La columna trip_type se queda (ya tiene datos: 1 'ida', 2 'ambos') pero el cliente deja de
-- escribirla; para que el insert no falle (era NOT NULL sin default) se le pone 'ambos' por
-- defecto, la opción más inclusiva.
alter table public.school_routes
  alter column trip_type set default 'ambos';
