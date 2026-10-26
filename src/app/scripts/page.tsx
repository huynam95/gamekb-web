"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
import { useDismiss } from "@/components/ui/useDismiss";
import { getTopicVisual as getSharedTopicVisual } from "@/lib/topicVisuals";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AppSidebar } from "@/components/AppSidebar";
import { AppPageHeader, appPageMainClass, appPageRootClass } from "@/components/AppPage";
import { useNotifications } from "@/components/NotificationCenter";
import { analyzeAssetLinks } from "@/lib/assetLinks";
import { buildScriptGuide } from "@/lib/scriptGuide";
import { getScriptTopic, getScriptTopicValue } from "@/lib/scriptTopics";
import { useProjectTopics } from "@/lib/useProjectTopics";
import { ProjectTopicSelect } from "@/components/ProjectTopicSelect";
import type { VideoTheme } from "@/lib/videoThemes";
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
  ArrowPathIcon,
  PlusIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";

/* ================= TYPES & CONFIG ================= */

type ScriptProject = {
  topic?: string | null;
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
  return getSharedTopicVisual(topic, -1);
}

/* ================= MODAL: STUDIO WORKSPACE ================= */

function ScriptEditorModal({ isOpen, onClose, script, onSave, onRefresh, topics, topicsLoading, topicsError, onRetryTopics }: {
  isOpen: boolean;
  onClose: () => void;
  script: ScriptProject | null;
  onSave: (data: Partial<ScriptProject>) => Promise<boolean>;
  onRefresh: (id: number) => Promise<ScriptProject | null>;
  topics: VideoTheme[];
  topicsLoading: boolean;
  topicsError: string;
  onRetryTopics: () => void;
}) {
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
  const assetSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAssetSyncedContentRef = useRef("");
  const lastSavedSnapshotRef = useRef("");
  const latestFormDataRef = useRef<Partial<ScriptProject>>(formData);
  const saveVersionRef = useRef(0);
  const hydratedScriptIdRef = useRef<number | null>(null);
  const onSaveRef = useRef(onSave);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [isRefreshing, setIsRefreshing] = useState(false);
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
      lastAssetSyncedContentRef.current = String(script.content || "");
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
    if (assetSyncTimerRef.current) {
      clearTimeout(assetSyncTimerRef.current);
      assetSyncTimerRef.current = null;
    }

    const latest = latestFormDataRef.current;
    const latestContent = String(latest.content || "");
    const syncedAssets = reconcileAssetsWithScript(
      lastAssetSyncedContentRef.current,
      latestContent,
      latest.assets || [],
    );
    const dataToSave = JSON.stringify(syncedAssets) === JSON.stringify(latest.assets || [])
      ? latest
      : { ...latest, assets: syncedAssets };

    latestFormDataRef.current = dataToSave;
    lastAssetSyncedContentRef.current = latestContent;
    const saved = await saveNow(dataToSave);
    if (saved) onClose();
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

    const nextFormData = { ...latestFormDataRef.current, content: nextContent, assets: nextAssets };
    latestFormDataRef.current = nextFormData;
    lastAssetSyncedContentRef.current = nextContent;
    setFormData(nextFormData);
  };

  const normalizeSectionBlock = (content: string, section: (typeof scriptGuide)[number]) =>
    content.slice(section.start, section.end).replace(/\s+/g, " ").trim().toLowerCase();

  const reconcileAssetsWithScript = (previousContent: string, nextContent: string, assets: ScriptProject["assets"]) => {
    const previousSections = buildScriptGuide(previousContent).filter((section) => !section.isHook);
    const nextSections = buildScriptGuide(nextContent).filter((section) => !section.isHook);

    if (nextSections.length >= previousSections.length) return assets;

    const usedPreviousIds = new Set<string>();
    const newOrderByOldOrder = new Map<number, number>();

    for (const nextSection of nextSections) {
      const exactText = normalizeSectionBlock(nextContent, nextSection);
      let previousSection = previousSections.find(
        (candidate) => !usedPreviousIds.has(candidate.id) && normalizeSectionBlock(previousContent, candidate) === exactText,
      );

      if (!previousSection) {
        const normalizedLabel = nextSection.label.trim().toLowerCase();
        const labelMatches = previousSections.filter(
          (candidate) => !usedPreviousIds.has(candidate.id) && candidate.label.trim().toLowerCase() === normalizedLabel,
        );
        if (labelMatches.length === 1) previousSection = labelMatches[0];
      }

      if (previousSection?.number != null && nextSection.number != null) {
        usedPreviousIds.add(previousSection.id);
        newOrderByOldOrder.set(previousSection.number, nextSection.number);
      }
    }

    const previousOrders = new Set(
      previousSections.map((section) => section.number).filter((value): value is number => value != null),
    );

    return assets
      .filter((asset) => asset.idea_order == null || !previousOrders.has(asset.idea_order) || newOrderByOldOrder.has(asset.idea_order))
      .map((asset) => ({
        ...asset,
        idea_order: asset.idea_order != null
          ? newOrderByOldOrder.get(asset.idea_order) ?? asset.idea_order
          : asset.idea_order,
      }))
      .sort((a, b) => (a.idea_order ?? Number.MAX_SAFE_INTEGER) - (b.idea_order ?? Number.MAX_SAFE_INTEGER));
  };

  const handleScriptContentChange = (nextContent: string) => {
    const nextFormData = { ...latestFormDataRef.current, content: nextContent };
    latestFormDataRef.current = nextFormData;
    setFormData(nextFormData);

    if (assetSyncTimerRef.current) clearTimeout(assetSyncTimerRef.current);
    assetSyncTimerRef.current = setTimeout(() => {
      assetSyncTimerRef.current = null;
      const previousContent = lastAssetSyncedContentRef.current;
      const latest = latestFormDataRef.current;
      const latestContent = String(latest.content || "");
      const nextAssets = reconcileAssetsWithScript(previousContent, latestContent, latest.assets || []);
      lastAssetSyncedContentRef.current = latestContent;

      if (JSON.stringify(nextAssets) !== JSON.stringify(latest.assets || [])) {
        const nextFormData = { ...latestFormDataRef.current, assets: nextAssets };
        latestFormDataRef.current = nextFormData;
        setFormData(nextFormData);
      }
    }, 650);
  };

  const refreshProject = async () => {
    if (!script || isRefreshing) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (assetSyncTimerRef.current) {
      clearTimeout(assetSyncTimerRef.current);
      assetSyncTimerRef.current = null;
    }

    const latest = latestFormDataRef.current;
    const latestContent = String(latest.content || "");
    const syncedAssets = reconcileAssetsWithScript(
      lastAssetSyncedContentRef.current,
      latestContent,
      latest.assets || [],
    );
    const dataToSave = JSON.stringify(syncedAssets) === JSON.stringify(latest.assets || [])
      ? latest
      : { ...latest, assets: syncedAssets };
    latestFormDataRef.current = dataToSave;
    lastAssetSyncedContentRef.current = latestContent;
    await saveNow(dataToSave);
    setIsRefreshing(true);
    try {
      const fresh = await onRefresh?.(script.id);
      if (!fresh) return;
      setFormData(fresh);
      latestFormDataRef.current = fresh;
      lastAssetSyncedContentRef.current = String(fresh.content || "");
      lastSavedSnapshotRef.current = JSON.stringify(fresh);
      setSaveState("saved");
      success("Project refreshed from the database.", "Refreshed");
    } catch {
      notifyError("Could not refresh the latest project data.", "Refresh failed");
    } finally {
      setIsRefreshing(false);
    }
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

  return (
    <Modal open={isOpen} onClose={() => void closeWithSave()} size="editor" zClass="z-[150]" className="max-w-[min(1300px,calc(100vw-1rem))] rounded-[1.5rem] sm:rounded-[2rem] lg:rounded-[2.5rem]">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10 lg:py-7 dark:border-slate-800">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5">
            <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-100 dark:shadow-blue-950/40">
              <DocumentTextIcon className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex flex-1 flex-col">
              <div className="flex min-w-0 items-center gap-3">
                {isEditingTitle ? (
                  <input
                    autoFocus
                    className="w-full max-w-xl rounded-xl border-2 border-blue-500 bg-slate-50 px-4 py-2 text-2xl font-black text-slate-900 outline-none dark:bg-slate-900 dark:text-slate-50"
                    value={formData.title || ""}
                    onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                    onBlur={() => setIsEditingTitle(false)}
                  />
                ) : (
                  <h2 title={String(formData.title || "Untitled project")} className="min-w-0 flex-1 truncate whitespace-nowrap text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">{formData.title}</h2>
                )}
                <button
                  onClick={() => setIsEditingTitle(!isEditingTitle)}
                  className="cursor-pointer rounded-xl p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                  type="button"
                >
                  {isEditingTitle ? <CheckIcon className="h-6 w-6 text-green-600" /> : <PencilSquareIcon className="h-5 w-5 text-fg-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-fg-4">Video Project Studio</p>
              <div className="mt-3 max-w-md">
                <ProjectTopicSelect label="Topic" value={getScriptTopicValue(formData)} topics={topics} loading={topicsLoading} onChange={(topic) => setFormData((current) => ({ ...current, topic }))} />
                {topicsError && <p role="alert" className="mt-2 text-xs text-rose-500">{topicsError} <button type="button" onClick={onRetryTopics} className="cursor-pointer font-bold underline">Retry</button></p>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-5">
            <select
              className="h-11 cursor-pointer rounded-2xl bg-slate-100 px-4 text-sm font-semibold outline-none dark:bg-slate-900 dark:text-slate-100"
              value={formData.status || "Draft"}
              onChange={(event) => setFormData({ ...formData, status: event.target.value as any })}
            >
              {Object.keys(STATUS_STYLE).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void refreshProject()}
              disabled={isRefreshing}
              title="Refresh project from database"
              className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-semibold uppercase tracking-wider text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-wait disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:text-blue-300"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <div
              className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-xs font-semibold uppercase tracking-wider ${
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
              className={`flex shrink-0 cursor-pointer items-center gap-2 border-b-4 px-4 py-4 text-xs font-semibold uppercase tracking-wider transition-all sm:gap-3 sm:px-6 lg:px-8 lg:py-5 lg:tracking-wider ${
                activeTab === tab.id ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-fg-4 hover:text-slate-700 dark:hover:text-slate-100"
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
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-300">Script Order</p>
                    <p className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">Drag to reorder. Click a card to jump to that section.</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">{scriptGuide.filter((section) => !section.isHook).length}</span>
                </div>

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {scriptGuide.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs font-medium text-slate-400 dark:border-slate-700 dark:text-slate-500">No script sections found.</div>
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
                        <div className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded-xl px-1 text-xs font-semibold shadow-sm ${section.isHook ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"}`}>
                          {section.isHook ? "H" : section.number}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className={`truncate text-sm font-semibold ${section.isHook ? "text-violet-800 dark:text-violet-200" : "text-slate-800 dark:text-slate-100"}`}>{section.label}</p>
                            {!section.isHook && <Bars3Icon className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300" />}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">{section.preview}</p>
                          {channels.length > 0 && (
                            <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-300" title={channels.join(", ")}>
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
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-4">Script Content</p>
                    <p className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">The order panel stays outside the copied script.</p>
                  </div>
                  <button
                    type="button"
                    onClick={copyWholeScript}
                    className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white pointer-coarse:min-h-11 shadow-sm transition hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" /> Copy Script
                  </button>
                </div>

                <textarea
                  ref={scriptTextareaRef}
                  className="min-h-[420px] w-full flex-1 resize-none rounded-2xl border border-slate-200 bg-white p-5 font-sans text-base leading-7 text-slate-800 shadow-sm outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:p-6 sm:text-[17px] sm:leading-8 lg:min-h-[500px] lg:rounded-3xl lg:p-8 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600"
                  value={formData.content || ""}
                  onChange={(event) => handleScriptContentChange(event.target.value)}
                />
              </div>
            </div>
          )}

          {activeTab === "metadata" && (
            <div className="mx-auto max-w-4xl space-y-8">
              <div className="space-y-4">
                <label className="ml-4 block text-xs font-semibold uppercase tracking-wider text-fg-4">Video Summary Description</label>
                <textarea
                  className="h-64 w-full resize-none rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5 text-base font-bold leading-relaxed text-slate-700 outline-none sm:p-8 lg:rounded-[2rem] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  value={formData.description || ""}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                />
                <div className="flex flex-wrap gap-2 pt-4">
                  {formData.hashtags?.map((tag, index) => (
                    <span key={index} className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-600 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300">
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
                  <p className="text-xs font-semibold uppercase tracking-wider text-fg-4">Project Assets</p>
                  <p className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">
                    {(formData.assets || []).length} entries · {assetAnalysis.uniqueLinkCount} unique links
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(assetAnalysis.uniqueAssets.map((asset) => asset.url).filter(Boolean).join("\n"))}
                  className="inline-flex cursor-pointer items-center gap-2 self-start rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 sm:self-auto dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300"
                >
                  <DocumentDuplicateIcon className="h-4 w-4" /> Copy Unique Links
                </button>
              </div>

              {assetAnalysis.repeatedLinkCount > 0 && (
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-100/80 p-4 text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
                  <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-300" />
                  <div>
                    <p className="text-sm font-semibold">{assetAnalysis.repeatedLinkCount} duplicate {assetAnalysis.repeatedLinkCount === 1 ? "link" : "links"} detected</p>
                    <p className="mt-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
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
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border font-black shadow-sm transition-all ${isRepeated ? "border-slate-300 bg-slate-200 text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300" : "border-slate-100 bg-white text-fg-4 group-hover:bg-blue-600 group-hover:text-white dark:border-slate-800 dark:bg-slate-950"}`}>
                        {isRepeated ? <LinkIcon className="h-5 w-5" /> : `#${displayNumber ?? ""}`}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className="truncate text-base font-bold text-slate-900 dark:text-slate-50">{asset.name}</p>
                          {asset.channel_name && (
                            <span className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300">
                              {asset.channel_name}
                            </span>
                          )}
                          {duplicate && (
                            <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${isRepeated ? "bg-slate-500 text-white dark:bg-slate-600" : "border border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                              {isRepeated ? "Duplicate" : `Same source ×${duplicate.total}`}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate font-mono text-xs font-medium text-fg-3">{asset.url}</p>
                      </div>
                      <a href={asset.url} target="_blank" rel="noopener noreferrer" className="shrink-0 cursor-pointer rounded-xl border border-slate-200 bg-white p-3 text-fg-4 shadow-sm hover:text-blue-600 dark:border-slate-800 dark:bg-slate-950">
                        <LinkIcon className="h-5 w-5" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
    </Modal>
  );
}

/* ================= MAIN PAGE ================= */

export default function ScriptsPage() {
  const { success, error: notifyError, confirm } = useNotifications();
  const [scripts, setScripts] = useState<ScriptProject[]>([]);
  const [loadingScripts, setLoadingScripts] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"All" | (typeof PROJECT_STATUSES)[number]>("All");
  const [topicFilter, setTopicFilter] = useState<string>(ALL_TOPICS);
  /** Checkboxes are hidden until the user starts selecting. */
  const [selectMode, setSelectMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingScript, setEditingScript] = useState<ScriptProject | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { topics, loading: topicsLoading, error: topicsError, retry: retryTopics } = useProjectTopics();
  const [savingTopicIds, setSavingTopicIds] = useState<Set<number>>(new Set());
  const pendingTopicIds = useRef(new Set<number>());
  const [creatingProject, setCreatingProject] = useState(false);
  const creatingProjectRef = useRef(false);

  useEffect(() => {
    async function load() {
      const { data: sData } = await supabase.from("scripts").select("*").order("created_at", { ascending: false });
      const enrichedScripts = await enrichScriptsWithFootageChannels((sData || []) as ScriptProject[]);
      setScripts(enrichedScripts);
      setLoadingScripts(false);
      // "Open project" links (e.g. after adding an idea) arrive as /scripts?open=<id>.
      const openId = Number(new URLSearchParams(window.location.search).get("open"));
      const toOpen = openId ? enrichedScripts.find((script) => script.id === openId) : undefined;
      if (toOpen) {
        setEditingScript(toOpen);
        setIsModalOpen(true);
      }
      if (openId) window.history.replaceState({}, "", "/scripts");
    }
    load();
  }, []);

  const filteredScripts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return scripts.filter((script) => {
      if (statusFilter !== "All" && (script.status || "Draft") !== statusFilter) return false;
      const topicValue = getScriptTopicValue(script);
      if (topicFilter === NO_TOPIC && topicValue) return false;
      if (topicFilter !== ALL_TOPICS && topicFilter !== NO_TOPIC && topicValue !== topicFilter) return false;
      if (!query) return true;
      const topic = getScriptTopic(script).toLowerCase();
      const channels = getScriptChannels(script).join(" ").toLowerCase();
      return (
        script.title?.toLowerCase().includes(query) ||
        script.description?.toLowerCase().includes(query) ||
        topic.includes(query) ||
        channels.includes(query)
      );
    });
  }, [searchQuery, scripts, statusFilter, topicFilter]);

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

  const refreshScriptProject = async (id: number) => {
    const { data, error } = await supabase.from("scripts").select("*").eq("id", id).single();
    if (error || !data) {
      notifyError(error?.message || "Could not load the latest project data.", "Refresh failed");
      return null;
    }

    const [fresh] = await enrichScriptsWithFootageChannels([data as ScriptProject]);
    if (!fresh) return null;
    setScripts((current) => current.map((item) => (item.id === id ? fresh : item)));
    setEditingScript(fresh);
    return fresh;
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

  const openProject = (script: ScriptProject) => {
    if (pendingTopicIds.current.has(script.id)) return;
    setEditingScript(script);
    setIsModalOpen(true);
  };

  const createProject = async () => {
    if (creatingProjectRef.current) return;
    creatingProjectRef.current = true;
    setCreatingProject(true);
    try {
      const response = await fetch("/api/scripts", { method: "POST", redirect: "error" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create project");
      const project = data as ScriptProject;
      setScripts((current) => [project, ...current]);
      setSearchQuery("");
      setEditingScript(project);
      setIsModalOpen(true);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Could not create project", "Project not created");
    } finally {
      creatingProjectRef.current = false;
      setCreatingProject(false);
    }
  };

  const changeProjectTopic = async (script: ScriptProject, topic: string) => {
    if (pendingTopicIds.current.has(script.id)) return;
    pendingTopicIds.current.add(script.id);
    setSavingTopicIds((current) => new Set(current).add(script.id));
    try {
      const response = await fetch(`/api/scripts/${script.id}/topic`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
        redirect: "error",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save topic");
      setScripts((current) => current.map((item) => item.id === script.id ? { ...item, topic: data.topic } : item));
      setEditingScript((current) => current?.id === script.id ? { ...current, topic: data.topic } : current);
      success("Project topic saved.", "Saved");
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Could not save topic", "Topic not saved");
    } finally {
      pendingTopicIds.current.delete(script.id);
      setSavingTopicIds((current) => { const next = new Set(current); next.delete(script.id); return next; });
    }
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

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: scripts.length };
    for (const status of PROJECT_STATUSES) counts[status] = 0;
    for (const script of scripts) counts[script.status || "Draft"] = (counts[script.status || "Draft"] ?? 0) + 1;
    return counts;
  }, [scripts]);

  const topicOptions = useMemo<DropdownOption<string>[]>(() => {
    const titles = Array.from(new Set([
      ...topics.map((topic) => topic.title.trim()).filter(Boolean),
      ...scripts.map((script) => getScriptTopicValue(script)).filter(Boolean),
    ]));
    return [
      { value: ALL_TOPICS, label: "All topics" },
      { value: NO_TOPIC, label: "No topic" },
      ...titles.map((title) => ({ value: title, label: title, Icon: getTopicVisual(title).Icon })),
    ];
  }, [topics, scripts]);

  const changeProjectStatus = async (script: ScriptProject, status: ScriptProject["status"]) => {
    if ((script.status || "Draft") === status) return;
    const previous = script.status;
    setScripts((current) => current.map((item) => (item.id === script.id ? { ...item, status } : item)));
    const { error } = await supabase.from("scripts").update({ status }).eq("id", script.id);
    if (error) {
      setScripts((current) => current.map((item) => (item.id === script.id ? { ...item, status: previous } : item)));
      notifyError(error.message, "Could not change status");
    }
  };

  const hasFilters = Boolean(searchQuery.trim()) || statusFilter !== "All" || topicFilter !== ALL_TOPICS;
  const selecting = selectMode || selectedIds.length > 0;

  const exitSelection = () => {
    setSelectedIds([]);
    setSelectMode(false);
  };

  return (
    <div className={`${appPageRootClass} xl:flex`}>
      <ScriptEditorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} script={editingScript} onSave={handleUpdate} onRefresh={refreshScriptProject} topics={topics} topicsLoading={topicsLoading} topicsError={topicsError} onRetryTopics={retryTopics} />

      <AppSidebar activePage="scripts" hideTabBar={selecting} />

      <main className={`${appPageMainClass} pb-32`}>
        <div className="app-container max-w-6xl">
          <AppPageHeader
            title="Short Projects"
            description="Every short from draft to published. Open a project to write the script and manage its footage."
            icon={<DocumentTextIcon className="h-5 w-5" />}
            className="mb-4"
            action={
              <Button variant="accent" disabled={creatingProject} onClick={() => void createProject()}>
                <PlusIcon className="h-5 w-5" />
                <span className="max-sm:hidden">{creatingProject ? "Creating..." : "New project"}</span>
                <span className="sm:hidden">{creatingProject ? "..." : "New"}</span>
              </Button>
            }
          />

          {topicsError && (
            <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-danger-soft px-4 py-2 text-sm text-rose-600 dark:text-rose-300">
              <span>{topicsError}</span>
              <button type="button" onClick={retryTopics} className="min-h-9 cursor-pointer font-semibold underline">Retry topics</button>
            </div>
          )}

          {/* Status tabs: one quiet segmented row with counts. */}
          <div className="-mx-1 mb-3 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Filter by status">
            {(["All", ...PROJECT_STATUSES] as const).map((status) => {
              const active = statusFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStatusFilter(status)}
                  className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition ${
                    active ? "bg-surface text-fg shadow-sm ring-1 ring-line" : "text-fg-3 hover:bg-surface-sunken hover:text-fg"
                  }`}
                >
                  {status !== "All" && <span className={`h-2 w-2 rounded-full ${STATUS_META[status].dot}`} aria-hidden="true" />}
                  {status === "All" ? "All" : status}
                  <span className={`text-xs tabular-nums ${active ? "text-fg-3" : "text-fg-4"}`}>{statusCounts[status] ?? 0}</span>
                </button>
              );
            })}
          </div>

          {/* Search, topic filter and selection toggle on one line. */}
          <div className="mb-4 flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-4" />
              <input
                className="h-11 w-full rounded-xl border border-line bg-surface pl-11 pr-10 text-sm font-medium text-fg outline-none transition placeholder:text-fg-4 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                placeholder="Search"
                aria-label="Search projects"
                type="search"
                enterKeyHint="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")} className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-fg-4 transition hover:bg-surface-sunken hover:text-fg" aria-label="Clear search">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="w-[8.75rem] shrink-0 sm:w-56">
              <Dropdown value={topicFilter} options={topicOptions} onChange={setTopicFilter} heading="Topic" ariaLabel="Filter by topic" />
            </div>
            <Button
              variant={selecting ? "primary" : "secondary"}
              onClick={() => (selecting ? exitSelection() : setSelectMode(true))}
              aria-pressed={selecting}
              className="shrink-0 max-sm:w-11 max-sm:px-0"
              title={selecting ? "Done selecting" : "Select projects"}
            >
              {selecting ? <XMarkIcon className="h-5 w-5" /> : <CheckCircleIcon className="h-5 w-5" />}
              <span className="max-sm:hidden">{selecting ? "Done" : "Select"}</span>
            </Button>
          </div>

          {loadingScripts ? (
            <div className="overflow-hidden rounded-2xl border border-line bg-surface" aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="flex items-center gap-3 border-b border-line-soft px-4 py-3.5 last:border-0">
                  <div className="h-9 w-9 animate-pulse rounded-xl bg-surface-sunken" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-surface-sunken" />
                    <div className="h-3 w-1/3 animate-pulse rounded-full bg-surface-sunken" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredScripts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center">
              <DocumentTextIcon className="mx-auto h-10 w-10 text-fg-4" aria-hidden="true" />
              <p className="mt-3 text-base font-semibold text-fg">{scripts.length === 0 ? "No short projects yet" : "No projects match these filters"}</p>
              <p className="mt-1 text-sm text-fg-3">
                {scripts.length === 0 ? "Pick ideas on All Ideas and press Create Script, or start an empty project." : "Try another status, topic or search."}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {hasFilters && <Button variant="secondary" size="sm" onClick={() => { setSearchQuery(""); setStatusFilter("All"); setTopicFilter(ALL_TOPICS); }}>Clear filters</Button>}
                <Button variant="accent" size="sm" disabled={creatingProject} onClick={() => void createProject()}><PlusIcon className="h-4 w-4" /> New project</Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-surface shadow-sm">
              {/* Column labels on wide screens only. */}
              <div className="shorts-row shorts-head hidden border-b border-line-soft px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-fg-4 lg:grid" aria-hidden="true">
                <span />
                <span>Project</span>
                <span>Topic</span>
                <span>Source</span>
                <span className="text-right">Clips</span>
                <span>Created</span>
                <span>Status</span>
                <span />
              </div>
              <ul>
                {filteredScripts.map((script) => {
                  const channels = getScriptChannels(script);
                  const status = (script.status || "Draft") as ScriptProject["status"];
                  const selected = selectedIds.includes(script.id);
                  const topicValue = getScriptTopicValue(script);
                  const topicVisual = getTopicVisual(topicValue || "No topic");
                  const clipCount = analyzeAssetLinks(script.assets || []).uniqueLinkCount;
                  const created = new Date(script.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
                  const channelLabel = channels.length ? `${channels[0]}${channels.length > 1 ? ` +${channels.length - 1}` : ""}` : "";
                  const meta = [topicValue || "No topic", channelLabel, `${clipCount} ${clipCount === 1 ? "clip" : "clips"}`, created].filter(Boolean);

                  return (
                    <li
                      key={script.id}
                      className={`shorts-row group relative border-b border-line-soft px-3 py-2.5 last:border-0 has-[[aria-expanded=true]]:z-30 sm:px-4 ${selected ? "bg-accent-soft" : "hover:bg-surface-hover"}`}
                    >
                      {/* Leading: topic icon; becomes a checkbox when selecting (or on hover with a mouse). */}
                      <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center">
                        {selecting ? (
                          <label className="flex h-11 w-11 cursor-pointer items-center justify-center">
                            <input type="checkbox" checked={selected} onChange={() => toggleSelected(script.id)} aria-label={`Select ${script.title}`} className="h-5 w-5 cursor-pointer accent-blue-600" />
                          </label>
                        ) : (
                          <>
                            <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br transition pointer-fine:group-hover:opacity-0 ${topicVisual.gradientClass}`} aria-hidden="true">
                              <topicVisual.Icon className="h-[18px] w-[18px]" />
                            </span>
                            <label className="absolute inset-0 hidden cursor-pointer items-center justify-center pointer-fine:group-hover:flex">
                              <input type="checkbox" checked={selected} onChange={() => toggleSelected(script.id)} aria-label={`Select ${script.title}`} className="h-5 w-5 cursor-pointer accent-blue-600" />
                            </label>
                          </>
                        )}
                      </div>

                      {/* Title + one muted meta line (meta collapses into columns on wide screens). */}
                      <button
                        type="button"
                        onClick={() => (selecting ? toggleSelected(script.id) : openProject(script))}
                        className="min-w-0 cursor-pointer py-1 text-left after:absolute after:inset-0 after:content-['']"
                      >
                        <span className="line-clamp-2 break-words text-[15px] font-semibold leading-snug text-fg group-hover:text-accent lg:line-clamp-1">{script.title || "Untitled project"}</span>
                        <span className="mt-0.5 block truncate text-xs text-fg-3 lg:hidden">{meta.join(" · ")}</span>
                      </button>

                      <span className="hidden min-w-0 items-center gap-1.5 truncate text-sm text-fg-2 lg:flex">
                        <span className={`h-2 w-2 shrink-0 rounded-full bg-gradient-to-br ${topicVisual.gradientClass}`} aria-hidden="true" />
                        <span className={`truncate ${topicValue ? "" : "text-fg-4"}`}>{topicValue || "No topic"}</span>
                      </span>
                      <span className={`hidden truncate text-sm lg:block ${channels.length ? "text-fg-2" : "text-fg-4"}`} title={channels.join(" · ") || undefined}>{channelLabel || "—"}</span>
                      <span className="hidden text-right text-sm tabular-nums text-fg-2 lg:block">{clipCount}</span>
                      <span className="hidden text-sm tabular-nums text-fg-3 lg:block">{created}</span>

                      <div className="relative z-10 shrink-0">
                        <StatusMenu value={status} onChange={(next) => void changeProjectStatus(script, next)} label={script.title} />
                      </div>
                      <div className="relative z-10 shrink-0">
                        <ProjectRowMenu
                          title={script.title}
                          topicValue={topicValue}
                          topics={topics}
                          savingTopic={savingTopicIds.has(script.id)}
                          onOpen={() => openProject(script)}
                          onTopic={(nextTopic) => void changeProjectTopic(script, nextTopic)}
                          onSelect={() => { setSelectMode(true); toggleSelected(script.id); }}
                          onDelete={() => void handleDelete(script.id)}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </main>

      {selecting && (
        <div className="app-selection-bar fixed inset-x-0 bottom-0 z-[80] border-t border-line bg-surface/95 p-3 shadow-[0_-5px_20px_rgba(0,0,0,0.08)] backdrop-blur animate-in fade-in slide-in-from-bottom-2 duration-150 sm:p-4">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-blue-600 px-2 text-sm font-semibold text-white">{selectedIds.length}</span>
              <p className="truncate text-sm font-semibold text-fg max-sm:hidden">selected</p>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Button variant="ghost" onClick={toggleSelectAllVisible}>{allVisibleSelected ? "Unselect all" : "Select all"}</Button>
              <Button variant="secondary" onClick={exitSelection} aria-label="Done selecting" className="max-sm:w-11 max-sm:px-0">
                <XMarkIcon className="h-4 w-4" /> <span className="max-sm:hidden">Done</span>
              </Button>
              <Button variant="destructive" disabled={selectedIds.length === 0} onClick={() => void handleBulkDelete()}>
                <TrashIcon className="h-4 w-4" /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const PROJECT_STATUSES = ["Draft", "Filming", "Edited", "Published"] as const;
const ALL_TOPICS = "__all__";
const NO_TOPIC = "__none__";

const STATUS_META: Record<(typeof PROJECT_STATUSES)[number], { dot: string; pill: string }> = {
  Draft: { dot: "bg-slate-400", pill: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  Filming: { dot: "bg-amber-500", pill: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
  Edited: { dot: "bg-indigo-500", pill: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300" },
  Published: { dot: "bg-emerald-500", pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
};

/** Should a popover open upward? True when the trigger sits too close to the bottom of the screen. */
function shouldOpenUp(el: HTMLElement | null, menuHeight: number) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  // Leave room for the phone tab bar / selection bar at the bottom.
  const bottomChrome = window.innerWidth < 1024 ? 140 : 24;
  return rect.bottom + menuHeight > window.innerHeight - bottomChrome && rect.top > menuHeight;
}

function StatusMenu({ value, onChange, label }: { value: ScriptProject["status"]; onChange: (status: ScriptProject["status"]) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(boxRef, open, close);
  const [up, setUp] = useState(false);
  const meta = STATUS_META[value] ?? STATUS_META.Draft;

  return (
    <div ref={boxRef} className={`relative shrink-0 ${open ? "z-30" : ""}`}>
      <button
        type="button"
        onClick={() => { if (!open) setUp(shouldOpenUp(boxRef.current, 200)); setOpen(!open); }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Status for ${label}: ${value}. Change status`}
        className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full pl-2.5 pr-2 text-xs font-semibold transition hover:brightness-95 pointer-coarse:h-10 pointer-coarse:pl-3 ${meta.pill}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
        {value}
        <ChevronDownIcon className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className={`absolute right-0 w-40 rounded-2xl border border-line bg-surface p-1.5 shadow-2xl ring-1 ring-black/5 animate-in fade-in duration-150 dark:ring-white/10 ${up ? "bottom-full mb-1.5 slide-in-from-bottom-1" : "top-full mt-1.5 slide-in-from-top-1"}`} role="listbox" aria-label="Project status">
          {PROJECT_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              role="option"
              aria-selected={status === value}
              onClick={() => { onChange(status); setOpen(false); }}
              className={`flex h-9 w-full cursor-pointer items-center justify-between rounded-xl px-2.5 text-left text-sm font-medium transition pointer-coarse:h-11 ${status === value ? "bg-surface-sunken text-fg" : "text-fg-2 hover:bg-surface-sunken"}`}
            >
              <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${STATUS_META[status].dot}`} aria-hidden="true" />{status}</span>
              {status === value && <CheckIcon className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** "⋯" menu on each project row: open, change topic, select, delete. */
function ProjectRowMenu({
  title,
  topicValue,
  topics,
  savingTopic,
  onOpen,
  onTopic,
  onSelect,
  onDelete,
}: {
  title: string;
  topicValue: string;
  topics: VideoTheme[];
  savingTopic: boolean;
  onOpen: () => void;
  onTopic: (topic: string) => void;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(boxRef, open, close);
  const [up, setUp] = useState(false);
  const choices = Array.from(new Set(topics.map((topic) => topic.title.trim()).filter(Boolean)));
  if (topicValue && !choices.includes(topicValue)) choices.unshift(topicValue);
  const item = "flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 text-left text-sm font-medium transition pointer-coarse:min-h-11";

  return (
    <div ref={boxRef} className={`relative ${open ? "z-30" : ""}`}>
      <button
        type="button"
        onClick={() => { if (!open) setUp(shouldOpenUp(boxRef.current, 380)); setOpen(!open); }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More actions for ${title}`}
        className="touch-target flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-fg-4 transition hover:bg-surface-sunken hover:text-fg"
      >
        {savingTopic ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <EllipsisHorizontalIcon className="h-5 w-5" />}
      </button>
      {open && (
        <div
          role="menu"
          aria-label={`Actions for ${title}`}
          className={`absolute right-0 w-64 rounded-2xl border border-line bg-surface p-1.5 shadow-2xl ring-1 ring-black/5 animate-in fade-in duration-150 dark:ring-white/10 ${up ? "bottom-full mb-1.5 slide-in-from-bottom-1" : "top-full mt-1.5 slide-in-from-top-1"}`}
        >
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onOpen(); }} className={`${item} text-fg hover:bg-surface-sunken`}>
            <PencilSquareIcon className="h-4 w-4 text-fg-3" /> Open project
          </button>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onSelect(); }} className={`${item} text-fg hover:bg-surface-sunken`}>
            <CheckCircleIcon className="h-4 w-4 text-fg-3" /> Select
          </button>
          <div className="my-1.5 border-t border-line-soft" />
          <p className="px-2.5 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wider text-fg-4">Topic</p>
          <div className="max-h-48 overflow-y-auto">
            {["", ...choices].map((choice) => {
              const active = choice === topicValue;
              const visual = getTopicVisual(choice || "No topic");
              return (
                <button
                  key={choice || "none"}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  disabled={savingTopic}
                  onClick={() => { setOpen(false); if (!active) onTopic(choice); }}
                  className={`${item} ${active ? "bg-surface-sunken text-fg" : "text-fg-2 hover:bg-surface-sunken"} disabled:cursor-wait disabled:opacity-60`}
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br ${visual.gradientClass}`} aria-hidden="true" />
                  <span className={`min-w-0 flex-1 truncate ${choice ? "" : "text-fg-3"}`}>{choice || "No topic"}</span>
                  {active && <CheckIcon className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
          <div className="my-1.5 border-t border-line-soft" />
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onDelete(); }} className={`${item} text-rose-600 hover:bg-danger-soft dark:text-rose-300`}>
            <TrashIcon className="h-4 w-4" /> Delete project
          </button>
        </div>
      )}
    </div>
  );
}
