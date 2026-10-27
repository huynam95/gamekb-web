"use client";

import { Button } from "@/components/ui/Button";
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
import { useDismiss } from "@/components/ui/useDismiss";
import { getTopicVisual as getSharedTopicVisual } from "@/lib/topicVisuals";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AppSidebar } from "@/components/AppSidebar";
import { AppPageHeader, appPageMainClass, appPageRootClass } from "@/components/AppPage";
import { useNotifications } from "@/components/NotificationCenter";
import { countClips } from "@/lib/assetLinks";
import { getScriptTopic, getScriptTopicValue } from "@/lib/scriptTopics";
import { useProjectTopics } from "@/lib/useProjectTopics";
import { ProjectEditor } from "@/components/ProjectEditor";
import type { VideoTheme } from "@/lib/videoThemes";
import {
  TrashIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  VideoCameraIcon,
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



function getScriptChannels(script: ScriptProject) {
  return Array.from(
    new Set(
      (script.assets || [])
        .map((asset) => asset.channel_name?.trim())
        .filter((channel): channel is string => Boolean(channel)),
    ),
  );
}

/** A clip saved on one of the project's ideas (footage table). */
type IdeaClip = {
  detail_id: number;
  file_path: string;
  title: string | null;
  channel_name: string | null;
  idea_title: string;
  game_title: string;
};

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
      if (openId && !toOpen) window.history.replaceState({}, "", "/scripts");
    }
    load();
  }, []);

  // The ideas in each project (script_ideas): their clips feed the Clips column and
  // their recording status feeds "still to record". Reloaded when the editor closes.
  const [linksVersion, setLinksVersion] = useState(0);
  const [ideaClipsByScript, setIdeaClipsByScript] = useState<Map<number, IdeaClip[]>>(new Map());
  const [toRecordByScript, setToRecordByScript] = useState<Map<number, number>>(new Map());
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: links, error } = await supabase.from("script_ideas").select("script_id,detail_id");
      if (error || !active) return;
      const linkRows = (links ?? []) as { script_id: number; detail_id: number }[];
      const ideaIds = Array.from(new Set(linkRows.map((link) => link.detail_id)));
      const clips: IdeaClip[] = [];
      const toRecord = new Set<number>();
      for (let i = 0; i < ideaIds.length; i += 200) {
        const batch = ideaIds.slice(i, i + 200);
        const [footageResult, ideasResult] = await Promise.all([
          supabase.from("footage").select("detail_id,file_path,title,channel_name,detail:details(title,game:games(title))").in("detail_id", batch),
          supabase.from("details").select("id,capture_status").in("id", batch),
        ]);
        for (const row of (footageResult.data ?? []) as unknown as { detail_id: number; file_path: string | null; title: string | null; channel_name: string | null; detail: { title: string; game: { title: string } | null } | null }[]) {
          if (!row.file_path?.trim()) continue;
          clips.push({ detail_id: row.detail_id, file_path: row.file_path, title: row.title, channel_name: row.channel_name, idea_title: row.detail?.title ?? "", game_title: row.detail?.game?.title ?? "" });
        }
        for (const row of (ideasResult.data ?? []) as { id: number; capture_status: string | null }[]) if (row.capture_status === "to_record") toRecord.add(row.id);
      }
      if (!active) return;
      const byIdea = new Map<number, IdeaClip[]>();
      for (const clip of clips) byIdea.set(clip.detail_id, [...(byIdea.get(clip.detail_id) ?? []), clip]);
      const clipsResult = new Map<number, IdeaClip[]>();
      const recordResult = new Map<number, number>();
      for (const link of linkRows) {
        clipsResult.set(link.script_id, [...(clipsResult.get(link.script_id) ?? []), ...(byIdea.get(link.detail_id) ?? [])]);
        if (toRecord.has(link.detail_id)) recordResult.set(link.script_id, (recordResult.get(link.script_id) ?? 0) + 1);
      }
      setIdeaClipsByScript(clipsResult);
      setToRecordByScript(recordResult);
    })();
    return () => { active = false; };
  }, [scripts.length, linksVersion]);

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

  // The open project stays in the address (?open=<id>), so going to an idea and back returns to it.
  const showProject = (script: ScriptProject) => {
    setEditingScript(script);
    setIsModalOpen(true);
    window.history.replaceState({}, "", `/scripts?open=${script.id}`);
  };

  const openProject = (script: ScriptProject) => {
    if (pendingTopicIds.current.has(script.id)) return;
    showProject(script);
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
      showProject(project);
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
      <ProjectEditor
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setLinksVersion((v) => v + 1); window.history.replaceState({}, "", "/scripts"); }}
        script={editingScript}
        onSave={handleUpdate}
        onRefresh={refreshScriptProject}
        topics={topics}
        topicsLoading={topicsLoading}
        topicsError={topicsError}
        onRetryTopics={retryTopics}
      />

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
                  const clipStats = countClips([...(script.assets || []).map((asset) => asset.url), ...(ideaClipsByScript.get(script.id) ?? []).map((clip) => clip.file_path)]);
                  const clipCount = clipStats.clips;
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
                      <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => (selecting ? toggleSelected(script.id) : openProject(script))}
                        className="block w-full min-w-0 cursor-pointer py-1 text-left after:absolute after:inset-0 after:content-['']"
                      >
                        <span className="line-clamp-2 break-words text-[15px] font-semibold leading-snug text-fg group-hover:text-accent lg:line-clamp-1">{script.title || "Untitled project"}</span>
                        <span className="mt-0.5 block truncate text-xs text-fg-3 lg:hidden">{meta.join(" · ")}</span>
                      </button>
                      {(toRecordByScript.get(script.id) ?? 0) > 0 && (
                        <div className="relative z-10 -mt-0.5 mb-1 flex flex-wrap items-center gap-1.5">
                          {(toRecordByScript.get(script.id) ?? 0) > 0 && (
                            <span className="inline-flex h-6 items-center gap-1 rounded-md bg-rose-100 px-1.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" title="Ideas in this project that are still on your Recording List">
                              <VideoCameraIcon className="h-3 w-3" /> {toRecordByScript.get(script.id)} still to record
                            </span>
                          )}
                        </div>
                      )}
                      </div>

                      <span className="hidden min-w-0 items-center gap-1.5 truncate text-sm text-fg-2 lg:flex">
                        <span className={`h-2 w-2 shrink-0 rounded-full bg-gradient-to-br ${topicVisual.gradientClass}`} aria-hidden="true" />
                        <span className={`truncate ${topicValue ? "" : "text-fg-4"}`}>{topicValue || "No topic"}</span>
                      </span>
                      <span className={`hidden truncate text-sm lg:block ${channels.length ? "text-fg-2" : "text-fg-4"}`} title={channels.join(" · ") || undefined}>{channelLabel || "—"}</span>
                      <span className="hidden text-right text-sm tabular-nums text-fg-2 lg:block" title={clipStats.sources !== clipCount ? `${clipCount} clips from ${clipStats.sources} source videos` : undefined}>{clipCount}</span>
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
