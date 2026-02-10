"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { 
  PlusIcon,
  HomeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  QueueListIcon,
  PuzzlePieceIcon,
  TrashIcon
} from "@heroicons/react/24/outline";

/* ================= TYPES ================= */

type Game = { id: number; title: string; release_year: number | null; genres_text: string | null; };
type SimilarIdea = { id: number; title: string; game_id: number; detail_type: string; priority: number; };
type IdeaGroup = { id: number; name: string; description: string | null; };
type StagedFootage = { file_path: string; title?: string; downloaded: boolean; notes?: string; };
type StagedSource = { url: string; note?: string; reliability: number; };

/* ================= STYLES ================= */

const inputClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition shadow-sm";
const textareaClass = "min-h-[140px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition resize-y shadow-sm";
const selectClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition cursor-pointer shadow-sm";
const btnBase = "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold whitespace-nowrap cursor-pointer transition active:scale-[0.98]";
const btnPrimary = btnBase + " bg-slate-900 text-white shadow-lg shadow-slate-200 hover:bg-slate-800 disabled:opacity-70";
const btnGhost = btnBase + " border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50";
const cardClass = "rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm";

/* ================= HELPERS ================= */

async function fetchYoutubeTitle(url: string): Promise<string | null> {
  try {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    if (!youtubeRegex.test(url)) return null;
    const res = await fetch(`https://noembed.com/embed?url=${url}`);
    const data = await res.json();
    return data.title || null;
  } catch (e) { return null; }
}

function renderLinkOrText(text: string) {
  const isUrl = text.startsWith("http://") || text.startsWith("https://");
  if (isUrl) {
    return (
      <a href={text} target="_blank" rel="noopener noreferrer" className="break-all text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>{text}</a>
    );
  }
  return <span className="break-all font-mono text-slate-500">{text}</span>;
}

/* ================= SUB-COMPONENTS ================= */

