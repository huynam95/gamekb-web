# Long Video Thumbnail Setup

Run this migration once in **Supabase → SQL Editor**:

```text
database/migrations/20260730_add_long_video_thumbnail.sql
```

It adds `thumbnail_url` to `long_video_projects` and creates the public Storage bucket `long-video-thumbnails`.

Uploads are accepted as JPG, PNG, or WebP up to 5 MB. The browser sends the file to a protected Next.js API route, and the server uploads it with `SUPABASE_SERVICE_ROLE_KEY`.
