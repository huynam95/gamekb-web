-- Studio (developer / label) per game, used by the Studio filter on All Ideas.
-- Additive: one nullable column, then tag the Rockstar Games titles already in the library.
alter table public.games add column if not exists studio text;
comment on column public.games.studio is 'Studio or label shown in the Studio filter, e.g. Rockstar Games';

update public.games
set studio = 'Rockstar Games'
where studio is null
  and (
    title ~* '^grand theft auto'
    or title ~* '^red dead'
    or title ~* '^bully'
    or title ~* '^max payne'
    or title ~* '^l\.a\. noire'
    or title ~* '^manhunt'
    or title ~* '^midnight club'
    or title ~* '^the warriors$'
  );
