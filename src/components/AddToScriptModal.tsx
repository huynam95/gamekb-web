"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  CheckIcon,
  DocumentPlusIcon,
  FilmIcon,
  FolderPlusIcon,
  MagnifyingGlassIcon,
  PuzzlePieceIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabaseClient";
import { useNotifications } from "@/components/NotificationCenter";
import { buildScriptGuide } from "@/lib/scriptGuide";
import { getScriptTopicValue } from "@/lib/scriptTopics";
import { getTopicVisual } from "@/lib/topicVisuals";
import { useProjectTopics } from "@/lib/useProjectTopics";
import { themeToHashtag, type VideoTheme } from "@/lib/videoThemes";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

/* ================= TYPES ================= */

type IdeaInput = { id: number; title: string; description: string | null };
type GameInput = { title: string } | null;
type FootageInput = { file_path: string | null; title: string | null; channel_name: string | null };

type ScriptAsset = {
  url: string;
  name: string;
  channel_name?: string | null;
  idea_id?: number | null;
  idea_title?: string | null;
  game_title?: string | null;
  idea_order?: number | null;
};

type ScriptRow = {
  id: number;
  title: string;
  status: string | null;
  topic?: string | null;
  description: string | null;
  tags: string[] | null;
  hashtags: string[] | null;
  assets: ScriptAsset[] | null;
  content: string | null;
  created_at: string | null;
};

type ProjectSummary = {
  script: ScriptRow;
  topic: string;
  ideaCount: number;
  clipCount: number;
  games: string[];
  alreadyHasIdea: boolean;
  lastLine: string;
};

const STATUSES = ["Draft", "Filming", "Edited", "Published"] as const;
type StatusFilter = "All" | (typeof STATUSES)[number];

