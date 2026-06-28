"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { PlayCircleIcon } from "@heroicons/react/24/solid";
import { ChevronDoubleLeftIcon, ChevronDoubleRightIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, CubeTransparentIcon, ExclamationTriangleIcon, FaceSmileIcon, MagnifyingGlassIcon, SparklesIcon, Squares2X2Icon, UserGroupIcon } from "@heroicons/react/24/outline";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GameEditorModal, IdeaItem, QuickViewModal, ScriptEditorModal } from "@/components/IdeaCards";
import { RandomIdeaModal } from "@/components/RandomIdeaModal";
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
  const [games, setGames] = useState<Game[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupCounts, setGroupCounts] = useState<Map<number, number>>(new Map());
  const [ideas, setIdeas] = useState<DetailRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
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

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleRandomSelection = (idea: DetailRow) => {
    setRandomPickedIdeas(prev =>
      prev.some(item => item.id === idea.id)
        ? prev.filter(item => item.id !== idea.id)
        : [...prev, idea]
    );
  };

  const openScriptEditor = (sourceIdeas?: DetailRow[]) => {
    const nextIdeas = sourceIdeas ?? ideas.filter((idea) => selectedIds.includes(idea.id));
    if (nextIdeas.length === 0) return;
    setProjectIdeas(nextIdeas);
    setShowEditor(true);
  };

  const handleSaveScript = async (data: Partial<ScriptProject>) => {
    const { error } = await supabase.from("scripts").insert(data);
    if (error) {
      alert(error.message);
      return;
    }

    alert("Project saved!");
    setIsSelectMode(false);
    setSelectedIds([]);
    setRandomPickedIdeas([]);
    setProjectIdeas([]);
  };

  async function createGroup() {
    if (!newGroupName.trim()) return;
    await supabase.from("idea_groups").insert({ name: newGroupName.trim() });
    window.location.reload(); 
  }

  async function deleteGroup(id: number) {
    if(!confirm("Delete?")) return;
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
        alert("No ideas available to randomize!");
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
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not randomize ideas.");
    } finally {
      setRandomLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const currentIdeas = ideas;
  const goToPage = (p: number) => {
    setCurrentPage(p);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const btnPage = "inline-flex h-10 min-w-[40px] cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800";

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <ScriptEditorModal isOpen={showEditor} onClose={() => { setShowEditor(false); setProjectIdeas([]); }} onSave={handleSaveScript} initialData={{ ids: projectIdeas.map((idea) => idea.id), ideas: projectIdeas, games: games }} />
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
          openScriptEditor(randomPickedIdeas);
        }}
      />

      {isSelectMode && (
         <div className="fixed bottom-0 inset-x-0 z-[80] bg-white border-t border-slate-200 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
            <div className="mx-auto max-w-4xl flex items-center justify-between">
               <div className="flex items-center gap-4"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-sm">{selectedIds.length}</span><span className="text-sm font-bold text-slate-600 uppercase tracking-widest">Ideas Selected</span></div>
               <button disabled={selectedIds.length === 0} onClick={() => openScriptEditor()} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-white font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition disabled:opacity-50"><PlayCircleIcon className="h-5 w-5" /> Create Script</button>
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
              <div className="flex gap-4">
                 <div className="flex-1 relative">
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input className="h-12 w-full rounded-2xl border border-slate-200 px-12 shadow-sm outline-none focus:ring-2 focus:ring-slate-200 font-medium" placeholder="Search ideas..." value={q} onChange={e=>setQ(e.target.value)} />
                 </div>
                 
                 <button type="button" onClick={handleRandom} disabled={loading || randomLoading} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60" title="Random from all filtered ideas">
                    <SparklesIcon className={`w-5 h-5 text-purple-500 ${randomLoading ? "animate-spin" : ""}`} />
                    <span className="hidden sm:inline">{randomLoading ? "Spinning" : "Random"}</span>
                 </button>

                 <button type="button" onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds([]); }} className={`h-12 cursor-pointer rounded-2xl border px-6 text-sm font-bold transition ${isSelectMode ? "border-blue-200 bg-blue-50 text-blue-600" : "border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"}`}>{isSelectMode ? "Exit Select" : "Select Mode"}</button>
                 <Link href="/add" className="flex h-12 cursor-pointer items-center justify-center rounded-2xl bg-slate-900 px-6 text-sm font-bold text-white shadow-md transition hover:bg-slate-800">+ Add Idea</Link>
              </div>
              <div className="relative z-50 flex flex-col gap-3 overflow-visible rounded-[1.6rem] border border-slate-200 bg-white/80 p-2.5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="w-full sm:w-[260px]">
                    <ComboBox placeholder="Game" items={games.map(g=>({id:g.id, name:g.title}))} selectedId={gameId} onChange={setGameId} />
                  </div>
                  <TypeFilterDropdown value={type} onChange={setType} />
                  {(q||gameId||groupId||type) && (
                    <button
                      type="button"
                      onClick={()=>{setQ("");setGameId("");setGroupId("");setType("")}}
                      className="h-10 cursor-pointer rounded-full px-3 text-xs font-black uppercase tracking-[0.16em] text-rose-500 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
                  <SortToggle value={sortOrder} onChange={setSortOrder} />
                  <ThemeToggle variant="compact" />
                </div>
              </div>
          </header>

          <div className="mb-6 flex items-center justify-between"><h2 className="text-2xl font-black text-slate-900 tracking-tight">{loading ? "Loading..." : `${totalCount} Ideas Found`}</h2></div>

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