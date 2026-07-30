"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  Bars3Icon,
  CameraIcon,
  CheckCircleIcon,
  ClockIcon,
  FilmIcon,
  FolderOpenIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { AppSidebar } from "@/components/AppSidebar";
import { AppPageHeader, appPageMainClass, appPageRootClass } from "@/components/AppPage";
import { useNotifications } from "@/components/NotificationCenter";
import type { LongVideoCaptureStatus, LongVideoProject, LongVideoProjectIdea } from "@/types/gamekb";

type Workspace = { project: LongVideoProject; ideas: LongVideoProjectIdea[] };

const PROJECT_STATUS: Array<{ value: LongVideoProject["status"]; label: string }> = [
  { value: "planning", label: "Planning" },
  { value: "writing", label: "Preparing" },
  { value: "recording", label: "Recording" },
  { value: "editing", label: "Editing" },
  { value: "ready", label: "Ready" },
  { value: "published", label: "Published" },
];

const CAPTURE_STATUS: Array<{ value: LongVideoCaptureStatus; label: string; style: string }> = [
  { value: "to_record", label: "To record", style: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  { value: "recorded", label: "Recorded", style: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
  { value: "retake", label: "Retake", style: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  { value: "approved", label: "Ready", style: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
];

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json" } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload;
}

export default function LongVideoProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: notifyError, confirm } = useNotifications();
  const projectId = Number(params.id);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const load = async () => {
    if (!Number.isFinite(projectId)) return;
    setLoading(true);
    try {
      const result = await api<{ data: Workspace }>(`/api/long-videos/${projectId}`);
      setWorkspace({
        project: result.data.project,
        ideas: (result.data.ideas ?? []).map((item, position) => ({
          ...item,
          position,
          capture_status: item.capture_status || "to_record",
        })),
      });
      setDirty(false);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Could not load long video project");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [projectId]);

  const stats = useMemo(() => {
    const ideas = workspace?.ideas ?? [];
    const recorded = ideas.filter((item) => item.capture_status === "recorded" || item.capture_status === "approved").length;
    const retakes = ideas.filter((item) => item.capture_status === "retake").length;
    const ready = ideas.filter((item) => item.capture_status === "approved").length;
    return {
      total: ideas.length,
      recorded,
      remaining: Math.max(0, ideas.length - recorded),
      retakes,
      ready,
      progress: ideas.length ? Math.round((recorded / ideas.length) * 100) : 0,
    };
  }, [workspace]);

  const updateProject = <K extends keyof LongVideoProject>(key: K, value: LongVideoProject[K]) => {
    setWorkspace((current) => current ? { ...current, project: { ...current.project, [key]: value } } : current);
    setDirty(true);
  };

  const updateIdea = (index: number, patch: Partial<LongVideoProjectIdea>) => {
    setWorkspace((current) => current ? {
      ...current,
      ideas: current.ideas.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    } : current);
    setDirty(true);
  };

  const removeIdea = async (index: number) => {
    if (!workspace) return;
    const item = workspace.ideas[index];
    if (!(await confirm({
      title: "Remove idea from project?",
      message: `“${item.detail.title}” will be removed from this recording list. The original idea stays in All Ideas.`,
      confirmText: "Remove",
    }))) return;

    setWorkspace((current) => current ? {
      ...current,
      ideas: current.ideas.filter((_, itemIndex) => itemIndex !== index).map((idea, position) => ({ ...idea, position })),
    } : current);
    setDirty(true);
  };

  const reorderIdeas = (toIndex: number) => {
    if (!workspace || dragIndex === null || dragIndex === toIndex) return;
    const next = [...workspace.ideas];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(toIndex, 0, moved);
    setWorkspace({ ...workspace, ideas: next.map((item, position) => ({ ...item, position })) });
    setDragIndex(null);
    setDirty(true);
  };

  const save = async () => {
    if (!workspace || !workspace.project.title.trim()) return;
    setSaving(true);
    try {
      await api(`/api/long-videos/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify({
          project: workspace.project,
          ideas: workspace.ideas.map((item, position) => ({
            detail_id: item.detail_id,
            position,
            capture_status: item.capture_status,
            recording_notes: item.recording_notes,
            file_location: item.file_location,
          })),
        }),
      });
      success("Long video project saved.", "Saved");
      await load();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Could not save project");
    } finally {
      setSaving(false);
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
                <button type="button" onClick={() => void save()} disabled={saving || !dirty} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-black uppercase tracking-wider text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"><CheckCircleIcon className="h-4 w-4" /> {saving ? "Saving..." : "Save"}</button>
              </div>
            }
          />

          <section className="mb-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_180px_220px]">
              <label className="block"><span className="mb-1.5 block text-xs font-black text-slate-500">Project title</span><input value={workspace.project.title} onChange={(event) => updateProject("title", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-950" /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-black text-slate-500">Status</span><select value={workspace.project.status} onChange={(event) => updateProject("status", event.target.value as LongVideoProject["status"])} className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950">{PROJECT_STATUS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="block"><span className="mb-1.5 block text-xs font-black text-slate-500">Target duration</span><div className="relative"><input type="number" min={1} value={workspace.project.target_duration_minutes} onChange={(event) => updateProject("target_duration_minutes", Number(event.target.value))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pr-12 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">min</span></div></label>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <label className="block"><span className="mb-1.5 block text-xs font-black text-slate-500">Main goal</span><textarea value={workspace.project.core_idea ?? ""} onChange={(event) => updateProject("core_idea", event.target.value)} rows={3} className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-950" placeholder="What should this video deliver?" /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-black text-slate-500">Thumbnail concept</span><textarea value={workspace.project.thumbnail_notes ?? ""} onChange={(event) => updateProject("thumbnail_notes", event.target.value)} rows={3} className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-950" placeholder="Main subject, text, background, contrast..." /></label>
            </div>
          </section>

          <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Ideas</p><p className="mt-2 text-2xl font-black">{stats.total}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Recorded</p><p className="mt-2 text-2xl font-black text-blue-600">{stats.recorded}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Remaining</p><p className="mt-2 text-2xl font-black">{stats.remaining}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Retakes</p><p className="mt-2 text-2xl font-black text-amber-600">{stats.retakes}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Progress</p><p className="text-sm font-black">{stats.progress}%</p></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${stats.progress}%` }} /></div></div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-500">Recording list</p><h2 className="text-xl font-black">Ideas to capture</h2><p className="mt-1 text-xs font-semibold text-slate-400">Drag to reorder. Update status, notes and file location as you record.</p></div>
              <Link href={`/?longProject=${projectId}&longProjectTitle=${encodedTitle}`} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 text-xs font-black uppercase tracking-wider text-violet-700 transition hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-300"><PlusIcon className="h-4 w-4" /> Add ideas</Link>
            </div>

            {workspace.ideas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700"><CameraIcon className="mx-auto h-10 w-10 text-slate-300" /><h3 className="mt-3 text-lg font-black">No ideas in this project yet</h3><p className="mt-1 text-sm text-slate-400">Pick ideas from All Ideas, then return here to plan your recording.</p><Link href={`/?longProject=${projectId}&longProjectTitle=${encodedTitle}`} className="mt-5 inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-black text-white hover:bg-violet-700"><PlusIcon className="h-4 w-4" /> Pick ideas</Link></div>
            ) : (
              <div className="space-y-3">
                {workspace.ideas.map((item, index) => {
                  const status = CAPTURE_STATUS.find((option) => option.value === item.capture_status) ?? CAPTURE_STATUS[0];
                  const cover = item.detail.game?.cover_url;
                  return (
                    <article
                      key={`${item.detail_id}-${index}`}
                      draggable
                      onDragStart={() => setDragIndex(index)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => reorderIdeas(index)}
                      className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600"
                    >
                      <div className="grid gap-0 lg:grid-cols-[56px_110px_minmax(0,1fr)_210px_48px]">
                        <div className="flex items-center justify-center border-b border-slate-200 p-3 lg:border-b-0 lg:border-r dark:border-slate-700"><Bars3Icon className="h-5 w-5 cursor-grab text-slate-300 active:cursor-grabbing" /></div>
                        <div className="relative min-h-[96px] overflow-hidden bg-slate-800 lg:min-h-full">{cover ? <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${cover})` }} /> : <div className="flex h-full min-h-[96px] items-center justify-center text-2xl">🎮</div>}<div className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/55 text-[10px] font-black text-white backdrop-blur">{index + 1}</div></div>
                        <div className="min-w-0 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-500">{item.detail.game?.title || "Unknown game"}</p>
                          <h3 className="mt-1 text-base font-black">{item.detail.title}</h3>
                          <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">{item.detail.description}</p>
                          <Link href={`/idea/${item.detail_id}`} className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs font-black text-sky-600 hover:text-sky-700">Open idea →</Link>
                        </div>
                        <div className="space-y-3 border-t border-slate-200 p-4 lg:border-l lg:border-t-0 dark:border-slate-700">
                          <label className="block"><span className="mb-1 block text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Capture status</span><select value={item.capture_status} onChange={(event) => updateIdea(index, { capture_status: event.target.value as LongVideoCaptureStatus })} className={`h-10 w-full cursor-pointer rounded-xl border-0 px-3 text-xs font-black outline-none ${status.style}`}>{CAPTURE_STATUS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                          <label className="block"><span className="mb-1 block text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Recording note</span><input value={item.recording_notes ?? ""} onChange={(event) => updateIdea(index, { recording_notes: event.target.value })} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900" placeholder="Location, setup, shot..." /></label>
                          <label className="block"><span className="mb-1 block text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">File / folder</span><div className="relative"><FolderOpenIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={item.file_location ?? ""} onChange={(event) => updateIdea(index, { file_location: event.target.value })} className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900" placeholder="Drive link or path" /></div></label>
                        </div>
                        <div className="flex items-center justify-center border-t border-slate-200 p-3 lg:border-l lg:border-t-0 dark:border-slate-700"><button type="button" onClick={() => void removeIdea(index)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-slate-300 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" aria-label={`Remove ${item.detail.title}`}><TrashIcon className="h-4 w-4" /></button></div>
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
