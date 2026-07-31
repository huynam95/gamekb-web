# Compact Long Video Recording List

Run this migration once in Supabase SQL Editor:

`database/migrations/20260731_add_long_video_narration.sql`

It adds `narration_text` to `long_video_project_ideas`. The Long Video Project UI now uses a compact checklist with:

- drag-and-drop order
- sequence numbers
- completion checkbox
- one project-specific narration line
- remove-from-project action

The old `recording_notes` and `file_location` columns remain in the database for compatibility, but are no longer shown or edited.
