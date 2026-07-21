# Footage channel names

This version can show the YouTube channel name on idea cards.

Before deploying, run this file once in Supabase SQL Editor:

`database/migrations/20260721_add_footage_channel_name.sql`

New footage links save the channel name automatically. Existing YouTube footage is enriched gradually when its idea card is loaded. You can also open `/migrate` and run the metadata migration tool to backfill the library faster.
