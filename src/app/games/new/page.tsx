"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const inputClass =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400";
const buttonClass =
  "h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50";
const ghostButtonClass =
  "h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100";

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

    const yearNum =
      releaseYear.trim().length > 0 ? Number(releaseYear.trim()) : null;

    if (yearNum !== null && !Number.isFinite(yearNum)) {
      setErr("Release year must be a number (or empty).");
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

    setOkMsg(`Saved ✔ (Game #${data?.id})`);

    // Go back to dashboard
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Add Game</h1>
            <p className="mt-1 text-sm text-slate-600">
              Create a game once, then reuse it for ideas forever.
            </p>
          </div>

          <a href="/" className={ghostButtonClass}>
            Back
          </a>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-800">Title *</span>
              <input
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="God of War Ragnarök"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-800">Release year</span>
              <input
                className={inputClass}
                value={releaseYear}
                onChange={(e) => setReleaseYear(e.target.value)}
                placeholder="2018"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-800">Genres</span>
              <input
                className={inputClass}
                value={genres}
                onChange={(e) => setGenres(e.target.value)}
                placeholder="action, adventure"
              />
              <span className="text-xs text-slate-500">
                Comma separated. You can standardize later.
              </span>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-800">Notes</span>
              <input
                className={inputClass}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any extra info"
              />
            </label>

            <button
              type="button"
              className={buttonClass}
              disabled={!canSave}
              onClick={saveGame}
            >
              {saving ? "Saving..." : "Save game"}
            </button>

            {err && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                {err}
              </div>
            )}

            {okMsg && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                {okMsg}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
