"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
  HashtagIcon, 
  TagIcon, 
  DocumentDuplicateIcon, 
  VideoCameraIcon,
  FolderPlusIcon,
  DocumentPlusIcon
} from "@heroicons/react/24/outline";

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
  genres_text?: string | null;
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

type ScriptProject = { 
  id?: number; 
  title: string; 
  content: string; 
  assets: { url: string; name: string }[];
  description: string; 
  hashtags: string[]; 
  tags: string[];
  publish_date: string | null; 
  status: string;
};

/* ================= STYLES ================= */

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition";

const heroInputClass = 
  "w-full bg-transparent text-3xl md:text-4xl font-extrabold text-white placeholder:text-white/50 border-b-2 border-white/20 px-0 py-2 focus:border-white focus:outline-none transition mb-2";

const textareaClass =
  "min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition resize-y";

const selectClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition cursor-pointer";

const btnBase =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold whitespace-nowrap cursor-pointer transition active:scale-[0.98]";

const btnGhost =
  btnBase + " border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900";

const btnGlass = 
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/30 px-4 text-sm font-semibold text-white backdrop-blur-md hover:bg-black/50 transition shadow-sm";

const cardClass = "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";

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
        className="break-all text-blue-600 hover:text-blue-800 hover:underline font-medium"
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
    small_detail: "🔍 Small Detail",
    easter_egg: "🥚 Easter Egg",
    npc_reaction: "🗣️ NPC Reaction",
    physics: "🍎 Physics",
    troll: "🤡 Troll",
    punish: "⚖️ Punish",
  };
  return <span className="inline-flex items-center rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white backdrop-blur-md shadow-sm">{map[t] || t}</span>;
}

