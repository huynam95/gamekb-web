"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* ================= STYLES ================= */

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

export default function EditGamePage() {
  const params = useParams();
  const router = useRouter();
  
  const id = Number(params?.id);

  const [loading, setLoading] = useState(true);
  
  // Fields
  const [title, setTitle] = useState("");
  const [releaseYear, setReleaseYear] = useState<string>("");
  const [coverUrl, setCoverUrl] = useState(""); // MỚI
  const [genres, setGenres] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // Load dữ liệu cũ
  useEffect(() => {
    if (!id || isNaN(id)) {
      setErr("Invalid Game ID");
      setLoading(false);
      return;
    }

    async function loadGame() {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        setErr("Game not found or deleted.");
      } else if (data) {
        setTitle(data.title);
        setReleaseYear(data.release_year ? String(data.release_year) : "");
        setCoverUrl(data.cover_url || ""); // Load ảnh cũ lên
        setGenres(data.genres_text || "");
        setNotes(data.notes || "");
      }
      setLoading(false);
    }
    loadGame();
  }, [id]);

  const canSave = useMemo(() => title.trim().length > 0 && !saving, [title, saving]);

  // Hành động Lưu (UPDATE)
  async function saveChanges() {
    if (!canSave) return;

    setSaving(true);
    setErr(null);
    setOkMsg(null);

    const yearNum = releaseYear.trim().length > 0 ? Number(releaseYear.trim()) : null;

    const { error } = await supabase
      .from("games")
      .update({
        title: title.trim(),
        release_year: yearNum,
        cover_url: coverUrl.trim() || null, // Lưu link ảnh mới
        genres_text: genres.trim() || null,
        notes: notes.trim() || null,
      })
      .eq("id", id);

    if (error) {
      setErr(error.message);
      setSaving(false);
    } else {
      setOkMsg("Updated successfully!");
      setSaving(false);
      router.refresh();
      // Delay chút rồi về trang chủ
      setTimeout(() => router.push("/"), 800);
    }
  }

  // Hành động Xóa (DELETE)
  async function deleteGame() {
    const confirmMsg = `Delete "${title}"?\n\nWarning: This will delete ALL ideas attached to this game!`;
    if (!confirm(confirmMsg)) return;

    setSaving(true);
    const { error } = await supabase.from("games").delete().eq("id", id);

    if (error) {
      setErr(error.message);
      setSaving(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  if (loading) return <div className="p-10 text-center text-slate-500">Loading game data...</div>;
  if (!loading && !title && err) return <div className="p-10 text-center text-rose-500">{err}</div>;

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <div className="mx-auto max-w-4xl px-4 py-8">
        
        {/* HEADER */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Edit Game</h1>
            <p className="text-sm text-slate-500">Update details for #{id}</p>
          </div>
          <button onClick={() => router.back()} className={btnGhost}>
            Cancel
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* LEFT: FORM INPUTS */}
          <section className="lg:col-span-2 space-y-6">
            <div className={cardClass}>
              
              {/* MESSAGES */}
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
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-900">Game Title *</span>
                  <input
                    className={inputClass}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Game Name"
                  />
                </label>

                {/* MỚI: Ô nhập Cover URL */}
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-900">Cover Image URL</span>
                  <input 
                    className={inputClass} 
                    value={coverUrl} 
                    onChange={(e) => setCoverUrl(e.target.value)} 
                    placeholder="https://..." 
                  />
                  <p className="mt-1 text-xs text-slate-500">Link to vertical poster or box art.</p>
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-900">Release Year</span>
                    <input
                      type="number"
                      className={inputClass}
                      value={releaseYear}
                      onChange={(e) => setReleaseYear(e.target.value)}
                      placeholder="YYYY"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-900">Genres</span>
                    <input
                      className={inputClass}
                      value={genres}
                      onChange={(e) => setGenres(e.target.value)}
                      placeholder="Action, RPG..."
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-900">Notes</span>
                  <textarea
                    className={textareaClass}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Version details, context..."
                  />
                </label>

                <div className="flex items-center justify-between pt-2">
                   <button
                    type="button"
                    className={btnPrimary}
                    disabled={!canSave}
                    onClick={saveChanges}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>

             {/* DANGER ZONE */}
             <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6">
                <h3 className="text-sm font-bold text-rose-900">Danger Zone</h3>
                <p className="mt-1 text-sm text-rose-700">Deleting this game will remove it from all associated ideas.</p>
                <button 
                  onClick={deleteGame}
                  disabled={saving}
                  className="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-600 shadow-sm hover:bg-rose-600 hover:text-white transition"
                >
                   {saving ? "Processing..." : "Delete Game"}
                </button>
             </div>
          </section>

          {/* RIGHT: PREVIEW (CẬP NHẬT ĐỂ HIỆN ẢNH) */}
          <section className="lg:col-span-1">
            <div className="sticky top-8 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Preview</h3>
              
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition">
                {/* Phần hiển thị ảnh */}
                <div className="relative h-48 w-full bg-slate-100">
                  {coverUrl ? (
                    <img src={coverUrl} alt="Preview" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl text-slate-200">🖼️</div>
                  )}
                  {/* Overlay text nếu không có ảnh hoặc ảnh lỗi */}
                  {!coverUrl && (
                     <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-bold text-4xl text-slate-300">{title.trim().charAt(0).toUpperCase() || "?"}</span>
                     </div>
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
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}