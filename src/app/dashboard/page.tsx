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
  CheckIcon,
  PencilSquareIcon,
  EyeIcon,
  VideoCameraIcon,
  HashtagIcon,
  TagIcon,
  DocumentDuplicateIcon
} from "@heroicons/react/24/outline";

/* ================= TYPES & CONFIG ================= */

type Game = { id: number; title: string; cover_url?: string | null };
type Group = { id: number; name: string };
type FootageItem = { file_path: string; title: string | null };
type DetailRow = { 
  id: number; title: string; description: string | null; priority: number; 
  detail_type: string; game_id: number; pinned?: boolean; created_at?: string; 
  game?: Game; 
  footage?: FootageItem[];
};

type ScriptProject = { 
  id: number; title: string; content: string; assets: { url: string; name: string }[];
  description: string; hashtags: string[]; tags: string[];
  publish_date: string | null; status: string;
};

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  small_detail: { label: "🔍 Small Detail", className: "bg-blue-500/20 border-blue-400/30 text-blue-100" },
  easter_egg: { label: "🥚 Easter Egg", className: "bg-purple-500/20 border-purple-400/30 text-purple-100" },
  npc_reaction: { label: "🗣️ NPC Reaction", className: "bg-emerald-500/20 border-emerald-400/30 text-emerald-100" },
  physics: { label: "🍎 Physics", className: "bg-orange-500/20 border-orange-400/30 text-orange-100" },
  troll: { label: "🤡 Troll", className: "bg-pink-500/20 border-pink-400/30 text-pink-100" },
  punish: { label: "💀 Punish", className: "bg-red-500/20 border-red-400/30 text-red-100" },
  default: { label: "📝 Note", className: "bg-slate-500/20 border-slate-400/30 text-slate-100" }
};

/* ================= COMPONENTS ================= */

