"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ================= TYPES & STYLES ================= */

type Game = { id: number; title: string; cover_url?: string | null; release_year?: number | null; genres_text?: string | null };
type Group = { id: number; name: string };
type DetailRow = { id: number; title: string; priority: number; detail_type: string; game_id: number; pinned?: boolean; created_at?: string };

const inputClass = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition";
const selectClass = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition cursor-pointer";
const btnPrimary = "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold whitespace-nowrap cursor-pointer transition active:scale-[0.98] bg-slate-900 text-white shadow-md shadow-slate-900/10 hover:bg-slate-800";

// CẬP NHẬT: Thêm cursor-pointer vào nút chuyển trang
const btnPage = "inline-flex h-10 min-w-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

/* ================= HELPER: TYPE CONFIG ================= */
const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  small_detail: { label: "🔍 Small Detail", className: "bg-blue-500/80 border-blue-400/50 text-white" },
  easter_egg: { label: "🥚 Easter Egg", className: "bg-purple-500/80 border-purple-400/50 text-white" },
  npc_reaction: { label: "🗣️ NPC Reaction", className: "bg-emerald-500/80 border-emerald-400/50 text-white" },
  physics: { label: "🍎 Physics", className: "bg-orange-500/80 border-orange-400/50 text-white" },
  troll: { label: "🤡 Troll", className: "bg-pink-500/80 border-pink-400/50 text-white" },
  punish: { label: "💀 Punish", className: "bg-red-500/80 border-red-400/50 text-white" },
  default: { label: "📝 Note", className: "bg-slate-500/80 border-slate-400/50 text-white" }
};

/* ================= COMPONENTS ================= */

function TypePill({ typeKey }: { typeKey: string }) {
  const config = TYPE_CONFIG[typeKey] || TYPE_CONFIG.default;
  return <span className={`inline-flex items-center rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md ${config.className}`}>{config.label}</span>;
}

