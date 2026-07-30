import { NextResponse } from "next/server";
import { getAdminSupabase, requireAdminSession } from "@/lib/serverSupabase";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await context.params;
    const projectId = Number(id);
    const body = (await request.json()) as { detail_ids?: unknown };
    const rawDetailIds: unknown[] = Array.isArray(body.detail_ids) ? body.detail_ids : [];
    const detailIds: number[] = Array.from(
      new Set(
        rawDetailIds
          .map((value) => Number(value))
          .filter((value): value is number => Number.isFinite(value)),
      ),
    );
    if (detailIds.length === 0) return NextResponse.json({ error: "Select at least one idea" }, { status: 400 });

    const supabase = getAdminSupabase();
    const { data: existing, error: existingError } = await supabase
      .from("long_video_project_ideas")
      .select("detail_id,position")
      .eq("project_id", projectId)
      .order("position", { ascending: true });
    if (existingError) throw existingError;

    const existingIds = new Set((existing ?? []).map((item) => Number(item.detail_id)));
    const newIds = detailIds.filter((detailId) => !existingIds.has(detailId));
    const nextPosition = (existing ?? []).length;

    if (newIds.length > 0) {
      const { error: insertError } = await supabase.from("long_video_project_ideas").insert(
        newIds.map((detailId, index) => ({
          project_id: projectId,
          detail_id: detailId,
          position: nextPosition + index,
          capture_status: "to_record",
        })),
      );
      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true, added: newIds.length, skipped: detailIds.length - newIds.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not add ideas" }, { status: 500 });
  }
}