function TypePill({ typeKey }: { typeKey: string }) {
  const config = TYPE_CONFIG[typeKey] || TYPE_CONFIG.default;
  return <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${config.className}`}>{config.label}</span>;
}

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

function QuickViewModal({ idea, isOpen, onClose }: { idea: DetailRow | null; isOpen: boolean; onClose: () => void }) {
  if (!isOpen || !idea) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-900 truncate pr-4">{idea.title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="p-6 space-y-4 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
          {idea.description || "No description available."}
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition">Close</button>
        </div>
      </div>
    </div>
  );
}

function GameEditorModal({ game, isOpen, onClose, onUpdate }: { game: Game | null; isOpen: boolean; onClose: () => void; onUpdate: (g: Game) => void }) {
  const [title, setTitle] = useState("");
  const [cover, setCover] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (game) { setTitle(game.title); setCover(game.cover_url || ""); } }, [game]);
  async function handleSave() {
    if (!game) return; setLoading(true);
    const { error } = await supabase.from("games").update({ title, cover_url: cover }).eq("id", game.id);
    setLoading(false);
    if (!error) { onUpdate({ ...game, title, cover_url: cover }); onClose(); }
  }
  if (!isOpen || !game) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center"><h3 className="font-bold text-gray-900 text-sm">Edit Game Info</h3><button onClick={onClose} className="text-gray-400">✕</button></div>
        <div className="p-5 space-y-4">
          <div><label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block tracking-wider">Title</label><input className="w-full h-10 border rounded-lg px-3 text-sm outline-none focus:border-blue-500 shadow-sm" value={title} onChange={e=>setTitle(e.target.value)} /></div>
          <div><label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block tracking-wider">Cover URL</label><input className="w-full h-10 border rounded-lg px-3 text-sm outline-none focus:border-blue-500 shadow-sm" value={cover} onChange={e=>setCover(e.target.value)} /></div>
          <div className="flex justify-end gap-2 pt-2"><button onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-400">Cancel</button><button onClick={handleSave} disabled={loading} className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg shadow-sm">{loading ? "Saving..." : "Save Changes"}</button></div>
        </div>
      </div>
    </div>
  );
}

function ScriptEditorModal({ 
  isOpen, onClose, initialData, onSave 
}: { 
  isOpen: boolean; onClose: () => void; 
  initialData: { ids: number[], ideas: DetailRow[], games: Game[] };
  onSave: (data: Partial<ScriptProject>) => void;
}) {
  const [formData, setFormData] = useState<Partial<ScriptProject>>({
    title: "", content: "", description: "", hashtags: [], tags: [], publish_date: null, status: "Draft", assets: []
  });
  const [activeTab, setActiveTab] = useState<"details" | "script" | "assets">("script");

  useEffect(() => {
    if (isOpen && initialData.ideas.length > 0) {
       const titles = initialData.ideas.map(i => i.title);
       const gameNames = Array.from(new Set(initialData.ideas.map(i => {
          const g = initialData.games.find(game => game.id === i.game_id);
          return g?.title || "";
       }).filter(Boolean)));

       const fullDescription = initialData.ideas.map(i => `• ${i.title}: ${i.description || ""}`).join("\n\n");
       
       // HIỂN THỊ TÊN VIDEO CHUẨN TẠI ĐÂY
       const allAssets = initialData.ideas.flatMap(i => 
         i.footage?.map(f => ({ url: f.file_path, name: f.title || f.file_path.split('/').pop() || "Video" })) || []
       );

       setFormData({
         title: `Shorts Script: ${titles[0]}${titles.length > 1 ? '...' : ''}`,
         content: initialData.ideas.map(i => `[${i.title}]\n${i.description || ""}`).join("\n\n"),
         description: `Video tổng hợp các chi tiết thú vị.\n\n${fullDescription}`,
         assets: allAssets,
         tags: [...gameNames, "Shorts", "Gaming", "Game Facts"],
         hashtags: ["#shorts", "#gaming", ...gameNames.map(g => `#${g.replace(/\s+/g, '').toLowerCase()}`)],
         status: "Draft",
         publish_date: null
       });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
       <div className="bg-white w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
             <div><h2 className="text-xl font-black text-slate-900">Create Video Script</h2><p className="text-xs text-slate-500 font-bold">Drafting from {initialData.ideas.length} ideas</p></div>
             <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button onClick={() => { onSave(formData); onClose(); }} className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg">Save Project</button>
             </div>
          </div>
          <div className="flex px-6 border-b border-slate-100 bg-slate-50">
             {(["script", "details", "assets"] as const).map(tab => (
               <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-3 text-sm font-bold border-b-2 transition ${activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                 {tab === "script" ? "📝 Content" : tab === "details" ? "ℹ️ Metadata" : "🔗 Assets"}
               </button>
             ))}
          </div>
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
             {activeTab === "script" && <textarea className="h-full w-full rounded-2xl border border-slate-200 p-6 text-sm leading-relaxed text-slate-800 outline-none focus:border-blue-500 font-mono shadow-inner" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />}
             
             {activeTab === "details" && <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Title</label>
                  <input className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-blue-500 shadow-sm" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Description</label>
                  <textarea className="w-full h-40 rounded-xl border border-slate-200 p-4 text-xs outline-none focus:border-blue-500 shadow-sm" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 tracking-widest"><HashtagIcon className="w-3 h-3"/> Hashtags</label>
                    <div className="flex flex-wrap gap-2">
                      {formData.hashtags?.map((tag, i) => (
                        <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[11px] font-bold border border-blue-100 shadow-sm">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 tracking-widest"><TagIcon className="w-3 h-3"/> Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {formData.tags?.map((tag, i) => (
                        <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold border border-slate-200 shadow-sm">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
             </div>}

             {activeTab === "assets" && <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 block tracking-widest">Selected Footage</label>
                  <button onClick={() => navigator.clipboard.writeText(formData.assets?.map(a => a.url).join('\n') || "")} className="text-[10px] flex items-center gap-1 font-bold text-blue-600 hover:underline">
                    <DocumentDuplicateIcon className="w-3 h-3"/> Copy All Links
                  </button>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-50">
                  {(formData.assets || []).length > 0 ? (
                    formData.assets?.map((asset, i) => (
                      <div key={i} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition group">
                         <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500">#{i+1}</div>
                         <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-700 truncate">{asset.name}</p>
                            <p className="text-[10px] text-slate-400 truncate font-mono">{asset.url}</p>
                         </div>
                         <a href={asset.url} target="_blank" className="p-2 rounded-lg bg-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white transition shadow-sm">
                            <VideoCameraIcon className="w-4 h-4" />
                         </a>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center text-slate-400 italic text-sm">No assets linked to these ideas.</div>
                  )}
                </div>
             </div>}
          </div>
       </div>
    </div>
  );
}

function IdeaItem({ r, game, isSelectMode, isSelected, onToggleSelect, onTogglePin, onEditGame, onQuickView }: { 
  r: DetailRow; game?: Game; isSelectMode: boolean; isSelected: boolean; 
  onToggleSelect: (id: number) => void; onTogglePin: (id: number, current: boolean) => void; 
  onEditGame: (game: Game) => void; onQuickView: (idea: DetailRow) => void;
}) {
  const hasCover = !!game?.cover_url;
  return (
    <li onClick={() => isSelectMode && onToggleSelect(r.id)} className={`group relative h-64 w-full overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 ${isSelectMode ? "cursor-pointer active:scale-95" : "hover:shadow-2xl hover:-translate-y-1"} ${isSelected ? "border-blue-500 ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-50" : "border-slate-200 bg-slate-900"}`}>
        {hasCover ? <div className={`absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out opacity-60 ${isSelectMode ? '' : 'group-hover:scale-110 group-hover:opacity-40'}`} style={{ backgroundImage: `url(${game.cover_url})` }} /> : <div className="absolute inset-0 bg-slate-800 opacity-50" />}
        <div className={`absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent ${isSelected ? 'opacity-90 bg-blue-900/20' : ''}`} />
        {isSelectMode && <div className="absolute top-3 right-3 z-30"><div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-white/50 bg-black/20"}`}>{isSelected && <CheckIcon className="h-4 w-4 stroke-[3]" />}</div></div>}
        <div className="absolute inset-0 flex flex-col justify-end p-5"><div className="z-10">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 z-20 relative">
            <span className="truncate max-w-[80%]">{game?.title}</span>
            {!isSelectMode && game && <button onClick={(e)=>{e.stopPropagation(); onEditGame(game)}} className="p-1 rounded hover:bg-white/20 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><PencilSquareIcon className="h-3 w-3"/></button>}
          </div>
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-white mb-2">{r.title}</h3>
          <div className="flex items-center gap-2"><TypePill typeKey={r.detail_type} />{r.pinned && <span className="text-[10px] font-bold text-amber-400">★ Pinned</span>}</div>
        </div></div>
        {!isSelectMode && <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex flex-col gap-2">
           <button onClick={(e)=>{e.stopPropagation(); onTogglePin(r.id, !!r.pinned)}} className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md shadow-lg transition hover:scale-110 ${r.pinned ? 'bg-amber-400 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>{r.pinned ? "★" : "☆"}</button>
           <button onClick={(e)=>{e.stopPropagation(); onQuickView(r)}} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md shadow-lg hover:bg-emerald-500 hover:scale-110 transition" title="Quick Preview"><EyeIcon className="h-4 w-4"/></button>
        </div>}
        <a href={`/idea/${r.id}`} className={`absolute inset-0 z-0 ${isSelectMode ? 'hidden' : ''}`} />
    </li>
  );
}

/* ================= PAGE LOGIC ================= */

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, high: 0, scripts: 0, games: 0 });
  const [pinnedIdeas, setPinnedIdeas] = useState<DetailRow[]>([]);
  const [recentIdeas, setRecentIdeas] = useState<DetailRow[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [groupCounts, setGroupCounts] = useState<Map<number, number>>(new Map());
  
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [previewIdea, setPreviewIdea] = useState<DetailRow | null>(null);

  useEffect(() => {
    async function loadData() {
      const ideasRes = await supabase.from("details").select("id, priority, status", { count: 'exact' });
      const scriptsRes = await supabase.from("scripts").select("id", { count: 'exact' });
      const gamesRes = await supabase.from("games").select("*").order("title");
      
      const gamesData = (gamesRes.data || []) as Game[];
      setAllGames(gamesData);

      setStats({
        total: ideasRes.count || 0,
        high: ideasRes.data?.filter(i => i.priority === 1).length || 0,
        scripts: scriptsRes.count || 0,
        games: gamesData.length
      });

      const pinnedRes = await supabase.from("details").select("*, game:games(*), footage(file_path, title)").eq("status", "idea").eq("pinned", true).order("created_at", { ascending: false });
      setPinnedIdeas((pinnedRes.data || []) as DetailRow[]);

      const recentRes = await supabase.from("details").select("*, game:games(*), footage(file_path, title)").eq("status", "idea").eq("pinned", false).order("created_at", { ascending: false }).limit(10);
      setRecentIdeas((recentRes.data || []) as DetailRow[]);

      const grps = await supabase.from("idea_groups").select("*").order("name");
      const grpItems = await supabase.from("idea_group_items").select("group_id");
      setGroups((grps.data || []) as Group[]);
      const m = new Map<number, number>();
      for (const row of grpItems.data ?? []) { const gid = Number((row as any).group_id); m.set(gid, (m.get(gid) ?? 0) + 1); }
      setGroupCounts(m);
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

      {/* SIDEBAR */}
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
               <div className="flex items-center justify-between px-2 mb-2 font-bold text-[10px] uppercase text-slate-400"><span>Collections</span><button onClick={()=>setShowCreateGroup(!showCreateGroup)} className="text-lg hover:text-blue-600">+</button></div>
               {showCreateGroup && <div className="mb-2"><input className="w-full border rounded px-2 py-1 text-xs outline-none focus:border-blue-500" value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createGroup()} placeholder="Name..." autoFocus/></div>}
               <div className="space-y-1">
                  {groups.map(g => (
                     <div key={g.id} className="group/item relative flex items-center justify-between w-full hover:bg-slate-50 rounded-xl px-2 py-1 transition cursor-pointer">
                        <div className="flex-1 flex items-center gap-2 overflow-hidden py-2 text-slate-500 font-medium text-sm">
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
           <div className="flex items-center justify-between mb-8">
             <h1 className="text-3xl font-black text-slate-900">Dashboard</h1>
             <button onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds([]); }} className={`h-10 px-4 rounded-xl font-bold border text-sm transition ${isSelectMode ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{isSelectMode ? "Exit Select" : "Select Mode"}</button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <StatCard title="Total Ideas" value={stats.total} icon={DocumentTextIcon} color="bg-blue-500" />
              <StatCard title="High Priority" value={stats.high} icon={FireIcon} color="bg-red-500" />
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