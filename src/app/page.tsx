"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { 
  PlusIcon, 
  StarIcon as StarSolid, 
  DocumentTextIcon, 
  LinkIcon, 
  XMarkIcon, 
  ChevronUpIcon,
  ChevronDownIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon
} from "@heroicons/react/24/solid";
import { StarIcon as StarOutline } from "@heroicons/react/24/outline";

/* ================= TYPES ================= */

type Game = { id: number; title: string; cover_url?: string | null };
type Group = { id: number; name: string };
type FootageItem = { file_path: string; title: string | null };
type DetailRow = { 
  id: number; title: string; description: string | null; priority: number; 
  detail_type: string; game_id: number; pinned?: boolean; created_at?: string; 
  footage?: FootageItem[]; 
};
type ScriptProject = { id: number; title: string; content: string; assets: string[] };

/* ================= CONFIG ================= */

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  small_detail: { label: "Small Detail", className: "bg-blue-500/20 border-blue-400/30 text-blue-100" },
  easter_egg: { label: "Easter Egg", className: "bg-purple-500/20 border-purple-400/30 text-purple-100" },
  npc_reaction: { label: "NPC Reaction", className: "bg-emerald-500/20 border-emerald-400/30 text-emerald-100" },
  physics: { label: "Physics", className: "bg-orange-500/20 border-orange-400/30 text-orange-100" },
  troll: { label: "Troll", className: "bg-pink-500/20 border-pink-400/30 text-pink-100" },
  punish: { label: "Punish", className: "bg-red-500/20 border-red-400/30 text-red-100" },
  default: { label: "Note", className: "bg-slate-500/20 border-slate-400/30 text-slate-100" }
};

/* ================= COMPONENTS ================= */

