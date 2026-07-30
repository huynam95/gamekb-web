-- Long Video Project thumbnails
-- Run once in Supabase SQL Editor.

alter table public.long_video_projects
  add column if not exists thumbnail_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'long-video-thumbnails',
  'long-video-thumbnails',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Uploads and deletes are performed only by server routes using the service-role key.
