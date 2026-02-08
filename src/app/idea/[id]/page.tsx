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
  cover_url?: string | null;
};

type FootageRow = {
  id: number;
  detail_id: number;
  file_path: string | null;
  title: string | null;
  downloaded: boolean;
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

// Input trong suốt dành cho Hero Header
const heroInputClass = 
  "w-full bg-transparent text-3xl font-extrabold text-white placeholder:text-white/50 border-b-2 border-white/20 px-0 py-2 focus:border-white focus:outline-none transition";

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

// Nút kính mờ (Glass Button)
const btnGlass = 
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-white/20 bg-black/20 px-4 text-sm font-semibold text-white backdrop-blur-md hover:bg-black/40 transition";

const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

/* ================= HELPERS ================= */

async function fetchYoutubeTitle(url: string): Promise<string | null> {
  try {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    if (!youtubeRegex.test(url)) return null;
    const res = await fetch(`https://noembed.com/embed?url=${url}`);
    const data = await res.json();
    return data.title || null;
  } catch (e) {
    return null;
  }
}

function renderLinkOrText(text: string | null) {
  if (!text) return null;
  const isUrl = text.startsWith("http://") || text.startsWith("https://");

  if (isUrl) {
    return (
      <a 
        href={text} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="break-all text-blue-600 hover:text-blue-800 hover:underline"
        onClick={(e) => e.stopPropagation()} 
      >
        {text}
      </a>
    );
  }
  return <span className="break-all font-mono text-slate-600">{text}</span>;
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
  return <span className="inline-flex items-center rounded-md border border-white/20 bg-white/10 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-md">{map[t] || t}</span>;
}

function PriorityBadge({ p }: { p: number }) {
  let color = "text-white bg-white/10 border-white/20";
  let label = "Normal";
  if (p === 1) { label = "🔥 High"; color = "text-white bg-rose-500/80 border-rose-400/50"; }
  if (p === 5) { label = "Low"; }

  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium backdrop-blur-md ${color}`}>{label}</span>;
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
                    if (q.trim()) onCreate(q.trim());
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
  const id = useMemo(() => Number(rawId), [rawId]);

  const [detail, setDetail] = useState<Detail | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [footage, setFootage] = useState<FootageRow[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);

  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [ideaGroups, setIdeaGroups] = useState<Group[]>([]);
  
  const [loading, setLoading] = useState(true);

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
  const [fetchingTitle, setFetchingTitle] = useState(false);

  // Load Data
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
    if (!Number.isFinite(id)) return;

    await loadGroups();

    const { data: d, error } = await supabase.from("details").select("*").eq("id", id).single();
    if (error) { setLoading(false); return; }
    const detailRow = d as Detail;
    setDetail(detailRow);

    setDraftTitle(detailRow.title);
    setDraftDesc(detailRow.description ?? "");
    setDraftType(detailRow.detail_type);
    setDraftPriority(detailRow.priority);
    setDraftSpoiler(detailRow.spoiler_level ?? 0);
    setDraftConfidence(detailRow.confidence ?? 3);

    const { data: g } = await supabase.from("games").select("*").eq("id", detailRow.game_id).single();
    setGame(g as Game);

    const { data: f } = await supabase.from("footage").select("*").eq("detail_id", id).order("created_at", { ascending: false });
    setFootage((f ?? []) as FootageRow[]);

    const { data: s } = await supabase.from("sources").select("*").eq("detail_id", id).order("created_at", { ascending: false });
    setSources((s ?? []) as SourceRow[]);

    await loadIdeaGroups(detailRow.id);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, [id]);

  useEffect(() => {
    if (detail && detail.title) document.title = `${detail.title} | GameKB`;
  }, [detail]);

  // Actions
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
    setFetchingTitle(true);
    const link = fp.trim();
    const ytTitle = await fetchYoutubeTitle(link);
    const isLocalFile = !link.startsWith("http");

    await supabase.from("footage").insert({ 
      detail_id: detail.id, 
      file_path: link,
      title: ytTitle || null,
      downloaded: isLocalFile
    });
    setFp("");
    setFetchingTitle(false);
    await loadAll();
  }

  async function toggleDownloaded(fid: number, currentStatus: boolean) {
    setFootage(prev => prev.map(f => f.id === fid ? { ...f, downloaded: !currentStatus } : f));
    await supabase.from("footage").update({ downloaded: !currentStatus }).eq("id", fid);
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

  if (loading) return <div className="p-8 text-center text-slate-500">Loading details...</div>;
  if (!detail) return <div className="p-8 text-center text-slate-500">Idea not found.</div>;

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      
      {/* ================= HERO HEADER ================= */}
      <div className="relative h-[400px] w-full overflow-hidden bg-slate-900 shadow-xl">
         
         {/* Background Layer */}
         {game?.cover_url ? (
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-60 blur-sm"
              style={{ backgroundImage: `url(${game.cover_url})` }}
            />
         ) : (
            // Fallback pattern
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30" />
         )}

         {/* Gradient Overlay (Để text nổi) */}
         <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-900/60 to-slate-900/80" />

         {/* Navigation Top */}
         <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-20">
            <a href="/" className={btnGlass}>← Back to Home</a>
            
            {/* Actions Top Right */}
            <div className="flex gap-2">
              {!editingCore && (
                <>
                  <button onClick={togglePin} className={btnGlass}>
                    {detail.pinned ? "⭐ Unpin" : "☆ Pin"}
                  </button>
                  <button onClick={() => setEditingCore(true)} className={btnGlass}>
                    ✏️ Edit
                  </button>
                  <button onClick={deleteIdea} className="inline-flex h-9 items-center justify-center rounded-lg bg-rose-500/80 backdrop-blur-md px-4 text-sm font-semibold text-white hover:bg-rose-600 transition">
                    Delete
                  </button>
                </>
              )}
              {editingCore && (
                <>
                  <button onClick={saveCore} disabled={savingCore} className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-bold text-white shadow-lg hover:bg-emerald-600">
                    {savingCore ? "Saving..." : "Save Changes"}
                  </button>
                  <button onClick={() => setEditingCore(false)} className={btnGlass}>
                    Cancel
                  </button>
                </>
              )}
            </div>
         </div>

         {/* Hero Content (Bottom) */}
         <div className="absolute bottom-0 w-full p-8 pb-12 z-10 max-w-6xl mx-auto left-0 right-0">
            <div className="flex items-center gap-3 mb-2">
               <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md">
                 🎮 {game?.title}
               </span>
               <span className="text-white/60 text-xs font-mono uppercase tracking-widest">
                 #{detail.id}
               </span>
            </div>

            {editingCore ? (
               <input 
                 className={heroInputClass} 
                 value={draftTitle} 
                 onChange={e => setDraftTitle(e.target.value)} 
                 autoFocus
               />
            ) : (
               <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-md leading-tight max-w-4xl">
                 {detail.title}
               </h1>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
               <TypeBadge t={detail.detail_type} />
               <PriorityBadge p={detail.priority} />
               {detail.pinned && <span className="text-amber-300 text-sm font-bold drop-shadow-sm self-center ml-2">⭐ Pinned</span>}
            </div>
         </div>
      </div>


      {/* ================= MAIN CONTENT ================= */}
      <div className="mx-auto max-w-6xl px-4 py-8 -mt-6 relative z-20">
        
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* LEFT COLUMN: CONTENT */}
          <div className="space-y-6 lg:col-span-2">
            
            {/* DESCRIPTION CARD */}
            <div className={cardClass}>
              <h3 className="mb-3 text-sm font-bold uppercase text-slate-400">Description</h3>
              {editingCore ? (
                 <textarea className={textareaClass} value={draftDesc} onChange={e => setDraftDesc(e.target.value)} />
              ) : (
                <div className="whitespace-pre-wrap text-base leading-relaxed text-slate-800">
                   {detail.description || <span className="italic text-slate-400">No description provided.</span>}
                </div>
              )}
            </div>

            {/* FOOTAGE CARD */}
            <div className={cardClass}>
              <h3 className="mb-3 text-base font-bold text-slate-900">🎬 Footage</h3>
              
              <div className="mb-4 flex gap-2">
                <input 
                  className={inputClass} 
                  placeholder="Paste YouTube link or path..." 
                  value={fp} 
                  onChange={e => setFp(e.target.value)}
                  disabled={fetchingTitle}
                  onKeyDown={e => e.key === 'Enter' && addFootage()}
                />
                <button onClick={addFootage} disabled={fetchingTitle} className={btnGhost}>
                  {fetchingTitle ? "..." : "+"}
                </button>
              </div>

              {footage.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No footage added.</p>
              ) : (
                <ul className="space-y-3">
                  {footage.map(f => (
                    <li key={f.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:bg-white hover:shadow-sm hover:border-slate-200">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-xs">▶</span>
                          <div className="min-w-0 pt-0.5">
                            {f.title && (
                              <div className="font-semibold text-sm text-slate-900 line-clamp-2 mb-1">
                                <a href={f.file_path || "#"} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-blue-600">
                                  {f.title}
                                </a>
                              </div>
                            )}
                            <div className={`truncate text-xs ${f.title ? 'text-slate-500' : 'text-slate-900 font-medium'}`}>
                              {renderLinkOrText(f.file_path)}
                            </div>
                            {f.notes && <div className="mt-1 text-xs text-slate-500 italic">{f.notes}</div>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                           <button onClick={() => deleteFootage(f.id)} className="text-slate-400 hover:text-rose-600">×</button>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2 pl-11">
                         <button onClick={() => toggleDownloaded(f.id, f.downloaded)} className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition ${f.downloaded ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-100"}`}>
                           {f.downloaded ? "✓ Downloaded" : "☁ Need Download"}
                         </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* SOURCES CARD */}
            <div className={cardClass}>
              <h3 className="mb-3 text-base font-bold text-slate-900">🔗 Sources</h3>
              <div className="mb-4 flex gap-2">
                <input className={inputClass} placeholder="Paste source URL..." value={srcUrl} onChange={e => setSrcUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSource()} />
                <button onClick={addSource} disabled={savingItem} className={btnGhost}>+</button>
              </div>
              {sources.length === 0 ? <p className="text-sm text-slate-400 italic">No sources added.</p> : (
                <ul className="space-y-2">
                  {sources.map(s => (
                    <li key={s.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-500">🌍</span>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{renderLinkOrText(s.url)}</div>
                          <div className="flex gap-2 text-xs text-slate-500"><span>Rel: {s.reliability}/5</span>{s.note && <span>• {s.note}</span>}</div>
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
                  <div className="flex justify-between border-b border-slate-100 pb-3">
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
                   <div>
                      <div className="mb-1 text-xs text-slate-500">Game Release</div>
                      <span className="text-sm font-medium text-slate-900">{game?.release_year || "Unknown"}</span>
                    </div>
                </div>
              )}
            </div>

            {/* GROUPS */}
            <div className={cardClass}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Groups</h3>
                <GroupAddPicker groups={allGroups} onAdd={addToGroup} onCreate={createGroup} />
              </div>
              {ideaGroups.length === 0 ? <p className="text-sm text-slate-400">Not in any group.</p> : (
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