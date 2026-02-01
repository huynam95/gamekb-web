"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
  priority: number;
};

const selectClass =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400";
const inputClass =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400";
const buttonClass =
  "h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50";
const ghostButtonClass =
  "h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100";

function GameCombobox({
  games,
  selectedGameId,
  onSelect,
  onCreateGame,
}: {
  games: Game[];
  selectedGameId: number | "";
  onSelect: (g: Game) => void;
  onCreateGame: (prefillTitle: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement | null>(null);

  const selectedGame = useMemo(() => {
    if (!selectedGameId) return null;
    return games.find((g) => g.id === selectedGameId) ?? null;
  }, [games, selectedGameId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return games.slice(0, 50);
    return games.filter((g) => g.title.toLowerCase().includes(q)).slice(0, 50);
  }, [games, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <label className="grid gap-1">
        <span className="text-sm font-medium text-slate-800">Game</span>

        <button
          type="button"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-left text-sm text-slate-900 outline-none hover:bg-slate-50 focus:border-slate-400"
          onClick={() => setOpen((v) => !v)}
        >
          {selectedGame ? selectedGame.title : "— Select a game —"}
        </button>
      </label>

      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="p-2">
            <input
              className={inputClass}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search games…"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-auto p-2 pt-0">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">No matches</div>
                <div className="mt-1 text-sm text-slate-600">
                  Create a new game with this name.
                </div>

                <button
                  type="button"
                  className="mt-3 h-10 w-full rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                  onClick={() => {
                    setOpen(false);
                    onCreateGame(query.trim());
                  }}
                >
                  + Add new game
                </button>
              </div>
            ) : (
              <ul className="space-y-1">
                {filtered.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100"
                      onClick={() => {
                        onSelect(g);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      {g.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-200 p-2 text-xs text-slate-500">
            Showing up to 50 results
          </div>
        </div>
      )}
    </div>
  );
}

function typeLabel(t: string) {
  switch (t) {
    case "small_detail":
      return "Small detail";
    case "easter_egg":
      return "Easter egg";
    case "npc_reaction":
      return "NPC reaction";
    case "physics":
      return "Physics";
    case "troll":
      return "Troll";
    case "punish":
      return "Punish";
    default:
      return t;
  }
}

function priorityLabel(p: number) {
  if (p === 1) return "High";
  if (p === 3) return "Normal";
  return "Low";
}

export default function AddIdeaPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [gameId, setGameId] = useState<number | "">("");

  // 4 fields
  const [title, setTitle] = useState("");
  const [detailType, setDetailType] = useState("small_detail");
  const [priority, setPriority] = useState(3);

  // Duplicate detection
  const [debouncedTitle, setDebouncedTitle] = useState("");
  const [similar, setSimilar] = useState<SimilarIdea[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Inline create game UI
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [newGameTitle, setNewGameTitle] = useState("");
  const [newGameYear, setNewGameYear] = useState("");
  const [newGameGenres, setNewGameGenres] = useState("");
  const [savingGame, setSavingGame] = useState(false);

  const [savingIdea, setSavingIdea] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const gameMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const g of games) m.set(g.id, g.title);
    return m;
  }, [games]);

  async function loadGames(selectId?: number) {
    const { data, error } = await supabase
      .from("games")
      .select("id,title,release_year,genres_text")
      .order("title");

    if (error) {
      setMessage({ kind: "err", text: error.message });
      return;
    }

    const list = (data ?? []) as Game[];
    setGames(list);

    if (selectId) setGameId(selectId);
  }

  useEffect(() => {
    loadGames();
  }, []);

  // Debounce title typing
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTitle(title), 300);
    return () => clearTimeout(t);
  }, [title]);

  // Fetch similar ideas when debouncedTitle changes
  useEffect(() => {
    async function run() {
      const q = debouncedTitle.trim();
      if (q.length < 4) {
        setSimilar([]);
        return;
      }

      setLoadingSimilar(true);

      const { data, error } = await supabase.rpc("search_similar_ideas", {
        q,
        gid: gameId ? Number(gameId) : null,
      });

      if (error) {
        // If RPC fails, show nothing but keep UX smooth
        setSimilar([]);
        setLoadingSimilar(false);
        return;
      }

      setSimilar((data ?? []) as SimilarIdea[]);
      setLoadingSimilar(false);
    }

    run();
  }, [debouncedTitle, gameId]);

  const canSaveIdea = useMemo(() => {
    return Boolean(gameId) && title.trim().length > 0 && !savingIdea;
  }, [gameId, title, savingIdea]);

  function openCreateGame(prefillTitle: string) {
    setShowCreateGame(true);
    setNewGameTitle(prefillTitle || "");
    setNewGameYear("");
    setNewGameGenres("");
    setMessage(null);
  }

  async function createGameInline() {
    if (!newGameTitle.trim()) {
      setMessage({ kind: "err", text: "Game title is required." });
      return;
    }

    setSavingGame(true);
    setMessage(null);

    const yearNum = newGameYear.trim() ? Number(newGameYear.trim()) : null;
    if (yearNum !== null && !Number.isFinite(yearNum)) {
      setMessage({ kind: "err", text: "Release year must be a number (or empty)." });
      setSavingGame(false);
      return;
    }

    const { data, error } = await supabase
      .from("games")
      .insert({
        title: newGameTitle.trim(),
        release_year: yearNum,
        genres_text: newGameGenres.trim() || null,
      })
      .select("id")
      .single();

    if (error) {
      setMessage({ kind: "err", text: error.message });
      setSavingGame(false);
      return;
    }

    const newId = data?.id as number;
    await loadGames(newId);

    setShowCreateGame(false);
    setSavingGame(false);
    setMessage({ kind: "ok", text: "Game created ✔" });
  }

  async function saveIdea(e: React.FormEvent) {
    e.preventDefault();
    if (!canSaveIdea) return;

    setSavingIdea(true);
    setMessage(null);

    const { error } = await supabase.from("details").insert({
      game_id: gameId,
      title: title.trim(),
      detail_type: detailType,
      priority,
      status: "idea",
    });

    if (error) {
      setMessage({ kind: "err", text: error.message });
      setSavingIdea(false);
      return;
    }

    setMessage({ kind: "ok", text: "Idea saved ✔" });
    setTitle("");
    setDetailType("small_detail");
    setPriority(3);
    setSimilar([]);
    setSavingIdea(false);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Add Idea</h1>
            <p className="mt-1 text-sm text-slate-600">
              Duplicate detection is on. It will warn you while typing.
            </p>
          </div>

          <a href="/" className={ghostButtonClass}>
            Back
          </a>
        </div>

        <form
          onSubmit={saveIdea}
          className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <GameCombobox
            games={games}
            selectedGameId={gameId}
            onSelect={(g) => setGameId(g.id)}
            onCreateGame={openCreateGame}
          />

          {showCreateGame && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Create new game</div>
                  <div className="text-xs text-slate-600">Title required. Year/genres optional.</div>
                </div>
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                  onClick={() => setShowCreateGame(false)}
                >
                  Close
                </button>
              </div>

              <div className="mt-3 grid gap-3">
                <label className="grid gap-1">
                  <span className="text-sm font-medium text-slate-800">Title *</span>
                  <input
                    className={inputClass}
                    value={newGameTitle}
                    onChange={(e) => setNewGameTitle(e.target.value)}
                    placeholder="God of War Ragnarök"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-slate-800">Release year</span>
                    <input
                      className={inputClass}
                      value={newGameYear}
                      onChange={(e) => setNewGameYear(e.target.value)}
                      placeholder="2022"
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-slate-800">Genres</span>
                    <input
                      className={inputClass}
                      value={newGameGenres}
                      onChange={(e) => setNewGameGenres(e.target.value)}
                      placeholder="action, adventure"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  className={buttonClass}
                  disabled={savingGame}
                  onClick={createGameInline}
                >
                  {savingGame ? "Saving..." : "Create game"}
                </button>
              </div>
            </div>
          )}

          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-800">Title</span>
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Thor's tooth stays on the ground"
            />
          </label>

          {/* Duplicate suggestions */}
          {loadingSimilar && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              Checking duplicates…
            </div>
          )}

          {!loadingSimilar && similar.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-sm font-semibold text-amber-900">
                Possible duplicates
              </div>
              <div className="mt-1 text-xs text-amber-800">
                Click one to review before saving.
              </div>

              <ul className="mt-3 space-y-2">
                {similar.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`/idea/${s.id}`}
                      className="block rounded-xl border border-amber-200 bg-white p-3 hover:bg-amber-100"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <div className="text-sm font-semibold text-slate-900">
                        {s.title}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-700">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                          {gameMap.get(s.game_id) ?? "Unknown game"}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                          {typeLabel(s.detail_type)}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                          {priorityLabel(s.priority)}
                        </span>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-800">Type</span>
            <select
              className={selectClass}
              value={detailType}
              onChange={(e) => setDetailType(e.target.value)}
            >
              <option value="small_detail">Small detail</option>
              <option value="easter_egg">Easter egg</option>
              <option value="npc_reaction">NPC reaction</option>
              <option value="physics">Physics</option>
              <option value="troll">Troll</option>
              <option value="punish">Punish</option>
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-800">Priority</span>
            <select
              className={selectClass}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
            >
              <option value={1}>High</option>
              <option value={3}>Normal</option>
              <option value={5}>Low</option>
            </select>
          </label>

          <button disabled={!canSaveIdea} className={buttonClass}>
            {savingIdea ? "Saving..." : "Save idea"}
          </button>

          {message && (
            <div
              className={
                "rounded-xl border px-3 py-2 text-sm " +
                (message.kind === "ok"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-rose-200 bg-rose-50 text-rose-900")
              }
            >
              {message.text}
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
