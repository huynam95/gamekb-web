import { NextResponse } from "next/server";
import { getAdminSupabase, requireAdminSession } from "@/lib/serverSupabase";

export async function POST() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { data, error } = await getAdminSupabase().from("scripts").insert({
      title: "Untitled project",
      content: "",
      description: "",
      topic: "",
      assets: [],
      tags: [],
      hashtags: [],
      status: "Draft",
    }).select("*").single();
    if (error || !data) return NextResponse.json({ error: "Could not create project" }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create project" }, { status: 500 });
  }
}
