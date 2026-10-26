"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  CloudArrowDownIcon,
  DocumentTextIcon,
  EllipsisHorizontalIcon,
  FilmIcon,
  FolderIcon,
  GlobeAltIcon,
  LinkIcon,
  PencilSquareIcon,
  PlayIcon,
  PlusIcon,
  PuzzlePieceIcon,
  StarIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { supabase } from "@/lib/supabaseClient";
import { fetchYoutubeMetadata } from "@/lib/youtube";
import { getYoutubeVideoId } from "@/lib/mediaLinks";
import { readIdeaPreview } from "@/lib/ideaPreviewCache";
import { useNotifications } from "@/components/NotificationCenter";
import { AppSidebar } from "@/components/AppSidebar";
import { appPageMainClass, appPageRootClass } from "@/components/AppPage";
import { AddToScriptModal } from "@/components/AddToScriptModal";
import { CoverBackdrop } from "@/components/CoverBackdrop";
import { CoverImage } from "@/components/CoverImage";
import { TypePill } from "@/components/TypePill";
import { TypeChips } from "@/components/TypeChips";
import { Button, buttonClass } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { useDismiss } from "@/components/ui/useDismiss";

/* ================= TYPES ================= */

type Detail = {
  id: number;
  title: string;
  description: string | null;
  detail_type: string;
  status?: string | null;
  game_id: number;
  created_at: string | null;
  pinned: boolean;
  pinned_at?: string | null;
};

type Game = {
  id: number;
  title: string;
  release_year: number | null;
  cover_url?: string | null;
  genres_text?: string | null;
};

type FootageRow = {
  id: number;
  detail_id: number;
  file_path: string | null;
  title: string | null;
  channel_name: string | null;
  downloaded: boolean;
  created_at: string | null;
};

type SourceRow = { id: number; detail_id: number; url: string; note: string | null; created_at: string | null };
type Group = { id: number; name: string; description: string | null };
type ProjectUse = { id: number; title: string; status: string | null };

const STATUS_DOT: Record<string, string> = {
  Draft: "bg-slate-400",
  Filming: "bg-amber-500",
  Edited: "bg-indigo-500",
  Published: "bg-emerald-500",
};

/* ================= HELPERS ================= */

const cardClass = "rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6";

