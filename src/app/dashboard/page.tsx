"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

/* ================= TYPES & CONFIG ================= */

type Game = { id: number; title: string; cover_url?: string | null };
type Group = { id: number; name: string };
type DetailRow = { id: number; title: string; priority: number; detail_type: string; game_id: number; pinned?: boolean; created_at?: string };

// Cấu hình màu sắc Badge (Copy từ Home)
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
  return (
    <span className={`inline-flex items-center rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md ${config.className}`}>
      {config.label}
    </span>
  );
}

// CẬP NHẬT: IdeaItem có nút Pin (Giống hệt trang chủ)
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
        
        {/* === ACTION BAR (PIN BUTTON) === */}
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
           <h3 className="line-clamp-2 text-lg font-bold leading-tight text-white drop-shadow-md group-hover:text-blue-200 mb-3">{r.title}</h3>
           <div className="flex items-center flex-wrap gap-2">
             <TypePill typeKey={r.detail_type} />
           </div>
        </div>
      </a>
    </li>
  );
}

/* ================= MAIN DASHBOARD ================= */

export default function Dashboard() {
  const router = useRouter();

  // Data States
  const [games, setGames] = useState<Game[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupCounts, setGroupCounts] = useState<Map<number, number>>(new Map());
  
  const [pinned, setPinned] = useState<DetailRow[]>([]);
  const [daily, setDaily] = useState<DetailRow[]>([]);
  const [recent, setRecent] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Sidebar UI State
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const gameMap = useMemo(() => {
    const m = new Map<number, Game>();
    for (const g of games) m.set(g.id, g);
    return m;
  }, [games]);

  useEffect(() => {
    async function load() {
      // 1. Load Meta
      const [gs, grps, items] = await Promise.all([
        supabase.from("games").select("id,title,cover_url"),
        supabase.from("idea_groups").select("id,name").order("name"),
        supabase.from("idea_group_items").select("group_id")
      ]);
      
      setGames((gs.data ?? []) as Game[]);
      setGroups((grps.data ?? []) as Group[]);
      
      const m = new Map<number, number>();
      for (const row of items.data ?? []) { const gid = Number((row as any).group_id); m.set(gid, (m.get(gid) ?? 0) + 1); }
      setGroupCounts(m);

      // 2. Load Dashboard Content
      const { data: p } = await supabase.from("details").select("*").eq("status", "idea").eq("pinned", true).order("pinned_at", { ascending: false });
      const { data: d } = await supabase.rpc("get_daily_seed_ideas", { seed_date: new Date().toISOString().slice(0, 10), take_count: 5 });
      const { data: r } = await supabase.from("details").select("*").eq("status", "idea").order("created_at", { ascending: false }).limit(10);

      setPinned((p ?? []) as DetailRow[]);
      setDaily((d ?? []) as DetailRow[]);
      setRecent((r ?? []) as DetailRow[]);
      setLoading(false);
    }
    load();
  }, []);

  // CẬP NHẬT: Hàm Pin nhanh (Cập nhật cả 3 list để đồng bộ)
  async function togglePinFast(id: number, currentStatus: boolean) {
    const newStatus = !currentStatus;
    
    // Optimistic Update cho cả 3 danh sách
    // (Vì 1 item có thể xuất hiện ở cả Recent và Pinned)
    setPinned(prev => prev.map(i => i.id === id ? { ...i, pinned: newStatus } : i));
    setDaily(prev => prev.map(i => i.id === id ? { ...i, pinned: newStatus } : i));
    setRecent(prev => prev.map(i => i.id === id ? { ...i, pinned: newStatus } : i));

    // Gửi request ngầm
    await supabase.from("details").update({ 
      pinned: newStatus, 
      pinned_at: newStatus ? new Date().toISOString() : null 
    }).eq("id", id);
  }

  // Sidebar Actions
  async function createGroup() {
    if (!newGroupName.trim()) return;
    await supabase.from("idea_groups").insert({ name: newGroupName.trim() });
    window.location.reload(); 
  }

  async function deleteGroup(g: Group) {
    if(!confirm("Delete?")) return;
    await supabase.from("idea_groups").delete().eq("id", g.id);
    window.location.reload();
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] hidden md:flex">
        <div className="flex h-20 items-center px-8">
           <div className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-2xl font-black tracking-tighter text-transparent">
             GameKB<span className="text-blue-500">.</span>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-8 no-scrollbar">
          <nav className="space-y-2">
            <a href="/" className="group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900">
               <span className="text-lg">🏠</span> Home
            </a>
            <button className="group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 bg-slate-900 text-white shadow-lg shadow-slate-900/20 cursor-default">
               <span className="text-lg">📊</span> Dashboard
            </button>
            <a href="/games/new" className="group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900">
               <span className="text-lg">🕹️</span> Add Game
            </a>
          </nav>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
               <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Collections</h3>
               <button onClick={() => setShowCreateGroup(!showCreateGroup)} className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-blue-100 hover:text-blue-600 transition cursor-pointer" title="Create Group">+</button>
            </div>

            {showCreateGroup && (
               <div className="animate-in fade-in slide-in-from-top-2 relative mb-2">
                  <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium outline-none focus:border-blue-400 focus:bg-white transition" placeholder="Group name..." value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createGroup()} autoFocus />
                  <button onClick={createGroup} className="absolute right-1 top-1 rounded p-1 text-[10px] bg-blue-500 text-white hover:bg-blue-600 cursor-pointer">OK</button>
               </div>
            )}

            <nav className="space-y-1">
              {groups.map((g) => (
                <div key={g.id} className="group/item relative">
                  <a href="/" className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm font-medium text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-900">
                    <span className="truncate">{g.name}</span>
                    <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 group-hover/item:bg-slate-200">{groupCounts.get(g.id) ?? 0}</span>
                  </a>
                  <button onClick={() => deleteGroup(g)} className="absolute right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 p-1.5 text-slate-300 hover:text-rose-500 transition cursor-pointer" title="Delete">
                     <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </nav>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 pl-0 md:pl-72 transition-all duration-300">
        <div className="mx-auto max-w-[1900px] px-6 py-8">
          <h1 className="mb-8 text-3xl font-black text-slate-900 tracking-tight">Dashboard Overview</h1>
          
          {loading ? (
             <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
               {[1,2,3].map(i => <div key={i} className="h-64 rounded-2xl bg-slate-200 animate-pulse" />)}
             </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {/* CỘT 1: PINNED */}
              <section className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-xl">⭐</div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Pinned Ideas</h2>
                      <p className="text-xs text-slate-500">{pinned.length} important items</p>
                    </div>
                 </div>
                 {pinned.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">No pinned ideas.</div> : (
                    <ul className="grid gap-4 grid-cols-1">
                      {pinned.map(r => <IdeaItem key={r.id} r={r} game={gameMap.get(r.game_id)} onTogglePin={togglePinFast} />)}
                    </ul>
                 )}
              </section>

              {/* CỘT 2: DAILY */}
              <section className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-xl">🧠</div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Today's Picks</h2>
                      <p className="text-xs text-slate-500">Refresh every 24h</p>
                    </div>
                 </div>
                 {daily.length === 0 ? <div className="text-center text-sm text-slate-400">No daily picks.</div> : (
                    <ul className="grid gap-4 grid-cols-1">
                      {daily.map(r => <IdeaItem key={r.id} r={r} game={gameMap.get(r.game_id)} onTogglePin={togglePinFast} />)}
                    </ul>
                 )}
              </section>

              {/* CỘT 3: RECENT */}
              <section className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-xl">✨</div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Recently Added</h2>
                      <p className="text-xs text-slate-500">Latest 10 entries</p>
                    </div>
                 </div>
                 {recent.length === 0 ? <div className="text-center text-sm text-slate-400">No recent items.</div> : (
                    <ul className="grid gap-4 grid-cols-1">
                      {recent.map(r => <IdeaItem key={r.id} r={r} game={gameMap.get(r.game_id)} onTogglePin={togglePinFast} />)}
                    </ul>
                 )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}