-- Prevent duplicate game titles after trimming and case normalization.
-- Review the duplicate-report query first. If it returns rows, merge or rename them before creating the index.

select lower(regexp_replace(btrim(title), '\s+', ' ', 'g')) as normalized_title,
       count(*) as duplicate_count,
       array_agg(id order by id) as game_ids,
       array_agg(title order by id) as titles
from public.games
group by lower(regexp_replace(btrim(title), '\s+', ' ', 'g'))
having count(*) > 1;

create unique index if not exists games_title_normalized_unique
on public.games (lower(regexp_replace(btrim(title), '\s+', ' ', 'g')));
