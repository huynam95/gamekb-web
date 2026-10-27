-- Related ideas: pairs of ideas Nam links because they go together.
-- Additive only: one new table, no changes to existing data.
-- Each pair is stored once with the smaller id first.
create table if not exists public.idea_links (
  idea_a bigint not null references public.details(id) on delete cascade,
  idea_b bigint not null references public.details(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  primary key (idea_a, idea_b),
  constraint idea_links_order check (idea_a < idea_b)
);

create index if not exists idea_links_idea_b_idx on public.idea_links (idea_b);

comment on table public.idea_links is 'Related ideas. A pair (idea_a < idea_b) means the two ideas go together.';
