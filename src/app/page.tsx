"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Game = { id: number; title: string };
type Group = { id: number; name: string };

type GroupCountRow = { group_id: number; cnt: number };

type DetailRow = {
  id: number;
  title: string;
  priority: number;
  detail_type: string;
  game_id: number;
  pinned?: boolean;
  pinned_at?: string | null;
};

const pillClass =
  "rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700";

function Pill({ text }: { text: string }) {
  return <span className={pillClass}>{text}</span>;
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

const inputClass =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400";
const selectClass =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400";
const buttonClass =
  "h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50";
const ghostButtonClass =
  "h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-100";

function yyyyMmDdLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ComboBox({
  label,
  placeholder,
  items,
  selectedId,
  onChange,
  allowAllLabel,
}: {
  label: string;
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
    <div ref={boxRef} className="relative grid gap-1">
      <span className="text-sm font-medium text-slate-800">{label}</span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-left text-sm text-slate-900 hover:bg-slate-50"
          onClick={() => setOpen((v) => !v)}
        >
          {selected ? selected.name : allowAllLabel}
        </button>

        {selectedId && (
          <button
            type="button"
            className={ghostButtonClass}
            onClick={() => {
              onChange("");
              setQuery("");
              setOpen(false);
            }}
            title="Clear"
          >
            Clear
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-20 mt-12 w-full rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="p-2">
            <input
              className={inputClass}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-auto p-2 pt-0">
            <button
              type="button"
              className="mb-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100"
              onClick={() => {
                onChange("");
                setOpen(false);
                setQuery("");
              }}
            >
              {allowAllLabel}
            </button>

            {filtered.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                No matches.
              </div>
            ) : (
              <ul className="space-y-1">
                {filtered.map((x) => (
                  <li key={x.id}>
                    <button
                      type="button"
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100"
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

          <div className="border-t border-slate-200 p-2 text-xs text-slate-500">
            Showing up to 50 results
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupCounts, setGroupCounts] = useState<Map<number, number>>(new Map());
  const [err, setErr] = useState<string | null>(null);

  // default view
  const [pinned, setPinned] = useState<DetailRow[]>([]);
  const [daily, setDaily] = useState<DetailRow[]>([]);
  const [loadingDefault, setLoadingDefault] = useState(true);

  // filtered view
  const [ideas, setIdeas] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(true);

  // random 5
  const [random5, setRandom5] = useState<DetailRow[]>([]);
  const [loadingRandom, setLoadingRandom] = useState(false);

  // filters
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [gameId, setGameId] = useState<number | "">("");
  const [groupId, setGroupId] = useState<number | "">("");
  const [type, setType] = useState<string | "">("");
  const [priority, setPriority] = useState<number | "">("");

  // create group on home
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const isDefaultView = useMemo(() => {
    return !debouncedQ.trim() && !gameId && !groupId && !type && !priority;
  }, [debouncedQ, gameId, groupId, type, priority]);

  useEffect(() => {
    supabase
      .from("games")
      .select("id,title")
      .order("title")
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        setGames((data ?? []) as Game[]);
      });

    refreshGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gameMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const g of games) m.set(g.id, g.title);
    return m;
  }, [games]);

  async function refreshGroups() {
    const { data, error } = await supabase
      .from("idea_groups")
      .select("id,name")
      .order("name");

    if (error) {
      setErr(error.message);
      return;
    }

    const list = (data ?? []) as Group[];
    setGroups(list);

    // counts
    const { data: items, error: e2 } = await supabase
      .from("idea_group_items")
      .select("group_id");

    if (e2) {
      setErr(e2.message);
      setGroupCounts(new Map());
      return;
    }

    const m = new Map<number, number>();
    for (const row of items ?? []) {
      const gid = Number((row as any).group_id);
      m.set(gid, (m.get(gid) ?? 0) + 1);
    }
    setGroupCounts(m);
  }

  async function loadDefaultView() {
    setLoadingDefault(true);
    setErr(null);

    const { data: p, error: e1 } = await supabase
      .from("details")
      .select("id,title,priority,detail_type,game_id,pinned,pinned_at")
      .eq("status", "idea")
      .eq("pinned", true)
      .order("pinned_at", { ascending: false })
      .order("id", { ascending: false });

    if (e1) {
      setErr(e1.message);
      setPinned([]);
      setDaily([]);
      setLoadingDefault(false);
      return;
    }

    const seedDate = yyyyMmDdLocal(new Date());
    const { data: d, error: e2 } = await supabase.rpc("get_daily_seed_ideas", {
      seed_date: seedDate,
      take_count: 5,
    });

    if (e2) {
      setErr(e2.message);
      setPinned((p ?? []) as DetailRow[]);
      setDaily([]);
      setLoadingDefault(false);
      return;
    }

    setPinned((p ?? []) as DetailRow[]);
    setDaily((d ?? []) as DetailRow[]);
    setLoadingDefault(false);
  }

  async function loadFilteredIdeas() {
    setLoading(true);
    setErr(null);

    let groupDetailIds: number[] | null = null;
    if (groupId) {
      const { data: gi, error: eG } = await supabase
        .from("idea_group_items")
        .select("detail_id")
        .eq("group_id", groupId);

      if (eG) {
        setErr(eG.message);
        setIdeas([]);
        setLoading(false);
        return;
      }

      groupDetailIds = (gi ?? []).map((x: any) => Number(x.detail_id));
      if (groupDetailIds.length === 0) {
        setIdeas([]);
        setLoading(false);
        return;
      }
    }

    let query = supabase
      .from("details")
      .select("id,title,priority,detail_type,game_id,pinned,pinned_at")
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

    if (error) {
      setErr(error.message);
      setIdeas([]);
      setLoading(false);
      return;
    }

    setIdeas((data ?? []) as DetailRow[]);
    setLoading(false);
  }

  useEffect(() => {
    if (isDefaultView) loadDefaultView();
    else loadFilteredIdeas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDefaultView, debouncedQ, gameId, groupId, type, priority]);

  async function togglePin(idea: DetailRow) {
    setErr(null);

    const newPinned = !idea.pinned;
    const { error } = await supabase
      .from("details")
      .update({
        pinned: newPinned,
        pinned_at: newPinned ? new Date().toISOString() : null,
      })
      .eq("id", idea.id);

    if (error) {
      setErr(error.message);
      return;
    }

    if (isDefaultView) await loadDefaultView();
    else await loadFilteredIdeas();
  }

  async function deleteIdea(idea: DetailRow) {
    const ok = confirm(`Delete this idea?\n\n"${idea.title}"`);
    if (!ok) return;

    setErr(null);

    const { error } = await supabase.from("details").delete().eq("id", idea.id);
    if (error) {
      setErr(error.message);
      return;
    }

    if (isDefaultView) await loadDefaultView();
    else await loadFilteredIdeas();
  }

  async function getRandom5() {
    setLoadingRandom(true);
    setErr(null);

    const { data, error } = await supabase.rpc("get_random_ideas", {
      take_count: 5,
      include_pinned: true,
    });

    setLoadingRandom(false);

    if (error) {
      setErr(error.message);
      return;
    }
    setRandom5((data ?? []) as DetailRow[]);
  }

  async function createGroupOnHome() {
    const name = newGroupName.trim();
    if (!name) {
      setErr("Group name is required.");
      return;
    }

    setSavingGroup(true);
    setErr(null);

    const { error } = await supabase
      .from("idea_groups")
      .insert({ name, description: newGroupDesc.trim() || null });

    setSavingGroup(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setShowCreateGroup(false);
    setNewGroupName("");
    setNewGroupDesc("");
    await refreshGroups();
  }

  async function deleteGroup(group: Group) {
    const ok = confirm(
      `Delete this group?\n\n"${group.name}"\n\nAll links between this group and ideas will also be deleted.`
    );
    if (!ok) return;

    setErr(null);

    const { error } = await supabase.from("idea_groups").delete().eq("id", group.id);
    if (error) {
      setErr(error.message);
      return;
    }

    if (groupId === group.id) setGroupId("");
    await refreshGroups();
  }

  function IdeaItem({ r }: { r: DetailRow }) {
    return (
      <li key={r.id}>
        <a
          href={`/idea/${r.id}`}
          className="block rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">{r.title}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <Pill text={gameMap.get(r.game_id) ?? "Unknown game"} />
                <Pill text={typeLabel(r.detail_type)} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800">
                {priorityLabel(r.priority)}
              </div>

              <button
                type="button"
                title={r.pinned ? "Unpin" : "Pin"}
                className={
                  "shrink-0 rounded-xl border px-3 py-2 text-sm font-semibold " +
                  (r.pinned
                    ? "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-100")
                }
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  togglePin(r);
                }}
              >
                {r.pinned ? "⭐" : "☆"}
              </button>

              <button
                type="button"
                title="Delete"
                className="shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-100"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  deleteIdea(r);
                }}
              >
                🗑
              </button>
            </div>
          </div>
        </a>
      </li>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Ideas</h1>
            <p className="text-sm text-slate-600">
              Groups are your video topics. Manage them here.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={getRandom5} className={ghostButtonClass}>
              {loadingRandom ? "🎲 Rolling…" : "🎲 Random 5"}
            </button>

            <button type="button" onClick={() => setShowCreateGroup(true)} className={ghostButtonClass}>
              + Create group
            </button>

            <a href="/games/new" className={ghostButtonClass}>
              + Add game
            </a>

            <a href="/add" className={buttonClass}>
              + Add idea
            </a>
          </div>
        </div>

        {/* Group list */}
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Groups</h2>
            <span className="text-xs text-slate-500">{groups.length}</span>
          </div>

          {groups.length === 0 ? (
            <p className="text-sm text-slate-600">No groups yet. Create one.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {groups.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => setGroupId(g.id)}
                    title="Filter by this group"
                  >
                    <div className="font-semibold text-slate-900">{g.name}</div>
                    <div className="text-xs text-slate-600">
                      {groupCounts.get(g.id) ?? 0} idea(s)
                    </div>
                  </button>

                  <button
                    type="button"
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-100"
                    onClick={() => deleteGroup(g)}
                    title="Delete group"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Create group panel */}
        {showCreateGroup && (
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold text-slate-900">Create group</div>
              <button type="button" className={ghostButtonClass} onClick={() => setShowCreateGroup(false)}>
                Close
              </button>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-800">Name</span>
                <input className={inputClass} value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Water physics compilation" />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-800">Description</span>
                <input className={inputClass} value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} placeholder="Optional notes about this video topic" />
              </label>

              <button type="button" className={buttonClass} disabled={savingGroup} onClick={createGroupOnHome}>
                {savingGroup ? "Saving…" : "Create"}
              </button>
            </div>
          </section>
        )}

        {/* Filters */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-5">
            <label className="grid gap-1 md:col-span-2">
              <span className="text-sm font-medium text-slate-800">Search</span>
              <input className={inputClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type keywords…" />
            </label>

            <ComboBox
              label="Game"
              placeholder="Search games…"
              items={games.map((g) => ({ id: g.id, name: g.title }))}
              selectedId={gameId}
              onChange={setGameId}
              allowAllLabel="All games"
            />

            <ComboBox
              label="Group"
              placeholder="Search groups…"
              items={groups.map((g) => ({ id: g.id, name: g.name }))}
              selectedId={groupId}
              onChange={setGroupId}
              allowAllLabel="All groups"
            />

            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-800">Type</span>
              <select className={selectClass} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">All types</option>
                <option value="small_detail">Small detail</option>
                <option value="easter_egg">Easter egg</option>
                <option value="npc_reaction">NPC reaction</option>
                <option value="physics">Physics</option>
                <option value="troll">Troll</option>
                <option value="punish">Punish</option>
              </select>
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-5">
            <div className="md:col-span-4" />

            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-800">Priority</span>
              <select className={selectClass} value={priority} onChange={(e) => setPriority(e.target.value ? Number(e.target.value) : "")}>
                <option value="">All priorities</option>
                <option value={1}>High</option>
                <option value={3}>Normal</option>
                <option value={5}>Low</option>
              </select>
            </label>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              {isDefaultView
                ? loadingDefault
                  ? "Loading…"
                  : `⭐ ${pinned.length} pinned · 🧠 5 daily picks`
                : loading
                ? "Loading…"
                : `${ideas.length} result(s)`}
            </div>

            <button
              type="button"
              className={ghostButtonClass}
              onClick={() => {
                setQ("");
                setGameId("");
                setGroupId("");
                setType("");
                setPriority("");
              }}
            >
              Reset
            </button>
          </div>

          {err && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              {err}
            </div>
          )}
        </section>

        {/* Random 5 */}
        {random5.length > 0 && (
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">🎲 Random 5</h2>
              <button type="button" className="text-sm font-semibold text-slate-700 hover:text-slate-900" onClick={() => setRandom5([])}>
                Clear
              </button>
            </div>

            <ul className="space-y-2">
              {random5.map((r) => (
                <IdeaItem key={r.id} r={r} />
              ))}
            </ul>
          </section>
        )}

        {/* Content */}
        {isDefaultView ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">⭐ Pinned</h2>
                <span className="text-xs text-slate-500">{pinned.length}</span>
              </div>

              {loadingDefault ? (
                <p className="text-sm text-slate-500">Loading…</p>
              ) : pinned.length === 0 ? (
                <p className="text-sm text-slate-500">No pinned ideas.</p>
              ) : (
                <ul className="space-y-2">
                  {pinned.map((r) => (
                    <IdeaItem key={r.id} r={r} />
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">🧠 Today’s picks</h2>
                <span className="text-xs text-slate-500">5</span>
              </div>

              {loadingDefault ? (
                <p className="text-sm text-slate-500">Loading…</p>
              ) : daily.length === 0 ? (
                <p className="text-sm text-slate-500">No ideas available.</p>
              ) : (
                <ul className="space-y-2">
                  {daily.map((r) => (
                    <IdeaItem key={r.id} r={r} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : (
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {loading ? (
              <p className="text-sm text-slate-500">Loading ideas…</p>
            ) : ideas.length === 0 ? (
              <p className="text-sm text-slate-500">No matching ideas.</p>
            ) : (
              <ul className="space-y-2">
                {ideas.map((r) => (
                  <IdeaItem key={r.id} r={r} />
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
