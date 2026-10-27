"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  Bars3Icon,
  CheckIcon,
  ChevronLeftIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  EllipsisHorizontalIcon,
  ExclamationTriangleIcon,
  FilmIcon,
  InformationCircleIcon,
  LightBulbIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PuzzlePieceIcon,
  TrashIcon,
  VideoCameraIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabaseClient";
import { useNotifications } from "@/components/NotificationCenter";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CoverImage } from "@/components/CoverImage";
import { ProjectTopicSelect } from "@/components/ProjectTopicSelect";
import { useDismiss } from "@/components/ui/useDismiss";
import { buildScriptGuide } from "@/lib/scriptGuide";
import { getScriptTopicValue } from "@/lib/scriptTopics";
import { analyzeAssetLinks, countClips, getClipIdentity } from "@/lib/assetLinks";
import { invalidateUsage } from "@/lib/ideaUsage";
import { CAPTURE_META } from "@/lib/recording";
import type { VideoTheme } from "@/lib/videoThemes";
import {
  addIdeaToDraft,
  buildScriptLine,
  estimateSeconds,
  matchSectionsToIdeas,
  removeIdeaFromDraft,
  type ProjectAsset,
  type ProjectIdea,
} from "@/lib/projectIdeas";

/* ================= TYPES ================= */

export type EditorScript = {
  id: number;
  title: string;
  content: string;
  description: string;
  assets: ProjectAsset[];
  tags: string[];
  hashtags: string[];
  status: string;
  topic?: string | null;
  created_at?: string;
};

const STATUSES = ["Draft", "Filming", "Edited", "Published"] as const;
const STATUS_DOT: Record<string, string> = { Draft: "bg-slate-400", Filming: "bg-amber-500", Edited: "bg-indigo-500", Published: "bg-emerald-500" };

/**
 * One colour per idea number, shared by the Ideas list and the Clips tab so
 * "idea 2" reads the same everywhere.
 */
const IDEA_COLORS = [
  { badge: "bg-blue-600 text-white", bar: "border-l-blue-500", soft: "bg-blue-50 dark:bg-blue-500/10", title: "text-blue-900 dark:text-blue-100", link: "text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-500/15" },
  { badge: "bg-orange-500 text-white", bar: "border-l-orange-500", soft: "bg-orange-50 dark:bg-orange-500/10", title: "text-orange-900 dark:text-orange-100", link: "text-orange-700 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-500/15" },
  { badge: "bg-emerald-600 text-white", bar: "border-l-emerald-500", soft: "bg-emerald-50 dark:bg-emerald-500/10", title: "text-emerald-900 dark:text-emerald-100", link: "text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-500/15" },
  { badge: "bg-pink-600 text-white", bar: "border-l-pink-500", soft: "bg-pink-50 dark:bg-pink-500/10", title: "text-pink-900 dark:text-pink-100", link: "text-pink-700 hover:bg-pink-100 dark:text-pink-300 dark:hover:bg-pink-500/15" },
  { badge: "bg-sky-500 text-white", bar: "border-l-sky-500", soft: "bg-sky-50 dark:bg-sky-500/10", title: "text-sky-900 dark:text-sky-100", link: "text-sky-700 hover:bg-sky-100 dark:text-sky-300 dark:hover:bg-sky-500/15" },
  { badge: "bg-lime-500 text-lime-950", bar: "border-l-lime-500", soft: "bg-lime-50 dark:bg-lime-500/10", title: "text-lime-900 dark:text-lime-100", link: "text-lime-800 hover:bg-lime-100 dark:text-lime-300 dark:hover:bg-lime-500/15" },
] as const;
const NEUTRAL_COLOR = { badge: "bg-surface-sunken text-fg-2", bar: "border-l-line-strong", soft: "bg-surface-sunken", title: "text-fg", link: "text-fg-3 hover:bg-surface-sunken" };
const ideaColor = (number: number | null | undefined) => (number != null && number > 0 && number < Number.MAX_SAFE_INTEGER ? IDEA_COLORS[(number - 1) % IDEA_COLORS.length] : NEUTRAL_COLOR);

/** Short readable label for a clip link: channel, then the video name. */
function clipLabel(asset: ProjectAsset) {
  return asset.name || asset.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40);
}

type IdeaRow = {
  id: number;
  title: string;
  description: string | null;
  detail_type: string;
  capture_status: string | null;
  game: { title: string; cover_url: string | null } | null;
  footage: { file_path: string | null; title: string | null; channel_name: string | null }[] | null;
};

const IDEA_SELECT = "id,title,description,detail_type,capture_status,game:games(title,cover_url),footage(file_path,title,channel_name)";

