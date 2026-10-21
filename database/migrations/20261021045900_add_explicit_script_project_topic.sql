-- Store project classification independently from narration and publishing metadata.
alter table public.scripts add column if not exists topic text;

update public.scripts s
set topic = coalesce(
  nullif(btrim(substring(s.description from '(?im)^[[:blank:]]*Topic:[[:blank:]]*([^\r\n]*)')), ''),
  (
    select btrim(tag)
    from unnest(s.tags) with ordinality as legacy_tags(tag, position)
    where tag ~* '^(games[[:space:]]|afk[[:space:]]|details)'
    order by position
    limit 1
  ),
  ''
)
where s.topic is null;

alter table public.scripts alter column topic set default '';
comment on column public.scripts.topic is 'Short project topic; empty string means explicitly unassigned. Independent of description, tags and script content.';
