"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { ACTIVE_VIDEO_THEME_STORAGE_KEY, DEFAULT_VIDEO_THEMES, VIDEO_THEMES_STORAGE_KEY, getVideoThemeById, makeVideoThemeId, normalizeVideoTheme, parseVideoThemes } from "@/lib/videoThemes";
import type { VideoTheme } from "@/lib/videoThemes";
import { PlayCircleIcon } from "@heroicons/react/24/solid";
import { ChevronDoubleLeftIcon, ChevronDoubleRightIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, CubeTransparentIcon, ExclamationTriangleIcon, FaceSmileIcon, MagnifyingGlassIcon, Bars3Icon, PencilSquareIcon, PlusIcon, SparklesIcon, Squares2X2Icon, TrashIcon, UserGroupIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GameEditorModal, IdeaItem, QuickViewModal, ScriptEditorModal } from "@/components/IdeaCards";
import { RandomIdeaModal } from "@/components/RandomIdeaModal";
import { useNotifications } from "@/components/NotificationCenter";
import type { DetailRow, Game, Group, ScriptProject } from "@/types/gamekb";

/* ================= CONFIG ================= */

const ITEMS_PER_PAGE = 24;
const RANDOM_PICK_COUNT = 3;

/* ================= COMPONENTS ================= */

function ComboBox({ placeholder, items, selectedId, onChange }: { placeholder: string; items: { id: number; name: string }[]; selectedId: number | ""; onChange: (id: number | "") => void }) {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(""); const boxRef = useRef<HTMLDivElement>(null);
  const filtered = items.filter(x => x.name.toLowerCase().includes(query.toLowerCase())).slice(0, 50);
  useEffect(() => { function f(e:any){if(boxRef.current && !boxRef.current.contains(e.target))setOpen(false)} document.addEventListener("mousedown", f); return ()=>document.removeEventListener("mousedown",f)},[]);
  return (
    <div ref={boxRef} className="relative w-full h-10">
      <button className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-left text-sm text-slate-900 cursor-pointer flex items-center justify-between shadow-sm" onClick={() => setOpen(!open)}>
        <span className="truncate">{items.find(x=>x.id===selectedId)?.name || <span className="text-slate-400">{placeholder}</span>}</span>
        <span className="text-slate-400 text-xs">▼</span>
      </button>
      {open && <div className="absolute left-0 top-full z-[70] mt-1 w-full min-w-[200px] rounded-xl border border-slate-200 bg-white shadow-xl p-2"><input className="w-full rounded-lg border px-2 py-1 text-sm mb-2 outline-none focus:border-blue-500 bg-slate-50" value={query} onChange={e=>setQuery(e.target.value)} autoFocus placeholder="Search..."/><div className="max-h-60 overflow-auto"><button className="w-full text-left p-2 hover:bg-slate-100 text-sm cursor-pointer rounded-lg font-bold text-slate-500" onClick={()=>{onChange("");setOpen(false)}}>All Games</button>{filtered.map(x=><button key={x.id} className="w-full text-left p-2 hover:bg-blue-50 text-sm cursor-pointer rounded-lg truncate" onClick={()=>{onChange(x.id);setOpen(false)}}>{x.name}</button>)}</div></div>}
    </div>
  );
}

