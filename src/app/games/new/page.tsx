"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  TrashIcon, 
  PhotoIcon, 
  PuzzlePieceIcon,
  ArrowLeftIcon
} from "@heroicons/react/24/outline";

/* ================= TYPES ================= */

type Group = { id: number; name: string };

/* ================= PAGE LOGIC ================= */

export default function AddGamePage() {
  const router = useRouter();
  
  // Form State
  const [title, setTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [loading, setLoading] = useState(false);

  // Sidebar State
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupCounts, setGroupCounts] = useState<Map<number, number>>(new Map());
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  // Load Sidebar Data
  useEffect(() => {
    async function loadSidebar() {
      const grps = await supabase.from("idea_groups").select("*").order("name");
      const grpItems = await supabase.from("idea_group_items").select("group_id");
      
      setGroups((grps.data || []) as Group[]);
      
      const m = new Map<number, number>();
      for (const row of grpItems.data ?? []) { const gid = Number((row as any).group_id); m.set(gid, (m.get(gid) ?? 0) + 1); }
      setGroupCounts(m);
    }
    loadSidebar();
  }, []);

  // --- ACTIONS ---

  const handleAddGame = async () => {
    if (!title.trim()) {
      alert("Please enter a game title!");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("games").insert({ 
      title: title.trim(),
      cover_url: coverUrl.trim() || null 
    });
    setLoading(false);

    if (!error) {
      alert("Game added successfully!");
      router.push("/"); // Quay về trang chủ
    } else {
      alert("Error adding game: " + error.message);
    }
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

      {/* MAIN CONTENT */}
      <main className="flex-1 pl-0 md:pl-72 pb-32">
        <div className="mx-auto max-w-2xl px-6 py-12">
           
           <div className="mb-8">
             <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-600 mb-4 transition">
                <ArrowLeftIcon className="w-4 h-4" /> Back to Home
             </Link>
             <h1 className="text-3xl font-black text-slate-900">Add New Game</h1>
             <p className="text-slate-500 mt-2">Add a game to your library to start tracking details and ideas.</p>
           </div>

           {/* ADD FORM CARD */}
           <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
              <div className="p-8 space-y-8">
                 
                 {/* Title Input */}
                 <div className="space-y-2">
                    <label className="text-sm font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                       <PuzzlePieceIcon className="w-4 h-4" /> Game Title
                    </label>
                    <input 
                      type="text" 
                      className="w-full h-14 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-lg font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition"
                      placeholder="e.g. Elden Ring"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      autoFocus
                    />
                 </div>

                 {/* Cover URL Input */}
                 <div className="space-y-2">
                    <label className="text-sm font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                       <PhotoIcon className="w-4 h-4" /> Cover Image URL
                    </label>
                    <input 
                      type="text" 
                      className="w-full h-12 rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 transition"
                      placeholder="https://..."
                      value={coverUrl}
                      onChange={e => setCoverUrl(e.target.value)}
                    />
                    <p className="text-xs text-slate-400 pl-2">Paste a direct link to an image (jpg, png, webp).</p>
                 </div>

                 {/* Image Preview */}
                 {coverUrl && (
                    <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shadow-inner group">
                       <img 
                          src={coverUrl} 
                          alt="Cover Preview" 
                          className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                       />
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="px-3 py-1 bg-black/50 text-white text-xs font-bold rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition">Preview</span>
                       </div>
                    </div>
                 )}
              </div>

              {/* Footer Actions */}
              <div className="bg-slate-50 px-8 py-6 border-t border-slate-100 flex items-center justify-end gap-4">
                 <Link href="/" className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition">
                    Cancel
                 </Link>
                 <button 
                    onClick={handleAddGame}
                    disabled={loading}
                    className="px-8 py-3 rounded-xl bg-slate-900 text-white font-bold shadow-lg hover:bg-blue-600 hover:shadow-blue-500/30 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    {loading ? "Adding..." : "Add Game to Library"}
                 </button>
              </div>
           </div>

        </div>
      </main>
    </div>
  );
}