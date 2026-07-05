"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bars3Icon, CheckIcon, DocumentDuplicateIcon, EyeIcon, HashtagIcon, PencilSquareIcon, TagIcon, VideoCameraIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabaseClient";
import type { DetailRow, Game, ScriptProject } from "@/types/gamekb";
import type { VideoTheme } from "@/lib/videoThemes";
import { themeToHashtag } from "@/lib/videoThemes";
import { TypePill } from "@/components/TypePill";

export function QuickViewModal({ idea, isOpen, onClose }: { idea: DetailRow | null; isOpen: boolean; onClose: () => void }) {
  if (!isOpen || !idea) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={(event) => event.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-900 truncate pr-4">{idea.title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" type="button">✕</button>
        </div>
        <div className="p-6 space-y-4 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
          {idea.description || "No description available."}
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition" type="button">Close</button>
        </div>
      </div>
    </div>
  );
}

export function GameEditorModal({ game, isOpen, onClose, onUpdate }: { game: Game | null; isOpen: boolean; onClose: () => void; onUpdate: (game: Game) => void }) {
  const [title, setTitle] = useState("");
  const [cover, setCover] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (game) {
      setTitle(game.title);
      setCover(game.cover_url || "");
    }
  }, [game]);

  async function handleSave() {
    if (!game) return;
    setLoading(true);
    const { error } = await supabase.from("games").update({ title, cover_url: cover }).eq("id", game.id);
    setLoading(false);
    if (!error) {
      onUpdate({ ...game, title, cover_url: cover });
      onClose();
    }
  }

  if (!isOpen || !game) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 text-sm">Edit Game Info</h3>
          <button onClick={onClose} className="text-gray-400" type="button">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block tracking-wider">Title</label>
            <input className="w-full h-10 border rounded-lg px-3 text-sm outline-none focus:border-blue-500 shadow-sm" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block tracking-wider">Cover URL</label>
            <input className="w-full h-10 border rounded-lg px-3 text-sm outline-none focus:border-blue-500 shadow-sm" value={cover} onChange={(event) => setCover(event.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-400" type="button">Cancel</button>
            <button onClick={handleSave} disabled={loading} className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg shadow-sm" type="button">
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScriptEditorModal({
  isOpen,
  onClose,
  initialData,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialData: { ids: number[]; ideas: DetailRow[]; games: Game[]; theme?: VideoTheme | null };
  onSave: (data: Partial<ScriptProject>) => void;
}) {
  const [formData, setFormData] = useState<Partial<ScriptProject>>({
    title: "",
    content: "",
    description: "",
    hashtags: [],
    tags: [],
    publish_date: null,
    status: "Draft",
    assets: [],
  });
  const [activeTab, setActiveTab] = useState<"details" | "script" | "assets">("script");
  const [orderedIdeas, setOrderedIdeas] = useState<DetailRow[]>([]);
  const [draggedIdeaId, setDraggedIdeaId] = useState<number | null>(null);
  const [dragOverIdeaId, setDragOverIdeaId] = useState<number | null>(null);

  const findGameTitle = (idea: DetailRow) => {
    return initialData.games.find((candidate) => candidate.id === idea.game_id)?.title || idea.game?.title || "this game";
  };

  const ensurePeriod = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return trimmed;
    return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  };

  const smoothScriptDetail = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return trimmed;
    return /^(If|When|During|After|Before|At|Right|There|You|Most|But|And)\b/.test(trimmed)
      ? trimmed.charAt(0).toLowerCase() + trimmed.slice(1)
      : trimmed;
  };

  const buildScriptLine = (idea: DetailRow) => {
    const gameTitle = findGameTitle(idea);
    const rawDetail = (idea.description || idea.title || "").replace(/\s+/g, " ").replace(/^\[[^\]]+\]\s*/, "").trim();

    if (!rawDetail) return `In ${gameTitle}, ${smoothScriptDetail(idea.title)}`;
    if (/^in\s+/i.test(rawDetail)) return ensurePeriod(rawDetail);

    return ensurePeriod(`In ${gameTitle}, ${smoothScriptDetail(rawDetail)}`);
  };

  const buildDraftFromIdeas = (ideas: DetailRow[]) => {
    const titles = ideas.map((idea) => idea.title);
    const gameNames = Array.from(
      new Set(
        ideas
          .map((idea) => findGameTitle(idea))
          .filter(Boolean)
      )
    );
    const fullDescription = ideas.map((idea) => `• ${findGameTitle(idea)}: ${idea.title}\n${idea.description || ""}`).join("\n\n");
    const allAssets = ideas.flatMap(
      (idea) => idea.footage?.map((footage) => ({ url: footage.file_path, name: footage.title || footage.file_path.split("/").pop() || "Video" })) || []
    );

    const theme = initialData.theme ?? null;
    const themePrefix = theme ? `${theme.title}: ` : "Video Script: ";
    const themeDescription = theme ? `Topic: ${theme.title}${theme.hook ? `\nHook: ${theme.hook}` : ""}\n\n` : "";
    const themeTags = theme ? [theme.title] : [];
    const themeHashtag = theme ? [themeToHashtag(theme)] : [];
    const ideaBlocks = ideas.map(buildScriptLine).join("\n\n");
    const openingHook = theme?.hook?.trim() || "";

    return {
      title: `${themePrefix}${titles[0] || "Untitled"}${titles.length > 1 ? "..." : ""}`,
      content: openingHook ? `${openingHook}\n\n${ideaBlocks}` : ideaBlocks,
      description: `${themeDescription}Video tổng hợp các chi tiết thú vị.\n\n${fullDescription}`,
      assets: allAssets,
      tags: Array.from(new Set([...themeTags, ...gameNames, "Shorts", "Gaming", "Game Facts"])),
      hashtags: Array.from(new Set(["#shorts", "#gaming", ...themeHashtag, ...gameNames.map((gameName) => `#${gameName.replace(/\s+/g, "").toLowerCase()}`)])),
    };
  };

  useEffect(() => {
    if (isOpen && initialData.ideas.length > 0) {
      setOrderedIdeas(initialData.ideas);
      setFormData({
        ...buildDraftFromIdeas(initialData.ideas),
        status: "Draft",
        publish_date: null,
      });
      setActiveTab("script");
      setDraggedIdeaId(null);
      setDragOverIdeaId(null);
    }
  }, [isOpen, initialData.ideas, initialData.games, initialData.theme]);

  const applyIdeaOrder = (nextIdeas: DetailRow[]) => {
    setOrderedIdeas(nextIdeas);
    const draft = buildDraftFromIdeas(nextIdeas);
    setFormData((current) => ({
      ...current,
      title: draft.title,
      content: draft.content,
      description: draft.description,
      assets: draft.assets,
      tags: draft.tags,
      hashtags: draft.hashtags,
    }));
  };

  const moveIdea = (sourceId: number, targetId: number) => {
    if (sourceId === targetId) return;

    const sourceIndex = orderedIdeas.findIndex((idea) => idea.id === sourceId);
    const targetIndex = orderedIdeas.findIndex((idea) => idea.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextIdeas = [...orderedIdeas];
    const [movedIdea] = nextIdeas.splice(sourceIndex, 1);
    nextIdeas.splice(targetIndex, 0, movedIdea);
    applyIdeaOrder(nextIdeas);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="flex h-[94vh] w-full max-w-[min(80rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 sm:rounded-3xl lg:h-[92vh] dark:border-slate-800 dark:bg-slate-950" onClick={(event) => event.stopPropagation()}>
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-5 dark:border-slate-800 dark:bg-slate-950">
          <div>
            <h2 className="text-xl font-black text-slate-900 sm:text-2xl dark:text-slate-50">Create Video Script</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">Drafting from {orderedIdeas.length || initialData.ideas.length} ideas</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button onClick={onClose} className="cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100 sm:px-5 sm:py-3 dark:text-slate-300 dark:hover:bg-slate-800" type="button">Cancel</button>
            <button onClick={() => { onSave(formData); onClose(); }} className="cursor-pointer rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-blue-700 active:scale-[0.98] sm:px-8 sm:py-3" type="button">Save Project</button>
          </div>
        </div>

        <div className="flex overflow-x-auto border-b border-slate-100 bg-slate-50 px-2 sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900/60">
          {(["script", "details", "assets"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`shrink-0 cursor-pointer border-b-2 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] transition sm:px-6 sm:py-4 sm:text-sm ${activeTab === tab ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"}`} type="button">
              {tab === "script" ? "Content" : tab === "details" ? "Metadata" : "Assets"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/40 p-3 sm:p-5 dark:bg-slate-950 lg:p-8">
          {activeTab === "script" && (
            <div className="grid min-h-[420px] gap-4 lg:min-h-[560px] xl:grid-cols-[340px_minmax(0,1fr)] xl:gap-5">
              <aside className="flex min-h-0 max-h-[280px] flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:max-h-none lg:rounded-3xl dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-500 dark:text-blue-300">Idea Order</p>
                    <p className="mt-1 text-xs font-bold text-slate-400 dark:text-slate-500">Drag details to arrange the script.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">{orderedIdeas.length}</span>
                </div>

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {orderedIdeas.map((idea, index) => {
                    const isDragOver = dragOverIdeaId === idea.id && draggedIdeaId !== idea.id;
                    return (
                      <div
                        key={idea.id}
                        draggable
                        onDragStart={(event) => {
                          setDraggedIdeaId(idea.id);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", String(idea.id));
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          setDragOverIdeaId(idea.id);
                        }}
                        onDragLeave={() => setDragOverIdeaId((current) => current === idea.id ? null : current)}
                        onDrop={(event) => {
                          event.preventDefault();
                          const sourceId = Number(event.dataTransfer.getData("text/plain") || draggedIdeaId);
                          if (Number.isFinite(sourceId)) moveIdea(sourceId, idea.id);
                          setDraggedIdeaId(null);
                          setDragOverIdeaId(null);
                        }}
                        onDragEnd={() => {
                          setDraggedIdeaId(null);
                          setDragOverIdeaId(null);
                        }}
                        className={`group flex cursor-grab items-start gap-3 rounded-2xl border p-3 text-left shadow-sm transition active:cursor-grabbing ${isDragOver ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100 dark:border-blue-500 dark:bg-blue-500/10 dark:ring-blue-500/20" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:bg-slate-900"}`}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-black text-slate-400 shadow-sm dark:bg-slate-800 dark:text-slate-300">{index + 1}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-sm font-black text-slate-800 dark:text-slate-100">{findGameTitle(idea)}</p>
                            <Bars3Icon className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300" />
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{idea.title}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </aside>

              <textarea
                className="min-h-[420px] w-full resize-none rounded-2xl border border-slate-200 bg-white p-5 font-sans text-base leading-7 text-slate-800 shadow-sm outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:p-6 sm:text-[17px] sm:leading-8 lg:min-h-[560px] lg:rounded-3xl lg:p-8 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600"
                value={formData.content}
                onChange={(event) => setFormData({ ...formData, content: event.target.value })}
              />
            </div>
          )}

          {activeTab === "details" && (
            <div className="mx-auto max-w-5xl space-y-8">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Title</label>
                <input className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-5 text-lg font-bold outline-none shadow-sm focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Description</label>
                <textarea className="h-64 w-full rounded-2xl border border-slate-200 bg-white p-5 text-base leading-7 outline-none shadow-sm focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} />
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:gap-10">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400"><HashtagIcon className="h-4 w-4" /> Hashtags</label>
                  <div className="flex flex-wrap gap-2">
                    {formData.hashtags?.map((tag, index) => (
                      <span key={index} className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400"><TagIcon className="h-4 w-4" /> Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags?.map((tag, index) => (
                      <span key={index} className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "assets" && (
            <div className="mx-auto max-w-5xl space-y-6">
              <div className="flex items-center justify-between px-1">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Selected Footage</label>
                <button onClick={() => navigator.clipboard.writeText(formData.assets?.map((asset) => asset.url).join("\n") || "")} className="flex cursor-pointer items-center gap-1 text-xs font-bold text-blue-600 hover:underline" type="button">
                  <DocumentDuplicateIcon className="h-4 w-4" /> Copy All Links
                </button>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-50 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                {(formData.assets || []).length > 0 ? (
                  formData.assets?.map((asset, index) => (
                    <div key={index} className="group flex items-center gap-6 p-6 transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500 dark:bg-slate-800 dark:text-slate-500 dark:group-hover:bg-blue-500/15 dark:group-hover:text-blue-300">#{index + 1}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-bold text-slate-700 dark:text-slate-100">{asset.name}</p>
                        <p className="mt-1 truncate font-sans text-xs text-slate-400">{asset.url}</p>
                      </div>
                      <a href={asset.url} target="_blank" rel="noopener noreferrer" className="cursor-pointer rounded-xl bg-slate-100 p-3 text-slate-400 shadow-sm transition hover:bg-blue-600 hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-blue-600 dark:hover:text-white">
                        <VideoCameraIcon className="h-5 w-5" />
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="p-16 text-center text-base italic text-slate-400">No assets linked to these ideas.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function IdeaItem({
  r,
  game,
  isSelectMode,
  isSelected,
  onToggleSelect,
  onTogglePin,
  onEditGame,
  onQuickView,
}: {
  r: DetailRow;
  game?: Game;
  isSelectMode: boolean;
  isSelected: boolean;
  onToggleSelect: (idea: DetailRow) => void;
  onTogglePin: (id: number, current: boolean) => void;
  onEditGame: (game: Game) => void;
  onQuickView: (idea: DetailRow) => void;
}) {
  const hasCover = !!game?.cover_url;

  return (
    <li onClick={() => isSelectMode && onToggleSelect(r)} className={`group relative h-64 w-full overflow-hidden rounded-2xl border shadow-sm transition-shadow duration-150 ${isSelectMode ? "cursor-pointer active:scale-[0.99]" : "hover:shadow-xl"} ${isSelected ? "border-blue-500 ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-50" : "border-slate-200 bg-slate-900"}`}>
      {hasCover ? (
        <div className={`absolute inset-0 bg-cover bg-center opacity-60 transition-opacity duration-150 ${isSelectMode ? "" : "group-hover:opacity-45"}`} style={{ backgroundImage: `url(${game.cover_url})` }} />
      ) : (
        <div className="absolute inset-0 bg-slate-800 opacity-50" />
      )}
      <div className={`absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent ${isSelected ? "opacity-90 bg-blue-900/20" : ""}`} />
      {isSelectMode && (
        <>
          <button
            onClick={(event) => { event.stopPropagation(); onQuickView(r); }}
            className="absolute left-3 top-3 z-30 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/35 text-white shadow-lg backdrop-blur-md transition hover:bg-emerald-500 hover:border-emerald-400 active:scale-95"
            title="Preview idea"
            aria-label={`Preview idea: ${r.title}`}
            type="button"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <div className="absolute top-3 right-3 z-30">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${isSelected ? "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "border-white/60 bg-black/25 backdrop-blur-md"}`}>
              {isSelected && <CheckIcon className="h-4 w-4 stroke-[3]" />}
            </div>
          </div>
        </>
      )}
      <div className="absolute inset-0 flex flex-col justify-end p-5">
        <div className="z-10">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 z-20 relative">
            <span className="truncate max-w-[80%]">{game?.title}</span>
            {!isSelectMode && game && (
              <button onClick={(event) => { event.stopPropagation(); onEditGame(game); }} className="cursor-pointer rounded p-1 text-slate-500 opacity-0 transition-opacity hover:bg-white/20 hover:text-white group-hover:opacity-100" type="button">
                <PencilSquareIcon className="h-3 w-3" />
              </button>
            )}
          </div>
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-white mb-2">{r.title}</h3>
          <div className="flex items-center gap-2">
            <TypePill typeKey={r.detail_type} />
            {r.pinned && <span className="text-[10px] font-bold text-amber-400">★ Pinned</span>}
          </div>
        </div>
      </div>
      {!isSelectMode && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex flex-col gap-2">
          <button onClick={(event) => { event.stopPropagation(); onTogglePin(r.id, !!r.pinned); }} className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full shadow-lg backdrop-blur-md transition-colors duration-150 ${r.pinned ? "bg-amber-400 text-white" : "bg-white/10 text-white hover:bg-white/20"}`} type="button">
            {r.pinned ? "★" : "☆"}
          </button>
          <button onClick={(event) => { event.stopPropagation(); onQuickView(r); }} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white shadow-lg backdrop-blur-md transition-colors duration-150 hover:bg-emerald-500" title="Quick Preview" type="button">
            <EyeIcon className="h-4 w-4" />
          </button>
        </div>
      )}
      <Link href={`/idea/${r.id}`} className={`absolute inset-0 z-0 ${isSelectMode ? "hidden" : ""}`} aria-label={`Open idea detail: ${r.title}`} />
    </li>
  );
}