const TYPE_FILTER_OPTIONS = [
  { value: "", label: "All Types", Icon: Squares2X2Icon },
  { value: "small_detail", label: "Detail", Icon: MagnifyingGlassIcon },
  { value: "easter_egg", label: "Easter", Icon: SparklesIcon },
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
  onCreate: (theme: VideoTheme) => void;
  onUpdate: (theme: VideoTheme) => void;
  onDelete: (id: string) => void;
  onReorder: (themes: VideoTheme[]) => void;
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

function SortToggle({ value, onChange }: { value: "newest" | "oldest"; onChange: (value: "newest" | "oldest") => void }) {
  const options: { value: "newest" | "oldest"; label: string; mark: string }[] = [
    { value: "newest", label: "Newest", mark: "↓" },
    { value: "oldest", label: "Oldest", mark: "↑" },
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
            title={option.value === "newest" ? "Newest ideas first" : "Oldest ideas first"}
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
  const { success, error: notifyError, warning, confirm: confirmNotice } = useNotifications();
  const [games, setGames] = useState<Game[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupCounts, setGroupCounts] = useState<Map<number, number>>(new Map());
  const [ideas, setIdeas] = useState<DetailRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedIdeas, setSelectedIdeas] = useState<DetailRow[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [projectIdeas, setProjectIdeas] = useState<DetailRow[]>([]);
  
  // STATE RANDOM
  const [randomIdeas, setRandomIdeas] = useState<DetailRow[]>([]);
  const [randomPickedIdeas, setRandomPickedIdeas] = useState<DetailRow[]>([]);
  const [randomLoading, setRandomLoading] = useState(false);
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
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [loading, setLoading] = useState(true);

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

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
    const storedThemes = parseVideoThemes(window.localStorage.getItem(VIDEO_THEMES_STORAGE_KEY));
    setVideoThemes(storedThemes);

    const savedTheme = window.localStorage.getItem(ACTIVE_VIDEO_THEME_STORAGE_KEY);
    if (savedTheme && getVideoThemeById(storedThemes, savedTheme)) {
      setSelectedThemeId(savedTheme);
      setIsSelectMode(true);
    } else {
      window.localStorage.removeItem(ACTIVE_VIDEO_THEME_STORAGE_KEY);
    }

    setThemesLoaded(true);
  }, []);

  useEffect(() => {
    if (!themesLoaded) return;
    window.localStorage.setItem(VIDEO_THEMES_STORAGE_KEY, JSON.stringify(videoThemes));
  }, [themesLoaded, videoThemes]);

  useEffect(() => {
    if (selectedThemeId) window.localStorage.setItem(ACTIVE_VIDEO_THEME_STORAGE_KEY, selectedThemeId);
    else window.localStorage.removeItem(ACTIVE_VIDEO_THEME_STORAGE_KEY);
  }, [selectedThemeId]);

  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q), 300); return () => clearTimeout(t); }, [q]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQ, gameId, groupId, type, sortOrder]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("details")
        .select("*, footage(file_path, title)", { count: "exact" })
        .eq("status", "idea");

      if (groupId) {
         const { data: items } = await supabase.from("idea_group_items").select("detail_id").eq("group_id", groupId);
         const ids = (items || []).map((x:any) => x.detail_id);
         if (ids.length === 0) {
           setIdeas([]);
           setTotalCount(0);
           setLoading(false);
           return;
         }
         query = query.in("id", ids);
      }
      if (gameId) query = query.eq("game_id", gameId);
      if (type) query = query.eq("detail_type", type); 
      if (debouncedQ.trim()) query = query.ilike("title", `%${debouncedQ.trim()}%`);
      const { data, count } = await query.order("created_at", { ascending: sortOrder === "oldest" }).range(from, to);
      setIdeas((data ?? []) as DetailRow[]);
      setTotalCount(count ?? 0);
      setLoading(false);
    }
    load();
  }, [debouncedQ, gameId, groupId, type, sortOrder, currentPage]);

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
    setIsSelectMode(Boolean(themeId));
  };

  const handleCreateTheme = (theme: VideoTheme) => {
    setVideoThemes((current) => [...current, theme]);
    handleThemeChange(theme.id);
  };

  const handleUpdateTheme = (theme: VideoTheme) => {
    setVideoThemes((current) => current.map((item) => (item.id === theme.id ? theme : item)));
  };

  const handleDeleteTheme = (id: string) => {
    setVideoThemes((current) => current.filter((theme) => theme.id !== id));
    if (selectedThemeId === id) handleThemeChange("");
  };

  const handleReorderThemes = (nextThemes: VideoTheme[]) => {
    setVideoThemes(nextThemes);
  };


  const toggleRandomSelection = (idea: DetailRow) => {
    setRandomPickedIdeas(prev =>
      prev.some(item => item.id === idea.id)
        ? prev.filter(item => item.id !== idea.id)
        : [...prev, idea]
    );
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
          .select("*, footage(file_path, title)")
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
    setRandomPickedIdeas([]);
    setProjectIdeas([]);
  };

  async function createGroup() {
    if (!newGroupName.trim()) return;
    await supabase.from("idea_groups").insert({ name: newGroupName.trim() });
    window.location.reload(); 
  }

  async function deleteGroup(id: number) {
    const shouldDelete = await confirmNotice({
      kind: "warning",
      title: "Delete collection?",
      message: "Delete this collection? Ideas will stay in your database.",
      confirmText: "Delete",
    });
    if (!shouldDelete) return;
    await supabase.from("idea_groups").delete().eq("id", id);
    window.location.reload();
  }

  async function getActiveGroupDetailIds() {
    if (!groupId) return null;

    const { data, error } = await supabase
      .from("idea_group_items")
      .select("detail_id")
      .eq("group_id", groupId);

    if (error) throw new Error(error.message);

    return (data ?? [])
      .map((item: any) => Number(item.detail_id))
      .filter((id: number) => Number.isFinite(id));
  }

  async function fetchFilteredIdeasRange(from: number, to: number, groupDetailIds: number[] | null) {
    let query = supabase
      .from("details")
      .select("*, footage(file_path, title)")
      .eq("status", "idea");

    if (groupDetailIds) {
      if (groupDetailIds.length === 0) return [];
      query = query.in("id", groupDetailIds);
    }

    if (gameId) query = query.eq("game_id", gameId);
    if (type) query = query.eq("detail_type", type);
    if (debouncedQ.trim()) query = query.ilike("title", `%${debouncedQ.trim()}%`);
    const { data, error } = await query.order("created_at", { ascending: sortOrder === "oldest" }).range(from, to);
    if (error) throw new Error(error.message);

    return (data ?? []) as DetailRow[];
  }

  // Random from the full filtered result set, not just the 24 visible rows on the current page.
  const handleRandom = async () => {
    if (randomLoading) return;
    setRandomLoading(true);

    try {
      const groupDetailIds = await getActiveGroupDetailIds();
      const poolCount = groupDetailIds?.length === 0 ? 0 : totalCount;

      if (poolCount === 0) {
        warning("No ideas available to randomize.", "Nothing to spin");
        return;
      }

      const count = Math.min(RANDOM_PICK_COUNT, poolCount);
      const offsets = new Set<number>();

      while (offsets.size < count) {
        offsets.add(Math.floor(Math.random() * poolCount));
      }

      const rows = (await Promise.all([...offsets].map((offset) => fetchFilteredIdeasRange(offset, offset, groupDetailIds)))).flat();
      const uniqueRows = Array.from(new Map(rows.map((row) => [row.id, row])).values());

      if (uniqueRows.length < count) {
        const fallbackRows = await fetchFilteredIdeasRange(0, Math.min(poolCount - 1, count * 6), groupDetailIds);
        for (const row of fallbackRows.sort(() => Math.random() - 0.5)) {
          if (!uniqueRows.some((idea) => idea.id === row.id)) uniqueRows.push(row);
          if (uniqueRows.length === count) break;
        }
      }

      const picks = uniqueRows.slice(0, count);
      setRandomIdeas(picks);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Could not randomize ideas.", "Random failed");
    } finally {
      setRandomLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const currentIdeas = ideas;
  const selectedTheme = getVideoThemeById(videoThemes, selectedThemeId);
  const goToPage = (p: number) => {
    setCurrentPage(p);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const btnPage = "inline-flex h-10 min-w-[40px] cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800";

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <ScriptEditorModal isOpen={showEditor} onClose={() => { setShowEditor(false); setProjectIdeas([]); }} onSave={handleSaveScript} initialData={{ ids: projectIdeas.map((idea) => idea.id), ideas: projectIdeas, games: games, theme: selectedTheme }} />
      <GameEditorModal game={editingGame} isOpen={!!editingGame} onClose={() => setEditingGame(null)} onUpdate={(updatedGame) => { setGames(prev => prev.map(g => g.id === updatedGame.id ? updatedGame : g)); }} />
      <QuickViewModal idea={previewIdea} isOpen={!!previewIdea} onClose={() => setPreviewIdea(null)} />

      <RandomIdeaModal
        items={randomIdeas}
        games={games}
        isOpen={randomIdeas.length > 0}
        loading={randomLoading}
        selectedIds={randomPickedIdeas.map((idea) => idea.id)}
        onClose={() => setRandomIdeas([])}
        onReshuffle={handleRandom}
        onQuickView={setPreviewIdea}
        onToggleSelect={toggleRandomSelection}
        onClearSelection={() => setRandomPickedIdeas([])}
        onSaveProject={() => {
          setRandomIdeas([]);
          void openScriptEditor(randomPickedIdeas);
        }}
      />

      {isSelectMode && (
         <div className="fixed bottom-0 inset-x-0 z-[80] border-t border-slate-200 bg-white/95 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
               <div className="flex min-w-0 items-center gap-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white dark:bg-slate-800">{selectedIds.length}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase tracking-[0.16em] text-slate-700 dark:text-slate-200">Ideas Selected</p>
                    {selectedTheme && <p className="truncate text-xs font-bold text-slate-400 dark:text-slate-500">Topic: {selectedTheme.title}</p>}
                  </div>
               </div>
               <div className="flex items-center gap-2">
                 <button
                   type="button"
                   onClick={() => handleThemeChange("")}
                   className="h-11 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                 >
                   Cancel
                 </button>
                 <button disabled={selectedIds.length === 0} onClick={() => void openScriptEditor()} className="flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg transition hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"><PlayCircleIcon className="h-5 w-5" /> Create Script</button>
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
        onSelectGroup={setGroupId}
        onSelectAllIdeas={() => { setGroupId(""); setQ(""); }}
        showThemeToggle={false}
      />

      <main className="flex-1 pl-0 md:pl-72 pb-32 min-w-0">
        <div className="mx-auto max-w-[1900px] px-6 py-8">
          <header className="relative z-40 mb-8 space-y-4">
              <VideoThemeBoard
                value={selectedThemeId}
                themes={videoThemes}
                onChange={handleThemeChange}
                onCreate={handleCreateTheme}
                onUpdate={handleUpdateTheme}
                onDelete={handleDeleteTheme}
                onReorder={handleReorderThemes}
              />
              <div className="relative z-50 flex flex-col gap-3 overflow-visible rounded-[1.6rem] border border-slate-200 bg-white/80 p-2.5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="relative min-w-0 flex-1">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      className="h-10 w-full rounded-full border border-slate-200 bg-white px-11 text-sm font-bold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-600 dark:focus:ring-slate-800"
                      placeholder="Search ideas..."
                      value={q}
                      onChange={e=>setQ(e.target.value)}
                    />
                  </div>
                  <div className="w-full lg:w-[240px]">
                    <ComboBox placeholder="Game" items={games.map(g=>({id:g.id, name:g.title}))} selectedId={gameId} onChange={setGameId} />
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
                  <SortToggle value={sortOrder} onChange={setSortOrder} />
                  <button
                    type="button"
                    onClick={handleRandom}
                    disabled={loading || randomLoading}
                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-[0.14em] text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                    title="Random from the current filters"
                  >
                    <SparklesIcon className={`h-4 w-4 text-purple-500 ${randomLoading ? "animate-spin" : ""}`} />
                    <span>{randomLoading ? "Spinning" : "Random"}</span>
                  </button>
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