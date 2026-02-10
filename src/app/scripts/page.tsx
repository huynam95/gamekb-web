"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { 
  PlusIcon, 
  TrashIcon, 
  DocumentTextIcon, 
  CalendarIcon,
  CheckCircleIcon,
  PlayCircleIcon,
  VideoCameraIcon,
  HashtagIcon,
  TagIcon,
  DocumentDuplicateIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon, // Thêm icon search
  XMarkIcon
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

type Group = { id: number; name: string };

const STATUS_CONFIG = {
  Draft: { color: "bg-slate-100 text-slate-600 border-slate-200", icon: DocumentTextIcon },
  Filming: { color: "bg-blue-50 text-blue-600 border-blue-200", icon: PlayCircleIcon },
  Edited: { color: "bg-purple-50 text-purple-600 border-purple-200", icon: CalendarIcon },
  Published: { color: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: GlobeAltIcon },
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
       <div className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
             <div>
                <h2 className="text-xl font-black text-slate-900">Video Project Details</h2>
                <p className="text-xs text-slate-500 font-bold">Manage content, metadata and assets</p>
             </div>
             <div className="flex gap-3">
                <select 
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold outline-none focus:border-blue-500 shadow-sm cursor-pointer"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                >
                   {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button onClick={() => { onSave(formData); onClose(); }} className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg">
                   Save Project
                </button>
             </div>
          </div>

          <div className="flex px-6 border-b border-slate-100 bg-white">
             {(["script", "details", "assets"] as const).map(tab => (
               <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-4 text-sm font-black uppercase tracking-widest border-b-2 transition ${activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-800"}`}>
                 {tab === "script" ? "📝 Script" : tab === "details" ? "ℹ️ Metadata" : "🔗 Assets"}
               </button>
             ))}
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
             {activeTab === "script" && (
                <div className="h-full flex flex-col gap-4">
                   <input className="w-full text-2xl font-black bg-transparent outline-none placeholder-slate-300" placeholder="Project Title..." value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                   <textarea className="flex-1 w-full rounded-2xl border border-slate-200 p-6 text-sm leading-relaxed text-slate-800 outline-none focus:border-blue-500 font-mono shadow-inner bg-white" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
                </div>
             )}

             {activeTab === "details" && (
                <div className="space-y-6">
                   <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block tracking-widest">Video Description</label>
                      <textarea className="w-full h-40 rounded-xl border border-slate-200 p-4 text-xs outline-none focus:border-blue-500 shadow-sm bg-white" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                   </div>
                   <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                         <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 tracking-widest"><HashtagIcon className="w-3 h-3"/> Hashtags</label>
                         <div className="flex flex-wrap gap-2">
                           {formData.hashtags?.map((tag, i) => (
                             <span key={i} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[11px] font-bold border border-blue-100 shadow-sm">{tag}</span>
                           ))}
                         </div>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 tracking-widest"><TagIcon className="w-3 h-3"/> Tags</label>
                         <div className="flex flex-wrap gap-2">
                           {formData.tags?.map((tag, i) => (
                             <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold border border-slate-200 shadow-sm">{tag}</span>
                           ))}
                         </div>
                      </div>
                   </div>
                </div>
             )}

             {activeTab === "assets" && (
                <div className="space-y-4">
                   <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400 block tracking-widest">Project Footage</label>
                      <button onClick={() => navigator.clipboard.writeText(formData.assets?.map(a => a.url).join('\n') || "")} className="text-[10px] flex items-center gap-1 font-bold text-blue-600 hover:underline"><DocumentDuplicateIcon className="w-3 h-3"/> Copy All Links</button>
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
                             <a href={asset.url} target="_blank" className="p-2 rounded-lg bg-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white transition shadow-sm"><VideoCameraIcon className="w-4 h-4" /></a>
                          </div>
                        ))
                      ) : (
                        <div className="p-12 text-center text-slate-400 italic text-sm">No assets found.</div>
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
  const StatusIcon = status.icon;

  return (
    <div onClick={onClick} className="group relative bg-white h-64 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col">
       <div className={`h-1.5 w-full ${status.color.split(' ')[0].replace('bg-', 'bg-')}`}></div>
       <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
             <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${status.color}`}>
                <StatusIcon className="w-3 h-3" /> {script.status}
             </span>
             <span className="text-[10px] text-slate-300 font-mono">{new Date(script.created_at).toLocaleDateString()}</span>
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-2 line-clamp-2 leading-tight">{script.title || "Untitled Project"}</h3>
          <p className="text-sm text-slate-400 line-clamp-3 mb-4 font-medium leading-relaxed italic">"{script.description?.slice(0, 100)}..."</p>
          <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
             <div className="flex gap-1.5">
                {script.hashtags?.slice(0, 2).map((h, i) => (
                  <span key={i} className="text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">{h}</span>
                ))}
             </div>
             <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{script.assets?.length || 0} Assets</span>
          </div>
       </div>
       <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-10"><TrashIcon className="h-4 w-4" /></button>
    </div>
  );
}

/* ================= PAGE LOGIC ================= */

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<ScriptProject[]>([]);
  const [filteredScripts, setFilteredScripts] = useState<ScriptProject[]>([]); // Danh sách sau khi search
  const [editingScript, setEditingScript] = useState<ScriptProject | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupCounts, setGroupCounts] = useState<Map<number, number>>(new Map());
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("scripts").select("*").order("created_at", { ascending: false });
      const scriptData = (data || []) as ScriptProject[];
      setScripts(scriptData);
      setFilteredScripts(scriptData);

      const grps = await supabase.from("idea_groups").select("*").order("name");
      const grpItems = await supabase.from("idea_group_items").select("group_id");
      setGroups((grps.data || []) as Group[]);
      const m = new Map<number, number>();
      for (const row of grpItems.data ?? []) { const gid = Number((row as any).group_id); m.set(gid, (m.get(gid) ?? 0) + 1); }
      setGroupCounts(m);
    }
    load();
  }, []);

  // Logic Search
  useEffect(() => {
    const timer = setTimeout(() => {
      const filtered = scripts.filter(s => 
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.status.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredScripts(filtered);
    }, 300); // Debounce 300ms

    return () => clearTimeout(timer);
  }, [searchQuery, scripts]);

  const handleUpdateScript = async (updatedData: Partial<ScriptProject>) => {
    if (!editingScript) return;
    const { error } = await supabase.from("scripts").update(updatedData).eq("id", editingScript.id);
    if (!error) {
       setScripts(prev => prev.map(s => s.id === editingScript.id ? { ...s, ...updatedData } : s));
       setIsModalOpen(false);
       setEditingScript(null);
    }
  };

  const handleDeleteScript = async (id: number) => {
    if (!confirm("Delete this video project?")) return;
    await supabase.from("scripts").delete().eq("id", id);
    setScripts(prev => prev.filter(s => s.id !== id));
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
      <ScriptEditorModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingScript(null); }} script={editingScript} onSave={handleUpdateScript} />
      
      <aside className="fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-slate-200 bg-white hidden md:flex">
         <div className="flex h-20 items-center px-8 text-2xl font-black text-slate-900">GameKB<span className="text-blue-500">.</span></div>
         <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            <nav className="space-y-2">
               <Link href="/" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>🏠</span> All Ideas</Link>
               <Link href="/dashboard" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>📊</span> Dashboard</Link>
               <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold bg-slate-900 text-white shadow-lg transition"><span>📜</span> Projects</button>
               <Link href="/games/new" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>🕹️</span> Add Game</Link>
            </nav>
            <div className="pt-4 border-t border-slate-100">
               <div className="flex items-center justify-between px-2 mb-2 font-bold text-xs uppercase text-slate-400 tracking-widest"><span>Collections</span><button onClick={()=>setShowCreateGroup(!showCreateGroup)} className="text-lg hover:text-blue-600">+</button></div>
               {showCreateGroup && <div className="mb-2"><input className="w-full border rounded px-2 py-1 text-xs outline-none focus:border-blue-500" value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createGroup()} placeholder="Name..." autoFocus/></div>}
               <div className="space-y-1">
                  {groups.map(g => (
                     <div key={g.id} className="group/item relative flex items-center justify-between w-full hover:bg-slate-50 rounded-xl px-2 py-1 transition cursor-pointer">
                        <div className="flex-1 flex items-center gap-2 overflow-hidden py-2 text-slate-500 font-medium text-sm"><span className="truncate">{g.name}</span></div>
                        <div className="w-8 flex justify-center shrink-0">
                           <span className="text-[10px] font-bold opacity-60 group-hover/item:hidden">{groupCounts.get(g.id)||0}</span>
                           <button onClick={(e) => { e.stopPropagation(); deleteGroup(g.id); }} className="hidden group-hover/item:block text-rose-500 hover:text-rose-700 transition"><TrashIcon className="h-4 w-4"/></button>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </aside>

      <main className="flex-1 pl-0 md:pl-72 pb-32 min-w-0">
        <div className="mx-auto max-w-[1900px] px-6 py-8">
           <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
             <div>
               <h1 className="text-3xl font-black text-slate-900">Video Projects</h1>
               <p className="text-slate-400 text-sm font-bold mt-1">Archive of your scripts and published content</p>
             </div>
             
             {/* Thanh Search */}
             <div className="relative w-full md:w-96">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search projects by title, status..."
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded-full"
                  >
                    <XMarkIcon className="w-4 h-4 text-slate-400" />
                  </button>
                )}
             </div>
           </div>

           {filteredScripts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                 <DocumentTextIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                 <h3 className="text-lg font-bold text-slate-400 tracking-widest uppercase">
                    {searchQuery ? "No matching projects" : "No projects found"}
                 </h3>
                 {searchQuery && (
                   <button onClick={() => setSearchQuery("")} className="text-blue-500 text-sm font-bold mt-2 hover:underline">Clear search</button>
                 )}
              </div>
           ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                 {filteredScripts.map(s => (
                    <ScriptCard key={s.id} script={s} onClick={() => { setEditingScript(s); setIsModalOpen(true); }} onDelete={() => handleDeleteScript(s.id)} />
                 ))}
              </div>
           )}
        </div>
      </main>
    </div>
  );
}