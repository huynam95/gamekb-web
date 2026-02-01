"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Detail = {
  id: number;
  title: string;
  description: string | null;
  detail_type: string;
  priority: number;
  spoiler_level: number | null;
  confidence: number | null;
  status: string | null;
  game_id: number;
  created_at: string | null;

  pinned: boolean;
  pinned_at: string | null;
};

type Game = {
  id: number;
  title: string;
  release_year: number | null;
};

type FootageRow = {
  id: number;
  detail_id: number;
  file_path: string | null;
  start_ts: string | null;
  end_ts: string | null;
  label: string | null;
  notes: string | null;
  created_at: string | null;
};

type SourceRow = {
  id: number;
  detail_id: number;
  url: string;
  note: string | null;
  reliability: number;
  created_at: string | null;
};

const inputClass =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400";
const selectClass =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400";
const buttonClass =
  "h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50";
const ghostButtonClass =
  "h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100";

function typeLabel(t: string) {
  switch (t) {
    case "small_detail":
      return "Small detail";
    case "easter_egg":
      return "Easter egg";
    case "npc_reaction":
      return "NPC reaction";
    case "physics":
      return "Physics";
    case "troll":
      return "Troll";
    case "punish":
      return "Punish";
    default:
      return t;
  }
}

function priorityLabel(p: number) {
  if (p === 1) return "High";
  if (p === 3) return "Normal";
  return "Low";
}

function spoilerLabel(s: number | null) {
  if (s === null || s === 0) return "0 – None";
  if (s === 1) return "1 – Mild";
  if (s === 2) return "2 – Story";
  return "3 – Ending";
}

function confidenceLabel(c: number | null) {
  if (c === null || c === 3) return "3 – Medium";
  if (c <= 1) return "1 – Low";
  if (c === 2) return "2";
  if (c === 4) return "4";
  return "5 – Verified";
}

