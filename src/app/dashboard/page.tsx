"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { 
  PlayCircleIcon, 
  TrashIcon, 
  ChartBarIcon, 
  DocumentTextIcon, 
  FireIcon, 
  PuzzlePieceIcon,
  CheckIcon
} from "@heroicons/react/24/outline";

/* ================= TYPES & CONFIG ================= */

type DetailRow = { 
  id: number; title: string; description: string | null; priority: number; 
  detail_type: string; game_id: number; created_at: string; 
  game?: { title: string }; // Join relation
  footage?: { file_path: string }[];
};

type Group = { id: number; name: string };
type Game = { id: number; title: string };

type ScriptProject = { 
  id: number; title: string; content: string; assets: string[];
  description: string; hashtags: string[]; tags: string[];
  publish_date: string | null; status: string;
};

const PRIORITY_OPTIONS = [
  { value: 1, label: 'High', color: 'text-red-700 bg-red-50 border-red-200' },
  { value: 2, label: 'Normal', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { value: 3, label: 'Low', color: 'text-gray-600 bg-gray-100 border-gray-200' },
];

/* ================= COMPONENTS ================= */

// COMPONENT: STAT CARD
function StatCard({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition">
      <div className={`p-4 rounded-xl ${color} bg-opacity-10 text-white`}>
         <Icon className={`w-8 h-8 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div>
        <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">{title}</p>
        <h4 className="text-3xl font-black text-slate-900">{value}</h4>
      </div>
    </div>
  );
}

// COMPONENT: SCRIPT EDITOR MODAL (Copy y hệt từ Home)
function ScriptEditorModal({ 
  isOpen, onClose, initialData, onSave 
}: { 
  isOpen: boolean; onClose: () => void; 
  initialData: { ids: number[], ideas: DetailRow[] };
  onSave: (data: Partial<ScriptProject>) => void;
}) {
  const [formData, setFormData] = useState<Partial<ScriptProject>>({
    title: "", content: "", description: "", hashtags: [], tags: [], publish_date: null, status: "Draft", assets: []
  });
  const [activeTab, setActiveTab] = useState<"details" | "script" | "assets">("script");

  useEffect(() => {
    if (isOpen && initialData.ideas.length > 0) {
       const titles = initialData.ideas.map(i => i.title);
       const gameNames = Array.from(new Set(initialData.ideas.map(i => i.game?.title || "").filter(Boolean)));

       const generatedContent = initialData.ideas.map(i => `[${i.title}]\n${i.description || ""}`).join("\n\n");
       const generatedAssets = initialData.ideas.flatMap(i => i.footage?.map(f => f.file_path) || []).filter(Boolean) as string[];
       const generatedDesc = `Video tổng hợp các chi tiết thú vị.\n\nTimestamps:\n0:00 Intro\n...`;
       const generatedTags = [...gameNames, "Shorts", "Gaming", "Facts"];
       const generatedHashtags = ["#shorts", "#gaming", ...gameNames.map(g => `#${g.replace(/\s+/g, '')}`)];

       setFormData({
         title: `Script: ${titles[0]}...`,
         content: generatedContent,
         description: generatedDesc,
         assets: generatedAssets,
         tags: generatedTags,
         hashtags: generatedHashtags,
         status: "Draft"
       });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
       <div className="bg-white w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
             <div><h2 className="text-xl font-black text-slate-900">Create Video Script</h2></div>
             <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button onClick={() => { onSave(formData); onClose(); }} className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20">Save Project</button>
             </div>
          </div>
          <div className="flex px-6 border-b border-slate-100 bg-slate-50">
             {(["script", "details", "assets"] as const).map(tab => (
               <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-3 text-sm font-bold border-b-2 transition ${activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                 {tab === "script" ? "📝 Content" : tab === "details" ? "ℹ️ Metadata" : "🔗 Assets"}
               </button>
             ))}
          </div>
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
             {activeTab === "script" && (
                <textarea className="h-full w-full rounded-2xl border border-slate-200 p-5 text-sm leading-relaxed text-slate-800 outline-none focus:border-blue-500 font-mono" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
             )}
             {activeTab === "details" && (
                <div className="space-y-4">
                   <div><label className="text-xs font-bold text-slate-500">Title</label><input className="w-full h-10 rounded-xl border px-3" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
                   <div><label className="text-xs font-bold text-slate-500">Desc</label><textarea className="w-full h-24 rounded-xl border p-3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                </div>
             )}
             {activeTab === "assets" && (
                <div className="bg-white rounded-xl border p-2">{(formData.assets || []).map((link, i) => <div key={i} className="p-2 border-b text-xs text-blue-600 truncate">{link}</div>)}</div>
             )}
          </div>
       </div>
    </div>
  );
}

/* ================= PAGE LOGIC ================= */

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, high: 0, scripts: 0, games: 0 });
  const [recentIdeas, setRecentIdeas] = useState<DetailRow[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupCounts, setGroupCounts] = useState<Map<number, number>>(new Map());
  
  // Selection Mode (For Script Creation)
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  useEffect(() => {
    async function loadData() {
      // 1. Fetch Stats
      const ideasRes = await supabase.from("details").select("id, priority, status", { count: 'exact' });
      const scriptsRes = await supabase.from("scripts").select("id", { count: 'exact' });
      const gamesRes = await supabase.from("games").select("id", { count: 'exact' });
      
      const total = ideasRes.count || 0;
      const high = ideasRes.data?.filter(i => i.priority === 1).length || 0;
      
      setStats({
        total: total,
        high: high,
        scripts: scriptsRes.count || 0,
        games: gamesRes.count || 0
      });

      // 2. Fetch Recent Ideas (Limit 10)
      const recentRes = await supabase
        .from("details")
        .select("*, game:games(title), footage(file_path)")
        .eq("status", "idea")
        .order("created_at", { ascending: false })
        .limit(20);
      
      setRecentIdeas((recentRes.data || []) as DetailRow[]);

      // 3. Fetch Sidebar Data
      const grps = await supabase.from("idea_groups").select("*").order("name");
      const grpItems = await supabase.from("idea_group_items").select("group_id");
      
      setGroups((grps.data || []) as Group[]);
      
      const m = new Map<number, number>();
      for (const row of grpItems.data ?? []) { const gid = Number((row as any).group_id); m.set(gid, (m.get(gid) ?? 0) + 1); }
      setGroupCounts(m);
    }
    loadData();
  }, []);

  // --- ACTIONS ---
  const toggleSelection = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSaveScript = async (data: Partial<ScriptProject>) => {
    const { error } = await supabase.from("scripts").insert(data);
    if (!error) {
       alert("Script created!");
       setIsSelectMode(false);
       setSelectedIds([]);
    }
  };

  async function createGroup() {
    if (!newGroupName.trim()) return;
    await supabase.from("idea_groups").insert({ name: newGroupName.trim() });
    window.location.reload(); 
  }

  async function deleteGroup(id: number) {
    if(!confirm("Delete group?")) return;
    await supabase.from("idea_groups").delete().eq("id", id);
    window.location.reload();
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* SCRIPT EDITOR MODAL */}
      <ScriptEditorModal 
        isOpen={showEditor} 
        onClose={() => setShowEditor(false)}
        onSave={handleSaveScript}
        initialData={{
           ids: selectedIds,
           ideas: recentIdeas.filter(i => selectedIds.includes(i.id))
        }}
      />

      {/* BOTTOM SELECTION BAR (Sticky) */}
      {isSelectMode && (
         <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-10 md:pl-72">
            <div className="mx-auto max-w-4xl flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-sm">{selectedIds.length}</span>
                  <span className="text-sm font-bold text-slate-600">Selected</span>
                  <button onClick={() => setSelectedIds([])} className="text-xs text-rose-500 hover:underline">Clear</button>
               </div>
               <button disabled={selectedIds.length === 0} onClick={() => setShowEditor(true)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-white font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed">
                 <PlayCircleIcon className="h-5 w-5" /> Create Script
               </button>
            </div>
         </div>
      )}

      {/* SIDEBAR (COPY TỪ HOME) */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-slate-200 bg-white hidden md:flex">
         <div className="flex h-20 items-center px-8 text-2xl font-black text-slate-900">GameKB<span className="text-blue-500">.</span></div>
         <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            <nav className="space-y-2">
               <Link href="/" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>🏠</span> All Ideas</Link>
               <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold bg-slate-900 text-white shadow-lg transition"><span>📊</span> Dashboard</button>
               <Link href="/scripts" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>📜</span> Scripts</Link>
               <Link href="/games/new" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>🕹️</span> Add Game</Link>
            </nav>
            <div className="pt-4 border-t border-slate-100">
               <div className="flex items-center justify-between px-2 mb-2"><h3 className="text-xs font-bold uppercase text-slate-400">Collections</h3><button onClick={()=>setShowCreateGroup(!showCreateGroup)} className="text-lg hover:text-blue-600 cursor-pointer">+</button></div>
               {showCreateGroup && <div className="mb-2"><input className="w-full border rounded px-2 py-1 text-xs" value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createGroup()} placeholder="Name..." autoFocus/></div>}
               <div className="space-y-1">
                  {groups.map(g => (
                     <div key={g.id} className="group/item relative flex items-center justify-between w-full hover:bg-slate-50 rounded-xl px-2 py-1 transition cursor-pointer">
                        <div className="flex-1 flex items-center gap-2 overflow-hidden py-2 text-slate-500">
                           <span className="truncate">{g.name}</span>
                        </div>
                        <div className="w-8 flex justify-center shrink-0">
                           <span className="text-[10px] font-bold opacity-60 group-hover/item:hidden">{groupCounts.get(g.id)||0}</span>
                           <button onClick={(e) => { e.stopPropagation(); deleteGroup(g.id); }} className="hidden group-hover/item:block text-rose-500 hover:text-rose-700 transition">
                             <TrashIcon className="h-4 w-4"/>
                           </button>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 pl-0 md:pl-72 pb-32">
        <div className="mx-auto max-w-[1900px] px-6 py-8">
           
           <h1 className="text-3xl font-black text-slate-900 mb-8">Dashboard Overview</h1>

           {/* STATS ROW */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <StatCard title="Total Ideas" value={stats.total} icon={DocumentTextIcon} color="bg-blue-500" />
              <StatCard title="High Priority" value={stats.high} icon={FireIcon} color="bg-red-500" />
              <StatCard title="Total Games" value={stats.games} icon={PuzzlePieceIcon} color="bg-emerald-500" />
              <StatCard title="Scripts Drafted" value={stats.scripts} icon={ChartBarIcon} color="bg-purple-500" />
           </div>

           {/* RECENT IDEAS TABLE */}
           <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <h3 className="text-lg font-bold text-slate-800">Recent Ideas</h3>
                 <button 
                  onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds([]); }}
                  className={`px-4 py-2 text-sm font-bold rounded-xl border transition ${isSelectMode ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-white text-slate-600 hover:bg-slate-100"}`}
                 >
                    {isSelectMode ? "Cancel Selection" : "Select to Script"}
                 </button>
              </div>
              
              <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-400">
                       <tr>
                          <th className="px-6 py-4 w-10">#</th>
                          <th className="px-6 py-4">Title</th>
                          <th className="px-6 py-4">Game</th>
                          <th className="px-6 py-4">Priority</th>
                          <th className="px-6 py-4 text-right">Date</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {recentIdeas.map((row) => {
                          const priority = PRIORITY_OPTIONS.find(p => p.value === row.priority) || PRIORITY_OPTIONS[1];
                          const isSelected = selectedIds.includes(row.id);
                          
                          return (
                             <tr 
                               key={row.id} 
                               onClick={() => isSelectMode && toggleSelection(row.id)}
                               className={`group hover:bg-slate-50 transition ${isSelectMode ? "cursor-pointer" : ""} ${isSelected ? "bg-blue-50/50" : ""}`}
                             >
                                <td className="px-6 py-4">
                                   {isSelectMode ? (
                                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-slate-300"}`}>
                                         {isSelected && <CheckIcon className="w-3 h-3 stroke-[3]" />}
                                      </div>
                                   ) : (
                                      <span className="text-slate-300 font-mono">#{row.id}</span>
                                   )}
                                </td>
                                <td className="px-6 py-4">
                                   <div className="font-bold text-slate-900 line-clamp-1">{row.title}</div>
                                   <div className="text-xs text-slate-400 mt-1 line-clamp-1">{row.description}</div>
                                </td>
                                <td className="px-6 py-4">
                                   <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-600">
                                      {row.game?.title || "Unknown"}
                                   </span>
                                </td>
                                <td className="px-6 py-4">
                                   <span className={`inline-flex items-center px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${priority.color}`}>
                                      {priority.label}
                                   </span>
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-xs text-slate-400">
                                   {new Date(row.created_at).toLocaleDateString()}
                                </td>
                             </tr>
                          );
                       })}
                    </tbody>
                 </table>
              </div>
           </div>

        </div>
      </main>
    </div>
  );
}