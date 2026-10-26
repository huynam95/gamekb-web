"use client";

import { CoverImage } from "@/components/CoverImage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowPathIcon, ArrowTopRightOnSquareIcon, ChatBubbleLeftRightIcon, CheckIcon, ChevronDownIcon, CloudArrowDownIcon, ExclamationTriangleIcon, FilmIcon, FolderIcon, GlobeAltIcon, LightBulbIcon, MagnifyingGlassIcon, PhotoIcon, PlusIcon, PuzzlePieceIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { supabase } from "@/lib/supabaseClient";
import { fetchYoutubeMetadata } from "@/lib/youtube";
import { AppSidebar } from "@/components/AppSidebar";
import { AppPageHeader, appPageMainClass, appPageRootClass } from "@/components/AppPage";
import { useNotifications } from "@/components/NotificationCenter";
import { normalizeGameTitle } from "@/lib/gameTitles";
import { CoverBackdrop } from "@/components/CoverBackdrop";
import { TypeLabel, TypePill } from "@/components/TypePill";
import { Button } from "@/components/ui/Button";
import { Field, FieldLabel, Input, Textarea } from "@/components/ui/Field";
import { useDismiss } from "@/components/ui/useDismiss";
import { TypeChips } from "@/components/TypeChips";

/* ================= TYPES ================= */

type Game = {
  id: number;
  title: string;
  release_year: number | null;
  genres_text: string | null;
  cover_url?: string | null;
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
  channel_name?: string;
  downloaded: boolean;
  notes?: string;
};
type StagedSource = { url: string; note?: string; reliability: number };
/* ================= STYLES ================= */

const cardClass = "rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6";
const sectionTitleClass = "flex items-center gap-2 text-sm font-semibold text-fg";

/* ================= HELPERS ================= */

function renderLinkOrText(text: string) {
  const isUrl = text.startsWith("http://") || text.startsWith("https://");
  if (isUrl) {
    return (
      <a
        href={text}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-accent hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {text}
      </a>
    );
  }
  return <span className="break-all font-mono text-fg-3">{text}</span>;
}

function StepBadge({ n, done }: { n: number; done: boolean }) {
  return (
    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${done ? "bg-emerald-500 text-white" : "bg-surface-sunken text-fg-3"}`}>
      {done ? <CheckIcon className="h-3.5 w-3.5" /> : n}
    </span>
  );
}

/* ================= SUB-COMPONENTS ================= */

function GameCover({ src, className = "h-10 w-10 rounded-xl" }: { src?: string | null; className?: string }) {
  return (
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-surface-sunken text-fg-4 ring-1 ring-black/5 dark:ring-white/10 ${className}`}>
      {src ? (
        <CoverImage src={src} sizes="40px" />
      ) : (
        <PuzzlePieceIcon className="h-5 w-5" aria-hidden="true" />
      )}
    </span>
  );
}

