"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ArrowsUpDownIcon,
  Bars3Icon,
  CheckIcon,
  ChevronDoubleDownIcon,
  ChevronDoubleUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronUpIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  EllipsisHorizontalIcon,
  ExclamationTriangleIcon,
  FilmIcon,
  InformationCircleIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  PlayIcon,
  PlusIcon,
  PuzzlePieceIcon,
  TrashIcon,
  VideoCameraIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabaseClient";
import { useNotifications } from "@/components/NotificationCenter";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CoverImage } from "@/components/CoverImage";
import { ProjectTopicSelect } from "@/components/ProjectTopicSelect";
import { useDismiss } from "@/components/ui/useDismiss";
import { buildScriptGuide, type ScriptGuideSection } from "@/lib/scriptGuide";
import { getScriptTopicValue } from "@/lib/scriptTopics";
import { analyzeAssetLinks, countClips, formatTimestamp, getClipIdentity, getStartSeconds } from "@/lib/assetLinks";
import { invalidateUsage } from "@/lib/ideaUsage";
import { loadLinks } from "@/lib/ideaLinks";
import { CAPTURE_META, CAPTURE_STATUSES, RECORDING_SETUP_MESSAGE, captureStatusPatch, isMissingRecordingColumns, type CaptureStatus } from "@/lib/recording";
import type { VideoTheme } from "@/lib/videoThemes";
import {
  addIdeaToDraft,
  buildScriptLine,
  estimateSeconds,
  matchSectionsToIdeas,
  IDEA_SELECT,
  removeIdeaFromDraft,
  toProjectIdea,
  type IdeaRow,
  type ProjectAsset,
  type ProjectIdea,
} from "@/lib/projectIdeas";

/* ================= TYPES ================= */

export type EditorScript = {
  id: number;
  title: string;
  content: string;
  description: string;
  assets: ProjectAsset[];
  tags: string[];
  hashtags: string[];
  status: string;
  topic?: string | null;
  created_at?: string;
};

const STATUSES = ["Draft", "Filming", "Edited", "Published"] as const;
const STATUS_DOT: Record<string, string> = { Draft: "bg-slate-400", Filming: "bg-amber-500", Edited: "bg-indigo-500", Published: "bg-emerald-500" };

/**
 * One colour per idea number, shared by the Ideas list and the Clips tab so
 * "idea 2" reads the same everywhere.
 */
/**
 * Ideas share one calm brand colour. Each line sits beside its idea, so colour
 * no longer has to pair them up; colour is kept for meaning (to record,
 * recorded, missing clips, published) and the game art tells ideas apart.
 */
const IDEA_COLORS = [
  { badge: "bg-blue-600 text-white", bar: "border-l-blue-500/45", soft: "bg-surface-muted", title: "text-fg", link: "text-accent hover:bg-accent-soft" },
] as const;
const NEUTRAL_COLOR = { badge: "bg-surface-sunken text-fg-2", bar: "border-l-line-strong", soft: "bg-surface-sunken", title: "text-fg", link: "text-fg-3 hover:bg-surface-sunken" };
const ideaColor = (number: number | null | undefined) => (number != null && number > 0 && number < Number.MAX_SAFE_INTEGER ? IDEA_COLORS[(number - 1) % IDEA_COLORS.length] : NEUTRAL_COLOR);

/** First few words of a clip's video title, e.g. "GTA 5 Police Chase…". */
function titleSnippet(title: string | null | undefined, maxWords = 4, maxChars = 30) {
  const clean = (title ?? "").replace(/\s+/g, " ").trim();
  // Untitled clips fall back to a piece of the link ("watch?v=…"); that isn't a title.
  if (!clean || /^https?:\/\//i.test(clean) || (!/\s/.test(clean) && /[=?/]/.test(clean))) return "";
  const words = clean.split(" ");
  let text = words.slice(0, maxWords).join(" ");
  if (text.length > maxChars) text = text.slice(0, maxChars).replace(/\s+\S*$/, "") || text.slice(0, maxChars);
  return text.length < clean.length ? `${text.replace(/[\s,.:;!?|-]+$/, "")}…` : text;
}

/** Short readable label for a clip link: channel, then the video name. */
function clipLabel(asset: ProjectAsset) {
  return asset.name || asset.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40);
}




function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

/* ================= SMALL PIECES ================= */

/** A text box that grows with its text, so a script line and its idea card share one row. */
function AutoTextarea({ value, onChange, onFocus, onBlur, inputRef, placeholder, ariaLabel }: {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  inputRef: (el: HTMLTextAreaElement | null) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);
  useLayoutEffect(resize, [value, resize]);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => { if (el.clientWidth !== width) { width = el.clientWidth; resize(); } });
    observer.observe(el);
    return () => observer.disconnect();
  }, [resize]);
  return (
    <textarea
      ref={(el) => { ref.current = el; inputRef(el); }}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="block min-w-0 flex-1 resize-none overflow-hidden bg-transparent text-base leading-7 text-fg outline-none placeholder:text-fg-4 sm:text-[17px] sm:leading-8"
    />
  );
}

