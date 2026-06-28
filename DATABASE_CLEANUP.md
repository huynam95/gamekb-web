# Database cleanup

This version removes these old idea fields from the app:

- `priority`
- `spoiler_level`
- `confidence`

To remove them from Supabase too, run this file in **Supabase → SQL Editor**:

```sql
-- database/migrations/20260628_remove_priority_spoiler_confidence.sql
alter table public.details
  drop column if exists priority,
  drop column if exists spoiler_level,
  drop column if exists confidence;
```

If Supabase says a function or view depends on one of those columns, update that function/view first. The app no longer uses these fields anywhere.
