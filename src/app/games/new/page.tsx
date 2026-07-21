"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AppSidebar } from "@/components/AppSidebar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PhotoIcon, PuzzlePieceIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useNotifications } from "@/components/NotificationCenter";
import { normalizeGameTitle } from "@/lib/gameTitles";

/* ================= TYPES ================= */

type Group = { id: number; name: string };

/* ================= PAGE LOGIC ================= */

export default function AddGamePage() {
  const router = useRouter();
  const { success, error: notifyError, warning, confirm } = useNotifications();
  
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
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      warning("Please enter a game title.", "Missing title");
      return;
    }

    setLoading(true);

    const { data: existingGames, error: lookupError } = await supabase
      .from("games")
      .select("id,title");

    if (lookupError) {
      setLoading(false);
      notifyError(lookupError.message, "Could not check game library");
      return;
    }

    const duplicate = (existingGames ?? []).find(
      (game) => normalizeGameTitle(String(game.title ?? "")) === normalizeGameTitle(trimmedTitle),
    );

    if (duplicate) {
      setLoading(false);
      warning(`“${duplicate.title}” is already in your game library.`, "Game already exists");
      return;
    }

    const { error } = await supabase.from("games").insert({
      title: trimmedTitle,
      cover_url: coverUrl.trim() || null,
    });
    setLoading(false);

    if (!error) {
      success("Game added successfully!", "Game saved");
      router.push("/");
    } else if ((error as { code?: string }).code === "23505") {
      warning("A game with this title already exists.", "Game already exists");
    } else {
      notifyError(error.message, "Error adding game");
    }
  };

  // Sidebar Actions
  async function createGroup() {
    const name = newGroupName.trim();
    if (!name) return;
    const { data, error } = await supabase.from("idea_groups").insert({ name }).select("id,name").single();
    if (error || !data) {
      notifyError(error?.message || "Could not create collection", "Could not create collection");
      return;
    }
    setGroups((current) => [...current, data as Group].sort((a, b) => a.name.localeCompare(b.name)));
    setGroupCounts((current) => new Map(current).set(data.id, 0));
    setNewGroupName("");
    setShowCreateGroup(false);
    success("Collection created.", "Saved");
  }
  async function renameGroup(id: number, name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const { error } = await supabase.from("idea_groups").update({ name: trimmedName }).eq("id", id);
    if (error) {
      notifyError(error.message, "Could not rename collection");
      return;
    }
    setGroups((current) => current.map((group) => group.id === id ? { ...group, name: trimmedName } : group).sort((a, b) => a.name.localeCompare(b.name)));
    success("Collection renamed.", "Saved");
  }
  async function deleteGroup(id: number) {
    const shouldDelete = await confirm({
      kind: "warning",
      title: "Delete collection?",
      message: "Delete this collection? Ideas will stay in your database.",
      confirmText: "Delete",
    });
    if (!shouldDelete) return;
    const { error } = await supabase.from("idea_groups").delete().eq("id", id);
    if (error) {
      notifyError(error.message, "Could not delete collection");
      return;
    }
    setGroups((current) => current.filter((group) => group.id !== id));
    setGroupCounts((current) => {
      const next = new Map(current);
      next.delete(id);
      return next;
    });
    success("Collection deleted.", "Deleted");
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 xl:flex">
      <AppSidebar
        activePage="addGame"
        groups={groups}
        groupCounts={groupCounts}
        showCollections
        showCreateGroup={showCreateGroup}
        newGroupName={newGroupName}
        onToggleCreateGroup={() => setShowCreateGroup(!showCreateGroup)}
        onNewGroupNameChange={setNewGroupName}
        onCreateGroup={createGroup}
        onDeleteGroup={deleteGroup}
        onRenameGroup={renameGroup}
        onSelectGroup={() => router.push("/")}
      />

      {/* MAIN CONTENT */}
      <main className="flex-1 pl-0 xl:pl-72 pb-32">
        <div className="mx-auto max-w-2xl px-6 py-12">
           
           <div className="mb-8">
             <Link href="/" className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-600 mb-4 transition">
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
                 <Link href="/" className="cursor-pointer px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition">
                    Cancel
                 </Link>
                 <button 
                    onClick={handleAddGame}
                    disabled={loading}
                    className="cursor-pointer px-8 py-3 rounded-xl bg-slate-900 text-white font-bold shadow-lg hover:bg-blue-600 hover:shadow-blue-500/30 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
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