function GameThumb({ src, className = "h-9 w-7" }: { src: string | null; className?: string }) {
  return (
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-sunken text-fg-4 ${className}`}>
      {src ? <CoverImage src={src} sizes="36px" /> : <PuzzlePieceIcon className="h-4 w-4" />}
    </span>
  );
}

function ChipEditor({ label, values, onChange, prefix = "", placeholder }: { label: string; values: string[]; onChange: (values: string[]) => void; prefix?: string; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft.split(/[,\n]/).map((part) => part.trim()).filter(Boolean).map((part) => (prefix && !part.startsWith(prefix) ? `${prefix}${part}` : part));
    if (parts.length) onChange(Array.from(new Set([...values, ...parts])));
    setDraft("");
  };
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-fg-3">{label}</p>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface p-1.5 focus-within:border-blue-500">
        {values.map((value) => (
          <span key={value} className="inline-flex h-8 items-center gap-1 rounded-lg bg-surface-sunken pl-2.5 pr-1 text-xs font-semibold text-fg-2">
            {value}
            <button type="button" onClick={() => onChange(values.filter((v) => v !== value))} className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-fg-4 hover:bg-surface hover:text-rose-500" aria-label={`Remove ${value}`}>
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } else if (e.key === "Backspace" && !draft && values.length) onChange(values.slice(0, -1)); }}
          onBlur={add}
          placeholder={values.length ? "" : placeholder}
          className="h-8 min-w-[8rem] flex-1 bg-transparent px-1.5 text-sm text-fg outline-none placeholder:text-fg-4"
          aria-label={`Add ${label.toLowerCase()}`}
        />
      </div>
    </div>
  );
}

/** Search the library and add an idea to the project. */
type ReorderItem = { id: string; title: string; game: string; linked: boolean; recorded?: boolean };

/**
 * A compact list for putting a project's ideas in order. One short row per
 * idea, so the whole list fits on screen. Drag the handle (mouse or finger),
 * use the arrow buttons, or focus a handle and press ↑ / ↓.
 */
function ReorderPanel({ items, onSave, onClose }: { items: ReorderItem[]; onSave: (ids: string[]) => void; onClose: () => void }) {
  const [order, setOrder] = useState(items);
  // While dragging: which row, how far it has moved, and the slot it would drop into.
  const [drag, setDrag] = useState<{ id: string; from: number; to: number; offset: number; step: number } | null>(null);
  const listRef = useRef<HTMLOListElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const dragStart = useRef({ pointerY: 0, scrollTop: 0, maxScroll: 0, centers: [] as number[] });
  const pointerY = useRef(0);
  const scrollTimer = useRef<number | null>(null);
  // Where each row was drawn last time, for sliding rows into their new place (FLIP).
  const lastTops = useRef(new Map<string, number>());
  const changed = order.some((item, i) => item.id !== items[i]?.id);

  const rowTop = (el: HTMLElement) => el.getBoundingClientRect().top + (listRef.current?.scrollTop ?? 0);

  // After any reorder, slide each row from where it was to where it is now.
  useLayoutEffect(() => {
    const next = new Map<string, number>();
    rowRefs.current.forEach((el, id) => {
      const top = rowTop(el);
      next.set(id, top);
      const before = lastTops.current.get(id);
      if (before == null || Math.abs(before - top) < 1) return;
      el.style.transition = "none";
      el.style.transform = `translateY(${before - top}px)`;
      void el.offsetHeight; // apply the start position before animating
      el.style.transition = "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)";
      el.style.transform = "";
    });
    lastTops.current = next;
  }, [order]);

  const move = (id: string, to: number) => {
    setOrder((current) => {
      const from = current.findIndex((item) => item.id === id);
      const target = Math.max(0, Math.min(current.length - 1, to));
      if (from < 0 || from === target) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  // The dragged row follows the pointer; the slot is the one whose middle its middle has passed.
  const track = () => {
    setDrag((current) => {
      if (!current) return current;
      const list = listRef.current;
      const centers = dragStart.current.centers;
      // Keep the row between the first and last slot, so it can't push the list into empty space.
      const raw = pointerY.current - dragStart.current.pointerY + ((list?.scrollTop ?? 0) - dragStart.current.scrollTop);
      const offset = Math.max(centers[0] - centers[current.from], Math.min(centers[centers.length - 1] - centers[current.from], raw));
      const myCenter = centers[current.from] + offset;
      let to = 0;
      // Rows above stay above until passed; rows below are passed once reached, so the ends are reachable.
      centers.forEach((center, i) => {
        if (i < current.from ? myCenter > center : i > current.from && myCenter >= center) to += 1;
      });
      return { ...current, offset, to };
    });
  };

  const stopAutoScroll = () => {
    if (scrollTimer.current != null) cancelAnimationFrame(scrollTimer.current);
    scrollTimer.current = null;
  };

  const startAutoScroll = () => {
    stopAutoScroll();
    const tick = () => {
      const list = listRef.current;
      if (list) {
        const rect = list.getBoundingClientRect();
        const edge = 56;
        const y = pointerY.current;
        const speed = y < rect.top + edge ? -Math.ceil((rect.top + edge - y) / 5) : y > rect.bottom - edge ? Math.ceil((y - (rect.bottom - edge)) / 5) : 0;
        // Scroll only as far as the list really goes (the lifted row must not stretch it).
        const next = Math.max(0, Math.min(dragStart.current.maxScroll, list.scrollTop + speed));
        if (speed && next !== list.scrollTop) {
          list.scrollTop = next;
          track();
        }
      }
      scrollTimer.current = requestAnimationFrame(tick);
    };
    scrollTimer.current = requestAnimationFrame(tick);
  };

  useEffect(() => stopAutoScroll, []);

  const beginDrag = (id: string, from: number, clientY: number) => {
    const list = listRef.current;
    const rows = order.map((item) => rowRefs.current.get(item.id));
    const rects = rows.map((el) => el?.getBoundingClientRect());
    const self = rects[from];
    const gap = rects.length > 1 && rects[0] && rects[1] ? rects[1].top - rects[0].bottom : 6;
    dragStart.current = {
      pointerY: clientY,
      scrollTop: list?.scrollTop ?? 0,
      maxScroll: list ? list.scrollHeight - list.clientHeight : 0,
      centers: rects.map((r) => (r ? r.top + r.height / 2 : 0)),
    };
    pointerY.current = clientY;
    setDrag({ id, from, to: from, offset: 0, step: (self?.height ?? 52) + gap });
    startAutoScroll();
  };

  const endDrag = () => {
    stopAutoScroll();
    if (!drag) return;
    // Remember where every row is drawn right now, so the drop slides from there.
    const tops = new Map<string, number>();
    rowRefs.current.forEach((el, id) => tops.set(id, rowTop(el)));
    lastTops.current = tops;
    const { id, to } = drag;
    setDrag(null);
    move(id, to);
  };

  // How far a row is pushed aside to make room for the dragged one.
  const shiftFor = (index: number) => {
    if (!drag || index === drag.from) return 0;
    if (drag.from < drag.to && index > drag.from && index <= drag.to) return -drag.step;
    if (drag.from > drag.to && index >= drag.to && index < drag.from) return drag.step;
    return 0;
  };

  return (
    <Modal open onClose={onClose} size="lg" zClass="z-[99990]" labelledBy="reorder-title">
      <ModalHeader id="reorder-title" eyebrow="Short project" title="Reorder ideas" onClose={onClose}>
        <p className="mt-1 text-sm text-fg-3">Drag the handle, or use the arrows. The hook stays first.</p>
      </ModalHeader>
      <ModalBody className="p-0 sm:p-0">
        <ol ref={listRef} className={`max-h-[60dvh] space-y-1.5 overflow-y-auto overscroll-contain p-3 sm:p-4 ${drag ? "select-none" : ""}`} aria-label="Ideas in order">
          {order.map((item, index) => {
            const dragging = drag?.id === item.id;
            const position = drag ? (dragging ? drag.to : index - (shiftFor(index) < 0 ? 1 : shiftFor(index) > 0 ? -1 : 0)) : index;
            const style: React.CSSProperties = dragging
              ? { transform: `translateY(${drag.offset}px) scale(1.03)`, transition: "box-shadow 150ms, scale 150ms", zIndex: 20 }
              : drag
                ? { transform: `translateY(${shiftFor(index)}px)`, transition: "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)" }
                : {};
            return (
              <li
                key={item.id}
                ref={(el) => { if (el) rowRefs.current.set(item.id, el); else rowRefs.current.delete(item.id); }}
                style={style}
                className={`relative flex items-center gap-2 rounded-xl border border-l-4 border-l-blue-500/45 bg-surface py-1.5 pl-1.5 pr-1.5 ${dragging ? "cursor-grabbing border-y-blue-500 border-r-blue-500 shadow-2xl shadow-blue-900/25 ring-2 ring-blue-500/40" : "border-y-line border-r-line"}`}
              >
                <button
                  type="button"
                  aria-label={`Drag ${item.title}. Arrow keys move it.`}
                  className={`flex h-10 w-9 shrink-0 touch-none items-center justify-center rounded-lg transition ${dragging ? "cursor-grabbing bg-accent-soft text-accent" : "cursor-grab text-fg-4 hover:bg-surface-sunken hover:text-fg"}`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    beginDrag(item.id, index, e.clientY);
                  }}
                  onPointerMove={(e) => {
                    if (!dragging) return;
                    pointerY.current = e.clientY;
                    track();
                  }}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp") { e.preventDefault(); move(item.id, index - 1); }
                    if (e.key === "ArrowDown") { e.preventDefault(); move(item.id, index + 1); }
                  }}
                >
                  <Bars3Icon className="h-5 w-5" />
                </button>
                <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md bg-blue-600 px-1 text-xs font-bold tabular-nums text-white">{position + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {item.recorded && <CheckIcon className="h-4 w-4 shrink-0 stroke-[3] text-emerald-600 dark:text-emerald-400" aria-label="Recorded" />}
                    <span className="truncate text-sm font-semibold text-fg">{item.title}</span>
                  </span>
                  {item.game && <span className="block truncate text-[11px] font-medium uppercase tracking-wide text-fg-4">{item.game}</span>}
                </span>
                <span className={`flex shrink-0 items-center transition-opacity ${drag ? "opacity-0" : ""}`}>
                  <button type="button" onClick={() => move(item.id, 0)} disabled={index === 0} className="hidden h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-fg-4 hover:bg-surface-sunken hover:text-fg disabled:invisible sm:flex" aria-label={`Move ${item.title} to the top`} title="Move to top"><ChevronDoubleUpIcon className="h-4 w-4" /></button>
                  <button type="button" onClick={() => move(item.id, index - 1)} disabled={index === 0} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-fg-3 hover:bg-surface-sunken hover:text-fg disabled:invisible" aria-label={`Move ${item.title} up`} title="Move up"><ChevronUpIcon className="h-4 w-4" /></button>
                  <button type="button" onClick={() => move(item.id, index + 1)} disabled={index === order.length - 1} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-fg-3 hover:bg-surface-sunken hover:text-fg disabled:invisible" aria-label={`Move ${item.title} down`} title="Move down"><ChevronDownIcon className="h-4 w-4" /></button>
                  <button type="button" onClick={() => move(item.id, order.length - 1)} disabled={index === order.length - 1} className="hidden h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-fg-4 hover:bg-surface-sunken hover:text-fg disabled:invisible sm:flex" aria-label={`Move ${item.title} to the bottom`} title="Move to bottom"><ChevronDoubleDownIcon className="h-4 w-4" /></button>
                </span>
              </li>
            );
          })}
        </ol>
      </ModalBody>
      <ModalFooter className="items-center">
        {changed && <button type="button" onClick={() => setOrder(items)} className="mr-auto cursor-pointer text-xs font-semibold text-fg-3 hover:text-fg">Reset</button>}
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!changed} onClick={() => { onSave(order.map((item) => item.id)); onClose(); }}>Save order</Button>
      </ModalFooter>
    </Modal>
  );
}

function IdeaPicker({ excludeIds, suggested, onPick, onClose }: { excludeIds: Set<number>; suggested: { id: number; reason: string }[]; onPick: (row: IdeaRow) => Promise<void>; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<IdeaRow[]>([]);
  const [suggestedRows, setSuggestedRows] = useState<IdeaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  useDismiss(boxRef, true, onClose);

  useEffect(() => {
    let active = true;
    const q = query.trim();
    const timer = setTimeout(async () => {
      setLoading(true);
      let request = supabase.from("details").select(IDEA_SELECT).eq("status", "idea").order("created_at", { ascending: false }).limit(15);
      if (q) request = request.ilike("title", `%${q.replace(/[%_]/g, "")}%`);
      const { data } = await request;
      if (!active) return;
      setRows(((data ?? []) as unknown as IdeaRow[]).filter((row) => !excludeIds.has(row.id)));
      setLoading(false);
    }, q ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [query, excludeIds]);

  // Ideas linked to the ones already in the project come first.
  const suggestedKey = suggested.map((item) => item.id).join(",");
  useEffect(() => {
    let active = true;
    const ids = suggestedKey ? suggestedKey.split(",").map(Number) : [];
    if (!ids.length) return;
    supabase.from("details").select(IDEA_SELECT).in("id", ids).then(({ data }) => {
      if (!active) return;
      const byId = new Map(((data ?? []) as unknown as IdeaRow[]).map((row) => [row.id, row]));
      setSuggestedRows(ids.map((id) => byId.get(id)).filter(Boolean) as IdeaRow[]);
    });
    return () => { active = false; };
  }, [suggestedKey]);
  const reasonOf = new Map(suggested.map((item) => [item.id, item.reason]));
  const showSuggested = !query.trim() && suggestedRows.some((row) => !excludeIds.has(row.id));
  const visibleSuggested = showSuggested ? suggestedRows.filter((row) => !excludeIds.has(row.id)) : [];
  const visibleRows = rows.filter((row) => !visibleSuggested.some((s) => s.id === row.id));

  const option = (row: IdeaRow, reason?: string) => (
    <li key={row.id}>
      <button
        type="button"
        disabled={adding !== null}
        onClick={async () => { setAdding(row.id); await onPick(row); setAdding(null); }}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-surface-sunken disabled:opacity-60"
      >
        <GameThumb src={row.game?.cover_url ?? null} className="h-9 w-7" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-fg">{row.title}</span>
          <span className="block truncate text-[11px] text-fg-4">
            {reason ? <span className="font-semibold text-accent">{reason}</span> : row.game?.title}
            {!reason && row.footage?.length ? ` · ${row.footage.length} clip${row.footage.length === 1 ? "" : "s"}` : ""}
          </span>
        </span>
        {adding === row.id ? <ArrowPathIcon className="h-4 w-4 animate-spin text-fg-4" /> : <PlusIcon className="h-4 w-4 shrink-0 text-accent" />}
      </button>
    </li>
  );

  return (
    <div ref={boxRef} className="absolute inset-x-0 bottom-full z-30 mb-2 rounded-2xl border border-line bg-surface p-2 shadow-2xl animate-in fade-in slide-in-from-bottom-1 duration-150">
      <label className="relative block">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-4" />
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search idea title..." aria-label="Search ideas" className="h-10 w-full rounded-xl border border-line bg-surface-muted pl-9 pr-3 text-sm text-fg outline-none focus:border-blue-500" />
      </label>
      <ul className="mt-1.5 max-h-80 overflow-y-auto">
        {visibleSuggested.length > 0 && (
          <>
            <li className="flex items-center gap-1.5 px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent"><LinkIcon className="h-3.5 w-3.5" /> Related to this project</li>
            {visibleSuggested.map((row) => option(row, reasonOf.get(row.id)))}
            <li className="px-2 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-fg-4">Recent ideas</li>
          </>
        )}
        {loading && visibleRows.length === 0 && <li className="px-3 py-4 text-center text-xs text-fg-4">Searching…</li>}
        {!loading && visibleRows.length === 0 && visibleSuggested.length === 0 && <li className="px-3 py-4 text-center text-xs text-fg-4">No ideas found.</li>}
        {visibleRows.map((row) => option(row))}
      </ul>
    </div>
  );
}

/* ================= EDITOR ================= */

export function ProjectEditor({
  isOpen,
  script,
  onClose,
  onSave,
  onRefresh,
  topics,
  topicsLoading,
  topicsError,
  onRetryTopics,
}: {
  isOpen: boolean;
  script: EditorScript | null;
  onClose: () => void;
  onSave: (data: Partial<EditorScript>) => Promise<boolean>;
  onRefresh: (id: number) => Promise<EditorScript | null>;
  topics: VideoTheme[];
  topicsLoading: boolean;
  topicsError: string;
  onRetryTopics: () => void;
}) {
  const { success, error: notifyError, confirm } = useNotifications();
  const [formData, setFormData] = useState<Partial<EditorScript>>({});
  const [tab, setTab] = useState<"script" | "details">("script");
  const [viewMode, setViewMode] = useState<"aligned" | "plain">(() => {
    try { return typeof window !== "undefined" && window.localStorage.getItem("ninjaplay-script-view") === "plain" ? "plain" : "aligned"; } catch { return "aligned"; }
  });
  const [editingRow, setEditingRow] = useState<{ row: number; text: string; skip: number } | null>(null);
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const rowRefs = useRef(new Map<number, HTMLTextAreaElement>());
  const [links, setLinks] = useState<Map<number, Set<number>>>(() => new Map());
  const [recordMenuFor, setRecordMenuFor] = useState<number | null>(null);
  const router = useRouter();
  const addIdeaRef = useRef<HTMLDivElement | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [ideas, setIdeas] = useState<ProjectIdea[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useDismiss(menuRef, menuOpen, closeMenu);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const latestRef = useRef<Partial<EditorScript>>({});
  const lastSavedRef = useRef("");
  const lastSyncedContentRef = useRef("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveVersionRef = useRef(0);
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  const scriptId = script?.id ?? null;

  /* ---------- load ---------- */

  const loadIdeas = useCallback(async (id: number) => {
    const { data: links, error } = await supabase.from("script_ideas").select("detail_id,position").eq("script_id", id).order("position");
    if (error) { setIdeas([]); return; }
    const ids = (links ?? []).map((link: { detail_id: number }) => link.detail_id);
    if (!ids.length) { setIdeas([]); return; }
    const { data } = await supabase.from("details").select(IDEA_SELECT).in("id", ids);
    const byId = new Map(((data ?? []) as unknown as IdeaRow[]).map((row) => [row.id, row]));
    setIdeas((links ?? []).map((link: { detail_id: number; position: number }) => byId.get(link.detail_id) && toProjectIdea(byId.get(link.detail_id)!, Number.isFinite(link.position) ? link.position : 0)).filter(Boolean) as ProjectIdea[]);
  }, []);

  useEffect(() => {
    if (!isOpen || !script) return;
    setFormData(script);
    latestRef.current = script;
    lastSavedRef.current = JSON.stringify(script);
    lastSyncedContentRef.current = String(script.content || "");
    setSaveState("saved");
    setTab("script");
    setPicking(false);
    setIdeas(null);
    void loadIdeas(script.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, scriptId]);

  // Related ideas (idea_links) for the ideas in this project.
  const ideaIdsKey = (ideas ?? []).map((idea) => idea.id).sort((a, b) => a - b).join(",");
  useEffect(() => {
    let active = true;
    const ids = ideaIdsKey ? ideaIdsKey.split(",").map(Number) : [];
    loadLinks(ids).then(({ links: next }) => { if (active) setLinks(next); });
    return () => { active = false; };
  }, [ideaIdsKey]);

  /* ---------- save ---------- */

  const saveNow = useCallback(async (data: Partial<EditorScript>) => {
    const snapshot = JSON.stringify(data);
    if (snapshot === lastSavedRef.current) { setSaveState("saved"); return true; }
    const version = ++saveVersionRef.current;
    setSaveState("saving");
    const ok = await onSaveRef.current(data);
    if (!ok) { if (version === saveVersionRef.current) setSaveState("error"); return false; }
    lastSavedRef.current = snapshot;
    if (version === saveVersionRef.current) setSaveState(JSON.stringify(latestRef.current) === snapshot ? "saved" : "saving");
    return true;
  }, []);

  const update = useCallback((patch: Partial<EditorScript>) => {
    const next = { ...latestRef.current, ...patch };
    latestRef.current = next;
    setFormData(next);
    setSaveState("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { saveTimerRef.current = null; void saveNow(latestRef.current); }, 400);
  }, [saveNow]);

  /** When lines are deleted by hand, drop the clips that belonged to them (same rule as before). */
  const reconcileAssets = (previousContent: string, nextContent: string, assets: ProjectAsset[]) => {
    const prev = buildScriptGuide(previousContent).filter((s) => !s.isHook);
    const next = buildScriptGuide(nextContent).filter((s) => !s.isHook);
    if (next.length >= prev.length) return assets;
    const norm = (content: string, s: (typeof prev)[number]) => content.slice(s.start, s.end).replace(/\s+/g, " ").trim().toLowerCase();
    const used = new Set<string>();
    const map = new Map<number, number>();
    for (const n of next) {
      let p = prev.find((c) => !used.has(c.id) && norm(previousContent, c) === norm(nextContent, n));
      if (!p) {
        const same = prev.filter((c) => !used.has(c.id) && c.label.trim().toLowerCase() === n.label.trim().toLowerCase());
        if (same.length === 1) p = same[0];
      }
      if (p?.number != null && n.number != null) { used.add(p.id); map.set(p.number, n.number); }
    }
    const prevOrders = new Set(prev.map((s) => s.number).filter((v): v is number => v != null));
    return assets
      .filter((a) => a.idea_order == null || !prevOrders.has(a.idea_order) || map.has(a.idea_order))
      .map((a) => ({ ...a, idea_order: a.idea_order != null ? map.get(a.idea_order) ?? a.idea_order : a.idea_order }));
  };

  const onContentChange = (content: string) => {
    update({ content });
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      syncTimerRef.current = null;
      const latest = latestRef.current;
      const nextAssets = reconcileAssets(lastSyncedContentRef.current, String(latest.content || ""), latest.assets || []);
      lastSyncedContentRef.current = String(latest.content || "");
      if (JSON.stringify(nextAssets) !== JSON.stringify(latest.assets || [])) update({ assets: nextAssets });
    }, 650);
  };

  const flush = async () => {
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current); syncTimerRef.current = null;
      const latest = latestRef.current;
      latestRef.current = { ...latest, assets: reconcileAssets(lastSyncedContentRef.current, String(latest.content || ""), latest.assets || []) };
      lastSyncedContentRef.current = String(latest.content || "");
    }
    return saveNow(latestRef.current);
  };

  const close = async () => {
    if (await flush()) onClose();
  };

  /** The idea's own page. Its back button returns to this project. */
  const ideaHref = (ideaId: number) => `/idea/${ideaId}${script ? `?project=${script.id}` : ""}`;
  const openIdea = async (event: React.MouseEvent, ideaId: number) => {
    // Ctrl/Cmd/middle click still opens a new tab.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    await flush();
    router.push(ideaHref(ideaId));
  };

  const setCapture = async (idea: ProjectIdea, status: CaptureStatus | null) => {
    setRecordMenuFor(null);
    if ((idea.capture_status ?? null) === status) return;
    const { data: previous } = await supabase.from("details").select("capture_added_at,recorded_at").eq("id", idea.id).single();
    const patch = captureStatusPatch(status, (previous ?? undefined) as { capture_added_at?: string | null; recorded_at?: string | null } | undefined);
    const { error } = await supabase.from("details").update(patch).eq("id", idea.id);
    if (error) {
      notifyError(isMissingRecordingColumns(error) ? RECORDING_SETUP_MESSAGE : error.message, "Recording not updated");
      return;
    }
    setIdeas((current) => (current ?? []).map((item) => (item.id === idea.id ? { ...item, capture_status: status } : item)));
    success(status ? `“${idea.title}” marked ${CAPTURE_META[status].label.toLowerCase()}.` : `“${idea.title}” taken off the Recording List.`, "Recording List");
  };

  /* ---------- derived ---------- */

  const content = String(formData.content || "");
  const assets = useMemo(() => formData.assets || [], [formData.assets]);
  const guide = useMemo(() => buildScriptGuide(content), [content]);
  const match = useMemo(() => matchSectionsToIdeas(content, ideas ?? [], assets), [content, ideas, assets]);
  const ideaById = useMemo(() => new Map((ideas ?? []).map((idea) => [idea.id, idea])), [ideas]);
  const unplaced = (ideas ?? []).filter((idea) => !match.placed.has(idea.id));
  const inProject = useMemo(() => new Set((ideas ?? []).map((idea) => idea.id)), [ideas]);
  const relatedOutside = (ideaId: number) => Array.from(links.get(ideaId) ?? []).filter((id) => !inProject.has(id));
  const suggested: { id: number; reason: string }[] = [];
  for (const idea of [...(ideas ?? [])].sort((a, b) => a.position - b.position)) {
    for (const id of relatedOutside(idea.id)) {
      if (!suggested.some((item) => item.id === id)) suggested.push({ id, reason: `Goes with “${idea.title}”` });
    }
  }
  const openPicker = () => {
    setPicking(true);
    requestAnimationFrame(() => addIdeaRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }));
  };
  const length = estimateSeconds(content);
  const clipStats = countClips(assets.map((a) => a.url));
  const assetAnalysis = useMemo(() => analyzeAssetLinks(assets), [assets]);
  // Ideas Nam recorded himself don't need their source clips downloaded.
  const ownFootageIds = useMemo(() => new Set((ideas ?? []).filter((idea) => idea.capture_status === "recorded" || idea.capture_status === "used").map((idea) => idea.id)), [ideas]);
  const downloadAssets = assetAnalysis.uniqueAssets.filter((asset) => !(asset.idea_id != null && ownFootageIds.has(asset.idea_id)));
  const toRecord = (ideas ?? []).filter((idea) => idea.capture_status === "to_record").length;

  const missingClips = useMemo(() => {
    const have = new Set(assets.map((a) => getClipIdentity(a.url || "")).filter(Boolean));
    const seen = new Set<string>();
    const result: { idea: ProjectIdea; clip: ProjectIdea["clips"][number] }[] = [];
    for (const idea of ideas ?? []) for (const clip of idea.clips) {
      const id = getClipIdentity(clip.file_path);
      if (!id || have.has(id) || seen.has(id)) continue;
      seen.add(id);
      result.push({ idea, clip });
    }
    return result;
  }, [assets, ideas]);

  /* ---------- idea actions ---------- */

  const draftOf = () => ({
    content: String(latestRef.current.content || ""),
    description: String(latestRef.current.description || ""),
    assets: latestRef.current.assets || [],
    tags: latestRef.current.tags || [],
    hashtags: latestRef.current.hashtags || [],
  });

  const removeIdea = async (idea: ProjectIdea) => {
    const ok = await confirm({ kind: "warning", title: "Remove idea from project?", message: `“${idea.title}” — its line, clips and description block are removed from this project. The idea stays in your library.`, confirmText: "Remove" });
    if (!ok || !script) return;
    const sectionId = Array.from(match.bySection.entries()).find(([, id]) => id === idea.id)?.[0];
    const section = sectionId ? buildScriptGuide(draftOf().content).find((s) => s.id === sectionId) ?? null : null;
    const next = removeIdeaFromDraft(draftOf(), idea, section);
    lastSyncedContentRef.current = next.content;
    update(next);
    await flush();
    const { error } = await supabase.from("script_ideas").delete().eq("script_id", script.id).eq("detail_id", idea.id);
    if (error) notifyError(error.message, "Link not removed");
    setIdeas((current) => (current ?? []).filter((i) => i.id !== idea.id));
    invalidateUsage();
    success(`“${idea.title}” removed from this project.`, "Removed");
  };

  const addIdea = async (row: IdeaRow) => {
    if (!script) return;
    const position = Math.max(0, ...(ideas ?? []).map((i) => i.position).filter((value) => Number.isFinite(value))) + 1;
    const idea = toProjectIdea(row, position);
    const next = addIdeaToDraft(draftOf(), idea);
    lastSyncedContentRef.current = next.content;
    update(next);
    await flush();
    const { error } = await supabase.from("script_ideas").upsert({ script_id: script.id, detail_id: idea.id, position }, { onConflict: "script_id,detail_id" });
    if (error) notifyError(error.message, "Idea not linked");
    setIdeas((current) => [...(current ?? []), idea]);
    invalidateUsage();
    setPicking(false);
    success(`“${idea.title}” added as idea #${buildScriptGuide(next.content).filter((s) => !s.isHook).length}.`, "Idea added");
  };

  /** Put a linked idea's line back into the script. */
  const addLineFor = (idea: ProjectIdea) => {
    const draft = draftOf();
    const line = buildScriptLine(idea, idea.game_title);
    const nextContent = draft.content.trim() ? `${draft.content.trim()}\n\n${line}` : line;
    lastSyncedContentRef.current = nextContent;
    update({ content: nextContent });
  };

  /** Put the script's idea lines in this order (section ids, hook excluded). */
  const applySectionOrder = (orderedIds: string[]) => {
    const text = String(latestRef.current.content || "");
    const all = buildScriptGuide(text);
    const hook = all.find((s) => s.isHook);
    const sections = all.filter((s) => !s.isHook);
    const byId = new Map(sections.map((s) => [s.id, s]));
    const ordered = orderedIds.map((id) => byId.get(id)).filter((s): s is ScriptGuideSection => Boolean(s));
    // Anything not named keeps its place at the end.
    for (const section of sections) if (!orderedIds.includes(section.id)) ordered.push(section);
    if (ordered.every((s, i) => s.id === sections[i]?.id)) return;
    const blocks = new Map(all.map((s) => [s.id, text.slice(s.start, s.end).trim()]));
    const nextContent = [hook ? blocks.get(hook.id) : null, ...ordered.map((s) => blocks.get(s.id))].filter(Boolean).join("\n\n");
    const newOrder = new Map<number, number>();
    ordered.forEach((s, i) => { if (s.number != null) newOrder.set(s.number, i + 1); });
    const nextAssets = (latestRef.current.assets || [])
      .map((a) => ({ ...a, idea_order: a.idea_order != null ? newOrder.get(a.idea_order) ?? a.idea_order : a.idea_order }))
      .sort((a, b) => (a.idea_order ?? Number.MAX_SAFE_INTEGER) - (b.idea_order ?? Number.MAX_SAFE_INTEGER));
    lastSyncedContentRef.current = nextContent;
    update({ content: nextContent, assets: nextAssets });
    // Keep the saved idea order in step with the script.
    if (script) {
      const orderedIdeaIds = ordered.map((s) => match.bySection.get(s.id)).filter((id): id is number => id != null);
      const rows = orderedIdeaIds.map((detailId, index) => ({ script_id: script.id, detail_id: detailId, position: index + 1 }));
      // Supabase queries only run once awaited or then()-ed; a bare `void query` never sends.
      if (rows.length) {
        supabase.from("script_ideas").upsert(rows, { onConflict: "script_id,detail_id" }).then(({ error }) => {
          if (error) notifyError(error.message, "Idea order not saved");
        });
      }
      setIdeas((current) => (current ?? []).map((idea) => ({ ...idea, position: orderedIdeaIds.indexOf(idea.id) >= 0 ? orderedIdeaIds.indexOf(idea.id) + 1 : idea.position })));
    }
  };

  const ideaSectionIds = () => buildScriptGuide(String(latestRef.current.content || "")).filter((s) => !s.isHook).map((s) => s.id);

  /** Drag-and-drop: move one line to where another one is. */
  const moveSection = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const ids = ideaSectionIds();
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    applySectionOrder(ids);
  };

  /** Arrow buttons: move a line by a step, or to the top / bottom. */
  const nudgeSection = (sectionId: string, where: "up" | "down" | "top" | "bottom") => {
    const ids = ideaSectionIds();
    const from = ids.indexOf(sectionId);
    if (from < 0) return;
    const to = where === "top" ? 0 : where === "bottom" ? ids.length - 1 : where === "up" ? Math.max(0, from - 1) : Math.min(ids.length - 1, from + 1);
    if (to === from) return;
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    applySectionOrder(ids);
  };

  const addMissingClips = () => {
    const sectionOf = (ideaId: number) => {
      const sectionId = Array.from(match.bySection.entries()).find(([, id]) => id === ideaId)?.[0];
      return match.sections.find((s) => s.id === sectionId)?.number ?? null;
    };
    const added = missingClips.map(({ idea, clip }) => ({
      url: clip.file_path,
      name: clip.title || clip.file_path.split("/").pop() || "Video",
      channel_name: clip.channel_name,
      idea_id: idea.id,
      idea_title: idea.title,
      game_title: idea.game_title,
      idea_order: sectionOf(idea.id),
    }));
    update({ assets: [...(latestRef.current.assets || []), ...added].sort((a, b) => (a.idea_order ?? Number.MAX_SAFE_INTEGER) - (b.idea_order ?? Number.MAX_SAFE_INTEGER)) });
    success(`${added.length} clip${added.length === 1 ? "" : "s"} added.`, "Clips updated");
  };

  /* ---------- misc ---------- */

  const copy = async (text: string, what: string) => {
    if (!text.trim()) { notifyError(`There is no ${what} to copy.`, "Nothing to copy"); return; }
    try { await navigator.clipboard.writeText(text); success(`${what[0].toUpperCase()}${what.slice(1)} copied.`, "Copied"); }
    catch { notifyError("The browser could not copy. Select the text manually.", "Copy failed"); }
  };

  const refresh = async () => {
    if (!script) return;
    setMenuOpen(false);
    await flush();
    setRefreshing(true);
    const fresh = await onRefresh(script.id);
    setRefreshing(false);
    if (!fresh) return;
    setFormData(fresh);
    latestRef.current = fresh;
    lastSavedRef.current = JSON.stringify(fresh);
    lastSyncedContentRef.current = String(fresh.content || "");
    setSaveState("saved");
    void loadIdeas(script.id);
    success("Project reloaded.", "Refreshed");
  };

  const jumpTo = (start: number, end: number) => {
    setTab("script");
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, end);
    });
  };

  if (!script) return null;

  /* ---------- render pieces ---------- */

  // Clips that belong to each script line, and the ones no line claims.
  const clipsBySection = new Map<string, { asset: ProjectAsset; index: number }[]>();
  const claimed = new Set<number>();
  for (const section of guide) {
    if (section.isHook) continue;
    const ideaId = match.bySection.get(section.id);
    const list: { asset: ProjectAsset; index: number }[] = [];
    assets.forEach((asset, index) => {
      if (claimed.has(index)) return;
      if ((ideaId != null && asset.idea_id === ideaId) || (!asset.idea_id && asset.idea_order === section.number)) {
        list.push({ asset, index });
        claimed.add(index);
      }
    });
    clipsBySection.set(section.id, list);
  }
  const otherClips = assets.map((asset, index) => ({ asset, index })).filter(({ index }) => !claimed.has(index));

  // Clips as small chips: number and channel. Hover shows the clip title and link.
  const clipRows = (items: { asset: ProjectAsset; index: number }[], color: (typeof IDEA_COLORS)[number] | typeof NEUTRAL_COLOR) => (
    <ul className="flex flex-wrap gap-1.5 px-3 py-2.5">
      {items.map(({ asset, index }, i) => {
        const dup = assetAnalysis.duplicateMeta.get(index);
        return (
          <li key={`${asset.url}-${index}`} className="min-w-0 max-w-full">
            <a
              href={asset.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`${clipLabel(asset)}${getStartSeconds(asset.url) ? ` (from ${formatTimestamp(getStartSeconds(asset.url))})` : ""}\n${asset.url}`}
              aria-label={`Open clip ${i + 1}: ${clipLabel(asset)}`}
              className={`inline-flex h-8 max-w-full items-center gap-1.5 rounded-lg border border-line bg-surface px-2 text-xs font-semibold transition hover:border-line-strong ${color.link}`}
            >
              <PlayIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="shrink-0 tabular-nums">Clip {i + 1}</span>
              {(() => {
                const start = getStartSeconds(asset.url);
                return start > 0 ? (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-surface-sunken px-1 font-mono text-[11px] tabular-nums text-fg-2" title={`Starts at ${formatTimestamp(start)}`}>
                    <ClockIcon className="h-3 w-3" aria-hidden="true" />{formatTimestamp(start)}
                  </span>
                ) : null;
              })()}
              {titleSnippet(asset.name) && <span className="min-w-0 truncate font-medium text-fg-2">{titleSnippet(asset.name)}</span>}
              {asset.channel_name && <span className="min-w-0 max-w-[10rem] shrink-[2] truncate font-medium text-fg-4">· {asset.channel_name}</span>}
              {dup && <span className="shrink-0 rounded bg-surface-sunken px-1 text-[10px] text-fg-3" title="Same source video as another clip">{dup.isPrimary ? `×${dup.total}` : "dup"}</span>}
            </a>
          </li>
        );
      })}
    </ul>
  );

  const changeView = (mode: "aligned" | "plain") => {
    setViewMode(mode);
    setEditingRow(null);
    try { window.localStorage.setItem("ninjaplay-script-view", mode); } catch { /* ignore */ }
  };

  const scriptToolbar = (
    <>
      <p className={`inline-flex items-center gap-1.5 text-xs font-medium ${length.seconds > 60 ? "text-amber-700 dark:text-amber-300" : "text-fg-3"}`} title="Estimated at about 2.6 words per second">
        <ClockIcon className="h-4 w-4" /> ≈ {formatDuration(length.seconds)} · {length.words} words{length.seconds > 60 ? " · over 60s" : ""}
      </p>
      <div className="flex items-center gap-1.5">
        <div className="flex gap-0.5 rounded-lg bg-surface-sunken p-0.5" role="radiogroup" aria-label="Script view">
          {([["aligned", "Line by line"], ["plain", "Plain text"]] as const).map(([mode, label]) => (
            <button key={mode} type="button" role="radio" aria-checked={viewMode === mode} onClick={() => changeView(mode)} className={`h-8 cursor-pointer rounded-md px-2.5 text-xs font-semibold transition ${viewMode === mode ? "bg-surface text-fg shadow-sm ring-1 ring-line" : "text-fg-3 hover:text-fg"}`}>{label}</button>
          ))}
        </div>
        <Button variant="primary" size="sm" onClick={() => void copy(content, "script")}><DocumentDuplicateIcon className="h-4 w-4" /> Copy script</Button>
      </div>
    </>
  );

  const iconButton = "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-fg-4 transition hover:bg-surface/80 hover:text-fg";

  const renderHookCard = (section: ScriptGuideSection, onJump: () => void, active = false) => (
    <button type="button" onClick={onJump} className={`flex h-full w-full cursor-pointer items-start gap-2.5 rounded-2xl border border-cyan-200 bg-cyan-50/70 p-3 text-left transition hover:bg-cyan-50 dark:border-cyan-400/25 dark:bg-cyan-400/10 ${active ? "ring-2 ring-cyan-500" : ""}`}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-cyan text-xs font-black text-slate-950">H</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-cyan-900 dark:text-cyan-100">Opening hook</span>
        <span className="line-clamp-2 text-xs text-cyan-800/75 dark:text-cyan-100/70">{section.preview}</span>
      </span>
    </button>
  );

  const renderSectionCard = (section: ScriptGuideSection, onJump: () => void, active = false) => {
    const ideaId = match.bySection.get(section.id);
    const idea = ideaId != null ? ideaById.get(ideaId) : undefined;
    const sectionClips = clipsBySection.get(section.id) ?? [];
    const color = idea ? ideaColor(section.number) : NEUTRAL_COLOR;
    const isOver = dragOverId === section.id && draggedId !== section.id;
    const capture = idea?.capture_status ? CAPTURE_META[idea.capture_status as keyof typeof CAPTURE_META] : undefined;
    const ownFootage = idea ? ownFootageIds.has(idea.id) : false;
    // Recorded ideas stay faded while you scroll or hover; only working on one
    // (its line focused, a button in it, the recording menu) brings it forward.
    const faded = ownFootage && !active && !isOver && recordMenuFor !== idea?.id;
    return (
      <div
        draggable
        onDragStart={(e) => { setDraggedId(section.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", section.id); }}
        onDragOver={(e) => { e.preventDefault(); setDragOverId(section.id); }}
        onDragLeave={() => setDragOverId((c) => (c === section.id ? null : c))}
        onDrop={(e) => { e.preventDefault(); const src = e.dataTransfer.getData("text/plain") || draggedId; if (src) moveSection(src, section.id); setDraggedId(null); setDragOverId(null); }}
        onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
        className={`group h-full overflow-hidden rounded-2xl border border-l-4 bg-surface transition ${faded ? "opacity-55 focus-within:opacity-100" : ""} ${color.bar} ${isOver ? "border-y-blue-500 border-r-blue-500 ring-2 ring-blue-500" : active ? "border-y-line-strong border-r-line-strong ring-2 ring-blue-500/50" : "border-y-line border-r-line"}`}
      >
        <div className={`relative flex items-start gap-3 overflow-hidden p-3 ${color.soft}`}>
          {idea?.game_cover && (
            // The game's art fades in from the right edge.
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-30 [mask-image:linear-gradient(to_left,black_10%,transparent)] dark:opacity-25">
              <CoverImage src={idea.game_cover} sizes="300px" className="scale-110 blur-[2px]" />
            </span>
          )}
          {/* Step a line up or down; the grip between them still drags on desktop. */}
          <span className="relative -my-1 flex shrink-0 flex-col items-center">
            <button type="button" onClick={() => nudgeSection(section.id, "up")} disabled={section.number === 1} className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-fg-4 transition hover:bg-surface/80 hover:text-fg disabled:invisible" aria-label="Move up" title="Move up"><ChevronUpIcon className="h-4 w-4" /></button>
            <Bars3Icon className="h-4 w-4 cursor-grab text-fg-4 active:cursor-grabbing pointer-coarse:hidden" aria-hidden="true" />
            <button type="button" onClick={() => nudgeSection(section.id, "down")} disabled={section.number === guide.filter((g) => !g.isHook).length} className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-fg-4 transition hover:bg-surface/80 hover:text-fg disabled:invisible" aria-label="Move down" title="Move down"><ChevronDownIcon className="h-4 w-4" /></button>
          </span>
          <span className={`relative mt-0.5 flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg px-1.5 text-sm font-bold tabular-nums shadow-sm ${ownFootage ? "bg-emerald-600 text-white" : color.badge}`}>{section.number}</span>
          <div className="relative min-w-0 flex-1 pl-1">
            <button type="button" onClick={onJump} className="block w-full cursor-pointer text-left" title="Go to this line in the script">
              {idea ? (
                <>
                  <span className="flex min-w-0 items-center gap-1.5">
                    {ownFootage && capture && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                        <CheckIcon className="h-3 w-3 stroke-[3]" /> {capture.short}
                      </span>
                    )}
                    <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-fg-3">{idea.game_title}</span>
                  </span>
                  <span className={`line-clamp-2 text-[15px] font-bold leading-snug ${color.title}`}>{idea.title}</span>
                </>
              ) : (
                <>
                  <span className="block truncate text-[11px] font-semibold uppercase tracking-wide text-fg-4">{section.label}</span>
                  <span className="line-clamp-2 text-xs leading-5 text-fg-3">{section.preview}</span>
                  <span className="mt-1 block text-[11px] italic text-fg-4">Not linked to an idea</span>
                </>
              )}
            </button>
            {idea && (
              <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-fg-3">
                <span className="inline-flex items-center gap-1"><FilmIcon className="h-3 w-3" /> {sectionClips.length} clip{sectionClips.length === 1 ? "" : "s"}</span>
                <button
                  type="button"
                  onClick={() => setRecordMenuFor((current) => (current === idea.id ? null : idea.id))}
                  aria-expanded={recordMenuFor === idea.id}
                  title="Recording List"
                  className={`inline-flex cursor-pointer items-center gap-1 rounded px-1 font-semibold transition ${capture ? capture.pill : "bg-surface/80 text-fg-3 ring-1 ring-line hover:text-rose-600"}`}
                >
                  <VideoCameraIcon className="h-3 w-3" /> {capture ? capture.short : "Record?"}
                </button>
                {relatedOutside(idea.id).length > 0 && (
                  <button type="button" onClick={openPicker} className="inline-flex cursor-pointer items-center gap-1 rounded bg-surface/80 px-1 font-semibold text-accent ring-1 ring-blue-500/25 transition hover:bg-accent-soft" title="Related ideas not in this project yet">
                    <LinkIcon className="h-3 w-3" /> {relatedOutside(idea.id).length} related
                  </button>
                )}
              </span>
            )}
            {idea && recordMenuFor === idea.id && (
              <span className="mt-1.5 flex flex-wrap gap-1" role="group" aria-label="Recording status">
                {CAPTURE_STATUSES.map((status) => (
                  <button key={status} type="button" aria-pressed={idea.capture_status === status} onClick={() => void setCapture(idea, status)} className={`inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold ring-1 transition ${idea.capture_status === status ? `${CAPTURE_META[status].pill} ring-transparent` : "bg-surface text-fg-2 ring-line hover:ring-line-strong"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${CAPTURE_META[status].dot}`} /> {CAPTURE_META[status].short}
                  </button>
                ))}
                {idea.capture_status && (
                  <button type="button" onClick={() => void setCapture(idea, null)} className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg bg-surface px-2 text-[11px] font-semibold text-fg-3 ring-1 ring-line transition hover:text-rose-600">
                    <XMarkIcon className="h-3 w-3" /> Off the list
                  </button>
                )}
              </span>
            )}
          </div>
          <div className="relative -mr-1 -mt-1 flex shrink-0 flex-col gap-0.5 sm:flex-row">
            {sectionClips.length > 0 && (
              <button type="button" onClick={() => void copy(sectionClips.map(({ asset }) => asset.url).filter(Boolean).join("\n"), "links")} className={iconButton} aria-label="Copy this idea's links" title="Copy this idea's links">
                <DocumentDuplicateIcon className="h-4 w-4" />
              </button>
            )}
            {idea && (
              <>
                <Link href={ideaHref(idea.id)} onClick={(e) => void openIdea(e, idea.id)} className={iconButton} aria-label={`Open idea page: ${idea.title}`} title="Open idea page">
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </Link>
                <button type="button" onClick={() => void removeIdea(idea)} className={`${iconButton} hover:bg-danger-soft hover:text-rose-600`} aria-label={`Remove ${idea.title} from project`} title="Remove from project">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
        {ownFootage && (
          <p className="flex items-center gap-1.5 px-3 pt-2.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckIcon className="h-3.5 w-3.5" /> Recorded yourself, no need to download{sectionClips.length ? "" : "."}
          </p>
        )}
        {sectionClips.length > 0
          ? clipRows(sectionClips, color)
          : ownFootage ? <div className="h-2.5" />
          : idea && <p className="flex items-center gap-2 px-3 py-2.5 text-xs text-fg-4"><FilmIcon className="h-4 w-4" /> No clips yet. Add footage to this idea, or record it yourself.</p>}
      </div>
    );
  };

  const ideasSummary = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-fg">Ideas & clips <span className="font-normal text-fg-4">· {ideas?.length ?? "…"} ideas · {clipStats.clips} clips · {downloadAssets.length} {downloadAssets.length === 1 ? "video" : "videos"} to download</span></p>
        <p className="text-[11px] text-fg-4">Use Reorder or the ↑ ↓ arrows to change the order · click a title to go to its line</p>
      </div>
      <div className="flex items-center gap-1.5">
        {toRecord > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
            <VideoCameraIcon className="h-3 w-3" /> {toRecord} to record
          </span>
        )}
        {guide.filter((g) => !g.isHook).length > 1 && (
          <Button variant="secondary" size="sm" onClick={() => setReordering(true)} title="Put the ideas in a new order">
            <ArrowsUpDownIcon className="h-4 w-4" /> Reorder
          </Button>
        )}
        {downloadAssets.length > 0 && (
          <Button variant="secondary" size="sm" onClick={() => void copy(downloadAssets.map((a) => a.url).filter(Boolean).join("\n"), "links")} title={ownFootageIds.size ? "Copy every source video once (ideas you recorded are left out)" : "Copy every source video once"}>
            <DocumentDuplicateIcon className="h-4 w-4" /> Copy all links
          </Button>
        )}
      </div>
    </div>
  );

  const missingBanner = missingClips.length > 0 && (
    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
      <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
      <p className="min-w-0 flex-1 text-xs"><span className="font-semibold">{missingClips.length} clip{missingClips.length === 1 ? "" : "s"} from these ideas {missingClips.length === 1 ? "is" : "are"} not in the list</span><span className="block truncate opacity-80">{Array.from(new Set(missingClips.map((m) => m.idea.title))).join(" · ")}</span></p>
      <Button variant="accent" size="sm" onClick={addMissingClips} className="shrink-0 bg-amber-600 hover:bg-amber-700"><PlusIcon className="h-4 w-4" /> Add</Button>
    </div>
  );

  const otherClipsBlock = otherClips.length > 0 && (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center gap-2 bg-surface-sunken px-3 py-2">
        <FilmIcon className="h-4 w-4 text-fg-4" />
        <p className="min-w-0 flex-1 text-sm font-semibold text-fg">Other clips <span className="font-normal text-fg-4">· not tied to a line</span></p>
        <button type="button" onClick={() => void copy(otherClips.map(({ asset }) => asset.url).filter(Boolean).join("\n"), "links")} className={iconButton} aria-label="Copy these links" title="Copy these links"><DocumentDuplicateIcon className="h-4 w-4" /></button>
      </div>
      {clipRows(otherClips, NEUTRAL_COLOR)}
    </div>
  );

  const unplacedBlock = unplaced.length > 0 && (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300"><ExclamationTriangleIcon className="h-3.5 w-3.5" /> In the project but not in the script</p>
      <ul className="space-y-1.5">
        {unplaced.map((idea) => (
          <li key={idea.id} className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2 dark:border-amber-500/30 dark:bg-amber-500/10">
            <GameThumb src={idea.game_cover} className="h-8 w-6" />
            <span className="min-w-0 flex-1">
              <Link href={ideaHref(idea.id)} onClick={(e) => void openIdea(e, idea.id)} className="block truncate text-sm font-semibold text-fg hover:text-accent hover:underline" title="Open idea page">{idea.title}</Link>
              <span className="block truncate text-[11px] text-fg-3">{idea.game_title}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={() => addLineFor(idea)} title="Add its line to the end of the script">Add line</Button>
            <button type="button" onClick={() => void removeIdea(idea)} className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-fg-4 hover:bg-danger-soft hover:text-rose-600" aria-label={`Remove ${idea.title} from project`}>
              <TrashIcon className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  const addIdeaBlock = (
    <div ref={addIdeaRef} className="relative">
      {picking && <IdeaPicker excludeIds={inProject} suggested={suggested} onPick={addIdea} onClose={() => setPicking(false)} />}
      <Button variant="secondary" className="w-full" onClick={() => setPicking((v) => !v)} aria-expanded={picking}>
        <PlusIcon className="h-4 w-4" /> Add idea{suggested.length > 0 && <span className="ml-1 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold text-accent">{suggested.length} related</span>}
      </Button>
    </div>
  );

  /* ---------- aligned view: one row per script block ---------- */

  // Script blocks as they are in the text (separated by blank lines), lined up with the guide.
  const blocks = content.split(/\n{2,}/).filter((block) => block.trim());
  type Row = { key: string; text: string; section: ScriptGuideSection | null; index: number };
  const rows: Row[] = [];
  if (editingRow && editingRow.row <= blocks.length) {
    blocks.slice(0, editingRow.row).forEach((text, i) => rows.push({ key: `r${i}`, text: text.trim(), section: guide[i] ?? null, index: i }));
    rows.push({ key: `r${editingRow.row}`, text: editingRow.text, section: editingRow.skip > 0 ? guide[editingRow.row] ?? null : null, index: editingRow.row });
    blocks.slice(editingRow.row + editingRow.skip).forEach((text, j) => {
      const i = editingRow.row + editingRow.skip + j;
      rows.push({ key: `r${editingRow.row + 1 + j}`, text: text.trim(), section: guide[i] ?? null, index: editingRow.row + 1 + j });
    });
  } else {
    blocks.forEach((text, i) => rows.push({ key: `r${i}`, text: text.trim(), section: guide[i] ?? null, index: i }));
  }
  if (rows.length === 0) rows.push({ key: "r0", text: "", section: null, index: 0 });

  const countBlocks = (text: string) => text.split(/\n{2,}/).filter((block) => block.trim()).length;

  const editRow = (rowIndex: number, text: string) => {
    const current = String(latestRef.current.content || "").split(/\n{2,}/).filter((block) => block.trim());
    const skip = editingRow && editingRow.row === rowIndex ? editingRow.skip : 1;
    const next = [...current.slice(0, rowIndex), text, ...current.slice(rowIndex + skip)].join("\n\n");
    setEditingRow({ row: rowIndex, text, skip: countBlocks(text) });
    onContentChange(next);
  };

  const focusRow = (rowIndex: number) => {
    const el = rowRefs.current.get(rowIndex);
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const end = el.value.length;
    el.setSelectionRange(end, end);
  };

  const columns = "grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]";

  const alignedView = (
    <div className="mx-auto w-full space-y-5 lg:space-y-3">
      <div className={`grid gap-3 ${columns} lg:gap-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">{scriptToolbar}</div>
        <div>{ideasSummary}</div>
      </div>
      {rows.map((row) => {
        const section = row.section;
        const ideaId = section ? match.bySection.get(section.id) : undefined;
        const color = section && !section.isHook && ideaId != null ? ideaColor(section.number) : NEUTRAL_COLOR;
        const active = activeRow === row.index;
        return (
          <div key={row.key} className={`grid items-stretch gap-2 ${columns} lg:gap-4`}>
            <div
              onClick={() => rowRefs.current.get(row.index)?.focus()}
              className={`flex h-full cursor-text gap-3 rounded-2xl border border-l-4 bg-surface p-3 transition sm:p-4 ${section?.isHook ? "border-l-cyan-400" : color.bar} ${active ? "border-y-blue-500 border-r-blue-500 ring-4 ring-blue-500/10" : "border-y-line border-r-line hover:border-y-line-strong hover:border-r-line-strong"}`}
            >
              <span className={`mt-1 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md px-1 text-xs font-bold tabular-nums ${section?.isHook ? "bg-brand-cyan text-slate-950" : ideaId != null && ownFootageIds.has(ideaId) ? "bg-emerald-600 text-white" : section ? color.badge : NEUTRAL_COLOR.badge}`} title={ideaId != null && ownFootageIds.has(ideaId) ? "Recorded yourself" : undefined}>{section?.isHook ? "H" : section?.number ?? "·"}</span>
              <AutoTextarea
                value={row.text}
                inputRef={(el) => { if (el) rowRefs.current.set(row.index, el); else rowRefs.current.delete(row.index); }}
                onChange={(value) => editRow(row.index, value)}
                onFocus={() => { setActiveRow(row.index); setEditingRow({ row: row.index, text: row.text, skip: row.text.trim() ? 1 : 0 }); }}
                onBlur={() => { setEditingRow(null); setActiveRow((current) => (current === row.index ? null : current)); }}
                placeholder={rows.length === 1 ? "Opening hook, then one paragraph per idea…" : "Write this line…"}
                ariaLabel={section?.isHook ? "Opening hook" : `Script line ${section?.number ?? row.index + 1}`}
              />
            </div>
            <div className={`min-w-0 ${section?.isHook ? "hidden lg:block" : ""}`}>
              {section ? (section.isHook ? renderHookCard(section, () => focusRow(row.index), active) : renderSectionCard(section, () => focusRow(row.index), active)) : null}
            </div>
          </div>
        );
      })}
      <div className={`grid gap-3 ${columns} lg:gap-4`}>
        <p className="self-start text-xs text-fg-4 lg:pt-2">Leave a blank line inside a box to split it into a new line.</p>
        <div className="min-w-0 space-y-3">
          {missingBanner}
          {otherClipsBlock}
          {unplacedBlock}
          {addIdeaBlock}
        </div>
      </div>
    </div>
  );

  /* ---------- plain view: one text box + the list ---------- */

  const ideasPanel = (
    <div className="flex min-h-0 flex-col gap-3">
      {ideasSummary}
      {missingBanner}
      <ol className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-0.5">
        {guide.length === 0 && <li className="rounded-2xl border border-dashed border-line-strong p-5 text-center text-xs text-fg-4">The script is empty. Add an idea below.</li>}
        {guide.map((section) => (
          <li key={section.id}>
            {section.isHook ? renderHookCard(section, () => jumpTo(section.start, section.end)) : renderSectionCard(section, () => jumpTo(section.start, section.end))}
          </li>
        ))}
        {otherClipsBlock && <li>{otherClipsBlock}</li>}
        {unplacedBlock && <li className="pt-2">{unplacedBlock}</li>}
      </ol>
      {addIdeaBlock}
    </div>
  );

  const plainView = (
    <div className={`grid h-full min-h-0 gap-4 ${columns}`}>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">{scriptToolbar}</div>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Opening hook, then one line per idea…"
          aria-label="Script"
          className="min-h-[50dvh] w-full flex-1 resize-none rounded-2xl border border-line bg-surface p-4 text-base leading-7 text-fg outline-none transition placeholder:text-fg-4 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:p-6 sm:text-[17px] sm:leading-8 lg:min-h-0"
        />
      </div>
      <aside className="flex min-h-0 flex-col rounded-2xl border border-line bg-surface p-3">{ideasPanel}</aside>
    </div>
  );

  const detailsPanel = (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-fg-3">YouTube description</p>
          <Button variant="ghost" size="sm" onClick={() => void copy(String(formData.description || ""), "description")}><DocumentDuplicateIcon className="h-4 w-4" /> Copy</Button>
        </div>
        <textarea
          value={String(formData.description || "")}
          onChange={(e) => update({ description: e.target.value })}
          className="h-64 w-full resize-y rounded-2xl border border-line bg-surface p-4 text-sm leading-6 text-fg outline-none focus:border-blue-500"
          aria-label="Description"
        />
      </div>
      <ChipEditor label="Hashtags" values={formData.hashtags || []} onChange={(hashtags) => update({ hashtags })} prefix="#" placeholder="#shorts, #gaming…" />
      <div className="flex justify-end -mt-3"><Button variant="ghost" size="sm" onClick={() => void copy((formData.hashtags || []).join(" "), "hashtags")}><DocumentDuplicateIcon className="h-4 w-4" /> Copy hashtags</Button></div>
      <ChipEditor label="Tags" values={formData.tags || []} onChange={(tags) => update({ tags })} placeholder="GTA V, Gaming…" />
      <div className="flex justify-end -mt-3"><Button variant="ghost" size="sm" onClick={() => void copy((formData.tags || []).join(", "), "tags")}><DocumentDuplicateIcon className="h-4 w-4" /> Copy tags</Button></div>
    </div>
  );

  const tabs = [
    { key: "script" as const, label: "Script", Icon: DocumentTextIcon, mobileOnly: false },
    { key: "details" as const, label: "Details", Icon: InformationCircleIcon, mobileOnly: false },
  ];

  return (
    <Modal open={isOpen} onClose={() => void close()} size="editor" zClass="z-[150]" className="max-w-[min(1320px,calc(100vw-1rem))] rounded-[1.5rem] sm:rounded-[2rem]">
      {/* Header */}
      <div className="shrink-0 border-b border-line-soft px-3 pb-3 pt-3 sm:px-6 sm:pt-5">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void close()} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-fg-3 transition hover:bg-surface-sunken hover:text-fg" aria-label="Close project">
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <input
            value={String(formData.title || "")}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Untitled project"
            aria-label="Project title"
            className="min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-2 py-1.5 text-lg font-bold text-fg outline-none transition hover:border-line focus:border-blue-500 focus:bg-surface sm:text-2xl"
          />
          <span
            className={`hidden h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold sm:inline-flex ${saveState === "error" ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" : saveState === "saving" ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"}`}
            title="Changes save automatically"
          >
            {saveState === "saving" ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : <CheckIcon className="h-3.5 w-3.5" />}
            {saveState === "error" ? "Save failed" : saveState === "saving" ? "Saving" : "Saved"}
          </span>
          <div ref={menuRef} className={`relative ${menuOpen ? "z-40" : ""}`}>
            <button type="button" onClick={() => setMenuOpen((v) => !v)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-fg-3 transition hover:bg-surface-sunken hover:text-fg" aria-label="More" aria-expanded={menuOpen}>
              <EllipsisHorizontalIcon className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full z-40 mt-1 w-56 rounded-2xl border border-line bg-surface p-1.5 shadow-2xl">
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); void copy(content, "script"); }} className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-fg-2 hover:bg-surface-sunken hover:text-fg"><DocumentDuplicateIcon className="h-4 w-4" /> Copy script</button>
                <button type="button" role="menuitem" onClick={() => void refresh()} disabled={refreshing} className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-fg-2 hover:bg-surface-sunken hover:text-fg"><ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Reload from database</button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 sm:pl-12">
          <div className="flex gap-0.5 rounded-xl bg-surface-sunken p-0.5" role="radiogroup" aria-label="Status">
            {STATUSES.map((status) => (
              <button key={status} type="button" role="radio" aria-checked={(formData.status || "Draft") === status} onClick={() => update({ status })} className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition sm:px-3 ${(formData.status || "Draft") === status ? "bg-surface text-fg shadow-sm ring-1 ring-line" : "text-fg-3 hover:text-fg"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} /> {status}
              </button>
            ))}
          </div>
          <div className="w-full min-w-0 sm:w-64">
            <ProjectTopicSelect value={getScriptTopicValue(formData)} topics={topics} loading={topicsLoading} onChange={(topic) => update({ topic })} />
          </div>
          {topicsError && <button type="button" onClick={onRetryTopics} className="cursor-pointer text-xs font-semibold text-rose-500 underline">Retry topics</button>}
          <p className="text-xs text-fg-4 sm:ml-auto">{ideas?.length ?? 0} ideas · {clipStats.clips} clips · ≈ {formatDuration(length.seconds)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-line-soft px-3 sm:px-6" role="tablist">
        {tabs.map(({ key, label, Icon, mobileOnly }) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`${mobileOnly ? "lg:hidden" : ""} inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-3 text-sm font-semibold transition ${tab === key ? "border-blue-600 text-fg" : "border-transparent text-fg-3 hover:text-fg"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-surface-muted p-3 sm:p-6">
        {tab === "script" && (viewMode === "aligned" ? alignedView : plainView)}
        {tab === "details" && detailsPanel}
      </div>
      {reordering && (
        <ReorderPanel
          items={guide.filter((g) => !g.isHook).map((section) => {
            const idea = ideaById.get(match.bySection.get(section.id) ?? -1);
            return { id: section.id, title: idea?.title ?? section.preview, game: idea?.game_title ?? section.label, linked: Boolean(idea), recorded: idea ? ownFootageIds.has(idea.id) : false };
          })}
          onSave={applySectionOrder}
          onClose={() => setReordering(false)}
        />
      )}
    </Modal>
  );
}

