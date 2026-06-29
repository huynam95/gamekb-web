"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AppSidebar } from "@/components/AppSidebar";
import { useNotifications } from "@/components/NotificationCenter";
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
} from "@heroicons/react/24/outline";

/* ================= TYPES & CONFIG ================= */

type ScriptProject = {
  id: number;
  title: string;
  content: string;
  assets: { url: string; name: string }[];
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

  useEffect(() => {
    if (isOpen && script) {
      setFormData(script);
      setIsEditingTitle(false);
      setActiveTab("script");
    }
  }, [isOpen, script]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/70 p-6 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="flex h-[90vh] w-full max-w-[1300px] flex-col overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-10 py-7 dark:border-slate-800">
          <div className="flex flex-1 items-center gap-5">
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
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">{formData.title}</h2>
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

          <div className="flex items-center gap-5">
            <select
              className="cursor-pointer rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black outline-none dark:bg-slate-900 dark:text-slate-100"
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
              onClick={() => {
                onSave(formData);
                onClose();
              }}
              className="cursor-pointer rounded-2xl bg-slate-900 px-10 py-4 text-sm font-black text-white shadow-xl transition-all hover:bg-black active:scale-95 dark:bg-blue-600 dark:hover:bg-blue-700"
              type="button"
            >
              Save Changes
            </button>
          </div>
        </div>

        <div className="flex border-b border-slate-100 bg-slate-50/50 px-10 dark:border-slate-800 dark:bg-slate-900/60">
          {[
            { id: "script", label: "Script", icon: DocumentTextIcon },
            { id: "metadata", label: "Metadata", icon: InformationCircleIcon },
            { id: "assets", label: "Assets", icon: Squares2X2Icon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex cursor-pointer items-center gap-3 border-b-4 px-8 py-5 text-xs font-black uppercase tracking-[0.2em] transition-all ${
                activeTab === tab.id ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-100"
              }`}
              type="button"
            >
              <tab.icon className="h-5 w-5" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto bg-white p-12 dark:bg-slate-950">
          {activeTab === "script" && (
            <div className="mx-auto flex h-full max-w-5xl flex-col">
              <textarea
                className="h-full w-full resize-none rounded-[2rem] border border-slate-100 bg-slate-50 p-10 font-sans text-xl font-medium leading-relaxed text-slate-900 shadow-inner outline-none placeholder:text-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Bắt đầu soạn thảo kịch bản..."
                value={formData.content || ""}
                onChange={(event) => setFormData({ ...formData, content: event.target.value })}
              />
            </div>
          )}

          {activeTab === "metadata" && (
            <div className="mx-auto max-w-4xl space-y-8">
              <div className="space-y-4">
                <label className="ml-4 block text-xs font-black uppercase tracking-widest text-slate-400">Video Summary Description</label>
                <textarea
                  className="h-64 w-full resize-none rounded-[2rem] border border-slate-100 bg-slate-50 p-8 text-base font-bold leading-relaxed text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
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
            <div className="mx-auto grid max-w-4xl gap-4">
              {formData.assets?.map((asset, index) => (
                <div key={index} className="group flex items-center gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-all hover:border-blue-500 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-100 bg-white font-black text-slate-400 shadow-sm transition-all group-hover:bg-blue-600 group-hover:text-white dark:border-slate-800 dark:bg-slate-950">
                    #{index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-black text-slate-900 dark:text-slate-50">{asset.name}</p>
                    <p className="mt-1 truncate font-mono text-xs font-bold text-slate-500">{asset.url}</p>
                  </div>
                  <a href={asset.url} target="_blank" rel="noopener noreferrer" className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 text-slate-400 shadow-sm hover:text-blue-600 dark:border-slate-800 dark:bg-slate-950">
                    <LinkIcon className="h-5 w-5" />
                  </a>
                </div>
              ))}
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
      setScripts((sData || []) as ScriptProject[]);
      setFilteredScripts((sData || []) as ScriptProject[]);
    }
    load();
  }, []);

  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    const result = scripts.filter((script) => {
      const topic = getScriptTopic(script).toLowerCase();
      return (
        script.title?.toLowerCase().includes(query) ||
        script.description?.toLowerCase().includes(query) ||
        topic.includes(query)
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
    if (!editingScript) return;
    const { error } = await supabase.from("scripts").update(data).eq("id", editingScript.id);
    if (error) {
      notifyError(error.message, "Could not update project");
      return;
    }
    setScripts((prev) => prev.map((script) => (script.id === editingScript.id ? { ...script, ...data } : script)));
    setIsModalOpen(false);
    success("Project updated successfully.", "Project updated");
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
    <div className="flex min-h-screen bg-white font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <ScriptEditorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} script={editingScript} onSave={handleUpdate} />

      <AppSidebar activePage="scripts" />

      <main className="min-w-0 flex-1 pl-0 md:pl-72">
        <div className="mx-auto max-w-[1500px] px-10 py-12">
          <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full max-w-2xl">
              <MagnifyingGlassIcon className="absolute left-6 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-900 dark:text-slate-200" />
              <input
                className="h-16 w-full rounded-[1.5rem] border-2 border-slate-200 bg-white pl-16 pr-12 text-lg font-bold shadow-sm outline-none transition-all focus:border-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:focus:border-blue-500"
                placeholder="Search projects, topic, summary..."
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

          <div className="overflow-hidden rounded-[2.5rem] border-2 border-slate-200 bg-white shadow-2xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/20">
            <table className="w-full table-fixed border-collapse text-left">
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
                  <th className="w-[32%] px-4 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Project</th>
                  <th className="w-[32%] px-4 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Topic</th>
                  <th className="w-[10%] px-4 py-7 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Status</th>
                  <th className="w-[14%] px-4 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Summary</th>
                  <th className="w-[8%] px-6 py-7 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredScripts.map((script) => {
                  const topic = getScriptTopic(script);
                  const topicVisual = getTopicVisual(topic);
                  const summary = getScriptSummary(script);
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
                        <div className="flex items-center gap-5">
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
                          className={`flex h-20 w-full items-center gap-4 rounded-[1.65rem] border px-5 shadow-sm transition-colors ${
                            topic === "No topic"
                              ? "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500"
                              : "border-violet-100 bg-violet-50 text-violet-800 dark:border-violet-900/70 dark:bg-violet-950/40 dark:text-violet-100"
                          }`}
                        >
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-lg shadow-sm ${topicVisual.className}`} aria-hidden="true">
                            {topicVisual.emoji}
                          </span>
                          <span className="line-clamp-2 min-w-0 flex-1 text-left text-base font-black leading-snug tracking-tight">{topic}</span>
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
                    <td colSpan={6} className="px-10 py-20 text-center">
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
