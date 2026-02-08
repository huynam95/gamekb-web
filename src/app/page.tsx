"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ================= TYPES ================= */

// CẬP NHẬT: Thêm cover_url
type Game = { id: number; title: string; cover_url?: string | null };
type Group = { id: number; name: string };

type DetailRow = {
  id: number;
  title: string;
  priority: number;
  detail_type: string;
  game_id: number;
  pinned?: boolean;
  pinned_at?: string | null;
  created_at?: string;
};

/* ================= STYLES ================= */

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition";

const selectClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition cursor-pointer";

const btnBase =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold whitespace-nowrap cursor-pointer transition active:scale-[0.98]";

const btnPrimary =
  btnBase + " bg-slate-900 text-white shadow-md shadow-slate-900/10 hover:bg-slate-800";

/* ================= HELPERS ================= */

function Pill({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-200/50 bg-slate-50/80 px-2 py-0.5 text-xs font-medium text-slate-700 backdrop-blur-sm">
      {text}
    </span>
  );
}

function typeLabel(t: string) {
  const map: Record<string, string> = {
    small_detail: "Small detail",
    easter_egg: "Easter egg",
    npc_reaction: "NPC Reaction",
    physics: "Physics",
    troll: "Troll",
    punish: "Punish",
  };
  return map[t] ?? t;
}

function priorityLabel(p: number) {
  if (p === 1) return "High";
  if (p === 3) return "Normal";
  return "Low";
}

function yyyyMmDdLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ================= COMPONENTS ================= */

function GameBadge({ title }: { title: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
      🎮 {title}
    </span>
  );
}

// CẬP NHẬT: IdeaItem hiển thị ảnh nền
function IdeaItem({ r, game }: { r: DetailRow; game?: Game }) {
  const hasCover = !!game?.cover_url;

  return (
    <li className="group h-full">
      <a
        href={`/idea/${r.id}`}
        className="relative block h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
      >
        {/* NỀN ẢNH (Nếu có) */}
        {hasCover && (
          <>
            {/* Ảnh gốc mờ */}
            <div 
              className="absolute inset-0 z-0 bg-cover bg-center opacity-10 transition group-hover:opacity-15 group-hover:scale-105"
              style={{ backgroundImage: `url(${game.cover_url})` }}
            />
            {/* Lớp phủ gradient để chữ dễ đọc hơn */}
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/40 to-white/90" />
          </>
        )}

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2.5">
              <GameBadge title={game?.title ?? "Unknown Game"} />
            </div>

            <h3 className="line-clamp-2 text-base font-bold text-slate-900 group-hover:text-blue-600">
              {r.title}
            </h3>
            
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Pill text={typeLabel(r.detail_type)} />
            </div>
          </div>

          <div
            className={`shrink-0 rounded-lg border px-2 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md ${
              r.priority === 1
                ? "border-rose-200 bg-rose-50/80 text-rose-700"
                : r.priority === 5
                ? "border-slate-200 bg-slate-100/80 text-slate-500"
                : "border-slate-200 bg-white/80 text-slate-700"
            }`}
          >
            {priorityLabel(r.priority)}
          </div>
        </div>
      </a>
    </li>
  );
}

