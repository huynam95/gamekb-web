"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { 
  TrashIcon, 
  VideoCameraIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  DocumentTextIcon,
  PlayCircleIcon,
  ClockIcon,
  PencilSquareIcon,
  InformationCircleIcon,
  Squares2X2Icon,
  LinkIcon,
  DocumentDuplicateIcon,
  CheckIcon
} from "@heroicons/react/24/outline";

/* ================= TYPES & CONFIG ================= */

type ScriptProject = { 
  id: number; title: string; content: string; 
  assets: { url: string; name: string }[];
  description: string; hashtags: string[]; tags: string[];
  status: 'Draft' | 'Filming' | 'Edited' | 'Published';
  created_at: string;
};

type Group = { id: number; name: string };

const STATUS_STYLE: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700 border-slate-200",
  Filming: "bg-amber-100 text-amber-800 border-amber-200",
  Edited: "bg-indigo-100 text-indigo-800 border-indigo-200",
  Published: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

/* ================= MODAL: STUDIO WORKSPACE ================= */

function ScriptEditorModal({ isOpen, onClose, script, onSave }: any) {
  const [formData, setFormData] = useState<Partial<ScriptProject>>({
    title: "", content: "", description: "", hashtags: [], tags: [], status: "Draft", assets: []
  });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [activeTab, setActiveTab] = useState<"script" | "metadata" | "assets">("script");

  useEffect(() => { 
    if (isOpen && script) {
      setFormData(script);
      setIsEditingTitle(false);
      setActiveTab("script");
    }
  }, [isOpen, script]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6 animate-in fade-in duration-300"
      onClick={onClose} 
    >
       <div 
         className="bg-white w-full max-w-[1300px] h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border border-slate-200"
         onClick={(e) => e.stopPropagation()} 
       >
          <div className="flex items-center justify-between px-10 py-7 border-b border-slate-100">
             <div className="flex items-center gap-5 flex-1">
                <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
                   <DocumentTextIcon className="w-7 h-7" />
                </div>
                <div className="flex flex-col flex-1">
                   <div className="flex items-center gap-3">
                      {isEditingTitle ? (
                        <input 
                          autoFocus
                          className="text-2xl font-black text-slate-900 bg-slate-50 px-4 py-2 rounded-xl outline-none border-2 border-blue-500 w-full max-w-xl"
                          value={formData.title}
                          onChange={e => setFormData({...formData, title: e.target.value})}
                          onBlur={() => setIsEditingTitle(false)}
                        />
                      ) : (
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{formData.title}</h2>
                      )}
                      <button onClick={() => setIsEditingTitle(!isEditingTitle)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                         {isEditingTitle ? <CheckIcon className="w-6 h-6 text-green-600" /> : <PencilSquareIcon className="w-5 h-5 text-slate-400" />}
                      </button>
                   </div>
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Video Project Studio</p>
                </div>
             </div>
             <div className="flex items-center gap-5">
                <select className="bg-slate-100 px-5 py-3 rounded-2xl text-sm font-black outline-none border-none cursor-pointer" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                   {Object.keys(STATUS_STYLE).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => { onSave(formData); onClose(); }} className="px-10 py-4 text-sm font-black text-white bg-slate-900 rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95">
                   Save Changes
                </button>
             </div>
          </div>

          <div className="flex px-10 border-b border-slate-100 bg-slate-50/50">
             {[
               { id: 'script', label: 'Script', icon: DocumentTextIcon },
               { id: 'metadata', label: 'Metadata', icon: InformationCircleIcon },
               { id: 'assets', label: 'Assets', icon: Squares2X2Icon },
             ].map(tab => (
               <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                className={`flex items-center gap-3 px-8 py-5 text-xs font-black uppercase tracking-[0.2em] border-b-4 transition-all ${activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400"}`}
               >
                 <tab.icon className="w-5 h-5" /> {tab.label}
               </button>
             ))}
          </div>

          <div className="flex-1 overflow-y-auto p-12 bg-white">
             {activeTab === "script" && (
                <div className="max-w-5xl mx-auto h-full flex flex-col">
                   <textarea className="flex-1 w-full p-10 rounded-[2rem] bg-slate-50 border border-slate-100 text-xl leading-relaxed text-slate-900 outline-none font-medium resize-none shadow-inner" placeholder="Start writing..." value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
                </div>
             )}
             {activeTab === "metadata" && (
                <div className="max-w-4xl mx-auto space-y-8">
                   <textarea className="w-full h-64 p-8 rounded-[2rem] bg-slate-50 border border-slate-100 text-base font-bold leading-relaxed text-slate-700 outline-none resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                   <div className="flex flex-wrap gap-2">{formData.hashtags?.map((h, i) => (<span key={i} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black border border-blue-100">#{h}</span>))}</div>
                </div>
             )}
             {activeTab === "assets" && (
                <div className="max-w-4xl mx-auto grid gap-4">
                   {formData.assets?.map((asset, i) => (
                     <div key={i} className="flex items-center gap-5 p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-blue-500 transition-all group">
                        <div className="w-12 h-12 rounded-xl bg-white border flex items-center justify-center text-slate-400 font-black shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">#{i+1}</div>
                        <div className="flex-1 min-w-0"><p className="text-base font-black text-slate-900 truncate">{asset.name}</p><p className="text-xs text-slate-500 truncate font-mono font-bold">{asset.url}</p></div>
                        <a href={asset.url} target="_blank" className="p-3 bg-white text-slate-400 hover:text-blue-600 rounded-xl border border-slate-200 shadow-sm"><LinkIcon className="w-5 h-5" /></a>
                     </div>
                   ))}
                </div>
             )}
          </div>
       </div>
    </div>
  );
}

/* ================= MAIN PAGE ================= */

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<ScriptProject[]>([]);
  const [filteredScripts, setFilteredScripts] = useState<ScriptProject[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingScript, setEditingScript] = useState<ScriptProject | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sidebar states
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupCounts, setGroupCounts] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    async function load() {
      const { data: sData } = await supabase.from("scripts").select("*").order("created_at", { ascending: false });
      setScripts((sData || []) as ScriptProject[]);
      setFilteredScripts((sData || []) as ScriptProject[]);

      const { data: grps } = await supabase.from("idea_groups").select("*").order("name");
      const { data: items } = await supabase.from("idea_group_items").select("group_id");
      setGroups((grps || []) as Group[]);
      const m = new Map<number, number>();
      for (const row of items || []) { const gid = Number((row as any).group_id); m.set(gid, (m.get(gid) ?? 0) + 1); }
      setGroupCounts(m);
    }
    load();
  }, []);

  useEffect(() => {
    const res = scripts.filter(s => 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
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
    <div className="flex min-h-screen bg-white font-sans text-slate-900">
      <ScriptEditorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} script={editingScript} onSave={handleUpdate} />
      
      {/* SIDEBAR - CHUẨN TRANG CHỦ 100% */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-slate-200 bg-white hidden md:flex">
         <div className="flex h-20 items-center px-8 text-2xl font-black text-slate-900 tracking-tighter">GameKB<span className="text-blue-500">.</span></div>
         <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            <nav className="space-y-2">
               <Link href="/" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>🏠</span> All Ideas</Link>
               <Link href="/dashboard" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>📊</span> Dashboard</Link>
               <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold bg-slate-900 text-white shadow-lg shadow-slate-200 transition"><span>📜</span> Scripts</button>
               <Link href="/games/new" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>🕹️</span> Add Game</Link>
            </nav>
            <div className="pt-4 border-t border-slate-100">
               <div className="flex items-center justify-between px-2 mb-2 font-bold text-xs uppercase text-slate-400 tracking-widest"><span>Collections</span></div>
               <div className="space-y-1">
                  {groups.map(g => (
                     <div key={g.id} className="group/item relative flex items-center justify-between w-full hover:bg-slate-50 rounded-xl px-2 py-1 transition cursor-pointer">
                        <div className="flex-1 flex items-center gap-2 overflow-hidden py-2 text-slate-500 font-medium text-sm"><span className="truncate">{g.name}</span></div>
                        <div className="w-8 flex justify-center shrink-0"><span className="text-[10px] font-bold opacity-60 group-hover/item:hidden">{groupCounts.get(g.id)||0}</span></div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </aside>

      <main className="flex-1 md:pl-72 min-w-0 bg-white">
        <div className="mx-auto max-w-[1440px] px-10 py-12">
           <div className="mb-12 relative max-w-2xl">
              <MagnifyingGlassIcon className="w-6 h-6 absolute left-6 top-1/2 -translate-y-1/2 text-slate-900 font-black" />
              <input className="h-16 w-full rounded-[1.5rem] border-2 border-slate-200 pl-16 pr-12 bg-white outline-none focus:border-slate-900 transition-all font-bold text-lg shadow-sm" placeholder="Search kịch bản..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
           </div>

           <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 overflow-hidden shadow-2xl shadow-slate-200/40">
              <table className="w-full text-left border-collapse table-fixed">
                 <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                       <th className="px-10 py-7 text-[10px] font-black uppercase tracking-[0.2em] w-[35%] text-slate-500">Project Title</th>
                       <th className="px-6 py-7 text-[10px] font-black uppercase tracking-[0.2em] w-[15%] text-center text-slate-500">Status</th>
                       <th className="px-6 py-7 text-[10px] font-black uppercase tracking-[0.2em] w-[40%] text-slate-500">Summary</th>
                       <th className="px-8 py-7 text-[10px] font-black uppercase tracking-[0.2em] w-[10%] text-right text-slate-500">Action</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {filteredScripts.map((s) => (
                       <tr key={s.id} className="hover:bg-slate-50/80 transition-all group cursor-pointer" onClick={() => { setEditingScript(s); setIsModalOpen(true); }}>
                          <td className="px-10 py-9">
                             <div className="flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-lg shadow-slate-200"><PlayCircleIcon className="w-7 h-7" /></div>
                                <div className="min-w-0"><p className="text-base font-black text-slate-900 uppercase tracking-tight truncate">{s.title}</p><p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{new Date(s.created_at).toLocaleDateString('vi-VN')}</p></div>
                             </div>
                          </td>
                          <td className="px-6 py-9 text-center"><span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-transparent shadow-sm ${STATUS_STYLE[s.status]}`}>{s.status}</span></td>
                          <td className="px-6 py-9 text-sm text-slate-700 font-bold italic leading-relaxed"><p className="line-clamp-2 pr-10">{s.description || "No description..."}</p></td>
                          <td className="px-8 py-9 text-right">
                             <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-3 bg-white rounded-xl border-2 border-slate-100 text-slate-900 hover:bg-slate-900 hover:text-white transition-all shadow-sm"><PencilSquareIcon className="w-5 h-5" /></button>
                                <button onClick={(e) => { e.stopPropagation(); if(confirm("Xóa dự án?")) supabase.from("scripts").delete().eq("id", s.id).then(()=>window.location.reload()); }} className="p-3 bg-white rounded-xl border-2 border-slate-100 text-slate-400 hover:text-rose-600 transition-all shadow-sm"><TrashIcon className="w-5 h-5" /></button>
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </main>
    </div>
  );
}