"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  FilmIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlayIcon,
  PuzzlePieceIcon,
  VideoCameraIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabaseClient";
import { AppSidebar } from "@/components/AppSidebar";
import { AppPageHeader, appPageMainClass, appPageRootClass } from "@/components/AppPage";
import { useNotifications } from "@/components/NotificationCenter";
import { CoverImage } from "@/components/CoverImage";
import { TypeLabel } from "@/components/TypePill";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import {
  CAPTURE_META,
  CAPTURE_STATUSES,
  OWN_FOOTAGE_LABEL,
  PRIORITY_META,
  RECORDING_SETUP_MESSAGE,
  captureStatusPatch,
  isMissingRecordingColumns,
  type CaptureStatus,
} from "@/lib/recording";

/* ================= TYPES ================= */

type Clip = { id: number; file_path: string | null; title: string | null; label: string | null; downloaded: boolean | null };
type GameInfo = { id: number; title: string; cover_url: string | null; release_year: number | null };

type RecItem = {
  id: number;
  title: string;
  description: string | null;
  detail_type: string;
  game_id: number;
  capture_status: CaptureStatus;
  capture_notes: string | null;
  capture_priority: number | null;
  capture_added_at: string | null;
  recorded_at: string | null;
  game: GameInfo | null;
  footage: Clip[] | null;
};

type Tab = CaptureStatus | "all";
type ItemPatch = {
  capture_status?: CaptureStatus | null;
  capture_notes?: string | null;
  capture_priority?: number | null;
  capture_added_at?: string | null;
  recorded_at?: string | null;
};

const TABS: { key: Tab; label: string }[] = [
  { key: "to_record", label: "To record" },
  { key: "recorded", label: "Recorded" },
  { key: "used", label: "Used" },
  { key: "all", label: "All" },
];

/* ================= HELPERS ================= */

function byPriorityThenAdded(a: RecItem, b: RecItem) {
  return (a.capture_priority ?? 2) - (b.capture_priority ?? 2) || String(a.capture_added_at ?? "").localeCompare(String(b.capture_added_at ?? "")) || a.id - b.id;
}

function formatShortDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function ownClips(item: RecItem) {
  return (item.footage ?? []).filter((clip) => clip.label === OWN_FOOTAGE_LABEL);
}

function referenceClips(item: RecItem) {
  return (item.footage ?? []).filter((clip) => clip.label !== OWN_FOOTAGE_LABEL && clip.file_path);
}

function StatusPill({ status }: { status: CaptureStatus }) {
  const meta = CAPTURE_META[status];
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2 text-[11px] font-semibold ${meta.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {meta.short}
    </span>
  );
}