/* ================= COMPONENT: GROUP PICKER ================= */
function GroupAddPicker({ groups, onAdd, onCreate }: { groups: Group[]; onAdd: (id: number) => void; onCreate: (n: string) => void; }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement | null>(null);
  const filtered = useMemo(() => groups.filter((g) => g.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 50), [groups, q]);
  useEffect(() => {
    function onDocClick(e: MouseEvent) { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDocClick); return () => document.removeEventListener("mousedown", onDocClick);
  }, []);
  return (
    <div ref={boxRef} className="relative">
      <button type="button" className="text-xs font-bold text-blue-600 hover:underline uppercase tracking-wide" onClick={() => setOpen((v) => !v)}>+ Add Group</button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="p-2"><input className={inputClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search groups..." autoFocus /></div>
          <div className="max-h-48 overflow-auto p-1 pt-0">
            {filtered.length === 0 ? <div className="p-2 text-center"><button type="button" className="w-full rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-200" onClick={() => { if (q.trim()) onCreate(q.trim()); setOpen(false); setQ(""); }}>+ Create "{q}"</button></div> : <ul>{filtered.map((g) => <li key={g.id}><button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100" onClick={() => { onAdd(g.id); setOpen(false); setQ(""); }}>{g.name}</button></li>)}</ul>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= COMPONENT: ADD TO SCRIPT MODAL ================= */
function AddToScriptModal({ 
  isOpen, onClose, detail, game, footage 
}: { 
  isOpen: boolean; onClose: () => void; 
  detail: Detail; game: Game | null; footage: FootageRow[];
}) {
  const [activeTab, setActiveTab] = useState<"existing" | "new">("existing");
  const [scripts, setScripts] = useState<{ id: number; title: string; status: string }[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<number | "">("");
  const [loading, setLoading] = useState(false);

  // Form data cho phần Tạo mới
  const [newTitle, setNewTitle] = useState(`Video Script: ${detail?.title || "Draft"}`);

  // Fetch danh sách scripts mỗi khi mở modal
  useEffect(() => {
    if (isOpen) {
      supabase.from("scripts").select("id, title, status").order("id", { ascending: false })
        .then(({ data }) => {
          if (data) {
            setScripts(data);
            if (data.length > 0) setSelectedScriptId(data[0].id);
          }
        });
    }
  }, [isOpen]);

  if (!isOpen || !detail) return null;

  // Xử lý Dữ liệu của Idea hiện tại
  const ideaTitle = detail.title;
  const ideaDesc = detail.description || "";
  const gameName = game?.title || "";
  
  const newContentPart = `[${ideaTitle}]\n${ideaDesc}`;
  const newDescPart = `• ${ideaTitle}: ${ideaDesc}`;
  const newTags = [gameName, "Shorts", "Gaming", "Game Facts"].filter(Boolean);
  const newHashtags = ["#shorts", "#gaming", gameName ? `#${gameName.replace(/\s+/g, '').toLowerCase()}` : ""].filter(Boolean);
  const newAssets = footage.map(f => ({ url: f.file_path || "", name: f.title || f.file_path?.split('/').pop() || "Video" }));

  // Xử lý THÊM VÀO SCRIPT CÓ SẴN
  const handleAddToExisting = async () => {
    if (!selectedScriptId) return;
    setLoading(true);

    const { data: currentScript, error: fetchErr } = await supabase.from("scripts").select("*").eq("id", selectedScriptId).single();
    
    if (fetchErr || !currentScript) {
      alert("Error fetching script data.");
      setLoading(false);
      return;
    }

    // Merge logic
    const mergedContent = currentScript.content ? `${currentScript.content}\n\n${newContentPart}` : newContentPart;
    const mergedDesc = currentScript.description ? `${currentScript.description}\n\n${newDescPart}` : newDescPart;
    const mergedTags = Array.from(new Set([...(currentScript.tags || []), ...newTags]));
    const mergedHashtags = Array.from(new Set([...(currentScript.hashtags || []), ...newHashtags]));
    const mergedAssets = [...(currentScript.assets || []), ...newAssets];

    const { error: updateErr } = await supabase.from("scripts").update({
      content: mergedContent,
      description: mergedDesc,
      tags: mergedTags,
      hashtags: mergedHashtags,
      assets: mergedAssets
    }).eq("id", selectedScriptId);

    setLoading(false);
    if (!updateErr) {
      alert("✅ Added idea to existing script successfully!");
      onClose();
    } else {
      alert("Failed to update script.");
    }
  };

  // Xử lý TẠO SCRIPT MỚI
  const handleCreateNew = async () => {
    if (!newTitle.trim()) return;
    setLoading(true);

    const { error } = await supabase.from("scripts").insert({
      title: newTitle.trim(),
      content: newContentPart,
      description: `Video tổng hợp các chi tiết thú vị.\n\n${newDescPart}`,
      tags: newTags,
      hashtags: newHashtags,
      assets: newAssets,
      status: "Draft"
    });

    setLoading(false);
    if (!error) {
      alert("✅ Created new script with this idea!");
      onClose();
    } else {
      alert("Failed to create script.");
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in cursor-pointer" onClick={onClose}>
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 cursor-auto" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-900">Add to Script Project</h2>
            <p className="text-xs font-bold text-slate-500 mt-1 line-clamp-1">{detail.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold p-2">✕</button>
        </div>

        {/* Tabs Toggle */}
        <div className="flex p-2 bg-slate-100/50">
          <button onClick={() => setActiveTab("existing")} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition ${activeTab === "existing" ? "bg-white text-blue-600 shadow-sm border border-slate-200" : "text-slate-500 hover:bg-slate-100"}`}>
            <FolderPlusIcon className="w-5 h-5"/> Existing Script
          </button>
          <button onClick={() => setActiveTab("new")} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition ${activeTab === "new" ? "bg-white text-blue-600 shadow-sm border border-slate-200" : "text-slate-500 hover:bg-slate-100"}`}>
            <DocumentPlusIcon className="w-5 h-5"/> New Script
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 bg-white min-h-[220px]">
          {activeTab === "existing" ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-2">
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 mb-2 block tracking-widest">Select Script</label>
                {scripts.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-sm text-slate-500 font-medium">No scripts found. Create a new one first!</div>
                ) : (
                  <select 
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm cursor-pointer"
                    value={selectedScriptId}
                    onChange={e => setSelectedScriptId(Number(e.target.value))}
                  >
                    {scripts.map(s => (
                      <option key={s.id} value={s.id}>{s.title} ({s.status})</option>
                    ))}
                  </select>
                )}
              </div>
              <button 
                onClick={handleAddToExisting} 
                disabled={loading || scripts.length === 0} 
                className="w-full h-12 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-50 shadow-lg shadow-blue-500/30"
              >
                {loading ? "Adding..." : "Add to Selected Script"}
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 mb-2 block tracking-widest">New Script Title</label>
                <input 
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Enter script title..."
                  autoFocus
                />
              </div>
              <button 
                onClick={handleCreateNew} 
                disabled={loading || !newTitle.trim()} 
                className="w-full h-12 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 active:scale-[0.98] transition disabled:opacity-50 shadow-lg"
              >
                {loading ? "Creating..." : "Create & Add Idea"}
              </button>
            </div>
          )}
        </div>
      </div>
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

  /* Script State */
  const [showScriptModal, setShowScriptModal] = useState(false);

  /* Edit States */
  const [editingCore, setEditingCore] = useState(false);
  const [savingCore, setSavingCore] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftType, setDraftType] = useState("small_detail");
  const [draftPriority, setDraftPriority] = useState(3);
  const [draftSpoiler, setDraftSpoiler] = useState(0);
  const [draftConfidence, setDraftConfidence] = useState(3);

  /* Forms */
  const [fp, setFp] = useState("");
  const [srcUrl, setSrcUrl] = useState("");
  const [savingItem, setSavingItem] = useState(false);
  const [fetchingTitle, setFetchingTitle] = useState(false);

  // Load Data
  async function loadAll() {
    setLoading(true);
    if (!Number.isFinite(id)) return;
    const { data: gs } = await supabase.from("idea_groups").select("*").order("name");
    setAllGroups((gs ?? []) as Group[]);

    const { data: d, error } = await supabase.from("details").select("*").eq("id", id).single();
    if (error) { setLoading(false); return; }
    setDetail(d as Detail);

    setDraftTitle(d.title); setDraftDesc(d.description ?? ""); setDraftType(d.detail_type); setDraftPriority(d.priority); setDraftSpoiler(d.spoiler_level ?? 0); setDraftConfidence(d.confidence ?? 3);

    const { data: g } = await supabase.from("games").select("*").eq("id", d.game_id).single();
    setGame(g as Game);

    const { data: f } = await supabase.from("footage").select("*").eq("detail_id", id).order("created_at", { ascending: false });
    setFootage((f ?? []) as FootageRow[]);

    const { data: s } = await supabase.from("sources").select("*").eq("detail_id", id).order("created_at", { ascending: false });
    setSources((s ?? []) as SourceRow[]);

    const { data: links } = await supabase.from("idea_group_items").select("group_id").eq("detail_id", id);
    if (links && links.length > 0) {
      const ids = links.map((x: any) => x.group_id);
      const { data: myGs } = await supabase.from("idea_groups").select("*").in("id", ids).order("name");
      setIdeaGroups((myGs ?? []) as Group[]);
    } else {
      setIdeaGroups([]);
    }
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, [id]);
  useEffect(() => { if (detail) document.title = `${detail.title} | GameKB`; }, [detail]);

  // Actions 
  async function togglePin() { if (!detail) return; const newPinned = !detail.pinned; await supabase.from("details").update({ pinned: newPinned, pinned_at: newPinned ? new Date().toISOString() : null }).eq("id", detail.id); await loadAll(); }
  async function deleteIdea() { if (!detail || !confirm("Delete this idea?")) return; await supabase.from("details").delete().eq("id", detail.id); router.push("/"); }
  async function saveCore() { if (!detail) return; setSavingCore(true); const { error } = await supabase.from("details").update({ title: draftTitle.trim(), description: draftDesc.trim(), detail_type: draftType, priority: draftPriority, spoiler_level: draftSpoiler, confidence: draftConfidence }).eq("id", detail.id); setSavingCore(false); if (!error) { setEditingCore(false); await loadAll(); } }
  async function addFootage() { if (!detail || !fp.trim()) return; setFetchingTitle(true); const link = fp.trim(); const ytTitle = await fetchYoutubeTitle(link); const isLocalFile = !link.startsWith("http"); await supabase.from("footage").insert({ detail_id: detail.id, file_path: link, title: ytTitle || null, downloaded: isLocalFile }); setFp(""); setFetchingTitle(false); await loadAll(); }
  async function toggleDownloaded(fid: number, currentStatus: boolean) { setFootage(prev => prev.map(f => f.id === fid ? { ...f, downloaded: !currentStatus } : f)); await supabase.from("footage").update({ downloaded: !currentStatus }).eq("id", fid); }
  async function deleteFootage(fid: number) { if (!confirm("Remove this footage?")) return; await supabase.from("footage").delete().eq("id", fid); await loadAll(); }
  async function addSource() { if (!detail || !srcUrl.trim()) return; setSavingItem(true); await supabase.from("sources").insert({ detail_id: detail.id, url: srcUrl.trim(), reliability: 3 }); setSrcUrl(""); setSavingItem(false); await loadAll(); }
  async function deleteSource(sid: number) { if (!confirm("Remove this source?")) return; await supabase.from("sources").delete().eq("id", sid); await loadAll(); }
  async function addToGroup(gid: number) { if (!detail) return; await supabase.from("idea_group_items").insert({ group_id: gid, detail_id: detail.id, position: 0 }); loadAll(); }
  async function removeFromGroup(gid: number) { if (!detail) return; await supabase.from("idea_group_items").delete().eq("group_id", gid).eq("detail_id", detail.id); loadAll(); }
  async function createGroup(name: string) { const { data } = await supabase.from("idea_groups").insert({ name }).select().single(); if (data) { await addToGroup(data.id); } }

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-400">Loading mission...</div>;
  if (!detail) return <div className="p-8 text-center text-slate-500">Idea not found.</div>;

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      
      {/* ADD TO SCRIPT MODAL */}
      <AddToScriptModal 
        isOpen={showScriptModal} 
        onClose={() => setShowScriptModal(false)} 
        detail={detail} 
        game={game} 
        footage={footage} 
      />
      
      {/* ================= NEW HERO HEADER (POSTER STYLE) ================= */}
      <div className="relative w-full bg-slate-900 shadow-xl overflow-hidden">
         
         {/* Background Layer (Blur) */}
         {game?.cover_url ? (
            <div className="absolute inset-0 bg-cover bg-center opacity-40 blur-xl scale-110" style={{ backgroundImage: `url(${game.cover_url})` }} />
         ) : (
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
         )}
         {/* Gradient Overlay đậm hơn để text nổi bật */}
         <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/80 to-slate-900" />

         {/* Navigation Top */}
         <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-30">
            <a href="/" className={btnGlass}>← Home</a>
            
            <div className="flex gap-2">
              {!editingCore && (
                <>
                  <button onClick={() => setShowScriptModal(true)} className={btnGlass}>
                    🎬 Add to Script
                  </button>

                  <button onClick={togglePin} className={btnGlass}>
                    {detail.pinned ? "⭐ Pinned" : "☆ Pin"}
                  </button>
                  <button onClick={() => setEditingCore(true)} className={btnGlass}>
                    ✏️ Edit
                  </button>
                  <button onClick={deleteIdea} className="inline-flex h-9 items-center justify-center rounded-lg bg-rose-500/20 border border-rose-500/50 backdrop-blur-md px-4 text-sm font-semibold text-rose-100 hover:bg-rose-500 hover:text-white transition">
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

         {/* Hero Content Container */}
         <div className="relative z-20 mx-auto max-w-6xl px-6 pt-24 pb-12 md:pt-32">
            <div className="flex flex-col gap-8 md:flex-row md:items-end">
               
               {/* 1. POSTER IMAGE (Điểm nhấn chính) */}
               <div className="shrink-0">
                  <div className="relative h-64 w-44 md:h-80 md:w-56 overflow-hidden rounded-xl border border-white/10 shadow-2xl shadow-black/50 rotate-[-2deg] transition hover:rotate-0">
                     {game?.cover_url ? (
                        <img src={game.cover_url} alt="Cover" className="h-full w-full object-cover" />
                     ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-800 text-4xl">🎮</div>
                     )}
                     {/* Phản chiếu nhẹ */}
                     <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent pointer-events-none" />
                  </div>
               </div>

               {/* 2. TEXT CONTENT */}
               <div className="flex-1 pb-2">
                  <div className="mb-3 flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-blue-300">
                     <span>{game?.title}</span>
                     <span className="text-slate-500">•</span>
                     <span>{game?.release_year || "N/A"}</span>
                  </div>

                  {editingCore ? (
                     <div className="space-y-4 rounded-xl bg-black/40 p-4 border border-white/10 backdrop-blur-md">
                        <input className={heroInputClass} value={draftTitle} onChange={e => setDraftTitle(e.target.value)} autoFocus />
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="text-xs text-slate-400 uppercase font-bold">Priority</label>
                              <select className="w-full bg-slate-800 text-white rounded p-2 mt-1 border border-slate-600" value={draftPriority} onChange={e => setDraftPriority(Number(e.target.value))}>
                                 <option value={1}>🔥 High</option>
                                 <option value={3}>Normal</option>
                                 <option value={5}>Low</option>
                              </select>
                           </div>
                           <div>
                              <label className="text-xs text-slate-400 uppercase font-bold">Type</label>
                              <select className="w-full bg-slate-800 text-white rounded p-2 mt-1 border border-slate-600" value={draftType} onChange={e => setDraftType(e.target.value)}>
                                 <option value="small_detail">Small Detail</option>
                                 <option value="easter_egg">Easter Egg</option>
                                 <option value="npc_reaction">NPC Reaction</option>
                                 <option value="physics">Physics</option>
                                 <option value="troll">Troll</option>
                                 <option value="punish">Punish</option>
                              </select>
                           </div>
                           <div>
                              <label className="text-xs text-slate-400 uppercase font-bold">Confidence</label>
                              <select className="w-full bg-slate-800 text-white rounded p-2 mt-1 border border-slate-600" value={draftConfidence} onChange={e => setDraftConfidence(Number(e.target.value))}>
                                 <option value={1}>Low</option>
                                 <option value={3}>Medium</option>
                                 <option value={5}>Verified</option>
                              </select>
                           </div>
                           <div>
                              <label className="text-xs text-slate-400 uppercase font-bold">Spoiler</label>
                              <select className="w-full bg-slate-800 text-white rounded p-2 mt-1 border border-slate-600" value={draftSpoiler} onChange={e => setDraftSpoiler(Number(e.target.value))}>
                                 <option value={0}>None</option>
                                 <option value={1}>Mild</option>
                                 <option value={2}>Story</option>
                                 <option value={3}>Ending</option>
                              </select>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <>
                        <h1 className="text-3xl md:text-5xl font-black text-white drop-shadow-lg leading-tight mb-4">
                           {detail.title}
                        </h1>

                        {/* STATS BAR */}
                        <div className="flex flex-wrap items-center gap-4">
                           <TypeBadge t={detail.detail_type} />
                           
                           <div className="h-6 w-px bg-white/20"></div>

                           <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase text-slate-400">Priority</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${detail.priority === 1 ? 'bg-rose-500 text-white' : 'bg-slate-700 text-white'}`}>
                                 {detail.priority === 1 ? "HIGH" : detail.priority === 5 ? "LOW" : "NORMAL"}
                              </span>
                           </div>

                           <div className="h-6 w-px bg-white/20"></div>

                           <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase text-slate-400">Confidence</span>
                              <div className="flex gap-0.5">
                                 {[1, 2, 3, 4, 5].map(star => (
                                    <div key={star} className={`h-1.5 w-1.5 rounded-full ${star <= (detail.confidence||0) ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                                 ))}
                              </div>
                           </div>
                           
                           {detail.spoiler_level && detail.spoiler_level > 0 && (
                              <span className="ml-auto text-xs font-bold text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded bg-amber-500/10 uppercase tracking-wider">
                                 ⚠️ Spoiler Lv.{detail.spoiler_level}
                              </span>
                           )}
                        </div>
                     </>
                  )}
               </div>
            </div>
         </div>
      </div>

      {/* ================= CONTENT BODY (OVERLAPPING LAYOUT) ================= */}
      <div className="mx-auto max-w-6xl px-4 md:px-6 relative z-30 -mt-8">
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* LEFT COLUMN */}
          <div className="space-y-6 lg:col-span-2">
            
            {/* DESCRIPTION */}
            <div className={cardClass}>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">Detail Description</h3>
              {editingCore ? (
                 <textarea className={textareaClass} value={draftDesc} onChange={e => setDraftDesc(e.target.value)} />
              ) : (
                <div className="whitespace-pre-wrap text-base leading-relaxed text-slate-800">
                   {detail.description || <span className="italic text-slate-400">No description provided.</span>}
                </div>
              )}
            </div>

            {/* FOOTAGE */}
            <div className={cardClass}>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">Evidence / Footage</h3>
              
              <div className="mb-4 flex gap-2">
                <input className={inputClass} placeholder="YouTube link..." value={fp} onChange={e => setFp(e.target.value)} disabled={fetchingTitle} onKeyDown={e => e.key === 'Enter' && addFootage()} />
                <button onClick={addFootage} disabled={fetchingTitle} className={btnGhost}>{fetchingTitle ? "..." : "+"}</button>
              </div>

              {footage.length === 0 ? <p className="text-sm text-slate-400 italic">No footage added.</p> : (
                <ul className="space-y-3">
                  {footage.map(f => (
                    <li key={f.id} className="group relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-3 hover:border-blue-200 hover:shadow-md transition">
                      <div className="flex items-start justify-between gap-3 relative z-10">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-rose-500 shadow-sm text-xs">▶</span>
                          <div className="min-w-0 pt-0.5">
                            {f.title && <div className="font-bold text-sm text-slate-900 line-clamp-1 hover:text-blue-600"><a href={f.file_path || "#"} target="_blank">{f.title}</a></div>}
                            <div className="truncate text-xs text-slate-500">{renderLinkOrText(f.file_path)}</div>
                          </div>
                        </div>
                        <button onClick={() => deleteFootage(f.id)} className="text-slate-300 hover:text-rose-500">×</button>
                      </div>
                      {/* Download Status */}
                      <div className="mt-2 pl-11">
                         <button onClick={() => toggleDownloaded(f.id, f.downloaded)} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition ${f.downloaded ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500 hover:bg-slate-300"}`}>
                           {f.downloaded ? "✓ Downloaded" : "☁ Need Download"}
                         </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* SOURCES */}
            <div className={cardClass}>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">References</h3>
              <div className="mb-4 flex gap-2">
                <input className={inputClass} placeholder="Source URL..." value={srcUrl} onChange={e => setSrcUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSource()} />
                <button onClick={addSource} disabled={savingItem} className={btnGhost}>+</button>
              </div>
              <ul className="space-y-2">
                  {sources.map(s => (
                    <li key={s.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm hover:bg-white transition">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-blue-500">🌍</span>
                        <div className="min-w-0 truncate font-medium text-slate-700">{renderLinkOrText(s.url)}</div>
                      </div>
                      <button onClick={() => deleteSource(s.id)} className="text-slate-300 hover:text-rose-500">×</button>
                    </li>
                  ))}
              </ul>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6 lg:col-span-1">
             {/* GROUP CARD */}
             <div className={`${cardClass} border-t-4 border-t-blue-500`}>
               <div className="mb-4 flex items-center justify-between">
                 <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Collections</h3>
                 <GroupAddPicker groups={allGroups} onAdd={addToGroup} onCreate={createGroup} />
               </div>
               {ideaGroups.length === 0 ? <p className="text-sm text-slate-400">Uncategorized</p> : (
                 <div className="flex flex-wrap gap-2">
                   {ideaGroups.map(g => (
                     <span key={g.id} className="group inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition">
                       {g.name}
                       <button onClick={() => removeFromGroup(g.id)} className="ml-1 text-slate-300 hover:text-rose-500">×</button>
                     </span>
                   ))}
                 </div>
               )}
             </div>

             {/* META CARD */}
             <div className={cardClass}>
               <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Meta Info</h3>
               <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                     <span className="text-slate-500">Created</span>
                     <span className="font-medium">{new Date(detail.created_at || "").toLocaleDateString()}</span>
                  </div>
                  {detail.pinned_at && (
                     <div className="flex justify-between">
                        <span className="text-slate-500">Pinned</span>
                        <span className="font-medium">{new Date(detail.pinned_at).toLocaleDateString()}</span>
                     </div>
                  )}
                  <div className="flex justify-between">
                     <span className="text-slate-500">Game Genre</span>
                     <span className="font-medium max-w-[150px] truncate text-right">{game?.genres_text || "-"}</span>
                  </div>
               </div>
             </div>
          </div>

        </div>
      </div>
    </main>
  );
}