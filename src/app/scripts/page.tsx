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
  MagnifyingGlassIcon,
  XMarkIcon,
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
};

const STATUS_CONFIG = {
  Draft: { color: "bg-slate-500/10 text-slate-500 border-slate-200", dot: "bg-slate-400" },
  Filming: { color: "bg-amber-500/10 text-amber-600 border-amber-200", dot: "bg-amber-500" },
  Edited: { color: "bg-indigo-500/10 text-indigo-600 border-indigo-200", dot: "bg-indigo-500" },
  Published: { color: "bg-emerald-500/10 text-emerald-600 border-emerald-200", dot: "bg-emerald-500" },
};

/* ================= COMPONENTS ================= */

// FIX: Đã thêm đầy đủ ScriptEditorModal vào đây
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
       <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          
          <div className="flex items-center justify-between px-10 py-6 border-b border-slate-100 bg-slate-50/50">
             <div>
                <h2 className="text-2xl font-black text-slate-900">Project Workspace</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Editing: {formData.title}</p>
             </div>
             <div className="flex gap-4">
                <select 
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50 shadow-sm cursor-pointer"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                >
                   {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={onClose} className="px-6 py-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition">Cancel</button>
                <button onClick={() => { onSave(formData); onClose(); }} className="px-8 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95">
                   Save Changes
                </button>
             </div>
          </div>

          <div className="flex px-10 border-b border-slate-100 bg-white">
             {(["script", "details", "assets"] as const).map(tab => (
               <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-5 text-xs font-black uppercase tracking-[0.2em] border-b-4 transition-all ${activeTab === tab ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-800"}`}>
                 {tab === "script" ? "📝 Script" : tab === "details" ? "ℹ️ Metadata" : "🔗 Assets"}
               </button>
             ))}
          </div>

          <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30">
             {activeTab === "script" && (
                <div className="h-full flex flex-col gap-6">
                   <input className="w-full text-3xl font-black bg-transparent outline-none placeholder-slate-300 border-none p-0 focus:ring-0" placeholder="Project Title..." value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                   <textarea className="flex-1 w-full rounded-[2rem] border border-slate-200 p-8 text-base leading-relaxed text-slate-800 outline-none focus:border-indigo-500 font-mono shadow-inner bg-white" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
                </div>
             )}

             {activeTab === "details" && (
                <div className="max-w-4xl mx-auto space-y-8">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Video Description (SEO)</label>
                      <textarea className="w-full h-48 rounded-3xl border border-slate-200 p-6 text-sm outline-none focus:border-indigo-500 shadow-sm bg-white leading-relaxed" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                   </div>
                   <div className="grid grid-cols-2 gap-10">
                      <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest"><HashtagIcon className="w-4 h-4 text-indigo-500"/> Hashtags</label>
                         <div className="flex flex-wrap gap-2">
                           {formData.hashtags?.map((tag, i) => (
                             <span key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[11px] font-black border border-indigo-100 shadow-sm">{tag}</span>
                           ))}
                         </div>
                      </div>
                      <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest"><TagIcon className="w-4 h-4 text-slate-400"/> Tags</label>
                         <div className="flex flex-wrap gap-2">
                           {formData.tags?.map((tag, i) => (
                             <span key={i} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[11px] font-black border border-slate-200 shadow-sm">{tag}</span>
                           ))}
                         </div>
                      </div>
                   </div>
                </div>
             )}

             {activeTab === "assets" && (
                <div className="max-w-4xl mx-auto space-y-6">
                   <div className="flex justify-between items-center px-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Footage Library</label>
                      <button onClick={() => navigator.clipboard.writeText(formData.assets?.map(a => a.url).join('\n') || "")} className="text-[10px] flex items-center gap-1.5 font-black text-indigo-600 hover:underline uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-lg transition-all"><DocumentDuplicateIcon className="w-3.5 h-3.5"/> Copy All URLS</button>
                   </div>
                   <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-xl shadow-slate-100 divide-y divide-slate-50">
                      {(formData.assets || []).length > 0 ? (
                        formData.assets?.map((asset, i) => (
                          <div key={i} className="p-5 flex items-center gap-6 hover:bg-slate-50 transition group">
                             <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">#{i+1}</div>
                             <div className="flex-1 min-w-0">
                                <p className="text-base font-black text-slate-800 truncate">{asset.name}</p>
                                <p className="text-xs text-indigo-500 truncate font-mono opacity-60">{asset.url}</p>
                             </div>
                             <a href={asset.url} target="_blank" className="p-3 rounded-2xl bg-slate-100 text-slate-400 hover:bg-indigo-600 hover:text-white transition-all shadow-md"><VideoCameraIcon className="w-5 h-5" /></a>
                          </div>
                        ))
                      ) : (
                        <div className="p-20 text-center text-slate-400 italic font-medium">No assets linked.</div>
                      )}
                   </div>
                </div>
             )}
          </div>
       </div>
    </div>
  );
}

