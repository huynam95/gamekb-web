"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AppSidebar } from "@/components/AppSidebar";
import { AppPageHeader, appPageMainClass, appPageRootClass } from "@/components/AppPage";
import { useNotifications } from "@/components/NotificationCenter";
import { analyzeAssetLinks } from "@/lib/assetLinks";
import { buildScriptGuide } from "@/lib/scriptGuide";
import {
  TrashIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  InformationCircleIcon,
  Squares2X2Icon,
  LinkIcon,
  CheckIcon,
  XMarkIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  VideoCameraIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";

/* ================= TYPES & CONFIG ================= */

type ScriptProject = {
  id: number;
  title: string;
  content: string;
  assets: {
    url: string;
    name: string;
    channel_name?: string | null;
    idea_id?: number | null;
    idea_title?: string | null;
    game_title?: string | null;
    idea_order?: number | null;
  }[];
  description: string;
  hashtags: string[];
  tags: string[];
  status: "Draft" | "Filming" | "Edited" | "Published";
  created_at: string;
};

const STATUS_STYLE: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  Filming: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  Edited: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
  Published: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
};

function getScriptTopic(script: ScriptProject) {
  const description = script.description || "";
  const match = description.match(/(?:^|\n)\s*Topic:\s*(.+?)(?:\n|$)/i);
  const topicFromDescription = match?.[1]?.trim();
  if (topicFromDescription) return topicFromDescription;

  const topicTag = script.tags?.find((tag) => /^games\s|^afk\s|details/i.test(tag));
  return topicTag || "No topic";
}

function getScriptSummary(script: ScriptProject) {
  const description = script.description || "";
  const cleaned = description
    .split("\n")
    .filter((line) => !/^\s*(Topic|Hook):/i.test(line))
    .join("\n")
    .trim();

  return cleaned || "No summary...";
}

function getScriptChannels(script: ScriptProject) {
  return Array.from(
    new Set(
      (script.assets || [])
        .map((asset) => asset.channel_name?.trim())
        .filter((channel): channel is string => Boolean(channel)),
    ),
  );
}

async function enrichScriptsWithFootageChannels(rows: ScriptProject[]) {
  const urls = Array.from(
    new Set(
      rows.flatMap((script) =>
        (script.assets || [])
          .filter((asset) => !asset.channel_name && asset.url?.trim())
          .map((asset) => asset.url.trim()),
      ),
    ),
  );

  if (urls.length === 0) return rows;

  const channelByUrl = new Map<string, string>();
  for (let index = 0; index < urls.length; index += 100) {
    const batch = urls.slice(index, index + 100);
    const { data, error } = await supabase
      .from("footage")
      .select("file_path,channel_name")
      .in("file_path", batch);

    // Older databases may not have channel_name yet. Keep projects usable instead of failing the page.
    if (error) return rows;

    for (const item of data || []) {
      const url = String((item as { file_path?: string }).file_path || "").trim();
      const channel = String((item as { channel_name?: string | null }).channel_name || "").trim();
      if (url && channel) channelByUrl.set(url, channel);
    }
  }

  if (channelByUrl.size === 0) return rows;

  return rows.map((script) => ({
    ...script,
    assets: (script.assets || []).map((asset) => ({
      ...asset,
      channel_name: asset.channel_name || channelByUrl.get(asset.url?.trim()) || null,
    })),
  }));
}

function getTopicVisual(topic: string) {
  const normalized = topic.toLowerCase();

  if (topic === "No topic") return { emoji: "🎬", className: "from-slate-200 to-slate-100 text-slate-500 dark:from-slate-800 dark:to-slate-900 dark:text-slate-300" };
  if (normalized.includes("troll other")) return { emoji: "🎮", className: "from-fuchsia-500 to-violet-600 text-white" };
  if (normalized.includes("troll")) return { emoji: "🃏", className: "from-pink-500 to-rose-500 text-white" };
  if (normalized.includes("remember")) return { emoji: "🧠", className: "from-indigo-500 to-blue-600 text-white" };
  if (normalized.includes("punish")) return { emoji: "⚡", className: "from-amber-400 to-orange-500 text-white" };
  if (normalized.includes("fourth") || normalized.includes("wall")) return { emoji: "🪞", className: "from-cyan-400 to-sky-500 text-white" };
  if (normalized.includes("afk")) return { emoji: "⏳", className: "from-emerald-400 to-teal-500 text-white" };
  if (normalized.includes("detail") || normalized.includes("noticed")) return { emoji: "🔎", className: "from-blue-400 to-cyan-500 text-white" };
  if (normalized.includes("unexpected")) return { emoji: "✦", className: "from-violet-500 to-indigo-600 text-white" };

  return { emoji: "🎥", className: "from-blue-500 to-violet-600 text-white" };
}

