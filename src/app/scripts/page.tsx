"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { 
  TrashIcon, 
  DocumentTextIcon, 
  CalendarIcon,
  PlayCircleIcon,
  VideoCameraIcon,
  HashtagIcon,
  TagIcon,
  DocumentDuplicateIcon,
  GlobeAltIcon,
  ClockIcon
} from "@heroicons/react/24/outline";

/* ================= TYPES & CONFIG ================= */

type ScriptProject = { 
  id: number; 
  title: string; 
  content: string; 
  assets: { url: string; name: string }[];
  description: string; 
  hashtags: string[]; 
  tags: string[];
  publish_date: string | null; 
  status: 'Draft' | 'Filming' | 'Edited' | 'Published';
  created_at: string;
  cover_url?: string; 
};

type Group = { id: number; name: string };

const STATUS_CONFIG = {
  Draft: { color: "bg-slate-500/20 text-slate-200 border-slate-400/30", dot: "bg-slate-400", icon: DocumentTextIcon },
  Filming: { color: "bg-blue-500/20 text-blue-100 border-blue-400/30", dot: "bg-blue-400", icon: PlayCircleIcon },
  Edited: { color: "bg-purple-500/20 text-purple-100 border-purple-400/30", dot: "bg-purple-400", icon: CalendarIcon },
  Published: { color: "bg-emerald-500/20 text-emerald-100 border-emerald-400/30", dot: "bg-emerald-400", icon: GlobeAltIcon },
};

/* ================= COMPONENTS ================= */

