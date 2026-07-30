import { NextResponse } from "next/server";
import { getAdminSupabase, requireAdminSession } from "@/lib/serverSupabase";

export async function GET() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("long_video_projects")
      .select("*, project_ideas:long_video_project_ideas(id,capture_status,detail:details(id,game:games(id,title,cover_url)))")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load long videos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const supabase = getAdminSupabase();
    const { data: project, error } = await supabase.from("long_video_projects").insert({
      title,
      core_idea: String(body.core_idea ?? "").trim() || null,
      viewer_promise: null,
      target_duration_minutes: Math.max(1, Number(body.target_duration_minutes) || 10),
      target_audience: null,
      thumbnail_notes: String(body.thumbnail_notes ?? "").trim() || null,
      status: ["planning", "writing", "recording", "editing", "ready", "published"].includes(body.status) ? body.status : "planning",
    }).select("*").single();
    if (error || !project) throw error ?? new Error("Could not create project");

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create long video" }, { status: 500 });
  }
}
