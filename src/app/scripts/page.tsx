"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { 
  TrashIcon, 
  DocumentTextIcon, 
  PlayCircleIcon,
  VideoCameraIcon,
  HashtagIcon,
  TagIcon,
  DocumentDuplicateIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ClockIcon,
  ChevronRightIcon
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
  All: { label: "Tất cả", color: "bg-slate-100 text-slate-600" },
  Draft: { label: "Bản thảo", color: "bg-slate-500/10 text-slate-500 border-slate-200", dot: "bg-slate-400" },
  Filming: { label: "Đang quay", color: "bg-amber-500/10 text-amber-600 border-amber-200", dot: "bg-amber-500" },
  Edited: { label: "Đã dựng", color: "bg-indigo-500/10 text-indigo-600 border-indigo-200", dot: "bg-indigo-500" },
  Published: { label: "Đã đăng", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200", dot: "bg-emerald-500" },
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
       <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
          <div className="flex items-center justify-between px-10 py-6 border-b bg-slate-50/50">
             <div>
                <h2 className="text-xl font-black text-slate-900">Project Workspace</h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{formData.status}</p>
             </div>
             <div className="flex gap-4">
                <select className="h-10 rounded-xl border bg-white px-4 text-xs font-bold outline-none shadow-sm" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                   {Object.keys(STATUS_CONFIG).filter(k => k !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={onClose} className="px-6 py-2 text-sm font-bold text-slate-400">Cancel</button>
                <button onClick={() => { onSave(formData); onClose(); }} className="px-8 py-2 text-sm font-bold text-white bg-indigo-600 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all">Save Project</button>
             </div>
          </div>
          <div className="flex px-10 border-b">
             {(["script", "details", "assets"] as const).map(tab => (
               <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-4 text-xs font-black uppercase tracking-widest border-b-4 transition-all ${activeTab === tab ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}>
                 {tab}
               </button>
             ))}
          </div>
          <div className="flex-1 overflow-y-auto p-10">
             {activeTab === "script" && <textarea className="h-full w-full rounded-3xl border p-8 text-sm leading-relaxed outline-none focus:border-indigo-500 font-mono shadow-inner bg-slate-50/30" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />}
             {activeTab === "details" && <div className="space-y-6 max-w-3xl mx-auto">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Description</label>
                  <textarea className="w-full h-48 rounded-3xl border p-6 text-sm outline-none focus:border-indigo-500 bg-white leading-relaxed" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Hashtags</label><div className="flex flex-wrap gap-2">{formData.hashtags?.map((t,i)=><span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold border border-indigo-100">{t}</span>)}</div></div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Tags</label><div className="flex flex-wrap gap-2">{formData.tags?.map((t,i)=><span key={i} className="px-2 py-1 bg-white text-slate-600 rounded-lg text-[10px] font-bold border border-slate-200">{t}</span>)}</div></div>
                </div>
             </div>}
             {activeTab === "assets" && <div className="max-w-3xl mx-auto space-y-4">
                {formData.assets?.map((asset, i) => (
                  <div key={i} className="p-4 bg-white rounded-2xl border flex items-center justify-between group hover:border-indigo-300 transition-all">
                    <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">#{i+1}</div><div><p className="text-sm font-black text-slate-800">{asset.name}</p><p className="text-[10px] text-indigo-500 font-mono opacity-60 truncate max-w-md">{asset.url}</p></div></div>
                    <a href={asset.url} target="_blank" className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:bg-indigo-600 hover:text-white transition-all"><VideoCameraIcon className="w-5 h-5"/></a>
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
    <div onClick={onClick} className="group relative h-[380px] w-full overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col">
       <div className="absolute inset-0 z-0">
          {coverUrl ? (
            <img src={coverUrl} className="w-full h-full object-cover opacity-20 group-hover:scale-110 transition-transform duration-1000" />
          ) : (
            <div className="w-full h-full bg-slate-50" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/80 to-white" />
       </div>

       <div className="relative z-10 p-8 flex flex-col h-full">
          <div className="flex justify-between items-start mb-6">
             <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${status.color}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse`} />
                {script.status}
             </span>
             <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100">
                <TrashIcon className="w-5 h-5" />
             </button>
          </div>

          <div className="mb-4 flex items-center gap-2 text-[10px] font-black text-slate-400 tracking-widest">
             <ClockIcon className="w-4 h-4" /> {new Date(script.created_at).toLocaleDateString('vi-VN')}
          </div>

          <h3 className="text-2xl font-black text-slate-900 mb-4 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
             {script.title || "Untitled Project"}
          </h3>

          <p className="text-sm text-slate-500 line-clamp-4 leading-relaxed font-medium opacity-80 mb-6">
             {script.description || "Chưa có mô tả cho dự án này..."}
          </p>

          <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
             <div className="flex gap-2">
                {script.hashtags?.slice(0, 2).map((h, i) => (
                  <span key={i} className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">{h}</span>
                ))}
             </div>
             <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-300 uppercase tracking-widest">
                <VideoCameraIcon className="w-4 h-4" /> {script.assets?.length || 0}
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
  const [filterStatus, setFilterStatus] = useState("All");

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
    let result = scripts;
    if (filterStatus !== "All") result = result.filter(s => s.status === filterStatus);
    if (searchQuery) {
      result = result.filter(s => 
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredScripts(result);
  }, [searchQuery, filterStatus, scripts]);

  const handleUpdate = async (data: any) => {
    const { error } = await supabase.from("scripts").update(data).eq("id", editingScript?.id);
    if (!error) {
      setScripts(prev => prev.map(s => s.id === editingScript?.id ? { ...s, ...data } : s));
      setIsModalOpen(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-slate-900">
      
      <aside className="fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r bg-white hidden md:flex">
         <div className="flex h-24 items-center px-10 text-3xl font-black text-slate-900 tracking-tighter">GameKB<span className="text-indigo-600">.</span></div>
         <nav className="flex-1 px-6 space-y-2 py-4">
            <Link href="/" className="flex items-center gap-4 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-500 hover:bg-slate-50 transition-all"><span>🏠</span> All Ideas</Link>
            <Link href="/dashboard" className="flex items-center gap-4 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-500 hover:bg-slate-50 transition-all"><span>📊</span> Dashboard</Link>
            <button className="w-full flex items-center gap-4 rounded-2xl px-5 py-3.5 text-sm font-black bg-slate-900 text-white shadow-2xl shadow-slate-200"><span>📜</span> Projects</button>
         </nav>
      </aside>

      <main className="flex-1 md:pl-72 pb-32">
        <div className="mx-auto max-w-7xl px-8 py-16">
           
           <div className="flex flex-col items-center text-center mb-16">
              <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-[2.5rem] bg-indigo-600 text-white shadow-2xl shadow-indigo-200">
                 <GlobeAltIcon className="w-10 h-10" />
              </div>
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-4">Project Archive</h1>
              
              <div className="relative w-full max-w-2xl mb-8 group">
                 <MagnifyingGlassIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                 <input 
                   type="text"
                   placeholder="Tìm kiếm tiêu đề, kịch bản..."
                   className="w-full pl-16 pr-16 py-6 bg-slate-50 border-none rounded-[2.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-lg font-bold placeholder-slate-300"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
                 {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-6 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-200 rounded-full"><XMarkIcon className="w-5 h-5 text-slate-400" /></button>}
              </div>

              {/* BỘ LỌC TRẠNG THÁI */}
              <div className="flex flex-wrap justify-center gap-3">
                 {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                   <button 
                    key={key} 
                    onClick={() => setFilterStatus(key)}
                    className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${filterStatus === key ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                   >
                     {config.label}
                   </button>
                 ))}
              </div>
           </div>

           {filteredScripts.length === 0 ? (
              <div className="text-center py-32 bg-slate-50 rounded-[4rem] border border-dashed">
                 <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">Không có dự án nào</h3>
              </div>
           ) : (
              <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
                 {filteredScripts.map(s => (
                    <ScriptCard key={s.id} script={s} onClick={() => { setEditingScript(s); setIsModalOpen(true); }} onDelete={() => { if(confirm("Xóa dự án?")) supabase.from("scripts").delete().eq("id", s.id).then(()=>window.location.reload()); }} />
                 ))}
              </div>
           )}
        </div>
      </main>

      <ScriptEditorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} script={editingScript} onSave={handleUpdate} />
    </div>
  );
}