function GamePicker({
  games,
  selectedGameId,
  onSelect,
  onCreateGame,
}: {
  games: Game[];
  selectedGameId: number | "";
  onSelect: (game: Game) => void;
  onCreateGame: (title: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement | null>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(boxRef, open, close);

  const selectedGame = games.find((g) => g.id === selectedGameId) ?? null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? games.filter((g) => g.title.toLowerCase().includes(q)) : games).slice(0, 50);
  }, [games, query]);
  const exactMatch = games.some((g) => normalizeGameTitle(g.title) === normalizeGameTitle(query));

  const choose = (game: Game) => {
    onSelect(game);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={boxRef} className={`relative ${open ? "z-30" : ""}`}>
      <button
        type="button"
        className={`flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border bg-surface px-2.5 py-2 text-left shadow-sm transition hover:border-line-strong focus:outline-none focus:ring-4 focus:ring-blue-500/10 ${selectedGame ? "border-line" : "border-dashed border-line-strong"}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-3">
          <GameCover src={selectedGame?.cover_url} />
          <span className="min-w-0">
            <span className={`block truncate text-sm font-semibold ${selectedGame ? "text-fg" : "text-fg-3"}`}>
              {selectedGame ? selectedGame.title : "Choose a game"}
            </span>
            <span className="block truncate text-xs text-fg-4">
              {selectedGame ? (selectedGame.release_year ? `Released ${selectedGame.release_year}` : "Release year unknown") : "Search your library or add a new game"}
            </span>
          </span>
        </span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-fg-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl border border-line bg-surface p-2 shadow-2xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-150 dark:ring-white/10">
          <label className="relative block">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-4" />
            <input
              className="h-10 w-full rounded-xl border border-line bg-surface-muted pl-9 pr-3 text-sm font-medium text-fg outline-none placeholder:text-fg-4 focus:border-blue-400"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (filtered[0]) choose(filtered[0]);
                else if (query.trim()) { onCreateGame(query.trim()); setOpen(false); }
              }}
              placeholder="Type a game name..."
              aria-label="Search games"
              autoFocus
            />
          </label>
          <div className="mt-2 max-h-72 space-y-0.5 overflow-auto" role="listbox" aria-label="Games">
            {filtered.map((g) => {
              const active = g.id === selectedGameId;
              return (
                <button
                  key={g.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-left text-sm font-medium transition ${active ? "bg-slate-900 text-white dark:bg-slate-700" : "text-fg-2 hover:bg-surface-sunken hover:text-fg"}`}
                  onClick={() => choose(g)}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <GameCover src={g.cover_url} className="h-8 w-8 rounded-lg" />
                    <span className="truncate">{g.title}</span>
                  </span>
                  {g.release_year && <span className={`shrink-0 text-xs tabular-nums ${active ? "text-white/70" : "text-fg-4"}`}>{g.release_year}</span>}
                </button>
              );
            })}
            {query.trim() && !exactMatch && (
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-accent transition hover:bg-accent-soft"
                onClick={() => { onCreateGame(query.trim()); setOpen(false); setQuery(""); }}
              >
                <PlusIcon className="h-4 w-4" /> Add “{query.trim()}” as a new game
              </button>
            )}
            {!query.trim() && filtered.length === 0 && <p className="px-3 py-4 text-center text-sm text-fg-4">No games yet. Type a name to add one.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

type NewGameDraft = { title: string; releaseYear: string; coverUrl: string };

/** The full "add a game" form (same fields as the old Add Game page), shown inside Add Idea. */
function NewGameForm({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  draft: NewGameDraft;
  onChange: (draft: NewGameDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const coverUrl = draft.coverUrl.trim();
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const showCover = Boolean(coverUrl) && failedCover !== coverUrl;

  return (
    <div
      className="mt-3 rounded-2xl border border-accent-line bg-accent-soft/60 p-4 animate-in fade-in slide-in-from-top-1 duration-150 sm:p-5"
      onKeyDown={(e) => {
        // Enter adds the game instead of submitting the idea form around it.
        if (e.key === "Enter" && !(e.metaKey || e.ctrlKey) && (e.target as HTMLElement).tagName === "INPUT") {
          e.preventDefault();
          onSave();
        }
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-accent">
          <PuzzlePieceIcon className="h-4 w-4" /> New game
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="touch-target flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-fg-4 transition hover:bg-surface hover:text-fg"
          aria-label="Cancel new game"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <Field label="Game title">
          <Input
            className="h-12 text-base font-semibold"
            value={draft.title}
            onChange={(e) => onChange({ ...draft, title: e.target.value })}
            placeholder="e.g. Elden Ring"
            autoFocus
          />
        </Field>
        <Field label="Release year">
          <Input
            className="h-12"
            type="number"
            inputMode="numeric"
            min={1970}
            max={2100}
            value={draft.releaseYear}
            onChange={(e) => onChange({ ...draft, releaseYear: e.target.value })}
            placeholder="e.g. 2026"
          />
        </Field>
      </div>
      <p className="mt-1.5 text-xs text-fg-4">The year is used by the Year filter on All Ideas. You can leave it blank and add it later.</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-start">
        <Field label="Cover image URL">
          <Input
            value={draft.coverUrl}
            onChange={(e) => onChange({ ...draft, coverUrl: e.target.value })}
            placeholder="https://..."
            inputMode="url"
          />
          <span className="mt-1.5 block text-xs text-fg-4">Paste a direct link to an image (jpg, png, webp).</span>
        </Field>
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-line bg-surface-sunken sm:mt-6" aria-label="Cover preview">
          {showCover ? (
            <CoverImage key={coverUrl} src={coverUrl} sizes="(min-width: 640px) 144px, 100vw" alt="Cover preview" onError={() => setFailedCover(coverUrl)} />
          ) : (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center text-[11px] text-fg-4">
              <PhotoIcon className="h-5 w-5" />
              {coverUrl ? "Can't load image" : "Cover preview"}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="accent" onClick={onSave} disabled={saving || !draft.title.trim()}>
          <PlusIcon className="h-4 w-4" /> {saving ? "Adding..." : "Add game"}
        </Button>
      </div>
    </div>
  );
}

function CollectionPicker({
  groups,
  selectedIds,
  onToggle,
  onCreateGroup,
}: {
  groups: IdeaGroup[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  onCreateGroup: (name: string) => void | Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = q ? groups.filter((g) => g.name.toLowerCase().includes(q)) : groups;
  const exact = groups.some((g) => g.name.trim().toLowerCase() === q);
  const create = () => {
    const name = query.trim();
    if (!name || exact) return;
    void onCreateGroup(name);
    setQuery("");
  };

  return (
    <div>
      {groups.length > 8 && (
        <label className="relative mb-3 block">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-4" />
          <input
            className="h-9 w-full rounded-xl border border-line bg-surface-muted pl-9 pr-3 text-sm text-fg outline-none placeholder:text-fg-4 focus:border-blue-400"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a collection..."
            aria-label="Find a collection"
          />
        </label>
      )}
      <div className="flex flex-wrap gap-1.5">
        {visible.map((g) => {
          const active = selectedIds.includes(g.id);
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(g.id)}
              className={`inline-flex h-8 max-w-full cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition ${
                active ? "border-blue-500 bg-blue-600 text-white" : "border-line bg-surface text-fg-2 hover:border-line-strong hover:bg-surface-hover"
              }`}
            >
              {active ? <CheckIcon className="h-3.5 w-3.5 shrink-0" /> : <FolderIcon className="h-3.5 w-3.5 shrink-0 text-fg-4" />}
              <span className="truncate">{g.name}</span>
            </button>
          );
        })}
        {groups.length === 0 && <p className="text-xs text-fg-4">No collections yet.</p>}
      </div>
      <div className="mt-3 flex gap-2">
        {groups.length <= 8 && (
          <input
            className="h-9 min-w-0 flex-1 rounded-xl border border-line bg-surface-muted px-3 text-sm text-fg outline-none placeholder:text-fg-4 focus:border-blue-400"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              create();
            }}
            placeholder="New collection name"
            aria-label="New collection name"
          />
        )}
        {(groups.length <= 8 || (q && !exact)) && (
          <Button variant="secondary" size="sm" onClick={create} disabled={!q || exact} className={groups.length > 8 ? "w-full" : ""}>
            <PlusIcon className="h-4 w-4" /> {groups.length > 8 ? `Create “${query.trim()}”` : "Add"}
          </Button>
        )}
      </div>
    </div>
  );
}

function IdeaPreview({
  game,
  title,
  detailType,
  pinned,
  collectionName,
  extraCollections,
}: {
  game: Game | null;
  title: string;
  detailType: string;
  pinned: boolean;
  collectionName?: string;
  extraCollections: number;
}) {
  return (
    <div className="relative h-56 overflow-hidden rounded-2xl border border-line bg-slate-900 shadow-sm">
      <CoverBackdrop src={game?.cover_url} alt="" imageClassName="opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-end p-5">
        <p className="mb-1 truncate text-[11px] font-semibold uppercase tracking-wide text-white/65">{game?.title || "Game"}</p>
        <h3 className={`mb-2 line-clamp-2 text-base font-bold leading-snug ${title.trim() ? "text-white" : "text-white/40"}`}>{title.trim() || "Your idea title"}</h3>
        {collectionName && (
          <span className="mb-2 inline-flex max-w-[70%] items-center gap-1 self-start rounded-md border border-white/10 bg-white/10 px-1.5 py-1 text-[11px] font-medium text-white/85">
            <FolderIcon className="h-3 w-3 shrink-0 text-sky-300" />
            <span className="truncate">{collectionName}</span>
            {extraCollections > 0 && <span className="shrink-0 text-white/55">+{extraCollections}</span>}
          </span>
        )}
        <div className="flex items-center gap-2">
          <TypePill typeKey={detailType} />
          {pinned && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300"><StarSolidIcon className="h-3 w-3" /> Pinned</span>}
        </div>
      </div>
    </div>
  );
}

/* ================= MAIN COMPONENT ================= */

export default function AddIdeaPage() {
  const { success, error: notifyError, warning } = useNotifications();
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
  const emptyGameDraft: NewGameDraft = { title: "", releaseYear: "", coverUrl: "" };
  const [newGame, setNewGame] = useState<NewGameDraft>(emptyGameDraft);
  const [savingGame, setSavingGame] = useState(false);

  // Staging
  const [fp, setFp] = useState("");
  const [fetchingTitle, setFetchingTitle] = useState(false);
  const [stagedFootage, setStagedFootage] = useState<StagedFootage[]>([]);
  const [srcUrl, setSrcUrl] = useState("");
  const [stagedSources, setStagedSources] = useState<StagedSource[]>([]);

  const [savingIdea, setSavingIdea] = useState(false);
  const [audienceRequestId, setAudienceRequestId] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestId = Number(params.get("audienceRequestId"));
    const presetGameId = Number(params.get("gameId"));
    if (Number.isFinite(requestId) && requestId > 0) setAudienceRequestId(requestId);
    if (Number.isFinite(presetGameId) && presetGameId > 0) setGameId(presetGameId);
    const presetTitle = params.get("title");
    const presetDescription = params.get("description");
    if (presetTitle) setTitle(presetTitle);
    if (presetDescription) setDescription(presetDescription);
    // Old "Add Game" links land here with the new-game form open.
    if (params.get("newGame")) setShowCreateGame(true);
  }, []);

  useEffect(() => {
    async function loadData() {
      const [gamesResult, groupsResult] = await Promise.all([
        supabase.from("games").select("*").order("title"),
        supabase.from("idea_groups").select("*").order("name"),
      ]);

      setGames((gamesResult.data || []) as Game[]);
      setGroups((groupsResult.data || []) as IdeaGroup[]);
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

  function openNewGame(presetTitle = "") {
    setNewGame({ ...emptyGameDraft, title: presetTitle });
    setShowCreateGame(true);
  }

  function closeNewGame() {
    setShowCreateGame(false);
    setNewGame(emptyGameDraft);
  }

  async function createGameInline() {
    const trimmedTitle = newGame.title.trim();
    if (!trimmedTitle) {
      warning("Please enter a game title.", "Missing title");
      return;
    }

    const duplicate = games.find(
      (game) => normalizeGameTitle(game.title) === normalizeGameTitle(trimmedTitle),
    );
    if (duplicate) {
      warning(`“${duplicate.title}” is already in your game library.`, "Game already exists");
      return;
    }

    const parsedReleaseYear = newGame.releaseYear.trim() ? Number(newGame.releaseYear) : null;
    if (parsedReleaseYear !== null && (!Number.isInteger(parsedReleaseYear) || parsedReleaseYear < 1970 || parsedReleaseYear > 2100)) {
      warning("Please enter a valid release year.", "Invalid year");
      return;
    }

    setSavingGame(true);
    const { data, error } = await supabase
      .from("games")
      .insert({
        title: trimmedTitle,
        release_year: parsedReleaseYear,
        cover_url: newGame.coverUrl.trim() || null,
      })
      .select("id")
      .single();
    setSavingGame(false);

    if (error) {
      if ((error as { code?: string }).code === "23505") {
        warning("A game with this title already exists.", "Game already exists");
      } else {
        notifyError(error.message, "Could not add game");
      }
      return;
    }

    if (data) {
      setGameId(data.id);
      closeNewGame();
      const { data: gs } = await supabase
        .from("games")
        .select("*")
        .order("title");
      setGames((gs ?? []) as Game[]);
      success(`“${trimmedTitle}” added to your library and selected.`, "Game saved");
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

  async function addFootage(link: string) {
    setFetchingTitle(true);
    const metadata = await fetchYoutubeMetadata(link);
    const isLocalFile = !link.startsWith("http");
    setStagedFootage((current) => [
      ...current,
      {
        file_path: link,
        title: metadata.title || undefined,
        channel_name: metadata.channelName || undefined,
        downloaded: isLocalFile,
      },
    ]);
    setFp("");
    setFetchingTitle(false);
  }

  async function handleAddFootage() {
    const link = fp.trim();
    if (!link) return;
    await addFootage(link);
  }

  function handleAddSource() {
    const link = srcUrl.trim();
    if (!link) return;
    setStagedSources((current) => [...current, { url: link, reliability: 3 }]);
    setSrcUrl("");
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
              channel_name: f.channel_name,
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

    if (audienceRequestId) {
      try {
        const response = await fetch(`/api/audience-requests/${audienceRequestId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ linked_idea_id: detailId, status: "planned" }),
        });
        if (!response.ok) throw new Error("Could not link the audience request");
      } catch {
        warning("The idea was saved, but the audience request could not be linked.", "Linking skipped");
      }
    }

    setSavingIdea(false);
    success(audienceRequestId ? "Idea saved and linked to the audience request." : "Idea saved successfully!", "Idea saved");
    if (audienceRequestId) {
      setAudienceRequestId(null);
      window.history.replaceState({}, "", "/add");
    }
    setTitle("");
    setDescription("");
    setStagedFootage([]);
    setStagedSources([]);
    setSimilar([]);
    setPinned(false);
    titleRef.current?.focus();
  }

  const selectedGame = games.find((g) => g.id === gameId) ?? null;
  const selectedGroups = selectedGroupIds
    .map((id) => groups.find((g) => g.id === id))
    .filter((g): g is IdeaGroup => Boolean(g));
  const checks = [
    { label: "Game", done: Boolean(gameId) },
    { label: "Title", done: Boolean(title.trim()) },
    { label: "Description", done: Boolean(description.trim()) },
  ];
  const canSave = checks.every((check) => check.done) && !savingIdea;

  const saveButton = (className = "") => (
    <Button type="submit" variant="primary" size="lg" disabled={!canSave} className={className}>
      {savingIdea ? "Saving idea..." : "Save idea"}
    </Button>
  );

  return (
    <div className={`${appPageRootClass} xl:flex`}>
      <AppSidebar activePage="addIdea" />

      <main className={`${appPageMainClass} pb-40 lg:pb-24`}>
        <div className="app-container max-w-6xl">
          <AppPageHeader
            title="Add Idea"
            description="Capture a game detail, secret or mechanic — and add a new game to your library right here if it isn’t there yet. Game, title and description are required."
            icon={<LightBulbIcon className="h-5 w-5" />}
            className="mb-4"
            action={audienceRequestId ? (
              <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-fuchsia-50 px-3 text-sm font-semibold text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-200">
                <ChatBubbleLeftRightIcon className="h-4 w-4" /> From an audience request
              </span>
            ) : undefined}
          />

          <form
            ref={formRef}
            onSubmit={saveIdea}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
            className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]"
          >
            <div className="min-w-0 space-y-5">
              {/* 1. Game */}
              <section className={cardClass} aria-labelledby="add-step-game">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 id="add-step-game" className={sectionTitleClass}><StepBadge n={1} done={Boolean(gameId)} /> Game</h2>
                  {!showCreateGame && (
                    <Button variant="ghost" size="sm" onClick={() => openNewGame()} className="text-accent">
                      <PlusIcon className="h-4 w-4" /> New game
                    </Button>
                  )}
                </div>
                <GamePicker
                  games={games}
                  selectedGameId={gameId}
                  onSelect={(g) => {
                    setGameId(g.id);
                    if (showCreateGame && !newGame.title.trim()) closeNewGame();
                  }}
                  onCreateGame={(t) => openNewGame(t)}
                />
                {showCreateGame && (
                  <NewGameForm
                    draft={newGame}
                    onChange={setNewGame}
                    onSave={() => void createGameInline()}
                    onCancel={closeNewGame}
                    saving={savingGame}
                  />
                )}
              </section>

              {/* 2. Idea */}
              <section className={cardClass} aria-labelledby="add-step-idea">
                <h2 id="add-step-idea" className={`${sectionTitleClass} mb-4`}><StepBadge n={2} done={Boolean(title.trim() && description.trim())} /> The idea</h2>
                <div className="space-y-5">
                  <Field label="Title">
                    <Input
                      ref={titleRef}
                      className="h-12 text-base font-semibold"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. NPCs remember if you robbed their store"
                    />
                  </Field>

                  {!loadingSimilar && similar.length > 0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10" role="status">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-800 dark:text-amber-200">
                        <ExclamationTriangleIcon className="h-4 w-4" /> You may already have this idea
                      </p>
                      <ul className="mt-2 space-y-1">
                        {similar.map((s) => (
                          <li key={s.id}>
                            <a href={`/idea/${s.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-amber-900 underline-offset-2 hover:underline dark:text-amber-100">
                              <TypeLabel typeKey={s.detail_type} className="text-amber-700 dark:text-amber-300" />
                              <span className="text-amber-500">·</span> {s.title}
                              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 opacity-60" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <FieldLabel>Type</FieldLabel>
                    <TypeChips value={detailType} onChange={setDetailType} />
                  </div>

                  <Field label="Description">
                    <Textarea
                      className="min-h-[160px] resize-y"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="How do you trigger it, what happens, and why is it interesting?"
                    />
                    <span className="mt-1 block text-right text-xs tabular-nums text-fg-4">{description.trim().length} characters</span>
                  </Field>
                </div>
              </section>

              {/* 3. Media */}
              <section className={cardClass} aria-labelledby="add-step-media">
                <h2 id="add-step-media" className={`${sectionTitleClass} mb-4`}>
                  <StepBadge n={3} done={stagedFootage.length + stagedSources.length > 0} /> Footage & sources
                  <span className="text-xs font-normal text-fg-4">Optional</span>
                </h2>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="min-w-0">
                    <FieldLabel>Footage / clips</FieldLabel>
                    <div className="flex gap-2">
                      <Input
                        placeholder="YouTube link or file path"
                        value={fp}
                        onChange={(e) => setFp(e.target.value)}
                        disabled={fetchingTitle}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleAddFootage();
                          }
                        }}
                        aria-label="Footage link or file path"
                      />
                      <Button variant="secondary" size="icon" onClick={() => void handleAddFootage()} disabled={fetchingTitle || !fp.trim()} aria-label="Add footage">
                        {fetchingTitle ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PlusIcon className="h-4 w-4" />}
                      </Button>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {stagedFootage.map((f, i) => (
                        <li key={`${f.file_path}-${i}`} className="rounded-2xl border border-line-soft bg-surface-muted p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-fg">
                                <FilmIcon className="h-4 w-4 shrink-0 text-fg-4" aria-hidden="true" />
                                <span className="truncate">{f.title || "Clip"}</span>
                              </p>
                              {f.channel_name && <p className="mt-0.5 truncate text-xs text-rose-600 dark:text-rose-300">{f.channel_name}</p>}
                              <div className="mt-1 truncate text-xs text-fg-4">{renderLinkOrText(f.file_path)}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setStagedFootage(stagedFootage.filter((_, idx) => idx !== i))}
                              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-fg-4 transition hover:bg-danger-soft hover:text-rose-500"
                              aria-label="Remove clip"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setStagedFootage(stagedFootage.map((item, idx) => (idx === i ? { ...item, downloaded: !item.downloaded } : item)))}
                            aria-pressed={f.downloaded}
                            className={`mt-2 inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-xs font-semibold transition ${f.downloaded ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-surface-strong text-fg-3 hover:text-fg"}`}
                          >
                            {f.downloaded ? <><CheckIcon className="h-3.5 w-3.5" aria-hidden="true" /> Downloaded</> : <><CloudArrowDownIcon className="h-3.5 w-3.5" aria-hidden="true" /> Need download</>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="min-w-0">
                    <FieldLabel>Sources / references</FieldLabel>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Article, wiki or Reddit URL"
                        value={srcUrl}
                        onChange={(e) => setSrcUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSource();
                          }
                        }}
                        aria-label="Source URL"
                      />
                      <Button variant="secondary" size="icon" onClick={handleAddSource} disabled={!srcUrl.trim()} aria-label="Add source">
                        <PlusIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {stagedSources.map((s, i) => (
                        <li key={`${s.url}-${i}`} className="flex items-center justify-between gap-2 rounded-xl border border-line-soft bg-surface-muted py-2 pl-3 pr-1.5 text-sm">
                          <span className="flex min-w-0 items-center gap-2">
                            <GlobeAltIcon className="h-4 w-4 shrink-0 text-fg-4" aria-hidden="true" />
                            <span className="truncate">{renderLinkOrText(s.url)}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setStagedSources(stagedSources.filter((_, idx) => idx !== i))}
                            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-fg-4 transition hover:bg-danger-soft hover:text-rose-500"
                            aria-label="Remove source"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            </div>

            {/* RIGHT: preview, organise, save */}
            <aside className="space-y-5 lg:sticky lg:top-6">
              <section className={cardClass} aria-label="Preview">
                <p className="mb-3 text-xs font-semibold text-fg-3">Preview in your library</p>
                <IdeaPreview
                  game={selectedGame}
                  title={title}
                  detailType={detailType}
                  pinned={pinned}
                  collectionName={selectedGroups[0]?.name}
                  extraCollections={Math.max(0, selectedGroups.length - 1)}
                />
              </section>

              <section className={cardClass} aria-labelledby="add-organise">
                <h2 id="add-organise" className={`${sectionTitleClass} mb-3`}>Collections</h2>
                <CollectionPicker
                  groups={groups}
                  selectedIds={selectedGroupIds}
                  onToggle={(id) => setSelectedGroupIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))}
                  onCreateGroup={createGroupInline}
                />
                <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-line-soft bg-surface-muted px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                    <StarSolidIcon className={`h-4 w-4 ${pinned ? "text-amber-500" : "text-fg-4"}`} /> Pin this idea
                  </span>
                  <input type="checkbox" role="switch" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="peer sr-only" />
                  <span className="relative h-6 w-11 shrink-0 rounded-full bg-surface-strong transition peer-checked:bg-amber-500 peer-focus-visible:ring-4 peer-focus-visible:ring-amber-500/30 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" aria-hidden="true" />
                </label>
              </section>

              <section className={`${cardClass} hidden lg:block`} aria-label="Save">
                <ul className="mb-4 space-y-1.5">
                  {checks.map((check) => (
                    <li key={check.label} className={`flex items-center gap-2 text-sm ${check.done ? "text-fg-2" : "text-fg-4"}`}>
                      {check.done ? <CheckIcon className="h-4 w-4 text-emerald-500" /> : <span className="mx-1 h-2 w-2 rounded-full border border-line-strong" />}
                      {check.label}
                    </li>
                  ))}
                </ul>
                {saveButton("w-full")}
                <p className="mt-2 text-center text-xs text-fg-4">Ctrl + Enter to save. The game stays selected for the next idea.</p>
              </section>
            </aside>

            {/* Phone/tablet save bar */}
            <div className="app-selection-bar fixed inset-x-0 bottom-0 z-[60] border-t border-line bg-surface/95 p-3 backdrop-blur lg:hidden">
              <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm text-fg-3">
                  {canSave ? "Ready to save" : `Missing: ${checks.filter((c) => !c.done).map((c) => c.label.toLowerCase()).join(", ")}`}
                </p>
                {saveButton("shrink-0")}
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
