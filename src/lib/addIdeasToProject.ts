/**
 * Add several ideas to an existing Short Project in one go.
 *
 * Each new idea gets its script line, clips, description block and game
 * tags (same as adding one idea in the project editor), and is linked in
 * script_ideas after the ideas already there. Ideas already in the project
 * are skipped.
 */

import { supabase } from "@/lib/supabaseClient";
import { invalidateUsage } from "@/lib/ideaUsage";
import { IDEA_SELECT, addIdeaToDraft, toProjectIdea, type IdeaRow, type ProjectAsset } from "@/lib/projectIdeas";
import { buildScriptGuide } from "@/lib/scriptGuide";

export type AddIdeasResult =
  | { ok: true; title: string; added: number; skipped: number; firstNumber: number; lastNumber: number }
  | { ok: false; message: string };

export async function addIdeasToProject(scriptId: number, ideaIds: number[]): Promise<AddIdeasResult> {
  const [{ data: script, error: scriptError }, { data: links, error: linksError }] = await Promise.all([
    supabase.from("scripts").select("id,title,content,description,assets,tags,hashtags").eq("id", scriptId).single(),
    supabase.from("script_ideas").select("detail_id,position").eq("script_id", scriptId),
  ]);
  if (scriptError || !script) return { ok: false, message: scriptError?.message || "Project not found." };
  if (linksError) return { ok: false, message: linksError.message };

  const existing = new Set(((links ?? []) as { detail_id: number }[]).map((link) => link.detail_id));
  const newIds = ideaIds.filter((id, index) => !existing.has(id) && ideaIds.indexOf(id) === index);
  const skipped = ideaIds.length - newIds.length;
  const title = String(script.title || "Untitled project");
  if (!newIds.length) return { ok: true, title, added: 0, skipped, firstNumber: 0, lastNumber: 0 };

  const { data: rows, error: rowsError } = await supabase.from("details").select(IDEA_SELECT).in("id", newIds);
  if (rowsError) return { ok: false, message: rowsError.message };
  const byId = new Map(((rows ?? []) as unknown as IdeaRow[]).map((row) => [row.id, row]));

  let draft = {
    content: String(script.content || ""),
    description: String(script.description || ""),
    assets: (script.assets || []) as ProjectAsset[],
    tags: (script.tags || []) as string[],
    hashtags: (script.hashtags || []) as string[],
  };
  const lineCount = () => buildScriptGuide(draft.content).filter((section) => !section.isHook).length;
  const firstNumber = lineCount() + 1;
  const positions = ((links ?? []) as { position: number }[]).map((link) => link.position).filter((value) => Number.isFinite(value));
  let position = positions.length ? Math.max(...positions) : 0;
  const newLinks: { script_id: number; detail_id: number; position: number }[] = [];

  // Keep the order the ideas were picked in.
  for (const id of newIds) {
    const row = byId.get(id);
    if (!row) continue;
    position += 1;
    draft = addIdeaToDraft(draft, toProjectIdea(row, position));
    newLinks.push({ script_id: scriptId, detail_id: id, position });
  }
  if (!newLinks.length) return { ok: false, message: "The selected ideas could not be loaded." };

  const { error: updateError } = await supabase.from("scripts").update(draft).eq("id", scriptId);
  if (updateError) return { ok: false, message: updateError.message };
  const { error: linkError } = await supabase.from("script_ideas").upsert(newLinks, { onConflict: "script_id,detail_id" });
  if (linkError) return { ok: false, message: linkError.message };
  invalidateUsage();

  return { ok: true, title, added: newLinks.length, skipped, firstNumber, lastNumber: lineCount() };
}
