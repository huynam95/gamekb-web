"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowTopRightOnSquareIcon, CheckCircleIcon, CheckIcon, MagnifyingGlassIcon, PuzzlePieceIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabaseClient";
import { useNotifications } from "@/components/NotificationCenter";
import { buildScriptGuide } from "@/lib/scriptGuide";
import { getScriptTopicValue } from "@/lib/scriptTopics";
import { addIdeasToProject } from "@/lib/addIdeasToProject";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Dot, STATUSES, STATUS_META, StatusPill, TopicTile, formatDate } from "@/components/AddToScriptModal";

type ScriptRow = {
  id: number;
  title: string;
  status: string | null;
  topic?: string | null;
  description: string | null;
  assets: { game_title?: string | null }[] | null;
  content: string | null;
  created_at: string | null;
};

type StatusFilter = "All" | (typeof STATUSES)[number];
type PickedIdea = { id: number; title: string; gameTitle?: string | null };

/** Add several selected ideas to one existing Short Project. */
export function AddIdeasToProjectModal({ isOpen, ideas, onClose, onAdded }: { isOpen: boolean; ideas: PickedIdea[]; onClose: () => void; onAdded: () => void }) {
  const { success, error: notifyError } = useNotifications();
  const [scripts, setScripts] = useState<ScriptRow[] | null>(null);
  const [haveByScript, setHaveByScript] = useState<Map<number, Set<number>>>(() => new Map());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ id: number; title: string; added: number; skipped: number; first: number; last: number } | null>(null);

  const ideaIds = useMemo(() => ideas.map((idea) => idea.id), [ideas]);
  const idsKey = ideaIds.join(",");

  const notifyErrorRef = useRef(notifyError);
  useEffect(() => { notifyErrorRef.current = notifyError; }, [notifyError]);
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    supabase
      .from("scripts")
      .select("id,title,status,topic,description,assets,content,created_at")
      .order("id", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) notifyErrorRef.current(error.message, "Could not load projects");
        setScripts((data ?? []) as ScriptRow[]);
      });
    const ids = idsKey ? idsKey.split(",").map(Number) : [];
    if (ids.length) {
      supabase.from("script_ideas").select("script_id,detail_id").in("detail_id", ids).then(({ data }) => {
        if (!active) return;
        const map = new Map<number, Set<number>>();
        for (const row of (data ?? []) as { script_id: number; detail_id: number }[]) {
          if (!map.has(row.script_id)) map.set(row.script_id, new Set());
          map.get(row.script_id)!.add(row.detail_id);
        }
        setHaveByScript(map);
      });
    }
    return () => { active = false; };
  }, [isOpen, idsKey]);

  const summaries = useMemo(() => (scripts ?? []).map((script) => {
    const content = String(script.content || "");
    const sections = buildScriptGuide(content).filter((section) => !section.isHook);
    const gamesFromDescription = Array.from((script.description || "").matchAll(/^•\s*([^:\n]+):/gm), (match) => match[1].trim());
    const gamesFromAssets = (script.assets || []).map((asset) => asset.game_title?.trim()).filter((name): name is string => Boolean(name));
    const games = Array.from(new Set([...gamesFromDescription, ...gamesFromAssets])).filter((name) => name !== "Unknown Game");
    return { script, topic: getScriptTopicValue(script), ideaCount: sections.length, games, has: haveByScript.get(script.id)?.size ?? 0 };
  }), [scripts, haveByScript]);

  const autoPick = summaries.find((s) => s.has < ideas.length && s.script.status !== "Published") ?? summaries[0] ?? null;
  const effectiveId = selectedId ?? autoPick?.script.id ?? null;
  const selected = summaries.find((s) => s.script.id === effectiveId) ?? null;
  const toAdd = selected ? ideas.length - selected.has : 0;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return summaries.filter((s) => {
      if (statusFilter !== "All" && (s.script.status || "Draft") !== statusFilter) return false;
      return !q || [s.script.title, s.topic, ...s.games].some((text) => text?.toLowerCase().includes(q));
    });
  }, [summaries, query, statusFilter]);

  const close = () => { if (!saving) onClose(); };

  const add = async () => {
    if (!selected || toAdd <= 0) return;
    setSaving(true);
    const result = await addIdeasToProject(selected.script.id, ideaIds);
    setSaving(false);
    if (!result.ok) {
      notifyError(result.message, "Ideas not added");
      return;
    }
    success(`${result.added} idea${result.added === 1 ? "" : "s"} added to “${result.title}”.`, "Project updated");
    setDone({ id: selected.script.id, title: result.title, added: result.added, skipped: result.skipped, first: result.firstNumber, last: result.lastNumber });
    onAdded();
  };

  const names = ideas.slice(0, 3).map((idea) => idea.title);

  return (
    <Modal open={isOpen} onClose={close} size="lg" labelledBy="add-ideas-to-project-title">
      <ModalHeader id="add-ideas-to-project-title" title={`Add ${ideas.length} idea${ideas.length === 1 ? "" : "s"} to a project`} onClose={close}>
        <p className="mt-1 line-clamp-1 text-sm text-fg-3">{names.join(" · ")}{ideas.length > 3 ? ` · +${ideas.length - 3} more` : ""}</p>
      </ModalHeader>

      {done ? (
        <>
          <ModalBody className="flex flex-col items-center py-10 text-center">
            <CheckCircleIcon className="h-12 w-12 text-emerald-500" />
            <p className="mt-3 text-lg font-bold text-fg">{done.added} idea{done.added === 1 ? "" : "s"} added</p>
            <p className="mt-1 max-w-sm text-sm text-fg-3">
              {done.added === 1 ? <>Idea #{done.first}</> : <>Ideas #{done.first}–#{done.last}</>} in “{done.title}”.
              {done.skipped > 0 && <> {done.skipped} {done.skipped === 1 ? "was" : "were"} already there.</>}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onClose}>Done</Button>
            <Link href={`/scripts?open=${done.id}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
              <ArrowTopRightOnSquareIcon className="h-4 w-4" /> Open project
            </Link>
          </ModalFooter>
        </>
      ) : (
        <>
          <ModalBody className="space-y-3">
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
              <div className="space-y-2" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-[76px] animate-pulse rounded-2xl bg-surface-sunken" />)}</div>
            ) : summaries.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-sm text-fg-3">No projects yet. Use Create Script to start one.</p>
            ) : visible.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-sm text-fg-3">No projects match. Try another search or status.</p>
            ) : (
              <ul className="max-h-[min(26rem,55dvh)] space-y-2 overflow-y-auto overscroll-contain pr-0.5" role="radiogroup" aria-label="Projects">
                {visible.map((s) => {
                  const active = s.script.id === effectiveId;
                  const all = s.has >= ideas.length;
                  return (
                    <li key={s.script.id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setSelectedId(s.script.id)}
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
                            {formatDate(s.script.created_at) && <><Dot /><span>{formatDate(s.script.created_at)}</span></>}
                          </span>
                          {s.games.length > 0 && (
                            <span className="mt-1.5 flex min-w-0 items-center gap-1 text-xs text-fg-4">
                              <PuzzlePieceIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              <span className="truncate">{s.games.slice(0, 3).join(", ")}{s.games.length > 3 ? ` +${s.games.length - 3}` : ""}</span>
                            </span>
                          )}
                          {s.has > 0 && (
                            <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                              <CheckIcon className="h-3 w-3" /> {all ? "Already has all of them" : `Already has ${s.has} of ${ideas.length}`}
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
                {toAdd > 0 ? (
                  <>Goes in as <span className="font-semibold text-fg-2">{toAdd === 1 ? `idea #${selected.ideaCount + 1}` : `ideas #${selected.ideaCount + 1}–#${selected.ideaCount + toAdd}`}</span>, in the order you picked them{selected.has > 0 && <>; {selected.has} already in it will be skipped</>}.</>
                ) : (
                  <>All selected ideas are already in this project.</>
                )}
                {selected.script.status === "Published" && <span className="text-amber-700 dark:text-amber-300"> This project is already published.</span>}
              </p>
            )}
          </ModalBody>
          <ModalFooter className="items-center">
            <Button variant="ghost" onClick={close} disabled={saving}>Cancel</Button>
            <Button variant="accent" onClick={() => void add()} disabled={saving || !selected || toAdd <= 0}>
              {saving ? "Adding…" : `Add ${toAdd > 0 ? toAdd : ""} idea${toAdd === 1 ? "" : "s"}`.replace("  ", " ")}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