function ScriptEditorModal({ 
  isOpen, onClose, script, onSave 
}: { 
  isOpen: boolean; onClose: () => void; 
  script: ScriptProject | null;
  onSave: (data: Partial<ScriptProject>) => void;
}) {
  const [formData, setFormData] = useState<Partial<ScriptProject>>({
    title: "", content: "", description: "", hashtags: [], tags: [], publish_date: null, status: "Draft", assets: []
  });
  const [activeTab, setActiveTab] = useState<"details" | "script" | "assets">("script");

  useEffect(() => {
    if (isOpen && script) {
      setFormData(script);
    }
  }, [isOpen, script]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
       <div className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
             <div><h2 className="text-xl font-black text-slate-900">Project Details</h2></div>
             <div className="flex gap-3">
                <select className="h-10 rounded-xl border px-3 text-sm font-bold outline-none cursor-pointer" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                   {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500">Cancel</button>
                <button onClick={() => { onSave(formData); onClose(); }} className="px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl">Save</button>
             </div>
          </div>
          <div className="flex px-6 border-b border-slate-100">
             {(["script", "details", "assets"] as const).map(tab => (
               <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition ${activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400"}`}>
                 {tab === "script" ? "Script" : tab === "details" ? "Metadata" : "Assets"}
               </button>
             ))}
          </div>
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
             {activeTab === "script" && <textarea className="h-full w-full rounded-2xl border p-6 text-sm outline-none font-mono" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />}
             {activeTab === "details" && <div className="space-y-6">
                <textarea className="w-full h-40 rounded-xl border p-4 text-xs shadow-sm" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Hashtags</label><div className="flex flex-wrap gap-2">{formData.hashtags?.map((t,i)=><span key={i} className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold">{t}</span>)}</div></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Tags</label><div className="flex flex-wrap gap-2">{formData.tags?.map((t,i)=><span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">{t}</span>)}</div></div>
                </div>
             </div>}
             {activeTab === "assets" && <div className="bg-white rounded-2xl border divide-y">
                {(formData.assets || []).map((asset, i) => (
                   <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div className="min-w-0 flex-1"><p className="text-sm font-bold truncate">{asset.name}</p><p className="text-[10px] text-blue-500 truncate">{asset.url}</p></div>
                      <a href={asset.url} target="_blank" className="p-2 bg-slate-100 rounded-lg ml-4"><VideoCameraIcon className="w-4 h-4"/></a>
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
  return (
    <div onClick={onClick} className="group relative h-72 w-full overflow-hidden rounded-2xl border bg-slate-900 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 cursor-pointer flex flex-col">
       {script.cover_url ? <div className="absolute inset-0 bg-cover bg-center opacity-50 transition-transform duration-1000 group-hover:scale-110" style={{ backgroundImage: `url(${script.cover_url})` }} /> : <div className="absolute inset-0 bg-slate-800" />}
       <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
       <div className="relative p-6 flex flex-col h-full z-10">
          <div className="flex justify-between items-start mb-4">
             <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border backdrop-blur-md ${status.color}`}><div className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse`} />{script.status}</span>
             <div className="text-[10px] text-slate-400 font-bold bg-black/20 px-2 py-1 rounded-md backdrop-blur-sm flex items-center gap-1"><ClockIcon className="w-3 h-3"/>{new Date(script.created_at).toLocaleDateString()}</div>
          </div>
          <h3 className="text-xl font-black text-white mb-2 line-clamp-2 tracking-tight group-hover:text-blue-400 transition-colors">{script.title || "Untitled Project"}</h3>
          <p className="text-xs text-slate-300 line-clamp-3 mb-4 opacity-80 leading-relaxed">{script.description}</p>
          <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
             <div className="flex gap-1.5">{script.hashtags?.slice(0, 2).map((h, i) => (<span key={i} className="text-[9px] font-black text-white bg-blue-600/80 px-2 py-0.5 rounded-md">{h}</span>))}</div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{script.assets?.length || 0} Files</span>
          </div>
       </div>
       <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-20"><TrashIcon className="w-4 h-4" /></button>
    </div>
  );
}

/* ================= MAIN PAGE ================= */

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<ScriptProject[]>([]);
  const [editingScript, setEditingScript] = useState<ScriptProject | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupCounts, setGroupCounts] = useState<Map<number, number>>(new Map());
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("scripts").select("*").order("created_at", { ascending: false });
      setScripts((data || []) as ScriptProject[]);
      const grps = await supabase.from("idea_groups").select("*").order("name");
      const grpItems = await supabase.from("idea_group_items").select("group_id");
      setGroups((grps.data || []) as Group[]);
      const m = new Map<number, number>();
      for (const row of grpItems.data ?? []) { const gid = Number((row as any).group_id); m.set(gid, (m.get(gid) ?? 0) + 1); }
      setGroupCounts(m);
    }
    load();
  }, []);

  const handleUpdateScript = async (updatedData: Partial<ScriptProject>) => {
    if (!editingScript) return;
    const { error } = await supabase.from("scripts").update(updatedData).eq("id", editingScript.id);
    if (!error) {
       setScripts(prev => prev.map(s => s.id === editingScript.id ? { ...s, ...updatedData } : s));
       setIsModalOpen(false); setEditingScript(null);
    }
  };

  const handleDeleteScript = async (id: number) => {
    if (!confirm("Delete project?")) return;
    await supabase.from("scripts").delete().eq("id", id);
    setScripts(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <ScriptEditorModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingScript(null); }} script={editingScript} onSave={handleUpdateScript} />
      
      <aside className="fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-slate-200 bg-white hidden md:flex">
         <div className="flex h-20 items-center px-8 text-2xl font-black text-slate-900 tracking-tighter">GameKB<span className="text-blue-500">.</span></div>
         <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            <nav className="space-y-2">
               <Link href="/" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>🏠</span> All Ideas</Link>
               <Link href="/dashboard" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>📊</span> Dashboard</Link>
               <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold bg-slate-900 text-white shadow-lg transition"><span>📜</span> Projects</button>
               <Link href="/games/new" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>🕹️</span> Add Game</Link>
            </nav>
         </div>
      </aside>

      <main className="flex-1 pl-0 md:pl-72 pb-32 min-w-0">
        <div className="mx-auto max-w-[1900px] px-6 py-8">
           <h1 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">Video Projects</h1>
           <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {scripts.map(s => (
                 <ScriptCard key={s.id} script={s} onClick={() => { setEditingScript(s); setIsModalOpen(true); }} onDelete={() => handleDeleteScript(s.id)} />
              ))}
           </div>
        </div>
      </main>
    </div>
  );
}