export default function IdeaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;

  const id = useMemo(() => {
    const s = Array.isArray(rawId) ? rawId[0] : rawId;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }, [rawId]);

  const [detail, setDetail] = useState<Detail | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [footage, setFootage] = useState<FootageRow[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Footage form
  const [fp, setFp] = useState("");
  const [startTs, setStartTs] = useState("");
  const [endTs, setEndTs] = useState("");
  const [fLabel, setFLabel] = useState("");
  const [fNotes, setFNotes] = useState("");
  const [savingFootage, setSavingFootage] = useState(false);

  // Source form
  const [srcUrl, setSrcUrl] = useState("");
  const [srcNote, setSrcNote] = useState("");
  const [srcReliability, setSrcReliability] = useState(3);
  const [savingSource, setSavingSource] = useState(false);

  async function loadAll() {
    setLoading(true);
    setErr(null);

    if (!Number.isFinite(id)) {
      setErr("Invalid id");
      setLoading(false);
      return;
    }

    const { data: d, error: e1 } = await supabase
      .from("details")
      .select(
        "id,title,description,detail_type,priority,spoiler_level,confidence,status,game_id,created_at,pinned,pinned_at"
      )
      .eq("id", id)
      .single();

    if (e1) {
      setErr(e1.message);
      setLoading(false);
      return;
    }

    const detailRow = d as Detail;
    setDetail(detailRow);

    const { data: g, error: e2 } = await supabase
      .from("games")
      .select("id,title,release_year")
      .eq("id", detailRow.game_id)
      .single();

    if (e2) {
      setErr(e2.message);
      setLoading(false);
      return;
    }
    setGame(g as Game);

    const { data: f, error: e3 } = await supabase
      .from("footage")
      .select("id,detail_id,file_path,start_ts,end_ts,label,notes,created_at")
      .eq("detail_id", id)
      .order("created_at", { ascending: false });

    if (e3) {
      setErr(e3.message);
      setLoading(false);
      return;
    }
    setFootage((f ?? []) as FootageRow[]);

    const { data: s, error: e4 } = await supabase
      .from("sources")
      .select("id,detail_id,url,note,reliability,created_at")
      .eq("detail_id", id)
      .order("created_at", { ascending: false });

    if (e4) {
      setErr(e4.message);
      setLoading(false);
      return;
    }
    setSources((s ?? []) as SourceRow[]);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function togglePinHere() {
    if (!detail) return;

    const newPinned = !detail.pinned;

    setErr(null);

    const { error } = await supabase
      .from("details")
      .update({
        pinned: newPinned,
        pinned_at: newPinned ? new Date().toISOString() : null,
      })
      .eq("id", detail.id);

    if (error) {
      setErr(error.message);
      return;
    }

    await loadAll();
  }

  async function deleteIdea() {
    if (!detail) return;

    const ok = confirm(
      `Delete this idea?\n\n"${detail.title}"\n\nFootage and sources will be deleted too.`
    );
    if (!ok) return;

    setErr(null);
    setLoading(true);

    const { error } = await supabase.from("details").delete().eq("id", detail.id);

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function addFootage() {
    if (!detail) return;
    if (!fp.trim()) {
      setErr("Footage link/path is required.");
      return;
    }

    setSavingFootage(true);
    setErr(null);

    const { error } = await supabase.from("footage").insert({
      detail_id: detail.id,
      file_path: fp.trim(),
      start_ts: startTs.trim() || null,
      end_ts: endTs.trim() || null,
      label: fLabel.trim() || null,
      notes: fNotes.trim() || null,
    });

    setSavingFootage(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setFp("");
    setStartTs("");
    setEndTs("");
    setFLabel("");
    setFNotes("");
    await loadAll();
  }

  async function deleteFootage(footageId: number) {
    const ok = confirm("Delete this footage entry?");
    if (!ok) return;

    const { error } = await supabase.from("footage").delete().eq("id", footageId);
    if (error) {
      setErr(error.message);
      return;
    }
    await loadAll();
  }

  async function addSource() {
    if (!detail) return;
    if (!srcUrl.trim()) {
      setErr("Source URL is required.");
      return;
    }

    setSavingSource(true);
    setErr(null);

    const { error } = await supabase.from("sources").insert({
      detail_id: detail.id,
      url: srcUrl.trim(),
      note: srcNote.trim() || null,
      reliability: srcReliability,
    });

    setSavingSource(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setSrcUrl("");
    setSrcNote("");
    setSrcReliability(3);
    await loadAll();
  }

  async function deleteSource(sourceId: number) {
    const ok = confirm("Delete this source?");
    if (!ok) return;

    const { error } = await supabase.from("sources").delete().eq("id", sourceId);
    if (error) {
      setErr(error.message);
      return;
    }
    await loadAll();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Top actions */}
        <div className="flex items-center justify-between gap-4">
          <a href="/" className={ghostButtonClass}>
            Back
          </a>

          <div className="flex items-center gap-2">
            {detail && (
              <button
                type="button"
                onClick={togglePinHere}
                className={
                  "h-10 rounded-xl border px-4 text-sm font-semibold shadow-sm " +
                  (detail.pinned
                    ? "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-100")
                }
              >
                {detail.pinned ? "⭐ Pinned" : "☆ Pin"}
              </button>
            )}

            <button
              type="button"
              onClick={deleteIdea}
              className="h-10 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-900 shadow-sm hover:bg-rose-100"
            >
              Delete
            </button>

            <a href="/add" className={buttonClass}>
              + Add idea
            </a>
          </div>
        </div>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {loading ? (
            <p className="text-sm text-slate-600">Loading…</p>
          ) : err ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              {err}
            </div>
          ) : !detail ? (
            <p className="text-sm text-slate-600">Not found.</p>
          ) : (
            <>
              {/* Header */}
              <h1 className="text-2xl font-bold text-slate-900">{detail.title}</h1>

              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-800">
                  {game
                    ? `${game.title}${game.release_year ? ` (${game.release_year})` : ""}`
                    : "Game"}
                </span>

                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-800">
                  {typeLabel(detail.detail_type)}
                </span>

                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-800">
                  Priority: {priorityLabel(detail.priority)}
                </span>

                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-800">
                  Spoiler: {spoilerLabel(detail.spoiler_level)}
                </span>

                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-800">
                  Confidence: {confidenceLabel(detail.confidence)}
                </span>
              </div>

              {/* Description */}
              <div className="mt-5">
                <div className="text-sm font-semibold text-slate-800">Description</div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {detail.description?.trim() ? detail.description : "No description yet."}
                </p>
              </div>

              {/* FOOTAGE */}
              <div className="mt-7">
                <div className="text-base font-semibold text-slate-900">Footage</div>
                <p className="mt-1 text-sm text-slate-600">
                  Add multiple clips/links. Use timestamps like 00:01:23.
                </p>

                <div className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-slate-800">Link or file path</span>
                    <input
                      className={inputClass}
                      value={fp}
                      onChange={(e) => setFp(e.target.value)}
                      placeholder="https://drive... or D:\captures\gow.mp4"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-sm font-medium text-slate-800">Start</span>
                      <input
                        className={inputClass}
                        value={startTs}
                        onChange={(e) => setStartTs(e.target.value)}
                        placeholder="00:01:23"
                      />
                    </label>

                    <label className="grid gap-1">
                      <span className="text-sm font-medium text-slate-800">End</span>
                      <input
                        className={inputClass}
                        value={endTs}
                        onChange={(e) => setEndTs(e.target.value)}
                        placeholder="00:01:40"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-sm font-medium text-slate-800">Label</span>
                      <input
                        className={inputClass}
                        value={fLabel}
                        onChange={(e) => setFLabel(e.target.value)}
                        placeholder="thumbnail / best take / alt angle"
                      />
                    </label>

                    <label className="grid gap-1">
                      <span className="text-sm font-medium text-slate-800">Notes</span>
                      <input
                        className={inputClass}
                        value={fNotes}
                        onChange={(e) => setFNotes(e.target.value)}
                        placeholder="mission, conditions, save slot…"
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    className={buttonClass}
                    onClick={addFootage}
                    disabled={savingFootage}
                  >
                    {savingFootage ? "Saving…" : "Add footage"}
                  </button>
                </div>

                <div className="mt-4">
                  {footage.length === 0 ? (
                    <p className="text-sm text-slate-600">No footage yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {footage.map((f) => (
                        <li
                          key={f.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="break-words text-sm font-medium text-slate-900">
                                {f.file_path}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-700">
                                {(f.start_ts || f.end_ts) && (
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                                    {f.start_ts ?? "—"} → {f.end_ts ?? "—"}
                                  </span>
                                )}
                                {f.label && (
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                                    {f.label}
                                  </span>
                                )}
                              </div>

                              {f.notes && (
                                <div className="mt-2 text-sm text-slate-700">{f.notes}</div>
                              )}
                            </div>

                            <button
                              type="button"
                              className={ghostButtonClass}
                              onClick={() => deleteFootage(f.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* SOURCES */}
              <div className="mt-8">
                <div className="text-base font-semibold text-slate-900">Sources</div>
                <p className="mt-1 text-sm text-slate-600">
                  Reference links to verify the idea.
                </p>

                <div className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-slate-800">URL</span>
                    <input
                      className={inputClass}
                      value={srcUrl}
                      onChange={(e) => setSrcUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-slate-800">Note</span>
                    <input
                      className={inputClass}
                      value={srcNote}
                      onChange={(e) => setSrcNote(e.target.value)}
                      placeholder="What does this source prove?"
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-slate-800">Reliability</span>
                    <select
                      className={selectClass}
                      value={srcReliability}
                      onChange={(e) => setSrcReliability(Number(e.target.value))}
                    >
                      <option value={1}>1 – Low</option>
                      <option value={2}>2</option>
                      <option value={3}>3 – Medium</option>
                      <option value={4}>4</option>
                      <option value={5}>5 – Verified</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    className={buttonClass}
                    onClick={addSource}
                    disabled={savingSource}
                  >
                    {savingSource ? "Saving…" : "Add source"}
                  </button>
                </div>

                <div className="mt-4">
                  {sources.length === 0 ? (
                    <p className="text-sm text-slate-600">No sources yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {sources.map((s) => (
                        <li
                          key={s.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="break-words text-sm font-medium text-slate-900">
                                {s.url}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-700">
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                                  Reliability: {s.reliability}
                                </span>
                              </div>

                              {s.note && (
                                <div className="mt-2 text-sm text-slate-700">{s.note}</div>
                              )}
                            </div>

                            <button
                              type="button"
                              className={ghostButtonClass}
                              onClick={() => deleteSource(s.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
