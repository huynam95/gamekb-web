-- Persist editable video topics and opening hooks in Supabase.
-- Run this once in Supabase SQL Editor before deploying this version.

create table if not exists public.video_topics (
  id text primary key,
  title text not null,
  hook text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_topics_sort_order_idx
  on public.video_topics (sort_order, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_video_topics_updated_at on public.video_topics;
create trigger set_video_topics_updated_at
before update on public.video_topics
for each row
execute function public.set_updated_at();

alter table public.video_topics enable row level security;

drop policy if exists "Allow app access to video topics" on public.video_topics;
create policy "Allow app access to video topics"
on public.video_topics
for all
using (true)
with check (true);

insert into public.video_topics (id, title, hook, sort_order) values
  ('troll-other-games', 'Games That Troll Other Games', 'Did you know some games secretly make fun of other games?', 0),
  ('troll-you', 'Games That Troll You', 'Did you know some games are built to mess with the player?', 1),
  ('remember-you', 'Games That Remember You', 'Did you know some games actually remember what you did?', 2),
  ('punish-you', 'Games That Punish You For…', 'Did you know some games punish you for doing the one thing they told you not to?', 3),
  ('fourth-wall', 'Games That Break The Fourth Wall', 'Did you know some games know they are being played?', 4),
  ('afk-secret', 'AFK Secrets In Video Games', 'Did you know some games hide secrets for players who do absolutely nothing?', 5),
  ('unnoticed-details', 'Details In Your Favorite Games You Never Noticed', 'Did you know your favorite games are hiding details most players never notice?', 6),
  ('expect-unexpected', 'Games Expect The Unexpected', 'Did you know some games are ready for choices you were never supposed to make?', 7)
on conflict (id) do nothing;
