-- Audience Requests: several viewers can ask for things under the same video,
-- so the same link may be saved more than once. Drops the unique index only;
-- no data changes. A plain index keeps lookups by link fast.
drop index if exists public.audience_requests_source_url_unique;
create index if not exists audience_requests_source_url_idx
  on public.audience_requests (source_url)
  where source_url is not null and btrim(source_url) <> '';
