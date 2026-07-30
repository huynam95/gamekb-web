"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  CheckIcon,
  ChevronDownIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  ChatBubbleLeftRightIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AppSidebar } from "@/components/AppSidebar";
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
};

const EMPTY_FORM: RequestForm = {
  comment_text: "",
  commenter_name: "",
  source_url: "",
  game_id: "",
  notes: "",
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
      <span className="mb-1.5 block text-xs font-black text-slate-500">Game</span>
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
              <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${selected.cover_url})` }} />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm">🎮</span>
            )}
          </span>
          <span className="min-w-0">
            <span
              className={`block truncate text-sm font-black ${
                selected ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {selected?.title ?? "Not decided"}
            </span>
            <span className="block truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Search the game library
            </span>
          </span>
        </span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
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
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
                className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-black transition ${
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
                          <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${game.cover_url})` }} />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xs">🎮</span>
                        )}
                      </span>
                      <span className="truncate">{game.title}</span>
                    </span>
                    {active && <CheckIcon className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-3 py-5 text-center text-sm font-semibold text-slate-400">No games found.</div>
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

export default function AudienceRequestsPage() {
  const { success, error: notifyError, confirm } = useNotifications();
  const [requests, setRequests] = useState<AudienceRequest[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AudienceRequest | null>(null);
  const [form, setForm] = useState<RequestForm>(EMPTY_FORM);

  const load = async () => {
    setLoading(true);
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
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return requests;
    return requests.filter((item) =>
      [item.comment_text, item.commenter_name, item.game?.title, item.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [query, requests]);

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
    });
    setModalOpen(true);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.comment_text.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await api(`/api/audience-requests/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
        success("Audience request updated.", "Saved");
      } else {
        await api("/api/audience-requests", {
          method: "POST",
          body: JSON.stringify({ ...form, content_type: "undecided" }),
        });
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
    const accepted = await confirm({
      title: "Delete audience request?",
      message: "This removes the saved comment from your request list.",
      confirmText: "Delete",
    });
    if (!accepted) return;
    try {
      await api(`/api/audience-requests/${item.id}`, { method: "DELETE" });
      setRequests((current) => current.filter((request) => request.id !== item.id));
      success("Audience request deleted.", "Removed");
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Could not delete request");
    }
  };

  return (
    <div className={appPageRootClass}>
      <AppSidebar activePage="audienceRequests" />
      <main className={appPageMainClass}>
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AppPageHeader
            title="Audience Requests"
            description="Save useful comments and viewer requests so promising ideas do not disappear in the feed."
            icon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
            action={<button type="button" onClick={openCreate} className={appPagePrimaryActionClass}><PlusIcon className="h-4 w-4" /> Save request</button>}
          />

          <div className="mb-6 rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <label className="relative block min-w-0">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search comments, viewers, or games..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
          </div>

          {loading ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-12 text-center text-sm font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              Loading requests...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-14 text-center dark:border-slate-700 dark:bg-slate-900">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-fuchsia-50 text-2xl dark:bg-fuchsia-950/30">
                💬
              </div>
              <h2 className="mt-4 text-lg font-black">No saved requests here yet</h2>
              <p className="mt-1 text-sm text-slate-500">The next great comment can become your next video.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filtered.map((item) => {
                const gameTitle = item.game?.title ?? "Game not decided";
                return (
                  <article
                    key={item.id}
                    className="group relative min-h-[280px] overflow-hidden rounded-[1.6rem] border border-slate-800 bg-slate-900 shadow-sm transition-shadow duration-150 hover:shadow-xl"
                  >
                    {item.game?.cover_url ? (
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-60 transition-opacity duration-150 group-hover:opacity-48"
                        style={{ backgroundImage: `url(${item.game.cover_url})` }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600 via-violet-700 to-slate-950 opacity-80" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/15" />

                    <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4">
                      {item.source_url ? (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3 text-[11px] font-black text-white/85 backdrop-blur-md transition hover:bg-white/15 hover:text-white"
                        >
                          <LinkIcon className="h-3.5 w-3.5" /> Source
                        </a>
                      ) : (
                        <span />
                      )}
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/30 text-white/75 backdrop-blur-md transition hover:bg-white/20 hover:text-white"
                          title="Edit request"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(item)}
                          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/30 text-white/75 backdrop-blur-md transition hover:bg-rose-500 hover:text-white"
                          title="Delete request"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="absolute inset-0 z-10 flex flex-col justify-end p-5 sm:p-6">
                      <p className="mb-2 truncate text-[10px] font-black uppercase tracking-[0.16em] text-white/55">
                        {gameTitle}
                      </p>
                      <blockquote className="line-clamp-5 text-base font-bold leading-6 text-white sm:text-[17px]">
                        “{item.comment_text}”
                      </blockquote>
                      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-white/55">
                        {item.commenter_name && <span className="truncate">@ {item.commenter_name}</span>}
                        {item.notes && <span className="line-clamp-1 min-w-0 flex-1">{item.notes}</span>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[99990] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-sm"
          onMouseDown={() => setModalOpen(false)}
        >
          <form
            onSubmit={save}
            onMouseDown={(event) => event.stopPropagation()}
            className="my-auto w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-500">Audience request</p>
                <h2 className="mt-1 text-xl font-black">{editing ? "Edit request" : "Save a comment"}</h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid max-h-[70vh] gap-4 overflow-y-auto p-6 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-black text-slate-500">Comment *</span>
                <textarea
                  value={form.comment_text}
                  onChange={(event) => setForm({ ...form, comment_text: event.target.value })}
                  rows={4}
                  className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold outline-none focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-950"
                  placeholder="Paste the viewer comment here..."
                />
              </label>

              <label>
                <span className="mb-1.5 block text-xs font-black text-slate-500">Viewer name / handle</span>
                <input
                  value={form.commenter_name}
                  onChange={(event) => setForm({ ...form, commenter_name: event.target.value })}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold outline-none focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <GameSearchPicker
                games={games}
                value={form.game_id}
                onChange={(game_id) => setForm({ ...form, game_id })}
              />

              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-black text-slate-500">Comment or video URL</span>
                <input
                  value={form.source_url}
                  onChange={(event) => setForm({ ...form, source_url: event.target.value })}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold outline-none focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-950"
                  placeholder="https://youtube.com/..."
                />
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-black text-slate-500">Your notes</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  rows={3}
                  className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold outline-none focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-10 cursor-pointer rounded-xl px-4 text-sm font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !form.comment_text.trim()}
                className="h-10 cursor-pointer rounded-xl bg-slate-900 px-5 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
              >
                {saving ? "Saving..." : "Save request"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
