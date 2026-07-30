# Audience Requests + Long Video Studio setup

## 1. Run the database migration

Open Supabase → SQL Editor → New query, then run:

`database/migrations/20260730_audience_requests_long_video_studio.sql`

This creates the private tables for audience requests, long video projects, chapters, and chapter ideas.

## 2. Add the server-only Supabase key

Add this to `.env.local` and to the deployment environment:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Find it in Supabase → Project Settings → API. Never prefix it with `NEXT_PUBLIC_` and never expose it in browser code.

## 3. New pages

- `/audience-requests`
- `/long-videos`
- `/long-videos/[id]`

Audience requests can be converted into a new idea, a Short Project, or a Long Video project. Long Video Studio supports a video brief, chapters, drag-and-drop idea selection, chapter scripts, word count, and runtime estimates.

## Simplified Long Video Studio update

The long video workflow is now:

1. Create a project in **Long Video Projects**.
2. Open the project and click **Pick ideas**.
3. Select ideas from **All Ideas** using search, filters, pagination, preview or Random.
4. Return to the project and use the list as a recording checklist.

Run this additional migration once in Supabase SQL Editor:

```text
database/migrations/20260730_simplify_long_video_studio.sql
```

It creates `long_video_project_ideas`, adds recording status/notes/file-location tracking, and copies ideas from the previous chapter-based workspace so existing selections are preserved.
