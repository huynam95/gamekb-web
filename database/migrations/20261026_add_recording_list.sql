-- Recording List: ideas Nam records himself.
-- Additive only: new nullable columns / defaults on details, no data changes.
alter table public.details
  add column if not exists capture_status text,
  add column if not exists capture_notes text,
  add column if not exists capture_priority smallint not null default 2,
  add column if not exists capture_added_at timestamptz,
  add column if not exists recorded_at timestamptz;

alter table public.details drop constraint if exists details_capture_status_check;
alter table public.details add constraint details_capture_status_check
  check (capture_status is null or capture_status in ('to_record', 'recorded', 'used'));

alter table public.details drop constraint if exists details_capture_priority_check;
alter table public.details add constraint details_capture_priority_check
  check (capture_priority between 1 and 3);

create index if not exists details_capture_status_idx
  on public.details (capture_status) where capture_status is not null;

comment on column public.details.capture_status is 'Recording List: null = not on the list, to_record, recorded, used';
comment on column public.details.capture_notes is 'How to record it: mission, time of day, location, save file';
comment on column public.details.capture_priority is '1 = record first, 2 = normal, 3 = later';
-- Own recordings are footage rows with label = 'own'.
