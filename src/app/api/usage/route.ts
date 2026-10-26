import { NextResponse } from "next/server";
import { getAdminSupabase, requireAdminSession } from "@/lib/serverSupabase";
import type { UsageLink, UsagePayload, UsageVideo } from "@/lib/ideaUsage";

type Row = Record<string, unknown>;
type ShortRow = Row & { id: number; title: string | null; status: string | null; topic?: string | null; created_at: string | null; publish_date?: string | null; assets?: { idea_id?: number | null }[] | null; description?: string | null };

const str = (value: unknown) => (typeof value === "string" && value ? value : null);

/**
 * Every Short Project with the ideas in it (read with the service key on the server).
 */
export async function GET() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const supabase = getAdminSupabase();
    const [shortsResult, shortLinksResult] = await Promise.all([
      supabase.from("scripts").select("*"),
      supabase.from("script_ideas").select("script_id,detail_id"),
    ]);
    if (shortsResult.error) throw shortsResult.error;

    const shorts = (shortsResult.data ?? []) as ShortRow[];

    const videos: UsageVideo[] = [
      ...shorts.map((row) => ({
        kind: "short" as const,
        id: row.id,
        title: row.title || "Untitled project",
        status: row.status || "Draft",
        published: row.status === "Published",
        topic: str(row.topic),
        created_at: row.created_at,
        published_at: str(row.publish_date),
      })),
    ];

    const links: UsageLink[] = [];

    // Short ↔ idea links. Before the script_ideas table exists, fall back to the
    // clips' idea ids and the "• Game: Idea title" lines in each description.
    const linksReady = !shortLinksResult.error;
    if (linksReady) {
      for (const link of (shortLinksResult.data ?? []) as { script_id: number; detail_id: number }[]) {
        links.push({ kind: "short", video_id: link.script_id, detail_id: link.detail_id });
      }
    } else {
      const { data: ideas } = await supabase.from("details").select("id,title,game:games(title)");
      const lines = ((ideas ?? []) as unknown as { id: number; title: string; game: { title: string } | null }[])
        .map((idea) => ({ id: idea.id, line: `• ${idea.game?.title || "Unknown Game"}: ${idea.title}` }));
      for (const short of shorts) {
        const found = new Set<number>();
        for (const asset of short.assets || []) if (asset?.idea_id) found.add(Number(asset.idea_id));
        const description = short.description || "";
        if (description.includes("•")) for (const idea of lines) if (description.includes(idea.line)) found.add(idea.id);
        for (const detailId of found) links.push({ kind: "short", video_id: short.id, detail_id: detailId });
      }
    }

    const payload: UsagePayload = { videos, links, linksReady };
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load usage" }, { status: 500 });
  }
}