function IdeaItem({ r, game, onTogglePin }: { r: DetailRow; game?: Game; onTogglePin: (id: number, current: boolean) => void }) {
  const hasCover = !!game?.cover_url;

  return (
    <li className="group h-full animate-in fade-in zoom-in-95 duration-300">
      <a href={`/idea/${r.id}`} className="relative flex h-64 w-full flex-col justify-end overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-sm transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
        
        {/* Background */}
        {hasCover ? (
          <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110" style={{ backgroundImage: `url(${game.cover_url})` }} />
        ) : (
          <div className="absolute inset-0 bg-slate-800 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent opacity-90 transition-opacity group-hover:opacity-80" />
        
        {/* === TOP ACTION BAR === */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
           {r.priority === 1 && <span className="rounded-lg bg-rose-600 px-2 py-1 text-[10px] font-bold uppercase text-white shadow-lg border border-rose-500">🔥 High</span>}
           
           <button
             onClick={(e) => {
               e.preventDefault();
               e.stopPropagation();
               onTogglePin(r.id, !!r.pinned);
             }}
             className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer ${
               r.pinned 
                 ? "bg-amber-400 border-amber-300 text-white shadow-[0_0_15px_rgba(251,191,36,0.6)]" 
                 : "bg-black/30 border-white/20 text-white/40 hover:bg-black/50 hover:text-amber-300 hover:border-amber-300/50 backdrop-blur-md"
             }`}
             title={r.pinned ? "Unpin this idea" : "Pin to favorites"}
           >
             {r.pinned ? "★" : "☆"}
           </button>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col p-5">
           <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300/90 mb-1">
             <span className="truncate">{game?.title || "Unknown"}</span>
           </div>
           <h3 className="line-clamp-2 text-lg font-bold leading-tight text-white drop-shadow-md group-hover:text-blue-200 mb-3">
             {r.title}
           </h3>
           <div className="flex items-center flex-wrap gap-2">
             <TypePill typeKey={r.detail_type} />
           </div>
        </div>
      </a>
    </li>
  );
}

function ComboBox({ placeholder, items, selectedId, onChange }: { placeholder: string; items: { id: number; name: string }[]; selectedId: number | ""; onChange: (id: number | "") => void }) {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(""); const boxRef = useRef<HTMLDivElement>(null);
  const filtered = items.filter(x => x.name.toLowerCase().includes(query.toLowerCase())).slice(0, 50);
  useEffect(() => { function f(e:any){if(boxRef.current && !boxRef.current.contains(e.target))setOpen(false)} document.addEventListener("mousedown", f); return ()=>document.removeEventListener("mousedown",f)},[]);
  return (
    <div ref={boxRef} className="relative w-full h-10">
      <button className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-left text-sm text-slate-900 cursor-pointer" onClick={() => setOpen(!open)}>{items.find(x=>x.id===selectedId)?.name || <span className="text-slate-500">{placeholder}</span>}</button>
      {open && <div className="absolute left-0 top-full z-20 mt-1 w-full min-w-[200px] rounded-xl border border-slate-200 bg-white shadow-xl p-2"><input className="w-full rounded-lg border px-2 py-1 text-sm mb-2" value={query} onChange={e=>setQuery(e.target.value)} autoFocus placeholder="Search..."/><div className="max-h-60 overflow-auto"><button className="w-full text-left p-2 hover:bg-slate-100 text-sm cursor-pointer" onClick={()=>{onChange("");setOpen(false)}}>All</button>{filtered.map(x=><button key={x.id} className="w-full text-left p-2 hover:bg-blue-50 text-sm cursor-pointer" onClick={()=>{onChange(x.id);setOpen(false)}}>{x.name}</button>)}</div></div>}
    </div>
  );
}

/* ================= MAIN HOME ================= */

export default function Home() {
  const ITEMS_PER_PAGE = 24;

  const [games, setGames] = useState<Game[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupCounts, setGroupCounts] = useState<Map<number, number>>(new Map());
  
  // Data
  const [ideas, setIdeas] = useState<DetailRow[]>([]);
  const [fullIdeas, setFullIdeas] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [randomMode, setRandomMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [gameId, setGameId] = useState<number | "">("");
  const [groupId, setGroupId] = useState<number | "">("");
  const [type, setType] = useState<string | "">("");
  const [priority, setPriority] = useState<number | "">("");

  // UI
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const gameMap = useMemo(() => {
    const m = new Map<number, Game>();
    for (const g of games) m.set(g.id, g);
    return m;
  }, [games]);

  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q), 300); return () => clearTimeout(t); }, [q]);

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
    async function load() {
      setLoading(true);
      let groupDetailIds: number[] | null = null;
      if (groupId) {
        const { data } = await supabase.from("idea_group_items").select("detail_id").eq("group_id", groupId);
        groupDetailIds = (data ?? []).map((x: any) => Number(x.detail_id));
        if (groupDetailIds.length === 0) { setIdeas([]); setFullIdeas([]); setLoading(false); return; }
      }

      let query = supabase.from("details").select("*").eq("status", "idea");
      if (groupDetailIds) query = query.in("id", groupDetailIds);
      if (gameId) query = query.eq("game_id", gameId);
      if (type) query = query.eq("detail_type", type);
      if (priority) query = query.eq("priority", priority);
      if (debouncedQ.trim()) query = query.ilike("title", `%${debouncedQ.trim()}%`);

      const { data } = await query.order("created_at", { ascending: false });
      const res = (data ?? []) as DetailRow[];
      setIdeas(res);
      setFullIdeas(res);
      setCurrentPage(1);
      setRandomMode(false);
      setLoading(false);
    }
    load();
  }, [debouncedQ, gameId, groupId, type, priority]);

  // CẬP NHẬT: Hàm xử lý Pin nhanh
  async function togglePinFast(id: number, currentStatus: boolean) {
    const newStatus = !currentStatus;
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, pinned: newStatus } : i));
    setFullIdeas(prev => prev.map(i => i.id === id ? { ...i, pinned: newStatus } : i));
    await supabase.from("details").update({ 
      pinned: newStatus, 
      pinned_at: newStatus ? new Date().toISOString() : null 
    }).eq("id", id);
  }

  async function createGroup() {
    if (!newGroupName.trim()) return;
    await supabase.from("idea_groups").insert({ name: newGroupName.trim() });
    setShowCreateGroup(false); setNewGroupName("");
    window.location.reload(); 
  }

  async function deleteGroup(g: Group) {
    if(!confirm("Delete?")) return;
    await supabase.from("idea_groups").delete().eq("id", g.id);
    window.location.reload();
  }

  function pickRandom3() {
    const s = [...fullIdeas].sort(() => 0.5 - Math.random()).slice(0, 3);
    setIdeas(s); setRandomMode(true); setCurrentPage(1);
  }

  const totalPages = Math.ceil(ideas.length / ITEMS_PER_PAGE);
  const currentIdeas = ideas.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const goToPage = (p: number) => {
    setCurrentPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-slate-200 bg-white hidden md:flex">
        <div className="flex h-20 items-center px-8 text-2xl font-black text-slate-900">GameKB<span className="text-blue-500">.</span></div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
           <nav className="space-y-2">
             <button onClick={() => {setGroupId(""); setQ("");}} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition cursor-pointer ${!groupId ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-100"}`}><span>🏠</span> All Ideas</button>
             <a href="/dashboard" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>📊</span> Dashboard</a>
             <a href="/games/new" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>🕹️</span> Add Game</a>
           </nav>

           <div className="pt-4 border-t border-slate-100">
             <div className="flex items-center justify-between px-2 mb-2"><h3 className="text-xs font-bold uppercase text-slate-400">Collections</h3><button onClick={()=>setShowCreateGroup(!showCreateGroup)} className="text-lg hover:text-blue-600 cursor-pointer">+</button></div>
             {showCreateGroup && <div className="mb-2"><input className="w-full border rounded px-2 py-1 text-xs" value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createGroup()} placeholder="Name..." autoFocus/></div>}
             <div className="space-y-1">
               {groups.map(g => (
                 <div key={g.id} className="group/item relative">
                    <button onClick={() => setGroupId(g.id)} className={`flex w-full justify-between rounded-xl px-4 py-2 text-sm font-medium cursor-pointer ${groupId===g.id ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"}`}>
                       <span className="truncate">{g.name}</span>
                       <span className="text-[10px] font-bold opacity-60">{groupCounts.get(g.id)||0}</span>
                    </button>
                    <button onClick={()=>deleteGroup(g)} className="absolute right-1 top-2 hidden text-xs text-rose-400 group-hover/item:block cursor-pointer">×</button>
                 </div>
               ))}
             </div>
           </div>
        </div>
      </aside>

      {/* CONTENT */}
      <main className="flex-1 pl-0 md:pl-72">
        <div className="mx-auto max-w-[1900px] px-6 py-8">
          <header className="mb-8">
             <div className="flex gap-4 mb-4">
               <input className="h-12 w-full rounded-2xl border border-slate-200 px-4 shadow-sm outline-none focus:ring-2" placeholder="Search ideas..." value={q} onChange={e=>setQ(e.target.value)} />
               <a href="/add" className={btnPrimary}>+ Add</a>
             </div>
             <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-3/4">
               <ComboBox placeholder="Game" items={games.map(g=>({id:g.id, name:g.title}))} selectedId={gameId} onChange={setGameId} />
               <select className={selectClass} value={type} onChange={e=>setType(e.target.value)}><option value="">All Types</option><option value="small_detail">Small detail</option><option value="easter_egg">Easter egg</option></select>
               <select className={selectClass} value={priority} onChange={e=>setPriority(e.target.value ? Number(e.target.value) : "")}><option value="">All Priority</option><option value={1}>High</option><option value={3}>Normal</option></select>
               {(q||gameId||groupId||type||priority) && <button onClick={()=>{setQ("");setGameId("");setGroupId("");setType("");setPriority("")}} className="text-sm text-rose-500 cursor-pointer">Clear</button>}
             </div>
          </header>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{loading ? "Loading..." : `${ideas.length} Results`}</h2>
            {groupId && (
               <div className="flex gap-2">
                 <button onClick={pickRandom3} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-200 cursor-pointer">🎲 Random 3</button>
                 {randomMode && <button onClick={()=>setIdeas(fullIdeas)} className="text-sm underline cursor-pointer">Show All</button>}
               </div>
            )}
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {currentIdeas.map(r => (
               <IdeaItem 
                 key={r.id} 
                 r={r} 
                 game={gameMap.get(r.game_id)} 
                 onTogglePin={togglePinFast} 
               />
            ))}
          </ul>
          
          {!loading && ideas.length === 0 && <div className="py-20 text-center text-slate-400">No ideas found.</div>}

          {!loading && totalPages > 1 && (
            <div className="mt-12 flex justify-center items-center gap-2 pb-10">
               <button disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)} className={btnPage}>←</button>
               <span className="text-sm font-bold text-slate-600 px-2">Page {currentPage} of {totalPages}</span>
               <button disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)} className={btnPage}>→</button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}