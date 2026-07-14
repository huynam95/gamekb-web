"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, SVGProps } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  CubeTransparentIcon,
  ExclamationTriangleIcon,
  FaceSmileIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabaseClient";
import { fetchYoutubeTitle } from "@/lib/youtube";
import { normalizeMediaLink } from "@/lib/mediaLinks";
import { AppSidebar } from "@/components/AppSidebar";
import { useNotifications } from "@/components/NotificationCenter";

/* ================= TYPES ================= */

type Game = {
  id: number;
  title: string;
  release_year: number | null;
  genres_text: string | null;
};
type SimilarIdea = {
  id: number;
  title: string;
  game_id: number;
  detail_type: string;
};
type IdeaGroup = { id: number; name: string; description: string | null };
type StagedFootage = {
  file_path: string;
  title?: string;
  downloaded: boolean;
  notes?: string;
};
type StagedSource = { url: string; note?: string; reliability: number };
type ExistingMediaLink = {
  normalized: string;
  detailId: number;
  kind: "footage" | "source";
  raw: string;
  title?: string | null;
};
type DuplicateMediaCandidate = ExistingMediaLink & {
  pendingKind: "footage" | "source";
  pendingValue: string;
};

type SelectOption<T extends string | number> = {
  value: T;
  label: string;
  description?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
};

const DETAIL_TYPE_OPTIONS: SelectOption<string>[] = [
  {
    value: "small_detail",
    label: "Small detail",
    description: "Tiny detail",
    icon: MagnifyingGlassIcon,
  },
  {
    value: "easter_egg",
    label: "Easter egg",
    description: "Hidden secret",
    icon: SparklesIcon,
  },
  {
    value: "npc_reaction",
    label: "NPC reaction",
    description: "Character response",
    icon: UserGroupIcon,
  },
  {
    value: "physics",
    label: "Physics",
    description: "System detail",
    icon: CubeTransparentIcon,
  },
  {
    value: "troll",
    label: "Troll",
    description: "Player bait",
    icon: FaceSmileIcon,
  },
  {
    value: "punish",
    label: "Punish",
    description: "Disobedience result",
    icon: ExclamationTriangleIcon,
  },
];

/* ================= STYLES ================= */

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition shadow-sm";
const textareaClass =
  "min-h-[140px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition resize-y shadow-sm";
const btnBase =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold whitespace-nowrap cursor-pointer transition active:scale-[0.98]";
const btnPrimary =
  btnBase +
  " bg-slate-900 text-white shadow-lg shadow-slate-200 hover:bg-slate-800 disabled:opacity-70";
const btnGhost =
  btnBase +
  " border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50";
const cardClass =
  "rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm";

/* ================= HELPERS (Giữ nguyên) ================= */

function renderLinkOrText(text: string) {
  const isUrl = text.startsWith("http://") || text.startsWith("https://");
  if (isUrl) {
    return (
      <a
        href={text}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-blue-600 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {text}
      </a>
    );
  }
  return <span className="break-all font-mono text-slate-500">{text}</span>;
}

/* ================= SUB-COMPONENTS (Giữ nguyên GameCombobox, GroupPicker) ================= */