/* ================= MODAL: STUDIO WORKSPACE ================= */

function ScriptEditorModal({ isOpen, onClose, script, onSave }: any) {
  const [formData, setFormData] = useState<Partial<ScriptProject>>({
    title: "",
    content: "",
    description: "",
    hashtags: [],
    tags: [],
    status: "Draft",
    assets: [],
  });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [activeTab, setActiveTab] = useState<"script" | "metadata" | "assets">("script");
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);
  const scriptTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSnapshotRef = useRef("");
  const latestFormDataRef = useRef<Partial<ScriptProject>>(formData);
  const saveVersionRef = useRef(0);
  const hydratedScriptIdRef = useRef<number | null>(null);
  const onSaveRef = useRef(onSave);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const { success, error: notifyError } = useNotifications();

  const assetAnalysis = useMemo(() => analyzeAssetLinks(formData.assets || []), [formData.assets]);
  const scriptGuide = useMemo(() => buildScriptGuide(String(formData.content || "")), [formData.content]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (isOpen && script) {
      hydratedScriptIdRef.current = null;
      setFormData(script);
      latestFormDataRef.current = script;
      lastSavedSnapshotRef.current = JSON.stringify(script);
      setSaveState("saved");
      setIsEditingTitle(false);
      setActiveTab("script");
      setDraggedSectionId(null);
      setDragOverSectionId(null);
    }
  }, [isOpen, script?.id]);

  const saveNow = async (data: Partial<ScriptProject>) => {
    if (!script) return true;
    const snapshot = JSON.stringify(data);
    if (snapshot === lastSavedSnapshotRef.current) {
      setSaveState("saved");
      return true;
    }

    const version = ++saveVersionRef.current;
    setSaveState("saving");
    const ok = await onSaveRef.current(data);
    if (ok === false) {
      if (version === saveVersionRef.current) setSaveState("error");
      return false;
    }

    lastSavedSnapshotRef.current = snapshot;
    if (version === saveVersionRef.current) {
      const latestSnapshot = JSON.stringify(latestFormDataRef.current);
      setSaveState(latestSnapshot === snapshot ? "saved" : "saving");
    }
    return true;
  };

  useEffect(() => {
    latestFormDataRef.current = formData;
    if (!isOpen || !script) return;

    const snapshot = JSON.stringify(formData);
    const initialSnapshot = JSON.stringify(script);
    if (hydratedScriptIdRef.current !== script.id) {
      if (snapshot === initialSnapshot) hydratedScriptIdRef.current = script.id;
      return;
    }
    if (snapshot === lastSavedSnapshotRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveState("saving");
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void saveNow(latestFormDataRef.current);
    }, 350);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [formData, isOpen, script?.id]);

  const closeWithSave = async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await saveNow(latestFormDataRef.current);
    onClose();
  };

  const jumpToScriptSection = (start: number, end: number) => {
    setActiveTab("script");
    requestAnimationFrame(() => {
      const textarea = scriptTextareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(start, end);
    });
  };

  const getSectionChannels = (section: (typeof scriptGuide)[number]) => {
    if (section.isHook) return [] as string[];
    const assets = formData.assets || [];
    const normalizedLabel = section.label.trim().toLowerCase();
    const matched = assets.filter((asset) =>
      (section.number != null && asset.idea_order === section.number) ||
      Boolean(asset.game_title && asset.game_title.trim().toLowerCase() === normalizedLabel),
    );
    const fallback = matched.length > 0
      ? matched
      : section.number != null && assets[section.number - 1]
        ? [assets[section.number - 1]]
        : [];

    return Array.from(
      new Set(
        fallback
          .map((asset) => asset.channel_name?.trim())
          .filter((channel): channel is string => Boolean(channel)),
      ),
    );
  };

  const moveScriptSection = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const content = String(formData.content || "");
    const sections = buildScriptGuide(content);
    const hook = sections.find((section) => section.isHook);
    const ideaSections = sections.filter((section) => !section.isHook);
    const sourceIndex = ideaSections.findIndex((section) => section.id === sourceId);
    const targetIndex = ideaSections.findIndex((section) => section.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const blocks = new Map(sections.map((section) => [section.id, content.slice(section.start, section.end).trim()]));
    const nextSections = [...ideaSections];
    const [moved] = nextSections.splice(sourceIndex, 1);
    nextSections.splice(targetIndex, 0, moved);

    const nextContent = [
      hook ? blocks.get(hook.id) : null,
      ...nextSections.map((section) => blocks.get(section.id)),
    ].filter((block): block is string => Boolean(block)).join("\n\n");

    const nextOrderByOldNumber = new Map<number, number>();
    nextSections.forEach((section, index) => {
      if (section.number != null) nextOrderByOldNumber.set(section.number, index + 1);
    });

    const nextAssets = [...(formData.assets || [])].map((asset) => ({
      ...asset,
      idea_order: asset.idea_order != null
        ? nextOrderByOldNumber.get(asset.idea_order) ?? asset.idea_order
        : asset.idea_order,
    })).sort((a, b) => (a.idea_order ?? Number.MAX_SAFE_INTEGER) - (b.idea_order ?? Number.MAX_SAFE_INTEGER));

    setFormData((current) => ({ ...current, content: nextContent, assets: nextAssets }));
  };

  const copyWholeScript = async () => {
    const content = String(formData.content || "").trim();
    if (!content) {
      notifyError("There is no script content to copy.", "Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
      success("The full script is ready on your clipboard.", "Script copied");
    } catch {
      notifyError("The browser could not copy the script. Please select the text manually.", "Copy failed");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/70 p-2 sm:p-4 lg:p-6 backdrop-blur-md"
      onClick={() => void closeWithSave()}
    >
      <div
        className="flex h-[94vh] w-full max-w-[min(1300px,calc(100vw-1rem))] flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl sm:rounded-[2rem] lg:h-[90vh] lg:rounded-[2.5rem] dark:border-slate-800 dark:bg-slate-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10 lg:py-7 dark:border-slate-800">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5">
            <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-100 dark:shadow-blue-950/40">
              <DocumentTextIcon className="h-7 w-7" />
            </div>
            <div className="flex flex-1 flex-col">
              <div className="flex items-center gap-3">
                {isEditingTitle ? (
                  <input
                    autoFocus
                    className="w-full max-w-xl rounded-xl border-2 border-blue-500 bg-slate-50 px-4 py-2 text-2xl font-black text-slate-900 outline-none dark:bg-slate-900 dark:text-slate-50"
                    value={formData.title || ""}
                    onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                    onBlur={() => setIsEditingTitle(false)}
                  />
                ) : (
                  <h2 className="line-clamp-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">{formData.title}</h2>
                )}
                <button
                  onClick={() => setIsEditingTitle(!isEditingTitle)}
                  className="cursor-pointer rounded-xl p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                  type="button"
                >
                  {isEditingTitle ? <CheckIcon className="h-6 w-6 text-green-600" /> : <PencilSquareIcon className="h-5 w-5 text-slate-400" />}
                </button>
              </div>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">Video Project Studio</p>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-5">
            <select
              className="h-11 cursor-pointer rounded-2xl bg-slate-100 px-4 text-sm font-black outline-none dark:bg-slate-900 dark:text-slate-100"
              value={formData.status || "Draft"}
              onChange={(event) => setFormData({ ...formData, status: event.target.value as any })}
            >
              {Object.keys(STATUS_STYLE).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <div
              className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-xs font-black uppercase tracking-[0.12em] ${
                saveState === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
                  : saveState === "saving"
                    ? "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300"
                    : "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
              }`}
              title="Changes are saved automatically"
            >
              <CheckIcon className={`h-4 w-4 ${saveState === "saving" ? "animate-pulse" : ""}`} />
              {saveState === "error" ? "Save failed" : saveState === "saving" ? "Saving" : "Saved"}
            </div>
          </div>
        </div>

        <div className="flex overflow-x-auto border-b border-slate-100 bg-slate-50/50 px-2 sm:px-4 lg:px-10 dark:border-slate-800 dark:bg-slate-900/60">
          {[
            { id: "script", label: "Script", icon: DocumentTextIcon },
            { id: "metadata", label: "Metadata", icon: InformationCircleIcon },
            { id: "assets", label: "Assets", icon: Squares2X2Icon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex shrink-0 cursor-pointer items-center gap-2 border-b-4 px-4 py-4 text-xs font-black uppercase tracking-[0.16em] transition-all sm:gap-3 sm:px-6 lg:px-8 lg:py-5 lg:tracking-[0.2em] ${
                activeTab === tab.id ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-100"
              }`}
              type="button"
            >
              <tab.icon className="h-5 w-5" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto bg-white p-4 sm:p-6 lg:p-12 dark:bg-slate-950">
          {activeTab === "script" && (
            <div className="grid min-h-[420px] gap-4 lg:min-h-[560px] xl:grid-cols-[340px_minmax(0,1fr)] xl:gap-5">
              <aside className="flex min-h-0 max-h-[300px] flex-col rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm sm:p-4 xl:max-h-none xl:rounded-3xl dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-500 dark:text-blue-300">Script Order</p>
                    <p className="mt-1 text-xs font-bold text-slate-400 dark:text-slate-500">Drag to reorder. Click a card to jump to that section.</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">{scriptGuide.filter((section) => !section.isHook).length}</span>
                </div>

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {scriptGuide.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs font-bold text-slate-400 dark:border-slate-700 dark:text-slate-500">No script sections found.</div>
                  )}
                  {scriptGuide.map((section) => {
                    const channels = getSectionChannels(section);
                    const isDragOver = dragOverSectionId === section.id && draggedSectionId !== section.id;
                    return (
                      <div
                        key={section.id}
                        draggable={!section.isHook}
                        onClick={() => jumpToScriptSection(section.start, section.end)}
                        onDragStart={(event) => {
                          if (section.isHook) return;
                          setDraggedSectionId(section.id);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", section.id);
                        }}
                        onDragOver={(event) => {
                          if (section.isHook) return;
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          setDragOverSectionId(section.id);
                        }}
                        onDragLeave={() => setDragOverSectionId((current) => current === section.id ? null : current)}
                        onDrop={(event) => {
                          if (section.isHook) return;
                          event.preventDefault();
                          const sourceId = event.dataTransfer.getData("text/plain") || draggedSectionId;
                          if (sourceId) moveScriptSection(sourceId, section.id);
                          setDraggedSectionId(null);
                          setDragOverSectionId(null);
                        }}
                        onDragEnd={() => {
                          setDraggedSectionId(null);
                          setDragOverSectionId(null);
                        }}
                        className={`group flex items-start gap-3 rounded-2xl border p-3 text-left shadow-sm transition ${section.isHook ? "cursor-pointer border-violet-200 bg-violet-50 hover:bg-violet-100 dark:border-violet-500/25 dark:bg-violet-500/10 dark:hover:bg-violet-500/15" : `cursor-grab active:cursor-grabbing ${isDragOver ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100 dark:border-blue-500 dark:bg-blue-500/10 dark:ring-blue-500/20" : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"}`}`}
                      >
                        <div className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded-xl px-1 text-xs font-black shadow-sm ${section.isHook ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"}`}>
                          {section.isHook ? "H" : section.number}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className={`truncate text-sm font-black ${section.isHook ? "text-violet-800 dark:text-violet-200" : "text-slate-800 dark:text-slate-100"}`}>{section.label}</p>
                            {!section.isHook && <Bars3Icon className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300" />}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{section.preview}</p>
                          {channels.length > 0 && (
                            <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[10px] font-black text-rose-600 dark:text-rose-300" title={channels.join(", ")}>
                              <VideoCameraIcon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{channels[0]}</span>
                              {channels.length > 1 && <span className="shrink-0 text-slate-400 dark:text-slate-500">+{channels.length - 1}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </aside>

              <div className="flex min-w-0 flex-col gap-3">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Script Content</p>
                    <p className="mt-1 text-xs font-bold text-slate-400 dark:text-slate-500">The order panel stays outside the copied script.</p>
                  </div>
                  <button
                    type="button"
                    onClick={copyWholeScript}
                    className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" /> Copy Script
                  </button>
                </div>

                <textarea
                  ref={scriptTextareaRef}
                  className="min-h-[420px] w-full flex-1 resize-none rounded-2xl border border-slate-200 bg-white p-5 font-sans text-base leading-7 text-slate-800 shadow-sm outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:p-6 sm:text-[17px] sm:leading-8 lg:min-h-[500px] lg:rounded-3xl lg:p-8 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600"
                  value={formData.content || ""}
                  onChange={(event) => setFormData({ ...formData, content: event.target.value })}
                />
              </div>
            </div>
          )}

          {activeTab === "metadata" && (
            <div className="mx-auto max-w-4xl space-y-8">
              <div className="space-y-4">
                <label className="ml-4 block text-xs font-black uppercase tracking-widest text-slate-400">Video Summary Description</label>
                <textarea
                  className="h-64 w-full resize-none rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5 text-base font-bold leading-relaxed text-slate-700 outline-none sm:p-8 lg:rounded-[2rem] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  value={formData.description || ""}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                />
                <div className="flex flex-wrap gap-2 pt-4">
                  {formData.hashtags?.map((tag, index) => (
                    <span key={index} className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black text-blue-600 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300">
                      {tag.startsWith("#") ? tag : `#${tag}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "assets" && (
            <div className="mx-auto max-w-4xl space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Project Assets</p>
                  <p className="mt-1 text-xs font-bold text-slate-400 dark:text-slate-500">
                    {(formData.assets || []).length} entries · {assetAnalysis.uniqueLinkCount} unique links
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(assetAnalysis.uniqueAssets.map((asset) => asset.url).filter(Boolean).join("\n"))}
                  className="inline-flex cursor-pointer items-center gap-2 self-start rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100 sm:self-auto dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300"
                >
                  <DocumentDuplicateIcon className="h-4 w-4" /> Copy Unique Links
                </button>
              </div>

              {assetAnalysis.repeatedLinkCount > 0 && (
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-100/80 p-4 text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
                  <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-300" />
                  <div>
                    <p className="text-sm font-black">{assetAnalysis.repeatedLinkCount} duplicate {assetAnalysis.repeatedLinkCount === 1 ? "link" : "links"} detected</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
                      Download only the first occurrence. Equivalent YouTube watch, Shorts, embed, live, and youtu.be URLs are treated as the same source video.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid gap-3">
                {formData.assets?.map((asset, index) => {
                  const duplicate = assetAnalysis.duplicateMeta.get(index);
                  const isRepeated = duplicate && !duplicate.isPrimary;
                  const displayNumber = assetAnalysis.uniqueOrdinalByIndex.get(index);

                  return (
                    <div key={`${asset.url}-${index}`} className={`group flex items-center gap-4 rounded-2xl border p-4 transition-all sm:gap-5 sm:p-5 ${isRepeated ? "border-slate-300 bg-slate-100/80 dark:border-slate-700 dark:bg-slate-800/60" : "border-slate-200 bg-slate-50 hover:border-blue-500 dark:border-slate-800 dark:bg-slate-900"}`}>
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border font-black shadow-sm transition-all ${isRepeated ? "border-slate-300 bg-slate-200 text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300" : "border-slate-100 bg-white text-slate-400 group-hover:bg-blue-600 group-hover:text-white dark:border-slate-800 dark:bg-slate-950"}`}>
                        {isRepeated ? <LinkIcon className="h-5 w-5" /> : `#${displayNumber ?? ""}`}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className="truncate text-base font-black text-slate-900 dark:text-slate-50">{asset.name}</p>
                          {asset.channel_name && (
                            <span className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300">
                              {asset.channel_name}
                            </span>
                          )}
                          {duplicate && (
                            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${isRepeated ? "bg-slate-500 text-white dark:bg-slate-600" : "border border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                              {isRepeated ? "Duplicate" : `Same source ×${duplicate.total}`}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate font-mono text-xs font-bold text-slate-500">{asset.url}</p>
                      </div>
                      <a href={asset.url} target="_blank" rel="noopener noreferrer" className="shrink-0 cursor-pointer rounded-xl border border-slate-200 bg-white p-3 text-slate-400 shadow-sm hover:text-blue-600 dark:border-slate-800 dark:bg-slate-950">
                        <LinkIcon className="h-5 w-5" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= MAIN PAGE ================= */

export default function ScriptsPage() {
  const { success, error: notifyError, confirm } = useNotifications();
  const [scripts, setScripts] = useState<ScriptProject[]>([]);
  const [filteredScripts, setFilteredScripts] = useState<ScriptProject[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingScript, setEditingScript] = useState<ScriptProject | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    async function load() {
      const { data: sData } = await supabase.from("scripts").select("*").order("created_at", { ascending: false });
      const enrichedScripts = await enrichScriptsWithFootageChannels((sData || []) as ScriptProject[]);
      setScripts(enrichedScripts);
      setFilteredScripts(enrichedScripts);
    }
    load();
  }, []);

  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    const result = scripts.filter((script) => {
      const topic = getScriptTopic(script).toLowerCase();
      const channels = getScriptChannels(script).join(" ").toLowerCase();
      return (
        script.title?.toLowerCase().includes(query) ||
        script.description?.toLowerCase().includes(query) ||
        topic.includes(query) ||
        channels.includes(query)
      );
    });
    setFilteredScripts(result);
  }, [searchQuery, scripts]);

  const visibleIds = useMemo(() => filteredScripts.map((script) => script.id), [filteredScripts]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const toggleSelected = (id: number) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((current) => Array.from(new Set([...current, ...visibleIds])));
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingScript) return false;
    const { error } = await supabase.from("scripts").update(data).eq("id", editingScript.id);
    if (error) {
      notifyError(error.message, "Could not update project");
      return false;
    }
    setScripts((prev) => prev.map((script) => (script.id === editingScript.id ? { ...script, ...data } : script)));
    return true;
  };

  const handleDelete = async (id: number) => {
    const shouldDelete = await confirm({
      kind: "warning",
      title: "Delete project?",
      message: "Delete this video project?",
      confirmText: "Delete",
    });
    if (!shouldDelete) return;
    const { error } = await supabase.from("scripts").delete().eq("id", id);
    if (error) {
      notifyError(error.message, "Could not delete project");
      return;
    }
    setScripts((prev) => prev.filter((script) => script.id !== id));
    setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    success("Project deleted.", "Deleted");
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const shouldDelete = await confirm({
      kind: "warning",
      title: "Delete selected projects?",
      message: `Delete ${selectedIds.length} selected video project${selectedIds.length > 1 ? "s" : ""}?`,
      confirmText: "Delete selected",
    });
    if (!shouldDelete) return;

    const idsToDelete = [...selectedIds];
    const { error } = await supabase.from("scripts").delete().in("id", idsToDelete);
    if (error) {
      notifyError(error.message, "Could not delete projects");
      return;
    }
    setScripts((prev) => prev.filter((script) => !idsToDelete.includes(script.id)));
    setSelectedIds([]);
    success("Selected projects deleted.", "Deleted");
  };

  return (
    <div className={`${appPageRootClass} xl:flex`}>
      <ScriptEditorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} script={editingScript} onSave={handleUpdate} />

      <AppSidebar activePage="scripts" />

      <main className={appPageMainClass}>
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AppPageHeader
            title="Short Projects"
            description="Organize scripts, source channels, assets, topics, and production status in one place."
            icon={<DocumentTextIcon className="h-5 w-5" />}
          />
          <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full max-w-2xl">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-900 sm:left-6 sm:h-6 sm:w-6 dark:text-slate-200" />
              <input
                className="h-12 w-full rounded-[1.25rem] border-2 border-slate-200 bg-white pl-12 pr-4 text-base font-bold shadow-sm outline-none transition-all focus:border-slate-900 sm:h-16 sm:rounded-[1.5rem] sm:pl-16 sm:pr-12 sm:text-lg dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:focus:border-blue-500"
                placeholder="Search projects, topics, channels..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/40">
                <span className="text-sm font-black text-blue-700 dark:text-blue-300">{selectedIds.length} selected</span>
                <button
                  onClick={() => setSelectedIds([])}
                  className="flex cursor-pointer items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900"
                  type="button"
                >
                  <XMarkIcon className="h-4 w-4" /> Clear
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex cursor-pointer items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-rose-700 active:scale-[0.98]"
                  type="button"
                >
                  <TrashIcon className="h-4 w-4" /> Delete Selected
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="min-w-[1280px] table-fixed border-collapse text-left xl:w-full">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70">
                <tr>
                  <th className="w-[4%] px-6 py-7 text-center">
                    <input
                      type="checkbox"
                      aria-label="Select all visible projects"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      className="h-5 w-5 cursor-pointer rounded border-slate-300 accent-blue-600"
                    />
                  </th>
                  <th className="w-[27%] px-4 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Project</th>
                  <th className="w-[24%] px-4 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Topic</th>
                  <th className="w-[18%] px-4 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Channel</th>
                  <th className="w-[10%] px-4 py-7 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Status</th>
                  <th className="w-[9%] px-4 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Summary</th>
                  <th className="w-[8%] px-6 py-7 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredScripts.map((script) => {
                  const topic = getScriptTopic(script);
                  const topicVisual = getTopicVisual(topic);
                  const summary = getScriptSummary(script);
                  const channels = getScriptChannels(script);
                  const selected = selectedIds.includes(script.id);
                  const status = script.status || "Draft";

                  return (
                    <tr
                      key={script.id}
                      className={`group cursor-pointer transition-all ${selected ? "bg-blue-50/70 dark:bg-blue-950/30" : "hover:bg-slate-50/80 dark:hover:bg-slate-900/70"}`}
                      onClick={() => {
                        setEditingScript(script);
                        setIsModalOpen(true);
                      }}
                    >
                      <td className="px-6 py-9 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Select ${script.title}`}
                          checked={selected}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => toggleSelected(script.id)}
                          className="h-5 w-5 cursor-pointer rounded border-slate-300 accent-blue-600"
                        />
                      </td>
                      <td className="px-4 py-9">
                        <div className="flex items-center gap-3 lg:gap-5">
                          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl shadow-lg shadow-slate-200 transition-transform group-hover:scale-[1.03] dark:shadow-black/30 ${topicVisual.className}`}>
                            <span aria-hidden="true">{topicVisual.emoji}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-base font-black uppercase tracking-tight text-slate-900 dark:text-slate-50">{script.title}</p>
                            <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">{new Date(script.created_at).toLocaleDateString("vi-VN")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-9">
                        <div
                          title={topic}
                          className={`flex h-16 w-full items-center gap-3 rounded-[1.35rem] border px-4 shadow-sm transition-colors ${
                            topic === "No topic"
                              ? "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500"
                              : "border-violet-100 bg-violet-50 text-violet-800 dark:border-violet-900/70 dark:bg-violet-950/40 dark:text-violet-100"
                          }`}
                        >
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-lg shadow-sm ${topicVisual.className}`} aria-hidden="true">
                            {topicVisual.emoji}
                          </span>
                          <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left text-[15px] font-black tracking-tight">{topic}</span>
                        </div>
                      </td>
                      <td className="px-4 py-9">
                        <div
                          title={channels.length > 0 ? channels.join(" · ") : "No source channel saved"}
                          className={`flex h-16 w-full items-center gap-3 rounded-[1.35rem] border px-4 shadow-sm ${
                            channels.length > 0
                              ? "border-rose-100 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100"
                              : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500"
                          }`}
                        >
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${channels.length > 0 ? "bg-rose-600 text-white" : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`} aria-hidden="true">
                            <VideoCameraIcon className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate whitespace-nowrap text-sm font-black">{channels[0] || "Unknown channel"}</p>
                            {channels.length > 1 && (
                              <p className="mt-1 text-[10px] font-black uppercase tracking-wide opacity-65">+{channels.length - 1} more</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-9 text-center">
                        <span className={`rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-widest shadow-sm ${STATUS_STYLE[status] || STATUS_STYLE.Draft}`}>{status}</span>
                      </td>
                      <td className="px-4 py-9 text-sm font-bold italic leading-relaxed text-slate-700 dark:text-slate-300">
                        <p className="line-clamp-2 pr-6">{summary}</p>
                      </td>
                      <td className="px-6 py-9 text-right">
                        <div className="flex items-center justify-end gap-3 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditingScript(script);
                              setIsModalOpen(true);
                            }}
                            className="cursor-pointer rounded-xl border-2 border-slate-100 bg-white p-3 text-slate-900 shadow-sm transition-all hover:bg-slate-900 hover:text-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-blue-600"
                            type="button"
                          >
                            <PencilSquareIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(script.id);
                            }}
                            className="cursor-pointer rounded-xl border-2 border-slate-100 bg-white p-3 text-slate-400 shadow-sm transition-all hover:text-rose-600 dark:border-slate-800 dark:bg-slate-950 dark:hover:text-rose-400"
                            type="button"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredScripts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-10 py-20 text-center">
                      <p className="text-lg font-black text-slate-500 dark:text-slate-400">No video projects found.</p>
                      <p className="mt-2 text-sm font-bold text-slate-400">Try another search or create a new project from selected ideas.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
