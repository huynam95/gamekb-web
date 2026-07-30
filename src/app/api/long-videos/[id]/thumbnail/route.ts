import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminSupabase, requireAdminSession } from "@/lib/serverSupabase";

export const runtime = "nodejs";

const BUCKET = "long-video-thumbnails";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionFor(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function storagePathFromPublicUrl(url?: string | null) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  if (index < 0) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await context.params;
    const projectId = Number(id);
    if (!Number.isFinite(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload" }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Use a JPG, PNG, or WebP image" }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Thumbnail must be 5 MB or smaller" }, { status: 400 });

    const supabase = getAdminSupabase();
    const { data: project, error: projectError } = await supabase
      .from("long_video_projects")
      .select("id,thumbnail_url")
      .eq("id", projectId)
      .single();
    if (projectError || !project) throw projectError ?? new Error("Project not found");

    const objectPath = `${projectId}/${Date.now()}-${randomUUID()}.${extensionFor(file)}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, bytes, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
    const thumbnailUrl = publicData.publicUrl;
    const { error: updateError } = await supabase
      .from("long_video_projects")
      .update({ thumbnail_url: thumbnailUrl, updated_at: new Date().toISOString() })
      .eq("id", projectId);

    if (updateError) {
      await supabase.storage.from(BUCKET).remove([objectPath]);
      throw updateError;
    }

    const previousPath = storagePathFromPublicUrl(project.thumbnail_url);
    if (previousPath && previousPath !== objectPath) {
      await supabase.storage.from(BUCKET).remove([previousPath]);
    }

    return NextResponse.json({ data: { thumbnail_url: thumbnailUrl } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not upload thumbnail" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await context.params;
    const projectId = Number(id);
    if (!Number.isFinite(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

    const supabase = getAdminSupabase();
    const { data: project, error: projectError } = await supabase
      .from("long_video_projects")
      .select("thumbnail_url")
      .eq("id", projectId)
      .single();
    if (projectError) throw projectError;

    const { error: updateError } = await supabase
      .from("long_video_projects")
      .update({ thumbnail_url: null, updated_at: new Date().toISOString() })
      .eq("id", projectId);
    if (updateError) throw updateError;

    const previousPath = storagePathFromPublicUrl(project?.thumbnail_url);
    if (previousPath) await supabase.storage.from(BUCKET).remove([previousPath]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not remove thumbnail" },
      { status: 500 },
    );
  }
}