function ModernSelect<T extends string | number>({
  label,
  value,
  options,
  onChange,
  compact = false,
}: {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const selected =
    options.find((option) => option.value === value) ?? options[0];
  const SelectedIcon = selected?.icon;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`group flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 ${compact ? "h-12" : "h-14"}`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
            {SelectedIcon ? (
              <SelectedIcon className="h-4 w-4" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-slate-900 dark:text-slate-100">
              {selected.label}
            </span>
            {selected.description && !compact && (
              <span className="block truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {selected.description}
              </span>
            )}
          </span>
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-950 dark:ring-white/10">
          {options.map((option) => {
            const Icon = option.icon;
            const active = option.value === value;
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left transition ${active ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950" : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${active ? "bg-white/15" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"}`}
                  >
                    {Icon ? (
                      <Icon className="h-4 w-4" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">
                      {option.label}
                    </span>
                    {option.description && (
                      <span
                        className={`block truncate text-[10px] font-bold uppercase tracking-wider ${active ? "text-white/60 dark:text-slate-600" : "text-slate-400"}`}
                      >
                        {option.description}
                      </span>
                    )}
                  </span>
                </span>
                {active && <CheckIcon className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GameCombobox({ games, selectedGameId, onSelect, onCreateGame }: any) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement | null>(null);

  const selectedGame = useMemo(() => {
    if (!selectedGameId) return null;
    return games.find((g: any) => g.id === selectedGameId) ?? null;
  }, [games, selectedGameId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return games.slice(0, 50);
    return games
      .filter((g: any) => g.title.toLowerCase().includes(q))
      .slice(0, 50);
  }, [games, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">
        Game Select *
      </label>
      <button
        type="button"
        className={`flex w-full cursor-pointer items-center justify-between text-left ${inputClass} ${!selectedGame ? "text-slate-400" : "font-bold"}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">
          {selectedGame ? selectedGame.title : "Search & Select Game..."}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-slate-300 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-950 dark:ring-white/10">
          <input
            className={inputClass}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type game name..."
            autoFocus
          />
          <div className="max-h-60 overflow-auto mt-2 space-y-1">
            {filtered.length === 0 ? (
              <button
                type="button"
                className="w-full cursor-pointer rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100"
                onClick={() => {
                  setOpen(false);
                  onCreateGame(query.trim());
                }}
              >
                + Create "{query}"
              </button>
            ) : (
              filtered.map((g: any) => (
                <button
                  key={g.id}
                  type="button"
                  className="w-full cursor-pointer rounded-xl px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={() => {
                    onSelect(g);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  {g.title}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GroupPicker({ groups, selectedIds, onToggle, onCreateGroup }: any) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return groups.slice(0, 50);
    return groups
      .filter((g: any) => g.name.toLowerCase().includes(s))
      .slice(0, 50);
  }, [groups, q]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <div className="mb-3 flex items-center justify-between">
        <label className="text-xs font-black uppercase tracking-widest text-slate-400">
          Add to Collection
        </label>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="cursor-pointer text-xs font-bold text-blue-600 hover:underline"
        >
          {open ? "Close" : "+ Add"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2 min-h-[40px]">
        {selectedIds.length === 0 && !open && (
          <span className="text-xs text-slate-400 italic font-medium">
            Not assigned to any collection.
          </span>
        )}
        {selectedIds.map((id: number) => {
          const g = groups.find((x: any) => x.id === id);
          return (
            g && (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700"
              >
                {g.name}{" "}
                <button
                  type="button"
                  onClick={() => onToggle(id)}
                  className="cursor-pointer text-lg leading-none hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            )
          );
        })}
      </div>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-950 dark:ring-white/10">
          <input
            className={inputClass}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search groups..."
            autoFocus
          />
          <div className="max-h-48 overflow-auto mt-2 space-y-1">
            {filtered.length === 0 ? (
              <button
                type="button"
                className="w-full cursor-pointer rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100"
                onClick={() => {
                  if (q.trim()) onCreateGroup(q.trim());
                  setQ("");
                }}
              >
                + Create "{q}"
              </button>
            ) : (
              filtered.map((g: any) => (
                <button
                  key={g.id}
                  type="button"
                  className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold transition ${selectedIds.includes(g.id) ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                  onClick={() => onToggle(g.id)}
                >
                  <span>{g.name}</span> {selectedIds.includes(g.id) && "✓"}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= MAIN COMPONENT ================= */

export default function AddIdeaPage() {
  const { success, error: notifyError } = useNotifications();
  const [games, setGames] = useState<Game[]>([]);
  const [groups, setGroups] = useState<IdeaGroup[]>([]);
  const [gameId, setGameId] = useState<number | "">("");

  // Core fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [detailType, setDetailType] = useState("small_detail");
  const [pinned, setPinned] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);

  // Helpers
  const [debouncedTitle, setDebouncedTitle] = useState("");
  const [similar, setSimilar] = useState<SimilarIdea[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Modals / Inline forms
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [newGameTitle, setNewGameTitle] = useState("");
  const [savingGame, setSavingGame] = useState(false);

  // Staging
  const [fp, setFp] = useState("");
  const [fetchingTitle, setFetchingTitle] = useState(false);
  const [stagedFootage, setStagedFootage] = useState<StagedFootage[]>([]);
  const [srcUrl, setSrcUrl] = useState("");
  const [stagedSources, setStagedSources] = useState<StagedSource[]>([]);
  const [existingMediaLinks, setExistingMediaLinks] = useState<ExistingMediaLink[]>([]);
  const [duplicateMedia, setDuplicateMedia] = useState<DuplicateMediaCandidate | null>(null);

  const [savingIdea, setSavingIdea] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [gamesResult, groupsResult, footageResult, sourcesResult] = await Promise.all([
        supabase.from("games").select("*").order("title"),
        supabase.from("idea_groups").select("*").order("name"),
        supabase.from("footage").select("detail_id,file_path,title").range(0, 4999),
        supabase.from("sources").select("detail_id,url").range(0, 4999),
      ]);

      setGames((gamesResult.data || []) as Game[]);
      setGroups((groupsResult.data || []) as IdeaGroup[]);

      const mediaLinks: ExistingMediaLink[] = [];
      for (const row of footageResult.data ?? []) {
        const raw = String((row as any).file_path || "");
        const normalized = normalizeMediaLink(raw);
        if (normalized) mediaLinks.push({ normalized, detailId: Number((row as any).detail_id), kind: "footage", raw, title: (row as any).title });
      }
      for (const row of sourcesResult.data ?? []) {
        const raw = String((row as any).url || "");
        const normalized = normalizeMediaLink(raw);
        if (normalized) mediaLinks.push({ normalized, detailId: Number((row as any).detail_id), kind: "source", raw });
      }
      setExistingMediaLinks(mediaLinks);
    }
    loadData();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTitle(title), 500);
    return () => clearTimeout(t);
  }, [title]);

  useEffect(() => {
    if (debouncedTitle.trim().length < 4) {
      setSimilar([]);
      return;
    }
    setLoadingSimilar(true);
    supabase
      .rpc("search_similar_ideas", {
        q: debouncedTitle.trim(),
        gid: gameId ? Number(gameId) : null,
      })
      .then(({ data }) => {
        setSimilar((data ?? []) as SimilarIdea[]);
        setLoadingSimilar(false);
      });
  }, [debouncedTitle, gameId]);

  async function createGameInline() {
    if (!newGameTitle.trim()) return;
    setSavingGame(true);
    const { data, error } = await supabase
      .from("games")
      .insert({ title: newGameTitle.trim() })
      .select("id")
      .single();
    setSavingGame(false);
    if (!error && data) {
      setGameId(data.id);
      setShowCreateGame(false);
      const { data: gs } = await supabase
        .from("games")
        .select("*")
        .order("title");
      setGames((gs ?? []) as Game[]);
    }
  }

  async function createGroupInline(name: string) {
    const { data } = await supabase
      .from("idea_groups")
      .insert({ name })
      .select()
      .single();
    if (data) {
      setGroups((prev) =>
        [...prev, data].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setSelectedGroupIds((prev) => [...prev, data.id]);
    }
  }

  function findDuplicateMedia(value: string): ExistingMediaLink | null {
    const normalized = normalizeMediaLink(value);
    if (!normalized) return null;

    const stagedFootageMatch = stagedFootage.find((item) => normalizeMediaLink(item.file_path) === normalized);
    if (stagedFootageMatch) return { normalized, detailId: 0, kind: "footage", raw: stagedFootageMatch.file_path, title: stagedFootageMatch.title };

    const stagedSourceMatch = stagedSources.find((item) => normalizeMediaLink(item.url) === normalized);
    if (stagedSourceMatch) return { normalized, detailId: 0, kind: "source", raw: stagedSourceMatch.url };

    return existingMediaLinks.find((item) => item.normalized === normalized) ?? null;
  }

  async function addFootageUnchecked(link: string) {
    setFetchingTitle(true);
    const ytTitle = await fetchYoutubeTitle(link);
    const isLocalFile = !link.startsWith("http");
    setStagedFootage((current) => [
      ...current,
      { file_path: link, title: ytTitle || undefined, downloaded: isLocalFile },
    ]);
    setFp("");
    setFetchingTitle(false);
  }

  async function handleAddFootage() {
    const link = fp.trim();
    if (!link) return;
    const duplicate = findDuplicateMedia(link);
    if (duplicate) {
      setDuplicateMedia({ ...duplicate, pendingKind: "footage", pendingValue: link });
      return;
    }
    await addFootageUnchecked(link);
  }

  function addSourceUnchecked(link: string) {
    setStagedSources((current) => [...current, { url: link, reliability: 3 }]);
    setSrcUrl("");
  }

  function handleAddSource() {
    const link = srcUrl.trim();
    if (!link) return;
    const duplicate = findDuplicateMedia(link);
    if (duplicate) {
      setDuplicateMedia({ ...duplicate, pendingKind: "source", pendingValue: link });
      return;
    }
    addSourceUnchecked(link);
  }

  async function addDuplicateAnyway() {
    if (!duplicateMedia) return;
    const pending = duplicateMedia;
    setDuplicateMedia(null);
    if (pending.pendingKind === "footage") await addFootageUnchecked(pending.pendingValue);
    else addSourceUnchecked(pending.pendingValue);
  }

  async function saveIdea(e: React.FormEvent) {
    e.preventDefault();
    if (!gameId || !title.trim() || !description.trim()) {
      notifyError("Please fill in Game, Title, and Description.", "Missing fields");
      return;
    }
    setSavingIdea(true);
    const { data: idea, error } = await supabase
      .from("details")
      .insert({
        game_id: gameId,
        title: title.trim(),
        description: description.trim(),
        detail_type: detailType,
        status: "idea",
        pinned,
        pinned_at: pinned ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (error || !idea) {
      notifyError(error?.message || "Error saving.", "Could not save idea");
      setSavingIdea(false);
      return;
    }

    const detailId = idea.id;
    const promises = [];
    if (selectedGroupIds.length) {
      promises.push(
        supabase
          .from("idea_group_items")
          .insert(
            selectedGroupIds.map((gid) => ({
              group_id: gid,
              detail_id: detailId,
              position: 0,
            })),
          ),
      );
    }
    if (stagedFootage.length) {
      promises.push(
        supabase
          .from("footage")
          .insert(
            stagedFootage.map((f) => ({
              detail_id: detailId,
              file_path: f.file_path,
              title: f.title,
              downloaded: f.downloaded,
              notes: f.notes,
            })),
          ),
      );
    }
    if (stagedSources.length) {
      promises.push(
        supabase
          .from("sources")
          .insert(
            stagedSources.map((s) => ({
              detail_id: detailId,
              url: s.url,
              reliability: s.reliability,
            })),
          ),
      );
    }

    const childResults = await Promise.all(promises);
    const failedChildSave = childResults.find((result) => result.error);

    if (failedChildSave) {
      await supabase.from("details").delete().eq("id", detailId);
      setSavingIdea(false);
      notifyError(
        failedChildSave.error?.message ||
          "Idea was not saved because related data failed.",
        "Could not save idea",
      );
      return;
    }

    setExistingMediaLinks((current) => [
      ...current,
      ...stagedFootage.map((item) => ({ normalized: normalizeMediaLink(item.file_path), detailId, kind: "footage" as const, raw: item.file_path, title: item.title })),
      ...stagedSources.map((item) => ({ normalized: normalizeMediaLink(item.url), detailId, kind: "source" as const, raw: item.url })),
    ].filter((item) => item.normalized));
    setSavingIdea(false);
    success("Idea saved successfully!", "Idea saved");
    setTitle("");
    setDescription("");
    setStagedFootage([]);
    setStagedSources([]);
    setSimilar([]);
    setPinned(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 xl:flex">
      <AppSidebar activePage="addIdea" />

      {/* MAIN CONTENT */}
      <main className="flex-1 xl:pl-72 pb-32">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <div className="mb-10">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Create Idea
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              Ghi lại một chi tiết, cơ chế hoặc bí mật thú vị.
            </p>
          </div>


          <form
            onSubmit={saveIdea}
            className="grid gap-8 lg:grid-cols-3 items-start"
          >
            {/* LEFT COLUMN: CONTENT */}
            <div className="space-y-8 lg:col-span-2">
              <div className={cardClass}>
                <div className="space-y-6">
                  <GameCombobox
                    games={games}
                    selectedGameId={gameId}
                    onSelect={(g: any) => setGameId(g.id)}
                    onCreateGame={(t: any) => {
                      setNewGameTitle(t);
                      setShowCreateGame(true);
                    }}
                  />
                  {showCreateGame && (
                    <div className="rounded-2xl border-2 border-blue-100 bg-blue-50/50 p-6 animate-in zoom-in-95">
                      <h4 className="mb-3 text-xs font-black uppercase tracking-widest text-blue-800">
                        New Game Entry
                      </h4>
                      <div className="flex gap-3">
                        <input
                          className={inputClass}
                          value={newGameTitle}
                          onChange={(e) => setNewGameTitle(e.target.value)}
                          placeholder="Enter Game Title..."
                        />
                        <button
                          type="button"
                          onClick={createGameInline}
                          disabled={savingGame}
                          className={btnPrimary}
                        >
                          {savingGame ? "..." : "Create"}
                        </button>
                      </div>
                    </div>
                  )}
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">
                      Idea Title *
                    </span>
                    <input
                      className={inputClass}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Unique NPC death animations"
                    />
                  </label>
                  {!loadingSimilar && similar.length > 0 && (
                    <div className="rounded-2xl border-2 border-amber-100 bg-amber-50 p-5">
                      <div className="mb-3 text-[10px] font-black uppercase tracking-widest text-amber-700">
                        Similarity Warning
                      </div>
                      <ul className="space-y-2">
                        {similar.map((s) => (
                          <li
                            key={s.id}
                            className="text-xs font-bold text-amber-900"
                          >
                            •{" "}
                            <a
                              href={`/idea/${s.id}`}
                              target="_blank"
                              className="underline"
                            >
                              {s.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">
                      Detailed Description *
                    </span>
                    <textarea
                      className={textareaClass}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide context, how to trigger, and why it's interesting..."
                    />
                  </label>
                </div>
              </div>

              <div className={cardClass}>
                <h3 className="mb-6 text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                  <span>📂</span> Attachments & Media
                </h3>
                {duplicateMedia && (
                  <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Duplicate link detected</p>
                        <p className="mt-1 text-sm font-bold text-amber-950 dark:text-amber-100">
                          This video is already {duplicateMedia.detailId ? "used in another idea" : "added to this draft"}.
                          {duplicateMedia.detailId > 0 && (
                            <> <a href={`/idea/${duplicateMedia.detailId}`} target="_blank" rel="noopener noreferrer" className="cursor-pointer underline decoration-2 underline-offset-2">Open idea #{duplicateMedia.detailId}</a>.</>
                          )}
                        </p>
                        <p className="mt-1 truncate text-xs text-amber-700/80 dark:text-amber-200/70">{duplicateMedia.raw}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={() => setDuplicateMedia(null)} className="h-10 cursor-pointer rounded-xl px-4 text-xs font-black text-amber-700 transition hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-500/10">Cancel</button>
                        <button type="button" onClick={() => void addDuplicateAnyway()} className="h-10 cursor-pointer rounded-xl bg-amber-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-amber-700">Add anyway</button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid gap-8 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Footage / Clips
                    </div>
                    <div className="flex gap-2">
                      <input
                        className={inputClass}
                        placeholder="Link or file path..."
                        value={fp}
                        onChange={(e) => setFp(e.target.value)}
                        disabled={fetchingTitle}
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          (e.preventDefault(), handleAddFootage())
                        }
                      />
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={handleAddFootage}
                        disabled={fetchingTitle}
                      >
                        {fetchingTitle ? "..." : "+"}
                      </button>
                    </div>
                    <ul className="space-y-3">
                      {stagedFootage.map((f, i) => (
                        <li
                          key={i}
                          className="rounded-2xl bg-slate-50 p-4 border border-slate-100 group"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="min-w-0 pr-4">
                              {f.title && (
                                <div className="font-bold text-xs text-slate-900 line-clamp-1 mb-1">
                                  🎬 {f.title}
                                </div>
                              )}
                              <div className="truncate text-[10px] font-mono font-bold text-slate-400">
                                {renderLinkOrText(f.file_path)}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setStagedFootage(
                                  stagedFootage.filter((_, idx) => idx !== i),
                                )
                              }
                              className="cursor-pointer text-lg text-slate-300 transition-colors hover:text-rose-500"
                            >
                              ×
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const n = [...stagedFootage];
                              n[i].downloaded = !n[i].downloaded;
                              setStagedFootage(n);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition shadow-sm ${f.downloaded ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}
                          >
                            {f.downloaded ? "✓ Downloaded" : "☁ Need Download"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Sources / References
                    </div>
                    <div className="flex gap-2">
                      <input
                        className={inputClass}
                        placeholder="URL..."
                        value={srcUrl}
                        onChange={(e) => setSrcUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSource();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={handleAddSource}
                      >
                        +
                      </button>
                    </div>
                    <ul className="space-y-2">
                      {stagedSources.map((s, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-xs border border-slate-100"
                        >
                          <span className="truncate font-bold text-slate-500">
                            {renderLinkOrText(s.url)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setStagedSources(
                                stagedSources.filter((_, idx) => idx !== i),
                              )
                            }
                            className="cursor-pointer text-slate-300 hover:text-rose-500"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              <div className={cardClass}>
                <button
                  type="submit"
                  disabled={!gameId || !title || savingIdea}
                  className={`${btnPrimary} w-full h-14 text-base tracking-tight`}
                >
                  {savingIdea ? "Publishing Idea..." : "Publish Idea"}
                </button>
              </div>

              <div className={cardClass}>
                <GroupPicker
                  groups={groups}
                  selectedIds={selectedGroupIds}
                  onToggle={(id: any) =>
                    setSelectedGroupIds((prev) =>
                      prev.includes(id)
                        ? prev.filter((x) => x !== id)
                        : [...prev, id],
                    )
                  }
                  onCreateGroup={createGroupInline}
                />
              </div>

              <div className={cardClass}>
                <h3 className="mb-6 text-xs font-black uppercase tracking-widest text-slate-400">
                  Settings
                </h3>
                <div className="space-y-5">
                  <ModernSelect
                    label="Detail Type"
                    value={detailType}
                    options={DETAIL_TYPE_OPTIONS}
                    onChange={setDetailType}
                  />
                  <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={pinned}
                      onChange={(e) => setPinned(e.target.checked)}
                      className="h-5 w-5 rounded-lg border-slate-300 text-slate-900 focus:ring-0"
                    />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Pin this idea
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
