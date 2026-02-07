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

/* ================= STYLES ================= */

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition";

const textareaClass =
  "min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition resize-y";

const selectClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition cursor-pointer";

const btnBase =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold whitespace-nowrap cursor-pointer transition active:scale-[0.98]";

const btnPrimary =
  btnBase + " bg-slate-900 text-white shadow-sm hover:bg-slate-800 disabled:opacity-70";

const btnGhost =
  btnBase + " border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900";

const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

/* ================= HELPERS ================= */

function PriorityBadge({ p }: { p: number }) {
  if (p === 1) return <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">High Priority</span>;
  if (p === 5) return <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">Low</span>;
  return <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">Normal</span>;
}

function TypeBadge({ t }: { t: string }) {
  const map: Record<string, string> = {
    small_detail: "Small Detail",
    easter_egg: "Easter Egg",
    npc_reaction: "NPC Reaction",
    physics: "Physics",
    troll: "Troll",
    punish: "Punish",
  };
  return <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700">{map[t] || t}</span>;
}

/* ================= COMPONENT: GROUP PICKER ================= */

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
        className="text-xs font-medium text-blue-600 hover:underline"
        onClick={() => setOpen((v) => !v)}
      >
        + Add Group
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="p-2">
            <input
              className={inputClass}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search groups..."
              autoFocus
            />
          </div>

          <div className="max-h-48 overflow-auto p-1 pt-0">
            {filtered.length === 0 ? (
              <div className="p-2 text-center">
                <button
                  type="button"
                  className="w-full rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-200"
                  onClick={() => {
                    const name = q.trim();
                    if (name) onCreate(name);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  + Create "{q}"
                </button>
              </div>
            ) : (
              <ul>
                {filtered.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100"
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
        </div>
      )}
    </div>
  );
}

/* ================= MAIN PAGE ================= */

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

  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [ideaGroups, setIdeaGroups] = useState<Group[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  /* Edit States */
  const [editingCore, setEditingCore] = useState(false);
  const [savingCore, setSavingCore] = useState(false);
  
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftType, setDraftType] = useState("small_detail");
  const [draftPriority, setDraftPriority] = useState(3);
  const [draftSpoiler, setDraftSpoiler] = useState(0);
  const [draftConfidence, setDraftConfidence] = useState(3);

  /* Footage/Source Forms */
  const [fp, setFp] = useState("");
  const [srcUrl, setSrcUrl] = useState("");
  const [savingItem, setSavingItem] = useState(false);

  /* ------------------------------------------------------------------ */
  /* TITLE & DATA LOADING LOGIC                     */
  /* ------------------------------------------------------------------ */

  // 1. Load Data
  async function loadGroups() {
    const { data } = await supabase.from("idea_groups").select("*").order("name");
    setAllGroups((data ?? []) as Group[]);
  }

  async function loadIdeaGroups(detailId: number) {
    const { data: links } = await supabase.from("idea_group_items").select("group_id").eq("detail_id", detailId);
    if (!links || links.length === 0) {
      setIdeaGroups([]);
      return;
    }
    const ids = links.map((x: any) => x.group_id);
    const { data: gs } = await supabase.from("idea_groups").select("*").in("id", ids).order("name");
    setIdeaGroups((gs ?? []) as Group[]);
  }

  async function loadAll() {
    setLoading(true);
    setErr(null);
    if (!Number.isFinite(id)) return;

    await loadGroups();

    const { data: d, error } = await supabase.from("details").select("*").eq("id", id).single();
    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }
    const detailRow = d as Detail;
    setDetail(detailRow);

    // Sync drafts
    setDraftTitle(detailRow.title);
    setDraftDesc(detailRow.description ?? "");
    setDraftType(detailRow.detail_type);
    setDraftPriority(detailRow.priority);
    setDraftSpoiler(detailRow.spoiler_level ?? 0);
    setDraftConfidence(detailRow.confidence ?? 3);

    // Load related
    const { data: g } = await supabase.from("games").select("*").eq("id", detailRow.game_id).single();
    setGame(g as Game);

    const { data: f } = await supabase.from("footage").select("*").eq("detail_id", id).order("created_at", { ascending: false });
    setFootage((f ?? []) as FootageRow[]);

    const { data: s } = await supabase.from("sources").select("*").eq("detail_id", id).order("created_at", { ascending: false });
    setSources((s ?? []) as SourceRow[]);

    await loadIdeaGroups(detailRow.id);
    setLoading(false);
  }

  // Effect để gọi hàm load
  useEffect(() => { loadAll(); }, [id]);

  // 2. CHANGE TAB TITLE (SỬA LỖI Ở ĐÂY)
  useEffect(() => {
    if (detail && detail.title) {
      // Đổi title khi có dữ liệu
      document.title = `${detail.title} | GameKB`;
    } else {
      // Title tạm thời khi đang loading
      document.title = "Loading Idea... | GameKB";
    }

    // (Cleanup) Trả về mặc định khi thoát trang
    return () => {
      document.title = "GameKB";
    };
  }, [detail]);

  /* ------------------------------------------------------------------ */
  /* ACTIONS                               */
  /* ------------------------------------------------------------------ */

  async function togglePin() {
    if (!detail) return;
    const newPinned = !detail.pinned;
    await supabase.from("details").update({ pinned: newPinned, pinned_at: newPinned ? new Date().toISOString() : null }).eq("id", detail.id);
    await loadAll();
  }

  async function deleteIdea() {
    if (!detail || !confirm("Delete this idea completely?")) return;
    await supabase.from("details").delete().eq("id", detail.id);
    router.push("/");
  }

  async function saveCore() {
    if (!detail) return;
    setSavingCore(true);
    const { error } = await supabase.from("details").update({
      title: draftTitle.trim(),
      description: draftDesc.trim(),
      detail_type: draftType,
      priority: draftPriority,
      spoiler_level: draftSpoiler,
      confidence: draftConfidence,
    }).eq("id", detail.id);
    setSavingCore(false);
    if (!error) {
      setEditingCore(false);
      await loadAll();
    }
  }

  async function addFootage() {
    if (!detail || !fp.trim()) return;
    setSavingItem(true);
    await supabase.from("footage").insert({ detail_id: detail.id, file_path: fp.trim() });
    setFp("");
    setSavingItem(false);
    await loadAll();
  }

  async function deleteFootage(fid: number) {
    if (!confirm("Remove this footage?")) return;
    await supabase.from("footage").delete().eq("id", fid);
    await loadAll();
  }

  async function addSource() {
    if (!detail || !srcUrl.trim()) return;
    setSavingItem(true);
    await supabase.from("sources").insert({ detail_id: detail.id, url: srcUrl.trim(), reliability: 3 });
    setSrcUrl("");
    setSavingItem(false);
    await loadAll();
  }

  async function deleteSource(sid: number) {
    if (!confirm("Remove this source?")) return;
    await supabase.from("sources").delete().eq("id", sid);
    await loadAll();
  }

  async function addToGroup(gid: number) {
    if (!detail) return;
    await supabase.from("idea_group_items").insert({ group_id: gid, detail_id: detail.id, position: 0 });
    await loadIdeaGroups(detail.id);
  }

  async function removeFromGroup(gid: number) {
    if (!detail) return;
    await supabase.from("idea_group_items").delete().eq("group_id", gid).eq("detail_id", detail.id);
    await loadIdeaGroups(detail.id);
  }

  async function createGroup(name: string) {
    const { data } = await supabase.from("idea_groups").insert({ name }).select().single();
    if (data) {
      await loadGroups();
      await addToGroup(data.id);
    }
  }

  // 3. CONDITIONAL RENDER (Phải đặt SAU tất cả useEffect)
  if (loading) return <div className="p-8 text-center text-slate-500">Loading details...</div>;
  if (!detail) return <div className="p-8 text-center text-slate-500">Idea not found.</div>;

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <div className="mx-auto max-w-6xl px-4 py-8">
        
        {/* HEADER */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a href="/" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm hover:text-slate-900">
              ←
            </a>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-slate-500">{game?.title} /</span>
              <span className="text-sm font-bold text-slate-900">Idea #{detail.id}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!editingCore && (
              <>
                 <button
                  onClick={togglePin}
                  className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold shadow-sm transition ${
                    detail.pinned
                      ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {detail.pinned ? "⭐ Pinned" : "☆ Pin"}
                </button>
                <button onClick={() => setEditingCore(true)} className={btnGhost}>
                  ✏️ Edit
                </button>
                <button onClick={deleteIdea} className="inline-flex h-9 items-center justify-center rounded-lg border border-transparent px-3 text-sm font-medium text-rose-600 hover:bg-rose-50">
                  Delete
                </button>
              </>
            )}
             {editingCore && (
               <>
                <button onClick={saveCore} disabled={savingCore} className={btnPrimary}>
                  {savingCore ? "Saving..." : "Save Changes"}
                </button>
                <button onClick={() => setEditingCore(false)} className={btnGhost}>
                  Cancel
                </button>
               </>
             )}
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* LEFT COLUMN: CONTENT */}
          <div className="space-y-6 lg:col-span-2">
            
            {/* CORE CARD */}
            <div className={cardClass}>
              {editingCore ? (
                <div className="space-y-4">
                  <label className="block">
                     <span className="mb-1 block text-xs font-bold uppercase text-slate-400">Title</span>
                     <input className={inputClass} value={draftTitle} onChange={e => setDraftTitle(e.target.value)} />
                  </label>
                  <label className="block">
                     <span className="mb-1 block text-xs font-bold uppercase text-slate-400">Description</span>
                     <textarea className={textareaClass} value={draftDesc} onChange={e => setDraftDesc(e.target.value)} />
                  </label>
                </div>
              ) : (
                <div>
                  <h1 className="mb-4 text-2xl font-bold leading-tight text-slate-900">{detail.title}</h1>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {detail.description || <span className="italic text-slate-400">No description provided.</span>}
                  </div>
                </div>
              )}
            </div>

            {/* FOOTAGE CARD */}
            <div className={cardClass}>
              <h3 className="mb-3 text-base font-bold text-slate-900">🎬 Footage</h3>
              
              <div className="mb-4 flex gap-2">
                <input 
                  className={inputClass} 
                  placeholder="Paste file path or link..." 
                  value={fp} 
                  onChange={e => setFp(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addFootage()}
                />
                <button onClick={addFootage} disabled={savingItem} className={btnGhost}>+</button>
              </div>

              {footage.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No footage added.</p>
              ) : (
                <ul className="space-y-2">
                  {footage.map(f => (
                    <li key={f.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                          ▶
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900">{f.file_path}</div>
                          {f.notes && <div className="truncate text-xs text-slate-500">{f.notes}</div>}
                        </div>
                      </div>
                      <button onClick={() => deleteFootage(f.id)} className="text-slate-400 hover:text-rose-600">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* SOURCES CARD */}
            <div className={cardClass}>
              <h3 className="mb-3 text-base font-bold text-slate-900">🔗 Sources</h3>
              
              <div className="mb-4 flex gap-2">
                <input 
                  className={inputClass} 
                  placeholder="Paste source URL..." 
                  value={srcUrl} 
                  onChange={e => setSrcUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSource()}
                />
                <button onClick={addSource} disabled={savingItem} className={btnGhost}>+</button>
              </div>

              {sources.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No sources added.</p>
              ) : (
                <ul className="space-y-2">
                  {sources.map(s => (
                    <li key={s.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                          🌍
                        </span>
                        <div className="min-w-0">
                          <a href={s.url} target="_blank" className="truncate font-medium text-blue-700 hover:underline">{s.url}</a>
                          <div className="flex gap-2 text-xs text-slate-500">
                             <span>Reliability: {s.reliability}/5</span>
                             {s.note && <span>• {s.note}</span>}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => deleteSource(s.id)} className="text-slate-400 hover:text-rose-600">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: META & SIDEBAR */}
          <div className="space-y-6 lg:col-span-1">
            
            {/* META INFO */}
            <div className={cardClass}>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Properties</h3>
              
              {editingCore ? (
                <div className="space-y-3">
                   <label className="block">
                     <span className="text-xs font-semibold text-slate-700">Type</span>
                     <select className={selectClass} value={draftType} onChange={e => setDraftType(e.target.value)}>
                       <option value="small_detail">Small detail</option>
                       <option value="easter_egg">Easter egg</option>
                       <option value="npc_reaction">NPC reaction</option>
                       <option value="physics">Physics</option>
                       <option value="troll">Troll</option>
                       <option value="punish">Punish</option>
                     </select>
                   </label>
                   <label className="block">
                     <span className="text-xs font-semibold text-slate-700">Priority</span>
                     <select className={selectClass} value={draftPriority} onChange={e => setDraftPriority(Number(e.target.value))}>
                       <option value={1}>High</option>
                       <option value={3}>Normal</option>
                       <option value={5}>Low</option>
                     </select>
                   </label>
                   <label className="block">
                     <span className="text-xs font-semibold text-slate-700">Confidence</span>
                     <select className={selectClass} value={draftConfidence} onChange={e => setDraftConfidence(Number(e.target.value))}>
                       <option value={1}>Low</option>
                       <option value={3}>Medium</option>
                       <option value={5}>Verified</option>
                     </select>
                   </label>
                   <label className="block">
                     <span className="text-xs font-semibold text-slate-700">Spoiler</span>
                     <select className={selectClass} value={draftSpoiler} onChange={e => setDraftSpoiler(Number(e.target.value))}>
                       <option value={0}>None</option>
                       <option value={1}>Mild</option>
                       <option value={2}>Story</option>
                       <option value={3}>Ending</option>
                     </select>
                   </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 text-xs text-slate-500">Game</div>
                    <div className="font-semibold text-slate-900">{game?.title || "Unknown"}</div>
                  </div>
                  
                  <div className="flex justify-between border-t border-slate-100 pt-3">
                    <div>
                      <div className="mb-1 text-xs text-slate-500">Type</div>
                      <TypeBadge t={detail.detail_type} />
                    </div>
                    <div className="text-right">
                      <div className="mb-1 text-xs text-slate-500">Priority</div>
                      <PriorityBadge p={detail.priority} />
                    </div>
                  </div>

                  <div className="flex justify-between border-t border-slate-100 pt-3">
                    <div>
                      <div className="mb-1 text-xs text-slate-500">Confidence</div>
                      <span className="text-sm font-medium text-slate-900">{detail.confidence}/5</span>
                    </div>
                    <div className="text-right">
                      <div className="mb-1 text-xs text-slate-500">Spoiler</div>
                      <span className={`text-sm font-medium ${detail.spoiler_level ? "text-amber-600" : "text-slate-900"}`}>
                        {detail.spoiler_level === 0 ? "None" : `Level ${detail.spoiler_level}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* GROUPS */}
            <div className={cardClass}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Groups</h3>
                <GroupAddPicker 
                  groups={allGroups} 
                  onAdd={addToGroup} 
                  onCreate={createGroup}
                />
              </div>

              {ideaGroups.length === 0 ? (
                <p className="text-sm text-slate-400">Not in any group.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {ideaGroups.map(g => (
                    <span key={g.id} className="inline-flex items-center gap-1 rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      {g.name}
                      <button onClick={() => removeFromGroup(g.id)} className="ml-1 text-blue-400 hover:text-blue-900">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* TIMESTAMPS */}
            <div className="rounded-xl border border-transparent px-4 text-xs text-slate-400">
              <p>Created: {new Date(detail.created_at || "").toLocaleDateString()}</p>
              {detail.pinned_at && <p>Pinned: {new Date(detail.pinned_at).toLocaleDateString()}</p>}
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}