/**
 * Paste a finished script back into a Short Project.
 *
 * The polished script (often rewritten with AI) replaces the project's script.
 * Each paragraph is matched to one of the project's ideas so the idea's clips
 * follow its new line, and the saved idea order follows the new script.
 */

import { buildScriptGuide } from "@/lib/scriptGuide";
import type { ProjectAsset, ProjectIdea } from "@/lib/projectIdeas";

/** Paragraphs of the pasted text. Blank lines split paragraphs; with none, each line is one. */
export function splitPastedScript(text: string): string[] {
  const clean = text.replace(/\r\n?/g, "\n").replace(/ /g, " ").trim();
  if (!clean) return [];
  const tidy = (block: string) => block.split("\n").map((line) => line.trim()).filter(Boolean).join("\n");
  const paragraphs = clean.split(/\n\s*\n/).map(tidy).filter(Boolean);
  if (paragraphs.length > 1) return paragraphs;
  return clean.split("\n").map((line) => line.trim()).filter(Boolean);
}

/** Index of the paragraph used as the opening hook, or -1. Same rule as the script guide. */
export function hookIndex(blocks: string[]): number {
  if (!blocks.length) return -1;
  return buildScriptGuide(blocks.join("\n\n"))[0]?.isHook ? 0 : -1;
}

const words = (text: string) =>
  new Set(text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 3));

function overlap(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared += 1;
  return shared / Math.min(a.size, b.size);
}

/**
 * Best guess of which idea each paragraph is about (null for the hook or no match).
 * Compares each paragraph with the idea's current line in the project, its title
 * and description, and whether it names the idea's game. Strongest pairs win first.
 */
export function guessAssignments(blocks: string[], ideas: ProjectIdea[], currentLines: Map<number, string>): (number | null)[] {
  const result: (number | null)[] = blocks.map(() => null);
  const hook = hookIndex(blocks);
  const pairs: { block: number; idea: number; score: number }[] = [];
  blocks.forEach((block, index) => {
    if (index === hook) return;
    const blockWords = words(block);
    const lower = block.toLowerCase();
    for (const idea of ideas) {
      let score = overlap(blockWords, words(currentLines.get(idea.id) ?? "")) * 100;
      score += overlap(blockWords, words(`${idea.title} ${idea.description ?? ""}`)) * 60;
      const game = idea.game_title.trim().toLowerCase();
      if (game && lower.includes(game)) score += 30;
      if (score >= 25) pairs.push({ block: index, idea: idea.id, score });
    }
  });
  pairs.sort((a, b) => b.score - a.score || a.block - b.block);
  const used = new Set<number>();
  for (const pair of pairs) {
    if (result[pair.block] != null || used.has(pair.idea)) continue;
    result[pair.block] = pair.idea;
    used.add(pair.idea);
  }
  return result;
}

/**
 * The project after the paste: the new script, clips moved to their idea's new
 * line (clips of ideas left out lose their line), and the ideas in script order.
 */
export function applyPastedScript(
  blocks: string[],
  assignments: (number | null)[],
  assets: ProjectAsset[],
  oldOrderToIdea: Map<number, number>,
) {
  const content = blocks.join("\n\n");
  const sections = buildScriptGuide(content);
  const numberByIdea = new Map<number, number>();
  const orderedIdeaIds: number[] = [];
  sections.forEach((section, index) => {
    const ideaId = assignments[index];
    if (section.isHook || ideaId == null || section.number == null || numberByIdea.has(ideaId)) return;
    numberByIdea.set(ideaId, section.number);
    orderedIdeaIds.push(ideaId);
  });
  const nextAssets = assets
    .map((asset) => {
      const ideaId = asset.idea_id ?? (asset.idea_order != null ? oldOrderToIdea.get(asset.idea_order) : undefined);
      if (ideaId == null) return asset;
      return { ...asset, idea_order: numberByIdea.get(ideaId) ?? null };
    })
    .sort((a, b) => (a.idea_order ?? Number.MAX_SAFE_INTEGER) - (b.idea_order ?? Number.MAX_SAFE_INTEGER));
  return { content, assets: nextAssets, orderedIdeaIds };
}
