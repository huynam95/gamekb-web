# Video Topics

Video topics are now stored in Supabase instead of only in browser localStorage.

Run this migration once in Supabase SQL Editor:

```text
database/migrations/20260629_create_video_topics.sql
```

Each topic has only:

- `title`
- `hook`
- `sort_order`

The app still keeps the active topic ID in localStorage so reopening the same browser can restore the current planning session, but topic titles/hooks/order are now loaded from the database.

If you had edited topics before this database version, the app will try to copy your existing localStorage topics into Supabase one time, but the safest approach is to run the migration first.
