"use client";

import { CoverImage } from "@/components/CoverImage";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowTopRightOnSquareIcon, ArrowsUpDownIcon, ChatBubbleLeftRightIcon, CheckCircleIcon, CheckIcon, ChevronDownIcon, ChevronRightIcon, ClipboardDocumentIcon, FilmIcon, LightBulbIcon, LinkIcon, MagnifyingGlassIcon, PencilSquareIcon, PlayCircleIcon, PlusIcon, PuzzlePieceIcon, QuestionMarkCircleIcon, RocketLaunchIcon, StarIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { AppPageHeader, appPageMainClass, appPagePrimaryActionClass, appPageRootClass } from "@/components/AppPage";
import { useNotifications } from "@/components/NotificationCenter";
import { supabase } from "@/lib/supabaseClient";
import type { AudienceRequest, Game } from "@/types/gamekb";

type RequestForm = {
  comment_text: string;
  commenter_name: string;
  source_url: string;
  game_id: number | "";
  notes: string;
  status: AudienceRequest["status"];
  promised: boolean;
  published_url: string;
};

const EMPTY_FORM: RequestForm = {
  comment_text: "",
  commenter_name: "",
  source_url: "",
  game_id: "",
  notes: "",
  status: "inbox",
  promised: false,
  published_url: "",
};

type FloatingPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

function useFloatingPosition<T extends HTMLElement>(
  open: boolean,
  triggerRef: RefObject<T | null>,
  estimatedHeight: number,
  minimumWidth: number,
) {
  const [position, setPosition] = useState<FloatingPosition | null>(null);

  useEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    const update = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(Math.max(rect.width, minimumWidth), viewportWidth - 24);
      const left = Math.min(Math.max(12, rect.left), Math.max(12, viewportWidth - width - 12));
      const availableBelow = viewportHeight - rect.bottom - 12;
      const openBelow = availableBelow >= Math.min(estimatedHeight, 240) || rect.top < estimatedHeight;
      const maxHeight = openBelow
        ? Math.max(160, viewportHeight - rect.bottom - 20)
        : Math.max(160, rect.top - 20);
      const top = openBelow
        ? rect.bottom + 8
        : Math.max(12, rect.top - Math.min(estimatedHeight, maxHeight) - 8);

      setPosition({ top, left, width, maxHeight });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [estimatedHeight, minimumWidth, open, triggerRef]);

  return position;
}

