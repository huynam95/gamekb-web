import { NextResponse } from "next/server";
import { getAdminSupabase, requireAdminSession } from "@/lib/serverSupabase";

const PROJECT_STATUSES = new Set(["planning", "writing", "recording", "editing", "ready", "published"]);
const CAPTURE_STATUSES = new Set(["to_record", "recorded", "retake", "approved"]);

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await context.params;
    const projectId = Number(id);
    const supabase = getAdminSupabase();

    const { data: project, error } = await supabase.from("long_video_projects").select("*").eq("id", projectId).single();
    if (error) throw error;

    const { data: projectIdeas, error: ideasError } = await supabase
      .from("long_video_project_ideas")
      .select("id,project_id,detail_id,position,capture_status,narration_text,detail:details(id,title,description,detail_type,game:games(id,title,cover_url),footage(id,file_path,title,channel_name))")
      .eq("project_id", projectId)
      .order("position", { ascending: true });
    if (ideasError) throw ideasError;

    return NextResponse.json({ data: { project, ideas: projectIdeas ?? [] } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load long video project" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await context.params;
    const projectId = Number(id);
    const body = await request.json();
    const project = body.project ?? {};
    const ideas = Array.isArray(body.ideas) ? body.ideas : [];
    const supabase = getAdminSupabase();

    const title = String(project.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const { error: projectError } = await supabase
      .from("long_video_projects")
      .update({
        title,
        core_idea: String(project.core_idea ?? "").trim() || null,
        target_duration_minutes: Math.max(1, Number(project.target_duration_minutes) || 10),
        thumbnail_notes: String(project.thumbnail_notes ?? "").trim() || null,
        status: PROJECT_STATUSES.has(project.status) ? project.status : "planning",
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);
    if (projectError) throw projectError;

    const normalized = ideas
      .map((item: Record<string, unknown>, position: number) => ({
        project_id: projectId,
        detail_id: Number(item.detail_id),
        position,
        capture_status: CAPTURE_STATUSES.has(String(item.capture_status)) ? String(item.capture_status) : "to_record",
        narration_text: String(item.narration_text ?? "").trim() || null,
      }))
      .filter((item: { detail_id: number }) => Number.isFinite(item.detail_id));

    const detailIds = normalized.map((item: { detail_id: number }) => item.detail_id);
    let deleteQuery = supabase.from("long_video_project_ideas").delete().eq("project_id", projectId);
    if (detailIds.length > 0) deleteQuery = deleteQuery.not("detail_id", "in", `(${detailIds.join(",")})`);
    const { error: deleteError } = await deleteQuery;
    if (deleteError) throw deleteError;

    if (normalized.length > 0) {
      const { error: upsertError } = await supabase
        .from("long_video_project_ideas")
        .upsert(normalized, { onConflict: "project_id,detail_id" });
      if (upsertError) throw upsertError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save long video project" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await context.params;
    const supabase = getAdminSupabase();
    const { error } = await supabase.from("long_video_projects").delete().eq("id", Number(id));
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete project" }, { status: 500 });
  }
}