function toProjectIdea(row: IdeaRow, position: number): ProjectIdea {
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

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

/* ================= SMALL PIECES ================= */

function GameThumb({ src, className = "h-9 w-7" }: { src: string | null; className?: string }) {
  return (
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-sunken text-fg-4 ${className}`}>
      {src ? <CoverImage src={src} sizes="36px" /> : <PuzzlePieceIcon className="h-4 w-4" />}
    </span>
  );
}

function ChipEditor({ label, values, onChange, prefix = "", placeholder }: { label: string; values: string[]; onChange: (values: string[]) => void; prefix?: string; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft.split(/[,\n]/).map((part) => part.trim()).filter(Boolean).map((part) => (prefix && !part.startsWith(prefix) ? `${prefix}${part}` : part));
    if (parts.length) onChange(Array.from(new Set([...values, ...parts])));
    setDraft("");
  };
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-fg-3">{label}</p>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface p-1.5 focus-within:border-blue-500">
        {values.map((value) => (
          <span key={value} className="inline-flex h-8 items-center gap-1 rounded-lg bg-surface-sunken pl-2.5 pr-1 text-xs font-semibold text-fg-2">
            {value}
            <button type="button" onClick={() => onChange(values.filter((v) => v !== value))} className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-fg-4 hover:bg-surface hover:text-rose-500" aria-label={`Remove ${value}`}>
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } else if (e.key === "Backspace" && !draft && values.length) onChange(values.slice(0, -1)); }}
          onBlur={add}
          placeholder={values.length ? "" : placeholder}
          className="h-8 min-w-[8rem] flex-1 bg-transparent px-1.5 text-sm text-fg outline-none placeholder:text-fg-4"
          aria-label={`Add ${label.toLowerCase()}`}
        />
      </div>
    </div>
  );
}

/** Search the library and add an idea to the project. */
function IdeaPicker({ excludeIds, onPick, onClose }: { excludeIds: Set<number>; onPick: (row: IdeaRow) => Promise<void>; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<IdeaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  useDismiss(boxRef, true, onClose);

  useEffect(() => {
    let active = true;
    const q = query.trim();
    const timer = setTimeout(async () => {
      setLoading(true);
      let request = supabase.from("details").select(IDEA_SELECT).eq("status", "idea").order("created_at", { ascending: false }).limit(15);
      if (q) request = request.ilike("title", `%${q.replace(/[%_]/g, "")}%`);
      const { data } = await request;
      if (!active) return;
      setRows(((data ?? []) as unknown as IdeaRow[]).filter((row) => !excludeIds.has(row.id)));
      setLoading(false);
    }, q ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [query, excludeIds]);

  return (
    <div ref={boxRef} className="absolute inset-x-0 bottom-full z-30 mb-2 rounded-2xl border border-line bg-surface p-2 shadow-2xl animate-in fade-in slide-in-from-bottom-1 duration-150">
      <label className="relative block">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-4" />
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search idea title..." aria-label="Search ideas" className="h-10 w-full rounded-xl border border-line bg-surface-muted pl-9 pr-3 text-sm text-fg outline-none focus:border-blue-500" />
      </label>
      <ul className="mt-1.5 max-h-72 overflow-y-auto">
        {loading && rows.length === 0 && <li className="px-3 py-4 text-center text-xs text-fg-4">Searching…</li>}
        {!loading && rows.length === 0 && <li className="px-3 py-4 text-center text-xs text-fg-4">No ideas found.</li>}
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              disabled={adding !== null}
              onClick={async () => { setAdding(row.id); await onPick(row); setAdding(null); }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-surface-sunken disabled:opacity-60"
            >
              <GameThumb src={row.game?.cover_url ?? null} className="h-9 w-7" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-fg">{row.title}</span>
                <span className="block truncate text-[11px] text-fg-4">{row.game?.title}{row.footage?.length ? ` · ${row.footage.length} clip${row.footage.length === 1 ? "" : "s"}` : ""}</span>
              </span>
              {adding === row.id ? <ArrowPathIcon className="h-4 w-4 animate-spin text-fg-4" /> : <PlusIcon className="h-4 w-4 shrink-0 text-accent" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ================= EDITOR ================= */

export function ProjectEditor({
  isOpen,
  script,
  onClose,
  onSave,
  onRefresh,
  topics,
  topicsLoading,
  topicsError,
  onRetryTopics,
}: {
  isOpen: boolean;
  script: EditorScript | null;
  onClose: () => void;
  onSave: (data: Partial<EditorScript>) => Promise<boolean>;
  onRefresh: (id: number) => Promise<EditorScript | null>;
  topics: VideoTheme[];
  topicsLoading: boolean;
  topicsError: string;
  onRetryTopics: () => void;
}) {
  const { success, error: notifyError, confirm } = useNotifications();
  const [formData, setFormData] = useState<Partial<EditorScript>>({});
  const [tab, setTab] = useState<"script" | "ideas" | "clips" | "details">("script");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [ideas, setIdeas] = useState<ProjectIdea[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useDismiss(menuRef, menuOpen, closeMenu);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const latestRef = useRef<Partial<EditorScript>>({});
  const lastSavedRef = useRef("");
  const lastSyncedContentRef = useRef("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveVersionRef = useRef(0);
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  const scriptId = script?.id ?? null;

  /* ---------- load ---------- */

  const loadIdeas = useCallback(async (id: number) => {
    const { data: links, error } = await supabase.from("script_ideas").select("detail_id,position").eq("script_id", id).order("position");
    if (error) { setIdeas([]); return; }
    const ids = (links ?? []).map((link: { detail_id: number }) => link.detail_id);
    if (!ids.length) { setIdeas([]); return; }
    const { data } = await supabase.from("details").select(IDEA_SELECT).in("id", ids);
    const byId = new Map(((data ?? []) as unknown as IdeaRow[]).map((row) => [row.id, row]));
    setIdeas((links ?? []).map((link: { detail_id: number; position: number }) => byId.get(link.detail_id) && toProjectIdea(byId.get(link.detail_id)!, Number.isFinite(link.position) ? link.position : 0)).filter(Boolean) as ProjectIdea[]);
  }, []);

  useEffect(() => {
    if (!isOpen || !script) return;
    setFormData(script);
    latestRef.current = script;
    lastSavedRef.current = JSON.stringify(script);
    lastSyncedContentRef.current = String(script.content || "");
    setSaveState("saved");
    setTab("script");
    setPicking(false);
    setIdeas(null);
    void loadIdeas(script.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, scriptId]);

  /* ---------- save ---------- */

  const saveNow = useCallback(async (data: Partial<EditorScript>) => {
    const snapshot = JSON.stringify(data);
    if (snapshot === lastSavedRef.current) { setSaveState("saved"); return true; }
    const version = ++saveVersionRef.current;
    setSaveState("saving");
    const ok = await onSaveRef.current(data);
    if (!ok) { if (version === saveVersionRef.current) setSaveState("error"); return false; }
    lastSavedRef.current = snapshot;
    if (version === saveVersionRef.current) setSaveState(JSON.stringify(latestRef.current) === snapshot ? "saved" : "saving");
    return true;
  }, []);

  const update = useCallback((patch: Partial<EditorScript>) => {
    const next = { ...latestRef.current, ...patch };
    latestRef.current = next;
    setFormData(next);
    setSaveState("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { saveTimerRef.current = null; void saveNow(latestRef.current); }, 400);
  }, [saveNow]);

  /** When lines are deleted by hand, drop the clips that belonged to them (same rule as before). */
  const reconcileAssets = (previousContent: string, nextContent: string, assets: ProjectAsset[]) => {
    const prev = buildScriptGuide(previousContent).filter((s) => !s.isHook);
    const next = buildScriptGuide(nextContent).filter((s) => !s.isHook);
    if (next.length >= prev.length) return assets;
    const norm = (content: string, s: (typeof prev)[number]) => content.slice(s.start, s.end).replace(/\s+/g, " ").trim().toLowerCase();
    const used = new Set<string>();
    const map = new Map<number, number>();
    for (const n of next) {
      let p = prev.find((c) => !used.has(c.id) && norm(previousContent, c) === norm(nextContent, n));
      if (!p) {
        const same = prev.filter((c) => !used.has(c.id) && c.label.trim().toLowerCase() === n.label.trim().toLowerCase());
        if (same.length === 1) p = same[0];
      }
      if (p?.number != null && n.number != null) { used.add(p.id); map.set(p.number, n.number); }
    }
    const prevOrders = new Set(prev.map((s) => s.number).filter((v): v is number => v != null));
    return assets
      .filter((a) => a.idea_order == null || !prevOrders.has(a.idea_order) || map.has(a.idea_order))
      .map((a) => ({ ...a, idea_order: a.idea_order != null ? map.get(a.idea_order) ?? a.idea_order : a.idea_order }));
  };

  const onContentChange = (content: string) => {
    update({ content });
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      syncTimerRef.current = null;
      const latest = latestRef.current;
      const nextAssets = reconcileAssets(lastSyncedContentRef.current, String(latest.content || ""), latest.assets || []);
      lastSyncedContentRef.current = String(latest.content || "");
      if (JSON.stringify(nextAssets) !== JSON.stringify(latest.assets || [])) update({ assets: nextAssets });
    }, 650);
  };

  const flush = async () => {
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current); syncTimerRef.current = null;
      const latest = latestRef.current;
      latestRef.current = { ...latest, assets: reconcileAssets(lastSyncedContentRef.current, String(latest.content || ""), latest.assets || []) };
      lastSyncedContentRef.current = String(latest.content || "");
    }
    return saveNow(latestRef.current);
  };

  const close = async () => {
    if (await flush()) onClose();
  };

  /* ---------- derived ---------- */

  const content = String(formData.content || "");
  const assets = useMemo(() => formData.assets || [], [formData.assets]);
  const guide = useMemo(() => buildScriptGuide(content), [content]);
  const match = useMemo(() => matchSectionsToIdeas(content, ideas ?? [], assets), [content, ideas, assets]);
  const ideaById = useMemo(() => new Map((ideas ?? []).map((idea) => [idea.id, idea])), [ideas]);
  const unplaced = (ideas ?? []).filter((idea) => !match.placed.has(idea.id));
  const length = estimateSeconds(content);
  const clipStats = countClips(assets.map((a) => a.url));
  const assetAnalysis = useMemo(() => analyzeAssetLinks(assets), [assets]);
  const toRecord = (ideas ?? []).filter((idea) => idea.capture_status === "to_record").length;

  const missingClips = useMemo(() => {
    const have = new Set(assets.map((a) => getClipIdentity(a.url || "")).filter(Boolean));
    const seen = new Set<string>();
    const result: { idea: ProjectIdea; clip: ProjectIdea["clips"][number] }[] = [];
    for (const idea of ideas ?? []) for (const clip of idea.clips) {
      const id = getClipIdentity(clip.file_path);
      if (!id || have.has(id) || seen.has(id)) continue;
      seen.add(id);
      result.push({ idea, clip });
    }
    return result;
  }, [assets, ideas]);

  /* ---------- idea actions ---------- */

  const draftOf = () => ({
    content: String(latestRef.current.content || ""),
    description: String(latestRef.current.description || ""),
    assets: latestRef.current.assets || [],
    tags: latestRef.current.tags || [],
    hashtags: latestRef.current.hashtags || [],
  });

  const removeIdea = async (idea: ProjectIdea) => {
    const ok = await confirm({ kind: "warning", title: "Remove idea from project?", message: `“${idea.title}” — its line, clips and description block are removed from this project. The idea stays in your library.`, confirmText: "Remove" });
    if (!ok || !script) return;
    const sectionId = Array.from(match.bySection.entries()).find(([, id]) => id === idea.id)?.[0];
    const section = sectionId ? buildScriptGuide(draftOf().content).find((s) => s.id === sectionId) ?? null : null;
    const next = removeIdeaFromDraft(draftOf(), idea, section);
    lastSyncedContentRef.current = next.content;
    update(next);
    await flush();
    const { error } = await supabase.from("script_ideas").delete().eq("script_id", script.id).eq("detail_id", idea.id);
    if (error) notifyError(error.message, "Link not removed");
    setIdeas((current) => (current ?? []).filter((i) => i.id !== idea.id));
    invalidateUsage();
    success(`“${idea.title}” removed from this project.`, "Removed");
  };

  const addIdea = async (row: IdeaRow) => {
    if (!script) return;
    const position = Math.max(0, ...(ideas ?? []).map((i) => i.position).filter((value) => Number.isFinite(value))) + 1;
    const idea = toProjectIdea(row, position);
    const next = addIdeaToDraft(draftOf(), idea);
    lastSyncedContentRef.current = next.content;
    update(next);
    await flush();
    const { error } = await supabase.from("script_ideas").upsert({ script_id: script.id, detail_id: idea.id, position }, { onConflict: "script_id,detail_id" });
    if (error) notifyError(error.message, "Idea not linked");
    setIdeas((current) => [...(current ?? []), idea]);
    invalidateUsage();
    setPicking(false);
    success(`“${idea.title}” added as idea #${buildScriptGuide(next.content).filter((s) => !s.isHook).length}.`, "Idea added");
  };

  /** Put a linked idea's line back into the script. */
  const addLineFor = (idea: ProjectIdea) => {
    const draft = draftOf();
    const line = buildScriptLine(idea, idea.game_title);
    const nextContent = draft.content.trim() ? `${draft.content.trim()}\n\n${line}` : line;
    lastSyncedContentRef.current = nextContent;
    update({ content: nextContent });
  };

  const moveSection = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const text = String(latestRef.current.content || "");
    const all = buildScriptGuide(text);
    const hook = all.find((s) => s.isHook);
    const sections = all.filter((s) => !s.isHook);
    const from = sections.findIndex((s) => s.id === sourceId);
    const to = sections.findIndex((s) => s.id === targetId);
    if (from < 0 || to < 0) return;
    const blocks = new Map(all.map((s) => [s.id, text.slice(s.start, s.end).trim()]));
    const ordered = [...sections];
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    const nextContent = [hook ? blocks.get(hook.id) : null, ...ordered.map((s) => blocks.get(s.id))].filter(Boolean).join("\n\n");
    const newOrder = new Map<number, number>();
    ordered.forEach((s, i) => { if (s.number != null) newOrder.set(s.number, i + 1); });
    const nextAssets = (latestRef.current.assets || [])
      .map((a) => ({ ...a, idea_order: a.idea_order != null ? newOrder.get(a.idea_order) ?? a.idea_order : a.idea_order }))
      .sort((a, b) => (a.idea_order ?? Number.MAX_SAFE_INTEGER) - (b.idea_order ?? Number.MAX_SAFE_INTEGER));
    lastSyncedContentRef.current = nextContent;
    update({ content: nextContent, assets: nextAssets });
    // Keep the saved idea order in step with the script.
    if (script) {
      const orderedIdeaIds = ordered.map((s) => match.bySection.get(s.id)).filter((id): id is number => id != null);
      const rows = orderedIdeaIds.map((detailId, index) => ({ script_id: script.id, detail_id: detailId, position: index + 1 }));
      if (rows.length) void supabase.from("script_ideas").upsert(rows, { onConflict: "script_id,detail_id" });
      setIdeas((current) => (current ?? []).map((idea) => ({ ...idea, position: orderedIdeaIds.indexOf(idea.id) >= 0 ? orderedIdeaIds.indexOf(idea.id) + 1 : idea.position })));
    }
  };

  const addMissingClips = () => {
    const sectionOf = (ideaId: number) => {
      const sectionId = Array.from(match.bySection.entries()).find(([, id]) => id === ideaId)?.[0];
      return match.sections.find((s) => s.id === sectionId)?.number ?? null;
    };
    const added = missingClips.map(({ idea, clip }) => ({
      url: clip.file_path,
      name: clip.title || clip.file_path.split("/").pop() || "Video",
      channel_name: clip.channel_name,
      idea_id: idea.id,
      idea_title: idea.title,
      game_title: idea.game_title,
      idea_order: sectionOf(idea.id),
    }));
    update({ assets: [...(latestRef.current.assets || []), ...added].sort((a, b) => (a.idea_order ?? Number.MAX_SAFE_INTEGER) - (b.idea_order ?? Number.MAX_SAFE_INTEGER)) });
    success(`${added.length} clip${added.length === 1 ? "" : "s"} added.`, "Clips updated");
  };

  /* ---------- misc ---------- */

  const copy = async (text: string, what: string) => {
    if (!text.trim()) { notifyError(`There is no ${what} to copy.`, "Nothing to copy"); return; }
    try { await navigator.clipboard.writeText(text); success(`${what[0].toUpperCase()}${what.slice(1)} copied.`, "Copied"); }
    catch { notifyError("The browser could not copy. Select the text manually.", "Copy failed"); }
  };

  const refresh = async () => {
    if (!script) return;
    setMenuOpen(false);
    await flush();
    setRefreshing(true);
    const fresh = await onRefresh(script.id);
    setRefreshing(false);
    if (!fresh) return;
    setFormData(fresh);
    latestRef.current = fresh;
    lastSavedRef.current = JSON.stringify(fresh);
    lastSyncedContentRef.current = String(fresh.content || "");
    setSaveState("saved");
    void loadIdeas(script.id);
    success("Project reloaded.", "Refreshed");
  };

  const jumpTo = (start: number, end: number) => {
    setTab("script");
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, end);
    });
  };

  if (!script) return null;

  /* ---------- render pieces ---------- */

  const ideasPanel = (
    <div className="flex min-h-0 flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-fg">Ideas <span className="font-normal text-fg-4">· {ideas?.length ?? "…"}</span></p>
          <p className="text-[11px] text-fg-4">Drag to reorder · click to jump to the line</p>
        </div>
        {toRecord > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
            <VideoCameraIcon className="h-3 w-3" /> {toRecord} to record
          </span>
        )}
      </div>

      <ol className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
        {guide.length === 0 && <li className="rounded-2xl border border-dashed border-line-strong p-5 text-center text-xs text-fg-4">The script is empty. Add an idea below.</li>}
        {guide.map((section) => {
          const ideaId = match.bySection.get(section.id);
          const idea = ideaId != null ? ideaById.get(ideaId) : undefined;
          const sectionClips = assets.filter((a) => (idea && a.idea_id === idea.id) || (!a.idea_id && a.idea_order === section.number));
          const color = ideaColor(section.number);
          const isOver = dragOverId === section.id && draggedId !== section.id;
          if (section.isHook) {
            return (
              <li key={section.id}>
                <button type="button" onClick={() => jumpTo(section.start, section.end)} className="flex w-full cursor-pointer items-start gap-2.5 rounded-xl border border-violet-200 bg-violet-50 p-2.5 text-left transition hover:bg-violet-100 dark:border-violet-500/25 dark:bg-violet-500/10">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-xs font-bold text-white">H</span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-violet-800 dark:text-violet-200">Opening hook</span>
                    <span className="line-clamp-2 text-xs text-violet-700/80 dark:text-violet-200/70">{section.preview}</span>
                  </span>
                </button>
              </li>
            );
          }
          return (
            <li
              key={section.id}
              draggable
              onDragStart={(e) => { setDraggedId(section.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", section.id); }}
              onDragOver={(e) => { e.preventDefault(); setDragOverId(section.id); }}
              onDragLeave={() => setDragOverId((c) => (c === section.id ? null : c))}
              onDrop={(e) => { e.preventDefault(); const src = e.dataTransfer.getData("text/plain") || draggedId; if (src) moveSection(src, section.id); setDraggedId(null); setDragOverId(null); }}
              onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
              className={`group relative flex items-start gap-2 rounded-xl border border-l-4 p-2 transition ${color.bar} ${isOver ? "border-blue-500 bg-accent-soft ring-1 ring-blue-500" : "border-y-line border-r-line bg-surface hover:border-y-line-strong hover:border-r-line-strong"}`}
            >
              <Bars3Icon className="mt-2 h-4 w-4 shrink-0 cursor-grab text-fg-4 active:cursor-grabbing pointer-coarse:hidden" aria-hidden="true" />
              <span className={`mt-0.5 flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg px-1 text-xs font-bold tabular-nums shadow-sm ${idea ? color.badge : NEUTRAL_COLOR.badge}`}>{section.number}</span>
              <div className="min-w-0 flex-1">
                <button type="button" onClick={() => jumpTo(section.start, section.end)} className="block w-full cursor-pointer text-left">
                  {idea ? (
                    <>
                      <span className="block truncate text-[11px] font-semibold uppercase tracking-wide text-fg-4">{idea.game_title}</span>
                      <span className="line-clamp-2 text-[15px] font-bold leading-5 text-fg">{idea.title}</span>
                      {idea.capture_status && CAPTURE_META[idea.capture_status as keyof typeof CAPTURE_META] && (
                        <span className={`mt-1 inline-flex items-center gap-1 rounded px-1 text-[11px] font-semibold ${CAPTURE_META[idea.capture_status as keyof typeof CAPTURE_META].pill}`}>
                          <VideoCameraIcon className="h-3 w-3" /> {CAPTURE_META[idea.capture_status as keyof typeof CAPTURE_META].short}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="block truncate text-[11px] font-semibold uppercase tracking-wide text-fg-4">{section.label}</span>
                      <span className="line-clamp-2 text-xs leading-5 text-fg-3">{section.preview}</span>
                      <span className="mt-1 block text-[11px] italic text-fg-4">Not linked to an idea</span>
                    </>
                  )}
                </button>
                {sectionClips.length > 0 ? (
                  <ul className={`mt-1.5 space-y-0.5 rounded-lg p-1 ${color.soft}`}>
                    {sectionClips.map((asset, i) => (
                      <li key={`${asset.url}-${i}`}>
                        <a href={asset.url} target="_blank" rel="noopener noreferrer" title={asset.url} className={`flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium transition ${color.link}`}>
                          <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{clipLabel(asset)}</span>
                          {asset.channel_name && <span className="max-w-[40%] shrink-0 truncate text-[10px] font-semibold opacity-70">{asset.channel_name}</span>}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : idea ? (
                  <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-fg-4"><FilmIcon className="h-3 w-3" /> No clips yet</p>
                ) : null}
              </div>
              {idea && (
                <div className="flex shrink-0 flex-col gap-0.5 pointer-fine:opacity-0 pointer-fine:transition pointer-fine:group-hover:opacity-100 pointer-fine:focus-within:opacity-100">
                  <Link href={`/idea/${idea.id}`} target="_blank" className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-4 hover:bg-surface-sunken hover:text-fg" aria-label={`Open ${idea.title}`} title="Open idea">
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  </Link>
                  <button type="button" onClick={() => void removeIdea(idea)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-fg-4 hover:bg-danger-soft hover:text-rose-600" aria-label={`Remove ${idea.title} from project`} title="Remove from project">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </li>
          );
        })}

        {unplaced.length > 0 && (
          <li className="pt-2">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300"><ExclamationTriangleIcon className="h-3.5 w-3.5" /> In the project but not in the script</p>
            <ul className="space-y-1.5">
              {unplaced.map((idea) => (
                <li key={idea.id} className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2 dark:border-amber-500/30 dark:bg-amber-500/10">
                  <GameThumb src={idea.game_cover} className="h-8 w-6" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">{idea.title}</span>
                    <span className="block truncate text-[11px] text-fg-3">{idea.game_title}</span>
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => addLineFor(idea)} title="Add its line to the end of the script">Add line</Button>
                  <button type="button" onClick={() => void removeIdea(idea)} className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-fg-4 hover:bg-danger-soft hover:text-rose-600" aria-label={`Remove ${idea.title} from project`}>
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </li>
        )}
      </ol>

      <div className="relative mt-3">
        {picking && <IdeaPicker excludeIds={new Set((ideas ?? []).map((i) => i.id))} onPick={addIdea} onClose={() => setPicking(false)} />}
        <Button variant="secondary" className="w-full" onClick={() => setPicking((v) => !v)} aria-expanded={picking}>
          <PlusIcon className="h-4 w-4" /> Add idea
        </Button>
      </div>
    </div>
  );

  const scriptPanel = (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`inline-flex items-center gap-1.5 text-xs font-medium ${length.seconds > 60 ? "text-amber-700 dark:text-amber-300" : "text-fg-3"}`} title="Estimated at about 2.6 words per second">
          <ClockIcon className="h-4 w-4" /> ≈ {formatDuration(length.seconds)} · {length.words} words{length.seconds > 60 ? " · over 60s" : ""}
        </p>
        <Button variant="primary" size="sm" onClick={() => void copy(content, "script")}><DocumentDuplicateIcon className="h-4 w-4" /> Copy script</Button>
      </div>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder="Opening hook, then one line per idea…"
        aria-label="Script"
        className="min-h-[50dvh] w-full flex-1 resize-none rounded-2xl border border-line bg-surface p-4 text-base leading-7 text-fg outline-none transition placeholder:text-fg-4 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:p-6 sm:text-[17px] sm:leading-8 lg:min-h-0"
      />
    </div>
  );

  const clipsPanel = (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-3"><span className="font-semibold text-fg">{clipStats.clips} clips</span> · {assetAnalysis.uniqueLinkCount} source {assetAnalysis.uniqueLinkCount === 1 ? "video" : "videos"} to download</p>
        <Button variant="secondary" size="sm" onClick={() => void copy(assetAnalysis.uniqueAssets.map((a) => a.url).filter(Boolean).join("\n"), "links")}><DocumentDuplicateIcon className="h-4 w-4" /> Copy unique links</Button>
      </div>
      {missingClips.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <p className="flex items-start gap-2 text-sm"><ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" /> <span><span className="font-semibold">{missingClips.length} clip{missingClips.length === 1 ? "" : "s"} on this project&apos;s ideas {missingClips.length === 1 ? "is" : "are"} not in the list</span><br /><span className="text-xs opacity-80">{Array.from(new Set(missingClips.map((m) => m.idea.title))).join(" · ")}</span></span></p>
          <Button variant="accent" size="sm" onClick={addMissingClips} className="bg-amber-600 hover:bg-amber-700"><PlusIcon className="h-4 w-4" /> Add {missingClips.length === 1 ? "it" : "them"}</Button>
        </div>
      )}
      {assets.length === 0 && match.placed.size === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong p-8 text-center text-sm text-fg-4">No clips yet. Clips come from the ideas&apos; footage.</p>
      ) : (
        (() => {
          const groups = new Map<string, { title: string; subtitle: string; order: number; items: { asset: ProjectAsset; index: number }[] }>();
          // Every idea in the script gets its block, even before it has clips.
          for (const section of match.sections) {
            const idea = ideaById.get(match.bySection.get(section.id) ?? -1);
            if (idea && section.number != null) groups.set(`i${idea.id}`, { title: idea.title, subtitle: idea.game_title, order: section.number, items: [] });
          }
          assets.forEach((asset, index) => {
            const section = match.sections.find((s) => s.number === asset.idea_order);
            const idea = asset.idea_id ? ideaById.get(asset.idea_id) : section ? ideaById.get(match.bySection.get(section.id) ?? -1) : undefined;
            const key = idea ? `i${idea.id}` : asset.idea_order != null ? `o${asset.idea_order}` : "other";
            const group = groups.get(key) ?? {
              title: idea?.title ?? asset.idea_title ?? (asset.idea_order != null ? `Idea ${asset.idea_order}` : "Other clips"),
              subtitle: idea?.game_title ?? asset.game_title ?? "",
              order: asset.idea_order ?? Number.MAX_SAFE_INTEGER,
              items: [],
            };
            group.items.push({ asset, index });
            groups.set(key, group);
          });
          return Array.from(groups.values()).sort((a, b) => a.order - b.order).map((group) => {
            const color = ideaColor(group.order);
            const hasNumber = group.order !== Number.MAX_SAFE_INTEGER;
            return (
            <section key={`${group.title}-${group.order}`} className={`overflow-hidden rounded-2xl border border-l-4 border-y-line border-r-line bg-surface ${color.bar}`}>
              <header className={`flex items-center gap-3 px-4 py-3 ${color.soft}`}>
                {hasNumber && <span className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg px-1.5 text-sm font-bold shadow-sm ${color.badge}`}>{group.order}</span>}
                <span className="min-w-0 flex-1">
                  {group.subtitle && <span className="block truncate text-[11px] font-semibold uppercase tracking-wide text-fg-3">{group.subtitle}</span>}
                  <span className={`block truncate text-base font-bold ${color.title}`}>{hasNumber ? `Idea ${group.order} · ` : ""}{group.title}</span>
                </span>
                <span className="hidden shrink-0 text-xs font-medium text-fg-3 sm:inline">{group.items.length} clip{group.items.length === 1 ? "" : "s"}</span>
                {group.items.length > 0 && <Button variant="ghost" size="sm" onClick={() => void copy(group.items.map(({ asset }) => asset.url).filter(Boolean).join("\n"), "links")} title="Copy this idea's links"><DocumentDuplicateIcon className="h-4 w-4" /> <span className="hidden sm:inline">Copy links</span></Button>}
              </header>
              {group.items.length === 0 && <p className="flex items-center gap-2 px-4 py-3 text-sm text-fg-4"><FilmIcon className="h-4 w-4" /> No clips yet. Add footage to this idea, or record it yourself.</p>}
              <ul className="divide-y divide-line-soft">
                {group.items.map(({ asset, index }, i) => {
                  const dup = assetAnalysis.duplicateMeta.get(index);
                  return (
                    <li key={`${asset.url}-${index}`} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="w-5 shrink-0 text-center text-xs font-semibold tabular-nums text-fg-4">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm font-medium text-fg">
                          <span className="truncate">{asset.name}</span>
                          {asset.channel_name && <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{asset.channel_name}</span>}
                          {dup && <span className="rounded-full bg-surface-sunken px-1.5 py-0.5 text-[10px] font-semibold text-fg-3">{dup.isPrimary ? `Same source ×${dup.total}` : "Same source"}</span>}
                        </p>
                        <a href={asset.url} target="_blank" rel="noopener noreferrer" className={`block truncate rounded font-mono text-[11px] underline-offset-2 hover:underline ${hasNumber ? color.link.split(" ").filter((c) => !c.includes("hover:bg")).join(" ") : "text-fg-4"}`}>{asset.url}</a>
                      </div>
                      <a href={asset.url} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-fg-3 hover:text-fg" aria-label="Open clip"><LinkIcon className="h-4 w-4" /></a>
                    </li>
                  );
                })}
              </ul>
            </section>
            );
          });
        })()
      )}
    </div>
  );

  const detailsPanel = (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-fg-3">YouTube description</p>
          <Button variant="ghost" size="sm" onClick={() => void copy(String(formData.description || ""), "description")}><DocumentDuplicateIcon className="h-4 w-4" /> Copy</Button>
        </div>
        <textarea
          value={String(formData.description || "")}
          onChange={(e) => update({ description: e.target.value })}
          className="h-64 w-full resize-y rounded-2xl border border-line bg-surface p-4 text-sm leading-6 text-fg outline-none focus:border-blue-500"
          aria-label="Description"
        />
      </div>
      <ChipEditor label="Hashtags" values={formData.hashtags || []} onChange={(hashtags) => update({ hashtags })} prefix="#" placeholder="#shorts, #gaming…" />
      <div className="flex justify-end -mt-3"><Button variant="ghost" size="sm" onClick={() => void copy((formData.hashtags || []).join(" "), "hashtags")}><DocumentDuplicateIcon className="h-4 w-4" /> Copy hashtags</Button></div>
      <ChipEditor label="Tags" values={formData.tags || []} onChange={(tags) => update({ tags })} placeholder="GTA V, Gaming…" />
      <div className="flex justify-end -mt-3"><Button variant="ghost" size="sm" onClick={() => void copy((formData.tags || []).join(", "), "tags")}><DocumentDuplicateIcon className="h-4 w-4" /> Copy tags</Button></div>
    </div>
  );

  const tabs = [
    { key: "script" as const, label: "Script", Icon: DocumentTextIcon, mobileOnly: false },
    { key: "ideas" as const, label: `Ideas · ${ideas?.length ?? 0}`, Icon: LightBulbIcon, mobileOnly: true },
    { key: "clips" as const, label: `Clips · ${clipStats.clips}`, Icon: FilmIcon, mobileOnly: false },
    { key: "details" as const, label: "Details", Icon: InformationCircleIcon, mobileOnly: false },
  ];

  return (
    <Modal open={isOpen} onClose={() => void close()} size="editor" zClass="z-[150]" className="max-w-[min(1320px,calc(100vw-1rem))] rounded-[1.5rem] sm:rounded-[2rem]">
      {/* Header */}
      <div className="shrink-0 border-b border-line-soft px-3 pb-3 pt-3 sm:px-6 sm:pt-5">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void close()} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-fg-3 transition hover:bg-surface-sunken hover:text-fg" aria-label="Close project">
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <input
            value={String(formData.title || "")}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Untitled project"
            aria-label="Project title"
            className="min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-2 py-1.5 text-lg font-bold text-fg outline-none transition hover:border-line focus:border-blue-500 focus:bg-surface sm:text-2xl"
          />
          <span
            className={`hidden h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold sm:inline-flex ${saveState === "error" ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" : saveState === "saving" ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"}`}
            title="Changes save automatically"
          >
            {saveState === "saving" ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : <CheckIcon className="h-3.5 w-3.5" />}
            {saveState === "error" ? "Save failed" : saveState === "saving" ? "Saving" : "Saved"}
          </span>
          <div ref={menuRef} className={`relative ${menuOpen ? "z-40" : ""}`}>
            <button type="button" onClick={() => setMenuOpen((v) => !v)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-fg-3 transition hover:bg-surface-sunken hover:text-fg" aria-label="More" aria-expanded={menuOpen}>
              <EllipsisHorizontalIcon className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full z-40 mt-1 w-56 rounded-2xl border border-line bg-surface p-1.5 shadow-2xl">
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); void copy(content, "script"); }} className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-fg-2 hover:bg-surface-sunken hover:text-fg"><DocumentDuplicateIcon className="h-4 w-4" /> Copy script</button>
                <button type="button" role="menuitem" onClick={() => void refresh()} disabled={refreshing} className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-fg-2 hover:bg-surface-sunken hover:text-fg"><ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Reload from database</button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 sm:pl-12">
          <div className="flex gap-0.5 rounded-xl bg-surface-sunken p-0.5" role="radiogroup" aria-label="Status">
            {STATUSES.map((status) => (
              <button key={status} type="button" role="radio" aria-checked={(formData.status || "Draft") === status} onClick={() => update({ status })} className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition sm:px-3 ${(formData.status || "Draft") === status ? "bg-surface text-fg shadow-sm ring-1 ring-line" : "text-fg-3 hover:text-fg"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} /> {status}
              </button>
            ))}
          </div>
          <div className="w-full min-w-0 sm:w-64">
            <ProjectTopicSelect value={getScriptTopicValue(formData)} topics={topics} loading={topicsLoading} onChange={(topic) => update({ topic })} />
          </div>
          {topicsError && <button type="button" onClick={onRetryTopics} className="cursor-pointer text-xs font-semibold text-rose-500 underline">Retry topics</button>}
          <p className="text-xs text-fg-4 sm:ml-auto">{ideas?.length ?? 0} ideas · {clipStats.clips} clips · ≈ {formatDuration(length.seconds)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-line-soft px-3 sm:px-6" role="tablist">
        {tabs.map(({ key, label, Icon, mobileOnly }) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`${mobileOnly ? "lg:hidden" : ""} inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-3 text-sm font-semibold transition ${tab === key ? "border-blue-600 text-fg" : "border-transparent text-fg-3 hover:text-fg"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-surface-muted p-3 sm:p-6">
        {tab === "script" && (
          <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
            {scriptPanel}
            <aside className="hidden min-h-0 rounded-2xl border border-line bg-surface p-3 lg:flex lg:flex-col">{ideasPanel}</aside>
          </div>
        )}
        {tab === "ideas" && <div className="mx-auto max-w-xl rounded-2xl border border-line bg-surface p-3">{ideasPanel}</div>}
        {tab === "clips" && clipsPanel}
        {tab === "details" && detailsPanel}
      </div>
    </Modal>
  );
}

