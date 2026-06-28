"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { PlayCircleIcon, ChartBarIcon, DocumentTextIcon, PuzzlePieceIcon } from "@heroicons/react/24/outline";
import { AppSidebar } from "@/components/AppSidebar";
import { GameEditorModal, IdeaItem, QuickViewModal, ScriptEditorModal } from "@/components/IdeaCards";
import type { DetailRow, Game, ScriptProject } from "@/types/gamekb";

/* ================= COMPONENTS ================= */

function StatCard({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition">
      <div className={`p-4 rounded-xl ${color} bg-opacity-10`}>
         <Icon className={`w-8 h-8 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{title}</p>
        <h4 className="text-3xl font-black text-slate-900">{value}</h4>
      </div>
    </div>
  );
}

/* ================= PAGE LOGIC (DASHBOARD) ================= */

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, scripts: 0, games: 0 });
  const [pinnedIdeas, setPinnedIdeas] = useState<DetailRow[]>([]);
  const [recentIdeas, setRecentIdeas] = useState<DetailRow[]>([]);
  const [allGames, setAllGames] = useState<Game[]>([]);
  
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [previewIdea, setPreviewIdea] = useState<DetailRow | null>(null);

  useEffect(() => {
    async function loadData() {
      const ideasRes = await supabase.from("details").select("id", { count: "exact", head: true }).eq("status", "idea");
      const scriptsRes = await supabase.from("scripts").select("id", { count: "exact", head: true });
      const gamesRes = await supabase.from("games").select("*").order("title");
      
      const gamesData = (gamesRes.data || []) as Game[];
      setAllGames(gamesData);

      setStats({
        total: ideasRes.count || 0,
        scripts: scriptsRes.count || 0,
        games: gamesData.length
      });

      const pinnedRes = await supabase.from("details").select("*, game:games(*), footage(file_path, title)").eq("status", "idea").eq("pinned", true).order("created_at", { ascending: false });
      setPinnedIdeas((pinnedRes.data || []) as DetailRow[]);

      const recentRes = await supabase.from("details").select("*, game:games(*), footage(file_path, title)").eq("status", "idea").eq("pinned", false).order("created_at", { ascending: false }).limit(10);
      setRecentIdeas((recentRes.data || []) as DetailRow[]);
    }
    loadData();
  }, []);

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  async function handleSaveScript(data: Partial<ScriptProject>) {
    const { error } = await supabase.from("scripts").insert(data);
    if (!error) { alert("Script saved successfully!"); setIsSelectMode(false); setSelectedIds([]); }
  }

  const updateGameInList = (updatedGame: Game) => {
     setAllGames(prev => prev.map(g => g.id === updatedGame.id ? updatedGame : g));
     const updateList = (list: DetailRow[]) => list.map(item => item.game_id === updatedGame.id ? { ...item, game: updatedGame } : item);
     setPinnedIdeas(updateList(pinnedIdeas));
     setRecentIdeas(updateList(recentIdeas));
  };

  const combinedIdeas = [...pinnedIdeas, ...recentIdeas];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* MODALS */}
      <ScriptEditorModal isOpen={showEditor} onClose={() => setShowEditor(false)} onSave={handleSaveScript} initialData={{ ids: selectedIds, ideas: combinedIdeas.filter(i => selectedIds.includes(i.id)), games: allGames }} />
      <GameEditorModal game={editingGame} isOpen={!!editingGame} onClose={() => setEditingGame(null)} onUpdate={updateGameInList} />
      <QuickViewModal idea={previewIdea} isOpen={!!previewIdea} onClose={() => setPreviewIdea(null)} />

      {/* SELECTION BAR */}
      {isSelectMode && (
         <div className="fixed bottom-0 inset-x-0 z-[80] bg-white border-t border-slate-200 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-10 md:pl-72">
            <div className="mx-auto max-w-4xl flex items-center justify-between">
               <div className="flex items-center gap-4"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-sm">{selectedIds.length}</span><span className="text-sm font-bold text-slate-600 uppercase tracking-widest">Ideas Selected</span></div>
               <button disabled={selectedIds.length === 0} onClick={() => setShowEditor(true)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-white font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition disabled:opacity-50"><PlayCircleIcon className="h-5 w-5" /> Create Script</button>
            </div>
         </div>
      )}

      <AppSidebar activePage="dashboard" />

      <main className="flex-1 pl-0 md:pl-72 pb-32">
        <div className="mx-auto max-w-[1900px] px-6 py-8">
           <div className="flex items-center justify-between mb-8">
             <h1 className="text-3xl font-black text-slate-900">Dashboard</h1>
             <button onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds([]); }} className={`h-10 px-4 rounded-xl font-bold border text-sm transition ${isSelectMode ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{isSelectMode ? "Exit Select" : "Select Mode"}</button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              <StatCard title="Total Ideas" value={stats.total} icon={DocumentTextIcon} color="bg-blue-500" />
              <StatCard title="Total Games" value={stats.games} icon={PuzzlePieceIcon} color="bg-emerald-500" />
              <StatCard title="Scripts Drafted" value={stats.scripts} icon={ChartBarIcon} color="bg-purple-500" />
           </div>

           {pinnedIdeas.length > 0 && (
             <div className="mb-12">
               <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                 <span className="text-amber-500">★</span> Pinned Ideas
               </h3>
               <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {pinnedIdeas.map(r => (
                     <IdeaItem key={r.id} r={r} game={r.game} isSelectMode={isSelectMode} isSelected={selectedIds.includes(r.id)} onToggleSelect={toggleSelection} onTogglePin={async (id, current) => { await supabase.from("details").update({ pinned: !current }).eq("id", id); window.location.reload(); }} onEditGame={(g) => setEditingGame(g)} onQuickView={(idea) => setPreviewIdea(idea)} />
                  ))}
               </ul>
             </div>
           )}

           <div>
             <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">✨ Recently Added</h3>
             <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {recentIdeas.map(r => (
                   <IdeaItem key={r.id} r={r} game={r.game} isSelectMode={isSelectMode} isSelected={selectedIds.includes(r.id)} onToggleSelect={toggleSelection} onTogglePin={async (id, current) => { await supabase.from("details").update({ pinned: !current }).eq("id", id); window.location.reload(); }} onEditGame={(g) => setEditingGame(g)} onQuickView={(idea) => setPreviewIdea(idea)} />
                ))}
             </ul>
           </div>
        </div>
      </main>
    </div>
  );
}