const STATUS_META: Record<string, { dot: string; pill: string }> = {
  Draft: { dot: "bg-slate-400", pill: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  Filming: { dot: "bg-amber-500", pill: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
  Edited: { dot: "bg-indigo-500", pill: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300" },
  Published: { dot: "bg-emerald-500", pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
};

/* ================= SCRIPT TEXT HELPERS ================= */

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

/** The narration line this idea adds to a script, e.g. "In GTA V, NPCs remember…". */
function buildScriptLine(idea: IdeaInput, gameName: string) {
  const rawDetail = (idea.description || idea.title || "").replace(/\s+/g, " ").replace(/^\[[^\]]+\]\s*/, "").trim();
  const safeGameName = gameName || "this game";
  if (!rawDetail) return `In ${safeGameName}, ${smoothScriptDetail(idea.title)}`;
  if (/^in\s+/i.test(rawDetail)) return ensurePeriod(rawDetail);
  return ensurePeriod(`In ${safeGameName}, ${smoothScriptDetail(rawDetail)}`);
}

function gameHashtag(gameName: string) {
  return gameName ? `#${gameName.replace(/\s+/g, "").toLowerCase()}` : "";
}

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}

function summarise(script: ScriptRow, idea: IdeaInput, gameName: string, scriptLine: string): ProjectSummary {
  const content = String(script.content || "");
  const sections = buildScriptGuide(content).filter((section) => !section.isHook);
  const assets = script.assets || [];
  const gamesFromAssets = assets.map((asset) => asset.game_title?.trim()).filter((name): name is string => Boolean(name && name !== "Unknown Game"));
  const gamesFromDescription = Array.from((script.description || "").matchAll(/^•\s*([^:\n]+):/gm), (match) => match[1].trim());
  const ideaLine = `• ${gameName || "Unknown Game"}: ${idea.title}`;
  return {
    script,
    topic: getScriptTopicValue(script),
    ideaCount: sections.length,
    clipCount: assets.length,
    games: Array.from(new Set([...gamesFromDescription, ...gamesFromAssets])).filter((name) => name !== "Unknown Game"),
    alreadyHasIdea: assets.some((asset) => asset.idea_id === idea.id) || content.includes(scriptLine) || (script.description || "").includes(ideaLine),
    lastLine: sections.length ? content.slice(sections[sections.length - 1].start, sections[sections.length - 1].end).replace(/\s+/g, " ") : "",
  };
}

/* ================= SMALL PIECES ================= */

function StatusPill({ status }: { status: string | null }) {
  const value = status || "Draft";
  const meta = STATUS_META[value] ?? STATUS_META.Draft;
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2 text-[11px] font-semibold ${meta.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {value}
    </span>
  );
}

function TopicTile({ topic, className = "h-10 w-10" }: { topic: string; className?: string }) {
  const { Icon, softClass } = getTopicVisual(topic, -1);
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-xl ring-1 ${softClass} ${className}`}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

function Dot() {
  return <span className="text-fg-4" aria-hidden="true">·</span>;
}

/* ================= MAIN ================= */

export function AddToScriptModal({
  isOpen,
  onClose,
  detail,
  game,
  footage,
}: {
  isOpen: boolean;
  onClose: () => void;
  detail: IdeaInput;
  game: GameInput;
  footage: FootageInput[];
}) {
  const { success, error: notifyError } = useNotifications();
  const [activeTab, setActiveTab] = useState<"existing" | "new">("existing");
  const [scripts, setScripts] = useState<ScriptRow[] | null>(null);
  const [selectedScriptId, setSelectedScriptId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ id: number; title: string; ideaNumber: number; created: boolean } | null>(null);

  // New project
  const { topics, loading: topicsLoading } = useProjectTopics(isOpen);
  const [topicTitle, setTopicTitle] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [titleEdited, setTitleEdited] = useState(false);

  const gameName = game?.title || "";
  const scriptLine = buildScriptLine(detail, gameName);
  const descPart = `• ${gameName || "Unknown Game"}: ${detail.title}${detail.description ? `\n${detail.description}` : ""}`;
  const baseAssets: ScriptAsset[] = footage.map((f) => ({
    url: f.file_path || "",
    name: f.title || f.file_path?.split("/").pop() || "Video",
    channel_name: f.channel_name || null,
    idea_id: detail.id,
    idea_title: detail.title,
    game_title: gameName || "Unknown Game",
  }));

  const selectedTopic: VideoTheme | null = topics.find((topic) => topic.title === topicTitle) ?? null;
  const suggestedTitle = `${topicTitle ? `${topicTitle}: ` : "Video Script: "}${detail.title}`;

  // The page mounts this dialog fresh each time it opens, so state starts clean.
  const notifyErrorRef = useRef(notifyError);
  useEffect(() => { notifyErrorRef.current = notifyError; }, [notifyError]);
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    supabase
      .from("scripts")
      .select("id,title,status,topic,description,tags,hashtags,assets,content,created_at")
      .order("id", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) notifyErrorRef.current(error.message, "Could not load projects");
        const rows = (data ?? []) as ScriptRow[];
        setScripts(rows);
        if (rows.length === 0) setActiveTab("new");
      });
    return () => { active = false; };
  }, [isOpen]);

  const summaries = useMemo(
    () => (scripts ?? []).map((script) => summarise(script, detail, gameName, scriptLine)),
    [scripts, detail, gameName, scriptLine],
  );

  // Until the user picks one, suggest the newest project that is still being worked on and doesn't have this idea yet.
  const autoPick = summaries.find((s) => !s.alreadyHasIdea && s.script.status !== "Published") ?? summaries[0] ?? null;
  const effectiveId = selectedScriptId ?? autoPick?.script.id ?? null;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return summaries.filter((s) => {
      if (statusFilter !== "All" && (s.script.status || "Draft") !== statusFilter) return false;
      if (!q) return true;
      return [s.script.title, s.topic, ...s.games].some((text) => text?.toLowerCase().includes(q));
    });
  }, [summaries, query, statusFilter]);

  const alreadyIn = summaries.filter((s) => s.alreadyHasIdea);
  const selected = summaries.find((s) => s.script.id === effectiveId) ?? null;

  const close = () => {
    if (saving) return;
    onClose();
  };

  const handleAddToExisting = async () => {
    if (!selected) return;
    setSaving(true);
    const { data: current, error: fetchErr } = await supabase.from("scripts").select("*").eq("id", selected.script.id).single();
    if (fetchErr || !current) {
      setSaving(false);
      notifyError("Error fetching script data.", "Could not load script");
      return;
    }
    const nextIdeaOrder = buildScriptGuide(String(current.content || "")).filter((section) => !section.isHook).length + 1;
    const { error } = await supabase
      .from("scripts")
      .update({
        content: current.content ? `${current.content}\n\n${scriptLine}` : scriptLine,
        description: current.description ? `${current.description}\n\n${descPart}` : descPart,
        tags: Array.from(new Set([...(current.tags || []), gameName, "Shorts", "Gaming", "Game Facts"].filter(Boolean))),
        hashtags: Array.from(new Set([...(current.hashtags || []), "#shorts", "#gaming", gameHashtag(gameName)].filter(Boolean))),
        assets: [...(current.assets || []), ...baseAssets.map((asset) => ({ ...asset, idea_order: nextIdeaOrder }))],
      })
      .eq("id", selected.script.id);
    setSaving(false);
    if (error) {
      notifyError("Failed to update script.", "Could not update script");
      return;
    }
    success(`Added to “${current.title}” as idea #${nextIdeaOrder}.`, "Script updated");
    setDone({ id: selected.script.id, title: current.title, ideaNumber: nextIdeaOrder, created: false });
  };

  const handleCreateNew = async () => {
    const title = (titleEdited ? newTitle : suggestedTitle).trim();
    if (!title) return;
    setSaving(true);
    const hook = selectedTopic?.hook?.trim() || "";
    const topicDescription = topicTitle ? `Topic: ${topicTitle}${hook ? `\nHook: ${hook}` : ""}\n\n` : "";
    const { data, error } = await supabase
      .from("scripts")
      .insert({
        title,
        topic: topicTitle,
        content: hook ? `${hook}\n\n${scriptLine}` : scriptLine,
        description: `${topicDescription}Video tổng hợp các chi tiết thú vị.\n\n${descPart}`,
        tags: Array.from(new Set([topicTitle, gameName, "Shorts", "Gaming", "Game Facts"].filter(Boolean))),
        hashtags: Array.from(new Set(["#shorts", "#gaming", selectedTopic ? themeToHashtag(selectedTopic) : "", gameHashtag(gameName)].filter(Boolean))),
        assets: baseAssets.map((asset) => ({ ...asset, idea_order: 1 })),
        status: "Draft",
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      notifyError("Failed to create script.", "Could not create script");
      return;
    }
    success("Created new script with this idea!", "Script created");
    setDone({ id: (data as { id: number } | null)?.id ?? 0, title, ideaNumber: 1, created: true });
  };

  const tabClass = (active: boolean) =>
    `flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${active ? "bg-surface text-fg shadow-sm ring-1 ring-line" : "text-fg-3 hover:text-fg"}`;

  return (
    <Modal open={isOpen} onClose={close} size="lg" labelledBy="add-to-script-title">
      <ModalHeader id="add-to-script-title" title="Add to Script Project" onClose={close}>
        <p className="mt-1 line-clamp-1 text-sm text-fg-3">
          {gameName && <span className="font-medium text-fg-2">{gameName}</span>}
          {gameName && <span className="mx-1.5 text-fg-4">·</span>}
          {detail.title}
        </p>
      </ModalHeader>

      {done ? (
        <>
          <ModalBody className="flex flex-col items-center py-10 text-center">
            <CheckCircleIcon className="h-12 w-12 text-emerald-500" />
            <p className="mt-3 text-lg font-bold text-fg">{done.created ? "Project created" : "Idea added"}</p>
            <p className="mt-1 max-w-sm text-sm text-fg-3">
              {done.created ? <>“{done.title}” starts with this idea.</> : <>It is idea #{done.ideaNumber} in “{done.title}”.</>}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onClose}>Done</Button>
            {done.id > 0 && (
              <Link href={`/scripts?open=${done.id}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
                <ArrowTopRightOnSquareIcon className="h-4 w-4" /> Open project
              </Link>
            )}
          </ModalFooter>
        </>
      ) : (
        <>
          <ModalBody className="space-y-4">
            {/* What this idea contributes, so the choice below is informed. */}
            <div className="rounded-2xl border border-line-soft bg-surface-muted p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-4">Adds to the script</p>
              <p className="mt-1 line-clamp-3 text-sm leading-6 text-fg-2">“{scriptLine}”</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-3">
                <span className="inline-flex items-center gap-1"><FilmIcon className="h-3.5 w-3.5" /> {footage.length} clip{footage.length === 1 ? "" : "s"}</span>
                {alreadyIn.length > 0 && (
                  <>
                    <Dot />
                    <span className="font-medium text-amber-700 dark:text-amber-300">Already in {alreadyIn.length} project{alreadyIn.length === 1 ? "" : "s"}</span>
                  </>
                )}
              </p>
            </div>

            <div className="flex gap-1 rounded-2xl bg-surface-sunken p-1" role="tablist">
              <button type="button" role="tab" aria-selected={activeTab === "existing"} onClick={() => setActiveTab("existing")} className={tabClass(activeTab === "existing")}>
                <FolderPlusIcon className="h-5 w-5" /> Existing
                {scripts && <span className="rounded-full bg-surface-strong px-1.5 text-[11px] tabular-nums text-fg-3">{scripts.length}</span>}
              </button>
              <button type="button" role="tab" aria-selected={activeTab === "new"} onClick={() => setActiveTab("new")} className={tabClass(activeTab === "new")}>
                <DocumentPlusIcon className="h-5 w-5" /> New project
              </button>
            </div>

            {activeTab === "existing" ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="relative block min-w-0 flex-1">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-4" />
                    <Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, topic or game" aria-label="Search projects" />
                  </label>
                  <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Filter by status">
                    {(["All", ...STATUSES] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        aria-pressed={statusFilter === status}
                        onClick={() => setStatusFilter(status)}
                        className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${statusFilter === status ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950" : "text-fg-3 hover:bg-surface-sunken hover:text-fg"}`}
                      >
                        {status !== "All" && <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[status].dot}`} aria-hidden="true" />}
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {scripts === null ? (
                  <div className="space-y-2" aria-busy="true">
                    {[0, 1, 2].map((i) => <div key={i} className="h-[76px] animate-pulse rounded-2xl bg-surface-sunken" />)}
                  </div>
                ) : summaries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-sm text-fg-3">
                    No projects yet.{" "}
                    <button type="button" className="cursor-pointer font-semibold text-accent hover:underline" onClick={() => setActiveTab("new")}>Create one with this idea</button>
                  </div>
                ) : visible.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-sm text-fg-3">No projects match. Try another search or status.</p>
                ) : (
                  <ul className="max-h-[min(24rem,50dvh)] space-y-2 overflow-y-auto overscroll-contain pr-0.5" role="radiogroup" aria-label="Projects">
                    {visible.map((s) => {
                      const active = s.script.id === effectiveId;
                      const shownGames = s.games.slice(0, 3);
                      return (
                        <li key={s.script.id}>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setSelectedScriptId(s.script.id)}
                            className={`flex w-full cursor-pointer items-start gap-3 rounded-2xl border p-3 text-left transition ${active ? "border-blue-500 bg-accent-soft ring-1 ring-blue-500" : "border-line bg-surface hover:border-line-strong hover:bg-surface-hover"}`}
                          >
                            <TopicTile topic={s.topic} />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-start justify-between gap-2">
                                <span className="line-clamp-2 text-sm font-semibold leading-5 text-fg">{s.script.title}</span>
                                <StatusPill status={s.script.status} />
                              </span>
                              <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-fg-3">
                                <span className="max-w-full truncate">{s.topic || "No topic"}</span>
                                <Dot />
                                <span className="tabular-nums">{s.ideaCount} idea{s.ideaCount === 1 ? "" : "s"}</span>
                                <Dot />
                                <span className="tabular-nums">{s.clipCount} clip{s.clipCount === 1 ? "" : "s"}</span>
                                {formatDate(s.script.created_at) && (
                                  <>
                                    <Dot />
                                    <span>{formatDate(s.script.created_at)}</span>
                                  </>
                                )}
                              </span>
                              {shownGames.length > 0 && (
                                <span className="mt-1.5 flex min-w-0 items-center gap-1 text-xs text-fg-4">
                                  <PuzzlePieceIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                  <span className="truncate">{shownGames.join(", ")}{s.games.length > 3 ? ` +${s.games.length - 3}` : ""}</span>
                                </span>
                              )}
                              {s.alreadyHasIdea && (
                                <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                                  <CheckIcon className="h-3 w-3" /> Already has this idea
                                </span>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {selected && (
                  <p className="text-xs leading-5 text-fg-3">
                    Goes in as <span className="font-semibold text-fg-2">idea #{selected.ideaCount + 1}</span>
                    {selected.lastLine && <>, right after “<span className="italic">{selected.lastLine.length > 90 ? `${selected.lastLine.slice(0, 90)}…` : selected.lastLine}</span>”</>}
                    {selected.script.status === "Published" && <span className="text-amber-700 dark:text-amber-300"> — this project is already published.</span>}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-fg-3">Topic</p>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Project topic">
                    {[{ title: "", hook: "" } as Pick<VideoTheme, "title" | "hook">, ...topics].map((topic) => {
                      const active = topic.title === topicTitle;
                      return (
                        <button
                          key={topic.title || "__none__"}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setTopicTitle(topic.title)}
                          className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-2 py-2 text-left transition sm:gap-2.5 sm:px-2.5 ${active ? "border-blue-500 bg-accent-soft ring-1 ring-blue-500" : "border-line bg-surface hover:border-line-strong hover:bg-surface-hover"}`}
                        >
                          <TopicTile topic={topic.title} className="h-8 w-8 max-sm:h-7 max-sm:w-7" />
                          <span className={`line-clamp-2 text-[13px] font-semibold leading-[1.15rem] sm:text-sm sm:leading-5 ${topic.title ? "text-fg" : "text-fg-3"}`}>{topic.title || "No topic"}</span>
                        </button>
                      );
                    })}
                    {topicsLoading && [0, 1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-sunken" />)}
                  </div>
                  {selectedTopic?.hook && (
                    <p className="mt-2 rounded-xl bg-surface-muted px-3 py-2 text-xs leading-5 text-fg-3">
                      <span className="font-semibold text-fg-2">Opening hook:</span> {selectedTopic.hook}
                    </p>
                  )}
                </div>

                <Field label="Project title">
                  <Input
                    className="font-semibold"
                    value={titleEdited ? newTitle : suggestedTitle}
                    onChange={(e) => { setTitleEdited(true); setNewTitle(e.target.value); }}
                    placeholder="Enter project title..."
                  />
                  {titleEdited && newTitle !== suggestedTitle && (
                    <button type="button" className="mt-1.5 cursor-pointer text-xs font-medium text-accent hover:underline" onClick={() => setTitleEdited(false)}>
                      Use suggested title
                    </button>
                  )}
                </Field>
              </div>
            )}
          </ModalBody>

          <ModalFooter className="items-center">
            <Button variant="ghost" onClick={close} disabled={saving}>Cancel</Button>
            {activeTab === "existing" ? (
              <Button variant="accent" onClick={() => void handleAddToExisting()} disabled={saving || !selected}>
                {saving ? "Adding..." : selected?.alreadyHasIdea ? "Add again" : "Add to project"}
              </Button>
            ) : (
              <Button variant="primary" onClick={() => void handleCreateNew()} disabled={saving || !(titleEdited ? newTitle : suggestedTitle).trim()}>
                {saving ? "Creating..." : "Create project"}
              </Button>
            )}
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
