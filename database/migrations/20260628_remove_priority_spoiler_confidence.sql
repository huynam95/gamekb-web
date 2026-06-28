-- Remove idea scoring fields that are no longer used by the app.
-- Run this in Supabase SQL Editor after deploying the updated code.

alter table public.details
  drop column if exists priority,
  drop column if exists spoiler_level,
  drop column if exists confidence;

-- If Supabase reports that a function/view depends on one of these columns,
-- update or drop that database object first, then run the ALTER TABLE again.
-- The app code no longer reads or writes these three fields.