function GameCombobox({ games, selectedGameId, onSelect, onCreateGame }: any) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement | null>(null);

  const selectedGame = useMemo(() => {
    if (!selectedGameId) return null;
    return games.find((g: any) => g.id === selectedGameId) ?? null;
  }, [games, selectedGameId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return games.slice(0, 50);
    return games.filter((g: any) => g.title.toLowerCase().includes(q)).slice(0, 50);
  }, [games, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">Game Select *</label>
      <button type="button" className={`flex w-full items-center justify-between text-left ${inputClass} ${!selectedGame ? "text-slate-400" : "font-bold"}`} onClick={() => setOpen((v) => !v)}>
        <span className="truncate">{selectedGame ? selectedGame.title : "Search & Select Game..."}</span>
        <span className="text-slate-300">▼</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-2xl p-2 animate-in fade-in slide-in-from-top-2">
          <input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type game name..." autoFocus />
          <div className="max-h-60 overflow-auto mt-2 space-y-1">
            {filtered.length === 0 ? (
              <button type="button" className="w-full rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-100" onClick={() => { setOpen(false); onCreateGame(query.trim()); }}>+ Create "{query}"</button>
            ) : (
              filtered.map((g: any) => (
                <button key={g.id} type="button" className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition" onClick={() => { onSelect(g); setOpen(false); setQuery(""); }}>{g.title}</button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GroupPicker({ groups, selectedIds, onToggle, onCreateGroup }: any) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return groups.slice(0, 50);
    return groups.filter((g: any) => g.name.toLowerCase().includes(s)).slice(0, 50);
  }, [groups, q]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <div className="mb-3 flex items-center justify-between">
        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Collections</label>
        <button type="button" onClick={() => setOpen(!open)} className="text-xs font-bold text-blue-600 hover:underline">{open ? "Close" : "+ Add to Group"}</button>
      </div>
      <div className="flex flex-wrap gap-2 min-h-[40px]">
        {selectedIds.length === 0 && !open && <span className="text-xs text-slate-400 italic font-medium">Not assigned to any collection.</span>}
        {selectedIds.map((id: number) => {
          const g = groups.find((x: any) => x.id === id);
          return g && (
            <span key={id} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
              {g.name} <button type="button" onClick={() => onToggle(id)} className="hover:text-blue-900 text-lg leading-none">×</button>
            </span>
          );
        })}
      </div>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl border border-slate-200 bg-white shadow-2xl p-2 animate-in zoom-in-95">
          <input className={inputClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search groups..." autoFocus />
          <div className="max-h-48 overflow-auto mt-2 space-y-1">
            {filtered.length === 0 ? (
              <button type="button" className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900" onClick={() => { if (q.trim()) onCreateGroup(q.trim()); setQ(""); }}>+ Create "{q}"</button>
            ) : (
              filtered.map((g: any) => (
                <button key={g.id} type="button" className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold transition ${selectedIds.includes(g.id) ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"}`} onClick={() => onToggle(g.id)}>
                  <span>{g.name}</span> {selectedIds.includes(g.id) && "✓"}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= MAIN COMPONENT ================= */

export default function AddIdeaPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [groups, setGroups] = useState<IdeaGroup[]>([]);
  const [groupCounts, setGroupCounts] = useState<Map<number, number>>(new Map());
  const [gameId, setGameId] = useState<number | "">("");

  // Core fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [detailType, setDetailType] = useState("small_detail");
  const [priority, setPriority] = useState(3);
  const [spoiler, setSpoiler] = useState(0);
  const [confidence, setConfidence] = useState(3);
  const [pinned, setPinned] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);

  // Helpers
  const [debouncedTitle, setDebouncedTitle] = useState("");
  const [similar, setSimilar] = useState<SimilarIdea[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Modals / Inline forms
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [newGameTitle, setNewGameTitle] = useState("");
  const [savingGame, setSavingGame] = useState(false);

  // Staging
  const [fp, setFp] = useState("");
  const [fetchingTitle, setFetchingTitle] = useState(false);
  const [stagedFootage, setStagedFootage] = useState<StagedFootage[]>([]);
  const [srcUrl, setSrcUrl] = useState("");
  const [stagedSources, setStagedSources] = useState<StagedSource[]>([]);

  const [savingIdea, setSavingIdea] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      const { data: gs } = await supabase.from("games").select("*").order("title");
      const { data: grps } = await supabase.from("idea_groups").select("*").order("name");
      const { data: items } = await supabase.from("idea_group_items").select("group_id");
      
      setGames((gs || []) as Game[]);
      setGroups((grps || []) as IdeaGroup[]);
      
      const m = new Map<number, number>();
      for (const row of items || []) {
        const gid = Number((row as any).group_id);
        m.set(gid, (m.get(gid) ?? 0) + 1);
      }
      setGroupCounts(m);
    }
    loadData();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTitle(title), 500);
    return () => clearTimeout(t);
  }, [title]);

  useEffect(() => {
    if (debouncedTitle.trim().length < 4) { setSimilar([]); return; }
    setLoadingSimilar(true);
    supabase.rpc("search_similar_ideas", { q: debouncedTitle.trim(), gid: gameId ? Number(gameId) : null })
      .then(({ data }) => {
        setSimilar((data ?? []) as SimilarIdea[]);
        setLoadingSimilar(false);
      });
  }, [debouncedTitle, gameId]);

  async function createGameInline() {
    if (!newGameTitle.trim()) return;
    setSavingGame(true);
    const { data, error } = await supabase.from("games").insert({ title: newGameTitle.trim() }).select("id").single();
    setSavingGame(false);
    if (!error && data) {
      setGameId(data.id);
      setShowCreateGame(false);
      const { data: gs } = await supabase.from("games").select("*").order("title");
      setGames((gs ?? []) as Game[]);
    }
  }

  async function createGroupInline(name: string) {
    const { data } = await supabase.from("idea_groups").insert({ name }).select().single();
    if (data) {
      setGroups((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedGroupIds((prev) => [...prev, data.id]);
    }
  }

  async function handleAddFootage() {
    if (!fp.trim()) return;
    setFetchingTitle(true);
    const link = fp.trim();
    const ytTitle = await fetchYoutubeTitle(link);
    const isLocalFile = !link.startsWith("http");
    setStagedFootage([...stagedFootage, { file_path: link, title: ytTitle || undefined, downloaded: isLocalFile }]);
    setFp("");
    setFetchingTitle(false);
  }

  async function saveIdea(e: React.FormEvent) {
    e.preventDefault();
    if (!gameId || !title.trim() || !description.trim()) {
      setMessage({ kind: "err", text: "Please fill in Game, Title, and Description." });
      return;
    }
    setSavingIdea(true);
    const { data: idea, error } = await supabase.from("details").insert({
      game_id: gameId, title: title.trim(), description: description.trim(),
      detail_type: detailType, priority, spoiler_level: spoiler,
      confidence, status: "idea", pinned, pinned_at: pinned ? new Date().toISOString() : null,
    }).select("id").single();

    if (error || !idea) {
      setMessage({ kind: "err", text: error?.message || "Error saving." });
      setSavingIdea(false);
      return;
    }

    const detailId = idea.id;
    const promises = [];
    if (selectedGroupIds.length) {
      promises.push(supabase.from("idea_group_items").insert(selectedGroupIds.map((gid) => ({ group_id: gid, detail_id: detailId, position: 0 }))));
    }
    if (stagedFootage.length) {
      promises.push(supabase.from("footage").insert(stagedFootage.map((f) => ({ detail_id: detailId, file_path: f.file_path, title: f.title, downloaded: f.downloaded, notes: f.notes }))));
    }
    if (stagedSources.length) {
      promises.push(supabase.from("sources").insert(stagedSources.map((s) => ({ detail_id: detailId, url: s.url, reliability: s.reliability }))));
    }

    await Promise.all(promises);
    setSavingIdea(false);
    setMessage({ kind: "ok", text: "Idea saved successfully!" });
    setTitle(""); setDescription(""); setStagedFootage([]); setStagedSources([]); setSimilar([]); setPinned(false);
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* SIDEBAR - ĐỒNG BỘ 100% TRANG CHỦ */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-slate-200 bg-white hidden md:flex">
         <div className="flex h-20 items-center px-8 text-2xl font-black text-slate-900 tracking-tighter">GameKB<span className="text-blue-500">.</span></div>
         <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            <nav className="space-y-2">
               <Link href="/" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>🏠</span> All Ideas</Link>
               <Link href="/dashboard" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>📊</span> Dashboard</Link>
               <Link href="/scripts" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"><span>📜</span> Scripts</Link>
               <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold bg-slate-900 text-white shadow-lg shadow-slate-200 transition"><span>🕹️</span> Add Idea</button>
            </nav>
            <div className="pt-4 border-t border-slate-100">
               <div className="flex items-center justify-between px-2 mb-2 font-bold text-xs uppercase text-slate-400 tracking-widest"><span>Collections</span></div>
               <div className="space-y-1">
                  {groups.map(g => (
                     <div key={g.id} className="group/item relative flex items-center justify-between w-full hover:bg-slate-50 rounded-xl px-2 py-1 transition cursor-pointer">
                        <div className="flex-1 flex items-center gap-2 overflow-hidden py-2 text-slate-500 font-medium text-sm"><span className="truncate">{g.name}</span></div>
                        <div className="w-8 flex justify-center shrink-0"><span className="text-[10px] font-bold opacity-60">{groupCounts.get(g.id)||0}</span></div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 md:pl-72 pb-32">
        <div className="mx-auto max-w-5xl px-8 py-10">
          
          <div className="mb-10">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Create Idea</h1>
            <p className="text-slate-500 font-medium mt-1">Ghi lại một chi tiết, cơ chế hoặc bí mật thú vị.</p>
          </div>

          {message && (
            <div className={`mb-8 rounded-2xl border-2 px-6 py-4 text-sm font-bold animate-in slide-in-from-top-4 ${message.kind === "ok" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-rose-100 bg-rose-50 text-rose-700"}`}>
              {message.kind === "ok" ? "✓ " : "✕ "} {message.text}
            </div>
          )}

          <form onSubmit={saveIdea} className="grid gap-8 lg:grid-cols-3 items-start">
            
            {/* LEFT COLUMN: CONTENT */}
            <div className="space-y-8 lg:col-span-2">
              <div className={cardClass}>
                <div className="space-y-6">
                  <GameCombobox games={games} selectedGameId={gameId} onSelect={(g: any) => setGameId(g.id)} onCreateGame={(t: any) => { setNewGameTitle(t); setShowCreateGame(true); }} />
                  {showCreateGame && (
                    <div className="rounded-2xl border-2 border-blue-100 bg-blue-50/50 p-6 animate-in zoom-in-95">
                      <h4 className="mb-3 text-xs font-black uppercase tracking-widest text-blue-800">New Game Entry</h4>
                      <div className="flex gap-3">
                        <input className={inputClass} value={newGameTitle} onChange={(e) => setNewGameTitle(e.target.value)} placeholder="Enter Game Title..." />
                        <button type="button" onClick={createGameInline} disabled={savingGame} className={btnPrimary}>{savingGame ? "..." : "Create"}</button>
                      </div>
                    </div>
                  )}
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">Idea Title *</span>
                    <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Unique NPC death animations" />
                  </label>
                  {!loadingSimilar && similar.length > 0 && (
                    <div className="rounded-2xl border-2 border-amber-100 bg-amber-50 p-5">
                      <div className="mb-3 text-[10px] font-black uppercase tracking-widest text-amber-700">Similarity Warning</div>
                      <ul className="space-y-2">
                        {similar.map(s => <li key={s.id} className="text-xs font-bold text-amber-900">• <a href={`/idea/${s.id}`} target="_blank" className="underline">{s.title}</a></li>)}
                      </ul>
                    </div>
                  )}
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">Detailed Description *</span>
                    <textarea className={textareaClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide context, how to trigger, and why it's interesting..." />
                  </label>
                </div>
              </div>

              <div className={cardClass}>
                <h3 className="mb-6 text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2"><span>📂</span> Attachments & Media</h3>
                <div className="grid gap-8 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Footage / Clips</div>
                    <div className="flex gap-2">
                      <input className={inputClass} placeholder="Link or file path..." value={fp} onChange={(e) => setFp(e.target.value)} disabled={fetchingTitle} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFootage())} />
                      <button type="button" className={btnGhost} onClick={handleAddFootage} disabled={fetchingTitle}>{fetchingTitle ? "..." : "+"}</button>
                    </div>
                    <ul className="space-y-3">
                      {stagedFootage.map((f, i) => (
                        <li key={i} className="rounded-2xl bg-slate-50 p-4 border border-slate-100 group">
                          <div className="flex justify-between items-start mb-2">
                             <div className="min-w-0 pr-4">
                               {f.title && <div className="font-bold text-xs text-slate-900 line-clamp-1 mb-1">🎬 {f.title}</div>}
                               <div className="truncate text-[10px] font-mono font-bold text-slate-400">{renderLinkOrText(f.file_path)}</div>
                             </div>
                             <button type="button" onClick={() => setStagedFootage(stagedFootage.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-rose-500 transition-colors text-lg">×</button>
                          </div>
                          <button type="button" onClick={() => { const n = [...stagedFootage]; n[i].downloaded = !n[i].downloaded; setStagedFootage(n); }} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition shadow-sm ${f.downloaded ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>{f.downloaded ? "✓ Downloaded" : "☁ Need Download"}</button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sources / References</div>
                    <div className="flex gap-2">
                      <input className={inputClass} placeholder="URL..." value={srcUrl} onChange={(e) => setSrcUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), srcUrl && (setStagedSources([...stagedSources, { url: srcUrl, reliability: 3 }]), setSrcUrl("")))} />
                      <button type="button" className={btnGhost} onClick={() => { if(srcUrl) { setStagedSources([...stagedSources, { url: srcUrl, reliability: 3 }]); setSrcUrl(""); } }}>+</button>
                    </div>
                    <ul className="space-y-2">
                      {stagedSources.map((s, i) => (
                        <li key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-xs border border-slate-100">
                          <span className="truncate font-bold text-slate-500">{renderLinkOrText(s.url)}</span>
                          <button type="button" onClick={() => setStagedSources(stagedSources.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-rose-500">×</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              <div className={cardClass}>
                <button type="submit" disabled={!gameId || !title || savingIdea} className={`${btnPrimary} w-full h-14 text-base tracking-tight`}>
                  {savingIdea ? "Publishing Idea..." : "Publish Idea"}
                </button>
              </div>

              <div className={cardClass}>
                <h3 className="mb-6 text-xs font-black uppercase tracking-widest text-slate-400">Settings</h3>
                <div className="space-y-5">
                  <label className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-5 w-5 rounded-lg border-slate-300 text-slate-900 focus:ring-0" />
                    <span className="text-sm font-bold text-slate-700">Pin this idea</span>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Detail Type</span>
                    <select className={selectClass} value={detailType} onChange={(e) => setDetailType(e.target.value)}>
                      <option value="small_detail">Small detail</option>
                      <option value="easter_egg">Easter egg</option>
                      <option value="npc_reaction">NPC reaction</option>
                      <option value="physics">Physics</option>
                      <option value="troll">Troll</option>
                      <option value="punish">Punish</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Priority</span>
                    <select className={selectClass} value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
                      <option value={1}>High (ASAP)</option>
                      <option value={3}>Normal</option>
                      <option value={5}>Low Priority</option>
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Spoiler</span>
                      <select className={selectClass} value={spoiler} onChange={(e) => setSpoiler(Number(e.target.value))}>
                        <option value={0}>None</option>
                        <option value={1}>Mild</option>
                        <option value={2}>Story</option>
                        <option value={3}>Ending</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Confidence</span>
                      <select className={selectClass} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))}>
                        <option value={1}>Speculation</option>
                        <option value={3}>Probable</option>
                        <option value={5}>Verified</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              <div className={cardClass}>
                <GroupPicker groups={groups} selectedIds={selectedGroupIds} onToggle={(id: any) => setSelectedGroupIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} onCreateGroup={createGroupInline} />
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}