function TypePill({ typeKey }: { typeKey: string }) {
  const config = TYPE_CONFIG[typeKey] || TYPE_CONFIG.default;
  return <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${config.className}`}>{config.label}</span>;
}

// COMPONENT: CLEANER IDEA CARD
function IdeaItem({ r, game, onTogglePin, onAddToScript }: { r: DetailRow; game?: Game; onTogglePin: (id: number, current: boolean) => void; onAddToScript: (desc: string, footage: FootageItem[]) => void }) {
  const hasCover = !!game?.cover_url;

  return (
    <li className="group relative h-64 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-sm transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
        {/* Background Layer */}
        {hasCover ? (
          <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110 opacity-60 group-hover:opacity-40" style={{ backgroundImage: `url(${game.cover_url})` }} />
        ) : (
          <div className="absolute inset-0 bg-slate-800 opacity-50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

        {/* Content Layer */}
        <div className="absolute inset-0 flex flex-col justify-end p-5">
           {/* Top Badges */}
           <div className="absolute top-3 left-3 flex gap-2">
              {r.priority === 1 && <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white shadow-sm">High</span>}
           </div>

           {/* MAIN TEXT */}
           <div className="z-10">
              <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span className="truncate">{game?.title}</span>
              </div>
              <h3 className="line-clamp-2 text-base font-bold leading-snug text-white group-hover:text-blue-200 mb-2">
                {r.title}
              </h3>
              <div className="flex items-center gap-2">
                 <TypePill typeKey={r.detail_type} />
                 {r.pinned && <span className="text-[10px] font-bold text-amber-400">★ Pinned</span>}
              </div>
           </div>
        </div>

        {/* HOVER ACTIONS (Chỉ hiện khi di chuột) */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 translate-x-10 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 z-20">
           {/* Pin Button */}
           <button 
             onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(r.id, !!r.pinned); }}
             className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md shadow-lg transition hover:scale-110 ${r.pinned ? 'bg-amber-400 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
             title="Pin"
           >
             {r.pinned ? <StarSolid className="h-4 w-4" /> : <StarOutline className="h-4 w-4" />}
           </button>

           {/* Add Script Button */}
           <button 
             onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddToScript(r.description || "", r.footage || []); }}
             className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg backdrop-blur-md transition hover:bg-blue-500 hover:scale-110"
             title="Add to Script"
           >
             <PlusIcon className="h-4 w-4" />
           </button>
        </div>

        {/* Clickable Link Overlay */}
        <a href={`/idea/${r.id}`} className="absolute inset-0 z-0" />
    </li>
  );
}

// COMPONENT: MODERN SCRIPT DOCK (HUD STYLE)
function ScriptDock({ 
  currentScript, 
  scripts, 
  onSelectScript, 
  onUpdateContent, 
  onCreateScript 
}: { 
  currentScript: ScriptProject | null, 
  scripts: ScriptProject[], 
  onSelectScript: (id: number) => void,
  onUpdateContent: (content: string) => void,
  onCreateScript: () => void
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"text" | "assets">("text");
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState(false); // Hiệu ứng nháy khi data thay đổi

  // Trigger flash effect when content changes (visual feedback)
  useEffect(() => {
    if (currentScript) {
        setFlash(true);
        const t = setTimeout(() => setFlash(false), 300);
        return () => clearTimeout(t);
    }
  }, [currentScript?.content, currentScript?.assets?.length]);

  const wordCount = currentScript?.content ? currentScript.content.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  const estimatedSeconds = Math.round(wordCount / 2.5); // Approx reading speed
  
  const handleCopy = () => {
     const text = activeTab === "text" ? (currentScript?.content || "") : (currentScript?.assets || []).join("\n");
     navigator.clipboard.writeText(text);
     setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  // 1. MINIMIZED STATE (Pill)
  if (!isOpen) {
     return (
        <div className="fixed bottom-6 right-6 z-50">
           <button 
             onClick={() => setIsOpen(true)}
             className={`group flex items-center gap-3 rounded-full bg-slate-900/90 pl-4 pr-5 py-3 text-white shadow-2xl backdrop-blur-xl border border-white/10 transition-all hover:scale-105 hover:bg-slate-800 ${flash ? "ring-2 ring-blue-500" : ""}`}
           >
             <div className="relative">
                <span className="text-xl">📜</span>
                {currentScript && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse border border-slate-900"/>}
             </div>
             <div className="text-left flex flex-col items-start">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Script Dock</div>
                <div className="text-xs font-medium max-w-[150px] truncate">
                   {currentScript ? currentScript.title : "No Project Selected"}
                </div>
             </div>
             <ChevronUpIcon className="h-4 w-4 text-slate-500 group-hover:text-white transition" />
           </button>
        </div>
     );
  }

  // 2. EXPANDED STATE (HUD Panel)
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[90vw] md:w-[500px] rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-2xl shadow-2xl animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[80vh]">
       
       {/* Header */}
       <div className="flex items-center justify-between border-b border-slate-200/50 px-4 py-3 bg-white/50">
          <select 
             className="bg-transparent text-sm font-bold text-slate-900 outline-none cursor-pointer max-w-[200px] hover:text-blue-600 transition"
             value={currentScript?.id || ""}
             onChange={(e) => e.target.value === "new" ? onCreateScript() : onSelectScript(Number(e.target.value))}
          >
             <option value="" disabled>Select Project...</option>
             {scripts.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
             <option value="new" className="text-blue-600">+ New Project...</option>
          </select>
          <button onClick={() => setIsOpen(false)} className="rounded-full p-1 hover:bg-slate-200/50 text-slate-400 transition">
             <ChevronDownIcon className="h-5 w-5" />
          </button>
       </div>

       {/* Tabs & Stats */}
       {currentScript && (
        <div className="px-4 py-2 flex items-center justify-between bg-slate-50/50 border-b border-slate-100">
           <div className="flex gap-1 p-1 bg-slate-200/50 rounded-lg">
              <button onClick={() => setActiveTab("text")} className={`px-3 py-1 text-xs font-bold rounded-md transition ${activeTab === "text" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                 Script
              </button>
              <button onClick={() => setActiveTab("assets")} className={`px-3 py-1 text-xs font-bold rounded-md transition ${activeTab === "assets" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                 Links <span className="opacity-60">({currentScript.assets?.length || 0})</span>
              </button>
           </div>
           <div className={`text-xs font-mono font-bold px-2 py-1 rounded ${estimatedSeconds > 60 ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'}`}>
              {estimatedSeconds}s / 60s
           </div>
        </div>
       )}

       {/* Content Area */}
       <div className="flex-1 overflow-hidden relative group">
          {!currentScript ? (
             <div className="flex h-64 flex-col items-center justify-center text-slate-400 p-8 text-center">
                <DocumentTextIcon className="h-10 w-10 mb-2 opacity-20" />
                <p className="text-sm">Select or create a project to start gathering ideas.</p>
             </div>
          ) : activeTab === "text" ? (
             <textarea 
               className="h-[300px] w-full resize-none bg-transparent p-4 text-sm leading-relaxed text-slate-700 placeholder:text-slate-300 outline-none font-mono"
               placeholder="Script content will appear here..."
               value={currentScript.content || ""}
               onChange={(e) => onUpdateContent(e.target.value)}
               spellCheck={false}
             />
          ) : (
             <div className="h-[300px] w-full overflow-y-auto p-2 space-y-1">
                {(currentScript.assets || []).length === 0 ? <p className="text-xs text-slate-400 p-4 text-center">No video assets collected yet.</p> : 
                   currentScript.assets.map((link, i) => (
                     <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 p-2 group/link hover:border-blue-200 transition">
                        <span className="text-[10px] font-bold text-slate-400 w-5">#{i+1}</span>
                        <a href={link} target="_blank" className="flex-1 truncate text-xs text-blue-600 hover:underline">{link}</a>
                     </div>
                   ))
                }
             </div>
          )}
       </div>

       {/* Footer Actions */}
       {currentScript && (
          <div className="border-t border-slate-100 p-3 bg-white/80 flex justify-end">
             <button 
               onClick={handleCopy}
               className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800 active:scale-95 transition"
             >
               {copied ? <ClipboardDocumentCheckIcon className="h-4 w-4"/> : <ClipboardDocumentIcon className="h-4 w-4"/>}
               {copied ? "Copied!" : (activeTab === "text" ? "Copy Text" : "Copy Links")}
             </button>
          </div>
       )}
    </div>
  );
}

