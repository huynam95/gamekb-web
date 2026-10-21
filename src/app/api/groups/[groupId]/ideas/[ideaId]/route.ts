import { NextResponse } from "next/server";
import { getAdminSupabase, requireAdminSession } from "@/lib/serverSupabase";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ groupId: string; ideaId: string }> },
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const params = await context.params;
    const groupId = Number(params.groupId);
    const ideaId = Number(params.ideaId);
    if (!Number.isSafeInteger(groupId) || groupId <= 0 || !Number.isSafeInteger(ideaId) || ideaId <= 0) {
      return NextResponse.json({ error: "Invalid collection or idea ID" }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    // Delete only this membership. The idea and its other collections stay intact.
    const { data, error } = await supabase
      .from("idea_group_items")
      .delete()
      .eq("group_id", groupId)
      .eq("detail_id", ideaId)
      .select("detail_id");

    if (error) {
      return NextResponse.json({ error: "Could not remove idea from collection" }, { status: 500 });
    }
    if (!data?.length) {
      return NextResponse.json({ error: "This idea is no longer in the collection. Refresh and try again." }, { status: 404 });
    }

    return NextResponse.json({ success: true, groupId, ideaId });
  } catch {
    return NextResponse.json({ error: "Could not remove idea from collection" }, { status: 500 });
  }
}
