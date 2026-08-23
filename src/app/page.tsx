"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ACTIVE_VIDEO_THEME_STORAGE_KEY, DEFAULT_VIDEO_THEMES, VIDEO_THEMES_STORAGE_KEY, VIDEO_TOPICS_TABLE, getVideoThemeById, makeVideoThemeId, normalizeVideoTheme, parseVideoThemes, rowToVideoTheme, videoThemeToRow } from "@/lib/videoThemes";
import type { VideoTheme } from "@/lib/videoThemes";
import { PlayCircleIcon } from "@heroicons/react/24/solid";
import { CheckIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, CubeTransparentIcon, ExclamationTriangleIcon, FaceSmileIcon, FilmIcon, MagnifyingGlassIcon, Bars3Icon, PencilSquareIcon, PlusIcon, SparklesIcon, Squares2X2Icon, TrashIcon, UserGroupIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { AppSidebar } from "@/components/AppSidebar";
import { AppPageHeader, appPageMainClass, appPageRootClass } from "@/components/AppPage";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GameEditorModal, IdeaItem, QuickViewModal, ScriptEditorModal } from "@/components/IdeaCards";
import { useNotifications } from "@/components/NotificationCenter";
import type { DetailRow, FootageItem, Game, Group, ScriptProject } from "@/types/gamekb";
import { fetchYoutubeMetadata, isYoutubeUrl } from "@/lib/youtube";

/* ================= CONFIG ================= */

const ITEMS_PER_PAGE = 24;
const TOPIC_DB_MIGRATION_STORAGE_KEY = "gamekb-video-themes-db-migrated";

function applyIdeaTextSearch(query: any, rawTerm: string, games: Game[]) {
  const term = rawTerm.trim().replace(/[(),]/g, " ").replace(/\s+/g, " ");
  if (!term) return query;

  const pattern = `%${term}%`;
  const matchingGameIds = games
    .filter((game) => game.title.toLowerCase().includes(term.toLowerCase()))
    .map((game) => game.id);
  const filters = [`title.ilike.${pattern}`, `description.ilike.${pattern}`];
  if (matchingGameIds.length > 0) filters.push(`game_id.in.(${matchingGameIds.join(",")})`);

  return query.or(filters.join(","));
}

/* ================= COMPONENTS ================= */

