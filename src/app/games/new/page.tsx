"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* ================= STYLES ================= */
const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition";
const btnPrimary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-md shadow-slate-900/10 hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed transition active:scale-[0.98]";
const btnGhost =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition active:scale-[0.98]";
const cardClass = "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";

export default function NewGamePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [releaseYear, setReleaseYear] = useState<string>("");
  const [coverUrl, setCoverUrl] = useState(""); // MỚI
  const [genres, setGenres] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSave = useMemo(() => title.trim().length > 0 && !saving, [title, saving]);

  async function saveGame() {
    if (!canSave) return;
    setSaving(true);
    setErr(null);

    const yearNum = releaseYear.trim().length > 0 ? Number(releaseYear.trim()) : null;

    const { error } = await supabase
      .from("games")
      .insert({
        title: title.trim(),
        release_year: yearNum,
        cover_url: coverUrl.trim() || null, // Lưu URL ảnh
        genres_text: genres.trim() || null,
        notes: notes.trim() || null,
      });

    if (error) {
      setErr(error.message);
      setSaving(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Add New Game</h1>
          <a href="/" className={btnGhost}>Back</a>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <section className="lg:col-span-2 space-y-6">
            <div className={cardClass}>
              {err && <div className="mb-4 text-sm text-rose-600">{err}</div>}
              <div className="space-y-5">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-900">Game Title *</span>
                  <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Elden Ring" autoFocus />
                </label>
                
                {/* MỚI: Input nhập link ảnh */}
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-900">Cover Image URL</span>
                  <input className={inputClass} value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
                  <p className="mt-1 text-xs text-slate-500">Paste a link to the game's poster/cover art.</p>
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-900">Release Year</span>
                    <input type="number" className={inputClass} value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} placeholder="2022" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-900">Genres</span>
                    <input className={inputClass} value={genres} onChange={(e) => setGenres(e.target.value)} placeholder="Action, RPG..." />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-900">Notes</span>
                  <textarea className="min-h-[100px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Brief info..." />
                </label>
                <button type="button" className={btnPrimary} disabled={!canSave} onClick={saveGame}>{saving ? "Saving..." : "Create Game"}</button>
              </div>
            </div>
          </section>

          {/* PREVIEW IMAGE */}
          <section className="lg:col-span-1">
            <div className="sticky top-8 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Preview</h3>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* Hiển thị ảnh bìa nếu có */}
                <div className="relative h-48 w-full bg-slate-100">
                  {coverUrl ? (
                    <img src={coverUrl} alt="Preview" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl text-slate-200">🖼️</div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-slate-900">{title || "Untitled Game"}</h3>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}