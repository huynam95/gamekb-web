"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
  priority: number;
};

type IdeaGroup = {
  id: number;
  name: string;
  description: string | null;
};

/* ================= STYLES (MATCHING HOME) ================= */

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition";

const textareaClass =
  "min-h-[140px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition resize-y";

const selectClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition cursor-pointer";

const btnBase =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold whitespace-nowrap cursor-pointer transition active:scale-[0.98]";

const btnPrimary =
  btnBase + " bg-slate-900 text-white shadow-md shadow-slate-900/10 hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed";

const btnGhost =
  btnBase + " border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900";

const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

/* ================= HELPERS ================= */

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
      <label className="mb-1 block text-sm font-semibold text-slate-900">Game *</label>
      <button
        type="button"
        className={`flex w-full items-center justify-between text-left ${inputClass} ${
          !selectedGame ? "text-slate-500" : ""
        }`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">{selectedGame ? selectedGame.title : "Select a game..."}</span>
        <svg className="h-4 w-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="p-2">
            <input
              className={inputClass}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search game..."
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-auto p-1 pt-0">
            {filtered.length === 0 ? (
              <div className="p-3 text-center">
                <div className="text-xs text-slate-500">No game found.</div>
                <button
                  type="button"
                  className="mt-2 w-full rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200"
                  onClick={() => {
                    setOpen(false);
                    onCreateGame(query.trim());
                  }}
                >
                  + Create "{query}"
                </button>
              </div>
            ) : (
              <ul>
                {filtered.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-900 hover:bg-blue-50 hover:text-blue-700"
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
        </div>
      )}
    </div>
  );
}