function ComboBox({
  placeholder,
  items,
  selectedId,
  onChange,
}: {
  placeholder: string;
  items: { id: number; name: string; coverUrl?: string | null }[];
  selectedId: number | "";
  onChange: (id: number | "") => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const selected = items.find((item) => item.id === selectedId);
  const filtered = items
    .filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 50);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={boxRef} className="relative h-10 w-full">
      <button
        type="button"
        className="flex h-10 w-full cursor-pointer items-center justify-between rounded-full border border-slate-200 bg-white px-2.5 text-left text-sm text-slate-900 shadow-sm transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
            {selected?.coverUrl ? (
              <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${selected.coverUrl})` }} />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs">🎮</span>
            )}
          </span>
          <span className={`truncate font-bold ${selected ? "" : "text-slate-400"}`}>
            {selected?.name || placeholder}
          </span>
        </span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[170] mt-2 w-full min-w-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-950 dark:ring-white/10">
          <label className="relative block">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
              placeholder="Search games..."
            />
          </label>
          <div className="mt-2 max-h-72 space-y-1 overflow-auto">
            <button
              type="button"
              className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-black transition ${
                selectedId === ""
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
              onClick={() => {
                onChange("");
                setOpen(false);
                setQuery("");
              }}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-sm dark:bg-slate-800">🎮</span>
                All Games
              </span>
              {selectedId === "" && <CheckIcon className="h-4 w-4" />}
            </button>
            {filtered.map((item) => {
              const active = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold transition ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                  }`}
                  onClick={() => {
                    onChange(item.id);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10">
                      {item.coverUrl ? (
                        <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${item.coverUrl})` }} />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs">🎮</span>
                      )}
                    </span>
                    <span className="truncate">{item.name}</span>
                  </span>
                  {active && <CheckIcon className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-5 text-center text-sm font-semibold text-slate-400">No games found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


const TYPE_FILTER_OPTIONS = [
  { value: "", label: "All Types", Icon: Squares2X2Icon },
  { value: "small_detail", label: "Detail", Icon: MagnifyingGlassIcon },
  { value: "easter_egg", label: "Easter Egg", Icon: SparklesIcon },
  { value: "npc_reaction", label: "NPC", Icon: UserGroupIcon },
  { value: "physics", label: "Physics", Icon: CubeTransparentIcon },
  { value: "troll", label: "Troll", Icon: FaceSmileIcon },
  { value: "punish", label: "Punish", Icon: ExclamationTriangleIcon },
];

function TypeFilterDropdown({ value, onChange }: { value: string | ""; onChange: (value: string | "") => void }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const selected = TYPE_FILTER_OPTIONS.find((option) => option.value === value) ?? TYPE_FILTER_OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={boxRef} className="relative z-[120] w-full sm:w-[220px]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex h-10 w-full cursor-pointer items-center justify-between rounded-full border px-3.5 text-sm font-bold shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] dark:hover:border-slate-600 dark:hover:bg-slate-800 ${
          value
            ? "border-slate-900 bg-slate-900 text-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Filter by type"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className={`flex h-6 min-w-6 items-center justify-center rounded-full ${value ? "bg-white/15 text-current dark:bg-white/10" : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-400"}`}><selected.Icon className="h-3.5 w-3.5" /></span>
          <span className="truncate">{selected.label}</span>
        </span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[999] mt-2 w-full rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-white/10">
          <div className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Type</div>
          <div className="space-y-1">
            {TYPE_FILTER_OPTIONS.map((option) => {
              const active = value === option.value;
              return (
                <button
                  key={option.value || "all"}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex h-10 w-full cursor-pointer items-center justify-between rounded-xl px-3 text-left text-sm font-bold transition ${
                    active ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  }`}
                  role="option"
                  aria-selected={active}
                >
                  <span className="flex items-center gap-2">
                    <span className={`flex h-6 min-w-6 items-center justify-center rounded-full ${active ? "bg-white/15 text-current dark:bg-white/10" : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-400"}`}><option.Icon className="h-3.5 w-3.5" /></span>
                    {option.label}
                  </span>
                  {active && <span className="text-xs">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


type TopicDraft = {
  id?: string;
  title: string;
  hook: string;
};

const EMPTY_TOPIC_DRAFT: TopicDraft = {
  title: "",
  hook: "",
};

const TOPIC_ICON_STYLES = [
  { emoji: "🎮", iconClass: "bg-blue-100 text-blue-600 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/20" },
  { emoji: "🃏", iconClass: "bg-fuchsia-100 text-fuchsia-600 ring-fuchsia-200 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 dark:ring-fuchsia-500/20" },
  { emoji: "🧠", iconClass: "bg-violet-100 text-violet-600 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/20" },
  { emoji: "⚡", iconClass: "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/20" },
  { emoji: "🪞", iconClass: "bg-cyan-100 text-cyan-700 ring-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:ring-cyan-500/20" },
  { emoji: "⏳", iconClass: "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/20" },
  { emoji: "🔎", iconClass: "bg-rose-100 text-rose-600 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/20" },
  { emoji: "✦", iconClass: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700" },
];

function getTopicVisual(theme: VideoTheme, index: number) {
  if (theme.id.includes("troll-other")) return TOPIC_ICON_STYLES[0];
  if (theme.id.includes("troll")) return TOPIC_ICON_STYLES[1];
  if (theme.id.includes("remember")) return TOPIC_ICON_STYLES[2];
  if (theme.id.includes("punish")) return TOPIC_ICON_STYLES[3];
  if (theme.id.includes("fourth")) return TOPIC_ICON_STYLES[4];
  if (theme.id.includes("afk")) return TOPIC_ICON_STYLES[5];
  if (theme.id.includes("detail") || theme.id.includes("unnoticed")) return TOPIC_ICON_STYLES[6];
  if (theme.id.includes("expect")) return TOPIC_ICON_STYLES[7];
  return TOPIC_ICON_STYLES[index % TOPIC_ICON_STYLES.length];
}

function VideoThemeBoard({
  value,
  themes,
  onChange,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
}: {
  value: string | "";
  themes: VideoTheme[];
  onChange: (value: string | "") => void;
  onCreate: (theme: VideoTheme) => void | Promise<void>;
  onUpdate: (theme: VideoTheme) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onReorder: (themes: VideoTheme[]) => void | Promise<void>;
}) {
  const selectedTheme = getVideoThemeById(themes, value);
  const { confirm } = useNotifications();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<TopicDraft>(EMPTY_TOPIC_DRAFT);
  const [draggedTopicId, setDraggedTopicId] = useState<string | null>(null);
  const [dragOverTopicId, setDragOverTopicId] = useState<string | null>(null);

  const openCreate = () => {
    setDraft(EMPTY_TOPIC_DRAFT);
    setIsEditing(true);
  };

  const openEdit = (theme: VideoTheme) => {
    setDraft({
      id: theme.id,
      title: theme.title,
      hook: theme.hook,
    });
    setIsEditing(true);
  };

  const closeEditor = () => {
    setDraft(EMPTY_TOPIC_DRAFT);
    setIsEditing(false);
  };

  const saveTopic = () => {
    if (!draft.title.trim()) return;

    const theme = normalizeVideoTheme({
      id: draft.id ?? makeVideoThemeId(draft.title),
      title: draft.title,
      hook: draft.hook,
    });

    if (draft.id) onUpdate(theme);
    else onCreate(theme);

    closeEditor();
  };

  const removeTopic = async (theme: VideoTheme) => {
    const shouldDelete = await confirm({
      kind: "warning",
      title: "Delete topic?",
      message: `Delete topic "${theme.title}"?`,
      confirmText: "Delete",
    });
    if (!shouldDelete) return;
    onDelete(theme.id);
  };

  const reorderTopics = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;

    const sourceIndex = themes.findIndex((theme) => theme.id === sourceId);
    const targetIndex = themes.findIndex((theme) => theme.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextThemes = [...themes];
    const [movedTheme] = nextThemes.splice(sourceIndex, 1);
    nextThemes.splice(targetIndex, 0, movedTheme);
    onReorder(nextThemes);
  };

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-[1.6rem] border border-blue-100/70 bg-gradient-to-r from-blue-50 via-fuchsia-50 to-amber-50 px-4 py-3.5 shadow-sm dark:border-slate-800 dark:from-blue-500/10 dark:via-fuchsia-500/10 dark:to-amber-500/10">
        <div className="min-w-0 pl-1 sm:pl-2">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-500 dark:text-blue-300">Today&apos;s Topic</p>
          <h2 className="mt-1 text-[1.45rem] font-black leading-tight tracking-tight text-slate-950 dark:text-slate-50">
            {selectedTheme ? selectedTheme.title : "What are we making today?"}
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm font-bold leading-5 text-slate-500 dark:text-slate-400">
            {selectedTheme
              ? selectedTheme.hook || "Pick ideas manually for this topic."
              : "Pick a topic first, then search, filter, randomize, and choose ideas manually."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {selectedTheme && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="h-9 cursor-pointer rounded-full border border-white/70 bg-white/80 px-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm transition hover:border-white hover:bg-white hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              Clear Topic
            </button>
          )}
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-fuchsia-600 px-3 text-xs font-black uppercase tracking-[0.16em] text-white shadow-sm transition hover:from-blue-500 hover:to-fuchsia-500 active:scale-[0.98] dark:from-blue-500 dark:to-fuchsia-500"
          >
            <PlusIcon className="h-4 w-4" /> Topic
          </button>
        </div>
      </div>

      {themes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-400 dark:border-slate-700 dark:text-slate-500">
          No topics yet. Add one to start planning.
        </div>
      ) : (
        <div className="grid items-stretch gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {themes.map((theme, index) => {
            const active = value === theme.id;
            const visual = getTopicVisual(theme, index);
            return (
              <div
                key={theme.id}
                role="button"
                tabIndex={0}
                draggable
                onClick={() => onChange(theme.id)}
                onDragStart={(event) => {
                  setDraggedTopicId(theme.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", theme.id);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDragOverTopicId(theme.id);
                }}
                onDragLeave={() => setDragOverTopicId((current) => (current === theme.id ? null : current))}
                onDrop={(event) => {
                  event.preventDefault();
                  const sourceId = event.dataTransfer.getData("text/plain") || draggedTopicId;
                  if (sourceId) reorderTopics(sourceId, theme.id);
                  setDraggedTopicId(null);
                  setDragOverTopicId(null);
                }}
                onDragEnd={() => {
                  setDraggedTopicId(null);
                  setDragOverTopicId(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onChange(theme.id);
                  }
                }}
                className={`group relative flex min-h-[92px] cursor-pointer flex-col rounded-[1.2rem] border px-3.5 py-3 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-300 active:scale-[0.99] dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:focus:ring-slate-700 ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white ring-2 ring-slate-900/10 dark:border-slate-600 dark:bg-slate-800 dark:ring-white/10"
                    : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                } ${
                  draggedTopicId === theme.id
                    ? "opacity-50"
                    : dragOverTopicId === theme.id
                      ? "scale-[1.01] border-blue-400 ring-2 ring-blue-200 dark:border-blue-400 dark:ring-blue-500/20"
                      : ""
                }`}
                title="Click to select. Drag to reorder."
                aria-pressed={active}
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className={`flex h-10 min-w-10 items-center justify-center rounded-2xl text-lg shadow-sm ring-1 ${visual.iconClass}`}>{visual.emoji}</span>
                    <h4 className="line-clamp-2 min-w-0 text-[15px] font-black leading-5 tracking-tight">{theme.title}</h4>
                  </div>
                  <span className="flex h-8 shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                    <span
                      className={`flex h-8 w-8 cursor-grab items-center justify-center rounded-full transition active:cursor-grabbing ${active ? "bg-white/10 text-white/80" : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"}`}
                      title="Drag to reorder"
                      aria-label="Drag to reorder"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Bars3Icon className="h-4 w-4" />
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEdit(theme);
                      }}
                      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition ${active ? "bg-white/10 text-white hover:bg-white/20" : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-100"}`}
                      title="Edit topic"
                      aria-label={`Edit ${theme.title}`}
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeTopic(theme);
                      }}
                      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition ${active ? "bg-white/10 text-white hover:bg-white/20" : "bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"}`}
                      title="Delete topic"
                      aria-label={`Delete ${theme.title}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </span>
                </div>
                <p className={`mt-2 line-clamp-1 text-[13px] font-semibold leading-5 ${active ? "text-white/70" : "text-slate-400 dark:text-slate-500"}`}>{theme.hook || "Add an opening hook for this topic."}</p>
              </div>
            );
          })}
        </div>
      )}

      {isEditing && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-950/75 px-3 py-5 backdrop-blur-sm sm:px-6 sm:py-8" onClick={closeEditor}>
          <div className="mx-auto flex min-h-full w-full max-w-3xl items-start justify-center sm:items-center">
            <div className="my-auto w-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-fuchsia-50 to-amber-50 px-5 py-4 dark:border-slate-800 dark:from-blue-500/10 dark:via-fuchsia-500/10 dark:to-amber-500/10 sm:px-6">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 dark:text-blue-300">Topic Editor</p>
                  <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-slate-50">{draft.id ? "Edit topic" : "Add new topic"}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Only the title and opening hook are needed.</p>
                </div>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/80 text-slate-400 shadow-sm transition hover:bg-white hover:text-slate-700 dark:bg-slate-900/80 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  aria-label="Close topic editor"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-5 px-5 py-5 sm:px-6">
                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Title</span>
                  <input
                    value={draft.title}
                    onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[15px] font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500/60 dark:focus:ring-blue-500/20"
                    placeholder="Games that remember you"
                    autoFocus
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Opening Hook</span>
                  <textarea
                    value={draft.hook}
                    onChange={(event) => setDraft((current) => ({ ...current, hook: event.target.value }))}
                    rows={6}
                    className="max-h-[45dvh] min-h-[10rem] w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] font-bold leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500/60 dark:focus:ring-blue-500/20"
                    placeholder="Did you know some games actually remember what you did?"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50 sm:px-6">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">This hook will appear at the start of the generated script.</p>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeEditor}
                    className="h-10 cursor-pointer rounded-full border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!draft.title.trim()}
                    onClick={saveTopic}
                    className="h-10 cursor-pointer rounded-full bg-blue-600 px-5 text-xs font-black uppercase tracking-[0.16em] text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save Topic
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}

type SortOrder = "newest" | "oldest" | "random";

function makeRandomSeed() {
  return Math.floor(Math.random() * 2_147_483_647) || 1;
}

function seededShuffle<T>(items: T[], seed: number) {
  const next = [...items];
  let state = seed >>> 0;
  const random = () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function SortToggle({ value, onChange }: { value: SortOrder; onChange: (value: SortOrder) => void }) {
  const options: { value: SortOrder; label: string; mark: string; title: string }[] = [
    { value: "newest", label: "Newest", mark: "↓", title: "Newest ideas first" },
    { value: "oldest", label: "Oldest", mark: "↑", title: "Oldest ideas first" },
    { value: "random", label: "Random", mark: "↻", title: "Shuffle the current results" },
  ];

  return (
    <div className="inline-flex h-10 items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-black uppercase tracking-[0.14em] transition active:scale-[0.98] ${
              active ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            }`}
            title={option.title}
          >
            <span className="text-sm leading-none">{option.mark}</span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ================= PAGE LOGIC (MAIN) ================= */

export default function Home() {
  const router = useRouter();
  const { success, error: notifyError, warning, confirm: confirmNotice } = useNotifications();
  const [longPickTarget, setLongPickTarget] = useState<{ id: number; title: string } | null>(null);
  const longProjectId = longPickTarget?.id ?? Number.NaN;
  const longProjectTitle = longPickTarget?.title || "Long video project";
  const isLongProjectPickMode = Boolean(longPickTarget);
  const [games, setGames] = useState<Game[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupCounts, setGroupCounts] = useState<Map<number, number>>(new Map());
  const [ideas, setIdeas] = useState<DetailRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedIdeas, setSelectedIdeas] = useState<DetailRow[]>([]);
  const [showSelectedReview, setShowSelectedReview] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [projectIdeas, setProjectIdeas] = useState<DetailRow[]>([]);
  
  const [previewIdea, setPreviewIdea] = useState<DetailRow | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [gameId, setGameId] = useState<number | "">("");
  const [groupId, setGroupId] = useState<number | "">("");
  const [type, setType] = useState<string | "">("");
  const [selectedThemeId, setSelectedThemeId] = useState<string | "">("");
  const [videoThemes, setVideoThemes] = useState<VideoTheme[]>(DEFAULT_VIDEO_THEMES);
  const [themesLoaded, setThemesLoaded] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [randomSeed, setRandomSeed] = useState(() => makeRandomSeed());
  const [loading, setLoading] = useState(true);

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  async function attachGroupsToIdeas(rows: DetailRow[]): Promise<DetailRow[]> {
    if (rows.length === 0) return rows;
    const ids = rows.map((idea) => idea.id);
    const { data, error } = await supabase
      .from("idea_group_items")
      .select("detail_id,group_id")
      .in("detail_id", ids);
    if (error) return rows;

    const groupById = new Map(groups.map((group) => [group.id, group]));
    const groupsByIdea = new Map<number, Group[]>();
    for (const item of data ?? []) {
      const detailId = Number((item as { detail_id: number }).detail_id);
      const groupId = Number((item as { group_id: number }).group_id);
      const group = groupById.get(groupId);
      if (!group) continue;
      groupsByIdea.set(detailId, [...(groupsByIdea.get(detailId) ?? []), group]);
    }

    return rows.map((idea) => ({
      ...idea,
      groups: (groupsByIdea.get(idea.id) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }

  async function backfillYoutubeChannels(rows: DetailRow[]) {
    const missing = new Map<number, FootageItem>();
    for (const idea of rows) {
      for (const footage of idea.footage ?? []) {
        if (footage.id && !footage.channel_name && isYoutubeUrl(footage.file_path)) {
          missing.set(footage.id, footage);
        }
      }
    }

    const entries = [...missing.entries()];
    for (let index = 0; index < entries.length; index += 4) {
      const batch = entries.slice(index, index + 4);
      const results = await Promise.all(
        batch.map(async ([footageId, footage]) => {
          const metadata = await fetchYoutubeMetadata(footage.file_path);
          if (!metadata.channelName) return null;
          await supabase
            .from("footage")
            .update({ channel_name: metadata.channelName, title: footage.title || metadata.title })
            .eq("id", footageId);
          return { footageId, channelName: metadata.channelName, title: footage.title || metadata.title };
        }),
      );

      const updates = results.filter(Boolean) as Array<{ footageId: number; channelName: string; title: string | null }>;
      if (updates.length === 0) continue;
      const updateById = new Map(updates.map((item) => [item.footageId, item]));
      setIdeas((current) => current.map((idea) => ({
        ...idea,
        footage: idea.footage?.map((footage) => {
          const update = footage.id ? updateById.get(footage.id) : undefined;
          return update ? { ...footage, channel_name: update.channelName, title: update.title } : footage;
        }),
      })));
    }
  }

  useEffect(() => {
    Promise.all([
      supabase.from("games").select("*").order("title"),
      supabase.from("idea_groups").select("*").order("name"),
      supabase.from("idea_group_items").select("group_id")
    ]).then(([gs, grps, items]) => {
      setGames((gs.data ?? []) as Game[]);
      setGroups((grps.data ?? []) as Group[]);
      const m = new Map<number, number>();
      for (const row of items.data ?? []) { const gid = Number((row as any).group_id); m.set(gid, (m.get(gid) ?? 0) + 1); }
      setGroupCounts(m);
    });
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadVideoThemes() {
      const rawLocalThemes = window.localStorage.getItem(VIDEO_THEMES_STORAGE_KEY);
      const localThemes = rawLocalThemes ? parseVideoThemes(rawLocalThemes) : [];

      const { data, error } = await supabase
        .from(VIDEO_TOPICS_TABLE)
        .select("id,title,hook,sort_order,created_at")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!alive) return;

      if (error) {
        const fallbackThemes = localThemes.length > 0 ? localThemes : DEFAULT_VIDEO_THEMES;
        setVideoThemes(fallbackThemes);

        const savedTheme = window.localStorage.getItem(ACTIVE_VIDEO_THEME_STORAGE_KEY);
        if (savedTheme && getVideoThemeById(fallbackThemes, savedTheme)) {
          setSelectedThemeId(savedTheme);
          setIsSelectMode(true);
        } else {
          window.localStorage.removeItem(ACTIVE_VIDEO_THEME_STORAGE_KEY);
        }

        warning("Run the video_topics database migration so topic titles and hooks stay saved after deploys.", "Topic database not ready");
        setThemesLoaded(true);
        return;
      }

      let loadedThemes = (data ?? []).map(rowToVideoTheme);
      const hasMigratedLocalTopics = window.localStorage.getItem(TOPIC_DB_MIGRATION_STORAGE_KEY);

      // One-time safety bridge: if you already edited topics in localStorage before this DB version,
      // copy them into Supabase once. After that, database is the source of truth.
      if (loadedThemes.length === 0 && rawLocalThemes && !hasMigratedLocalTopics && localThemes.length > 0) {
        const { error: migrateError } = await supabase
          .from(VIDEO_TOPICS_TABLE)
          .upsert(localThemes.map(videoThemeToRow), { onConflict: "id" });

        if (!alive) return;

        if (migrateError) {
          warning(migrateError.message, "Could not sync local topics");
          loadedThemes = localThemes;
        } else {
          loadedThemes = localThemes;
          window.localStorage.setItem(TOPIC_DB_MIGRATION_STORAGE_KEY, "1");
        }
      } else {
        window.localStorage.setItem(TOPIC_DB_MIGRATION_STORAGE_KEY, "1");
      }

      setVideoThemes(loadedThemes);

      const savedTheme = window.localStorage.getItem(ACTIVE_VIDEO_THEME_STORAGE_KEY);
      if (savedTheme && getVideoThemeById(loadedThemes, savedTheme)) {
        setSelectedThemeId(savedTheme);
        setIsSelectMode(true);
      } else {
        window.localStorage.removeItem(ACTIVE_VIDEO_THEME_STORAGE_KEY);
      }

      setThemesLoaded(true);
    }

    loadVideoThemes();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!themesLoaded) return;
    window.localStorage.setItem(VIDEO_THEMES_STORAGE_KEY, JSON.stringify(videoThemes));
  }, [themesLoaded, videoThemes]);

  useEffect(() => {
    if (selectedThemeId) window.localStorage.setItem(ACTIVE_VIDEO_THEME_STORAGE_KEY, selectedThemeId);
    else window.localStorage.removeItem(ACTIVE_VIDEO_THEME_STORAGE_KEY);
  }, [selectedThemeId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get("longProject"));
    if (Number.isFinite(id) && id > 0) {
      setLongPickTarget({ id, title: params.get("longProjectTitle")?.trim() || "Long video project" });
    } else {
      setLongPickTarget(null);
    }
  }, []);

  useEffect(() => {
    if (!isLongProjectPickMode) return;
    setSelectedThemeId("");
    setIsSelectMode(true);
    setSelectedIds([]);
    setSelectedIdeas([]);
  }, [isLongProjectPickMode, longProjectId, themesLoaded]);

  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q), 300); return () => clearTimeout(t); }, [q]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQ, gameId, groupId, type, sortOrder]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      try {
        let groupDetailIds: number[] | null = null;
        if (groupId) {
          const { data: items, error: groupError } = await supabase
            .from("idea_group_items")
            .select("detail_id")
            .eq("group_id", groupId);
          if (groupError) throw new Error(groupError.message);
          groupDetailIds = (items ?? [])
            .map((item: any) => Number(item.detail_id))
            .filter((id: number) => Number.isFinite(id));
          if (groupDetailIds.length === 0) {
            setIdeas([]);
            setTotalCount(0);
            return;
          }
        }

        const applyFilters = (query: any) => {
          let nextQuery = query;
          if (groupDetailIds) nextQuery = nextQuery.in("id", groupDetailIds);
          if (gameId) nextQuery = nextQuery.eq("game_id", gameId);
          if (type) nextQuery = nextQuery.eq("detail_type", type);
          return applyIdeaTextSearch(nextQuery, debouncedQ, games);
        };

        if (sortOrder === "random") {
          const allIds: number[] = [];
          const chunkSize = 1000;
          let offset = 0;
          let exactCount = 0;

          while (true) {
            let idQuery = supabase
              .from("details")
              .select("id", { count: "exact" })
              .eq("status", "idea");
            idQuery = applyFilters(idQuery);
            const { data: idRows, count, error: idError } = await idQuery
              .order("id", { ascending: true })
              .range(offset, offset + chunkSize - 1);
            if (idError) throw new Error(idError.message);

            if (offset === 0) exactCount = count ?? 0;
            const chunkIds = (idRows ?? [])
              .map((row: any) => Number(row.id))
              .filter((id: number) => Number.isFinite(id));
            allIds.push(...chunkIds);

            if (chunkIds.length < chunkSize || allIds.length >= exactCount) break;
            offset += chunkSize;
          }

          const shuffledIds = seededShuffle(allIds, randomSeed);
          const pageIds = shuffledIds.slice(from, to + 1);
          setTotalCount(exactCount || allIds.length);

          if (pageIds.length === 0) {
            setIdeas([]);
            return;
          }

          const { data, error } = await supabase
            .from("details")
            .select("*, footage(id, file_path, title, channel_name)")
            .in("id", pageIds);
          if (error) throw new Error(error.message);

          const rowById = new Map(((data ?? []) as DetailRow[]).map((row) => [row.id, row]));
          const orderedRows = pageIds
            .map((id) => rowById.get(id))
            .filter((row): row is DetailRow => Boolean(row));
          const enrichedIdeas = await attachGroupsToIdeas(orderedRows);
          setIdeas(enrichedIdeas);
          void backfillYoutubeChannels(enrichedIdeas);
          return;
        }

        let query = supabase
          .from("details")
          .select("*, footage(id, file_path, title, channel_name)", { count: "exact" })
          .eq("status", "idea");
        query = applyFilters(query);
        const { data, count, error } = await query
          .order("created_at", { ascending: sortOrder === "oldest" })
          .range(from, to);
        if (error) throw new Error(error.message);

        const enrichedIdeas = await attachGroupsToIdeas((data ?? []) as DetailRow[]);
        setIdeas(enrichedIdeas);
        setTotalCount(count ?? 0);
        void backfillYoutubeChannels(enrichedIdeas);
      } catch (err) {
        notifyError(err instanceof Error ? err.message : "Could not load ideas", "Could not load ideas");
        setIdeas([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [debouncedQ, gameId, groupId, type, sortOrder, randomSeed, currentPage, games, groups]);

  const toggleSelection = (idea: DetailRow) => {
    setSelectedIds(prev =>
      prev.includes(idea.id) ? prev.filter((id) => id !== idea.id) : [...prev, idea.id]
    );
    setSelectedIdeas(prev =>
      prev.some((item) => item.id === idea.id)
        ? prev.filter((item) => item.id !== idea.id)
        : [...prev, idea]
    );
  };


  const handleThemeChange = (themeId: string | "") => {
    setSelectedThemeId(themeId);
    setSelectedIds([]);
    setSelectedIdeas([]);
    setShowSelectedReview(false);
    setIsSelectMode(Boolean(themeId));
  };

  const handleCreateTheme = async (theme: VideoTheme) => {
    const nextThemes = [...videoThemes, theme];
    const { error } = await supabase
      .from(VIDEO_TOPICS_TABLE)
      .insert(videoThemeToRow(theme, nextThemes.length - 1));

    if (error) {
      notifyError(error.message, "Topic not saved");
      return;
    }

    setVideoThemes(nextThemes);
    handleThemeChange(theme.id);
  };

  const handleUpdateTheme = async (theme: VideoTheme) => {
    const { error } = await supabase
      .from(VIDEO_TOPICS_TABLE)
      .update({ title: theme.title, hook: theme.hook })
      .eq("id", theme.id);

    if (error) {
      notifyError(error.message, "Topic not updated");
      return;
    }

    setVideoThemes((current) => current.map((item) => (item.id === theme.id ? theme : item)));
  };

  const handleDeleteTheme = async (id: string) => {
    const { error } = await supabase
      .from(VIDEO_TOPICS_TABLE)
      .delete()
      .eq("id", id);

    if (error) {
      notifyError(error.message, "Topic not deleted");
      return;
    }

    setVideoThemes((current) => current.filter((theme) => theme.id !== id));
    if (selectedThemeId === id) handleThemeChange("");
  };

  const handleReorderThemes = async (nextThemes: VideoTheme[]) => {
    const previousThemes = videoThemes;
    setVideoThemes(nextThemes);

    const { error } = await supabase
      .from(VIDEO_TOPICS_TABLE)
      .upsert(nextThemes.map(videoThemeToRow), { onConflict: "id" });

    if (error) {
      setVideoThemes(previousThemes);
      notifyError(error.message, "Topic order not saved");
    }
  };


  const openScriptEditor = async (sourceIdeas?: DetailRow[]) => {
    let nextIdeas = sourceIdeas ?? selectedIdeas;

    // Safety net: if selection ids exist but some selected idea data is not in memory,
    // fetch the missing rows before opening the script editor.
    if (!sourceIdeas && selectedIds.length > nextIdeas.length) {
      const loadedById = new Map(nextIdeas.map((idea) => [idea.id, idea]));
      const missingIds = selectedIds.filter((id) => !loadedById.has(id));

      if (missingIds.length > 0) {
        const { data, error } = await supabase
          .from("details")
          .select("*, footage(id, file_path, title, channel_name)")
          .in("id", missingIds);

        if (error) {
          notifyError(error.message);
          return;
        }

        for (const idea of (data ?? []) as DetailRow[]) loadedById.set(idea.id, idea);
        nextIdeas = selectedIds.map((id) => loadedById.get(id)).filter(Boolean) as DetailRow[];
        setSelectedIdeas(nextIdeas);
      }
    }

    if (nextIdeas.length === 0) return;
    setProjectIdeas(nextIdeas);
    setShowEditor(true);
  };

  const addIdeasToLongProject = async (sourceIdeas?: DetailRow[]) => {
    if (!isLongProjectPickMode) return;
    const ids = sourceIdeas ? sourceIdeas.map((idea) => idea.id) : selectedIds;
    if (ids.length === 0) return;

    try {
      const response = await fetch(`/api/long-videos/${longProjectId}/ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detail_ids: ids }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not add ideas");

      const added = Number(payload.added ?? 0);
      const skipped = Number(payload.skipped ?? 0);
      success(
        added > 0
          ? `${added} idea${added === 1 ? "" : "s"} added${skipped ? ` · ${skipped} already in project` : ""}.`
          : "All selected ideas were already in this project.",
        "Recording list updated",
      );
      setSelectedIds([]);
      setSelectedIdeas([]);
      setShowSelectedReview(false);
      router.push(`/long-videos/${longProjectId}`);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Could not add ideas", "Long video project not updated");
    }
  };

  const handleSaveScript = async (data: Partial<ScriptProject>) => {
    const { error } = await supabase.from("scripts").insert(data);
    if (error) {
      notifyError(error.message);
      return;
    }

    success("Added to Video Project.", "Project saved");
    setIsSelectMode(Boolean(selectedThemeId));
    setSelectedIds([]);
    setSelectedIdeas([]);
    setShowSelectedReview(false);
    setProjectIdeas([]);
  };

  async function createGroup() {
    const name = newGroupName.trim();
    if (!name) return;
    const { data, error } = await supabase.from("idea_groups").insert({ name }).select("id,name").single();
    if (error || !data) {
      notifyError(error?.message || "Could not create collection", "Could not create collection");
      return;
    }
    setGroups((current) => [...current, data as Group].sort((a, b) => a.name.localeCompare(b.name)));
    setGroupCounts((current) => new Map(current).set(data.id, 0));
    setNewGroupName("");
    setShowCreateGroup(false);
    success("Collection created.", "Saved");
  }

  async function renameGroup(id: number, name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const { error } = await supabase.from("idea_groups").update({ name: trimmedName }).eq("id", id);
    if (error) {
      notifyError(error.message, "Could not rename collection");
      return;
    }
    const updateGroups = (list: Group[] | undefined) => list?.map((group) => group.id === id ? { ...group, name: trimmedName } : group).sort((a, b) => a.name.localeCompare(b.name));
    setGroups((current) => updateGroups(current) ?? []);
    setIdeas((current) => current.map((idea) => ({ ...idea, groups: updateGroups(idea.groups) })));
    setSelectedIdeas((current) => current.map((idea) => ({ ...idea, groups: updateGroups(idea.groups) })));
    success("Collection renamed.", "Saved");
  }

  async function deleteGroup(id: number) {
    const shouldDelete = await confirmNotice({
      kind: "warning",
      title: "Delete collection?",
      message: "Delete this collection? Ideas will stay in your database.",
      confirmText: "Delete",
    });
    if (!shouldDelete) return;
    const { error } = await supabase.from("idea_groups").delete().eq("id", id);
    if (error) {
      notifyError(error.message, "Could not delete collection");
      return;
    }
    setGroups((current) => current.filter((group) => group.id !== id));
    setGroupCounts((current) => {
      const next = new Map(current);
      next.delete(id);
      return next;
    });
    setIdeas((current) => current.map((idea) => ({ ...idea, groups: idea.groups?.filter((group) => group.id !== id) })));
    if (groupId === id) setGroupId("");
    success("Collection deleted.", "Deleted");
  }


  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const currentIdeas = ideas;
  const selectedTheme = getVideoThemeById(videoThemes, selectedThemeId);
  const goToPage = (p: number) => {
    setCurrentPage(p);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const btnPage = "inline-flex h-10 min-w-[40px] cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800";

  return (
    <div className={`${appPageRootClass} xl:flex`}>
      <ScriptEditorModal isOpen={showEditor} onClose={() => { setShowEditor(false); setProjectIdeas([]); }} onSave={handleSaveScript} initialData={{ ids: projectIdeas.map((idea) => idea.id), ideas: projectIdeas, games: games, theme: selectedTheme }} />
      <GameEditorModal game={editingGame} isOpen={!!editingGame} onClose={() => setEditingGame(null)} onUpdate={(updatedGame) => { setGames(prev => prev.map(g => g.id === updatedGame.id ? updatedGame : g)); }} />
      <QuickViewModal idea={previewIdea} isOpen={!!previewIdea} onClose={() => setPreviewIdea(null)} />

      {isSelectMode && showSelectedReview && createPortal(
        <div className="fixed inset-0 z-[190]">
          <button
            type="button"
            aria-label="Close selected ideas"
            onClick={() => setShowSelectedReview(false)}
            className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
          />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <p className="text-base font-black text-slate-900 dark:text-white">Selected ideas</p>
                <p className="mt-0.5 text-xs font-bold text-slate-400">{selectedIds.length} selected across all pages</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSelectedReview(false)}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {selectedIdeas.length === 0 ? (
              <div className="flex flex-1 items-center justify-center px-6 text-center">
                <div>
                  <Squares2X2Icon className="mx-auto h-9 w-9 text-slate-300 dark:text-slate-700" />
                  <p className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">No ideas selected yet</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">Pick ideas from any page and they will stay here.</p>
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                <div className="space-y-1.5">
                  {selectedIdeas.map((idea, index) => {
                    const game = games.find((item) => item.id === idea.game_id);
                    return (
                      <div key={idea.id} className="group flex items-center gap-3 rounded-xl border border-transparent px-2.5 py-2.5 transition hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-slate-900">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-black text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                          {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewIdea(idea);
                            setShowSelectedReview(false);
                          }}
                          className="min-w-0 flex-1 cursor-pointer text-left"
                        >
                          <p className="truncate text-sm font-bold text-slate-800 transition group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">{idea.title}</p>
                          {game && <p className="mt-0.5 truncate text-[11px] font-bold text-slate-400">{game.title}</p>}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSelection(idea)}
                          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                          aria-label={`Remove ${idea.title} from selection`}
                          title="Remove from selection"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 p-4 dark:border-slate-800">
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={selectedIds.length === 0}
                  onClick={() => {
                    setSelectedIds([]);
                    setSelectedIdeas([]);
                  }}
                  className="h-10 cursor-pointer rounded-xl border border-slate-200 px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:border-red-900 dark:hover:bg-red-950/30"
                >
                  Clear all
                </button>
                <button
                  type="button"
                  onClick={() => setShowSelectedReview(false)}
                  className="h-10 flex-1 cursor-pointer rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  Continue picking
                </button>
              </div>
            </div>
          </aside>
        </div>,
        document.body,
      )}

      {isSelectMode && (
        <div className="fixed inset-x-0 bottom-0 z-[80] border-t border-slate-200 bg-white/95 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-4">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black text-white ${isLongProjectPickMode ? "bg-violet-600" : "bg-slate-900 dark:bg-slate-800"}`}>{selectedIds.length}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black uppercase tracking-[0.16em] text-slate-700 dark:text-slate-200">{isLongProjectPickMode ? "Ideas for long video" : "Ideas selected"}</p>
                <p className="truncate text-xs font-bold text-slate-400 dark:text-slate-500">{isLongProjectPickMode ? longProjectTitle : selectedTheme ? `Topic: ${selectedTheme.title}` : "Select ideas for your script"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={selectedIds.length === 0}
                onClick={() => setShowSelectedReview(true)}
                className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <Squares2X2Icon className="h-4 w-4" />
                Review ({selectedIds.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedIds([]);
                  setSelectedIdeas([]);
                  setShowSelectedReview(false);
                  if (isLongProjectPickMode) router.push(`/long-videos/${longProjectId}`);
                  else handleThemeChange("");
                }}
                className="h-11 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                Cancel
              </button>
              {isLongProjectPickMode ? (
                <button disabled={selectedIds.length === 0} onClick={() => void addIdeasToLongProject()} className="flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white shadow-lg transition hover:bg-violet-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"><FilmIcon className="h-5 w-5" /> Add to project</button>
              ) : (
                <button disabled={selectedIds.length === 0} onClick={() => void openScriptEditor()} className="flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg transition hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"><PlayCircleIcon className="h-5 w-5" /> Create Script</button>
              )}
            </div>
          </div>
        </div>
      )}

      <AppSidebar
        activePage="ideas"
        groups={groups}
        groupCounts={groupCounts}
        selectedGroupId={groupId}
        showCollections
        showCreateGroup={showCreateGroup}
        newGroupName={newGroupName}
        onToggleCreateGroup={() => setShowCreateGroup(!showCreateGroup)}
        onNewGroupNameChange={setNewGroupName}
        onCreateGroup={createGroup}
        onDeleteGroup={deleteGroup}
        onRenameGroup={renameGroup}
        onSelectGroup={setGroupId}
        onSelectAllIdeas={() => { setGroupId(""); setQ(""); }}
        showThemeToggle={false}
      />

      <main className={`${appPageMainClass} pb-32`}>
        <div className="mx-auto max-w-[1900px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AppPageHeader
            title="All Ideas"
            description={isLongProjectPickMode ? `Browse and select ideas for ${longProjectTitle}.` : "Choose a topic, search your library, and build the next video from the ideas you already have."}
            icon={<Squares2X2Icon className="h-5 w-5" />}
          />
          <header className="relative z-40 mb-8 space-y-4">
              {isLongProjectPickMode ? (
                <section className="overflow-hidden rounded-[1.75rem] border border-violet-200 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 p-5 text-white shadow-sm dark:border-violet-900">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur"><FilmIcon className="h-6 w-6" /></span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/65">Picking for long video</p>
                        <h2 className="truncate text-xl font-black">{longProjectTitle}</h2>
                        <p className="mt-1 text-sm font-semibold text-white/70">Search, filter, preview and select ideas. They will become your recording checklist.</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => router.push(`/long-videos/${longProjectId}`)} className="h-10 cursor-pointer rounded-xl bg-white/15 px-4 text-xs font-black uppercase tracking-wider text-white backdrop-blur transition hover:bg-white/25">Back to project</button>
                  </div>
                </section>
              ) : (
                <VideoThemeBoard
                  value={selectedThemeId}
                  themes={videoThemes}
                  onChange={handleThemeChange}
                  onCreate={handleCreateTheme}
                  onUpdate={handleUpdateTheme}
                  onDelete={handleDeleteTheme}
                  onReorder={handleReorderThemes}
                />
              )}
              <div className="relative z-50 flex flex-col gap-3 overflow-visible rounded-[1.6rem] border border-slate-200 bg-white/80 p-2.5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="relative min-w-0 flex-1">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      className="h-10 w-full rounded-full border border-slate-200 bg-white px-11 text-sm font-bold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-600 dark:focus:ring-slate-800"
                      placeholder="Search titles, content, or games..."
                      value={q}
                      onChange={e=>setQ(e.target.value)}
                    />
                  </div>
                  <div className="w-full lg:w-[240px]">
                    <ComboBox placeholder="Game" items={games.map(g=>({id:g.id, name:g.title, coverUrl:g.cover_url}))} selectedId={gameId} onChange={setGameId} />
                  </div>
                  <TypeFilterDropdown value={type} onChange={setType} />
                  {(q||gameId||groupId||type) && (
                    <button
                      type="button"
                      onClick={()=>{setQ("");setGameId("");setGroupId("");setType("")}}
                      className="h-10 cursor-pointer rounded-full px-3 text-xs font-black uppercase tracking-[0.16em] text-rose-500 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
                  <SortToggle
                    value={sortOrder}
                    onChange={(nextSort) => {
                      if (nextSort === "random") {
                        setRandomSeed(makeRandomSeed());
                        setSortOrder("random");
                        setCurrentPage(1);
                        return;
                      }
                      setSortOrder(nextSort);
                    }}
                  />
                  <ThemeToggle variant="compact" />
                </div>
              </div>
          </header>

          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">{loading ? "Loading..." : `${totalCount} Ideas Found`}</h2>
              {selectedTheme && <p className="mt-1 text-sm font-bold text-slate-400 dark:text-slate-500">Topic: {selectedTheme.title}</p>}
            </div>
          </div>

          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {currentIdeas.map(r => (
               <IdeaItem key={r.id} r={r} game={games.find(g => g.id === r.game_id)} isSelectMode={isSelectMode} isSelected={selectedIds.includes(r.id)} onToggleSelect={toggleSelection} onTogglePin={async (id, current) => { setIdeas(prev => prev.map(i => i.id === id ? { ...i, pinned: !current } : i)); await supabase.from("details").update({ pinned: !current }).eq("id", id); }} onEditGame={setEditingGame} onQuickView={setPreviewIdea} />
            ))}
          </ul>

          {!loading && totalPages > 1 && (
            <nav className="mt-12 flex flex-wrap items-center justify-center gap-2 pb-10" aria-label="Pagination">
               <button
                 type="button"
                 disabled={currentPage === 1}
                 onClick={() => goToPage(1)}
                 className={btnPage}
                 title="First page"
                 aria-label="Go to first page"
               >
                 <ChevronDoubleLeftIcon className="h-4 w-4" />
               </button>
               <button
                 type="button"
                 disabled={currentPage === 1}
                 onClick={() => goToPage(currentPage - 1)}
                 className={btnPage}
                 title="Previous page"
                 aria-label="Go to previous page"
               >
                 <ChevronLeftIcon className="h-4 w-4" />
               </button>
               <span className="mx-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black uppercase tracking-widest text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                 Page {currentPage} / {totalPages}
               </span>
               <button
                 type="button"
                 disabled={currentPage === totalPages}
                 onClick={() => goToPage(currentPage + 1)}
                 className={btnPage}
                 title="Next page"
                 aria-label="Go to next page"
               >
                 <ChevronRightIcon className="h-4 w-4" />
               </button>
               <button
                 type="button"
                 disabled={currentPage === totalPages}
                 onClick={() => goToPage(totalPages)}
                 className={btnPage}
                 title="Last page"
                 aria-label="Go to last page"
               >
                 <ChevronDoubleRightIcon className="h-4 w-4" />
               </button>
            </nav>
          )}
        </div>
      </main>
    </div>
  );
}