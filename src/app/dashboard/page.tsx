"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { PlayCircleIcon, ChartBarIcon, DocumentTextIcon, PuzzlePieceIcon } from "@heroicons/react/24/outline";
import { AppSidebar } from "@/components/AppSidebar";
import { AppPageHeader, appPageContainerClass, appPageMainClass, appPageRootClass } from "@/components/AppPage";
import { GameEditorModal, IdeaItem, QuickViewModal, ScriptEditorModal } from "@/components/IdeaCards";
import { useNotifications } from "@/components/NotificationCenter";
import type { DetailRow, Game, ScriptProject } from "@/types/gamekb";

/* ================= COMPONENTS ================= */

function StatCard({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: string }) {
  return (
    <div className="flex items-center gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      <div className={`p-4 rounded-xl ${color} bg-opacity-10`}>
         <Icon className={`w-8 h-8 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
        <h4 className="text-3xl font-black text-slate-900 dark:text-slate-100">{value}</h4>
      </div>
    </div>
  );
}

/* ================= PAGE LOGIC (DASHBOARD) ================= */

export default function Dashboard() {
  const { success, error: notifyError } = useNotifications();
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

      const pinnedRes = await supabase.from("details").select("*, game:games(*), footage(id, file_path, title, channel_name)").eq("status", "idea").eq("pinned", true).order("created_at", { ascending: false });
      setPinnedIdeas((pinnedRes.data || []) as DetailRow[]);

      const recentRes = await supabase.from("details").select("*, game:games(*), footage(id, file_path, title, channel_name)").eq("status", "idea").eq("pinned", false).order("created_at", { ascending: false }).limit(10);
      setRecentIdeas((recentRes.data || []) as DetailRow[]);
    }
    loadData();
  }, []);

  const toggleSelection = (idea: DetailRow) => {
    setSelectedIds(prev => prev.includes(idea.id) ? prev.filter(x => x !== idea.id) : [...prev, idea.id]);
  };

  async function handleSaveScript(data: Partial<ScriptProject>) {
    const { error } = await supabase.from("scripts").insert(data);
    if (error) {
      notifyError(error.message, "Could not save script");
      return;
    }
    success("Script saved successfully!", "Script saved");
    setIsSelectMode(false);
    setSelectedIds([]);
  }

  const updateGameInList = (updatedGame: Game) => {
     setAllGames(prev => prev.map(g => g.id === updatedGame.id ? updatedGame : g));
     const updateList = (list: DetailRow[]) => list.map(item => item.game_id === updatedGame.id ? { ...item, game: updatedGame } : item);
     setPinnedIdeas(updateList(pinnedIdeas));
     setRecentIdeas(updateList(recentIdeas));
  };

  const combinedIdeas = [...pinnedIdeas, ...recentIdeas];

  return (
    <div className={`${appPageRootClass} xl:flex`}>
      
      {/* MODALS */}
      <ScriptEditorModal isOpen={showEditor} onClose={() => setShowEditor(false)} onSave={handleSaveScript} initialData={{ ids: selectedIds, ideas: combinedIdeas.filter(i => selectedIds.includes(i.id)), games: allGames }} />
      <GameEditorModal game={editingGame} isOpen={!!editingGame} onClose={() => setEditingGame(null)} onUpdate={updateGameInList} />
      <QuickViewModal idea={previewIdea} isOpen={!!previewIdea} onClose={() => setPreviewIdea(null)} />

      {/* SELECTION BAR */}
      {isSelectMode && (
         <div className="fixed bottom-0 inset-x-0 z-[80] border-t border-slate-200 bg-white/95 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] backdrop-blur xl:pl-72 dark:border-slate-800 dark:bg-slate-950/95">
            <div className="mx-auto max-w-4xl flex items-center justify-between">
               <div className="flex items-center gap-4"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-sm">{selectedIds.length}</span><span className="text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">Ideas Selected</span></div>
               <button disabled={selectedIds.length === 0} onClick={() => setShowEditor(true)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-white font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition disabled:opacity-50"><PlayCircleIcon className="h-5 w-5" /> Create Script</button>
            </div>
         </div>
      )}

      <AppSidebar activePage="dashboard" />

      <main className={`${appPageMainClass} pb-32`}>
        <div className={appPageContainerClass}>
           <AppPageHeader
             title="Dashboard"
             description="A quick view of your idea library, games, projects, and recent activity."
             icon={<ChartBarIcon className="h-5 w-5" />}
             action={<button onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds([]); }} className={`h-10 cursor-pointer rounded-xl border px-4 text-sm font-bold transition ${isSelectMode ? "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"}`}>{isSelectMode ? "Exit Select" : "Select Mode"}</button>}
           />

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              <StatCard title="Total Ideas" value={stats.total} icon={DocumentTextIcon} color="bg-blue-500" />
              <StatCard title="Total Games" value={stats.games} icon={PuzzlePieceIcon} color="bg-emerald-500" />
              <StatCard title="Scripts Drafted" value={stats.scripts} icon={ChartBarIcon} color="bg-purple-500" />
           </div>

           {pinnedIdeas.length > 0 && (
             <div className="mb-12">
               <h3 className="mb-6 flex items-center gap-2 text-lg font-black text-slate-800 dark:text-slate-100">
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
             <h3 className="mb-6 flex items-center gap-2 text-lg font-black text-slate-800 dark:text-slate-100">✨ Recently Added</h3>
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