function GameCover({ game, className = "h-12 w-9" }: { game: GameInfo | null; className?: string }) {
  return (
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-sunken text-fg-4 ring-1 ring-black/5 dark:ring-white/10 ${className}`}>
      {game?.cover_url ? <CoverImage src={game.cover_url} sizes="48px" /> : <PuzzlePieceIcon className="h-4 w-4" />}
    </span>
  );
}

/* ================= EDIT DIALOG ================= */

function EditRecordingModal({
  item,
  onClose,
  onSave,
  onAttach,
}: {
  item: RecItem;
  onClose: () => void;
  onSave: (patch: ItemPatch) => Promise<boolean>;
  onAttach: (path: string) => Promise<boolean>;
}) {
  const [status, setStatus] = useState<CaptureStatus>(item.capture_status);
  const [priority, setPriority] = useState(item.capture_priority ?? 2);
  const [notes, setNotes] = useState(item.capture_notes ?? "");
  const [path, setPath] = useState("");
  const [saving, setSaving] = useState(false);
  const clips = ownClips(item);

  const save = async () => {
    setSaving(true);
    if (path.trim()) {
      const attached = await onAttach(path.trim());
      if (!attached) { setSaving(false); return; }
    }
    const patch: ItemPatch = {
      ...(status !== item.capture_status ? captureStatusPatch(status, item) : {}),
      capture_priority: priority,
      capture_notes: notes.trim() || null,
    };
    const ok = await onSave(patch);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal open onClose={() => !saving && onClose()} size="md" labelledBy="edit-recording-title">
      <ModalHeader id="edit-recording-title" title={item.title} eyebrow={item.game?.title || "Recording"} onClose={onClose} />
      <ModalBody className="space-y-5">
        <div>
          <p className="mb-1.5 text-xs font-medium text-fg-3">Status</p>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-sunken p-1" role="radiogroup" aria-label="Recording status">
            {CAPTURE_STATUSES.map((value) => (
              <button key={value} type="button" role="radio" aria-checked={status === value} onClick={() => setStatus(value)} className={`flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition ${status === value ? "bg-surface text-fg shadow-sm ring-1 ring-line" : "text-fg-3 hover:text-fg"}`}>
                <span className={`h-2 w-2 rounded-full ${CAPTURE_META[value].dot}`} /> {CAPTURE_META[value].short}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-fg-3">Priority</p>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-sunken p-1" role="radiogroup" aria-label="Priority">
            {[1, 2, 3].map((value) => (
              <button key={value} type="button" role="radio" aria-checked={priority === value} onClick={() => setPriority(value)} className={`min-h-10 cursor-pointer rounded-lg text-sm font-semibold transition ${priority === value ? "bg-surface text-fg shadow-sm ring-1 ring-line" : "text-fg-3 hover:text-fg"}`}>
                {PRIORITY_META[value].label}
              </button>
            ))}
          </div>
        </div>
        <Field label="How to record it">
          <Textarea className="min-h-[120px] resize-y" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Mission, time of day, location, save file, settings..." />
        </Field>
        <Field label="Add your recording (file path or link)">
          <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="D:/Recordings/rdr2_store.mp4" />
          <span className="mt-1.5 block text-xs text-fg-4">Saved to this idea&apos;s footage as your own clip.</span>
        </Field>
        {clips.length > 0 && (
          <ul className="space-y-1.5">
            {clips.map((clip) => (
              <li key={clip.id} className="flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-2 text-xs text-fg-2">
                <VideoCameraIcon className="h-4 w-4 shrink-0 text-rose-500" />
                <span className="truncate font-mono">{clip.file_path}</span>
              </li>
            ))}
          </ul>
        )}
      </ModalBody>
      <ModalFooter className="items-center">
        <Link href={`/idea/${item.id}`} className="mr-auto inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
          Open idea <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
        </Link>
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary" onClick={() => void save()} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
      </ModalFooter>
    </Modal>
  );
}

/* ================= RECORDING MODE ================= */

function RecordingMode({
  queue,
  onClose,
  onRecorded,
  onSaveNotes,
}: {
  queue: RecItem[];
  onClose: () => void;
  onRecorded: (item: RecItem, path: string) => Promise<boolean>;
  onSaveNotes: (item: RecItem, notes: string) => void;
}) {
  // The queue is frozen when recording starts, so marking an idea doesn't reshuffle it.
  const [items] = useState(queue);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<Set<number>>(() => new Set());
  const [path, setPath] = useState("");
  const [notes, setNotes] = useState(queue[0]?.capture_notes ?? "");
  const [busy, setBusy] = useState(false);
  const item = items[index] ?? null;
  const finished = index >= items.length;

  const goTo = useCallback((next: number) => {
    setIndex(next);
    setPath("");
    setNotes(items[next]?.capture_notes ?? "");
  }, [items]);

  const flushNotes = useCallback(() => {
    if (item && (item.capture_notes ?? "") !== notes.trim()) onSaveNotes(item, notes.trim());
  }, [item, notes, onSaveNotes]);

  const markRecorded = useCallback(async () => {
    if (!item || busy) return;
    setBusy(true);
    flushNotes();
    const ok = await onRecorded(item, path.trim());
    setBusy(false);
    if (!ok) return;
    setDone((current) => new Set(current).add(item.id));
    goTo(index + 1);
  }, [item, busy, flushNotes, onRecorded, path, goTo, index]);

  const skip = useCallback(() => { flushNotes(); goTo(index + 1); }, [flushNotes, goTo, index]);
  const back = useCallback(() => { if (index > 0) { flushNotes(); goTo(index - 1); } }, [flushNotes, goTo, index]);

  // Keyboard: Ctrl/⌘ + Enter = recorded, Alt + → skip, Alt + ← back.
  const keyRef = useRef({ markRecorded, skip, back });
  useEffect(() => { keyRef.current = { markRecorded, skip, back }; }, [markRecorded, skip, back]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void keyRef.current.markRecorded(); }
      else if (event.altKey && event.key === "ArrowRight") { event.preventDefault(); keyRef.current.skip(); }
      else if (event.altKey && event.key === "ArrowLeft") { event.preventDefault(); keyRef.current.back(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const refs = item ? referenceClips(item) : [];

  return (
    <Modal open onClose={() => { flushNotes(); onClose(); }} size="xl" labelledBy="recording-mode-title" closeOnOverlay={false}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line-soft px-5 py-3.5 sm:px-6">
        <div className="min-w-0">
          <p id="recording-mode-title" className="flex items-center gap-2 text-sm font-bold text-fg">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" /></span>
            Recording mode
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-fg-3">{Math.min(index + 1, items.length)} of {items.length} · {done.size} recorded</p>
        </div>
        <button type="button" onClick={() => { flushNotes(); onClose(); }} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-fg-4 transition hover:bg-surface-sunken hover:text-fg" aria-label="Close recording mode">
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="h-1 w-full shrink-0 bg-surface-sunken">
        <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${items.length ? (Math.min(index, items.length) / items.length) * 100 : 0}%` }} />
      </div>

      {finished || !item ? (
        <ModalBody className="flex flex-col items-center py-14 text-center">
          <CheckCircleIcon className="h-14 w-14 text-emerald-500" />
          <p className="mt-3 text-xl font-bold text-fg">Session done</p>
          <p className="mt-1 text-sm text-fg-3">{done.size} of {items.length} ideas recorded.</p>
          <div className="mt-6 flex gap-2">
            {items.length > 0 && <Button variant="secondary" onClick={() => goTo(0)}><ArrowUturnLeftIcon className="h-4 w-4" /> Go through again</Button>}
            <Button variant="primary" onClick={onClose}>Finish</Button>
          </div>
        </ModalBody>
      ) : (
        <>
          <ModalBody className="space-y-5">
            <div className="flex items-start gap-4">
              <GameCover game={item.game} className="h-20 w-14 sm:h-24 sm:w-[4.5rem]" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-fg-3">{item.game?.title || "Game"}</p>
                <h2 className="mt-1 text-2xl font-black leading-tight text-fg sm:text-3xl">{item.title}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <TypeLabel typeKey={item.detail_type} className="font-semibold text-fg-3" />
                  {item.capture_priority === 1 && <span className="font-semibold text-rose-600 dark:text-rose-300">· Record first</span>}
                  {done.has(item.id) && <span className="inline-flex items-center gap-1 font-semibold text-emerald-600"><CheckIcon className="h-3.5 w-3.5" /> Recorded this session</span>}
                </div>
              </div>
            </div>

            {item.description && <p className="whitespace-pre-wrap break-words text-base leading-7 text-fg-2 sm:text-lg sm:leading-8">{item.description}</p>}

            <Field label="How to record it">
              <Textarea className="min-h-[88px] resize-y" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={flushNotes} placeholder="Mission, time of day, location, save file..." />
            </Field>

            {refs.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-fg-3">Reference clips</p>
                <ul className="flex flex-wrap gap-2">
                  {refs.map((clip) => (
                    <li key={clip.id}>
                      <a href={clip.file_path ?? "#"} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-[16rem] items-center gap-1.5 rounded-full border border-line bg-surface-muted px-3 py-1.5 text-xs font-medium text-fg-2 hover:border-line-strong hover:text-fg">
                        <PlayIcon className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{clip.title || clip.file_path}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Field label="Your recording (optional)">
              <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="File path or link, e.g. D:/Recordings/clip.mp4" />
            </Field>
          </ModalBody>
          <ModalFooter className="items-center">
            <Button variant="ghost" onClick={back} disabled={index === 0} aria-label="Previous idea"><ArrowLeftIcon className="h-4 w-4" /> <span className="max-sm:hidden">Back</span></Button>
            <span className="mr-auto hidden text-[11px] text-fg-4 lg:block">Ctrl + Enter = recorded · Alt + → skip</span>
            <Button variant="secondary" onClick={skip}>Skip <ArrowRightIcon className="h-4 w-4" /></Button>
            <Button variant="accent" onClick={() => void markRecorded()} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckIcon className="h-4 w-4" /> {busy ? "Saving..." : index === items.length - 1 ? "Recorded" : "Recorded · next"}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

/* ================= PAGE ================= */

export default function RecordingPage() {
  const { success, error: notifyError } = useNotifications();
  const [items, setItems] = useState<RecItem[] | null>(null);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [tab, setTab] = useState<Tab>("to_record");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<RecItem | null>(null);
  const [session, setSession] = useState<RecItem[] | null>(null);

  const notifyErrorRef = useRef(notifyError);
  useEffect(() => { notifyErrorRef.current = notifyError; }, [notifyError]);

  useEffect(() => {
    let active = true;
    supabase
      .from("details")
      .select("id,title,description,detail_type,game_id,capture_status,capture_notes,capture_priority,capture_added_at,recorded_at,game:games(id,title,cover_url,release_year),footage(id,file_path,title,label,downloaded)")
      .not("capture_status", "is", null)
      .order("capture_added_at", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          if (isMissingRecordingColumns(error)) setSetupNeeded(true);
          else notifyErrorRef.current(error.message, "Could not load the Recording List");
          setItems([]);
          return;
        }
        setItems(((data ?? []) as unknown as RecItem[]).filter((row) => row.capture_status));
      });
    return () => { active = false; };
  }, []);

  const patchItem = useCallback(async (item: RecItem, patch: ItemPatch) => {
    // A null status means "off the list"; setStatus removes the row after saving.
    setItems((current) => (current ?? []).map((row) => (row.id === item.id ? ({ ...row, ...patch, capture_status: patch.capture_status ?? row.capture_status }) : row)));
    const { error } = await supabase.from("details").update(patch).eq("id", item.id);
    if (error) {
      setItems((current) => (current ?? []).map((row) => (row.id === item.id ? item : row)));
      notifyError(isMissingRecordingColumns(error) ? RECORDING_SETUP_MESSAGE : error.message, "Not saved");
      return false;
    }
    return true;
  }, [notifyError]);

  const attachClip = useCallback(async (item: RecItem, path: string) => {
    const { data, error } = await supabase
      .from("footage")
      .insert({ detail_id: item.id, file_path: path, title: null, label: OWN_FOOTAGE_LABEL, downloaded: true })
      .select("id,file_path,title,label,downloaded")
      .single();
    if (error || !data) {
      notifyError(error?.message || "Could not save the clip", "Clip not saved");
      return false;
    }
    setItems((current) => (current ?? []).map((row) => (row.id === item.id ? { ...row, footage: [...(row.footage ?? []), data as Clip] } : row)));
    return true;
  }, [notifyError]);

  const setStatus = useCallback(async (item: RecItem, status: CaptureStatus | null) => {
    if (status === null) {
      const ok = await patchItem(item, captureStatusPatch(null));
      if (ok) {
        setItems((current) => (current ?? []).filter((row) => row.id !== item.id));
        success("Removed from your Recording List.", "Removed");
      }
      return ok;
    }
    return patchItem(item, captureStatusPatch(status, item));
  }, [patchItem, success]);

  const recordedInSession = useCallback(async (item: RecItem, path: string) => {
    if (path && !(await attachClip(item, path))) return false;
    return patchItem(item, captureStatusPatch("recorded", item));
  }, [attachClip, patchItem]);

  const saveNotes = useCallback((item: RecItem, notes: string) => {
    void patchItem(item, { capture_notes: notes || null });
  }, [patchItem]);

  const counts = useMemo(() => {
    const result: Record<Tab, number> = { to_record: 0, recorded: 0, used: 0, all: 0 };
    for (const item of items ?? []) { result[item.capture_status] += 1; result.all += 1; }
    return result;
  }, [items]);

  const [weekAgo] = useState(() => Date.now() - 7 * 86400e3);
  const recordedThisWeek = (items ?? []).filter((item) => item.recorded_at && new Date(item.recorded_at).getTime() > weekAgo).length;
  const progress = counts.all ? Math.round(((counts.recorded + counts.used) / counts.all) * 100) : 0;

  const groupItems = useCallback((list: RecItem[]) => {
    const byGame = new Map<number, { game: GameInfo | null; gameId: number; items: RecItem[] }>();
    for (const item of list) {
      const entry = byGame.get(item.game_id) ?? { game: item.game, gameId: item.game_id, items: [] };
      entry.items.push(item);
      byGame.set(item.game_id, entry);
    }
    // Games with something marked "record first" come first, then the games with the most ideas.
    return Array.from(byGame.values())
      .map((group) => ({ ...group, items: group.items.sort(byPriorityThenAdded) }))
      .sort((a, b) => {
        const aFirst = a.items.some((i) => i.capture_priority === 1 && i.capture_status === "to_record") ? 0 : 1;
        const bFirst = b.items.some((i) => i.capture_priority === 1 && i.capture_status === "to_record") ? 0 : 1;
        return aFirst - bFirst || b.items.length - a.items.length || (a.game?.title ?? "").localeCompare(b.game?.title ?? "");
      });
  }, []);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groupItems((items ?? []).filter((item) => {
      if (tab !== "all" && item.capture_status !== tab) return false;
      if (!q) return true;
      return [item.title, item.game?.title, item.capture_notes].some((text) => text?.toLowerCase().includes(q));
    }));
  }, [items, tab, query, groupItems]);

  // Recording mode goes game by game, in the same order as the "To record" tab.
  const startSession = (gameId?: number) => {
    const queue = groupItems((items ?? []).filter((item) => item.capture_status === "to_record" && (gameId === undefined || item.game_id === gameId)))
      .flatMap((group) => group.items);
    if (queue.length === 0) {
      success("Nothing left to record here.", "All done");
      return;
    }
    setSession(queue);
  };

  return (
    <div className={`${appPageRootClass} xl:flex`}>
      <AppSidebar activePage="recording" />
      {editing && (
        <EditRecordingModal
          item={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => patchItem(editing, patch)}
          onAttach={(path) => attachClip(editing, path)}
        />
      )}
      {session && (
        <RecordingMode
          queue={session}
          onClose={() => setSession(null)}
          onRecorded={recordedInSession}
          onSaveNotes={saveNotes}
        />
      )}

      <main className={appPageMainClass}>
        <div className="app-container max-w-6xl">
          <AppPageHeader
            title="Recording List"
            description="Ideas you capture yourself, grouped by game so one session covers everything for that game."
            icon={<VideoCameraIcon className="h-5 w-5" />}
            className="mb-4"
            action={
              <Button variant="accent" onClick={() => startSession()} disabled={!counts.to_record} className="bg-rose-600 hover:bg-rose-700">
                <PlayIcon className="h-5 w-5" /> <span className="max-sm:hidden">Start recording</span><span className="sm:hidden">Record</span>
              </Button>
            }
          />

          {setupNeeded ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              <p className="flex items-center gap-2 font-semibold"><ExclamationTriangleIcon className="h-5 w-5" /> One database update needed</p>
              <p className="mt-1 text-sm">{RECORDING_SETUP_MESSAGE}</p>
            </div>
          ) : (
            <>
              {/* Progress */}
              <section className="mb-4 grid gap-3 rounded-3xl border border-line bg-surface p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-semibold text-fg">{counts.recorded + counts.used} of {counts.all} recorded</p>
                    <p className="text-xs tabular-nums text-fg-3">{progress}%</p>
                  </div>
                  <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-surface-sunken">
                    <div className="bg-emerald-500 transition-all" style={{ width: `${counts.all ? (counts.recorded / counts.all) * 100 : 0}%` }} />
                    <div className="bg-slate-400 transition-all" style={{ width: `${counts.all ? (counts.used / counts.all) * 100 : 0}%` }} />
                  </div>
                </div>
                <dl className="flex gap-5 text-center sm:gap-6">
                  {[
                    ["To record", counts.to_record, "text-rose-600 dark:text-rose-300"],
                    ["This week", recordedThisWeek, "text-emerald-600 dark:text-emerald-300"],
                    ["Used", counts.used, "text-fg-2"],
                  ].map(([label, value, color]) => (
                    <div key={String(label)}>
                      <dd className={`text-xl font-black tabular-nums ${color}`}>{value}</dd>
                      <dt className="text-[11px] font-medium text-fg-4">{label}</dt>
                    </div>
                  ))}
                </dl>
              </section>

              {/* Tabs + search */}
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-1 overflow-x-auto rounded-2xl bg-surface-sunken p-1" role="tablist">
                  {TABS.map(({ key, label }) => (
                    <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold transition ${tab === key ? "bg-surface text-fg shadow-sm ring-1 ring-line" : "text-fg-3 hover:text-fg"}`}>
                      {key !== "all" && <span className={`h-1.5 w-1.5 rounded-full ${CAPTURE_META[key].dot}`} />}
                      {label}
                      <span className="text-xs tabular-nums text-fg-4">{counts[key]}</span>
                    </button>
                  ))}
                </div>
                <label className="relative block sm:w-72">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-4" />
                  <Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search idea, game or notes" aria-label="Search the Recording List" />
                </label>
              </div>

              {items === null ? (
                <div className="space-y-4">{[0, 1].map((i) => <div key={i} className="h-48 animate-pulse rounded-3xl bg-surface-sunken" />)}</div>
              ) : counts.all === 0 ? (
                <div className="rounded-3xl border border-dashed border-line-strong bg-surface p-10 text-center">
                  <VideoCameraIcon className="mx-auto h-10 w-10 text-fg-4" />
                  <p className="mt-3 text-lg font-bold text-fg">Nothing to record yet</p>
                  <p className="mx-auto mt-1 max-w-md text-sm text-fg-3">On All Ideas, press the camera button on a card, or select several ideas and press <span className="font-semibold">Record</span>.</p>
                  <Link href="/" className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">Go to All Ideas</Link>
                </div>
              ) : groups.length === 0 ? (
                <p className="rounded-3xl border border-dashed border-line-strong p-8 text-center text-sm text-fg-3">{query ? "No ideas match your search." : `Nothing in “${TABS.find((t) => t.key === tab)?.label}”.`}</p>
              ) : (
                <div className="space-y-4">
                  {groups.map((group) => {
                    const left = group.items.filter((item) => item.capture_status === "to_record").length;
                    return (
                      <section key={group.gameId} className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
                        <header className="flex items-center gap-3 border-b border-line-soft px-4 py-3 sm:px-5">
                          <GameCover game={group.game} />
                          <div className="min-w-0 flex-1">
                            <h2 className="truncate text-base font-bold text-fg">{group.game?.title || "Unknown game"}</h2>
                            <p className="text-xs text-fg-3">{group.items.length} idea{group.items.length === 1 ? "" : "s"}{left ? ` · ${left} to record` : ""}</p>
                          </div>
                          {left > 0 && (
                            <Button variant="secondary" size="sm" onClick={() => startSession(group.gameId)}>
                              <PlayIcon className="h-4 w-4 text-rose-500" /> <span className="max-sm:hidden">Record this game</span><span className="sm:hidden">Record</span>
                            </Button>
                          )}
                        </header>
                        <ul className="divide-y divide-line-soft">
                          {group.items.map((item) => {
                            const own = ownClips(item).length;
                            return (
                              <li key={item.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <Link href={`/idea/${item.id}`} className="min-w-0 text-sm font-semibold leading-5 text-fg hover:text-accent">{item.title}</Link>
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-3">
                                    <TypeLabel typeKey={item.detail_type} />
                                    {item.capture_priority === 1 && <span className="font-semibold text-rose-600 dark:text-rose-300">Record first</span>}
                                    {item.capture_priority === 3 && <span className="text-fg-4">Later</span>}
                                    {own > 0 && <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-300"><FilmIcon className="h-3.5 w-3.5" /> {own} own clip{own === 1 ? "" : "s"}</span>}
                                    {item.capture_status !== "to_record" && item.recorded_at && <span className="text-fg-4">Recorded {formatShortDate(item.recorded_at)}</span>}
                                  </div>
                                  {item.capture_notes ? (
                                    <p className="mt-1.5 line-clamp-2 whitespace-pre-wrap rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs leading-5 text-fg-2">{item.capture_notes}</p>
                                  ) : item.capture_status === "to_record" ? (
                                    <button type="button" onClick={() => setEditing(item)} className="mt-1.5 cursor-pointer text-xs font-medium text-accent hover:underline">+ Add notes on how to record it</button>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5">
                                  {tab === "all" && <StatusPill status={item.capture_status} />}
                                  {item.capture_status === "to_record" && (
                                    <Button variant="secondary" size="sm" onClick={() => void setStatus(item, "recorded")} className="text-emerald-700 dark:text-emerald-300" aria-label={`Mark ${item.title} as recorded`}>
                                      <CheckIcon className="h-4 w-4" /> <span className="max-sm:hidden">Recorded</span>
                                    </Button>
                                  )}
                                  {item.capture_status === "recorded" && (
                                    <Button variant="ghost" size="sm" onClick={() => void setStatus(item, "used")} aria-label={`Mark ${item.title} as used`}>
                                      <span className="max-sm:hidden">Mark used</span><CheckCircleIcon className="h-4 w-4 sm:hidden" />
                                    </Button>
                                  )}
                                  {item.capture_status !== "to_record" && (
                                    <Button variant="ghost" size="icon-sm" className="pointer-coarse:h-10 pointer-coarse:w-10" onClick={() => void setStatus(item, "to_record")} aria-label="Back to To record" title="Back to To record">
                                      <ArrowUturnLeftIcon className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon-sm" className="pointer-coarse:h-10 pointer-coarse:w-10" onClick={() => setEditing(item)} aria-label={`Edit recording for ${item.title}`} title="Notes, priority, clip">
                                    <PencilSquareIcon className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon-sm" className="pointer-coarse:h-10 pointer-coarse:w-10" onClick={() => void setStatus(item, null)} aria-label={`Remove ${item.title} from the list`} title="Remove from list">
                                    <XMarkIcon className="h-4 w-4" />
                                  </Button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
