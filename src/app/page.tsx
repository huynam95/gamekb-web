"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { PlayCircleIcon } from "@heroicons/react/24/solid";
import { CheckIcon, TrashIcon } from "@heroicons/react/24/outline";

/* ================= TYPES ================= */

type Game = { id: number; title: string; cover_url?: string | null };
type Group = { id: number; name: string };
type FootageItem = { file_path: string; title: string | null };
type DetailRow = { 
  id: number; title: string; description: string | null; priority: number; 
  detail_type: string; game_id: number; pinned?: boolean; created_at?: string; 
  footage?: FootageItem[]; 
};

type ScriptProject = { 
  id: number; title: string; content: string; assets: string[];
  description: string; hashtags: string[]; tags: string[];
  publish_date: string | null; status: string;
};

/* ================= CONFIG ================= */

const ITEMS_PER_PAGE = 24;

// 1. CONFIG TYPE ĐẦY ĐỦ
const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  small_detail: { label: "🔍 Small Detail", className: "bg-blue-500/20 border-blue-400/30 text-blue-100" },
  easter_egg: { label: "🥚 Easter Egg", className: "bg-purple-500/20 border-purple-400/30 text-purple-100" },
  npc_reaction: { label: "🗣️ NPC Reaction", className: "bg-emerald-500/20 border-emerald-400/30 text-emerald-100" },
  physics: { label: "🍎 Physics", className: "bg-orange-500/20 border-orange-400/30 text-orange-100" },
  troll: { label: "🤡 Troll", className: "bg-pink-500/20 border-pink-400/30 text-pink-100" },
  punish: { label: "💀 Punish", className: "bg-red-500/20 border-red-400/30 text-red-100" },
  default: { label: "📝 Note", className: "bg-slate-500/20 border-slate-400/30 text-slate-100" }
};

// 2. CONFIG PRIORITY ĐẦY ĐỦ
const PRIORITY_OPTIONS = [
  { value: 1, label: "🔥 High (1)" },
  { value: 2, label: "⬆️ Medium (2)" },
  { value: 3, label: "➡️ Normal (3)" },
  { value: 4, label: "⬇️ Low (4)" },
  { value: 5, label: "❄️ Tiny (5)" }
];

const selectClass = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition cursor-pointer";

/* ================= COMPONENTS ================= */

