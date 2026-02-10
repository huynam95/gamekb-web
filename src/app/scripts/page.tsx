"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { 
  TrashIcon, 
  VideoCameraIcon,
  HashtagIcon,
  TagIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  PencilSquareIcon,
  DocumentTextIcon,
  PlayCircleIcon,
  CalendarIcon,
  GlobeAltIcon
} from "@heroicons/react/24/outline";

/* ================= TYPES & CONFIG ================= */

type ScriptProject = { 
  id: number; title: string; content: string; 
  assets: { url: string; name: string }[];
  description: string; hashtags: string[]; tags: string[];
  publish_date: string | null; 
  status: 'Draft' | 'Filming' | 'Edited' | 'Published';
  created_at: string;
};

const STATUS_CONFIG = {
  Draft: { color: "bg-slate-500/20 text-slate-100 border-slate-400/30", dot: "bg-slate-400" },
  Filming: { color: "bg-amber-500/20 text-amber-100 border-amber-400/30", dot: "bg-amber-500" },
  Edited: { color: "bg-indigo-500/20 text-indigo-100 border-indigo-400/30", dot: "bg-indigo-500" },
  Published: { color: "bg-emerald-500/20 text-emerald-100 border-emerald-400/30", dot: "bg-emerald-500" },
};

/* ================= COMPONENTS ================= */

function ScriptEditorModal({ isOpen, onClose, script, onSave }: any) {
  const [formData, setFormData] = useState<Partial<ScriptProject>>({
    title: "", content: "", description: "", hashtags: [], tags: [], status: "Draft", assets: []
  });
  const [activeTab, setActiveTab] = useState<"script" | "details" | "assets">("script");

  useEffect(() => { if (isOpen && script) setFormData(script); }, [isOpen, script]);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
       <div className="bg-white w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
          <div className="flex items-center justify-between px-8 py-5 border-b bg-slate-50/50">
             <h2 className="text-lg font-black text-slate-900">Project Workspace</h2>
             <div className="flex gap-3">
                <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-400">Cancel</button>
                <button onClick={() => { onSave(formData); onClose(); }} className="px-6 py-2 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-all">Save Project</button>
             </div>
          </div>
          <div className="flex px-8 border-b">
             {(["script", "details", "assets"] as const).map(tab => (
               <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400"}`}>{tab}</button>
             ))}
          </div>
          <div className="flex-1 overflow-y-auto p-8">
             {activeTab === "script" && <textarea className="h-full w-full rounded-2xl border border-slate-200 p-6 text-sm outline-none font-mono bg-slate-50/30" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />}
             {activeTab === "details" && <div className="space-y-6">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                <textarea className="w-full h-32 rounded-2xl border p-4 text-sm outline-none bg-white" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-bold text-slate-500">Hashtags: {formData.hashtags?.join(" ")}</div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-bold text-slate-500">Tags: {formData.tags?.join(", ")}</div>
                </div>
             </div>}
             {activeTab === "assets" && <div className="space-y-3">
                {formData.assets?.map((asset, i) => (
                  <div key={i} className="p-3 bg-white rounded-xl border flex items-center justify-between group">
                    <div className="truncate"><p className="text-xs font-black text-slate-800 truncate">{asset.name}</p><p className="text-[10px] text-blue-500 font-mono truncate">{asset.url}</p></div>
                    <a href={asset.url} target="_blank" className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600 transition-all"><VideoCameraIcon className="w-4 h-4"/></a>
                  </div>
                ))}
             </div>}
          </div>
       </div>
    </div>
  );
}

