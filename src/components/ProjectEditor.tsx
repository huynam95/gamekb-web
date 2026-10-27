"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  LinkIcon,
  MagnifyingGlassIcon,
  PlayIcon,
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
import { buildScriptGuide, type ScriptGuideSection } from "@/lib/scriptGuide";
import { getScriptTopicValue } from "@/lib/scriptTopics";
import { analyzeAssetLinks, countClips, getClipIdentity } from "@/lib/assetLinks";
import { invalidateUsage } from "@/lib/ideaUsage";
import { loadLinks } from "@/lib/ideaLinks";
import { CAPTURE_META, CAPTURE_STATUSES, RECORDING_SETUP_MESSAGE, captureStatusPatch, isMissingRecordingColumns, type CaptureStatus } from "@/lib/recording";
import type { VideoTheme } from "@/lib/videoThemes";
import {
  addIdeaToDraft,
  buildScriptLine,
  estimateSeconds,
  matchSectionsToIdeas,
  IDEA_SELECT,
  removeIdeaFromDraft,
  toProjectIdea,
  type IdeaRow,
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




function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

/* ================= SMALL PIECES ================= */

/** A text box that grows with its text, so a script line and its idea card share one row. */
function AutoTextarea({ value, onChange, onFocus, onBlur, inputRef, placeholder, ariaLabel }: {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  inputRef: (el: HTMLTextAreaElement | null) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);
  useLayoutEffect(resize, [value, resize]);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => { if (el.clientWidth !== width) { width = el.clientWidth; resize(); } });
    observer.observe(el);
    return () => observer.disconnect();
  }, [resize]);
  return (
    <textarea
      ref={(el) => { ref.current = el; inputRef(el); }}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="block min-w-0 flex-1 resize-none overflow-hidden bg-transparent text-base leading-7 text-fg outline-none placeholder:text-fg-4 sm:text-[17px] sm:leading-8"
    />
  );
}

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
function IdeaPicker({ excludeIds, suggested, onPick, onClose }: { excludeIds: Set<number>; suggested: { id: number; reason: string }[]; onPick: (row: IdeaRow) => Promise<void>; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<IdeaRow[]>([]);
  const [suggestedRows, setSuggestedRows] = useState<IdeaRow[]>([]);
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

  // Ideas linked to the ones already in the project come first.
  const suggestedKey = suggested.map((item) => item.id).join(",");
  useEffect(() => {
    let active = true;
    const ids = suggestedKey ? suggestedKey.split(",").map(Number) : [];
    if (!ids.length) return;
    supabase.from("details").select(IDEA_SELECT).in("id", ids).then(({ data }) => {
      if (!active) return;
      const byId = new Map(((data ?? []) as unknown as IdeaRow[]).map((row) => [row.id, row]));
      setSuggestedRows(ids.map((id) => byId.get(id)).filter(Boolean) as IdeaRow[]);
    });
    return () => { active = false; };
  }, [suggestedKey]);
  const reasonOf = new Map(suggested.map((item) => [item.id, item.reason]));
  const showSuggested = !query.trim() && suggestedRows.some((row) => !excludeIds.has(row.id));
  const visibleSuggested = showSuggested ? suggestedRows.filter((row) => !excludeIds.has(row.id)) : [];
  const visibleRows = rows.filter((row) => !visibleSuggested.some((s) => s.id === row.id));

  const option = (row: IdeaRow, reason?: string) => (
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
          <span className="block truncate text-[11px] text-fg-4">
            {reason ? <span className="font-semibold text-accent">{reason}</span> : row.game?.title}
            {!reason && row.footage?.length ? ` · ${row.footage.length} clip${row.footage.length === 1 ? "" : "s"}` : ""}
          </span>
        </span>
        {adding === row.id ? <ArrowPathIcon className="h-4 w-4 animate-spin text-fg-4" /> : <PlusIcon className="h-4 w-4 shrink-0 text-accent" />}
      </button>
    </li>
  );

  return (
    <div ref={boxRef} className="absolute inset-x-0 bottom-full z-30 mb-2 rounded-2xl border border-line bg-surface p-2 shadow-2xl animate-in fade-in slide-in-from-bottom-1 duration-150">
      <label className="relative block">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-4" />
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search idea title..." aria-label="Search ideas" className="h-10 w-full rounded-xl border border-line bg-surface-muted pl-9 pr-3 text-sm text-fg outline-none focus:border-blue-500" />
      </label>
      <ul className="mt-1.5 max-h-80 overflow-y-auto">
        {visibleSuggested.length > 0 && (
          <>
            <li className="flex items-center gap-1.5 px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent"><LinkIcon className="h-3.5 w-3.5" /> Related to this project</li>
            {visibleSuggested.map((row) => option(row, reasonOf.get(row.id)))}
            <li className="px-2 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-fg-4">Recent ideas</li>
          </>
        )}
        {loading && visibleRows.length === 0 && <li className="px-3 py-4 text-center text-xs text-fg-4">Searching…</li>}
        {!loading && visibleRows.length === 0 && visibleSuggested.length === 0 && <li className="px-3 py-4 text-center text-xs text-fg-4">No ideas found.</li>}
        {visibleRows.map((row) => option(row))}
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
  const [tab, setTab] = useState<"script" | "details">("script");
  const [viewMode, setViewMode] = useState<"aligned" | "plain">(() => {
    try { return typeof window !== "undefined" && window.localStorage.getItem("ninjaplay-script-view") === "plain" ? "plain" : "aligned"; } catch { return "aligned"; }
  });
  const [editingRow, setEditingRow] = useState<{ row: number; text: string; skip: number } | null>(null);
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const rowRefs = useRef(new Map<number, HTMLTextAreaElement>());
  const [links, setLinks] = useState<Map<number, Set<number>>>(() => new Map());
  const [recordMenuFor, setRecordMenuFor] = useState<number | null>(null);
  const router = useRouter();
  const addIdeaRef = useRef<HTMLDivElement | null>(null);
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

  // Related ideas (idea_links) for the ideas in this project.
  const ideaIdsKey = (ideas ?? []).map((idea) => idea.id).sort((a, b) => a - b).join(",");
  useEffect(() => {
    let active = true;
    const ids = ideaIdsKey ? ideaIdsKey.split(",").map(Number) : [];
    loadLinks(ids).then(({ links: next }) => { if (active) setLinks(next); });
    return () => { active = false; };
  }, [ideaIdsKey]);

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

  /** The idea's own page. Its back button returns to this project. */
  const ideaHref = (ideaId: number) => `/idea/${ideaId}${script ? `?project=${script.id}` : ""}`;
  const openIdea = async (event: React.MouseEvent, ideaId: number) => {
    // Ctrl/Cmd/middle click still opens a new tab.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    await flush();
    router.push(ideaHref(ideaId));
  };

  const setCapture = async (idea: ProjectIdea, status: CaptureStatus | null) => {
    setRecordMenuFor(null);
    if ((idea.capture_status ?? null) === status) return;
    const { data: previous } = await supabase.from("details").select("capture_added_at,recorded_at").eq("id", idea.id).single();
    const patch = captureStatusPatch(status, (previous ?? undefined) as { capture_added_at?: string | null; recorded_at?: string | null } | undefined);
    const { error } = await supabase.from("details").update(patch).eq("id", idea.id);
    if (error) {
      notifyError(isMissingRecordingColumns(error) ? RECORDING_SETUP_MESSAGE : error.message, "Recording not updated");
      return;
    }
    setIdeas((current) => (current ?? []).map((item) => (item.id === idea.id ? { ...item, capture_status: status } : item)));
    success(status ? `“${idea.title}” marked ${CAPTURE_META[status].label.toLowerCase()}.` : `“${idea.title}” taken off the Recording List.`, "Recording List");
  };

  /* ---------- derived ---------- */

  const content = String(formData.content || "");
  const assets = useMemo(() => formData.assets || [], [formData.assets]);
  const guide = useMemo(() => buildScriptGuide(content), [content]);
  const match = useMemo(() => matchSectionsToIdeas(content, ideas ?? [], assets), [content, ideas, assets]);
  const ideaById = useMemo(() => new Map((ideas ?? []).map((idea) => [idea.id, idea])), [ideas]);
  const unplaced = (ideas ?? []).filter((idea) => !match.placed.has(idea.id));
  const inProject = useMemo(() => new Set((ideas ?? []).map((idea) => idea.id)), [ideas]);
  const relatedOutside = (ideaId: number) => Array.from(links.get(ideaId) ?? []).filter((id) => !inProject.has(id));
  const suggested: { id: number; reason: string }[] = [];
  for (const idea of [...(ideas ?? [])].sort((a, b) => a.position - b.position)) {
    for (const id of relatedOutside(idea.id)) {
      if (!suggested.some((item) => item.id === id)) suggested.push({ id, reason: `Goes with “${idea.title}”` });
    }
  }
  const openPicker = () => {
    setPicking(true);
    requestAnimationFrame(() => addIdeaRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }));
  };
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

  // Clips that belong to each script line, and the ones no line claims.
  const clipsBySection = new Map<string, { asset: ProjectAsset; index: number }[]>();
  const claimed = new Set<number>();
  for (const section of guide) {
    if (section.isHook) continue;
    const ideaId = match.bySection.get(section.id);
    const list: { asset: ProjectAsset; index: number }[] = [];
    assets.forEach((asset, index) => {
      if (claimed.has(index)) return;
      if ((ideaId != null && asset.idea_id === ideaId) || (!asset.idea_id && asset.idea_order === section.number)) {
        list.push({ asset, index });
        claimed.add(index);
      }
    });
    clipsBySection.set(section.id, list);
  }
  const otherClips = assets.map((asset, index) => ({ asset, index })).filter(({ index }) => !claimed.has(index));

  // Clips as small chips: number and channel. Hover shows the clip title and link.
  const clipRows = (items: { asset: ProjectAsset; index: number }[], color: (typeof IDEA_COLORS)[number] | typeof NEUTRAL_COLOR) => (
    <ul className="flex flex-wrap gap-1.5 px-3 py-2.5">
      {items.map(({ asset, index }, i) => {
        const dup = assetAnalysis.duplicateMeta.get(index);
        return (
          <li key={`${asset.url}-${index}`} className="min-w-0 max-w-full">
            <a
              href={asset.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`${clipLabel(asset)}\n${asset.url}`}
              aria-label={`Open clip ${i + 1}: ${clipLabel(asset)}`}
              className={`inline-flex h-8 max-w-full items-center gap-1.5 rounded-lg border border-line bg-surface px-2 text-xs font-semibold transition hover:border-line-strong ${color.link}`}
            >
              <PlayIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="shrink-0 tabular-nums">Clip {i + 1}</span>
              {asset.channel_name && <span className="min-w-0 truncate font-medium text-fg-3">· {asset.channel_name}</span>}
              {dup && <span className="shrink-0 rounded bg-surface-sunken px-1 text-[10px] text-fg-3" title="Same source video as another clip">{dup.isPrimary ? `×${dup.total}` : "dup"}</span>}
            </a>
          </li>
        );
      })}
    </ul>
  );

  const changeView = (mode: "aligned" | "plain") => {
    setViewMode(mode);
    setEditingRow(null);
    try { window.localStorage.setItem("ninjaplay-script-view", mode); } catch { /* ignore */ }
  };

  const scriptToolbar = (
    <>
      <p className={`inline-flex items-center gap-1.5 text-xs font-medium ${length.seconds > 60 ? "text-amber-700 dark:text-amber-300" : "text-fg-3"}`} title="Estimated at about 2.6 words per second">
        <ClockIcon className="h-4 w-4" /> ≈ {formatDuration(length.seconds)} · {length.words} words{length.seconds > 60 ? " · over 60s" : ""}
      </p>
      <div className="flex items-center gap-1.5">
        <div className="flex gap-0.5 rounded-lg bg-surface-sunken p-0.5" role="radiogroup" aria-label="Script view">
          {([["aligned", "Line by line"], ["plain", "Plain text"]] as const).map(([mode, label]) => (
            <button key={mode} type="button" role="radio" aria-checked={viewMode === mode} onClick={() => changeView(mode)} className={`h-8 cursor-pointer rounded-md px-2.5 text-xs font-semibold transition ${viewMode === mode ? "bg-surface text-fg shadow-sm ring-1 ring-line" : "text-fg-3 hover:text-fg"}`}>{label}</button>
          ))}
        </div>
        <Button variant="primary" size="sm" onClick={() => void copy(content, "script")}><DocumentDuplicateIcon className="h-4 w-4" /> Copy script</Button>
      </div>
    </>
  );

  const iconButton = "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-fg-4 transition hover:bg-surface/80 hover:text-fg";

  const renderHookCard = (section: ScriptGuideSection, onJump: () => void, active = false) => (
    <button type="button" onClick={onJump} className={`flex h-full w-full cursor-pointer items-start gap-2.5 rounded-2xl border border-violet-200 bg-violet-50 p-3 text-left transition hover:bg-violet-100 dark:border-violet-500/25 dark:bg-violet-500/10 ${active ? "ring-2 ring-violet-500" : ""}`}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-xs font-bold text-white">H</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-violet-800 dark:text-violet-200">Opening hook</span>
        <span className="line-clamp-2 text-xs text-violet-700/80 dark:text-violet-200/70">{section.preview}</span>
      </span>
    </button>
  );

  const renderSectionCard = (section: ScriptGuideSection, onJump: () => void, active = false) => {
    const ideaId = match.bySection.get(section.id);
    const idea = ideaId != null ? ideaById.get(ideaId) : undefined;
    const sectionClips = clipsBySection.get(section.id) ?? [];
    const color = idea ? ideaColor(section.number) : NEUTRAL_COLOR;
    const isOver = dragOverId === section.id && draggedId !== section.id;
    const capture = idea?.capture_status ? CAPTURE_META[idea.capture_status as keyof typeof CAPTURE_META] : undefined;
    return (
      <div
        draggable
        onDragStart={(e) => { setDraggedId(section.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", section.id); }}
        onDragOver={(e) => { e.preventDefault(); setDragOverId(section.id); }}
        onDragLeave={() => setDragOverId((c) => (c === section.id ? null : c))}
        onDrop={(e) => { e.preventDefault(); const src = e.dataTransfer.getData("text/plain") || draggedId; if (src) moveSection(src, section.id); setDraggedId(null); setDragOverId(null); }}
        onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
        className={`group h-full overflow-hidden rounded-2xl border border-l-4 bg-surface transition ${color.bar} ${isOver ? "border-y-blue-500 border-r-blue-500 ring-2 ring-blue-500" : active ? "border-y-line-strong border-r-line-strong ring-2 ring-blue-500/50" : "border-y-line border-r-line"}`}
      >
        <div className={`relative flex items-start gap-3 overflow-hidden p-3 ${color.soft}`}>
          {idea?.game_cover && (
            // The game's art fades in from the right edge.
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-30 [mask-image:linear-gradient(to_left,black_10%,transparent)] dark:opacity-25">
              <CoverImage src={idea.game_cover} sizes="300px" className="scale-110 blur-[2px]" />
            </span>
          )}
          <Bars3Icon className="relative mt-2 h-4 w-4 shrink-0 cursor-grab text-fg-4 active:cursor-grabbing pointer-coarse:hidden" aria-hidden="true" />
          <span className={`relative mt-0.5 flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg px-1.5 text-sm font-bold tabular-nums shadow-sm ${color.badge}`}>{section.number}</span>
          <div className="relative min-w-0 flex-1 pl-1">
            <button type="button" onClick={onJump} className="block w-full cursor-pointer text-left" title="Go to this line in the script">
              {idea ? (
                <>
                  <span className="block truncate text-[11px] font-semibold uppercase tracking-wide text-fg-3">{idea.game_title}</span>
                  <span className={`line-clamp-2 text-[15px] font-bold leading-snug ${color.title}`}>{idea.title}</span>
                </>
              ) : (
                <>
                  <span className="block truncate text-[11px] font-semibold uppercase tracking-wide text-fg-4">{section.label}</span>
                  <span className="line-clamp-2 text-xs leading-5 text-fg-3">{section.preview}</span>
                  <span className="mt-1 block text-[11px] italic text-fg-4">Not linked to an idea</span>
                </>
              )}
            </button>
            {idea && (
              <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-fg-3">
                <span className="inline-flex items-center gap-1"><FilmIcon className="h-3 w-3" /> {sectionClips.length} clip{sectionClips.length === 1 ? "" : "s"}</span>
                <button
                  type="button"
                  onClick={() => setRecordMenuFor((current) => (current === idea.id ? null : idea.id))}
                  aria-expanded={recordMenuFor === idea.id}
                  title="Recording List"
                  className={`inline-flex cursor-pointer items-center gap-1 rounded px-1 font-semibold transition ${capture ? capture.pill : "bg-surface/80 text-fg-3 ring-1 ring-line hover:text-rose-600"}`}
                >
                  <VideoCameraIcon className="h-3 w-3" /> {capture ? capture.short : "Record?"}
                </button>
                {relatedOutside(idea.id).length > 0 && (
                  <button type="button" onClick={openPicker} className="inline-flex cursor-pointer items-center gap-1 rounded bg-surface/80 px-1 font-semibold text-accent ring-1 ring-blue-500/25 transition hover:bg-accent-soft" title="Related ideas not in this project yet">
                    <LinkIcon className="h-3 w-3" /> {relatedOutside(idea.id).length} related
                  </button>
                )}
              </span>
            )}
            {idea && recordMenuFor === idea.id && (
              <span className="mt-1.5 flex flex-wrap gap-1" role="group" aria-label="Recording status">
                {CAPTURE_STATUSES.map((status) => (
                  <button key={status} type="button" aria-pressed={idea.capture_status === status} onClick={() => void setCapture(idea, status)} className={`inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold ring-1 transition ${idea.capture_status === status ? `${CAPTURE_META[status].pill} ring-transparent` : "bg-surface text-fg-2 ring-line hover:ring-line-strong"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${CAPTURE_META[status].dot}`} /> {CAPTURE_META[status].short}
                  </button>
                ))}
                {idea.capture_status && (
                  <button type="button" onClick={() => void setCapture(idea, null)} className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg bg-surface px-2 text-[11px] font-semibold text-fg-3 ring-1 ring-line transition hover:text-rose-600">
                    <XMarkIcon className="h-3 w-3" /> Off the list
                  </button>
                )}
              </span>
            )}
          </div>
          <div className="relative -mr-1 -mt-1 flex shrink-0 flex-col gap-0.5 sm:flex-row">
            {sectionClips.length > 0 && (
              <button type="button" onClick={() => void copy(sectionClips.map(({ asset }) => asset.url).filter(Boolean).join("\n"), "links")} className={iconButton} aria-label="Copy this idea's links" title="Copy this idea's links">
                <DocumentDuplicateIcon className="h-4 w-4" />
              </button>
            )}
            {idea && (
              <>
                <Link href={ideaHref(idea.id)} onClick={(e) => void openIdea(e, idea.id)} className={iconButton} aria-label={`Open idea page: ${idea.title}`} title="Open idea page">
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </Link>
                <button type="button" onClick={() => void removeIdea(idea)} className={`${iconButton} hover:bg-danger-soft hover:text-rose-600`} aria-label={`Remove ${idea.title} from project`} title="Remove from project">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
        {sectionClips.length > 0
          ? clipRows(sectionClips, color)
          : idea && <p className="flex items-center gap-2 px-3 py-2.5 text-xs text-fg-4"><FilmIcon className="h-4 w-4" /> No clips yet. Add footage to this idea, or record it yourself.</p>}
      </div>
    );
  };

  const ideasSummary = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-fg">Ideas & clips <span className="font-normal text-fg-4">· {ideas?.length ?? "…"} ideas · {clipStats.clips} clips · {assetAnalysis.uniqueLinkCount} {assetAnalysis.uniqueLinkCount === 1 ? "video" : "videos"}</span></p>
        <p className="text-[11px] text-fg-4">Drag a card to reorder · click a title to go to its line</p>
      </div>
      <div className="flex items-center gap-1.5">
        {toRecord > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
            <VideoCameraIcon className="h-3 w-3" /> {toRecord} to record
          </span>
        )}
        {assets.length > 0 && (
          <Button variant="secondary" size="sm" onClick={() => void copy(assetAnalysis.uniqueAssets.map((a) => a.url).filter(Boolean).join("\n"), "links")} title="Copy every source video once">
            <DocumentDuplicateIcon className="h-4 w-4" /> Copy all links
          </Button>
        )}
      </div>
    </div>
  );

  const missingBanner = missingClips.length > 0 && (
    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
      <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
      <p className="min-w-0 flex-1 text-xs"><span className="font-semibold">{missingClips.length} clip{missingClips.length === 1 ? "" : "s"} from these ideas {missingClips.length === 1 ? "is" : "are"} not in the list</span><span className="block truncate opacity-80">{Array.from(new Set(missingClips.map((m) => m.idea.title))).join(" · ")}</span></p>
      <Button variant="accent" size="sm" onClick={addMissingClips} className="shrink-0 bg-amber-600 hover:bg-amber-700"><PlusIcon className="h-4 w-4" /> Add</Button>
    </div>
  );

  const otherClipsBlock = otherClips.length > 0 && (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center gap-2 bg-surface-sunken px-3 py-2">
        <FilmIcon className="h-4 w-4 text-fg-4" />
        <p className="min-w-0 flex-1 text-sm font-semibold text-fg">Other clips <span className="font-normal text-fg-4">· not tied to a line</span></p>
        <button type="button" onClick={() => void copy(otherClips.map(({ asset }) => asset.url).filter(Boolean).join("\n"), "links")} className={iconButton} aria-label="Copy these links" title="Copy these links"><DocumentDuplicateIcon className="h-4 w-4" /></button>
      </div>
      {clipRows(otherClips, NEUTRAL_COLOR)}
    </div>
  );

  const unplacedBlock = unplaced.length > 0 && (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300"><ExclamationTriangleIcon className="h-3.5 w-3.5" /> In the project but not in the script</p>
      <ul className="space-y-1.5">
        {unplaced.map((idea) => (
          <li key={idea.id} className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2 dark:border-amber-500/30 dark:bg-amber-500/10">
            <GameThumb src={idea.game_cover} className="h-8 w-6" />
            <span className="min-w-0 flex-1">
              <Link href={ideaHref(idea.id)} onClick={(e) => void openIdea(e, idea.id)} className="block truncate text-sm font-semibold text-fg hover:text-accent hover:underline" title="Open idea page">{idea.title}</Link>
              <span className="block truncate text-[11px] text-fg-3">{idea.game_title}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={() => addLineFor(idea)} title="Add its line to the end of the script">Add line</Button>
            <button type="button" onClick={() => void removeIdea(idea)} className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-fg-4 hover:bg-danger-soft hover:text-rose-600" aria-label={`Remove ${idea.title} from project`}>
              <TrashIcon className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  const addIdeaBlock = (
    <div ref={addIdeaRef} className="relative">
      {picking && <IdeaPicker excludeIds={inProject} suggested={suggested} onPick={addIdea} onClose={() => setPicking(false)} />}
      <Button variant="secondary" className="w-full" onClick={() => setPicking((v) => !v)} aria-expanded={picking}>
        <PlusIcon className="h-4 w-4" /> Add idea{suggested.length > 0 && <span className="ml-1 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold text-accent">{suggested.length} related</span>}
      </Button>
    </div>
  );

  /* ---------- aligned view: one row per script block ---------- */

  // Script blocks as they are in the text (separated by blank lines), lined up with the guide.
  const blocks = content.split(/\n{2,}/).filter((block) => block.trim());
  type Row = { key: string; text: string; section: ScriptGuideSection | null; index: number };
  const rows: Row[] = [];
  if (editingRow && editingRow.row <= blocks.length) {
    blocks.slice(0, editingRow.row).forEach((text, i) => rows.push({ key: `r${i}`, text: text.trim(), section: guide[i] ?? null, index: i }));
    rows.push({ key: `r${editingRow.row}`, text: editingRow.text, section: editingRow.skip > 0 ? guide[editingRow.row] ?? null : null, index: editingRow.row });
    blocks.slice(editingRow.row + editingRow.skip).forEach((text, j) => {
      const i = editingRow.row + editingRow.skip + j;
      rows.push({ key: `r${editingRow.row + 1 + j}`, text: text.trim(), section: guide[i] ?? null, index: editingRow.row + 1 + j });
    });
  } else {
    blocks.forEach((text, i) => rows.push({ key: `r${i}`, text: text.trim(), section: guide[i] ?? null, index: i }));
  }
  if (rows.length === 0) rows.push({ key: "r0", text: "", section: null, index: 0 });

  const countBlocks = (text: string) => text.split(/\n{2,}/).filter((block) => block.trim()).length;

  const editRow = (rowIndex: number, text: string) => {
    const current = String(latestRef.current.content || "").split(/\n{2,}/).filter((block) => block.trim());
    const skip = editingRow && editingRow.row === rowIndex ? editingRow.skip : 1;
    const next = [...current.slice(0, rowIndex), text, ...current.slice(rowIndex + skip)].join("\n\n");
    setEditingRow({ row: rowIndex, text, skip: countBlocks(text) });
    onContentChange(next);
  };

  const focusRow = (rowIndex: number) => {
    const el = rowRefs.current.get(rowIndex);
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const end = el.value.length;
    el.setSelectionRange(end, end);
  };

  const columns = "grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]";

  const alignedView = (
    <div className="mx-auto w-full space-y-5 lg:space-y-3">
      <div className={`grid gap-3 ${columns} lg:gap-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">{scriptToolbar}</div>
        <div>{ideasSummary}</div>
      </div>
      {rows.map((row) => {
        const section = row.section;
        const ideaId = section ? match.bySection.get(section.id) : undefined;
        const color = section && !section.isHook && ideaId != null ? ideaColor(section.number) : NEUTRAL_COLOR;
        const active = activeRow === row.index;
        return (
          <div key={row.key} className={`grid items-stretch gap-2 ${columns} lg:gap-4`}>
            <div
              onClick={() => rowRefs.current.get(row.index)?.focus()}
              className={`flex h-full cursor-text gap-3 rounded-2xl border border-l-4 bg-surface p-3 transition sm:p-4 ${section?.isHook ? "border-l-violet-500" : color.bar} ${active ? "border-y-blue-500 border-r-blue-500 ring-4 ring-blue-500/10" : "border-y-line border-r-line hover:border-y-line-strong hover:border-r-line-strong"}`}
            >
              <span className={`mt-1 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md px-1 text-xs font-bold tabular-nums ${section?.isHook ? "bg-violet-600 text-white" : section ? color.badge : NEUTRAL_COLOR.badge}`}>{section?.isHook ? "H" : section?.number ?? "·"}</span>
              <AutoTextarea
                value={row.text}
                inputRef={(el) => { if (el) rowRefs.current.set(row.index, el); else rowRefs.current.delete(row.index); }}
                onChange={(value) => editRow(row.index, value)}
                onFocus={() => { setActiveRow(row.index); setEditingRow({ row: row.index, text: row.text, skip: row.text.trim() ? 1 : 0 }); }}
                onBlur={() => { setEditingRow(null); setActiveRow((current) => (current === row.index ? null : current)); }}
                placeholder={rows.length === 1 ? "Opening hook, then one paragraph per idea…" : "Write this line…"}
                ariaLabel={section?.isHook ? "Opening hook" : `Script line ${section?.number ?? row.index + 1}`}
              />
            </div>
            <div className={`min-w-0 ${section?.isHook ? "hidden lg:block" : ""}`}>
              {section ? (section.isHook ? renderHookCard(section, () => focusRow(row.index), active) : renderSectionCard(section, () => focusRow(row.index), active)) : null}
            </div>
          </div>
        );
      })}
      <div className={`grid gap-3 ${columns} lg:gap-4`}>
        <p className="self-start text-xs text-fg-4 lg:pt-2">Leave a blank line inside a box to split it into a new line.</p>
        <div className="min-w-0 space-y-3">
          {missingBanner}
          {otherClipsBlock}
          {unplacedBlock}
          {addIdeaBlock}
        </div>
      </div>
    </div>
  );

  /* ---------- plain view: one text box + the list ---------- */

  const ideasPanel = (
    <div className="flex min-h-0 flex-col gap-3">
      {ideasSummary}
      {missingBanner}
      <ol className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-0.5">
        {guide.length === 0 && <li className="rounded-2xl border border-dashed border-line-strong p-5 text-center text-xs text-fg-4">The script is empty. Add an idea below.</li>}
        {guide.map((section) => (
          <li key={section.id}>
            {section.isHook ? renderHookCard(section, () => jumpTo(section.start, section.end)) : renderSectionCard(section, () => jumpTo(section.start, section.end))}
          </li>
        ))}
        {otherClipsBlock && <li>{otherClipsBlock}</li>}
        {unplacedBlock && <li className="pt-2">{unplacedBlock}</li>}
      </ol>
      {addIdeaBlock}
    </div>
  );

  const plainView = (
    <div className={`grid h-full min-h-0 gap-4 ${columns}`}>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">{scriptToolbar}</div>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Opening hook, then one line per idea…"
          aria-label="Script"
          className="min-h-[50dvh] w-full flex-1 resize-none rounded-2xl border border-line bg-surface p-4 text-base leading-7 text-fg outline-none transition placeholder:text-fg-4 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:p-6 sm:text-[17px] sm:leading-8 lg:min-h-0"
        />
      </div>
      <aside className="flex min-h-0 flex-col rounded-2xl border border-line bg-surface p-3">{ideasPanel}</aside>
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
        {tab === "script" && (viewMode === "aligned" ? alignedView : plainView)}
        {tab === "details" && detailsPanel}
      </div>
    </Modal>
  );
}

