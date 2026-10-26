import { NextResponse } from "next/server";
import { getAdminSupabase, requireAdminSession } from "@/lib/serverSupabase";
import { fetchYoutubeStats, youtubeIdFromUrl } from "@/lib/youtubeStats";

const TABLE = { short: "scripts", long: "long_video_projects" } as const;
type Kind = keyof typeof TABLE;

const isMissingColumn = (message: string) => /youtube_|column .* does not exist|schema cache/i.test(message);
const SETUP_ERROR = "YouTube stats need the database update database/migrations/20261026_add_idea_usage_and_youtube_stats.sql.";

/** Save a project's YouTube link and, when a YOUTUBE_API_KEY is set, fetch its stats right away. */
export async function PATCH(request: Request) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await request.json()) as { kind?: string; id?: number; youtube_url?: string };
    const kind = body.kind as Kind;
    const id = Number(body.id);
    const url = String(body.youtube_url ?? "").trim();
    if (!(kind in TABLE) || !Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid project" }, { status: 400 });
    if (url && !youtubeIdFromUrl(url)) return NextResponse.json({ error: "That doesn't look like a YouTube video link." }, { status: 400 });

    const patch: Record<string, unknown> = { youtube_url: url || null };
    if (!url) Object.assign(patch, { youtube_views: null, youtube_likes: null, youtube_comments: null, youtube_stats_at: null });
    const apiKey = process.env.YOUTUBE_API_KEY;
    let statsError: string | null = null;
    if (url && apiKey) {
      try {
        const stats = (await fetchYoutubeStats([youtubeIdFromUrl(url)!], apiKey)).get(youtubeIdFromUrl(url)!);
        if (stats) Object.assign(patch, { youtube_views: stats.views, youtube_likes: stats.likes, youtube_comments: stats.comments, youtube_stats_at: new Date().toISOString() });
        else statsError = "Video not found or private.";
      } catch (error) {
        statsError = error instanceof Error ? error.message : "Could not reach YouTube";
      }
    }

    const { data, error } = await getAdminSupabase().from(TABLE[kind]).update(patch).eq("id", id)
      .select("id,youtube_url,youtube_views,youtube_likes,youtube_comments,youtube_stats_at").maybeSingle();
    if (error) return NextResponse.json({ error: isMissingColumn(error.message) ? SETUP_ERROR : error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json({ data, statsError, youtubeReady: Boolean(apiKey) });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/** Refresh stats for every Short and Long video that has a YouTube link. */
export async function POST() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Add a YOUTUBE_API_KEY environment variable in Vercel to fetch views." }, { status: 400 });
  try {
    const supabase = getAdminSupabase();
    const rows: { kind: Kind; id: number; videoId: string }[] = [];
    for (const kind of Object.keys(TABLE) as Kind[]) {
      const { data, error } = await supabase.from(TABLE[kind]).select("id,youtube_url").not("youtube_url", "is", null);
      if (error) return NextResponse.json({ error: isMissingColumn(error.message) ? SETUP_ERROR : error.message }, { status: 500 });
      for (const row of (data ?? []) as { id: number; youtube_url: string }[]) {
        const videoId = youtubeIdFromUrl(row.youtube_url);
        if (videoId) rows.push({ kind, id: row.id, videoId });
      }
    }
    const stats = await fetchYoutubeStats(rows.map((row) => row.videoId), apiKey);
    const now = new Date().toISOString();
    let updated = 0;
    for (const row of rows) {
      const s = stats.get(row.videoId);
      if (!s) continue;
      const { error } = await supabase.from(TABLE[row.kind]).update({ youtube_views: s.views, youtube_likes: s.likes, youtube_comments: s.comments, youtube_stats_at: now }).eq("id", row.id);
      if (!error) updated += 1;
    }
    return NextResponse.json({ updated, total: rows.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not refresh YouTube stats" }, { status: 500 });
  }
}
