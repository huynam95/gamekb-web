"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowUpTrayIcon,
  Bars3Icon,
  CameraIcon,
  CheckIcon,
  FilmIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AppSidebar } from "@/components/AppSidebar";
import { AppPageHeader, appPageMainClass, appPageRootClass } from "@/components/AppPage";
import { useNotifications } from "@/components/NotificationCenter";
import type { LongVideoProject, LongVideoProjectIdea } from "@/types/gamekb";

type Workspace = { project: LongVideoProject; ideas: LongVideoProjectIdea[] };

const PROJECT_STATUS: Array<{ value: LongVideoProject["status"]; label: string }> = [
  { value: "planning", label: "Planning" },
  { value: "writing", label: "Preparing" },
  { value: "recording", label: "Recording" },
  { value: "editing", label: "Editing" },
  { value: "ready", label: "Ready" },
  { value: "published", label: "Published" },
];

const ensurePeriod = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const smoothNarrationDetail = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return /^(If|When|During|After|Before|At|Right|There|You|Most|But|And)\b/.test(trimmed)
    ? trimmed.charAt(0).toLowerCase() + trimmed.slice(1)
    : trimmed;
};

const buildDefaultNarration = (item: LongVideoProjectIdea) => {
  const gameTitle = item.detail.game?.title?.trim() || "this game";
  const rawDetail = (item.detail.description || item.detail.title || "")
    .replace(/\s+/g, " ")
    .replace(/^\[[^\]]+\]\s*/, "")
    .trim();

  if (!rawDetail) return `In ${gameTitle}, ${smoothNarrationDetail(item.detail.title)}`;
  if (/^in\s+/i.test(rawDetail)) return ensurePeriod(rawDetail);
  return ensurePeriod(`In ${gameTitle}, ${smoothNarrationDetail(rawDetail)}`);
};

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json" } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload;
}

function buildWorkspacePayload(workspace: Workspace) {
  return {
    project: workspace.project,
    ideas: workspace.ideas.map((item, position) => ({
      detail_id: item.detail_id,
      position,
      capture_status: item.capture_status,
      narration_text: item.narration_text,
    })),
  };
}

function workspaceSnapshot(workspace: Workspace) {
  return JSON.stringify(buildWorkspacePayload(workspace));
}

