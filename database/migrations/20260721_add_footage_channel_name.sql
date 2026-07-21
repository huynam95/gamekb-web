-- Store the YouTube channel name alongside each footage link.
-- Run once in Supabase SQL Editor before deploying this version.

alter table public.footage
  add column if not exists channel_name text;

create index if not exists footage_channel_name_idx
  on public.footage (channel_name)
  where channel_name is not null;
