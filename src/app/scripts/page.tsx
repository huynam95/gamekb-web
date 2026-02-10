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
  cover_url?: string; // Trường này sẽ lấy từ idea đầu tiên
};

type Group = { id: number; name: string };

const STATUS_CONFIG = {
  Draft: { color: "bg-slate-500/20 text-slate-200 border-slate-400/30", dot: "bg-slate-400", icon: DocumentTextIcon },
  Filming: { color: "bg-blue-500/20 text-blue-100 border-blue-400/30", dot: "bg-blue-400", icon: PlayCircleIcon },
  Edited: { color: "bg-purple-500/20 text-purple-100 border-purple-400/30", dot: "bg-purple-400", icon: CalendarIcon },
  Published: { color: "bg-emerald-500/20 text-emerald-100 border-emerald-400/30", dot: "bg-emerald-400", icon: GlobeAltIcon },
};

/* ================= COMPONENTS ================= */

function ScriptCard({ script, onClick, onDelete }: { script: ScriptProject, onClick: () => void, onDelete: () => void }) {
  const status = STATUS_CONFIG[script.status] || STATUS_CONFIG.Draft;
  const StatusIcon = status.icon;

  return (
    <div 
      onClick={onClick} 
      className="group relative h-72 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 cursor-pointer flex flex-col"
    >
       {/* HÌNH NỀN THẺ (Lấy từ project assets hoặc mặc định) */}
       {script.cover_url ? (
         <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110 opacity-50" style={{ backgroundImage: `url(${script.cover_url})` }} />
       ) : (
         <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 opacity-50" />
       )}
       
       {/* Lớp phủ gradient để đọc chữ dễ hơn */}
       <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />

       <div className="relative p-6 flex flex-col h-full z-10">
          <div className="flex justify-between items-start mb-4">
             <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border backdrop-blur-md ${status.color}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse`} />
                {script.status}
             </span>
             <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold bg-black/20 px-2 py-1 rounded-md backdrop-blur-sm">
                <ClockIcon className="w-3 h-3"/>
                {new Date(script.created_at).toLocaleDateString()}
             </div>
          </div>

          <h3 className="text-xl font-black text-white mb-2 line-clamp-2 leading-tight tracking-tight group-hover:text-blue-400 transition-colors">
             {script.title || "Untitled Project"}
          </h3>

          <p className="text-xs text-slate-300 line-clamp-3 mb-4 font-medium leading-relaxed opacity-80">
             {script.description}
          </p>

          <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
             <div className="flex -space-x-2">
                {script.hashtags?.slice(0, 3).map((h, i) => (
                  <span key={i} className="text-[9px] font-black text-white bg-blue-600/80 px-2 py-0.5 rounded-md border border-white/10 backdrop-blur-sm">
                    {h}
                  </span>
                ))}
             </div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {script.assets?.length || 0} Files
             </span>
          </div>
       </div>

       {/* Nút xóa hiện khi hover */}
       <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }} 
          className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-red-500 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 z-20"
       >
          <TrashIcon className="w-4 h-4" />
       </button>
    </div>
  );
}

// ... (Giữ nguyên ScriptEditorModal từ các phản hồi trước) ...

/* ================= PAGE LOGIC ================= */

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<ScriptProject[]>([]);
  // ... (Giữ nguyên các states khác) ...

  useEffect(() => {
    async function load() {
      // 1. Load Scripts
      const { data: scriptsData } = await supabase.from("scripts").select("*").order("created_at", { ascending: false });
      
      // 2. Logic bổ sung: Lấy ảnh nền cho từng project (Tạm thời lấy ảnh từ Idea đầu tiên nếu có link)
      // Trong thực tế bạn có thể lưu trực tiếp cover_url vào bảng scripts khi tạo
      const enrichedScripts = (scriptsData || []).map(s => ({
        ...s,
        cover_url: s.assets && s.assets.length > 0 ? s.assets[0].url : null // Hoặc logic lấy cover khác
      }));

      setScripts(enrichedScripts as ScriptProject[]);

      // ... (Load sidebar info) ...
    }
    load();
  }, []);

  // ... (Giữ nguyên handleUpdate, handleDelete, createGroup, deleteGroup) ...

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* ... (Render Modal, Sidebar và Layout giống các phản hồi trước) ... */}
    </div>
  );
}