function GroupPicker({
  groups,
  selectedIds,
  onToggle,
  onCreateGroup,
}: {
  groups: IdeaGroup[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  onCreateGroup: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return groups.slice(0, 50);
    return groups.filter((g) => g.name.toLowerCase().includes(s)).slice(0, 50);
  }, [groups, q]);

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
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-900">Groups</label>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          {open ? "Done" : "+ Add"}
        </button>
      </div>

      {/* Selected Tags */}
      <div className="flex flex-wrap gap-2">
        {selectedIds.length === 0 && !open && (
          <span className="text-xs text-slate-400 italic">No groups selected</span>
        )}
        {selectedIds.map((id) => {
          const g = groups.find((x) => x.id === id);
          if (!g) return null;
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
            >
              {g.name}
              <button
                type="button"
                onClick={() => onToggle(id)}
                className="ml-1 text-blue-400 hover:text-blue-900"
              >
                ×
              </button>
            </span>
          );
        })}
      </div>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="p-2">
            <input
              className={inputClass}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search groups..."
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-auto p-1 pt-0">
            {filtered.length === 0 ? (
              <div className="p-2 text-center">
                <button
                  type="button"
                  className="w-full rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-200"
                  onClick={() => {
                    if (q.trim()) onCreateGroup(q.trim());
                    setQ("");
                  }}
                >
                  + Create "{q}"
                </button>
              </div>
            ) : (
              <ul>
                {filtered.map((g) => {
                  const isActive = selectedIds.includes(g.id);
                  return (
                    <li key={g.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100"
                        onClick={() => onToggle(g.id)}
                      >
                        <span>{g.name}</span>
                        {isActive && <span className="text-blue-600">✓</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= MAIN COMPONENT ================= */

export default function AddIdeaPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [groups, setGroups] = useState<IdeaGroup[]>([]);
  const [gameId, setGameId] = useState<number | "">("");

  // Core fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [detailType, setDetailType] = useState("small_detail");
  const [priority, setPriority] = useState(3);
  const [spoiler, setSpoiler] = useState(0);
  const [confidence, setConfidence] = useState(3);
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
  const [stagedFootage, setStagedFootage] = useState<{ file_path: string; notes?: string }[]>([]);
  const [srcUrl, setSrcUrl] = useState("");
  const [stagedSources, setStagedSources] = useState<{ url: string; reliability: number }[]>([]);

  const [savingIdea, setSavingIdea] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Data Loading
  useEffect(() => {
    supabase.from("games").select("*").order("title").then(({ data }) => setGames((data ?? []) as Game[]));
    supabase.from("idea_groups").select("*").order("name").then(({ data }) => setGroups((data ?? []) as IdeaGroup[]));
  }, []);

  // Duplicate Check
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
    supabase.rpc("search_similar_ideas", { q: debouncedTitle.trim(), gid: gameId ? Number(gameId) : null })
      .then(({ data }) => {
        setSimilar((data ?? []) as SimilarIdea[]);
        setLoadingSimilar(false);
      });
  }, [debouncedTitle, gameId]);

  // Actions
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
      // reload games
      const { data: gs } = await supabase.from("games").select("*").order("title");
      setGames((gs ?? []) as Game[]);
    }
  }

  async function createGroupInline(name: string) {
    const { data } = await supabase.from("idea_groups").insert({ name }).select().single();
    if (data) {
      setGroups((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedGroupIds((prev) => [...prev, data.id]);
    }
  }

  async function saveIdea(e: React.FormEvent) {
    e.preventDefault();
    if (!gameId || !title.trim() || !description.trim()) {
      setMessage({ kind: "err", text: "Please fill in Game, Title, and Description." });
      return;
    }

    setSavingIdea(true);
    setMessage(null);

    // 1. Insert Detail
    const { data: idea, error } = await supabase
      .from("details")
      .insert({
        game_id: gameId,
        title: title.trim(),
        description: description.trim(),
        detail_type: detailType,
        priority,
        spoiler_level: spoiler,
        confidence,
        status: "idea",
      })
      .select("id")
      .single();

    if (error || !idea) {
      setMessage({ kind: "err", text: error?.message || "Error saving." });
      setSavingIdea(false);
      return;
    }

    const detailId = idea.id;

    // 2. Parallel Inserts
    const promises = [];
    if (selectedGroupIds.length) {
      promises.push(
        supabase.from("idea_group_items").insert(
          selectedGroupIds.map((gid) => ({ group_id: gid, detail_id: detailId, position: 0 }))
        )
      );
    }
    if (stagedFootage.length) {
      promises.push(
        supabase.from("footage").insert(
          stagedFootage.map((f) => ({ detail_id: detailId, file_path: f.file_path, notes: f.notes }))
        )
      );
    }
    if (stagedSources.length) {
      promises.push(
        supabase.from("sources").insert(
          stagedSources.map((s) => ({ detail_id: detailId, url: s.url, reliability: s.reliability }))
        )
      );
    }

    await Promise.all(promises);
    setSavingIdea(false);
    setMessage({ kind: "ok", text: "Idea saved successfully!" });
    
    // Reset form
    setTitle("");
    setDescription("");
    setStagedFootage([]);
    setStagedSources([]);
    setSimilar([]);
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <div className="mx-auto max-w-5xl px-4 py-8">
        
        {/* HEADER */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Add New Idea</h1>
            <p className="text-sm text-slate-500">Document a detail, easter egg, or mechanic.</p>
          </div>
          <div className="flex gap-3">
            <a href="/" className={btnGhost}>Cancel</a>
          </div>
        </div>

        {/* FEEDBACK MSG */}
        {message && (
          <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${message.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={saveIdea} className="grid gap-6 lg:grid-cols-3">
          
          {/* LEFT COLUMN: CONTENT */}
          <div className="space-y-6 lg:col-span-2">
            
            {/* Main Info Card */}
            <div className={cardClass}>
              <div className="space-y-5">
                
                {/* Game Select */}
                <GameCombobox
                  games={games}
                  selectedGameId={gameId}
                  onSelect={(g) => setGameId(g.id)}
                  onCreateGame={(t) => {
                    setNewGameTitle(t);
                    setShowCreateGame(true);
                  }}
                />

                {/* Create Game Modal (Inline) */}
                {showCreateGame && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <h4 className="mb-2 text-sm font-bold text-blue-900">New Game</h4>
                    <div className="flex gap-2">
                      <input 
                        className={inputClass} 
                        value={newGameTitle} 
                        onChange={(e) => setNewGameTitle(e.target.value)} 
                        placeholder="Game Title"
                      />
                      <button type="button" onClick={createGameInline} disabled={savingGame} className={btnPrimary}>
                        {savingGame ? "Saving..." : "Create"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Title */}
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-900">Title *</span>
                  <input
                    className={inputClass}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. NPC reactions to rain"
                  />
                </label>

                {/* Duplicates Warning */}
                {!loadingSimilar && similar.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-800">Possible Duplicates</div>
                    <ul className="space-y-1">
                      {similar.map(s => (
                        <li key={s.id} className="text-sm text-amber-900">
                          • <a href={`/idea/${s.id}`} target="_blank" className="hover:underline">{s.title}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Description */}
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-900">Description *</span>
                  <textarea
                    className={textareaClass}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the detail thoroughly..."
                  />
                </label>
              </div>
            </div>

            {/* Media & Sources Card */}
            <div className={cardClass}>
              <h3 className="mb-4 text-base font-bold text-slate-900">Attachments</h3>
              
              <div className="grid gap-6 md:grid-cols-2">
                {/* Footage */}
                <div>
                  <div className="mb-2 text-sm font-semibold text-slate-700">Footage / Files</div>
                  <div className="mb-3 flex gap-2">
                    <input 
                      className={inputClass} 
                      placeholder="Link or path..." 
                      value={fp} 
                      onChange={(e) => setFp(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); if(fp) { setStagedFootage([...stagedFootage, { file_path: fp }]); setFp(""); } }
                      }}
                    />
                    <button type="button" className={btnGhost} onClick={() => { if(fp) { setStagedFootage([...stagedFootage, { file_path: fp }]); setFp(""); } }}>+</button>
                  </div>
                  <ul className="space-y-2">
                    {stagedFootage.map((f, i) => (
                      <li key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                        <span className="truncate font-medium text-slate-700">{f.file_path}</span>
                        <button type="button" onClick={() => setStagedFootage(stagedFootage.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-rose-500">×</button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Sources */}
                <div>
                  <div className="mb-2 text-sm font-semibold text-slate-700">Sources / URLs</div>
                  <div className="mb-3 flex gap-2">
                    <input 
                      className={inputClass} 
                      placeholder="Source URL..." 
                      value={srcUrl} 
                      onChange={(e) => setSrcUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); if(srcUrl) { setStagedSources([...stagedSources, { url: srcUrl, reliability: 3 }]); setSrcUrl(""); } }
                      }}
                    />
                    <button type="button" className={btnGhost} onClick={() => { if(srcUrl) { setStagedSources([...stagedSources, { url: srcUrl, reliability: 3 }]); setSrcUrl(""); } }}>+</button>
                  </div>
                  <ul className="space-y-2">
                    {stagedSources.map((s, i) => (
                      <li key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                        <span className="truncate font-medium text-slate-700">{s.url}</span>
                        <button type="button" onClick={() => setStagedSources(stagedSources.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-rose-500">×</button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: META & ACTIONS */}
          <div className="space-y-6">
            
            {/* Publish Actions */}
            <div className={cardClass}>
              <div className="mb-4 text-sm font-bold text-slate-900">Publishing</div>
              <button 
                type="submit" 
                disabled={!gameId || !title || savingIdea} 
                className={`${btnPrimary} w-full h-12 text-base`}
              >
                {savingIdea ? "Saving..." : "Save Idea"}
              </button>
            </div>

            {/* Properties */}
            <div className={cardClass}>
              <h3 className="mb-4 text-sm font-bold text-slate-900">Properties</h3>
              <div className="space-y-4">
                
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-500 uppercase">Type</span>
                  <select className={selectClass} value={detailType} onChange={(e) => setDetailType(e.target.value)}>
                    <option value="small_detail">Small detail</option>
                    <option value="easter_egg">Easter egg</option>
                    <option value="npc_reaction">NPC reaction</option>
                    <option value="physics">Physics</option>
                    <option value="troll">Troll</option>
                    <option value="punish">Punish</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-500 uppercase">Priority</span>
                  <select className={selectClass} value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
                    <option value={1}>High (Must do)</option>
                    <option value={3}>Normal</option>
                    <option value={5}>Low</option>
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-500 uppercase">Spoiler</span>
                    <select className={selectClass} value={spoiler} onChange={(e) => setSpoiler(Number(e.target.value))}>
                      <option value={0}>None</option>
                      <option value={1}>Mild</option>
                      <option value={2}>Story</option>
                      <option value={3}>Ending</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-500 uppercase">Confidence</span>
                    <select className={selectClass} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))}>
                      <option value={1}>Low</option>
                      <option value={3}>Medium</option>
                      <option value={5}>Verified</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>

            {/* Groups */}
            <div className={cardClass}>
              <GroupPicker
                groups={groups}
                selectedIds={selectedGroupIds}
                onToggle={(id) => setSelectedGroupIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                onCreateGroup={createGroupInline}
              />
            </div>

          </div>
        </form>
      </div>
    </main>
  );
}