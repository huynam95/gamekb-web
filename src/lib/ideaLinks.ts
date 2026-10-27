/**
 * Related ideas.
 *
 * Linked ideas are pairs in idea_links (stored once, smaller id first).
 * "Often used together" comes from script_ideas: ideas that share Short
 * Projects with this one, most shared first.
 */

import { supabase } from "@/lib/supabaseClient";

export const LINKS_SETUP_MESSAGE = "Related ideas need a small database update (idea_links). Ask to run the migration, then reload.";

export function isMissingLinksTable(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /idea_links/.test(error.message ?? "");
}

export function pairOf(a: number, b: number) {
  return a < b ? { idea_a: a, idea_b: b } : { idea_a: b, idea_b: a };
}

/** Ids linked to each of the given ideas. */
export async function loadLinks(ids: number[]) {
  const result = new Map<number, Set<number>>();
  if (!ids.length) return { links: result, error: null as { code?: string; message?: string } | null };
  const list = ids.join(",");
  const { data, error } = await supabase
    .from("idea_links")
    .select("idea_a,idea_b")
    .or(`idea_a.in.(${list}),idea_b.in.(${list})`);
  if (error) return { links: result, error };
  for (const row of (data ?? []) as { idea_a: number; idea_b: number }[]) {
    if (!result.has(row.idea_a)) result.set(row.idea_a, new Set());
    if (!result.has(row.idea_b)) result.set(row.idea_b, new Set());
    result.get(row.idea_a)!.add(row.idea_b);
    result.get(row.idea_b)!.add(row.idea_a);
  }
  return { links: result, error: null };
}

export async function linkIdeas(a: number, b: number) {
  if (a === b) return { error: null };
  const { error } = await supabase.from("idea_links").upsert(pairOf(a, b), { onConflict: "idea_a,idea_b" });
  return { error };
}

export async function unlinkIdeas(a: number, b: number) {
  const pair = pairOf(a, b);
  const { error } = await supabase.from("idea_links").delete().eq("idea_a", pair.idea_a).eq("idea_b", pair.idea_b);
  return { error };
}

/** Ideas that share Short Projects with this one: id → number of shared projects. */
export async function loadUsedTogether(id: number) {
  const counts = new Map<number, number>();
  const { data: mine } = await supabase.from("script_ideas").select("script_id").eq("detail_id", id);
  const scriptIds = Array.from(new Set(((mine ?? []) as { script_id: number }[]).map((row) => row.script_id)));
  if (!scriptIds.length) return counts;
  const { data } = await supabase.from("script_ideas").select("script_id,detail_id").in("script_id", scriptIds);
  for (const row of (data ?? []) as { script_id: number; detail_id: number }[]) {
    if (row.detail_id === id) continue;
    counts.set(row.detail_id, (counts.get(row.detail_id) ?? 0) + 1);
  }
  return counts;
}
