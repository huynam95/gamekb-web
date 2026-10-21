import { NextResponse } from "next/server";
import { getAdminSupabase, requireAdminSession } from "@/lib/serverSupabase";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await context.params;
    const scriptId = Number(id);
    const body: unknown = await request.json();
    if (!Number.isSafeInteger(scriptId) || scriptId <= 0 || !body || typeof body !== "object" || !("topic" in body) || typeof body.topic !== "string" || body.topic.trim().length > 500) {
      return NextResponse.json({ error: "Invalid project or topic" }, { status: 400 });
    }
    const { data, error } = await getAdminSupabase().from("scripts")
      .update({ topic: body.topic.trim() }).eq("id", scriptId).select("id,topic").maybeSingle();
    if (error) return NextResponse.json({ error: "Could not save topic" }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof SyntaxError ? "Invalid request" : "Could not save topic" }, { status: error instanceof SyntaxError ? 400 : 500 });
  }
}
