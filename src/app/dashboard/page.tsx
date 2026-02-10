// app/dashboard/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

// --- TYPES & STYLES (Giữ nguyên như cũ) ---
type Game = { id: number; title: string; cover_url?: string | null };
type DetailRow = { id: number; title: string; priority: number; detail_type: string; game_id: number; pinned?: boolean; created_at?: string };

function IdeaItem({ r, game }: { r: DetailRow; game?: Game }) {
  const hasCover = !!game?.cover_url;
  return (
    <li className="group h-full">
      <a href={`/idea/${r.id}`} className="relative flex h-64 w-full flex-col justify-end overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-sm transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
        {hasCover ? <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110" style={{ backgroundImage: `url(${game.cover_url})` }} /> : <div className="absolute inset-0 bg-slate-800 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-50" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-90 transition-opacity group-hover:opacity-80" />
        <div className="relative z-10 flex flex-col p-5">
           <div className="absolute top-4 right-4">{r.priority === 1 && <span className="rounded-lg bg-rose-500/90 px-2 py-1 text-[10px] font-bold uppercase text-white backdrop-blur-md">High</span>}</div>
           <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300/90"><span className="truncate">{game?.title || "Unknown"}</span></div>
           <h3 className="line-clamp-2 text-lg font-bold leading-tight text-white group-hover:text-blue-200">{r.title}</h3>
        </div>
      </a>
    </li>
  );
}

export default function Dashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [pinned, setPinned] = useState<DetailRow[]>([]);
  const [daily, setDaily] = useState<DetailRow[]>([]);
  const [recent, setRecent] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(true);

  const gameMap = useMemo(() => {
    const m = new Map<number, Game>();
    for (const g of games) m.set(g.id, g);
    return m;
  }, [games]);

  useEffect(() => {
    async function load() {
      const { data: gs } = await supabase.from("games").select("id,title,cover_url");
      setGames((gs ?? []) as Game[]);

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

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* SIDEBAR MINI (Để quay về Home) */}
      <aside className="fixed inset-y-0 left-0 z-10 flex w-16 flex-col items-center border-r border-slate-200 bg-white py-4 md:w-20">
         <div className="mb-8 font-black text-xl">G<span className="text-blue-500">.</span></div>
         <a href="/" className="mb-4 rounded-xl p-3 text-2xl hover:bg-slate-100" title="All Ideas">🏠</a>
         <a href="/dashboard" className="rounded-xl bg-slate-900 p-3 text-2xl text-white shadow-lg" title="Dashboard">📊</a>
      </aside>

      <main className="flex-1 pl-16 md:pl-20">
        <div className="mx-auto max-w-[1900px] px-6 py-8">
          <h1 className="mb-6 text-3xl font-black text-slate-900">Dashboard</h1>
          
          {loading ? <div className="text-slate-400">Loading dashboard...</div> : (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              <section>
                 <div className="mb-4 flex items-center gap-2"><span className="text-xl">⭐</span><h2 className="text-xl font-bold">Pinned</h2></div>
                 <ul className="grid gap-4 grid-cols-1">{pinned.map(r => <IdeaItem key={r.id} r={r} game={gameMap.get(r.game_id)} />)}</ul>
              </section>
              <section>
                 <div className="mb-4 flex items-center gap-2"><span className="text-xl">🧠</span><h2 className="text-xl font-bold">Today's Picks</h2></div>
                 <ul className="grid gap-4 grid-cols-1">{daily.map(r => <IdeaItem key={r.id} r={r} game={gameMap.get(r.game_id)} />)}</ul>
              </section>
              <section>
                 <div className="mb-4 flex items-center gap-2"><span className="text-xl">✨</span><h2 className="text-xl font-bold">Recently Added</h2></div>
                 <ul className="grid gap-4 grid-cols-1">{recent.map(r => <IdeaItem key={r.id} r={r} game={gameMap.get(r.game_id)} />)}</ul>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}