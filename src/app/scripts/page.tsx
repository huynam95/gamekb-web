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
  PlayCircleIcon
} from "@heroicons/react/24/outline";

/* ================= TYPES & CONFIG ================= */

type ScriptProject = { 
  id: number; 
  title: string; 
  content: string; 
  assets: string[];
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
  Published: { color: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: CheckCircleIcon },
};

/* ================= COMPONENTS ================= */

// COMPONENT: SCRIPT EDITOR MODAL (Reuse & Enhanced for Editing)
function ScriptEditorModal({ 
  isOpen, onClose, script, onSave 
}: { 
  isOpen: boolean; onClose: () => void; 
  script: ScriptProject | null; // Nếu null là tạo mới (optional), nếu có là sửa
  onSave: (data: Partial<ScriptProject>) => void;
}) {
  // Local state form
  const [formData, setFormData] = useState<Partial<ScriptProject>>({
    title: "", content: "", description: "", hashtags: [], tags: [], publish_date: null, status: "Draft", assets: []
  });
  const [activeTab, setActiveTab] = useState<"details" | "script" | "assets">("script");

  // Load data khi mở modal
  useEffect(() => {
    if (isOpen && script) {
      setFormData(script);
    } else if (isOpen && !script) {
      // Reset nếu tạo mới (nếu cần)
      setFormData({ title: "", content: "", status: "Draft" });
    }
  }, [isOpen, script]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
       <div className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          
          {/* HEADER */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
             <div>
                <h2 className="text-xl font-black text-slate-900">
                  {script ? "Edit Script" : "New Script"}
                </h2>
                <p className="text-xs text-slate-500">
                  {script ? `Last updated: ${new Date(script.created_at).toLocaleDateString()}` : "Create a new masterpiece"}
                </p>
             </div>
             <div className="flex gap-3">
                <select 
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold outline-none focus:border-blue-500"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                >
                   {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button onClick={() => { onSave(formData); onClose(); }} className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20">
                   Save Changes
                </button>
             </div>
          </div>

          {/* TABS */}
          <div className="flex px-6 border-b border-slate-100 bg-white">
             {(["script", "details", "assets"] as const).map(tab => (
               <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-4 text-sm font-bold border-b-2 transition ${activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-800"}`}>
                 {tab === "script" ? "📝 Script Content" : tab === "details" ? "ℹ️ Metadata & SEO" : "🔗 Assets & Links"}
               </button>
             ))}
          </div>

          {/* CONTENT AREA */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
             
             {/* TAB 1: SCRIPT CONTENT */}
             {activeTab === "script" && (
                <div className="h-full flex flex-col gap-2">
                   <input 
                      className="w-full text-2xl font-black bg-transparent border-none outline-none placeholder-slate-300 mb-4" 
                      placeholder="Script Title..."
                      value={formData.title} 
                      onChange={e => setFormData({...formData, title: e.target.value})}
                   />
                   <textarea 
                      className="flex-1 w-full rounded-2xl border border-slate-200 p-6 text-base leading-relaxed text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 font-mono resize-none shadow-sm" 
                      value={formData.content} 
                      onChange={e => setFormData({...formData, content: e.target.value})} 
                      placeholder="Start writing your script here..."
                   />
                </div>
             )}

             {/* TAB 2: DETAILS */}
             {activeTab === "details" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                   <div className="space-y-6">
                      <div>
                         <label className="block text-xs font-bold uppercase text-slate-500 mb-2">YouTube Description</label>
                         <textarea className="w-full h-48 rounded-xl border border-slate-200 p-4 text-sm outline-none focus:border-blue-500 shadow-sm" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                      </div>
                   </div>
                   <div className="space-y-6">
                      <div>
                         <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Publish Date</label>
                         <input type="datetime-local" className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm" value={formData.publish_date ? new Date(formData.publish_date).toISOString().slice(0,16) : ""} onChange={e => setFormData({...formData, publish_date: e.target.value})} />
                      </div>
                      <div>
                         <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Tags / Keywords</label>
                         <textarea className="w-full h-24 rounded-xl border border-slate-200 p-4 text-sm outline-none focus:border-blue-500 shadow-sm" placeholder="Separate by commas..." value={formData.tags?.join(", ")} onChange={e => setFormData({...formData, tags: e.target.value.split(",").map(s => s.trim())})} />
                      </div>
                   </div>
                </div>
             )}

             {/* TAB 3: ASSETS */}
             {activeTab === "assets" && (
                <div className="max-w-3xl mx-auto">
                   <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                         <h3 className="font-bold text-slate-700">Linked Assets</h3>
                         <button className="text-xs text-blue-600 font-bold hover:underline">Add Link</button>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {(formData.assets || []).length === 0 && <p className="p-8 text-center text-slate-400 text-sm">No assets linked yet.</p>}
                        {(formData.assets || []).map((link, i) => (
                           <div key={i} className="flex items-center gap-4 p-4 hover:bg-slate-50 group">
                              <span className="w-6 h-6 rounded-full bg-slate-100 text-xs font-mono flex items-center justify-center text-slate-500">#{i+1}</span>
                              <a href={link} target="_blank" className="text-sm text-blue-600 truncate flex-1 hover:underline">{link}</a>
                              <button className="text-slate-300 hover:text-red-500 group-hover:block hidden"><TrashIcon className="w-4 h-4" /></button>
                           </div>
                        ))}
                      </div>
                   </div>
                </div>
             )}
          </div>
       </div>
    </div>
  );
}

// COMPONENT: SCRIPT CARD (GRID ITEM)
function ScriptCard({ script, onClick, onDelete }: { script: ScriptProject, onClick: () => void, onDelete: () => void }) {
  const status = STATUS_CONFIG[script.status] || STATUS_CONFIG.Draft;
  const StatusIcon = status.icon;

  return (
    <div 
      onClick={onClick}
      className="group relative bg-white h-64 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
    >
       {/* Header Color Line */}
       <div className={`h-2 w-full ${status.color.split(' ')[0].replace('bg-', 'bg-')}`}></div>

       <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
             <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${status.color}`}>
                <StatusIcon className="w-3 h-3" /> {script.status}
             </span>
             {script.publish_date && (
                <span className="text-[10px] text-slate-400 font-mono">
                   {new Date(script.publish_date).toLocaleDateString()}
                </span>
             )}
          </div>

          <h3 className="text-lg font-black text-slate-900 mb-2 line-clamp-2 leading-tight">
             {script.title || "Untitled Script"}
          </h3>

          <p className="text-sm text-slate-500 line-clamp-3 mb-4 font-mono leading-relaxed opacity-80">
             {script.content || "No content..."}
          </p>

          <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
             <span className="text-xs text-slate-400 font-bold">
                {script.assets?.length || 0} Assets
             </span>
          </div>
       </div>

       {/* Delete Button (Hover) */}
       <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all z-10"
       >
          <TrashIcon className="w-4 h-4" />
       </button>
    </div>
  );
}

/* ================= PAGE LOGIC ================= */

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<ScriptProject[]>([]);
  const [editingScript, setEditingScript] = useState<ScriptProject | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Sidebar State (cần thiết để giữ giao diện)
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupCounts, setGroupCounts] = useState<Map<number, number>>(new Map());
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  useEffect(() => {
    async function load() {
      // Load Scripts
      const { data } = await supabase.from("scripts").select("*").order("created_at", { ascending: false });
      setScripts((data || []) as ScriptProject[]);

      // Load Sidebar Info (Để sidebar không bị trống)
      const grps = await supabase.from("idea_groups").select("*").order("name");
      const grpItems = await supabase.from("idea_group_items").select("group_id");
      setGroups((grps.data || []) as Group[]);
      const m = new Map<number, number>();
      for (const row of grpItems.data ?? []) { const gid = Number((row as any).group_id); m.set(gid, (m.get(gid) ?? 0) + 1); }
      setGroupCounts(m);
    }
    load();
  }, []);

  // --- ACTIONS ---
  const handleUpdateScript = async (updatedData: Partial<ScriptProject>) => {
    if (!editingScript) return; // Chỉ support edit ở đây, create làm từ home cho tiện logic

    const { error } = await supabase.from("scripts").update(updatedData).eq("id", editingScript.id);
    if (!error) {
       // Cập nhật UI ngay lập tức
       setScripts(prev => prev.map(s => s.id === editingScript.id ? { ...s, ...updatedData } : s));
       setIsModalOpen(false);
       setEditingScript(null);
    } else {
       alert("Error: " + error.message);
    }
  };

  const handleDeleteScript = async (id: number) => {
    if (!confirm("Delete this script permanently?")) return;
    await supabase.from("scripts").delete().eq("id", id);
    setScripts(prev => prev.filter(s => s.id !== id));
  };

  // Sidebar Actions
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
      
      {/* EDITOR MODAL */}
      <ScriptEditorModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingScript(null); }}
        script={editingScript}
        onSave={handleUpdateScript}
      />

      {/* SIDEBAR (Copy nguyên mẫu) */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-slate-200 bg-white hidden md:flex">
         <div className="flex h-20 items-center px-8 text-2xl font-black text-slate-900">GameKB<span className="text-blue-500">.</span></div>
         <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            <nav className="space-y-2">
               <Link href="/" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>🏠</span> All Ideas</Link>
               <Link href="/dashboard" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>📊</span> Dashboard</Link>
               <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold bg-slate-900 text-white shadow-lg transition"><span>📜</span> Scripts</button>
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
           
           <div className="flex items-center justify-between mb-8">
             <div>
                <h1 className="text-3xl font-black text-slate-900">Video Scripts</h1>
                <p className="text-slate-500 mt-1">Manage your video projects and drafts.</p>
             </div>
             {/* Nút thêm mới thủ công (nếu cần) */}
             <button disabled className="opacity-50 cursor-not-allowed flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-200 text-slate-500 font-bold text-sm" title="Create Scripts from Home page">
                <PlusIcon className="w-5 h-5" /> Auto-Create (Use Home)
             </button>
           </div>

           {/* SCRIPTS GRID */}
           {scripts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                 <DocumentTextIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                 <h3 className="text-lg font-bold text-slate-600">No scripts yet</h3>
                 <p className="text-slate-400 text-sm">Select ideas from the Home page to generate scripts.</p>
              </div>
           ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                 {scripts.map(s => (
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
    </div>
  );
}