function TypePill({ typeKey }: { typeKey: string }) {
  const config = TYPE_CONFIG[typeKey] || TYPE_CONFIG.default;
  return <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${config.className}`}>{config.label}</span>;
}

// COMPONENT: COMBOBOX (GAME SELECTOR)
function ComboBox({ placeholder, items, selectedId, onChange }: { placeholder: string; items: { id: number; name: string }[]; selectedId: number | ""; onChange: (id: number | "") => void }) {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(""); const boxRef = useRef<HTMLDivElement>(null);
  const filtered = items.filter(x => x.name.toLowerCase().includes(query.toLowerCase())).slice(0, 50);
  useEffect(() => { function f(e:any){if(boxRef.current && !boxRef.current.contains(e.target))setOpen(false)} document.addEventListener("mousedown", f); return ()=>document.removeEventListener("mousedown",f)},[]);
  return (
    <div ref={boxRef} className="relative w-full h-10">
      <button className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-left text-sm text-slate-900 cursor-pointer flex items-center justify-between" onClick={() => setOpen(!open)}>
        <span className="truncate">{items.find(x=>x.id===selectedId)?.name || <span className="text-slate-400">{placeholder}</span>}</span>
        <span className="text-slate-400 text-xs">▼</span>
      </button>
      {open && <div className="absolute left-0 top-full z-20 mt-1 w-full min-w-[200px] rounded-xl border border-slate-200 bg-white shadow-xl p-2"><input className="w-full rounded-lg border px-2 py-1 text-sm mb-2 outline-none focus:border-blue-500" value={query} onChange={e=>setQuery(e.target.value)} autoFocus placeholder="Search..."/><div className="max-h-60 overflow-auto"><button className="w-full text-left p-2 hover:bg-slate-100 text-sm cursor-pointer rounded-lg" onClick={()=>{onChange("");setOpen(false)}}>All Games</button>{filtered.map(x=><button key={x.id} className="w-full text-left p-2 hover:bg-blue-50 text-sm cursor-pointer rounded-lg truncate" onClick={()=>{onChange(x.id);setOpen(false)}}>{x.name}</button>)}</div></div>}
    </div>
  );
}

// COMPONENT: IDEA CARD
function IdeaItem({ r, game, isSelectMode, isSelected, onToggleSelect, onTogglePin }: { 
  r: DetailRow; game?: Game; 
  isSelectMode: boolean; isSelected: boolean; 
  onToggleSelect: (id: number) => void;
  onTogglePin: (id: number, current: boolean) => void; 
}) {
  const hasCover = !!game?.cover_url;

  return (
    <li 
      onClick={() => isSelectMode && onToggleSelect(r.id)}
      className={`group relative h-64 w-full overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 ${
        isSelectMode 
          ? "cursor-pointer active:scale-95" 
          : "hover:shadow-2xl hover:-translate-y-1"
      } ${
        isSelected 
          ? "border-blue-500 ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-50" 
          : "border-slate-200 bg-slate-900"
      }`}
    >
        {hasCover ? (
          <div className={`absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out opacity-60 ${isSelectMode ? '' : 'group-hover:scale-110 group-hover:opacity-40'}`} style={{ backgroundImage: `url(${game.cover_url})` }} />
        ) : (
          <div className="absolute inset-0 bg-slate-800 opacity-50" />
        )}
        <div className={`absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent ${isSelected ? 'opacity-90 bg-blue-900/20' : ''}`} />

        {isSelectMode && (
          <div className="absolute top-3 right-3 z-30">
             <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-white/50 bg-black/20"}`}>
                {isSelected && <CheckIcon className="h-4 w-4 stroke-[3]" />}
             </div>
          </div>
        )}

        <div className="absolute inset-0 flex flex-col justify-end p-5">
           <div className="z-10">
              <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span className="truncate">{game?.title}</span>
              </div>
              <h3 className="line-clamp-2 text-base font-bold leading-snug text-white mb-2">
                {r.title}
              </h3>
              <div className="flex items-center gap-2">
                 <TypePill typeKey={r.detail_type} />
                 {r.pinned && <span className="text-[10px] font-bold text-amber-400">★ Pinned</span>}
              </div>
           </div>
        </div>

        {!isSelectMode && (
           <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(r.id, !!r.pinned); }}
                className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md shadow-lg ${r.pinned ? 'bg-amber-400 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                 {r.pinned ? "★" : "☆"}
              </button>
           </div>
        )}
        <a href={`/idea/${r.id}`} className={`absolute inset-0 z-0 ${isSelectMode ? 'pointer-events-none' : ''}`} />
    </li>
  );
}

