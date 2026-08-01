alter table public.posts add column type text not null default 'daily';
alter table public.posts add constraint posts_type_check check (type in ('daily', 'event'));