function ComboBox({
  placeholder,
  items,
  selectedId,
  onChange,
  allowAllLabel,
}: {
  placeholder: string;
  items: { id: number; name: string }[];
  selectedId: number | "";
  onChange: (id: number | "") => void;
  allowAllLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return items.find((x) => x.id === selectedId) ?? null;
  }, [items, selectedId]);

  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return items.slice(0, 50);
    return items.filter((x) => x.name.toLowerCase().includes(s)).slice(0, 50);
  }, [items, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={boxRef} className="relative w-full">
      <button
        type="button"
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-left text-sm text-slate-900 shadow-sm transition hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="block truncate">
          {selected ? selected.name : <span className="text-slate-500">{placeholder}</span>}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-full min-w-[200px] rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="p-2">
            <input
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none focus:border-blue-400 focus:bg-white"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-auto p-1 pt-0">
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100"
              onClick={() => {
                onChange("");
                setOpen(false);
                setQuery("");
              }}
            >
              {allowAllLabel}
            </button>
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500">No matches.</div>
            ) : (
              <ul>
                {filtered.map((x) => (
                  <li key={x.id}>
                    <button
                      type="button"
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-900 hover:bg-blue-50 hover:text-blue-700"
                      onClick={() => {
                        onChange(x.id);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      {x.name}
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

/* ================= MAIN PAGE ================= */

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupCounts, setGroupCounts] = useState<Map<number, number>>(new Map());

  const [err, setErr] = useState<string | null>(null);

  // Data states
  const [pinned, setPinned] = useState<DetailRow[]>([]);
  const [daily, setDaily] = useState<DetailRow[]>([]);
  const [loadingDefault, setLoadingDefault] = useState(true);

  const [ideas, setIdeas] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [random5, setRandom5] = useState<DetailRow[]>([]);
  const [loadingRandom, setLoadingRandom] = useState(false);

  // Filter states
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [gameId, setGameId] = useState<number | "">("");
  const [groupId, setGroupId] = useState<number | "">("");
  const [type, setType] = useState<string | "">("");
  const [priority, setPriority] = useState<number | "">("");

  // UI states
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const isDefaultView = useMemo(() => {
    return !debouncedQ.trim() && !gameId && !groupId && !type && !priority;
  }, [debouncedQ, gameId, groupId, type, priority]);

  // CẬP NHẬT: Map gameID sang Object Game (chứa cả title và cover_url)
  const gameMap = useMemo(() => {
    const m = new Map<number, Game>();
    for (const g of games) m.set(g.id, g);
    return m;
  }, [games]);

  async function refreshGroups() {
    const { data, error } = await supabase.from("idea_groups").select("id,name").order("name");
    if (error) {
      setErr(error.message);
      return;
    }
    setGroups((data ?? []) as Group[]);

    const { data: items, error: e2 } = await supabase.from("idea_group_items").select("group_id");
    if (!e2) {
      const m = new Map<number, number>();
      for (const row of items ?? []) {
        const gid = Number((row as any).group_id);
        m.set(gid, (m.get(gid) ?? 0) + 1);
      }
      setGroupCounts(m);
    }
  }

  useEffect(() => {
    // CẬP NHẬT: Lấy thêm cover_url
    supabase.from("games").select("id,title,cover_url").order("title").then(({ data }) => setGames((data ?? []) as Game[]));
    refreshGroups();
  }, []);

  // LOAD DEFAULT VIEW
  async function loadDefaultView() {
    setLoadingDefault(true);
    setErr(null);

    const { data: p } = await supabase
      .from("details")
      .select("id,title,priority,detail_type,game_id,pinned,pinned_at,created_at")
      .eq("status", "idea")
      .eq("pinned", true)
      .order("pinned_at", { ascending: false });

    const seedDate = yyyyMmDdLocal(new Date());
    const { data: d } = await supabase.rpc("get_daily_seed_ideas", {
      seed_date: seedDate,
      take_count: 5,
    });

    setPinned((p ?? []) as DetailRow[]);
    setDaily((d ?? []) as DetailRow[]);
    setLoadingDefault(false);
  }

  // LOAD FILTERED IDEAS
  async function loadFilteredIdeas() {
    setLoading(true);
    setErr(null);

    let groupDetailIds: number[] | null = null;

    if (groupId) {
      const { data: gi } = await supabase.from("idea_group_items").select("detail_id").eq("group_id", groupId);
      groupDetailIds = (gi ?? []).map((x: any) => Number(x.detail_id));
      if (groupDetailIds.length === 0) {
        setIdeas([]);
        setLoading(false);
        return;
      }
    }

    let query = supabase
      .from("details")
      .select("id,title,priority,detail_type,game_id,pinned,pinned_at,created_at")
      .eq("status", "idea");

    if (groupDetailIds) query = query.in("id", groupDetailIds);
    if (gameId) query = query.eq("game_id", gameId);
    if (type) query = query.eq("detail_type", type);
    if (priority) query = query.eq("priority", priority);
    if (debouncedQ.trim()) query = query.ilike("title", `%${debouncedQ.trim()}%`);

    const { data, error } = await query
      .order("pinned", { ascending: false })
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) setErr(error.message);
    setIdeas((data ?? []) as DetailRow[]);
    setLoading(false);
  }

  useEffect(() => {
    if (isDefaultView) loadDefaultView();
    else loadFilteredIdeas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDefaultView, debouncedQ, gameId, groupId, type, priority]);

  // ACTIONS
  async function getRandom5() {
    setLoadingRandom(true);
    const { data } = await supabase.rpc("get_random_ideas", { take_count: 5, include_pinned: true });
    setLoadingRandom(false);
    setRandom5((data ?? []) as DetailRow[]);
  }

  async function createGroupOnHome() {
    if (!newGroupName.trim()) return;
    const { error } = await supabase.from("idea_groups").insert({ name: newGroupName.trim() });
    if (error) {
      setErr(error.message);
      return;
    }
    setShowCreateGroup(false);
    setNewGroupName("");
    await refreshGroups();
  }

  async function deleteGroup(g: Group) {
    if (!confirm(`Delete group "${g.name}"?`)) return;
    await supabase.from("idea_groups").delete().eq("id", g.id);
    if (groupId === g.id) setGroupId("");
    await refreshGroups();
  }

  const resetFilters = () => {
    setQ("");
    setGameId("");
    setGroupId("");
    setType("");
    setPriority("");
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-16 items-center border-b border-slate-100 px-6">
          <div className="text-xl font-bold tracking-tight text-slate-900">GameKB 🎮</div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <nav className="space-y-1">
            <button onClick={resetFilters} className={`flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium transition ${!groupId && isDefaultView ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
              🏠 Home
            </button>
            <button onClick={getRandom5} className="flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900">
              {loadingRandom ? "🎲 Rolling..." : "🎲 Random 5"}
            </button>
            <a href="/games/new" className="flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900">
              🕹️ Add Game
            </a>
          </nav>

          <div className="mt-8 mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Groups
          </div>
          <nav className="space-y-1">
            {groups.map((g) => {
              const isActive = groupId === g.id;
              return (
                <div key={g.id} className="group flex items-center gap-1">
                  <button onClick={() => { setGroupId(g.id); if (g.id !== groupId) { setQ(""); setGameId(""); } }} className={`flex flex-1 items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                    <span className="truncate">{g.name}</span>
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                      {groupCounts.get(g.id) ?? 0}
                    </span>
                  </button>
                  <button onClick={() => deleteGroup(g)} className="hidden text-slate-400 hover:text-rose-500 group-hover:block" title="Delete group">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              );
            })}
          </nav>

          <button onClick={() => setShowCreateGroup(true)} className="mt-4 flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700">
            + New Group
          </button>

          {showCreateGroup && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <input className="mb-2 block w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 outline-none" placeholder="Group Name" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} autoFocus />
              <div className="flex items-center gap-2">
                <button onClick={createGroupOnHome} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">Create</button>
                <button onClick={() => setShowCreateGroup(false)} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 pl-0 md:pl-64">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <header className="mb-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input type="text" className="block h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-base text-slate-900 shadow-sm placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition" placeholder="Find an idea..." value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <a href="/add" className={`${btnPrimary} h-12 px-6 text-base`}>+ Add Idea</a>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-3/4">
              <ComboBox placeholder="Game" items={games.map((g) => ({ id: g.id, name: g.title }))} selectedId={gameId} onChange={setGameId} allowAllLabel="All games" />
              <div className="relative"><select className={selectClass} value={type} onChange={(e) => setType(e.target.value)}><option value="">All Types</option><option value="small_detail">Small detail</option><option value="easter_egg">Easter egg</option><option value="npc_reaction">NPC reaction</option><option value="physics">Physics</option><option value="troll">Troll</option><option value="punish">Punish</option></select></div>
              <div className="relative"><select className={selectClass} value={priority} onChange={(e) => setPriority(e.target.value ? Number(e.target.value) : "")}><option value="">All Priorities</option><option value={1}>High Priority</option><option value={3}>Normal</option><option value={5}>Low</option></select></div>
              {!isDefaultView && <button onClick={resetFilters} className="text-sm font-medium text-rose-600 hover:text-rose-700 hover:underline text-left px-2">Clear filters</button>}
            </div>
          </header>

          {err && <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{err}</div>}

          {random5.length > 0 && (
            <section className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">🎲 Random Picks</h2><button onClick={() => setRandom5([])} className="text-sm text-slate-500 hover:text-slate-900">Clear</button></div>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {random5.map((r) => <IdeaItem key={r.id} r={r} game={gameMap.get(r.game_id)} />)}
              </ul>
            </section>
          )}

          {isDefaultView ? (
            <div className="grid gap-8 lg:grid-cols-2">
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-lg">⭐</span><h2 className="text-xl font-bold text-slate-900">Pinned Ideas</h2></div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{pinned.length}</span>
                </div>
                {loadingDefault ? <div className="h-32 rounded-2xl border border-slate-100 bg-white p-4 text-slate-400">Loading pinned...</div> : pinned.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center"><p className="text-sm text-slate-500">No pinned ideas yet.</p></div> : <ul className="space-y-3">{pinned.map((r) => <IdeaItem key={r.id} r={r} game={gameMap.get(r.game_id)} />)}</ul>}
              </section>

              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-lg">🧠</span><h2 className="text-xl font-bold text-slate-900">Today's Picks</h2></div>
                  <span className="text-xs text-slate-400">{yyyyMmDdLocal(new Date())}</span>
                </div>
                {loadingDefault ? <div className="h-32 rounded-2xl border border-slate-100 bg-white p-4 text-slate-400">Loading daily picks...</div> : daily.length === 0 ? <div className="p-4 text-sm text-slate-500">No ideas available.</div> : <ul className="space-y-3">{daily.map((r) => <IdeaItem key={r.id} r={r} game={gameMap.get(r.game_id)} />)}</ul>}
              </section>
            </div>
          ) : (
            <section>
              <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">{loading ? "Searching..." : `${ideas.length} Results`}</h2>{groupId && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">Group: {groups.find((g) => g.id === groupId)?.name}</span>}</div>
              {loading ? <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200" />)}</div> : ideas.length === 0 ? <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-12"><p className="text-lg font-medium text-slate-900">No ideas found</p><button onClick={resetFilters} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">Clear all filters</button></div> : <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{ideas.map((r) => <IdeaItem key={r.id} r={r} game={gameMap.get(r.game_id)} />)}</ul>}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}