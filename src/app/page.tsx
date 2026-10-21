"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ACTIVE_VIDEO_THEME_STORAGE_KEY, DEFAULT_VIDEO_THEMES, VIDEO_THEMES_STORAGE_KEY, VIDEO_TOPICS_TABLE, getVideoThemeById, makeVideoThemeId, normalizeVideoTheme, parseVideoThemes, rowToVideoTheme, videoThemeToRow } from "@/lib/videoThemes";
import type { VideoTheme } from "@/lib/videoThemes";
import { PlayCircleIcon, StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { ArrowDownIcon, ArrowPathIcon, ArrowUpIcon, CalendarDaysIcon, CheckIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, FilmIcon, MagnifyingGlassIcon, PencilSquareIcon, PlusIcon, PuzzlePieceIcon, Squares2X2Icon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { AppSidebar } from "@/components/AppSidebar";
import { AppPageHeader, appPageMainClass, appPageRootClass } from "@/components/AppPage";
import { GameEditorModal, IdeaItem, QuickViewModal, ScriptEditorModal } from "@/components/IdeaCards";
import { useNotifications } from "@/components/NotificationCenter";
import { Button } from "@/components/ui/Button";
import { Dropdown, menuItemClass, menuPanelClass, pillTriggerClass, type DropdownOption } from "@/components/ui/Dropdown";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { useDismiss } from "@/components/ui/useDismiss";
import { TYPE_CONFIG } from "@/lib/detailTypes";
import { getTopicVisual } from "@/lib/topicVisuals";
import type { DetailRow, FootageItem, Game, Group, ScriptProject } from "@/types/gamekb";
import { fetchYoutubeMetadata, isYoutubeUrl } from "@/lib/youtube";

/* ================= CONFIG ================= */

const ITEMS_PER_PAGE = 24;
const PINNED_COLLAPSED_STORAGE_KEY = "gamekb-pinned-collapsed";
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

function GameThumb({ src, size = "sm" }: { src?: string | null; size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-7 w-7 rounded-full" : "h-9 w-9 rounded-lg";
  return (
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-surface-sunken text-fg-4 ring-1 ring-black/5 dark:ring-white/10 ${box}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <PuzzlePieceIcon className="h-4 w-4" aria-hidden="true" />
      )}
    </span>
  );
}

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
  const close = useCallback(() => setOpen(false), []);
  useDismiss(boxRef, open, close);
  const selected = items.find((item) => item.id === selectedId);
  const filtered = items
    .filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 50);

  const choose = (id: number | "") => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={boxRef} className={`relative w-full ${open ? "z-[130]" : ""}`}>
      <button
        type="button"
        className={`${pillTriggerClass(Boolean(selected))} pl-1.5`}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter by game"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <GameThumb src={selected?.coverUrl} />
          <span className={`truncate ${selected ? "" : "text-fg-4"}`}>{selected?.name || placeholder}</span>
        </span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className={`${menuPanelClass} min-w-[260px] p-2`}>
          <label className="relative block">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-4" />
            <input
              className="h-10 w-full rounded-xl border border-line bg-surface-muted pl-9 pr-3 text-sm font-medium text-fg outline-none placeholder:text-fg-4 focus:border-blue-400"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && filtered[0]) choose(filtered[0].id);
              }}
              autoFocus
              placeholder="Search games..."
              aria-label="Search games"
            />
          </label>
          <div className="mt-2 max-h-72 space-y-0.5 overflow-auto" role="listbox" aria-label="Games">
            <button type="button" role="option" aria-selected={selectedId === ""} className={menuItemClass(selectedId === "")} onClick={() => choose("")}>
              <span className="flex items-center gap-3">
                <GameThumb size="md" />
                All games
              </span>
              {selectedId === "" && <CheckIcon className="h-4 w-4" />}
            </button>
            {filtered.map((item) => {
              const active = item.id === selectedId;
              return (
                <button key={item.id} type="button" role="option" aria-selected={active} className={`${menuItemClass(active)} h-auto py-1.5`} onClick={() => choose(item.id)}>
                  <span className="flex min-w-0 items-center gap-3">
                    <GameThumb src={item.coverUrl} size="md" />
                    <span className="truncate">{item.name}</span>
                  </span>
                  {active && <CheckIcon className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-5 text-center text-sm font-medium text-fg-4">No games found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const TYPE_FILTER_OPTIONS: DropdownOption<string>[] = [
  { value: "", label: "All types", Icon: Squares2X2Icon },
  ...["small_detail", "easter_egg", "npc_reaction", "physics", "troll", "punish"].map((key) => ({
    value: key,
    label: TYPE_CONFIG[key].shortLabel,
    Icon: TYPE_CONFIG[key].Icon,
  })),
];

function TypeFilterDropdown({ value, onChange }: { value: string | ""; onChange: (value: string | "") => void }) {
  return <Dropdown value={value} options={TYPE_FILTER_OPTIONS} onChange={onChange} heading="Type" ariaLabel="Filter by type" />;
}

function YearFilterDropdown({ value, years, onChange }: { value: number | "" | "unknown"; years: number[]; onChange: (value: number | "" | "unknown") => void }) {
  const options: DropdownOption<number | "" | "unknown">[] = [
    { value: "", label: "All years", Icon: CalendarDaysIcon },
    ...years.map((year) => ({ value: year, label: String(year) })),
    { value: "unknown", label: "Unknown year" },
  ];
  return <Dropdown value={value} options={options} onChange={onChange} heading="Release year" ariaLabel="Filter by release year" />;
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

  const saveTopic = (event?: FormEvent) => {
    event?.preventDefault();
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

  const selectedVisual = selectedTheme ? getTopicVisual(selectedTheme.id, themes.indexOf(selectedTheme)) : null;

  return (
    <section className="rounded-3xl border border-line bg-surface p-3 shadow-sm sm:p-4" aria-label="Video topic">
      <div className="flex items-center gap-3">
        <p className="hidden shrink-0 pl-1 text-[11px] font-semibold uppercase tracking-wider text-fg-4 sm:block">Topic</p>

        {themes.length === 0 ? (
          <p className="min-w-0 flex-1 text-sm font-medium text-fg-4">No topics yet. Add one to start planning.</p>
        ) : (
          <div className="topic-strip -my-1 flex min-w-0 flex-1 gap-2 overflow-x-auto py-1">
            {themes.map((theme, index) => {
              const active = value === theme.id;
              const visual = getTopicVisual(theme.id, index);
              return (
                <button
                  key={theme.id}
                  type="button"
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
                  className={`flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-sm font-semibold transition active:scale-[0.98] ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950"
                      : "border-line bg-surface text-fg-2 hover:border-line-strong hover:bg-surface-hover"
                  } ${
                    draggedTopicId === theme.id
                      ? "opacity-50"
                      : dragOverTopicId === theme.id
                        ? "border-blue-400 ring-2 ring-blue-200 dark:ring-blue-500/30"
                        : ""
                  }`}
                  title={`${theme.hook || theme.title}\nDrag to reorder.`}
                  aria-pressed={active}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${visual.softClass}`}>
                    <visual.Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="max-w-[14rem] truncate">{theme.title}</span>
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={openCreate}
          className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3 text-sm font-medium text-fg-3 transition hover:border-blue-400 hover:bg-accent-soft hover:text-accent"
          aria-label="Add topic"
          title="Add topic"
        >
          <PlusIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Topic</span>
        </button>
      </div>

      {selectedTheme && selectedVisual && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-surface-muted px-3 py-2.5 animate-in fade-in duration-150">
          <selectedVisual.Icon className="h-4 w-4 shrink-0 text-fg-4" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm text-fg-2">
            <span className="font-semibold text-fg">Hook: </span>
            {selectedTheme.hook || <span className="text-fg-4">No opening hook yet. Add one so the script starts strong.</span>}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => openEdit(selectedTheme)} aria-label={`Edit ${selectedTheme.title}`}>
              <PencilSquareIcon className="h-4 w-4" /> Edit
            </Button>
            <Button variant="danger" size="icon-sm" onClick={() => void removeTopic(selectedTheme)} aria-label={`Delete ${selectedTheme.title}`} title="Delete topic">
              <TrashIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => onChange("")} aria-label="Clear topic" title="Clear topic">
              <XMarkIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Modal open={isEditing} onClose={closeEditor} size="lg" zClass="z-[99999]" onSubmit={saveTopic} labelledBy="topic-editor-title">
        <ModalHeader id="topic-editor-title" eyebrow="Topic editor" title={draft.id ? "Edit topic" : "Add new topic"} onClose={closeEditor}>
          <p className="mt-1 text-sm text-fg-3">Only the title and opening hook are needed.</p>
        </ModalHeader>
        <ModalBody className="space-y-5">
          <Field label="Title">
            <Input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              className="h-12 text-[15px]"
              placeholder="Games that remember you"
              autoFocus
            />
          </Field>
          <Field label="Opening hook">
            <Textarea
              value={draft.hook}
              onChange={(event) => setDraft((current) => ({ ...current, hook: event.target.value }))}
              rows={6}
              className="max-h-[45dvh] min-h-[10rem] resize-y text-[15px] leading-7"
              placeholder="Did you know some games actually remember what you did?"
            />
          </Field>
        </ModalBody>
        <ModalFooter className="items-center justify-between">
          <p className="mr-auto text-xs text-fg-4">This hook appears at the start of the generated script.</p>
          <Button variant="ghost" size="sm" onClick={closeEditor}>Cancel</Button>
          <Button type="submit" variant="accent" size="sm" disabled={!draft.title.trim()}>Save topic</Button>
        </ModalFooter>
      </Modal>
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
  const options: { value: SortOrder; label: string; Icon: typeof ArrowDownIcon; title: string }[] = [
    { value: "newest", label: "Newest", Icon: ArrowDownIcon, title: "Newest ideas first" },
    { value: "oldest", label: "Oldest", Icon: ArrowUpIcon, title: "Oldest ideas first" },
    { value: "random", label: "Random", Icon: ArrowPathIcon, title: "Shuffle the current results" },
  ];

  return (
    <div className="inline-flex h-10 items-center rounded-full border border-line bg-surface p-1 shadow-sm" role="group" aria-label="Sort ideas">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition active:scale-[0.98] ${
              active ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950" : "text-fg-3 hover:bg-surface-sunken hover:text-fg"
            }`}
            title={option.title}
            aria-pressed={active}
          >
            <option.Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function IdeaGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="idea-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="relative h-64 overflow-hidden rounded-2xl border border-line bg-surface-sunken">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-t from-surface-strong/80 to-transparent" />
          <div className="absolute inset-x-5 bottom-5 space-y-2">
            <div className="h-2.5 w-1/3 animate-pulse rounded-full bg-surface-strong" />
            <div className="h-4 w-4/5 animate-pulse rounded-full bg-surface-strong" />
            <div className="h-4 w-3/5 animate-pulse rounded-full bg-surface-strong" />
            <div className="h-5 w-20 animate-pulse rounded-md bg-surface-strong" />
          </div>
        </li>
      ))}
    </ul>
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
  const [loadedGroupId, setLoadedGroupId] = useState<number | "" | null>(null);
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
  const [releaseYear, setReleaseYear] = useState<number | "" | "unknown">("");
  const [selectedThemeId, setSelectedThemeId] = useState<string | "">("");
  const [videoThemes, setVideoThemes] = useState<VideoTheme[]>(DEFAULT_VIDEO_THEMES);
  const [themesLoaded, setThemesLoaded] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [randomSeed, setRandomSeed] = useState(() => makeRandomSeed());
  const [loading, setLoading] = useState(true);

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [ideasRevision, setIdeasRevision] = useState(0);
  const [pinnedIdeas, setPinnedIdeas] = useState<DetailRow[]>([]);
  const [pinnedLoaded, setPinnedLoaded] = useState(false);
  const [pinnedCollapsed, setPinnedCollapsed] = useState(false);
  const pinnedRowRef = useRef<HTMLUListElement>(null);
  const [removingGroupItems, setRemovingGroupItems] = useState<Set<string>>(new Set());
  const pendingGroupRemovals = useRef(new Set<string>());

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
  }, [debouncedQ, gameId, groupId, type, releaseYear, sortOrder]);

  useEffect(() => {
    let cancelled = false;
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
          if (cancelled) return;
          if (groupError) throw new Error(groupError.message);
          groupDetailIds = (items ?? [])
            .map((item: any) => Number(item.detail_id))
            .filter((id: number) => Number.isFinite(id));
          if (groupDetailIds.length === 0) {
            setIdeas([]);
            setTotalCount(0);
            setCurrentPage(1);
            return;
          }
        }

        const applyFilters = (query: any) => {
          let nextQuery = query;
          if (groupDetailIds) nextQuery = nextQuery.in("id", groupDetailIds);
          if (gameId) nextQuery = nextQuery.eq("game_id", gameId);
          if (releaseYear !== "") {
            const yearGameIds = games
              .filter((game) => releaseYear === "unknown" ? game.release_year == null : game.release_year === releaseYear)
              .map((game) => game.id);
            nextQuery = nextQuery.in("game_id", yearGameIds.length > 0 ? yearGameIds : [-1]);
          }
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
            if (cancelled) return;
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
          const lastPage = Math.max(1, Math.ceil((exactCount || allIds.length) / ITEMS_PER_PAGE));
          if (currentPage > lastPage) {
            setCurrentPage(lastPage);
            return;
          }

          if (pageIds.length === 0) {
            setIdeas([]);
            return;
          }

          const { data, error } = await supabase
            .from("details")
            .select("*, footage(id, file_path, title, channel_name)")
            .in("id", pageIds);
          if (cancelled) return;
          if (error) throw new Error(error.message);

          const rowById = new Map(((data ?? []) as DetailRow[]).map((row) => [row.id, row]));
          const orderedRows = pageIds
            .map((id) => rowById.get(id))
            .filter((row): row is DetailRow => Boolean(row));
          const enrichedIdeas = await attachGroupsToIdeas(orderedRows);
          if (cancelled) return;
          setLoadedGroupId(groupId);
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
        if (cancelled) return;
        // PostgREST can return 416 when removal makes the last page disappear.
        // Recount without a range so the user lands on the new last page.
        if (error?.code === "PGRST103" && currentPage > 1) {
          const countQuery = supabase.from("details").select("id", { count: "exact", head: true }).eq("status", "idea");
          const { count: remainingCount, error: countError } = await applyFilters(countQuery);
          if (cancelled) return;
          if (countError) throw new Error(countError.message);
          const lastPage = Math.max(1, Math.ceil((remainingCount ?? 0) / ITEMS_PER_PAGE));
          if (lastPage < currentPage) {
            setTotalCount(remainingCount ?? 0);
            setCurrentPage(lastPage);
            return;
          }
        }
        if (error) throw new Error(error.message);

        const lastPage = Math.max(1, Math.ceil((count ?? 0) / ITEMS_PER_PAGE));
        if (currentPage > lastPage) {
          setTotalCount(count ?? 0);
          setCurrentPage(lastPage);
          return;
        }

        const enrichedIdeas = await attachGroupsToIdeas((data ?? []) as DetailRow[]);
        if (cancelled) return;
        setLoadedGroupId(groupId);
        setIdeas(enrichedIdeas);
        setTotalCount(count ?? 0);
        void backfillYoutubeChannels(enrichedIdeas);
      } catch (err) {
        if (cancelled) return;
        notifyError(err instanceof Error ? err.message : "Could not load ideas", "Could not load ideas");
        setIdeas([]);
        setTotalCount(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [debouncedQ, gameId, groupId, type, releaseYear, sortOrder, randomSeed, currentPage, games, groups, ideasRevision]);

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

  async function removeIdeaFromGroup(idea: DetailRow) {
    if (!groupId || loadedGroupId !== groupId) return;
    const targetGroupId = groupId;
    const targetGroupName = groups.find((group) => group.id === targetGroupId)?.name || "this collection";
    const key = `${targetGroupId}:${idea.id}`;
    if (pendingGroupRemovals.current.has(key)) return;
    pendingGroupRemovals.current.add(key);
    setRemovingGroupItems((current) => new Set(current).add(key));

    try {
      const response = await fetch(`/api/groups/${targetGroupId}/ideas/${idea.id}`, { method: "DELETE", redirect: "error" });
      const result = await response.json();
      if (!response.ok || !result.success) {
        if (response.status === 404) setIdeasRevision((current) => current + 1);
        throw new Error(result.error || "Could not remove idea from collection");
      }

      setGroupCounts((current) => new Map(current).set(targetGroupId, Math.max(0, (current.get(targetGroupId) ?? 0) - 1)));
      const updateMemberships = (item: DetailRow) => item.id === idea.id
        ? { ...item, groups: item.groups?.filter((group) => group.id !== targetGroupId) }
        : item;
      // Keep selected ideas in the project tray; only their collection badge changes.
      setSelectedIdeas((current) => current.map(updateMemberships));
      setProjectIdeas((current) => current.map(updateMemberships));
      setIdeasRevision((current) => current + 1);
      success(`Removed from ${targetGroupName}. The idea stays in All Ideas.`, "Removed from collection");
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Could not remove idea from collection", "Could not remove idea");
    } finally {
      pendingGroupRemovals.current.delete(key);
      setRemovingGroupItems((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
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
  useEffect(() => {
    try {
      setPinnedCollapsed(window.localStorage.getItem(PINNED_COLLAPSED_STORAGE_KEY) === "1");
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadPinned() {
      const { data, error } = await supabase
        .from("details")
        .select("*, footage(id, file_path, title, channel_name)")
        .eq("status", "idea")
        .eq("pinned", true)
        .order("pinned_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(60);
      if (cancelled) return;
      if (error) {
        setPinnedLoaded(true);
        return;
      }
      const enriched = await attachGroupsToIdeas((data ?? []) as DetailRow[]);
      if (cancelled) return;
      setPinnedIdeas(enriched);
      setPinnedLoaded(true);
    }
    void loadPinned();
    return () => { cancelled = true; };
    // attachGroupsToIdeas reads the latest groups; reload when they or the library change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, ideasRevision]);

  const togglePinnedCollapsed = () => {
    setPinnedCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(PINNED_COLLAPSED_STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  const scrollPinned = (direction: 1 | -1) => {
    const row = pinnedRowRef.current;
    if (!row) return;
    row.scrollBy({ left: direction * Math.max(row.clientWidth * 0.8, 280), behavior: "smooth" });
  };

  /** Pin or unpin from any card; keeps the Pinned row and the library in sync. */
  const togglePin = async (id: number, current: boolean) => {
    const nextPinned = !current;
    const source = ideas.find((idea) => idea.id === id) ?? pinnedIdeas.find((idea) => idea.id === id);
    const previousPinned = pinnedIdeas;
    setIdeas((prev) => prev.map((idea) => (idea.id === id ? { ...idea, pinned: nextPinned } : idea)));
    setPinnedIdeas((prev) => nextPinned
      ? (source && !prev.some((idea) => idea.id === id) ? [{ ...source, pinned: true }, ...prev] : prev)
      : prev.filter((idea) => idea.id !== id));
    const { error } = await supabase
      .from("details")
      .update({ pinned: nextPinned, pinned_at: nextPinned ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) {
      setIdeas((prev) => prev.map((idea) => (idea.id === id ? { ...idea, pinned: current } : idea)));
      setPinnedIdeas(previousPinned);
      notifyError(error.message, "Could not update pin");
    }
  };

  const activeGroup = groups.find((group) => group.id === groupId);
  const filtersActive = Boolean(debouncedQ.trim() || gameId || type || releaseYear !== "");
  const showPinnedRow = !groupId && !filtersActive && pinnedLoaded && pinnedIdeas.length > 0;
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
                <p className="text-base font-bold text-slate-900 dark:text-white">Selected ideas</p>
                <p className="mt-0.5 text-xs font-medium text-fg-4">{selectedIds.length} selected across all pages</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSelectedReview(false)}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 text-fg-3 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {selectedIdeas.length === 0 ? (
              <div className="flex flex-1 items-center justify-center px-6 text-center">
                <div>
                  <Squares2X2Icon className="mx-auto h-9 w-9 text-slate-300 dark:text-slate-700" />
                  <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">No ideas selected yet</p>
                  <p className="mt-1 text-xs font-medium text-fg-4">Pick ideas from any page and they will stay here.</p>
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                <div className="space-y-1.5">
                  {selectedIdeas.map((idea, index) => {
                    const game = games.find((item) => item.id === idea.game_id);
                    return (
                      <div key={idea.id} className="group flex items-center gap-3 rounded-xl border border-transparent px-2.5 py-2.5 transition hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-slate-900">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">
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
                          {game && <p className="mt-0.5 truncate text-[11px] font-medium text-fg-4">{game.title}</p>}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSelection(idea)}
                          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-fg-4 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
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
                  className="h-10 cursor-pointer rounded-xl border border-slate-200 px-4 text-xs font-semibold uppercase tracking-wider text-fg-3 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:border-red-900 dark:hover:bg-red-950/30"
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
        <div className="app-selection-bar fixed inset-x-0 bottom-0 z-[80] border-t border-slate-200 bg-white/95 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-4">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white ${isLongProjectPickMode ? "bg-violet-600" : "bg-slate-900 dark:bg-slate-800"}`}>{selectedIds.length}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">{isLongProjectPickMode ? "Ideas for long video" : "Ideas selected"}</p>
                <p className="truncate text-xs font-medium text-slate-400 dark:text-slate-500">{isLongProjectPickMode ? longProjectTitle : selectedTheme ? `Topic: ${selectedTheme.title}` : "Select ideas for your script"}</p>
              </div>
            </div>
            <div className="selection-actions">
              <button
                type="button"
                disabled={selectedIds.length === 0}
                onClick={() => setShowSelectedReview(true)}
                className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold uppercase tracking-wider text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
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
                className="h-11 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100"
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
      />

      <main className={`${appPageMainClass} pb-32`}>
        <div className="app-container library-container">
          <AppPageHeader
            title={activeGroup?.name || "All Ideas"}
            description={activeGroup ? "Remove ideas that don't fit this collection. They stay in All Ideas." : isLongProjectPickMode ? `Browse and select ideas for ${longProjectTitle}.` : "Choose a topic, search your library, and build the next video from the ideas you already have."}
            icon={<Squares2X2Icon className="h-5 w-5" />}
            className="mb-4"
            action={
              <span className="inline-flex h-9 items-center rounded-full bg-surface-sunken px-3.5 text-sm font-semibold tabular-nums text-fg-2" aria-live="polite">
                {loading && ideas.length === 0 ? "Loading…" : `${totalCount.toLocaleString()} ${totalCount === 1 ? "idea" : "ideas"}`}
              </span>
            }
          />

          {isLongProjectPickMode ? (
            <section className="mb-4 overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 p-4 text-white shadow-sm sm:p-5 dark:border-violet-900">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur"><FilmIcon className="h-6 w-6" /></span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Picking for long video</p>
                    <h2 className="truncate text-xl font-bold">{longProjectTitle}</h2>
                    <p className="mt-1 text-sm text-white/75">Search, filter, preview and select ideas. They will become your recording checklist.</p>
                  </div>
                </div>
                <button type="button" onClick={() => router.push(`/long-videos/${longProjectId}`)} className="h-10 cursor-pointer rounded-xl bg-white/15 px-4 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25">Back to project</button>
              </div>
            </section>
          ) : (
            <div className="relative z-[45] mb-4">
              <VideoThemeBoard
                value={selectedThemeId}
                themes={videoThemes}
                onChange={handleThemeChange}
                onCreate={handleCreateTheme}
                onUpdate={handleUpdateTheme}
                onDelete={handleDeleteTheme}
                onReorder={handleReorderThemes}
              />
            </div>
          )}

          <div className="library-toolbar mb-6 rounded-3xl border border-line bg-surface/90 p-2.5 shadow-sm backdrop-blur-md">
            <div className="library-filter-fields">
              <div className="library-search relative min-w-0">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-4" />
                <input
                  className="h-10 w-full rounded-full border border-line bg-surface px-11 text-sm font-medium text-fg shadow-sm outline-none transition placeholder:text-fg-4 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="Search titles, content, or games..."
                  aria-label="Search ideas"
                  value={q}
                  onChange={e=>setQ(e.target.value)}
                />
                {q && (
                  <button type="button" onClick={() => setQ("")} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-fg-4 transition hover:bg-surface-sunken hover:text-fg" aria-label="Clear search">
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="library-game">
                <ComboBox placeholder="All games" items={games.map(g=>({id:g.id, name:g.title, coverUrl:g.cover_url}))} selectedId={gameId} onChange={setGameId} />
              </div>
              <div className="library-year">
                <YearFilterDropdown
                  value={releaseYear}
                  years={Array.from(new Set(games.map((game) => game.release_year).filter((year): year is number => typeof year === "number"))).sort((a, b) => b - a)}
                  onChange={setReleaseYear}
                />
              </div>
              <div className="library-type">
                <TypeFilterDropdown value={type} onChange={setType} />
              </div>
              <div className="library-sort flex min-w-0 items-center justify-between gap-2">
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
                {(q||gameId||groupId||type||releaseYear!=="") && (
                  <button
                    type="button"
                    onClick={()=>{setQ("");setGameId("");setGroupId("");setType("");setReleaseYear("")}}
                    className="h-10 shrink-0 cursor-pointer rounded-full px-3 text-sm font-semibold text-rose-500 transition hover:bg-danger-soft hover:text-rose-600 dark:hover:text-rose-300"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {showPinnedRow && (
            <section className="mb-8" aria-labelledby="pinned-ideas-heading">
              <div className="mb-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={togglePinnedCollapsed}
                  aria-expanded={!pinnedCollapsed}
                  aria-controls="pinned-ideas-row"
                  className="group flex min-h-10 cursor-pointer items-center gap-2 rounded-xl pr-2 text-left"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                    <StarSolidIcon className="h-4 w-4" />
                  </span>
                  <h2 id="pinned-ideas-heading" className="text-lg font-bold text-fg">Pinned</h2>
                  <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-semibold tabular-nums text-fg-3">{pinnedIdeas.length}</span>
                  <ChevronDownIcon className={`h-4 w-4 text-fg-4 transition group-hover:text-fg ${pinnedCollapsed ? "-rotate-90" : ""}`} />
                </button>
                {!pinnedCollapsed && pinnedIdeas.length > 1 && (
                  <div className="hidden items-center gap-1 sm:flex">
                    <Button variant="secondary" size="icon-sm" onClick={() => scrollPinned(-1)} aria-label="Scroll pinned ideas left"><ChevronLeftIcon className="h-4 w-4" /></Button>
                    <Button variant="secondary" size="icon-sm" onClick={() => scrollPinned(1)} aria-label="Scroll pinned ideas right"><ChevronRightIcon className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>
              {!pinnedCollapsed && (
                <ul id="pinned-ideas-row" ref={pinnedRowRef} className="pinned-row animate-in fade-in duration-150">
                  {pinnedIdeas.map((r) => (
                    <IdeaItem key={`pinned-${r.id}`} r={r} game={games.find(g => g.id === r.game_id)} isSelectMode={isSelectMode} isSelected={selectedIds.includes(r.id)} onToggleSelect={toggleSelection} onTogglePin={togglePin} onEditGame={setEditingGame} onQuickView={setPreviewIdea} />
                  ))}
                </ul>
              )}
              <h2 className="mt-8 text-lg font-bold text-fg">All ideas</h2>
            </section>
          )}

          {loading && currentIdeas.length === 0 ? (
            <IdeaGridSkeleton />
          ) : (
            <ul className={`idea-grid transition-opacity duration-150 ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
              {currentIdeas.map(r => (
                 <IdeaItem key={r.id} r={r} game={games.find(g => g.id === r.game_id)} isSelectMode={isSelectMode} isSelected={selectedIds.includes(r.id)} onToggleSelect={toggleSelection} onTogglePin={togglePin} onEditGame={setEditingGame} onQuickView={setPreviewIdea} onRemoveFromGroup={groupId && loadedGroupId === groupId ? removeIdeaFromGroup : undefined} groupName={activeGroup?.name} removingFromGroup={removingGroupItems.has(`${groupId}:${r.id}`)} />
              ))}
            </ul>
          )}

          {!loading && currentIdeas.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-medium text-fg-3 dark:border-slate-700">
              {activeGroup ? "No ideas in this collection match your filters." : "No ideas match your filters."}
            </div>
          )}

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
               <span className="mx-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold uppercase tracking-wider text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
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
