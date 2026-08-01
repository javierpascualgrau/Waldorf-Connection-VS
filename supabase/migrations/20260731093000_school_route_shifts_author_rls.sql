-- La política existente "Miembros de la ruta pueden ver y editar los turnos" solo cubre a
-- quien tiene fila en school_route_members — el autor de la ruta nunca tiene una (no se
-- apunta a sí mismo como miembro), así que no podría editar los turnos de su propio grupo.
-- Política aditiva, mismo patrón que ya usa school_route_members para el autor.
create policy "El autor de la ruta puede ver y editar los turnos"
  on public.school_route_shifts for all
  using (exists (
    select 1 from public.school_routes sr
    where sr.id = school_route_shifts.route_id
      and sr.author_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.school_routes sr
    where sr.id = school_route_shifts.route_id
      and sr.author_id = (select auth.uid())
  ));
