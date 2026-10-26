-- Idea usage statistics + YouTube stats.
-- 1) script_ideas: which ideas are in which Short Project (long videos already
--    have long_video_project_ideas).
-- 2) A trigger keeps script_ideas in step with clips (assets[].idea_id).
-- 3) Backfill from existing projects: clip idea_ids and "• Game: Idea title" lines.
-- 4) YouTube link + stats columns on scripts and long_video_projects.
-- Additive only.

create table if not exists public.script_ideas (
  script_id bigint not null references public.scripts(id) on delete cascade,
  detail_id bigint not null references public.details(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (script_id, detail_id)
);
create index if not exists script_ideas_detail_idx on public.script_ideas (detail_id);

create or replace function public.sync_script_ideas_from_assets()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.script_ideas (script_id, detail_id, position)
  select distinct on ((a ->> 'idea_id')::bigint)
    new.id,
    (a ->> 'idea_id')::bigint,
    coalesce(nullif(a ->> 'idea_order', '')::int, 0)
  from jsonb_array_elements(case when jsonb_typeof(new.assets) = 'array' then new.assets else '[]'::jsonb end) as a
  where (a ->> 'idea_id') ~ '^\d+$'
    and exists (select 1 from public.details d where d.id = (a ->> 'idea_id')::bigint)
  on conflict (script_id, detail_id) do nothing;
  return new;
end;
$$;

drop trigger if exists scripts_sync_script_ideas on public.scripts;
create trigger scripts_sync_script_ideas
  after insert or update of assets on public.scripts
  for each row execute function public.sync_script_ideas_from_assets();

-- Backfill from clips.
insert into public.script_ideas (script_id, detail_id, position)
select distinct on (s.id, (a ->> 'idea_id')::bigint)
  s.id, (a ->> 'idea_id')::bigint, coalesce(nullif(a ->> 'idea_order', '')::int, 0)
from public.scripts s,
  jsonb_array_elements(case when jsonb_typeof(s.assets) = 'array' then s.assets else '[]'::jsonb end) as a
where (a ->> 'idea_id') ~ '^\d+$'
  and exists (select 1 from public.details d where d.id = (a ->> 'idea_id')::bigint)
on conflict (script_id, detail_id) do nothing;

-- Backfill from description lines written when ideas were added ("• Game: Idea title").
insert into public.script_ideas (script_id, detail_id, position)
select s.id, d.id, 0
from public.scripts s
join public.details d on true
join public.games g on g.id = d.game_id
where strpos(coalesce(s.description, ''), '• ' || g.title || ': ' || d.title) > 0
on conflict (script_id, detail_id) do nothing;

alter table public.scripts
  add column if not exists youtube_url text,
  add column if not exists youtube_views bigint,
  add column if not exists youtube_likes bigint,
  add column if not exists youtube_comments bigint,
  add column if not exists youtube_stats_at timestamptz;

alter table public.long_video_projects
  add column if not exists youtube_url text,
  add column if not exists youtube_views bigint,
  add column if not exists youtube_likes bigint,
  add column if not exists youtube_comments bigint,
  add column if not exists youtube_stats_at timestamptz;