function ScriptCard({ script, onClick, onDelete }: { script: ScriptProject, onClick: () => void, onDelete: () => void }) {
  const status = STATUS_CONFIG[script.status] || STATUS_CONFIG.Draft;
  const coverUrl = script.assets && script.assets.length > 0 ? script.assets[0].url : null;

  return (
    <div onClick={onClick} className="group relative h-64 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col">
       {coverUrl ? (
         <div className="absolute inset-0 bg-cover bg-center opacity-60 transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${coverUrl})` }} />
       ) : (
         <div className="absolute inset-0 bg-slate-800 opacity-50" />
       )}
       <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />

       <div className="relative z-10 p-5 flex flex-col h-full justify-end">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
             <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border backdrop-blur-md ${status.color}`}>
                <div className={`w-1 h-1 rounded-full ${status.dot}`} />
                {script.status}
             </span>
             <span className="opacity-60">{new Date(script.created_at).toLocaleDateString()}</span>
          </div>
          <h3 className="line-clamp-2 text-base font-black text-white mb-2 leading-tight">{script.title || "Untitled Project"}</h3>
          <div className="flex items-center justify-between">
             <div className="flex gap-1.5 overflow-hidden">
                {script.hashtags?.slice(0, 2).map((h, i) => (
                  <span key={i} className="text-[9px] font-bold text-white/70 bg-white/10 px-1.5 py-0.5 rounded backdrop-blur-md">{h}</span>
                ))}
             </div>
             <div className="text-[10px] font-black text-white/40 flex items-center gap-1 uppercase tracking-widest">
                <VideoCameraIcon className="w-3.5 h-3.5" /> {script.assets?.length || 0}
             </div>
          </div>
       </div>

       <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="absolute top-3 right-3 p-1.5 bg-white/10 hover:bg-rose-500 text-white rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all">
          <TrashIcon className="w-4 h-4" />
       </button>
    </div>
  );
}

/* ================= MAIN PAGE ================= */

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<ScriptProject[]>([]);
  const [filteredScripts, setFilteredScripts] = useState<ScriptProject[]>([]);
  const [editingScript, setEditingScript] = useState<ScriptProject | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("scripts").select("*").order("created_at", { ascending: false });
      setScripts((data || []) as ScriptProject[]);
      setFilteredScripts((data || []) as ScriptProject[]);
    }
    load();
  }, []);

  useEffect(() => {
    const res = scripts.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    setFilteredScripts(res);
  }, [searchQuery, scripts]);

  const handleUpdate = async (data: any) => {
    const { error } = await supabase.from("scripts").update(data).eq("id", editingScript?.id);
    if (!error) {
      setScripts(prev => prev.map(s => s.id === editingScript?.id ? { ...s, ...data } : s));
      setIsModalOpen(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* SIDEBAR CỐ ĐỊNH */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-slate-200 bg-white hidden md:flex">
         <div className="flex h-20 items-center px-8 text-2xl font-black text-slate-900">GameKB<span className="text-blue-500">.</span></div>
         <nav className="flex-1 px-4 py-4 space-y-2">
            <Link href="/" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>🏠</span> All Ideas</Link>
            <Link href="/dashboard" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>📊</span> Dashboard</Link>
            <button className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold bg-slate-900 text-white shadow-lg transition text-left"><span>📜</span> Projects</button>
         </nav>
      </aside>

      <main className="flex-1 md:pl-72 pb-32">
        <div className="mx-auto max-w-[1600px] px-8 py-8">
           
           {/* SEARCH BAR TRÊN CÙNG - DUY NHẤT */}
           <div className="mb-10 relative group">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                className="h-14 w-full rounded-2xl border border-slate-200 pl-12 pr-12 shadow-sm outline-none focus:ring-4 focus:ring-slate-100 font-medium transition-all" 
                placeholder="Search projects by title..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
              {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><XMarkIcon className="w-5 h-5"/></button>}
           </div>

           {/* GRID THẺ - KÍCH THƯỚC IDEA CARD (h-64) */}
           <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {filteredScripts.map(s => (
                 <ScriptCard key={s.id} script={s} onClick={() => { setEditingScript(s); setIsModalOpen(true); }} onDelete={() => { if(confirm("Delete?")) supabase.from("scripts").delete().eq("id", s.id).then(()=>window.location.reload()); }} />
              ))}
           </ul>

           {filteredScripts.length === 0 && (
             <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-sm">No projects found</div>
           )}
        </div>
      </main>

      <ScriptEditorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} script={editingScript} onSave={handleUpdate} />
    </div>
  );
}