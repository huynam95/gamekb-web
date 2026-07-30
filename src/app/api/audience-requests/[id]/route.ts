import { NextResponse } from "next/server";
import { getAdminSupabase, requireAdminSession } from "@/lib/serverSupabase";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await context.params;
    const body = await request.json();
    const allowed = [
      "comment_text", "commenter_name", "source_url", "game_id", "notes", "content_type", "status",
      "promised", "published_url", "linked_idea_id", "linked_short_project_id", "linked_long_project_id",
    ];
    const payload: Record<string, unknown> = {};
    for (const key of allowed) if (Object.prototype.hasOwnProperty.call(body, key)) payload[key] = body[key] === "" ? null : body[key];
    const supabase = getAdminSupabase();
    const { data, error } = await supabase.from("audience_requests").update(payload).eq("id", Number(id)).select("*").single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update request" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await context.params;
    const supabase = getAdminSupabase();
    const { error } = await supabase.from("audience_requests").delete().eq("id", Number(id));
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete request" }, { status: 500 });
  }
}
