/**
 * Ideas inside a Short Project.
 *
 * The project's idea list is script_ideas (ordered by position). The script text,
 * clips (assets) and description are derived from those ideas, so adding or
 * removing an idea updates all of them together. Sections of the script are
 * matched back to ideas so each line in the editor knows which idea it is.
 */

import { buildScriptGuide, type ScriptGuideSection } from "@/lib/scriptGuide";

export type ProjectAsset = {
  url: string;
  name: string;
  channel_name?: string | null;
  idea_id?: number | null;
  idea_title?: string | null;
  game_title?: string | null;
  idea_order?: number | null;
};

export type ProjectIdea = {
  id: number;
  title: string;
  description: string | null;
  detail_type: string;
  capture_status: string | null;
  game_title: string;
  game_cover: string | null;
  position: number;
  clips: { file_path: string; title: string | null; channel_name: string | null }[];
};

/** A details row loaded with its game and footage, ready to become a ProjectIdea. */
export type IdeaRow = {
  id: number;
  title: string;
  description: string | null;
  detail_type: string;
  capture_status: string | null;
  game: { title: string; cover_url: string | null } | null;
  footage: { file_path: string | null; title: string | null; channel_name: string | null }[] | null;
};

export const IDEA_SELECT = "id,title,description,detail_type,capture_status,game:games(title,cover_url),footage(file_path,title,channel_name)";

export function toProjectIdea(row: IdeaRow, position: number): ProjectIdea {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    detail_type: row.detail_type,
    capture_status: row.capture_status ?? null,
    game_title: row.game?.title ?? "",
    game_cover: row.game?.cover_url ?? null,
    position,
    clips: (row.footage ?? []).filter((clip) => clip.file_path?.trim()).map((clip) => ({ file_path: clip.file_path!, title: clip.title, channel_name: clip.channel_name })),
  };
}

/* ---------- text helpers (same wording as when a project is created) ---------- */

const ensurePeriod = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const smoothScriptDetail = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return /^(If|When|During|After|Before|At|Right|There|You|Most|But|And)\b/.test(trimmed)
    ? trimmed.charAt(0).toLowerCase() + trimmed.slice(1)
    : trimmed;
};

/** Narration line for an idea, e.g. "In GTA V, police react to the car you stole." */
export function buildScriptLine(idea: { title: string; description: string | null }, gameName: string) {
  const rawDetail = (idea.description || idea.title || "").replace(/\s+/g, " ").replace(/^\[[^\]]+\]\s*/, "").trim();
  const safeGameName = gameName || "this game";
  if (!rawDetail) return `In ${safeGameName}, ${smoothScriptDetail(idea.title)}`;
  if (/^in\s+/i.test(rawDetail)) return ensurePeriod(rawDetail);
  return ensurePeriod(`In ${safeGameName}, ${smoothScriptDetail(rawDetail)}`);
}

export function descriptionBlock(idea: { title: string; description: string | null }, gameName: string) {
  return `• ${gameName || "Unknown Game"}: ${idea.title}${idea.description ? `\n${idea.description}` : ""}`;
}

export function gameHashtag(gameName: string) {
  return gameName ? `#${gameName.replace(/\s+/g, "").toLowerCase()}` : "";
}

/* ---------- matching script sections to ideas ---------- */

const words = (text: string) =>
  new Set(text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 3));

function overlap(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared += 1;
  return shared / Math.min(a.size, b.size);
}

/**
 * Which idea each script section belongs to. Uses the clips' idea ids, the game
 * named in the line ("In GTA V, ...") and how much the wording overlaps.
 */
export function matchSectionsToIdeas(content: string, ideas: ProjectIdea[], assets: ProjectAsset[]) {
  const sections = buildScriptGuide(content).filter((section) => !section.isHook);
  const result = new Map<string, number>();
  const taken = new Set<number>();

  for (const section of sections) {
    const text = content.slice(section.start, section.end);
    const textWords = words(text);
    const label = section.label.trim().toLowerCase();
    let best: { id: number; score: number } | null = null;
    for (const idea of ideas) {
      if (taken.has(idea.id)) continue;
      let score = 0;
      if (assets.some((asset) => asset.idea_id === idea.id && asset.idea_order === section.number)) score += 100;
      if (idea.game_title && idea.game_title.trim().toLowerCase() === label) score += 40;
      if (text.trim() === buildScriptLine(idea, idea.game_title).trim()) score += 100;
      score += overlap(textWords, words(`${idea.title} ${idea.description ?? ""}`)) * 60;
      // The game name alone is not enough: the wording or a clip must also point at the idea.
      if (score >= 50 && (!best || score > best.score)) best = { id: idea.id, score };
    }
    if (best) {
      result.set(section.id, best.id);
      taken.add(best.id);
    }
  }
  return { sections, bySection: result, placed: taken };
}

/* ---------- editing operations ---------- */

type Draft = { content: string; description: string; assets: ProjectAsset[]; tags: string[]; hashtags: string[] };

/** Remove an idea's line, its clips and its description block. */
export function removeIdeaFromDraft(draft: Draft, idea: ProjectIdea, section: ScriptGuideSection | null): Draft {
  let content = draft.content;
  let assets = draft.assets;
  if (section) {
    const blocks = buildScriptGuide(content);
    content = blocks
      .filter((block) => block.id !== section.id)
      .map((block) => content.slice(block.start, block.end).trim())
      .filter(Boolean)
      .join("\n\n");
    const removedOrder = section.number;
    assets = assets
      .filter((asset) => asset.idea_id !== idea.id && !(asset.idea_id == null && removedOrder != null && asset.idea_order === removedOrder))
      .map((asset) => ({
        ...asset,
        idea_order: removedOrder != null && asset.idea_order != null && asset.idea_order > removedOrder ? asset.idea_order - 1 : asset.idea_order,
      }));
  } else {
    assets = assets.filter((asset) => asset.idea_id !== idea.id);
  }

  const bullet = `• ${idea.game_title || "Unknown Game"}: ${idea.title}`;
  const description = draft.description
    .split(/\n{2,}/)
    .filter((block) => !block.trim().startsWith(bullet))
    .join("\n\n");

  return { ...draft, content, assets, description };
}

/** Add an idea at the end: its line, its clips, its description block and game tags. */
export function addIdeaToDraft(draft: Draft, idea: ProjectIdea): Draft {
  const line = buildScriptLine(idea, idea.game_title);
  const content = draft.content.trim() ? `${draft.content.trim()}\n\n${line}` : line;
  const order = buildScriptGuide(content).filter((section) => !section.isHook).length;
  const assets = [
    ...draft.assets,
    ...idea.clips.map((clip) => ({
      url: clip.file_path,
      name: clip.title || clip.file_path.split("/").pop() || "Video",
      channel_name: clip.channel_name,
      idea_id: idea.id,
      idea_title: idea.title,
      game_title: idea.game_title,
      idea_order: order,
    })),
  ];
  const block = descriptionBlock(idea, idea.game_title);
  const description = draft.description.trim() ? `${draft.description.trim()}\n\n${block}` : block;
  return {
    ...draft,
    content,
    assets,
    description,
    tags: Array.from(new Set([...draft.tags, idea.game_title].filter(Boolean))),
    hashtags: Array.from(new Set([...draft.hashtags, gameHashtag(idea.game_title)].filter(Boolean))),
  };
}

/** Rough spoken length: about 2.6 words per second for Shorts narration. */
export function estimateSeconds(text: string) {
  const count = text.trim() ? text.trim().split(/\s+/).length : 0;
  return { words: count, seconds: Math.round(count / 2.6) };
}