function isUrl(text: string | null | undefined): text is string {
  return Boolean(text && /^https?:\/\//i.test(text));
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function CardTitle({ icon, title, count, action }: { icon: ReactNode; title: string; count?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-fg">
        <span className="text-fg-4">{icon}</span>
        {title}
        {count !== undefined && <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-semibold tabular-nums text-fg-3">{count}</span>}
      </h2>
      {action}
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-sunken ${className}`} />;
}

/* ================= COLLECTION PICKER ================= */

function CollectionAdd({ groups, onAdd, onCreate }: { groups: Group[]; onAdd: (id: number) => void; onCreate: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement | null>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(boxRef, open, close);
  const query = q.trim().toLowerCase();
  const filtered = useMemo(() => groups.filter((g) => g.name.toLowerCase().includes(query)).slice(0, 50), [groups, query]);
  const exact = groups.some((g) => g.name.trim().toLowerCase() === query);
  const finish = () => { setOpen(false); setQ(""); };

  return (
    <div ref={boxRef} className={`relative ${open ? "z-30" : ""}`}>
      <Button variant="ghost" size="sm" className="text-accent" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <PlusIcon className="h-4 w-4" /> Add
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl border border-line bg-surface p-2 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150">
          <Input
            className="h-10"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              if (filtered[0]) { onAdd(filtered[0].id); finish(); }
              else if (q.trim()) { onCreate(q.trim()); finish(); }
            }}
            placeholder="Find or create..."
            aria-label="Find or create a collection"
            autoFocus
          />
          <ul className="mt-1.5 max-h-56 overflow-auto">
            {filtered.map((g) => (
              <li key={g.id}>
                <button type="button" className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-fg-2 hover:bg-surface-sunken hover:text-fg" onClick={() => { onAdd(g.id); finish(); }}>
                  <FolderIcon className="h-4 w-4 shrink-0 text-fg-4" /> <span className="truncate">{g.name}</span>
                </button>
              </li>
            ))}
            {query && !exact && (
              <li>
                <button type="button" className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-accent hover:bg-accent-soft" onClick={() => { onCreate(q.trim()); finish(); }}>
                  <PlusIcon className="h-4 w-4" /> Create “{q.trim()}”
                </button>
              </li>
            )}
            {!query && filtered.length === 0 && <li className="px-3 py-3 text-center text-xs text-fg-4">Type a name to create a collection.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ================= OVERFLOW MENU ================= */

function MoreMenu({ onDelete, onEditGame }: { onDelete: () => void; onEditGame?: () => void }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(boxRef, open, close);
  const item = "flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition";
  return (
    <div ref={boxRef} className={`relative ${open ? "z-40" : ""}`}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu" aria-label="More actions" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20">
        <EllipsisHorizontalIcon className="h-5 w-5" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-52 rounded-2xl border border-line bg-surface p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150">
          {onEditGame && (
            <button type="button" role="menuitem" className={`${item} text-fg-2 hover:bg-surface-sunken hover:text-fg`} onClick={() => { setOpen(false); onEditGame(); }}>
              <PuzzlePieceIcon className="h-4 w-4" /> Edit game info
            </button>
          )}
          <button type="button" role="menuitem" className={`${item} text-rose-600 hover:bg-danger-soft dark:text-rose-300`} onClick={() => { setOpen(false); onDelete(); }}>
            <TrashIcon className="h-4 w-4" /> Delete idea
          </button>
        </div>
      )}
    </div>
  );
}

/* ================= EDIT DIALOG ================= */

function EditIdeaModal({ detail, onClose, onSave }: { detail: Detail; onClose: () => void; onSave: (patch: Pick<Detail, "title" | "description" | "detail_type">) => Promise<boolean> }) {
  const [title, setTitle] = useState(detail.title);
  const [description, setDescription] = useState(detail.description ?? "");
  const [type, setType] = useState(detail.detail_type);
  const [saving, setSaving] = useState(false);
  const canSave = Boolean(title.trim()) && !saving;

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSave) return;
    setSaving(true);
    const ok = await onSave({ title: title.trim(), description: description.trim(), detail_type: type });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal open onClose={() => !saving && onClose()} size="lg" onSubmit={submit} labelledBy="edit-idea-title">
      <ModalHeader id="edit-idea-title" title="Edit idea" onClose={onClose} />
      <ModalBody className="space-y-5" >
        <div onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void submit(); } }} className="space-y-5">
          <Field label="Title">
            <Input className="h-12 text-base font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </Field>
          <div>
            <p className="mb-1.5 text-xs font-medium text-fg-3">Type</p>
            <TypeChips value={type} onChange={setType} />
          </div>
          <Field label="Description">
            <Textarea className="min-h-[200px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="How do you trigger it, what happens, and why is it interesting?" />
          </Field>
        </div>
      </ModalBody>
      <ModalFooter className="items-center">
        <span className="mr-auto hidden text-xs text-fg-4 sm:block">Ctrl + Enter to save</span>
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={!canSave}>{saving ? "Saving..." : "Save changes"}</Button>
      </ModalFooter>
    </Modal>
  );
}

/* ================= MAIN PAGE ================= */

export default function IdeaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error: notifyError, confirm } = useNotifications();
  const id = Number(params?.id);

  // What the library card already knew, shown at once while the rest loads.
  const [preview] = useState(() => (Number.isFinite(id) ? readIdeaPreview(id) : null));

  const [detail, setDetail] = useState<Detail | null>(preview ? { ...preview, created_at: preview.created_at ?? null, pinned: Boolean(preview.pinned) } : null);
  const [game, setGame] = useState<Game | null>(preview?.game ? { ...preview.game, release_year: preview.game.release_year ?? null } : null);
  const [footage, setFootage] = useState<FootageRow[] | null>(null);
  const [sources, setSources] = useState<SourceRow[] | null>(null);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [ideaGroups, setIdeaGroups] = useState<Group[] | null>(null);
  const [projects, setProjects] = useState<ProjectUse[] | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [showScriptModal, setShowScriptModal] = useState(false);
  const [editing, setEditing] = useState(false);

  const [fp, setFp] = useState("");
  const [addingFootage, setAddingFootage] = useState(false);
  const [failedThumbs, setFailedThumbs] = useState<Set<number>>(() => new Set());
  const [srcUrl, setSrcUrl] = useState("");
  const [addingSource, setAddingSource] = useState(false);

  const notifyErrorRef = useRef(notifyError);
  useEffect(() => { notifyErrorRef.current = notifyError; }, [notifyError]);

  // Everything loads in parallel; sections fill in as their data arrives.
  useEffect(() => {
    if (!Number.isFinite(id)) return;
    let active = true;

    (async () => {
      const { data: d, error } = await supabase.from("details").select("*").eq("id", id).single();
      if (!active) return;
      if (error || !d) {
        setNotFound(true);
        return;
      }
      setDetail(d as Detail);
      const { data: g } = await supabase.from("games").select("*").eq("id", (d as Detail).game_id).single();
      if (active && g) setGame(g as Game);
    })();

    supabase.from("footage").select("*").eq("detail_id", id).order("created_at", { ascending: false })
      .then(({ data }) => { if (active) setFootage((data ?? []) as FootageRow[]); });
    supabase.from("sources").select("*").eq("detail_id", id).order("created_at", { ascending: false })
      .then(({ data }) => { if (active) setSources((data ?? []) as SourceRow[]); });

    Promise.all([
      supabase.from("idea_groups").select("*").order("name"),
      supabase.from("idea_group_items").select("group_id").eq("detail_id", id),
    ]).then(([groupsResult, linksResult]) => {
      if (!active) return;
      const groups = (groupsResult.data ?? []) as Group[];
      const linked = new Set(((linksResult.data ?? []) as { group_id: number }[]).map((link) => link.group_id));
      setAllGroups(groups);
      setIdeaGroups(groups.filter((group) => linked.has(group.id)));
    });

    supabase.from("scripts").select("id,title,status,assets").order("id", { ascending: false })
      .then(({ data }) => {
        if (!active) return;
        const rows = (data ?? []) as (ProjectUse & { assets: { idea_id?: number | null }[] | null })[];
        setProjects(rows.filter((row) => (row.assets || []).some((asset) => asset.idea_id === id)).map(({ id: pid, title, status }) => ({ id: pid, title, status })));
      });

    return () => { active = false; };
  }, [id]);

  useEffect(() => { if (detail) document.title = `${detail.title} | NinjaPlay`; }, [detail]);

  const goBack = () => {
    // Coming from the library: go back so its filters and scroll position are kept.
    if (preview && window.history.length > 1) router.back();
    else router.push("/");
  };

  /* ---------- Actions (all update the page in place) ---------- */

  async function togglePin() {
    if (!detail) return;
    const pinned = !detail.pinned;
    const pinned_at = pinned ? new Date().toISOString() : null;
    setDetail({ ...detail, pinned, pinned_at });
    const { error } = await supabase.from("details").update({ pinned, pinned_at }).eq("id", detail.id);
    if (error) {
      setDetail((current) => (current ? { ...current, pinned: !pinned } : current));
      notifyError(error.message, "Could not update pin");
    }
  }

  async function saveCore(patch: Pick<Detail, "title" | "description" | "detail_type">) {
    if (!detail) return false;
    const { error } = await supabase.from("details").update(patch).eq("id", detail.id);
    if (error) {
      notifyError(error.message, "Could not save idea");
      return false;
    }
    setDetail({ ...detail, ...patch });
    success("Idea updated.", "Saved");
    return true;
  }

  async function deleteIdea() {
    if (!detail) return;
    const ok = await confirm({ kind: "warning", title: "Delete idea?", message: "This removes the idea, its footage and sources.", confirmText: "Delete" });
    if (!ok) return;
    const { error } = await supabase.from("details").delete().eq("id", detail.id);
    if (error) {
      notifyError(error.message, "Could not delete idea");
      return;
    }
    success("Idea deleted.", "Deleted");
    router.push("/");
  }

  async function copyDescription() {
    const text = [detail?.title, detail?.description].filter(Boolean).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      success("Title and description copied.", "Copied");
    } catch {
      notifyError("The browser could not copy the text.", "Copy failed");
    }
  }

  async function addFootage() {
    const link = fp.trim();
    if (!detail || !link || addingFootage) return;
    setAddingFootage(true);
    const metadata = await fetchYoutubeMetadata(link);
    const { data, error } = await supabase
      .from("footage")
      .insert({ detail_id: detail.id, file_path: link, title: metadata.title || null, channel_name: metadata.channelName || null, downloaded: !link.startsWith("http") })
      .select("*")
      .single();
    setAddingFootage(false);
    if (error || !data) {
      notifyError(error?.message || "Could not add footage", "Could not add footage");
      return;
    }
    setFootage((current) => [data as FootageRow, ...(current ?? [])]);
    setFp("");
  }

  async function toggleDownloaded(row: FootageRow) {
    const downloaded = !row.downloaded;
    setFootage((current) => (current ?? []).map((f) => (f.id === row.id ? { ...f, downloaded } : f)));
    const { error } = await supabase.from("footage").update({ downloaded }).eq("id", row.id);
    if (error) {
      setFootage((current) => (current ?? []).map((f) => (f.id === row.id ? { ...f, downloaded: row.downloaded } : f)));
      notifyError(error.message, "Could not update clip");
    }
  }

  async function deleteFootage(row: FootageRow) {
    const ok = await confirm({ kind: "warning", title: "Remove clip?", message: row.title || row.file_path || "Remove this clip?", confirmText: "Remove" });
    if (!ok) return;
    const { error } = await supabase.from("footage").delete().eq("id", row.id);
    if (error) {
      notifyError(error.message, "Could not remove clip");
      return;
    }
    setFootage((current) => (current ?? []).filter((f) => f.id !== row.id));
  }

  async function addSource() {
    const url = srcUrl.trim();
    if (!detail || !url || addingSource) return;
    setAddingSource(true);
    const { data, error } = await supabase.from("sources").insert({ detail_id: detail.id, url, reliability: 3 }).select("*").single();
    setAddingSource(false);
    if (error || !data) {
      notifyError(error?.message || "Could not add source", "Could not add source");
      return;
    }
    setSources((current) => [data as SourceRow, ...(current ?? [])]);
    setSrcUrl("");
  }

  async function deleteSource(row: SourceRow) {
    const ok = await confirm({ kind: "warning", title: "Remove source?", message: row.url, confirmText: "Remove" });
    if (!ok) return;
    const { error } = await supabase.from("sources").delete().eq("id", row.id);
    if (error) {
      notifyError(error.message, "Could not remove source");
      return;
    }
    setSources((current) => (current ?? []).filter((s) => s.id !== row.id));
  }

  async function addToGroup(gid: number) {
    if (!detail || ideaGroups?.some((group) => group.id === gid)) return;
    const group = allGroups.find((item) => item.id === gid);
    if (group) setIdeaGroups((current) => [...(current ?? []), group].sort((a, b) => a.name.localeCompare(b.name)));
    const { error } = await supabase.from("idea_group_items").insert({ group_id: gid, detail_id: detail.id, position: 0 });
    if (error) {
      setIdeaGroups((current) => (current ?? []).filter((g) => g.id !== gid));
      notifyError(error.message, "Could not add to collection");
    }
  }

  async function removeFromGroup(gid: number) {
    if (!detail) return;
    const previous = ideaGroups;
    setIdeaGroups((current) => (current ?? []).filter((group) => group.id !== gid));
    const { error } = await supabase.from("idea_group_items").delete().eq("group_id", gid).eq("detail_id", detail.id);
    if (error) {
      setIdeaGroups(previous);
      notifyError(error.message, "Could not remove from collection");
    }
  }

  async function createGroup(name: string) {
    if (!detail || !name.trim()) return;
    const { data, error } = await supabase.from("idea_groups").insert({ name: name.trim() }).select().single();
    if (error || !data) {
      notifyError(error?.message || "Could not create collection", "Could not create collection");
      return;
    }
    const group = data as Group;
    setAllGroups((current) => [...current, group].sort((a, b) => a.name.localeCompare(b.name)));
    await addToGroup(group.id);
    setIdeaGroups((current) => (current?.some((g) => g.id === group.id) ? current : [...(current ?? []), group].sort((a, b) => a.name.localeCompare(b.name))));
  }

  /* ---------- Render ---------- */

  if (notFound || !Number.isFinite(id)) {
    return (
      <div className={`${appPageRootClass} xl:flex`}>
        <AppSidebar activePage="ideas" />
        <main className={appPageMainClass}>
          <div className="app-container max-w-6xl">
            <div className={`${cardClass} mt-6 text-center`}>
              <p className="text-lg font-bold text-fg">Idea not found</p>
              <p className="mt-1 text-sm text-fg-3">It may have been deleted.</p>
              <Link href="/" className={`${buttonClass({ variant: "secondary" })} mt-4`}>Back to All Ideas</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const downloadedCount = (footage ?? []).filter((f) => f.downloaded).length;
  const descriptionLength = detail?.description?.trim().length ?? 0;

  return (
    <div className={`${appPageRootClass} xl:flex`}>
      <AppSidebar activePage="ideas" />

      {showScriptModal && detail && (
        <AddToScriptModal isOpen onClose={() => setShowScriptModal(false)} detail={detail} game={game} footage={footage ?? []} />
      )}
      {editing && detail && <EditIdeaModal detail={detail} onClose={() => setEditing(false)} onSave={saveCore} />}

      <main className={appPageMainClass}>
        <div className="app-container max-w-6xl">
          {/* ---------- HERO ---------- */}
          <section className="relative mb-5 overflow-hidden rounded-[1.75rem] border border-line bg-slate-900 shadow-sm sm:mb-6">
            <CoverBackdrop src={game?.cover_url} alt="" sizes="(min-width: 1024px) 1100px, 100vw" imageClassName="scale-110 opacity-45 blur-2xl" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/40" />

            <div className="relative z-10 p-4 sm:p-6 lg:p-8">
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={goBack} className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20">
                  <ArrowLeftIcon className="h-4 w-4" /> <span>All Ideas</span>
                </button>
                {detail && (
                  <MoreMenu onDelete={() => void deleteIdea()} onEditGame={game ? () => router.push(`/games/${game.id}/edit`) : undefined} />
                )}
              </div>

              <div className="mt-5 flex items-end gap-4 sm:mt-8 sm:gap-6">
                <div className="relative aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-slate-800 shadow-2xl shadow-black/50 sm:w-36 lg:w-44">
                  {game?.cover_url ? (
                    <CoverImage src={game.cover_url} alt={`${game.title} cover`} sizes="(min-width: 1024px) 176px, (min-width: 640px) 144px, 96px" priority />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-white/30"><PuzzlePieceIcon className="h-10 w-10" /></span>
                  )}
                </div>

                <div className="min-w-0 flex-1 pb-1">
                  {detail ? (
                    <>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs font-semibold uppercase tracking-wider text-white/70 sm:text-sm">
                        <span className="truncate">{game?.title ?? " "}</span>
                        {game?.release_year && <><span className="text-white/35">•</span><span>{game.release_year}</span></>}
                      </p>
                      <h1 className="mt-1.5 line-clamp-4 break-words text-xl font-black leading-tight text-white drop-shadow sm:text-3xl lg:text-4xl">{detail.title}</h1>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <TypePill typeKey={detail.detail_type} />
                        {detail.pinned && <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-300"><StarSolidIcon className="h-3 w-3" /> Pinned</span>}
                        {detail.created_at && <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/55"><CalendarDaysIcon className="h-3.5 w-3.5" /> {formatDate(detail.created_at)}</span>}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="h-3 w-32 animate-pulse rounded bg-white/15" />
                      <div className="h-8 w-3/4 animate-pulse rounded-lg bg-white/15" />
                      <div className="h-5 w-24 animate-pulse rounded bg-white/15" />
                    </div>
                  )}
                </div>
              </div>

              {/* Main actions */}
              <div className="mt-5 flex flex-wrap items-center gap-2 sm:mt-6">
                <Button variant="accent" onClick={() => setShowScriptModal(true)} disabled={!detail} className="max-sm:flex-1">
                  <FilmIcon className="h-4 w-4" /> Add to Script
                </Button>
                <button
                  type="button"
                  onClick={() => void togglePin()}
                  disabled={!detail}
                  aria-pressed={Boolean(detail?.pinned)}
                  className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-semibold backdrop-blur-md transition disabled:opacity-50 ${detail?.pinned ? "border-amber-300/40 bg-amber-400/20 text-amber-200 hover:bg-amber-400/30" : "border-white/15 bg-white/10 text-white hover:bg-white/20"}`}
                >
                  {detail?.pinned ? <StarSolidIcon className="h-4 w-4 text-amber-300" /> : <StarIcon className="h-4 w-4" />}
                  {detail?.pinned ? "Pinned" : "Pin"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  disabled={!detail}
                  className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20 disabled:opacity-50"
                >
                  <PencilSquareIcon className="h-4 w-4" /> Edit
                </button>
              </div>
            </div>
          </section>

          {/* ---------- BODY ---------- */}
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
            <div className="min-w-0 space-y-5 lg:space-y-6">
              {/* Description */}
              <section className={cardClass}>
                <CardTitle
                  icon={<DocumentTextIcon className="h-4 w-4" />}
                  title="Description"
                  action={detail && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => void copyDescription()} aria-label="Copy title and description"><ClipboardDocumentIcon className="h-4 w-4" /> <span className="max-sm:hidden">Copy</span></Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(true)} aria-label="Edit description"><PencilSquareIcon className="h-4 w-4" /> <span className="max-sm:hidden">Edit</span></Button>
                    </div>
                  )}
                />
                {detail ? (
                  detail.description?.trim() ? (
                    <>
                      <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-fg-2">{detail.description}</p>
                      <p className="mt-3 text-right text-xs tabular-nums text-fg-4">{descriptionLength} characters</p>
                    </>
                  ) : (
                    <button type="button" onClick={() => setEditing(true)} className="w-full cursor-pointer rounded-2xl border border-dashed border-line-strong p-5 text-sm text-fg-3 transition hover:border-blue-400 hover:text-accent">
                      No description yet — add one
                    </button>
                  )
                ) : (
                  <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-11/12" /><Skeleton className="h-4 w-2/3" /></div>
                )}
              </section>

              {/* Footage */}
              <section className={cardClass}>
                <CardTitle
                  icon={<FilmIcon className="h-4 w-4" />}
                  title="Footage"
                  count={footage ? footage.length : undefined}
                  action={footage && footage.length > 0 && (
                    <span className={`text-xs font-medium ${downloadedCount === footage.length ? "text-emerald-600 dark:text-emerald-300" : "text-fg-3"}`}>
                      {downloadedCount}/{footage.length} downloaded
                    </span>
                  )}
                />
                <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); void addFootage(); }}>
                  <Input placeholder="Paste a YouTube link or file path" value={fp} onChange={(e) => setFp(e.target.value)} disabled={addingFootage} aria-label="Footage link or file path" />
                  <Button type="submit" variant="secondary" size="icon" disabled={addingFootage || !fp.trim()} aria-label="Add footage">
                    {addingFootage ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PlusIcon className="h-4 w-4" />}
                  </Button>
                </form>

                {footage === null ? (
                  <div className="space-y-2"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
                ) : footage.length === 0 ? (
                  <p className="rounded-2xl bg-surface-muted p-4 text-center text-sm text-fg-4">No clips yet. Paste a link above.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {footage.map((f) => {
                      const ytId = f.file_path ? getYoutubeVideoId(f.file_path) : null;
                      const href = isUrl(f.file_path) ? f.file_path : null;
                      const fileName = !href && f.file_path ? f.file_path.split(/[\\/]/).pop() : null;
                      const showThumb = Boolean(ytId) && !failedThumbs.has(f.id);
                      const Thumb = href ? "a" : "span";
                      return (
                        <li key={f.id} className="group flex items-center gap-3 rounded-2xl border border-line-soft bg-surface-muted p-2 pr-1.5 sm:gap-4">
                          <Thumb
                            {...(href ? { href, target: "_blank", rel: "noopener noreferrer", "aria-label": `Open ${f.title || "clip"}` } : {})}
                            className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-xl bg-slate-900 sm:w-36"
                          >
                            {showThumb ? (
                              <CoverImage src={`https://i.ytimg.com/vi/${ytId}/mqdefault.jpg`} alt="" sizes="144px" onError={() => setFailedThumbs((current) => new Set(current).add(f.id))} />
                            ) : (
                              <span className="absolute inset-0 flex items-center justify-center text-white/35"><FilmIcon className="h-6 w-6" /></span>
                            )}
                            {href && (
                              <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition group-hover:bg-black/30">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur"><PlayIcon className="ml-0.5 h-4 w-4" /></span>
                              </span>
                            )}
                          </Thumb>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold leading-5 text-fg">{f.title || fileName || (href ? hostOf(href) : "Clip")}</p>
                            <p className="mt-0.5 truncate text-xs text-fg-3">{f.channel_name || (href ? href.replace(/^https?:\/\/(www\.)?/i, "") : f.file_path)}</p>
                            <button
                              type="button"
                              onClick={() => void toggleDownloaded(f)}
                              aria-pressed={f.downloaded}
                              className={`mt-1.5 inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg px-2 text-[11px] font-semibold transition pointer-coarse:h-9 ${f.downloaded ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-surface-strong text-fg-3 hover:text-fg"}`}
                            >
                              {f.downloaded ? <><CheckIcon className="h-3.5 w-3.5" /> Downloaded</> : <><CloudArrowDownIcon className="h-3.5 w-3.5" /> Need download</>}
                            </button>
                          </div>
                          <button type="button" onClick={() => void deleteFootage(f)} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center self-start rounded-lg text-fg-4 transition hover:bg-danger-soft hover:text-rose-500 pointer-coarse:h-11 pointer-coarse:w-11" aria-label="Remove clip">
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* Sources */}
              <section className={cardClass}>
                <CardTitle icon={<GlobeAltIcon className="h-4 w-4" />} title="References" count={sources ? sources.length : undefined} />
                <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); void addSource(); }}>
                  <Input placeholder="Article, wiki or Reddit URL" value={srcUrl} onChange={(e) => setSrcUrl(e.target.value)} disabled={addingSource} aria-label="Source URL" />
                  <Button type="submit" variant="secondary" size="icon" disabled={addingSource || !srcUrl.trim()} aria-label="Add source">
                    {addingSource ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PlusIcon className="h-4 w-4" />}
                  </Button>
                </form>
                {sources === null ? (
                  <div className="space-y-2"><Skeleton className="h-12" /></div>
                ) : sources.length === 0 ? (
                  <p className="rounded-2xl bg-surface-muted p-4 text-center text-sm text-fg-4">No references yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {sources.map((s) => (
                      <li key={s.id} className="group flex items-center gap-3 rounded-2xl border border-line-soft bg-surface-muted py-2 pl-3 pr-1.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-fg-4 ring-1 ring-line"><LinkIcon className="h-4 w-4" /></span>
                        {isUrl(s.url) ? (
                          <a href={s.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-fg group-hover:text-accent">{hostOf(s.url)}</span>
                            <span className="block truncate text-xs text-fg-4">{s.url}</span>
                          </a>
                        ) : (
                          <span className="min-w-0 flex-1 truncate font-mono text-sm text-fg-2">{s.url}</span>
                        )}
                        {isUrl(s.url) && <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0 text-fg-4" aria-hidden="true" />}
                        <button type="button" onClick={() => void deleteSource(s)} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-fg-4 transition hover:bg-danger-soft hover:text-rose-500" aria-label="Remove source">
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* ---------- SIDE ---------- */}
            <aside className="space-y-5 lg:sticky lg:top-6 lg:space-y-6">
              <section className={cardClass}>
                <CardTitle
                  icon={<FilmIcon className="h-4 w-4" />}
                  title="In script projects"
                  count={projects ? projects.length : undefined}
                />
                {projects === null ? (
                  <Skeleton className="h-11" />
                ) : projects.length === 0 ? (
                  <p className="text-sm text-fg-4">Not used in a short project yet.</p>
                ) : (
                  <ul className="-mx-2 space-y-0.5">
                    {projects.map((p) => (
                      <li key={p.id}>
                        <Link href={`/scripts?open=${p.id}`} className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm text-fg-2 transition hover:bg-surface-sunken hover:text-fg">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[p.status || "Draft"] ?? STATUS_DOT.Draft}`} title={p.status || "Draft"} />
                          <span className="min-w-0 flex-1 truncate font-medium">{p.title}</span>
                          <span className="shrink-0 text-xs text-fg-4">{p.status || "Draft"}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => setShowScriptModal(true)} disabled={!detail}>
                  <PlusIcon className="h-4 w-4" /> Add to a project
                </Button>
              </section>

              <section className={cardClass}>
                <CardTitle
                  icon={<FolderIcon className="h-4 w-4" />}
                  title="Collections"
                  action={ideaGroups && <CollectionAdd groups={allGroups.filter((g) => !ideaGroups.some((c) => c.id === g.id))} onAdd={(gid) => void addToGroup(gid)} onCreate={(name) => void createGroup(name)} />}
                />
                {ideaGroups === null ? (
                  <Skeleton className="h-8 w-2/3" />
                ) : ideaGroups.length === 0 ? (
                  <p className="text-sm text-fg-4">Not in any collection.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {ideaGroups.map((g) => (
                      <span key={g.id} className="inline-flex h-8 max-w-full items-center gap-1 rounded-full border border-line bg-surface-muted pl-3 pr-1 text-xs font-semibold text-fg-2">
                        <span className="truncate">{g.name}</span>
                        <button type="button" onClick={() => void removeFromGroup(g.id)} className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-4 transition hover:bg-danger-soft hover:text-rose-500 pointer-coarse:h-7 pointer-coarse:w-7" aria-label={`Remove from ${g.name}`}>
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </section>

              <section className={cardClass}>
                <CardTitle icon={<PuzzlePieceIcon className="h-4 w-4" />} title="Details" />
                <dl className="space-y-2.5 text-sm">
                  {[
                    ["Game", game?.title ?? "—"],
                    ["Released", game?.release_year ? String(game.release_year) : "—"],
                    ["Genre", game?.genres_text || "—"],
                    ["Added", formatDate(detail?.created_at)],
                    ...(detail?.pinned && detail.pinned_at ? [["Pinned", formatDate(detail.pinned_at)]] : []),
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-3">
                      <dt className="shrink-0 text-fg-3">{label}</dt>
                      <dd className="min-w-0 truncate text-right font-medium text-fg-2" title={value}>{value}</dd>
                    </div>
                  ))}
                </dl>
                {game && (
                  <Link href={`/games/${game.id}/edit`} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
                    <PencilSquareIcon className="h-3.5 w-3.5" /> Edit game info
                  </Link>
                )}
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