// COMPONENT: SCRIPT EDITOR MODAL
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
          return initialData.games.find(g => g.id === i.game_id)?.title || "";
       }).filter(Boolean)));

       const generatedContent = initialData.ideas.map(i => `[${i.title}]\n${i.description || ""}`).join("\n\n");
       const generatedAssets = initialData.ideas.flatMap(i => i.footage?.map(f => f.file_path) || []).filter(Boolean) as string[];
       const generatedDesc = `Video tổng hợp các chi tiết thú vị trong game.\n\nTimestamps:\n0:00 Intro\n...`;
       const generatedTags = [...gameNames, "Shorts", "Gaming", "Facts"];
       const generatedHashtags = ["#shorts", "#gaming", ...gameNames.map(g => `#${g.replace(/\s+/g, '')}`)];

       setFormData({
         title: `Shorts: ${titles[0]}...`,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
       <div className="bg-white w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
             <div><h2 className="text-xl font-black text-slate-900">Create Video Script</h2><p className="text-xs text-slate-500">Drafting from {initialData.ideas.length} selected ideas</p></div>
             <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button onClick={() => { onSave(formData); onClose(); }} className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20">Save Project</button>
             </div>
          </div>
          <div className="flex px-6 border-b border-slate-100 bg-slate-50">
             {(["script", "details", "assets"] as const).map(tab => (
               <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-3 text-sm font-bold border-b-2 transition ${activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                 {tab === "script" ? "📝 Script Content" : tab === "details" ? "ℹ️ Metadata" : "🔗 Assets"}
               </button>
             ))}
          </div>
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
             {activeTab === "script" && (
                <div className="h-full flex flex-col gap-4">
                   <div className="flex items-center justify-between"><label className="text-xs font-bold uppercase text-slate-400">Voiceover Script</label><button onClick={() => navigator.clipboard.writeText(formData.content || "")} className="text-xs text-blue-600 font-bold hover:underline">Copy for TTS</button></div>
                   <textarea className="flex-1 w-full rounded-2xl border border-slate-200 p-5 text-sm leading-relaxed text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 font-mono" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} placeholder="Write your script here..." />
                </div>
             )}
             {activeTab === "details" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Video Title</label><input className="w-full h-12 rounded-xl border border-slate-200 px-4 font-bold text-slate-900 outline-none focus:border-blue-500" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
                      <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Description</label><textarea className="w-full h-32 rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                   </div>
                   <div className="space-y-4">
                      <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Hashtags (#)</label><div className="flex flex-wrap gap-2 p-3 rounded-xl border border-slate-200 bg-white min-h-[50px]">{formData.hashtags?.map((tag, i) => (<span key={i} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg">{tag}</span>))}<input className="flex-1 min-w-[100px] outline-none text-xs" placeholder="Add tag..." onKeyDown={e => { if(e.key === 'Enter') { const val = e.currentTarget.value.trim(); if(val) { setFormData({...formData, hashtags: [...(formData.hashtags||[]), val.startsWith('#')?val:'#'+val]}); e.currentTarget.value = ""; }}}} /></div></div>
                      <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Hidden Tags</label><div className="flex flex-wrap gap-2 p-3 rounded-xl border border-slate-200 bg-white min-h-[50px]">{formData.tags?.map((tag, i) => (<span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg">{tag}</span>))}<input className="flex-1 min-w-[100px] outline-none text-xs" placeholder="Add keyword..." onKeyDown={e => { if(e.key === 'Enter') { const val = e.currentTarget.value.trim(); if(val) { setFormData({...formData, tags: [...(formData.tags||[]), val]}); e.currentTarget.value = ""; }}}} /></div></div>
                      <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Schedule Date</label><input type="datetime-local" className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm" onChange={e => setFormData({...formData, publish_date: e.target.value})} /></div>
                   </div>
                </div>
             )}
             {activeTab === "assets" && (
                <div className="space-y-4">
                   <div className="flex justify-between"><p className="text-sm text-slate-500">Collected assets.</p><button onClick={() => navigator.clipboard.writeText(formData.assets?.join("\n") || "")} className="text-xs font-bold text-blue-600 hover:underline">Copy All Links</button></div>
                   <div className="bg-white rounded-xl border border-slate-200 p-2">{(formData.assets || []).map((link, i) => (<div key={i} className="flex items-center gap-3 p-2 border-b border-slate-50 last:border-0 hover:bg-slate-50"><span className="text-xs font-mono text-slate-400">#{i+1}</span><a href={link} target="_blank" className="text-xs text-blue-600 truncate flex-1">{link}</a></div>))}</div>
                </div>
             )}
          </div>
       </div>
    </div>
  );
}

/* ================= PAGE LOGIC (MAIN) ================= */

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupCounts, setGroupCounts] = useState<Map<number, number>>(new Map());
  const [ideas, setIdeas] = useState<DetailRow[]>([]);
  
  // Selection Mode State
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showEditor, setShowEditor] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [gameId, setGameId] = useState<number | "">("");
  const [groupId, setGroupId] = useState<number | "">("");
  const [type, setType] = useState<string | "">("");
  const [priority, setPriority] = useState<number | "">("");
  const [loading, setLoading] = useState(true);

  // Sidebar UI
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  // Load Meta
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

  // Load Ideas
  useEffect(() => {
    async function load() {
      setLoading(true);
      let query = supabase.from("details").select("*, footage(file_path, title)").eq("status", "idea");
      
      if (groupId) {
         const { data: items } = await supabase.from("idea_group_items").select("detail_id").eq("group_id", groupId);
         const ids = (items || []).map((x:any) => x.detail_id);
         if(ids.length === 0) { setIdeas([]); setLoading(false); return; }
         query = query.in("id", ids);
      }
      if (gameId) query = query.eq("game_id", gameId);
      if (type) query = query.eq("detail_type", type); 
      if (priority) query = query.eq("priority", priority);
      if (debouncedQ.trim()) query = query.ilike("title", `%${debouncedQ.trim()}%`);

      const { data } = await query.order("created_at", { ascending: false });
      setIdeas((data ?? []) as DetailRow[]);
      setCurrentPage(1);
      setLoading(false);
    }
    load();
  }, [debouncedQ, gameId, groupId, type, priority]);

  // Logic
  const toggleSelection = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSaveScript = async (data: Partial<ScriptProject>) => {
    const { error } = await supabase.from("scripts").insert(data);
    if (!error) {
       alert("Script saved to database!");
       setIsSelectMode(false);
       setSelectedIds([]);
    } else {
       alert("Error saving script: " + error.message);
    }
  };

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

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(ideas.length / ITEMS_PER_PAGE);
  const currentIdeas = ideas.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const goToPage = (p: number) => {
    setCurrentPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const btnPage = "inline-flex h-10 min-w-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* EDITOR MODAL */}
      <ScriptEditorModal 
        isOpen={showEditor} 
        onClose={() => setShowEditor(false)}
        onSave={handleSaveScript}
        initialData={{
           ids: selectedIds,
           ideas: ideas.filter(i => selectedIds.includes(i.id)),
           games: games
        }}
      />

      {/* BOTTOM SELECTION BAR (Sticky) */}
      {isSelectMode && (
         <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-10">
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

      {/* SIDEBAR FULL */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-slate-200 bg-white hidden md:flex">
         <div className="flex h-20 items-center px-8 text-2xl font-black text-slate-900">GameKB<span className="text-blue-500">.</span></div>
         <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            <nav className="space-y-2">
               <button onClick={() => {setGroupId(""); setQ("");}} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition cursor-pointer ${!groupId ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-100"}`}><span>🏠</span> All Ideas</button>
               <Link href="/dashboard" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>📊</span> Dashboard</Link>
               <Link href="/scripts" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>📜</span> Scripts</Link>
               <Link href="/games/new" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>🕹️</span> Add Game</Link>
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
                        <button onClick={()=>deleteGroup(g)} className="absolute right-1 top-2 hidden text-xs text-rose-400 group-hover/item:block cursor-pointer"><TrashIcon className="h-4 w-4"/></button>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 pl-0 md:pl-72 pb-32">
        <div className="mx-auto max-w-[1900px] px-6 py-8">
          
          {/* HEADER WITH FILTERS */}
          <header className="mb-8 space-y-4">
             {/* Row 1: Search & Actions */}
             <div className="flex gap-4">
                <div className="flex-1 relative">
                   <input className="h-12 w-full rounded-2xl border border-slate-200 px-4 shadow-sm outline-none focus:ring-2 focus:ring-slate-200" placeholder="Search ideas..." value={q} onChange={e=>setQ(e.target.value)} />
                </div>
                <button 
                  onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds([]); }}
                  className={`h-12 px-6 rounded-2xl font-bold border transition ${isSelectMode ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  {isSelectMode ? "Exit Selection" : "Select Mode"}
                </button>
                <Link href="/add" className="h-12 px-6 flex items-center justify-center rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition">+ Add</Link>
             </div>

             {/* Row 2: Filters */}
             <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-3/4">
               <ComboBox placeholder="Game" items={games.map(g=>({id:g.id, name:g.title}))} selectedId={gameId} onChange={setGameId} />
               
               {/* TYPE SELECTOR (Dynamically generated) */}
               <select className={selectClass} value={type} onChange={e=>setType(e.target.value)}>
                  <option value="">All Types</option>
                  {Object.entries(TYPE_CONFIG).filter(([k]) => k !== 'default').map(([key, val]) => (
                     <option key={key} value={key}>{val.label}</option>
                  ))}
               </select>

               {/* PRIORITY SELECTOR (Dynamically generated) */}
               <select className={selectClass} value={priority} onChange={e=>setPriority(e.target.value ? Number(e.target.value) : "")}>
                  <option value="">All Priority</option>
                  {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
               </select>

               {(q||gameId||groupId||type||priority) && <button onClick={()=>{setQ("");setGameId("");setGroupId("");setType("");setPriority("")}} className="text-sm text-rose-500 cursor-pointer">Clear Filters</button>}
             </div>
          </header>

          <div className="mb-6 flex items-center justify-between">
             <h2 className="text-2xl font-black text-slate-900">{loading ? "Loading..." : `${ideas.length} Ideas Found`}</h2>
             {groupId && <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold">Group Active</span>}
          </div>

          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {currentIdeas.map(r => (
               <IdeaItem 
                 key={r.id} 
                 r={r} 
                 game={games.find(g => g.id === r.game_id)} 
                 isSelectMode={isSelectMode}
                 isSelected={selectedIds.includes(r.id)}
                 onToggleSelect={toggleSelection}
                 onTogglePin={async (id, current) => {
                    setIdeas(prev => prev.map(i => i.id === id ? { ...i, pinned: !current } : i));
                    await supabase.from("details").update({ pinned: !current }).eq("id", id);
                 }}
               />
            ))}
          </ul>

          {/* PAGINATION CONTROLS */}
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