function GameSearchPicker({
  games,
  value,
  onChange,
}: {
  games: Game[];
  value: number | "";
  onChange: (value: number | "") => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selected = games.find((game) => game.id === value);
  const position = useFloatingPosition(open, triggerRef, 370, 340);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return games.filter((game) => !needle || game.title.toLowerCase().includes(needle)).slice(0, 40);
  }, [games, query]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="min-w-0">
      <span className="mb-1.5 block text-xs font-medium text-fg-3">Game</span>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex h-12 w-full cursor-pointer items-center justify-between rounded-2xl border px-3.5 text-left shadow-sm transition hover:border-slate-300 dark:hover:border-slate-600 ${
          open
            ? "border-blue-300 bg-white ring-4 ring-blue-100/70 dark:border-blue-700 dark:bg-slate-900 dark:ring-blue-950/40"
            : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
        }`}
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
            {selected?.cover_url ? (
              <CoverImage src={selected.cover_url} sizes="32px" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-fg-4"><PuzzlePieceIcon className="h-4 w-4" aria-hidden="true" /></span>
            )}
          </span>
          <span className="min-w-0">
            <span
              className={`block truncate text-sm font-semibold ${
                selected ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {selected?.title ?? "Not decided"}
            </span>
            <span className="block truncate text-[11px] font-semibold uppercase tracking-wider text-fg-4">
              Search the game library
            </span>
          </span>
        </span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-fg-4 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && position &&
        createPortal(
          <div
            ref={menuRef}
            onMouseDown={(event) => event.stopPropagation()}
            className="fixed z-[100000] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-950 dark:ring-white/10"
            style={{ ...position, height: Math.min(370, position.maxHeight) }}
          >
            <label className="relative block shrink-0">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-4" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Type a game name..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
                autoFocus
              />
            </label>
            <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setQuery("");
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  value === ""
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <QuestionMarkCircleIcon className="h-4 w-4" />
                  </span>
                  Not decided
                </span>
                {value === "" && <CheckIcon className="h-4 w-4" />}
              </button>
              {filtered.map((game) => {
                const active = game.id === value;
                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => {
                      onChange(game.id);
                      setQuery("");
                      setOpen(false);
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold transition ${
                      active
                        ? "bg-blue-600 text-white"
                        : "text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10">
                        {game.cover_url ? (
                          <CoverImage src={game.cover_url} sizes="36px" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-fg-4"><PuzzlePieceIcon className="h-3.5 w-3.5" aria-hidden="true" /></span>
                        )}
                      </span>
                      <span className="truncate">{game.title}</span>
                    </span>
                    {active && <CheckIcon className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-3 py-5 text-center text-sm font-medium text-fg-4">No games found.</div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json" } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload;
}

/* ================= WORKFLOW ================= */

type Status = AudienceRequest["status"];
const STATUS_ORDER: Status[] = ["inbox", "planned", "in_progress", "published", "replied"];
const STATUS_META: Record<Status, { label: string; hint: string; dot: string; pill: string }> = {
  inbox: { label: "New", hint: "Saved, not decided yet", dot: "bg-fuchsia-500", pill: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-200" },
  planned: { label: "Planned", hint: "Turned into an idea", dot: "bg-sky-500", pill: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200" },
  in_progress: { label: "Making", hint: "In a Short Project", dot: "bg-amber-500", pill: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200" },
  published: { label: "Published", hint: "Video is up, viewer not told yet", dot: "bg-emerald-500", pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200" },
  replied: { label: "Replied", hint: "Viewer has the link", dot: "bg-slate-400", pill: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
};

type Filter = "all" | "promised" | Status;

function timeAgo(value?: string) {
  if (!value) return "";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (!Number.isFinite(days)) return "";
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months} month${months === 1 ? "" : "s"} ago` : `${Math.floor(months / 12)} year${months < 24 ? "" : "s"} ago`;
}

function replyText(item: AudienceRequest) {
  const who = item.commenter_name ? `@${item.commenter_name.replace(/^@/, "")} ` : "";
  return `${who}Thanks for the idea! The video is up now: ${item.published_url ?? ""}`.trim();
}

/* ================= LINK PICKERS ================= */

function LinkPicker({
  title,
  placeholder,
  onClose,
  search,
  onPick,
}: {
  title: string;
  placeholder: string;
  onClose: () => void;
  search: (query: string) => Promise<{ id: number; title: string; meta?: string }[]>;
  onPick: (item: { id: number; title: string }) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<{ id: number; title: string; meta?: string }[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const searchRef = useRef(search);
  useEffect(() => { searchRef.current = search; }, [search]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      searchRef.current(query.trim()).then((result) => { if (active) setRows(result); });
    }, query.trim() ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);

  return (
    <Modal open onClose={onClose} size="md" zClass="z-[99990]" labelledBy="link-picker-title">
      <ModalHeader id="link-picker-title" title={title} onClose={onClose} />
      <ModalBody className="space-y-3">
        <label className="relative block">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-4" />
          <Input className="pl-9" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
        </label>
        <ul className="max-h-[50dvh] space-y-1 overflow-y-auto">
          {rows === null && <li className="px-3 py-6 text-center text-sm text-fg-4">Loading…</li>}
          {rows?.length === 0 && <li className="px-3 py-6 text-center text-sm text-fg-4">Nothing found.</li>}
          {rows?.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                disabled={busy !== null}
                onClick={async () => { setBusy(row.id); await onPick(row); setBusy(null); }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface-sunken disabled:opacity-60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-fg">{row.title}</span>
                  {row.meta && <span className="block truncate text-xs text-fg-4">{row.meta}</span>}
                </span>
                <LinkIcon className="h-4 w-4 shrink-0 text-accent" />
              </button>
            </li>
          ))}
        </ul>
      </ModalBody>
    </Modal>
  );
}

const searchIdeas = async (query: string) => {
  let request = supabase.from("details").select("id,title,game:games(title)").order("created_at", { ascending: false }).limit(20);
  if (query) request = request.ilike("title", `%${query.replace(/[%_,()]/g, "")}%`);
  const { data } = await request;
  return ((data ?? []) as unknown as { id: number; title: string; game: { title: string } | null }[]).map((row) => ({ id: row.id, title: row.title, meta: row.game?.title }));
};

const searchProjects = async (query: string) => {
  let request = supabase.from("scripts").select("id,title,status").order("id", { ascending: false }).limit(30);
  if (query) request = request.ilike("title", `%${query.replace(/[%_,()]/g, "")}%`);
  const { data } = await request;
  return ((data ?? []) as { id: number; title: string; status: string | null }[]).map((row) => ({ id: row.id, title: row.title, meta: row.status || "Draft" }));
};

/* ================= PAGE ================= */

export default function AudienceRequestsPage() {
  const { success, error: notifyError, confirm } = useNotifications();
  const [requests, setRequests] = useState<AudienceRequest[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AudienceRequest | null>(null);
  const [form, setForm] = useState<RequestForm>(EMPTY_FORM);
  const [picker, setPicker] = useState<{ kind: "idea" | "project"; item: AudienceRequest } | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

  const load = async () => {
    try {
      const [requestResult, gamesResult] = await Promise.all([
        api<{ data: AudienceRequest[] }>("/api/audience-requests"),
        supabase.from("games").select("id,title,cover_url").order("title"),
      ]);
      setRequests(requestResult.data);
      setGames((gamesResult.data ?? []) as Game[]);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Could not load audience requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // Load once on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const map = new Map<Filter, number>([["all", requests.length], ["promised", requests.filter((r) => r.promised && r.status !== "replied").length]]);
    for (const status of STATUS_ORDER) map.set(status, requests.filter((r) => r.status === status).length);
    return map;
  }, [requests]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = requests.filter((item) => {
      if (filter === "promised" ? !(item.promised && item.status !== "replied") : filter !== "all" && item.status !== filter) return false;
      if (!needle) return true;
      return [item.comment_text, item.commenter_name, item.game?.title, item.notes, item.linked_idea?.title, item.linked_short_project?.title]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
    return rows.sort((a, b) => {
      const diff = String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
      return sort === "newest" ? -diff : diff;
    });
  }, [query, requests, filter, sort]);

  /** Update one request in place, then on the server. */
  const patch = async (item: AudienceRequest, changes: Partial<AudienceRequest>, done?: string) => {
    const before = requests;
    setRequests((current) => current.map((r) => (r.id === item.id ? { ...r, ...changes } : r)));
    try {
      const body: Record<string, unknown> = { ...changes };
      delete body.linked_idea;
      delete body.linked_short_project;
      await api(`/api/audience-requests/${item.id}`, { method: "PATCH", body: JSON.stringify(body) });
      if (done) success(done, "Request updated");
      return true;
    } catch (err) {
      setRequests(before);
      notifyError(err instanceof Error ? err.message : "Could not update request");
      return false;
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (item: AudienceRequest) => {
    setEditing(item);
    setForm({
      comment_text: item.comment_text,
      commenter_name: item.commenter_name ?? "",
      source_url: item.source_url ?? "",
      game_id: item.game_id ?? "",
      notes: item.notes ?? "",
      status: item.status,
      promised: item.promised,
      published_url: item.published_url ?? "",
    });
    setModalOpen(true);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.comment_text.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await api(`/api/audience-requests/${editing.id}`, { method: "PATCH", body: JSON.stringify(form) });
        success("Audience request updated.", "Saved");
      } else {
        await api("/api/audience-requests", { method: "POST", body: JSON.stringify({ ...form, content_type: "short" }) });
        success("Audience request saved for later.", "Request saved");
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Could not save request");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: AudienceRequest) => {
    const accepted = await confirm({ title: "Delete audience request?", message: "This removes the saved comment from your request list.", confirmText: "Delete" });
    if (!accepted) return;
    try {
      await api(`/api/audience-requests/${item.id}`, { method: "DELETE" });
      setRequests((current) => current.filter((request) => request.id !== item.id));
      success("Audience request deleted.", "Removed");
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Could not delete request");
    }
  };

  const makeIdeaHref = (item: AudienceRequest) => {
    const params = new URLSearchParams({ audienceRequestId: String(item.id), description: item.comment_text });
    if (item.game_id) params.set("gameId", String(item.game_id));
    return `/add?${params.toString()}`;
  };

  const copyReply = async (item: AudienceRequest) => {
    try {
      await navigator.clipboard.writeText(replyText(item));
      success("Reply copied. Paste it under the viewer's comment, then mark it replied.", "Copied");
    } catch {
      notifyError("The browser could not copy the reply.", "Copy failed");
    }
  };

  // Opens the editor at the Published stage so the Short link can be pasted in.
  const markPublished = (item: AudienceRequest) => {
    openEdit(item);
    setForm((current) => ({ ...current, status: "published" }));
  };

  /* ---------- the next step for a request ---------- */
  const nextStep = (item: AudienceRequest) => {
    const primary = "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200";
    const secondary = "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-fg-3 transition hover:bg-surface-sunken hover:text-fg";
    if (item.status === "replied") {
      return <span className="inline-flex h-9 items-center gap-1.5 px-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><CheckCircleIcon className="h-4 w-4" /> Done</span>;
    }
    if (item.status === "published") {
      return (
        <>
          <button type="button" onClick={() => void copyReply(item)} className={primary}><ClipboardDocumentIcon className="h-4 w-4" /> Copy reply</button>
          <button type="button" onClick={() => void patch(item, { status: "replied" }, "Marked replied.")} className={secondary}><CheckIcon className="h-4 w-4" /> Replied</button>
        </>
      );
    }
    if (item.linked_short_project_id) {
      return <button type="button" onClick={() => markPublished(item)} className={primary}><RocketLaunchIcon className="h-4 w-4" /> Mark published</button>;
    }
    if (item.linked_idea_id) {
      return <button type="button" onClick={() => setPicker({ kind: "project", item })} className={primary}><FilmIcon className="h-4 w-4" /> Link project</button>;
    }
    return (
      <>
        <Link href={makeIdeaHref(item)} className={primary}><LightBulbIcon className="h-4 w-4" /> Make idea</Link>
        <button type="button" onClick={() => setPicker({ kind: "idea", item })} className={secondary}><LinkIcon className="h-4 w-4" /> Link idea</button>
      </>
    );
  };

  const filters: { key: Filter; label: string; dot?: string }[] = [
    { key: "all", label: "All" },
    ...STATUS_ORDER.map((status) => ({ key: status as Filter, label: STATUS_META[status].label, dot: STATUS_META[status].dot })),
    { key: "promised", label: "Promised" },
  ];

  return (
    <div className={appPageRootClass}>
      <AppSidebar activePage="audienceRequests" />
      <main className={appPageMainClass}>
        <div className="app-container">
          <AppPageHeader
            title="Audience Requests"
            description="Viewer comments worth a video. Turn them into ideas, make the Short, then tell the viewer it's up."
            icon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
            action={<button type="button" onClick={openCreate} className={appPagePrimaryActionClass}><PlusIcon className="h-4 w-4" /> Save request</button>}
          />

          {/* Pipeline: where each request is */}
          <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-0" aria-label="Requests by stage">
            {STATUS_ORDER.map((status, index) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter((current) => (current === status ? "all" : status))}
                aria-pressed={filter === status}
                title={STATUS_META[status].hint}
                className={`relative min-w-[6.25rem] flex-1 shrink-0 cursor-pointer rounded-2xl border p-2.5 text-left transition sm:min-w-0 sm:p-3.5 ${filter === status ? "border-blue-500 bg-accent-soft ring-1 ring-blue-500" : "border-line bg-surface hover:border-line-strong"}`}
              >
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-fg-3 sm:text-xs">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_META[status].dot}`} />
                  <span className="truncate">{STATUS_META[status].label}</span>
                </span>
                <span className="mt-1 block text-xl font-black tabular-nums text-fg sm:text-2xl">{counts.get(status) ?? 0}</span>
                {index < STATUS_ORDER.length - 1 && <ChevronRightIcon className="absolute -right-2 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-fg-4 sm:block" aria-hidden="true" />}
              </button>
            ))}
          </div>

          <div className="mb-6 flex flex-col gap-2 rounded-[1.5rem] border border-line bg-surface p-2.5 shadow-sm sm:flex-row sm:items-center">
            <label className="relative block min-w-0 flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-4" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search comments, viewers, games or ideas…"
                className="h-11 w-full rounded-xl border border-line bg-surface-muted pl-10 pr-4 text-sm font-medium text-fg outline-none focus:border-blue-400"
              />
            </label>
            <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Filter">
              {filters.filter((f) => f.key === "all" || f.key === "promised").map((f) => (
                <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)} className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition ${filter === f.key ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950" : "text-fg-3 hover:bg-surface-sunken hover:text-fg"}`}>
                  {f.key === "promised" && <StarIcon className="h-4 w-4" />}
                  {f.label} <span className="tabular-nums opacity-70">{counts.get(f.key) ?? 0}</span>
                </button>
              ))}
              <button type="button" onClick={() => setSort((current) => (current === "newest" ? "oldest" : "newest"))} className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-fg-3 transition hover:bg-surface-sunken hover:text-fg" title="Change order">
                <ArrowsUpDownIcon className="h-4 w-4" /> {sort === "newest" ? "Newest" : "Oldest"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-64 animate-pulse rounded-3xl bg-surface-sunken" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-line-strong bg-surface p-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-fuchsia-50 text-fuchsia-500 dark:bg-fuchsia-950/30">
                <ChatBubbleLeftRightIcon className="h-7 w-7" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-fg">{requests.length ? "Nothing in this view" : "No saved requests yet"}</h2>
              <p className="mt-1 text-sm text-fg-3">{requests.length ? "Try another stage or search." : "The next great comment can become your next video."}</p>
            </div>
          ) : (
            <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((item) => {
                const meta = STATUS_META[item.status] ?? STATUS_META.inbox;
                const isExpanded = expanded.has(item.id);
                const longText = item.comment_text.length > 220;
                return (
                  <article key={item.id} className={`flex flex-col overflow-hidden rounded-3xl border bg-surface shadow-sm transition hover:shadow-md ${item.status === "replied" ? "border-line opacity-75" : "border-line"}`}>
                    {/* Game strip */}
                    <div className="relative flex h-16 items-center gap-3 overflow-hidden bg-slate-900 px-4">
                      {item.game?.cover_url ? (
                        <span className="absolute inset-0 opacity-50"><CoverImage src={item.game.cover_url} sizes="(min-width: 1024px) 420px, 100vw" className="scale-110 blur-[2px]" /></span>
                      ) : (
                        <span className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 via-violet-700 to-slate-900 opacity-80" />
                      )}
                      <span className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/55 to-slate-950/10" />
                      <span className="relative min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-semibold uppercase tracking-wider text-white/60">Game</span>
                        <span className="block truncate text-sm font-bold text-white">{item.game?.title ?? "Not decided"}</span>
                      </span>
                      <span className={`relative inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2 text-[11px] font-semibold ${meta.pill}`} title={meta.hint}>
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {meta.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => void patch(item, { promised: !item.promised }, item.promised ? "No longer marked as promised." : "Marked as promised to the viewer.")}
                        aria-pressed={item.promised}
                        className={`relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border backdrop-blur-md transition ${item.promised ? "border-amber-300/50 bg-amber-400 text-white" : "border-white/20 bg-black/30 text-white/80 hover:bg-white/20"}`}
                        title={item.promised ? "You promised this viewer a video" : "Mark as promised to the viewer"}
                        aria-label={item.promised ? "Promised (click to undo)" : "Mark as promised"}
                      >
                        {item.promised ? <StarSolidIcon className="h-4 w-4" /> : <StarIcon className="h-4 w-4" />}
                      </button>
                    </div>

                    <div className="flex-1 p-4 sm:p-5">
                      <blockquote className={`whitespace-pre-wrap break-words text-[15px] font-semibold leading-6 text-fg ${isExpanded ? "" : "line-clamp-5"}`}>“{item.comment_text}”</blockquote>
                      {longText && (
                        <button type="button" onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })} className="mt-1 cursor-pointer text-xs font-semibold text-accent hover:underline">
                          {isExpanded ? "Show less" : "Read all"}
                        </button>
                      )}
                      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-3">
                        {item.commenter_name && <span className="font-semibold text-fg-2">@{item.commenter_name.replace(/^@/, "")}</span>}
                        {item.created_at && <span>{timeAgo(item.created_at)}</span>}
                        {item.source_url && (
                          <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
                            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" /> Comment
                          </a>
                        )}
                      </p>
                      {item.notes && <p className="mt-2 rounded-xl bg-surface-muted px-3 py-2 text-xs leading-5 text-fg-3">{item.notes}</p>}

                      {(item.linked_idea || item.linked_short_project || item.published_url) && (
                        <ul className="mt-3 space-y-1.5">
                          {item.linked_idea && (
                            <li className="flex items-center gap-2 text-xs">
                              <LightBulbIcon className="h-4 w-4 shrink-0 text-sky-500" />
                              <Link href={`/idea/${item.linked_idea.id}`} className="min-w-0 flex-1 truncate font-semibold text-fg-2 hover:text-accent hover:underline">{item.linked_idea.title}</Link>
                              <button type="button" onClick={() => void patch(item, { linked_idea_id: null, linked_idea: null })} className="shrink-0 cursor-pointer rounded p-0.5 text-fg-4 hover:text-rose-500" aria-label="Unlink idea" title="Unlink idea"><XMarkIcon className="h-3.5 w-3.5" /></button>
                            </li>
                          )}
                          {item.linked_short_project && (
                            <li className="flex items-center gap-2 text-xs">
                              <FilmIcon className="h-4 w-4 shrink-0 text-amber-500" />
                              <Link href={`/scripts?open=${item.linked_short_project.id}`} className="min-w-0 flex-1 truncate font-semibold text-fg-2 hover:text-accent hover:underline">{item.linked_short_project.title}</Link>
                              <span className="shrink-0 text-[11px] text-fg-4">{item.linked_short_project.status || "Draft"}</span>
                              <button type="button" onClick={() => void patch(item, { linked_short_project_id: null, linked_short_project: null })} className="shrink-0 cursor-pointer rounded p-0.5 text-fg-4 hover:text-rose-500" aria-label="Unlink project" title="Unlink project"><XMarkIcon className="h-3.5 w-3.5" /></button>
                            </li>
                          )}
                          {item.published_url && (
                            <li className="flex items-center gap-2 text-xs">
                              <PlayCircleIcon className="h-4 w-4 shrink-0 text-emerald-500" />
                              <a href={item.published_url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-semibold text-fg-2 hover:text-accent hover:underline">{item.published_url.replace(/^https?:\/\/(www\.)?/, "")}</a>
                            </li>
                          )}
                        </ul>
                      )}
                      {item.linked_short_project?.status === "Published" && item.status !== "published" && item.status !== "replied" && (
                        <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">Its project is published. Mark this published and reply to the viewer.</p>
                      )}
                    </div>

                    <footer className="flex flex-wrap items-center gap-1.5 border-t border-line-soft px-3 py-2.5">
                      {nextStep(item)}
                      <span className="ml-auto flex items-center gap-0.5">
                        <select
                          value={item.status}
                          onChange={(e) => void patch(item, { status: e.target.value as Status })}
                          aria-label="Stage"
                          className="h-9 cursor-pointer rounded-xl border border-transparent bg-transparent px-2 text-xs font-semibold text-fg-3 outline-none hover:border-line focus:border-blue-500"
                        >
                          {STATUS_ORDER.map((status) => <option key={status} value={status}>{STATUS_META[status].label}</option>)}
                        </select>
                        <button type="button" onClick={() => openEdit(item)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-fg-4 transition hover:bg-surface-sunken hover:text-fg" title="Edit request" aria-label="Edit request"><PencilSquareIcon className="h-4 w-4" /></button>
                        <button type="button" onClick={() => void remove(item)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-fg-4 transition hover:bg-danger-soft hover:text-rose-500" title="Delete request" aria-label="Delete request"><TrashIcon className="h-4 w-4" /></button>
                      </span>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {picker && (
        <LinkPicker
          title={picker.kind === "idea" ? "Link an idea" : "Link a Short Project"}
          placeholder={picker.kind === "idea" ? "Search idea title…" : "Search project title…"}
          search={picker.kind === "idea" ? searchIdeas : searchProjects}
          onClose={() => setPicker(null)}
          onPick={async (row) => {
            const item = picker.item;
            const ok = picker.kind === "idea"
              ? await patch(item, { linked_idea_id: row.id, linked_idea: { id: row.id, title: row.title }, status: item.status === "inbox" ? "planned" : item.status }, "Idea linked.")
              : await patch(item, { linked_short_project_id: row.id, linked_short_project: { id: row.id, title: row.title, status: (row as { meta?: string }).meta ?? null }, status: ["inbox", "planned"].includes(item.status) ? "in_progress" : item.status }, "Project linked.");
            if (ok) setPicker(null);
          }}
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="lg" zClass="z-[99990]" onSubmit={save} labelledBy="audience-request-title">
        <ModalHeader
          id="audience-request-title"
          eyebrow="Audience request"
          eyebrowClassName="text-fuchsia-500"
          title={editing ? "Edit request" : "Save a comment"}
          onClose={() => setModalOpen(false)}
        />

        <ModalBody className="grid max-h-[70dvh] gap-4 sm:grid-cols-2">
          <Field label="Comment *" className="sm:col-span-2">
            <Textarea value={form.comment_text} onChange={(event) => setForm({ ...form, comment_text: event.target.value })} rows={4} className="resize-y" placeholder="Paste the viewer comment here..." autoFocus={!editing} />
          </Field>

          <Field label="Viewer name / handle">
            <Input value={form.commenter_name} onChange={(event) => setForm({ ...form, commenter_name: event.target.value })} placeholder="@viewer" />
          </Field>

          <GameSearchPicker games={games} value={form.game_id} onChange={(game_id) => setForm({ ...form, game_id })} />

          <Field label="Link to the comment" className="sm:col-span-2">
            <Input value={form.source_url} onChange={(event) => setForm({ ...form, source_url: event.target.value })} placeholder="https://youtube.com/..." />
          </Field>

          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-fg-3">Stage</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Stage">
              {STATUS_ORDER.map((status) => (
                <button key={status} type="button" role="radio" aria-checked={form.status === status} onClick={() => setForm({ ...form, status })} className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition ${form.status === status ? "border-blue-500 bg-accent-soft text-fg ring-1 ring-blue-500" : "border-line text-fg-3 hover:border-line-strong hover:text-fg"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[status].dot}`} /> {STATUS_META[status].label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line p-3 sm:col-span-2">
            <input type="checkbox" checked={form.promised} onChange={(e) => setForm({ ...form, promised: e.target.checked })} className="h-4 w-4 accent-amber-500" />
            <span>
              <span className="block text-sm font-semibold text-fg">I promised this viewer a video</span>
              <span className="block text-xs text-fg-3">Shows under Promised until you reply with the link.</span>
            </span>
          </label>

          {(form.status === "published" || form.status === "replied" || form.published_url) && (
            <Field label="Published Short link" className="sm:col-span-2">
              <Input value={form.published_url} onChange={(event) => setForm({ ...form, published_url: event.target.value })} placeholder="https://youtube.com/shorts/..." />
            </Field>
          )}

          <Field label="Your notes" className="sm:col-span-2">
            <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} className="resize-y" />
          </Field>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button type="submit" variant="primary" size="sm" disabled={saving || !form.comment_text.trim()}>
            {saving ? "Saving..." : "Save request"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
