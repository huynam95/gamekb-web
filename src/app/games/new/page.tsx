"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AppSidebar } from "@/components/AppSidebar";
import { AppPageHeader, appPageMainClass, appPageRootClass } from "@/components/AppPage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PhotoIcon, PuzzlePieceIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useNotifications } from "@/components/NotificationCenter";
import { normalizeGameTitle } from "@/lib/gameTitles";

/* ================= PAGE LOGIC ================= */

export default function AddGamePage() {
  const router = useRouter();
  const { success, error: notifyError, warning } = useNotifications();
  
  // Form State
  const [title, setTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [loading, setLoading] = useState(false);

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


  return (
    <div className={`${appPageRootClass} xl:flex`}>
      <AppSidebar activePage="addGame" />

      {/* MAIN CONTENT */}
      <main className={`${appPageMainClass} pb-32`}>
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
           
           <AppPageHeader
             title="Add New Game"
             description="Add a game to your library so you can start collecting details and video ideas."
             icon={<PuzzlePieceIcon className="h-5 w-5" />}
             action={
               <Link href="/" className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
                 <ArrowLeftIcon className="h-4 w-4" /> Back to Ideas
               </Link>
             }
           />

           {/* ADD FORM CARD */}
           <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="p-8 space-y-8">
                 
                 {/* Title Input */}
                 <div className="space-y-2">
                    <label className="text-sm font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                       <PuzzlePieceIcon className="w-4 h-4" /> Game Title
                    </label>
                    <input 
                      type="text" 
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 text-lg font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-500/10"
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
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      placeholder="https://..."
                      value={coverUrl}
                      onChange={e => setCoverUrl(e.target.value)}
                    />
                    <p className="text-xs text-slate-400 pl-2">Paste a direct link to an image (jpg, png, webp).</p>
                 </div>

                 {/* Image Preview */}
                 {coverUrl && (
                    <div className="group relative h-64 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-inner dark:border-slate-700 dark:bg-slate-950">
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
              <div className="flex items-center justify-end gap-4 border-t border-slate-100 bg-slate-50 px-8 py-6 dark:border-slate-800 dark:bg-slate-950/50">
                 <Link href="/" className="cursor-pointer px-6 py-3 text-sm font-bold text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
                    Cancel
                 </Link>
                 <button 
                    onClick={handleAddGame}
                    disabled={loading}
                    className="cursor-pointer rounded-xl bg-slate-900 px-8 py-3 font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
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