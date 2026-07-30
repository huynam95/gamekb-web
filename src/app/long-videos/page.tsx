"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CameraIcon,
  CheckCircleIcon,
  ClockIcon,
  FilmIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AppSidebar } from "@/components/AppSidebar";
import { AppPageHeader, appPageMainClass, appPagePrimaryActionClass, appPageRootClass } from "@/components/AppPage";
import { useNotifications } from "@/components/NotificationCenter";
import type { LongVideoProject } from "@/types/gamekb";

const STATUS_LABEL: Record<LongVideoProject["status"], string> = {
  planning: "Planning",
  writing: "Preparing",
  recording: "Recording",
  editing: "Editing",
  ready: "Ready",
  published: "Published",
};

const STATUS_STYLE: Record<LongVideoProject["status"], string> = {
  planning: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  writing: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  recording: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  editing: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  ready: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  published: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300",
};

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json" } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload;
}

export default function LongVideosPage() {
  const router = useRouter();
  const { success, error: notifyError, confirm } = useNotifications();
  const [projects, setProjects] = useState<LongVideoProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", core_idea: "", target_duration_minutes: 10, thumbnail_notes: "" });

  const load = async () => {
    setLoading(true);
    try {
      const result = await api<{ data: LongVideoProject[] }>("/api/long-videos");
      setProjects(result.data);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Could not load long video projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter((project) => [project.title, project.core_idea].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle)));
  }, [projects, query]);

  const createProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const result = await api<{ data: LongVideoProject }>("/api/long-videos", { method: "POST", body: JSON.stringify(form) });
      success("Long video project created.", "Project ready");
      router.push(`/long-videos/${result.data.id}`);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Could not create project");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (project: LongVideoProject) => {
    if (!(await confirm({
      title: "Delete long video project?",
      message: `“${project.title}” and its recording list will be removed. Your original ideas stay safe.`,
      confirmText: "Delete",
    }))) return;

    try {
      await api(`/api/long-videos/${project.id}`, { method: "DELETE" });
      setProjects((current) => current.filter((item) => item.id !== project.id));
      success("Long video project deleted.", "Removed");
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Could not delete project");
    }
  };

  return (
    <div className={appPageRootClass}>
      <AppSidebar activePage="longVideos" />
      <main className={appPageMainClass}>
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AppPageHeader
            title="Long Video Projects"
            description="Create a project, collect ideas from All Ideas, then use the project as your recording checklist."
            icon={<FilmIcon className="h-5 w-5" />}
            action={
              <button type="button" onClick={() => setShowCreate(true)} className={appPagePrimaryActionClass}>
                <PlusIcon className="h-4 w-4" /> New project
              </button>
            }
          />

          <div className="mb-6 rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search long video projects..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          {loading ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-12 text-center text-sm font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-900">Loading projects...</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-14 text-center dark:border-slate-700 dark:bg-slate-900">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-50 text-3xl dark:bg-violet-950/30">🎥</div>
              <h2 className="mt-4 text-xl font-black">Start a long video project</h2>
              <p className="mt-2 text-sm text-slate-500">Create the project first, then pick ideas from your main library.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((project) => {
                const items = project.project_ideas ?? [];
                const recorded = items.filter((item) => item.capture_status === "recorded" || item.capture_status === "approved").length;
                const remaining = Math.max(0, items.length - recorded);
                const progress = items.length ? Math.round((recorded / items.length) * 100) : 0;
                const ideaCover = items.find((item) => item.detail?.game?.cover_url)?.detail?.game?.cover_url;
                const cover = project.thumbnail_url || ideaCover;
                const hasProjectThumbnail = Boolean(project.thumbnail_url);

                return (
                  <article
                    key={project.id}
                    onClick={() => router.push(`/long-videos/${project.id}`)}
                    className="group relative min-h-[270px] cursor-pointer overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-900 shadow-sm transition hover:border-violet-300 hover:shadow-xl dark:border-slate-800"
                  >
                    {cover && <div className={`absolute inset-0 bg-cover bg-center ${hasProjectThumbnail ? "opacity-55" : "opacity-30"}`} style={{ backgroundImage: `url(${cover})` }} />}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-slate-900/35" />
                    <div className="relative flex min-h-[270px] flex-col p-5 text-white">
                      <div className="flex items-start justify-between gap-3">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${STATUS_STYLE[project.status]}`}>{STATUS_LABEL[project.status]}</span>
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); void remove(project); }}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-black/20 text-white/55 opacity-0 backdrop-blur transition hover:bg-rose-500 hover:text-white group-hover:opacity-100"
                          aria-label={`Delete ${project.title}`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>

                      <h2 className="mt-4 line-clamp-2 text-xl font-black leading-tight">{project.title}</h2>
                      <p className="mt-2 line-clamp-3 text-sm font-medium leading-5 text-white/60">{project.core_idea || "No project goal written yet."}</p>

                      <div className="mt-auto pt-6">
                        <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-white/55">
                          <span>Recording progress</span><span>{progress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} /></div>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <div><p className="text-[9px] font-black uppercase tracking-wider text-white/40">Ideas</p><p className="mt-1 text-sm font-black">{items.length}</p></div>
                          <div><p className="text-[9px] font-black uppercase tracking-wider text-white/40">Remaining</p><p className="mt-1 text-sm font-black">{remaining}</p></div>
                          <div><p className="text-[9px] font-black uppercase tracking-wider text-white/40">Target</p><p className="mt-1 text-sm font-black">{project.target_duration_minutes}m</p></div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {showCreate && (
        <div className="fixed inset-0 z-[99990] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-sm" onMouseDown={() => setShowCreate(false)}>
          <form onSubmit={createProject} onMouseDown={(event) => event.stopPropagation()} className="my-auto w-full max-w-xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-500">New project</p><h2 className="mt-1 text-2xl font-black">Create long video project</h2></div>
              <button type="button" onClick={() => setShowCreate(false)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 dark:bg-slate-900"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-6">
              <label className="block"><span className="mb-1.5 block text-xs font-black text-slate-500">Project title</span><input autoFocus value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900" placeholder="50 details that make RDR2 feel alive" /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-black text-slate-500">Main goal</span><textarea value={form.core_idea} onChange={(event) => setForm((current) => ({ ...current, core_idea: event.target.value }))} rows={3} className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900" placeholder="What should this video deliver to viewers?" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label><span className="mb-1.5 block text-xs font-black text-slate-500">Target duration</span><div className="relative"><input type="number" min={1} value={form.target_duration_minutes} onChange={(event) => setForm((current) => ({ ...current, target_duration_minutes: Number(event.target.value) }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pr-12 text-sm font-bold dark:border-slate-700 dark:bg-slate-900" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">min</span></div></label>
                <label><span className="mb-1.5 block text-xs font-black text-slate-500">Thumbnail concept</span><input value={form.thumbnail_notes} onChange={(event) => setForm((current) => ({ ...current, thumbnail_notes: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900" placeholder="Subject, text, contrast..." /></label>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
              <button type="button" onClick={() => setShowCreate(false)} className="h-11 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-950">Cancel</button>
              <button disabled={saving || !form.title.trim()} className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-black text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"><CameraIcon className="h-4 w-4" />{saving ? "Creating..." : "Create project"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
