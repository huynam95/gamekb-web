"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* ================= TYPES ================= */

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

type Group = {
  id: number;
  name: string;
  description: string | null;
};

type IdeaGroupItem = {
  group_id: number;
  detail_id: number;
  position: number;
};

/* ================= UI CLASSES ================= */

const inputClass =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400";
const selectClass =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400";
const textareaClass =
  "min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400";

/* ================= HELPERS ================= */

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

/* ================= GROUP PICKER ================= */

function GroupAddPicker({
  groups,
  onAdd,
  onCreate,
}: {
  groups: Group[];
  onAdd: (groupId: number) => void;
  onCreate: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return groups.slice(0, 50);
    return groups.filter((g) => g.name.toLowerCase().includes(s)).slice(0, 50);
  }, [groups, q]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        className={ghostButtonClass}
        onClick={() => setOpen((v) => !v)}
      >
        + Add to group
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-[420px] max-w-[90vw] rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="p-2">
            <input
              className={inputClass}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search groups…"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-auto p-2 pt-0">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">No matches</div>
                <div className="mt-1 text-xs text-slate-600">
                  Create a new group with this name.
                </div>

                <button
                  type="button"
                  className="mt-3 h-10 w-full rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                  onClick={() => {
                    const name = q.trim();
                    if (name) onCreate(name);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  + Create group
                </button>
              </div>
            ) : (
              <ul className="space-y-1">
                {filtered.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100"
                      onClick={() => {
                        onAdd(g.id);
                        setOpen(false);
                        setQ("");
                      }}
                    >
                      {g.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-200 p-2 text-xs text-slate-500">
            Showing up to 50
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= PAGE ================= */

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

  // Groups
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [ideaGroups, setIdeaGroups] = useState<Group[]>([]);
  const [savingGroup, setSavingGroup] = useState(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  /* -------- Core edit -------- */
  const [editingCore, setEditingCore] = useState(false);
  const [savingCore, setSavingCore] = useState(false);

  const [draftTitle, setDraftTitle] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftType, setDraftType] = useState("small_detail");
  const [draftPriority, setDraftPriority] = useState(3);
  const [draftSpoiler, setDraftSpoiler] = useState(0);
  const [draftConfidence, setDraftConfidence] = useState(3);

  /* -------- Add footage form -------- */
  const [fp, setFp] = useState("");
  const [startTs, setStartTs] = useState("");
  const [endTs, setEndTs] = useState("");
  const [fLabel, setFLabel] = useState("");
  const [fNotes, setFNotes] = useState("");
  const [savingFootage, setSavingFootage] = useState(false);

  /* -------- Add source form -------- */
  const [srcUrl, setSrcUrl] = useState("");
  const [srcNote, setSrcNote] = useState("");
  const [srcReliability, setSrcReliability] = useState(3);
  const [savingSource, setSavingSource] = useState(false);

  /* -------- Row editing (footage/sources) -------- */
  const [editingFootageId, setEditingFootageId] = useState<number | null>(null);
  const [savingFootageEdit, setSavingFootageEdit] = useState(false);
  const [fEdit, setFEdit] = useState<{
    file_path: string;
    start_ts: string;
    end_ts: string;
    label: string;
    notes: string;
  }>({ file_path: "", start_ts: "", end_ts: "", label: "", notes: "" });

  const [editingSourceId, setEditingSourceId] = useState<number | null>(null);
  const [savingSourceEdit, setSavingSourceEdit] = useState(false);
  const [sEdit, setSEdit] = useState<{ url: string; note: string; reliability: number }>({
    url: "",
    note: "",
    reliability: 3,
  });

  async function loadGroups() {
    const { data, error } = await supabase
      .from("idea_groups")
      .select("id,name,description,created_at")
      .order("name");

    if (error) {
      setErr(error.message);
      return;
    }
    setAllGroups((data ?? []) as Group[]);
  }

  async function loadIdeaGroups(detailId: number) {
    const { data: links, error: e1 } = await supabase
      .from("idea_group_items")
      .select("group_id,detail_id,position")
      .eq("detail_id", detailId);

    if (e1) {
      setErr(e1.message);
      setIdeaGroups([]);
      return;
    }

    const groupIds = (links ?? []).map((x: any) => Number(x.group_id));
    if (groupIds.length === 0) {
      setIdeaGroups([]);
      return;
    }

    const { data: gs, error: e2 } = await supabase
      .from("idea_groups")
      .select("id,name,description")
      .in("id", groupIds)
      .order("name");

    if (e2) {
      setErr(e2.message);
      setIdeaGroups([]);
      return;
    }

    setIdeaGroups((gs ?? []) as Group[]);
  }

  async function loadAll() {
    setLoading(true);
    setErr(null);

    if (!Number.isFinite(id)) {
      setErr("Invalid id");
      setLoading(false);
      return;
    }

    await loadGroups();

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

    // sync core drafts
    setDraftTitle(detailRow.title);
    setDraftDesc(detailRow.description ?? "");
    setDraftType(detailRow.detail_type);
    setDraftPriority(detailRow.priority);
    setDraftSpoiler(detailRow.spoiler_level ?? 0);
    setDraftConfidence(detailRow.confidence ?? 3);

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

    await loadIdeaGroups(detailRow.id);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ================= Core actions ================= */

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
      `Delete this idea?\n\n"${detail.title}"\n\nFootage, sources, and group links will be deleted too.`
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

  async function saveCore() {
    if (!detail) return;

    if (!draftTitle.trim()) {
      setErr("Title cannot be empty.");
      return;
    }
    if (!draftDesc.trim()) {
      setErr("Description cannot be empty.");
      return;
    }

    setSavingCore(true);
    setErr(null);

    const { error } = await supabase
      .from("details")
      .update({
        title: draftTitle.trim(),
        description: draftDesc.trim(),
        detail_type: draftType,
        priority: draftPriority,
        spoiler_level: draftSpoiler,
        confidence: draftConfidence,
      })
      .eq("id", detail.id);

    setSavingCore(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setEditingCore(false);
    await loadAll();
  }

  function cancelCore() {
    if (!detail) return;
    setEditingCore(false);
    setDraftTitle(detail.title);
    setDraftDesc(detail.description ?? "");
    setDraftType(detail.detail_type);
    setDraftPriority(detail.priority);
    setDraftSpoiler(detail.spoiler_level ?? 0);
    setDraftConfidence(detail.confidence ?? 3);
  }

  /* ================= Group actions ================= */

  async function addToGroup(groupId: number) {
    if (!detail) return;

    // avoid duplicates: try insert, ignore if already exists (PK will block)
    setSavingGroup(true);
    setErr(null);

    const { error } = await supabase.from("idea_group_items").insert({
      group_id: groupId,
      detail_id: detail.id,
      position: 0,
    } satisfies IdeaGroupItem);

    setSavingGroup(false);

    if (error) {
      // If it's duplicate key, ignore; else show error
      const msg = error.message.toLowerCase();
      if (!msg.includes("duplicate") && !msg.includes("already exists")) {
        setErr(error.message);
        return;
      }
    }

    await loadIdeaGroups(detail.id);
  }

  async function removeFromGroup(groupId: number) {
    if (!detail) return;

    const ok = confirm("Remove this idea from the group?");
    if (!ok) return;

    setSavingGroup(true);
    setErr(null);

    const { error } = await supabase
      .from("idea_group_items")
      .delete()
      .eq("group_id", groupId)
      .eq("detail_id", detail.id);

    setSavingGroup(false);

    if (error) {
      setErr(error.message);
      return;
    }

    await loadIdeaGroups(detail.id);
  }

  async function createGroupHere(name: string) {
    if (!detail) return;

    const groupName = name.trim();
    if (!groupName) return;

    setSavingGroup(true);
    setErr(null);

    const { data, error } = await supabase
      .from("idea_groups")
      .insert({ name: groupName })
      .select("id,name,description")
      .single();

    if (error) {
      setSavingGroup(false);
      setErr(error.message);
      return;
    }

    // refresh list + auto add
    await loadGroups();
    const newId = data?.id as number;
    await addToGroup(newId);
    setSavingGroup(false);
  }

  /* ================= Footage actions (optional fields) ================= */

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

  function startEditFootage(row: FootageRow) {
    setEditingFootageId(row.id);
    setFEdit({
      file_path: row.file_path ?? "",
      start_ts: row.start_ts ?? "",
      end_ts: row.end_ts ?? "",
      label: row.label ?? "",
      notes: row.notes ?? "",
    });
  }

  function cancelEditFootage() {
    setEditingFootageId(null);
    setFEdit({ file_path: "", start_ts: "", end_ts: "", label: "", notes: "" });
  }

  async function saveEditFootage() {
    if (!editingFootageId) return;

    if (!fEdit.file_path.trim()) {
      setErr("Footage link/path is required.");
      return;
    }

    setSavingFootageEdit(true);
    setErr(null);

    const { error } = await supabase
      .from("footage")
      .update({
        file_path: fEdit.file_path.trim(),
        start_ts: fEdit.start_ts.trim() || null,
        end_ts: fEdit.end_ts.trim() || null,
        label: fEdit.label.trim() || null,
        notes: fEdit.notes.trim() || null,
      })
      .eq("id", editingFootageId);

    setSavingFootageEdit(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setEditingFootageId(null);
    await loadAll();
  }

  /* ================= Source actions (optional note) ================= */

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

  function startEditSource(row: SourceRow) {
    setEditingSourceId(row.id);
    setSEdit({
      url: row.url ?? "",
      note: row.note ?? "",
      reliability: row.reliability ?? 3,
    });
  }

  function cancelEditSource() {
    setEditingSourceId(null);
    setSEdit({ url: "", note: "", reliability: 3 });
  }

  async function saveEditSource() {
    if (!editingSourceId) return;

    if (!sEdit.url.trim()) {
      setErr("Source URL is required.");
      return;
    }

    setSavingSourceEdit(true);
    setErr(null);

    const { error } = await supabase
      .from("sources")
      .update({
        url: sEdit.url.trim(),
        note: sEdit.note.trim() || null,
        reliability: sEdit.reliability,
      })
      .eq("id", editingSourceId);

    setSavingSourceEdit(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setEditingSourceId(null);
    await loadAll();
  }

  /* ================= RENDER ================= */

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
              {/* CORE HEADER */}
              <div className="flex items-start justify-between gap-3">
                {editingCore ? (
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-2xl font-bold text-slate-900 outline-none focus:border-slate-400"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-slate-900">{detail.title}</h1>
                )}

                {!editingCore ? (
                  <button
                    type="button"
                    className={ghostButtonClass}
                    onClick={() => setEditingCore(true)}
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={saveCore}
                      disabled={savingCore}
                    >
                      {savingCore ? "Saving…" : "Save"}
                    </button>
                    <button type="button" className={ghostButtonClass} onClick={cancelCore}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* META */}
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-800">
                  {game ? `${game.title}${game.release_year ? ` (${game.release_year})` : ""}` : "Game"}
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

              {/* GROUPS */}
              <div className="mt-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-slate-900">Groups</div>
                    <div className="text-sm text-slate-600">
                      Add or remove this idea from video topic groups.
                    </div>
                  </div>

                  <GroupAddPicker
                    groups={allGroups}
                    onAdd={(gid) => addToGroup(gid)}
                    onCreate={(name) => createGroupHere(name)}
                  />
                </div>

                {savingGroup && (
                  <div className="mt-2 text-sm text-slate-600">Updating groups…</div>
                )}

                {ideaGroups.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">No groups yet.</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ideaGroups.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-800"
                      >
                        <span>{g.name}</span>
                        <button
                          type="button"
                          className="text-slate-500 hover:text-slate-900"
                          title="Remove from group"
                          onClick={() => removeFromGroup(g.id)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CORE EDIT FIELDS */}
              <div className="mt-6 grid gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-800">Description</div>
                  {editingCore ? (
                    <textarea
                      className={textareaClass}
                      value={draftDesc}
                      onChange={(e) => setDraftDesc(e.target.value)}
                      placeholder="Write the full description…"
                    />
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                      {detail.description?.trim() ? detail.description : "No description yet."}
                    </p>
                  )}
                </div>

                {editingCore && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-sm font-medium text-slate-800">Type</span>
                      <select className={selectClass} value={draftType} onChange={(e) => setDraftType(e.target.value)}>
                        <option value="small_detail">Small detail</option>
                        <option value="easter_egg">Easter egg</option>
                        <option value="npc_reaction">NPC reaction</option>
                        <option value="physics">Physics</option>
                        <option value="troll">Troll</option>
                        <option value="punish">Punish</option>
                      </select>
                    </label>

                    <label className="grid gap-1">
                      <span className="text-sm font-medium text-slate-800">Priority</span>
                      <select className={selectClass} value={draftPriority} onChange={(e) => setDraftPriority(Number(e.target.value))}>
                        <option value={1}>High</option>
                        <option value={3}>Normal</option>
                        <option value={5}>Low</option>
                      </select>
                    </label>

                    <label className="grid gap-1">
                      <span className="text-sm font-medium text-slate-800">Spoiler</span>
                      <select className={selectClass} value={draftSpoiler} onChange={(e) => setDraftSpoiler(Number(e.target.value))}>
                        <option value={0}>0 – None</option>
                        <option value={1}>1 – Mild</option>
                        <option value={2}>2 – Story</option>
                        <option value={3}>3 – Ending</option>
                      </select>
                    </label>

                    <label className="grid gap-1">
                      <span className="text-sm font-medium text-slate-800">Confidence</span>
                      <select className={selectClass} value={draftConfidence} onChange={(e) => setDraftConfidence(Number(e.target.value))}>
                        <option value={1}>1 – Low</option>
                        <option value={2}>2</option>
                        <option value={3}>3 – Medium</option>
                        <option value={4}>4</option>
                        <option value={5}>5 – Verified</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>

              {/* FOOTAGE */}
              <div className="mt-10">
                <div className="text-base font-semibold text-slate-900">Footage</div>
                <p className="mt-1 text-sm text-slate-600">
                  Link/path required. Start/end/label/notes optional.
                </p>

                <div className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-slate-800">Link or file path *</span>
                    <input className={inputClass} value={fp} onChange={(e) => setFp(e.target.value)} />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-sm font-medium text-slate-800">Start</span>
                      <input className={inputClass} value={startTs} onChange={(e) => setStartTs(e.target.value)} placeholder="00:01:23" />
                    </label>

                    <label className="grid gap-1">
                      <span className="text-sm font-medium text-slate-800">End</span>
                      <input className={inputClass} value={endTs} onChange={(e) => setEndTs(e.target.value)} placeholder="00:01:40" />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-sm font-medium text-slate-800">Label</span>
                      <input className={inputClass} value={fLabel} onChange={(e) => setFLabel(e.target.value)} />
                    </label>

                    <label className="grid gap-1">
                      <span className="text-sm font-medium text-slate-800">Notes</span>
                      <input className={inputClass} value={fNotes} onChange={(e) => setFNotes(e.target.value)} />
                    </label>
                  </div>

                  <button type="button" className={buttonClass} onClick={addFootage} disabled={savingFootage}>
                    {savingFootage ? "Saving…" : "Add footage"}
                  </button>
                </div>

                <div className="mt-4">
                  {footage.length === 0 ? (
                    <p className="text-sm text-slate-600">No footage yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {footage.map((f) => (
                        <li key={f.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                          {editingFootageId === f.id ? (
                            <div className="grid gap-3">
                              <label className="grid gap-1">
                                <span className="text-sm font-medium text-slate-800">Link/path *</span>
                                <input
                                  className={inputClass}
                                  value={fEdit.file_path}
                                  onChange={(e) => setFEdit((p) => ({ ...p, file_path: e.target.value }))}
                                />
                              </label>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="grid gap-1">
                                  <span className="text-sm font-medium text-slate-800">Start</span>
                                  <input
                                    className={inputClass}
                                    value={fEdit.start_ts}
                                    onChange={(e) => setFEdit((p) => ({ ...p, start_ts: e.target.value }))}
                                  />
                                </label>
                                <label className="grid gap-1">
                                  <span className="text-sm font-medium text-slate-800">End</span>
                                  <input
                                    className={inputClass}
                                    value={fEdit.end_ts}
                                    onChange={(e) => setFEdit((p) => ({ ...p, end_ts: e.target.value }))}
                                  />
                                </label>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="grid gap-1">
                                  <span className="text-sm font-medium text-slate-800">Label</span>
                                  <input
                                    className={inputClass}
                                    value={fEdit.label}
                                    onChange={(e) => setFEdit((p) => ({ ...p, label: e.target.value }))}
                                  />
                                </label>
                                <label className="grid gap-1">
                                  <span className="text-sm font-medium text-slate-800">Notes</span>
                                  <input
                                    className={inputClass}
                                    value={fEdit.notes}
                                    onChange={(e) => setFEdit((p) => ({ ...p, notes: e.target.value }))}
                                  />
                                </label>
                              </div>

                              <div className="flex items-center gap-2">
                                <button type="button" className={buttonClass} onClick={saveEditFootage} disabled={savingFootageEdit}>
                                  {savingFootageEdit ? "Saving…" : "Save"}
                                </button>
                                <button type="button" className={ghostButtonClass} onClick={cancelEditFootage}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="break-words text-sm font-medium text-slate-900">{f.file_path}</div>
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
                                {f.notes && <div className="mt-2 text-sm text-slate-700">{f.notes}</div>}
                              </div>

                              <div className="flex items-center gap-2">
                                <button type="button" className={ghostButtonClass} onClick={() => startEditFootage(f)}>
                                  Edit
                                </button>
                                <button type="button" className={ghostButtonClass} onClick={() => deleteFootage(f.id)}>
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* SOURCES */}
              <div className="mt-10">
                <div className="text-base font-semibold text-slate-900">Sources</div>
                <p className="mt-1 text-sm text-slate-600">
                  URL required. Note optional.
                </p>

                <div className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-slate-800">URL *</span>
                    <input className={inputClass} value={srcUrl} onChange={(e) => setSrcUrl(e.target.value)} placeholder="https://..." />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-slate-800">Note</span>
                    <input className={inputClass} value={srcNote} onChange={(e) => setSrcNote(e.target.value)} placeholder="What does it prove?" />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-slate-800">Reliability</span>
                    <select className={selectClass} value={srcReliability} onChange={(e) => setSrcReliability(Number(e.target.value))}>
                      <option value={1}>1 – Low</option>
                      <option value={2}>2</option>
                      <option value={3}>3 – Medium</option>
                      <option value={4}>4</option>
                      <option value={5}>5 – Verified</option>
                    </select>
                  </label>

                  <button type="button" className={buttonClass} onClick={addSource} disabled={savingSource}>
                    {savingSource ? "Saving…" : "Add source"}
                  </button>
                </div>

                <div className="mt-4">
                  {sources.length === 0 ? (
                    <p className="text-sm text-slate-600">No sources yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {sources.map((s) => (
                        <li key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                          {editingSourceId === s.id ? (
                            <div className="grid gap-3">
                              <label className="grid gap-1">
                                <span className="text-sm font-medium text-slate-800">URL *</span>
                                <input
                                  className={inputClass}
                                  value={sEdit.url}
                                  onChange={(e) => setSEdit((p) => ({ ...p, url: e.target.value }))}
                                />
                              </label>

                              <label className="grid gap-1">
                                <span className="text-sm font-medium text-slate-800">Note</span>
                                <input
                                  className={inputClass}
                                  value={sEdit.note}
                                  onChange={(e) => setSEdit((p) => ({ ...p, note: e.target.value }))}
                                />
                              </label>

                              <label className="grid gap-1">
                                <span className="text-sm font-medium text-slate-800">Reliability</span>
                                <select
                                  className={selectClass}
                                  value={sEdit.reliability}
                                  onChange={(e) => setSEdit((p) => ({ ...p, reliability: Number(e.target.value) }))}
                                >
                                  <option value={1}>1 – Low</option>
                                  <option value={2}>2</option>
                                  <option value={3}>3 – Medium</option>
                                  <option value={4}>4</option>
                                  <option value={5}>5 – Verified</option>
                                </select>
                              </label>

                              <div className="flex items-center gap-2">
                                <button type="button" className={buttonClass} onClick={saveEditSource} disabled={savingSourceEdit}>
                                  {savingSourceEdit ? "Saving…" : "Save"}
                                </button>
                                <button type="button" className={ghostButtonClass} onClick={cancelEditSource}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="break-words text-sm font-medium text-slate-900">{s.url}</div>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-700">
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                                    Reliability: {s.reliability}
                                  </span>
                                </div>
                                {s.note && <div className="mt-2 text-sm text-slate-700">{s.note}</div>}
                              </div>

                              <div className="flex items-center gap-2">
                                <button type="button" className={ghostButtonClass} onClick={() => startEditSource(s)}>
                                  Edit
                                </button>
                                <button type="button" className={ghostButtonClass} onClick={() => deleteSource(s.id)}>
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
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