export default function LongVideoProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: notifyError, confirm } = useNotifications();
  const projectId = Number(params.id);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSnapshotRef = useRef("");
  const latestWorkspaceRef = useRef<Workspace | null>(null);
  const saveVersionRef = useRef(0);

  const load = async () => {
    if (!Number.isFinite(projectId)) return;
    setLoading(true);
    try {
      const result = await api<{ data: Workspace }>(`/api/long-videos/${projectId}`);
      const nextWorkspace: Workspace = {
        project: result.data.project,
        ideas: (result.data.ideas ?? []).map((item, position) => ({
          ...item,
          position,
          capture_status: item.capture_status || "to_record",
          narration_text: item.narration_text?.trim() || buildDefaultNarration(item),
        })),
      };
      latestWorkspaceRef.current = nextWorkspace;
      lastSavedSnapshotRef.current = workspaceSnapshot(nextWorkspace);
      setWorkspace(nextWorkspace);
      setSaveState("saved");
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Could not load long video project");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [projectId]);

  const stats = useMemo(() => {
    const ideas = workspace?.ideas ?? [];
    const completed = ideas.filter((item) => item.capture_status === "recorded" || item.capture_status === "approved").length;
    return {
      total: ideas.length,
      completed,
      remaining: Math.max(0, ideas.length - completed),
      progress: ideas.length ? Math.round((completed / ideas.length) * 100) : 0,
    };
  }, [workspace]);

  const persistWorkspace = async (nextWorkspace: Workspace) => {
    const snapshot = workspaceSnapshot(nextWorkspace);
    if (snapshot === lastSavedSnapshotRef.current) {
      setSaveState("saved");
      return true;
    }

    const version = ++saveVersionRef.current;
    setSaveState("saving");
    try {
      await api(`/api/long-videos/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify(buildWorkspacePayload(nextWorkspace)),
      });
      lastSavedSnapshotRef.current = snapshot;
      if (version === saveVersionRef.current) {
        const latest = latestWorkspaceRef.current;
        setSaveState(latest && workspaceSnapshot(latest) === snapshot ? "saved" : "saving");
      }
      return true;
    } catch (err) {
      if (version === saveVersionRef.current) setSaveState("error");
      notifyError(err instanceof Error ? err.message : "Could not save project", "Autosave failed");
      return false;
    }
  };

  useEffect(() => {
    if (!workspace) return;
    latestWorkspaceRef.current = workspace;
    const snapshot = workspaceSnapshot(workspace);
    if (snapshot === lastSavedSnapshotRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveState("saving");
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      const latest = latestWorkspaceRef.current;
      if (latest) void persistWorkspace(latest);
    }, 450);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [workspace, projectId]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const latest = latestWorkspaceRef.current;
      if (!latest || workspaceSnapshot(latest) === lastSavedSnapshotRef.current) return;
      void fetch(`/api/long-videos/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildWorkspacePayload(latest)),
        keepalive: true,
      });
    };
  }, [projectId]);

  const updateProject = <K extends keyof LongVideoProject>(key: K, value: LongVideoProject[K]) => {
    setWorkspace((current) => current ? { ...current, project: { ...current.project, [key]: value } } : current);
  };

  const updateIdea = (index: number, patch: Partial<LongVideoProjectIdea>, immediate = false) => {
    if (!workspace) return;
    const nextWorkspace: Workspace = {
      ...workspace,
      ideas: workspace.ideas.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    };
    latestWorkspaceRef.current = nextWorkspace;
    setWorkspace(nextWorkspace);
    if (immediate) void persistWorkspace(nextWorkspace);
  };

  const removeIdea = async (index: number) => {
    if (!workspace) return;
    const item = workspace.ideas[index];
    if (!(await confirm({
      title: "Remove idea from project?",
      message: `“${item.detail.title}” will be removed from this recording list. The original idea stays in All Ideas.`,
      confirmText: "Remove",
    }))) return;

    const nextWorkspace: Workspace = {
      ...workspace,
      ideas: workspace.ideas
        .filter((_, itemIndex) => itemIndex !== index)
        .map((idea, position) => ({ ...idea, position })),
    };
    latestWorkspaceRef.current = nextWorkspace;
    setWorkspace(nextWorkspace);
    void persistWorkspace(nextWorkspace);
  };

  const reorderIdeas = (toIndex: number) => {
    if (!workspace || dragIndex === null || dragIndex === toIndex) return;
    const next = [...workspace.ideas];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(toIndex, 0, moved);
    const nextWorkspace: Workspace = {
      ...workspace,
      ideas: next.map((item, position) => ({ ...item, position })),
    };
    latestWorkspaceRef.current = nextWorkspace;
    setWorkspace(nextWorkspace);
    setDragIndex(null);
    void persistWorkspace(nextWorkspace);
  };


  const uploadThumbnail = async (file?: File) => {
    if (!file || !workspace) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      notifyError("Use a JPG, PNG, or WebP image.", "Unsupported image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notifyError("Thumbnail must be 5 MB or smaller.", "Image too large");
      return;
    }

    setUploadingThumbnail(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/long-videos/${projectId}/thumbnail`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not upload thumbnail");
      setWorkspace((current) => current ? {
        ...current,
        project: { ...current.project, thumbnail_url: payload.data.thumbnail_url },
      } : current);
      success("Project thumbnail updated.", "Thumbnail ready");
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Could not upload thumbnail");
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const removeThumbnail = async () => {
    if (!workspace?.project.thumbnail_url) return;
    if (!(await confirm({
      title: "Remove project thumbnail?",
      message: "The project card will fall back to a game cover until you upload another thumbnail.",
      confirmText: "Remove",
    }))) return;

    setUploadingThumbnail(true);
    try {
      const response = await fetch(`/api/long-videos/${projectId}/thumbnail`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not remove thumbnail");
      setWorkspace((current) => current ? {
        ...current,
        project: { ...current.project, thumbnail_url: null },
      } : current);
      success("Project thumbnail removed.", "Thumbnail removed");
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Could not remove thumbnail");
    } finally {
      setUploadingThumbnail(false);
    }
  };



  if (loading) {
    return <div className={appPageRootClass}><AppSidebar activePage="longVideos" /><main className={`${appPageMainClass} flex min-h-screen items-center justify-center`}><p className="text-sm font-black text-slate-400">Opening project...</p></main></div>;
  }

  if (!workspace) {
    return <div className={appPageRootClass}><AppSidebar activePage="longVideos" /><main className={`${appPageMainClass} flex min-h-screen items-center justify-center`}><button onClick={() => router.push("/long-videos")} className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white">Back to Long Video Projects</button></main></div>;
  }

  const encodedTitle = encodeURIComponent(workspace.project.title);

  return (
    <div className={appPageRootClass}>
      <AppSidebar activePage="longVideos" />
      <main className={`${appPageMainClass} pb-28`}>
        <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AppPageHeader
            title={workspace.project.title}
            description="Your recording checklist. Add ideas from All Ideas, then track what still needs to be captured."
            icon={<FilmIcon className="h-5 w-5" />}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/long-videos`} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black uppercase tracking-wider text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"><ArrowLeftIcon className="h-4 w-4" /> Projects</Link>
                <Link href={`/?longProject=${projectId}&longProjectTitle=${encodedTitle}`} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black uppercase tracking-wider text-white shadow-sm transition hover:bg-violet-700"><PlusIcon className="h-4 w-4" /> Pick ideas</Link>
                <span
                  className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-[10px] font-black uppercase tracking-wider ${
                    saveState === "error"
                      ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
                      : saveState === "saving"
                        ? "border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300"
                        : "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                  }`}
                  title="Changes are saved automatically"
                >
                  <CheckIcon className={`h-4 w-4 ${saveState === "saving" ? "animate-pulse" : ""}`} />
                  {saveState === "error" ? "Save failed" : saveState === "saving" ? "Saving" : "Saved"}
                </span>
              </div>
            }
          />

          <section className="mb-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
              <div className="min-w-0">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="text-xs font-black text-slate-500">Project thumbnail</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">JPG, PNG or WebP · 5 MB</span>
                </div>
                <div className="group relative aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 dark:border-slate-700">
                  {workspace.project.thumbnail_url ? (
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${workspace.project.thumbnail_url})` }} />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-violet-600 via-fuchsia-600 to-slate-950 text-white">
                      <PhotoIcon className="h-9 w-9 text-white/75" />
                      <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-white/65">No thumbnail yet</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />
                  <div className="absolute inset-x-3 bottom-3 flex items-center gap-2">
                    <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-slate-900 shadow-lg transition hover:bg-slate-100">
                      <ArrowUpTrayIcon className="h-4 w-4" />
                      {uploadingThumbnail ? "Uploading..." : workspace.project.thumbnail_url ? "Replace" : "Upload"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={uploadingThumbnail}
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          void uploadThumbnail(file);
                        }}
                      />
                    </label>
                    {workspace.project.thumbnail_url && (
                      <button
                        type="button"
                        onClick={() => void removeThumbnail()}
                        disabled={uploadingThumbnail}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-black/45 text-white backdrop-blur transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Remove project thumbnail"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">This image becomes the background of the project card in Long Video Projects.</p>
              </div>

              <div className="min-w-0">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_180px_220px]">
                  <label className="block"><span className="mb-1.5 block text-xs font-black text-slate-500">Project title</span><input value={workspace.project.title} onChange={(event) => updateProject("title", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-950" /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-black text-slate-500">Status</span><select value={workspace.project.status} onChange={(event) => updateProject("status", event.target.value as LongVideoProject["status"])} className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950">{PROJECT_STATUS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-black text-slate-500">Target duration</span><div className="relative"><input type="number" min={1} value={workspace.project.target_duration_minutes} onChange={(event) => updateProject("target_duration_minutes", Number(event.target.value))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pr-12 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">min</span></div></label>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <label className="block"><span className="mb-1.5 block text-xs font-black text-slate-500">Main goal</span><textarea value={workspace.project.core_idea ?? ""} onChange={(event) => updateProject("core_idea", event.target.value)} rows={3} className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-950" placeholder="What should this video deliver?" /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-black text-slate-500">Thumbnail concept</span><textarea value={workspace.project.thumbnail_notes ?? ""} onChange={(event) => updateProject("thumbnail_notes", event.target.value)} rows={3} className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-950" placeholder="Main subject, text, background, contrast..." /></label>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-black">Ideas</h2>
                <p className="text-xs font-semibold text-slate-400">{stats.completed}/{stats.total} done · {stats.remaining} left</p>
              </div>
              <div className="h-1.5 min-w-[120px] flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${stats.progress}%` }} />
              </div>
              <span className="text-xs font-black text-slate-400">{stats.progress}%</span>
              <Link href={`/?longProject=${projectId}&longProjectTitle=${encodedTitle}`} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 text-xs font-black text-violet-700 transition hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-300"><PlusIcon className="h-4 w-4" /> Add</Link>
            </div>

            {workspace.ideas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700"><CameraIcon className="mx-auto h-10 w-10 text-slate-300" /><h3 className="mt-3 text-lg font-black">No ideas in this project yet</h3><p className="mt-1 text-sm text-slate-400">Pick ideas from All Ideas, then return here to plan your recording.</p><Link href={`/?longProject=${projectId}&longProjectTitle=${encodedTitle}`} className="mt-5 inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-black text-white hover:bg-violet-700"><PlusIcon className="h-4 w-4" /> Pick ideas</Link></div>
            ) : (
              <div className="space-y-2">
                {workspace.ideas.map((item, index) => {
                  const completed = item.capture_status === "recorded" || item.capture_status === "approved";
                  const gameTitle = item.detail.game?.title || "Unknown game";
                  return (
                    <article
                      key={`${item.detail_id}-${index}`}
                      draggable
                      onDragStart={() => setDragIndex(index)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => reorderIdeas(index)}
                      className={`group rounded-xl border px-3 py-2.5 transition ${
                        completed
                          ? "border-emerald-200 bg-emerald-50/45 dark:border-emerald-900/60 dark:bg-emerald-950/10"
                          : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600"
                      }`}
                    >
                      <div className="grid min-w-0 grid-cols-[18px_24px_28px_minmax(0,1fr)_32px] items-center gap-2 lg:grid-cols-[18px_24px_28px_minmax(180px,0.8fr)_minmax(260px,1.2fr)_32px]">
                        <Bars3Icon className="h-4 w-4 cursor-grab text-slate-300 active:cursor-grabbing" />
                        <span className="text-center text-[11px] font-black tabular-nums text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                        <button
                          type="button"
                          onClick={() => updateIdea(index, { capture_status: completed ? "to_record" : "approved" }, true)}
                          className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border transition ${
                            completed
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-slate-300 bg-white text-transparent hover:border-emerald-400 dark:border-slate-600 dark:bg-slate-900"
                          }`}
                          aria-label={completed ? `Mark ${item.detail.title} as not completed` : `Mark ${item.detail.title} as completed`}
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>

                        <Link href={`/idea/${item.detail_id}`} className="min-w-0 cursor-pointer" title={`${gameTitle} · ${item.detail.title}`}>
                          <p className={`truncate text-sm font-black ${completed ? "text-slate-500 line-through dark:text-slate-400" : "text-slate-900 dark:text-white"}`}>{item.detail.title}</p>
                          <p className="truncate text-[10px] font-bold text-slate-400">{gameTitle}</p>
                        </Link>

                        <input
                          value={item.narration_text ?? ""}
                          onChange={(event) => updateIdea(index, { narration_text: event.target.value })}
                          className="col-start-4 row-start-2 h-8 min-w-0 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 lg:col-start-5 lg:row-start-1"
                          placeholder="Custom narration..."
                          aria-label={`Narration for ${item.detail.title}`}
                        />

                        <button type="button" onClick={() => void removeIdea(index)} className="col-start-5 row-start-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 lg:col-start-6" aria-label={`Remove ${item.detail.title}`}><TrashIcon className="h-4 w-4" /></button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
