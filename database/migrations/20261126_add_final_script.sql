-- Final script per Short Project: the polished, plain-text version (e.g. after rewriting with AI).
-- Additive: one nullable column. The idea-by-idea script in `content` is left as it is.
alter table public.scripts add column if not exists final_script text;
comment on column public.scripts.final_script is 'Polished plain-text script pasted by the user; independent of ideas and clips';