function ScriptCard({ script, onClick, onDelete }: { script: ScriptProject, onClick: () => void, onDelete: () => void }) {
  const status = STATUS_CONFIG[script.status] || STATUS_CONFIG.Draft;
  const coverUrl = script.assets && script.assets.length > 0 ? script.assets[0].url : null;

  return (
    <div 
      onClick={onClick} 
      className="group relative h-80 w-full overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col"
    >
       {coverUrl && (
         <div className="absolute inset-0 z-0 overflow-hidden">
            <img src={coverUrl} className="w-full h-full object-cover opacity-[0.08] group-hover:scale-110 transition-transform duration-1000" alt="" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/90 to-white" />
         </div>
       )}

       <div className="relative z-10 p-8 flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
             <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${status.color}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {script.status}
             </span>
             <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
              >
                <TrashIcon className="w-5 h-5" />
             </button>
          </div>

          <div className="mb-3 flex items-center gap-2 text-[10px] font-black text-slate-400 tracking-widest">
             <ClockIcon className="w-4 h-4" />
             {new Date(script.created_at).toLocaleDateString('vi-VN')}
          </div>

          <h3 className="text-xl font-black text-slate-900 mb-3 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
             {script.title || "Untitled Project"}
          </h3>

          <p className="text-sm text-slate-500 line-clamp-3 mb-6 leading-relaxed font-medium italic opacity-70">
             {script.description || "No project description..."}
          </p>

          <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-6">
             <div className="flex gap-2">
                {script.hashtags?.slice(0, 2).map((h, i) => (
                  <span key={i} className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                    {h}
                  </span>
                ))}
             </div>
             <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-300 uppercase tracking-widest">
                <VideoCameraIcon className="w-4 h-4" />
                {script.assets?.length || 0}
             </div>
          </div>
       </div>
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
      const scriptData = (data || []) as ScriptProject[];
      setScripts(scriptData);
      setFilteredScripts(scriptData);
    }
    load();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const filtered = scripts.filter(s => 
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredScripts(filtered);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, scripts]);

  const handleUpdateScript = async (updatedData: Partial<ScriptProject>) => {
    if (!editingScript) return;
    const { error } = await supabase.from("scripts").update(updatedData).eq("id", editingScript.id);
    if (!error) {
       setScripts(prev => prev.map(s => s.id === editingScript.id ? { ...s, ...updatedData } : s));
       setIsModalOpen(false);
    }
  };

  const handleDeleteScript = async (id: number) => {
    if (!confirm("Delete this video project?")) return;
    await supabase.from("scripts").delete().eq("id", id);
    setScripts(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* SIDEBAR GIẢ ĐỊNH (Cần thiết cho giao diện tổng thể) */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-slate-200 bg-white hidden md:flex">
         <div className="flex h-24 items-center px-10 text-3xl font-black text-slate-900 tracking-tighter">GameKB<span className="text-indigo-600">.</span></div>
         <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            <nav className="space-y-1.5">
               <Link href="/" className="flex w-full items-center gap-4 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-500 hover:bg-slate-100 transition-all"><span>🏠</span> All Ideas</Link>
               <Link href="/dashboard" className="flex w-full items-center gap-4 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-500 hover:bg-slate-100 transition-all"><span>📊</span> Dashboard</Link>
               <button className="flex w-full items-center gap-4 rounded-2xl px-5 py-3.5 text-sm font-black bg-slate-900 text-white shadow-2xl shadow-slate-200 transition-all"><span>📜</span> Projects</button>
               <Link href="/games/new" className="flex w-full items-center gap-4 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-500 hover:bg-slate-100 transition-all"><span>🕹️</span> Add Game</Link>
            </nav>
         </div>
      </aside>

      <main className="flex-1 pl-0 md:pl-72 pb-32">
        <div className="mx-auto max-w-7xl px-10 py-16">
           
           {/* Header Section Center */}
           <div className="flex flex-col items-center text-center mb-20">
              <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-[2.5rem] bg-indigo-600 text-white shadow-2xl shadow-indigo-200 animate-in zoom-in-50 duration-500">
                 <GlobeAltIcon className="w-10 h-10" />
              </div>
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-3">Project Archive</h1>
              <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] mb-12">Manage and monitor your published content</p>
              
              {/* Central Search Bar */}
              <div className="relative w-full max-w-3xl group scale-100 hover:scale-[1.02] transition-transform duration-300">
                 <MagnifyingGlassIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-7 h-7 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                 <input 
                   type="text"
                   placeholder="Search project title, keywords..."
                   className="w-full pl-16 pr-16 py-6 bg-white border-none rounded-[2.5rem] shadow-2xl shadow-slate-200 outline-none focus:ring-8 focus:ring-indigo-500/5 transition-all text-lg font-bold placeholder-slate-300"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
                 {searchQuery && (
                   <button onClick={() => setSearchQuery("")} className="absolute right-6 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-full transition-all">
                     <XMarkIcon className="w-6 h-6 text-slate-400" />
                   </button>
                 )}
              </div>
           </div>

           {/* Grid Layout */}
           {filteredScripts.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-[4rem] border border-dashed border-slate-200 shadow-inner animate-in fade-in duration-700">
                 <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8">
                    <DocumentTextIcon className="w-12 h-12 text-slate-200" />
                 </div>
                 <h3 className="text-xl font-black text-slate-300 uppercase tracking-[0.3em]">
                    {searchQuery ? "No matching results" : "Your archive is empty"}
                 </h3>
              </div>
           ) : (
              <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
                 {filteredScripts.map(s => (
                    <ScriptCard 
                      key={s.id} 
                      script={s} 
                      onClick={() => { setEditingScript(s); setIsModalOpen(true); }} 
                      onDelete={() => handleDeleteScript(s.id)} 
                    />
                 ))}
              </div>
           )}
        </div>
      </main>

      <ScriptEditorModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        script={editingScript} 
        onSave={handleUpdateScript} 
      />
    </div>
  );
}