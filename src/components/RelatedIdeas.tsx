"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowPathIcon, CheckIcon, LinkIcon, MagnifyingGlassIcon, PlusIcon, PuzzlePieceIcon, SparklesIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabaseClient";
import { useNotifications } from "@/components/NotificationCenter";
import { CoverImage } from "@/components/CoverImage";
import { Button } from "@/components/ui/Button";
import { LINKS_SETUP_MESSAGE, isMissingLinksTable, linkIdeas, loadLinks, loadUsedTogether, unlinkIdeas } from "@/lib/ideaLinks";

type RelatedRow = {
  id: number;
  title: string;
  detail_type: string;
  game: { title: string; cover_url: string | null } | null;
};

const ROW_SELECT = "id,title,detail_type,game:games(title,cover_url)";

async function loadRows(ids: number[]) {
  if (!ids.length) return [] as RelatedRow[];
  const { data } = await supabase.from("details").select(ROW_SELECT).in("id", ids);
  const byId = new Map(((data ?? []) as unknown as RelatedRow[]).map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as RelatedRow[];
}

function Thumb({ src }: { src: string | null | undefined }) {
  return (
    <span className="relative flex h-12 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-sunken text-fg-4 ring-1 ring-black/5 dark:ring-white/10">
      {src ? <CoverImage src={src} sizes="36px" /> : <PuzzlePieceIcon className="h-4 w-4" />}
    </span>
  );
}

function Search({ excludeIds, onPick, onClose }: { excludeIds: Set<number>; onPick: (row: RelatedRow) => Promise<void>; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<RelatedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const q = query.trim().replace(/[%_,()]/g, "");
    const timer = setTimeout(async () => {
      setLoading(true);
      let request = supabase.from("details").select(ROW_SELECT).order("created_at", { ascending: false }).limit(12);
      if (q) request = request.ilike("title", `%${q}%`);
      const { data } = await request;
      if (!active) return;
      setRows(((data ?? []) as unknown as RelatedRow[]).filter((row) => !excludeIds.has(row.id)));
      setLoading(false);
    }, q ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [query, excludeIds]);

  return (
    <div className="mt-3 rounded-2xl border border-line bg-surface-muted p-2">
      <label className="relative block">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-4" />
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }} placeholder="Search idea title…" aria-label="Search ideas to link" className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm text-fg outline-none focus:border-blue-500" />
      </label>
      <ul className="mt-1.5 max-h-72 overflow-y-auto">
        {loading && rows.length === 0 && <li className="px-3 py-4 text-center text-xs text-fg-4">Searching…</li>}
        {!loading && rows.length === 0 && <li className="px-3 py-4 text-center text-xs text-fg-4">No ideas found.</li>}
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              disabled={busy !== null}
              onClick={async () => { setBusy(row.id); await onPick(row); setBusy(null); }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition hover:bg-surface disabled:opacity-60"
            >
              <Thumb src={row.game?.cover_url} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-fg">{row.title}</span>
                <span className="block truncate text-[11px] text-fg-4">{row.game?.title}</span>
              </span>
              {busy === row.id ? <ArrowPathIcon className="h-4 w-4 animate-spin text-fg-4" /> : <LinkIcon className="h-4 w-4 shrink-0 text-accent" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function fetchRelated(ideaId: number) {
  const [{ links, error }, counts] = await Promise.all([loadLinks([ideaId]), loadUsedTogether(ideaId)]);
  const linkedIds = links.get(ideaId) ?? new Set<number>();
  const top = Array.from(counts.entries()).filter(([id]) => !linkedIds.has(id)).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const [linked, togetherRows] = await Promise.all([error ? Promise.resolve([] as RelatedRow[]) : loadRows(Array.from(linkedIds)), loadRows(top.map(([id]) => id))]);
  return {
    missingTable: isMissingLinksTable(error),
    linked,
    together: togetherRows.map((row) => ({ row, count: counts.get(row.id) ?? 0 })),
  };
}

/** "Related ideas" card on the idea page: linked ideas, a search to link more, and ideas often used together. */
export function RelatedIdeas({ ideaId, cardClass }: { ideaId: number; cardClass: string }) {
  const { success, error: notifyError } = useNotifications();
  const [linked, setLinked] = useState<RelatedRow[] | null>(null);
  const [together, setTogether] = useState<{ row: RelatedRow; count: number }[]>([]);
  const [missingTable, setMissingTable] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let active = true;
    fetchRelated(ideaId).then((result) => {
      if (!active) return;
      setMissingTable(result.missingTable);
      setLinked(result.linked);
      setTogether(result.together);
    });
    return () => { active = false; };
  }, [ideaId]);

  const link = async (row: RelatedRow) => {
    const { error } = await linkIdeas(ideaId, row.id);
    if (error) {
      notifyError(isMissingLinksTable(error) ? LINKS_SETUP_MESSAGE : error.message, "Not linked");
      return;
    }
    setLinked((current) => [...(current ?? []).filter((r) => r.id !== row.id), row]);
    setTogether((current) => current.filter((item) => item.row.id !== row.id));
    success(`Linked with “${row.title}”.`, "Related idea added");
  };

  const unlink = async (row: RelatedRow) => {
    const before = linked;
    setLinked((current) => (current ?? []).filter((r) => r.id !== row.id));
    const { error } = await unlinkIdeas(ideaId, row.id);
    if (error) {
      setLinked(before);
      notifyError(error.message, "Not unlinked");
    }
  };

  const excludeIds = new Set([ideaId, ...(linked ?? []).map((row) => row.id)]);

  return (
    <section className={cardClass}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-fg">
          <span className="text-fg-4"><LinkIcon className="h-4 w-4" /></span>
          Related ideas
          {linked && <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-semibold tabular-nums text-fg-3">{linked.length}</span>}
        </h2>
        {!missingTable && (
          <Button variant="ghost" size="sm" onClick={() => setSearching((v) => !v)} aria-expanded={searching}>
            {searching ? <><CheckIcon className="h-4 w-4" /> Done</> : <><PlusIcon className="h-4 w-4" /> Link idea</>}
          </Button>
        )}
      </div>

      {missingTable && <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">{LINKS_SETUP_MESSAGE}</p>}

      {linked === null ? (
        <div className="grid gap-2 sm:grid-cols-2"><div className="h-16 animate-pulse rounded-2xl bg-surface-sunken" /><div className="h-16 animate-pulse rounded-2xl bg-surface-sunken" /></div>
      ) : linked.length === 0 && !missingTable ? (
        <p className="text-sm text-fg-4">No linked ideas yet. Link ideas that go well in the same video.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {linked.map((row) => (
            <li key={row.id} className="group relative flex items-center gap-2.5 rounded-2xl border border-line-soft bg-surface-muted p-2 pr-1.5 transition hover:border-line-strong">
              <Thumb src={row.game?.cover_url} />
              <Link href={`/idea/${row.id}`} className="min-w-0 flex-1 after:absolute after:inset-0 after:rounded-2xl">
                <span className="block truncate text-[11px] font-semibold uppercase tracking-wide text-fg-4">{row.game?.title}</span>
                <span className="line-clamp-2 text-sm font-semibold leading-5 text-fg group-hover:text-accent">{row.title}</span>
              </Link>
              <button type="button" onClick={() => void unlink(row)} className="relative z-10 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center self-start rounded-lg text-fg-4 transition hover:bg-danger-soft hover:text-rose-500 pointer-coarse:h-10 pointer-coarse:w-10" aria-label={`Unlink ${row.title}`} title="Unlink">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {searching && <Search excludeIds={excludeIds} onPick={link} onClose={() => setSearching(false)} />}

      {together.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-fg-3"><SparklesIcon className="h-4 w-4 text-amber-500" /> Often used together</p>
          <ul className="space-y-1.5">
            {together.map(({ row, count }) => (
              <li key={row.id} className="flex items-center gap-2.5 rounded-xl px-1 py-1">
                <Thumb src={row.game?.cover_url} />
                <Link href={`/idea/${row.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-fg hover:text-accent">{row.title}</span>
                  <span className="block truncate text-[11px] text-fg-4">{row.game?.title} · {count} project{count === 1 ? "" : "s"} together</span>
                </Link>
                {!missingTable && (
                  <Button variant="secondary" size="sm" onClick={() => void link(row)}><LinkIcon className="h-4 w-4" /> Link</Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
