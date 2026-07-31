-- Add a project-specific narration line to each idea in a long video project.
-- Recording notes and file location columns are intentionally left in place for
-- backward compatibility, but the simplified UI no longer uses them.

alter table public.long_video_project_ideas
  add column if not exists narration_text text;
