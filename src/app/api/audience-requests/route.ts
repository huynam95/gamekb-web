import { NextResponse } from "next/server";
import { getAdminSupabase, requireAdminSession } from "@/lib/serverSupabase";

export async function GET() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("audience_requests")
      .select("*, game:games(id,title,cover_url)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load requests" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const commentText = String(body.comment_text ?? "").trim();
    if (!commentText) return NextResponse.json({ error: "Comment is required" }, { status: 400 });
    const supabase = getAdminSupabase();
    const sourceUrl = String(body.source_url ?? "").trim() || null;
    if (sourceUrl) {
      const { data: duplicate } = await supabase.from("audience_requests").select("id").eq("source_url", sourceUrl).maybeSingle();
      if (duplicate) return NextResponse.json({ error: "This comment or video link is already saved." }, { status: 409 });
    }
    const payload = {
      comment_text: commentText,
      commenter_name: String(body.commenter_name ?? "").trim() || null,
      source_url: sourceUrl,
      game_id: body.game_id ? Number(body.game_id) : null,
      notes: String(body.notes ?? "").trim() || null,
      content_type: ["short", "long", "undecided"].includes(body.content_type) ? body.content_type : "undecided",
      status: ["inbox", "planned", "in_progress", "published", "replied"].includes(body.status) ? body.status : "inbox",
      promised: Boolean(body.promised),
      published_url: String(body.published_url ?? "").trim() || null,
    };
    const { data, error } = await supabase.from("audience_requests").insert(payload).select("*").single();
    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save request" }, { status: 500 });
  }
}