/* ================= PAGE LOGIC (MAIN) ================= */

export default function Home() {
  const ITEMS_PER_PAGE = 24;

  const [games, setGames] = useState<Game[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [ideas, setIdeas] = useState<DetailRow[]>([]);
  const [scripts, setScripts] = useState<ScriptProject[]>([]);
  const [currentScriptId, setCurrentScriptId] = useState<number | null>(null);

  // Filters state
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [gameId, setGameId] = useState<number | "">("");
  const [groupId, setGroupId] = useState<number | "">("");
  const [loading, setLoading] = useState(true);

  const activeScript = useMemo(() => scripts.find(s => s.id === currentScriptId) || null, [scripts, currentScriptId]);

  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q), 300); return () => clearTimeout(t); }, [q]);

  // Initial Load
  useEffect(() => {
    Promise.all([
      supabase.from("games").select("*").order("title"),
      supabase.from("idea_groups").select("*").order("name"),
      supabase.from("scripts").select("*").order("created_at", { ascending: false })
    ]).then(([gs, grps, scrs]) => {
      setGames((gs.data ?? []) as Game[]);
      setGroups((grps.data ?? []) as Group[]);
      setScripts((scrs.data ?? []) as ScriptProject[]);
      if (scrs.data && scrs.data.length > 0) setCurrentScriptId(scrs.data[0].id);
    });
  }, []);

  // Filter Logic
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
      if (debouncedQ.trim()) query = query.ilike("title", `%${debouncedQ.trim()}%`);

      const { data } = await query.order("created_at", { ascending: false });
      setIdeas((data ?? []) as DetailRow[]);
      setLoading(false);
    }
    load();
  }, [debouncedQ, gameId, groupId]);

  // Actions
  async function togglePinFast(id: number, currentStatus: boolean) {
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, pinned: !currentStatus } : i));
    await supabase.from("details").update({ pinned: !currentStatus }).eq("id", id);
  }

  async function createNewScript() {
    const title = prompt("Project Name:");
    if(!title) return;
    const { data } = await supabase.from("scripts").insert({ title, content: "", assets: [] }).select().single();
    if(data) { setScripts(p => [data, ...p]); setCurrentScriptId(data.id); }
  }

  async function handleAddToScript(desc: string, footage: FootageItem[]) {
    if(!activeScript) { alert("Please open the Script Dock and create a project first!"); return; }
    
    const newContent = activeScript.content + (activeScript.content ? "\n\n" : "") + desc;
    const newAssets = [...(activeScript.assets || []), ...(footage?.map(f => f.file_path) || [])];

    const updated = { ...activeScript, content: newContent, assets: newAssets };
    setScripts(prev => prev.map(s => s.id === activeScript.id ? updated : s));
    await supabase.from("scripts").update({ content: newContent, assets: newAssets }).eq("id", activeScript.id);
  }

  async function updateScriptContent(newContent: string) {
    if(!activeScript) return;
    const updated = { ...activeScript, content: newContent };
    setScripts(prev => prev.map(s => s.id === activeScript.id ? updated : s));
    await supabase.from("scripts").update({ content: newContent }).eq("id", activeScript.id);
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* SCRIPT HUD */}
      <ScriptDock 
        currentScript={activeScript} 
        scripts={scripts} 
        onSelectScript={setCurrentScriptId}
        onCreateScript={createNewScript}
        onUpdateContent={updateScriptContent}
      />

      {/* SIDEBAR (GIỮ NGUYÊN CODE CŨ NHƯNG CẨN THẬN IMPORT LINK) */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-slate-200 bg-white hidden md:flex">
         <div className="flex h-20 items-center px-8 text-2xl font-black text-slate-900">GameKB<span className="text-blue-500">.</span></div>
         <div className="flex-1 px-4 py-4 space-y-2">
            <button onClick={() => {setGroupId(""); setQ("");}} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${!groupId ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}>All Ideas</button>
            <Link href="/dashboard" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100">Dashboard</Link>
            <Link href="/scripts" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100">Scripts</Link>
            
            <div className="pt-4 mt-4 border-t border-slate-100">
               <h3 className="px-2 text-xs font-bold uppercase text-slate-400 mb-2">Groups</h3>
               {groups.map(g => (
                  <button key={g.id} onClick={() => setGroupId(g.id)} className={`flex w-full justify-between rounded-xl px-4 py-2 text-sm font-medium ${groupId === g.id ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"}`}>
                     {g.name}
                  </button>
               ))}
            </div>
         </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 pl-0 md:pl-72">
        <div className="mx-auto max-w-[1900px] px-6 py-8 pb-32"> {/* pb-32 để không bị Script Dock che */}
          
          <header className="mb-8 flex gap-4">
             <input className="h-12 w-full rounded-2xl border border-slate-200 px-4 shadow-sm outline-none focus:ring-2 focus:ring-slate-200 transition" placeholder="Search ideas..." value={q} onChange={e=>setQ(e.target.value)} />
             <Link href="/add" className="inline-flex h-12 px-6 items-center justify-center rounded-2xl bg-slate-900 text-white font-bold shadow-lg hover:bg-slate-800 transition">Create</Link>
          </header>

          <div className="mb-6 flex items-center justify-between">
             <h2 className="text-2xl font-black text-slate-900">{loading ? "Loading..." : `${ideas.length} Ideas Found`}</h2>
             {groupId && <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold">Group Active</span>}
          </div>

          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {ideas.map(r => (
               <IdeaItem 
                 key={r.id} 
                 r={r} 
                 game={games.find(g => g.id === r.game_id)} 
                 onTogglePin={togglePinFast} 
                 onAddToScript={handleAddToScript}
               />
            ))}
          </ul>

          {!loading && ideas.length === 0 && <div className="py-20 text-center text-slate-400 italic">No content found.</div>}
        </div>
      </main>
    </div>
  );
}