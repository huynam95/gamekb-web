"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* ================= STYLES (Matching other pages) ================= */

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition";

const textareaClass =
  "min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition resize-y";

const btnPrimary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-md shadow-slate-900/10 hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed transition active:scale-[0.98]";

const btnGhost =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition active:scale-[0.98]";

const cardClass = "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";

/* ================= COMPONENT ================= */

export default function NewGamePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [releaseYear, setReleaseYear] = useState<string>("");
  const [genres, setGenres] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const canSave = useMemo(() => title.trim().length > 0 && !saving, [title, saving]);

  async function saveGame() {
    if (!canSave) return;

    setSaving(true);
    setErr(null);
    setOkMsg(null);

    const yearNum = releaseYear.trim().length > 0 ? Number(releaseYear.trim()) : null;

    if (yearNum !== null && !Number.isFinite(yearNum)) {
      setErr("Release year must be a valid number.");
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("games")
      .insert({
        title: title.trim(),
        release_year: yearNum,
        genres_text: genres.trim() || null,
        notes: notes.trim() || null,
      })
      .select("id")
      .single();

    if (error) {
      setErr(error.message);
      setSaving(false);
      return;
    }

    setOkMsg(`Saved successfully! Redirecting...`);
    
    // Slight delay to show success message
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1000);
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <div className="mx-auto max-w-4xl px-4 py-8">
        
        {/* HEADER */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Add New Game</h1>
            <p className="text-sm text-slate-500">
              Create a game profile to attach your ideas to.
            </p>
          </div>
          <a href="/" className={btnGhost}>
            Back
          </a>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* LEFT: FORM INPUTS */}
          <section className={`lg:col-span-2 space-y-6`}>
            <div className={cardClass}>
              
              {/* STATUS MESSAGES */}
              {err && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {err}
                </div>
              )}
              {okMsg && (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  {okMsg}
                </div>
              )}

              <div className="space-y-5">
                {/* Title */}
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-900">Game Title *</span>
                  <input
                    className={inputClass}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. God of War Ragnarök"
                    autoFocus
                  />
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                  {/* Release Year */}
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-900">Release Year</span>
                    <input
                      type="number"
                      className={inputClass}
                      value={releaseYear}
                      onChange={(e) => setReleaseYear(e.target.value)}
                      placeholder="2022"
                    />
                  </label>

                  {/* Genres */}
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-900">Genres</span>
                    <input
                      className={inputClass}
                      value={genres}
                      onChange={(e) => setGenres(e.target.value)}
                      placeholder="Action, Adventure..."
                    />
                  </label>
                </div>

                {/* Notes */}
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-900">Notes / Description</span>
                  <textarea
                    className={textareaClass}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Brief info about the game version or context..."
                  />
                </label>

                {/* Action */}
                <div className="pt-2">
                  <button
                    type="button"
                    className={`${btnPrimary} w-full md:w-auto`}
                    disabled={!canSave}
                    onClick={saveGame}
                  >
                    {saving ? "Saving..." : "Create Game"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT: PREVIEW CARD (Visual Feedback) */}
          <section className="lg:col-span-1">
            <div className="sticky top-8 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Preview</h3>
              
              {/* Game Card Preview */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                <div className="flex h-32 w-full items-center justify-center bg-slate-100 text-4xl">
                  {title.trim() ? (
                    <span className="font-bold text-slate-300">{title.charAt(0).toUpperCase()}</span>
                  ) : (
                    <span className="text-slate-200">🎮</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-slate-900 break-words">
                    {title.trim() || "Untitled Game"}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {releaseYear && (
                      <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {releaseYear}
                      </span>
                    )}
                    {genres.trim() && genres.split(',').map((g, i) => (
                      <span key={i} className="inline-flex items-center rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {g.trim()}
                      </span>
                    ))}
                  </div>
                  {notes && (
                     <p className="mt-3 text-xs text-slate-500 line-clamp-3">
                       {notes}
                     </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-slate-100 p-4 text-xs text-slate-500">
                💡 Tip: Adding the release year helps sort games chronologically later.
              </div>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}