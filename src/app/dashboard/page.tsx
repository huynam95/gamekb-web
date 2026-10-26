"use client";

import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ChartBarIcon, ChartPieIcon, ChevronRightIcon, DocumentTextIcon, PlayCircleIcon, PuzzlePieceIcon, SparklesIcon, VideoCameraIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { formatCount, linkIdeasToScript, useIdeaUsage } from "@/lib/ideaUsage";
import { AppSidebar } from "@/components/AppSidebar";
import { AppPageHeader, appPageContainerClass, appPageMainClass, appPageRootClass } from "@/components/AppPage";
import { GameEditorModal, IdeaItem, QuickViewModal, ScriptEditorModal } from "@/components/IdeaCards";
import { useNotifications } from "@/components/NotificationCenter";
import type { DetailRow, Game, ScriptProject } from "@/types/gamekb";

/* ================= COMPONENTS ================= */

const STAT_TONES: Record<string, string> = {
  "bg-blue-500": "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  "bg-emerald-500": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  "bg-purple-500": "bg-purple-500/10 text-purple-600 dark:text-purple-300",
};

function StatCard({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-line bg-surface p-3 shadow-sm transition hover:border-line-strong sm:flex-row sm:items-center sm:gap-4 sm:rounded-[1.5rem] sm:p-5">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-14 sm:w-14 ${STAT_TONES[color] ?? "bg-surface-sunken text-fg-2"}`}>
         <Icon className="h-5 w-5 sm:h-7 sm:w-7" aria-hidden="true" />
      </div>
      <div className="flex min-w-0 flex-col">
        <h4 className="text-2xl font-black tabular-nums text-fg sm:order-2 sm:text-3xl">{value}</h4>
        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-fg-4 sm:order-1">{title}</p>
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
  const { data: usageData, byIdea: usageByIdea } = useIdeaUsage();
  const [recording, setRecording] = useState<{ toRecord: number; thisWeek: number; used: number; next: { id: number; title: string; game: string }[] } | null>(null);

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

    // Recording List summary (hidden until the recording columns exist).
    supabase
      .from("details")
      .select("id,title,capture_status,capture_priority,capture_added_at,recorded_at,game:games(title)")
      .not("capture_status", "is", null)
      .then(({ data, error }) => {
        if (error || !data) return;
        type Row = { id: number; title: string; capture_status: string; capture_priority: number | null; capture_added_at: string | null; recorded_at: string | null; game: { title: string } | null };
        const rows = data as unknown as Row[];
        const weekAgo = Date.now() - 7 * 86400e3;
        const toRecord = rows.filter((row) => row.capture_status === "to_record");
        setRecording({
          toRecord: toRecord.length,
          thisWeek: rows.filter((row) => row.recorded_at && new Date(row.recorded_at).getTime() > weekAgo).length,
          used: rows.filter((row) => row.capture_status === "used").length,
          next: toRecord
            .sort((a, b) => (a.capture_priority ?? 2) - (b.capture_priority ?? 2) || String(a.capture_added_at).localeCompare(String(b.capture_added_at)))
            .slice(0, 3)
            .map((row) => ({ id: row.id, title: row.title, game: row.game?.title ?? "" })),
        });
      });
  }, []);

  const toggleSelection = (idea: DetailRow) => {
    setSelectedIds(prev => prev.includes(idea.id) ? prev.filter(x => x !== idea.id) : [...prev, idea.id]);
  };

  async function handleSaveScript(data: Partial<ScriptProject>) {
    const { data: created, error } = await supabase.from("scripts").insert(data).select("id").single();
    if (error) {
      notifyError(error.message, "Could not save script");
      return;
    }
    if (created) void linkIdeasToScript((created as { id: number }).id, selectedIds);
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
         <div className="app-selection-bar fixed bottom-0 inset-x-0 z-[80] border-t border-slate-200 bg-white/95 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
            <div className="mx-auto max-w-4xl flex flex-wrap items-center justify-between gap-3">
               <div className="flex items-center gap-4"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-sm">{selectedIds.length}</span><span className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Ideas Selected</span></div>
               <button disabled={selectedIds.length === 0} onClick={() => setShowEditor(true)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-white font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition disabled:opacity-50"><PlayCircleIcon className="h-5 w-5" /> Create Script</button>
            </div>
         </div>
      )}

      <AppSidebar activePage="dashboard" hideTabBar={isSelectMode} />

      <main className={`${appPageMainClass} pb-32`}>
        <div className={appPageContainerClass}>
           <AppPageHeader
             title="Dashboard"
             description="A quick view of your idea library, games, projects, and recent activity."
             icon={<ChartBarIcon className="h-5 w-5" />}
             action={<button onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds([]); }} className={`h-10 cursor-pointer rounded-xl border px-4 text-sm font-bold transition ${isSelectMode ? "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"}`}>{isSelectMode ? "Exit Select" : "Select Mode"}</button>}
           />

           <div className="mb-8 grid grid-cols-3 gap-2 sm:mb-12 sm:gap-6">
              <StatCard title="Total Ideas" value={stats.total} icon={DocumentTextIcon} color="bg-blue-500" />
              <StatCard title="Total Games" value={stats.games} icon={PuzzlePieceIcon} color="bg-emerald-500" />
              <StatCard title="Scripts" value={stats.scripts} icon={ChartBarIcon} color="bg-purple-500" />
           </div>

           {usageData && (
             <Link href="/stats" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-line bg-surface px-4 py-3 shadow-sm transition hover:border-line-strong sm:px-5">
               <span className="flex items-center gap-2 text-sm font-bold text-fg"><ChartPieIcon className="h-5 w-5 text-fg-4" /> Stats</span>
               <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-3">
                 <span><span className="font-semibold tabular-nums text-fg">{usageByIdea.size}</span> of {stats.total} ideas used</span>
                 <span><span className="font-semibold tabular-nums text-fg">{usageData.videos.length}</span> videos · {usageData.videos.filter((v) => v.published).length} published</span>
                 {usageData.videos.some((v) => v.youtube_views != null) && <span><span className="font-semibold tabular-nums text-fg">{formatCount(usageData.videos.reduce((sum, v) => sum + (v.youtube_views ?? 0), 0))}</span> views</span>}
                 <ChevronRightIcon className="h-4 w-4" />
               </span>
             </Link>
           )}

           {recording && (
             <section className="mb-8 rounded-[1.5rem] border border-line bg-surface p-4 shadow-sm sm:mb-12 sm:p-5">
               <div className="flex items-center justify-between gap-3">
                 <h3 className="flex items-center gap-2 text-base font-bold text-fg">
                   <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-300"><VideoCameraIcon className="h-5 w-5" /></span>
                   Recording
                 </h3>
                 <Link href="/recording" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">Open list <ChevronRightIcon className="h-4 w-4" /></Link>
               </div>
               <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                 {[["To record", recording.toRecord, "text-rose-600 dark:text-rose-300"], ["Recorded this week", recording.thisWeek, "text-emerald-600 dark:text-emerald-300"], ["Used in videos", recording.used, "text-fg-2"]].map(([label, value, color]) => (
                   <div key={String(label)} className="rounded-2xl bg-surface-muted px-2 py-3">
                     <dd className={`text-2xl font-black tabular-nums ${color}`}>{value}</dd>
                     <dt className="mt-0.5 text-[11px] font-medium text-fg-4">{label}</dt>
                   </div>
                 ))}
               </dl>
               {recording.next.length > 0 && (
                 <div className="mt-4">
                   <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-fg-4">Up next</p>
                   <ul className="divide-y divide-line-soft">
                     {recording.next.map((item) => (
                       <li key={item.id}>
                         <Link href={`/idea/${item.id}`} className="flex items-center gap-2 py-2 text-sm text-fg-2 hover:text-fg">
                           <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                           <span className="min-w-0 flex-1 truncate font-medium">{item.title}</span>
                           <span className="shrink-0 text-xs text-fg-4">{item.game}</span>
                         </Link>
                       </li>
                     ))}
                   </ul>
                 </div>
               )}
             </section>
           )}

           {pinnedIdeas.length > 0 && (
             <div className="mb-12">
               <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
                 <StarSolidIcon className="h-5 w-5 text-amber-500" aria-hidden="true" /> Pinned Ideas
               </h3>
               <ul className="idea-grid">
                  {pinnedIdeas.map((r, index) => (
                     <IdeaItem key={r.id} priority={index < 3} r={r} game={r.game} isSelectMode={isSelectMode} isSelected={selectedIds.includes(r.id)} onToggleSelect={toggleSelection} onTogglePin={async (id, current) => { await supabase.from("details").update({ pinned: !current }).eq("id", id); window.location.reload(); }} onEditGame={(g) => setEditingGame(g)} onQuickView={(idea) => setPreviewIdea(idea)} />
                  ))}
               </ul>
             </div>
           )}

           <div>
             <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100"><SparklesIcon className="h-5 w-5 text-accent" aria-hidden="true" /> Recently Added</h3>
             <ul className="idea-grid">
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