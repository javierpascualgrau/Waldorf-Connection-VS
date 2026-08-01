create table public.school_event_likes (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default timezone('utc'::text, now()),
  user_email text not null,
  event_id uuid not null references public.school_events(id) on delete cascade,
  unique (user_email, event_id)
);

alter table public.school_event_likes enable row level security;

create policy "Permitir leer likes" on public.school_event_likes for select using (true);
create policy "Permitir insertar likes" on public.school_event_likes for insert with check (true);
create policy "Permitir borrar likes" on public.school_event_likes for delete using (true);
