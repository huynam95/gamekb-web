"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChartPieIcon,
  ExclamationTriangleIcon,
  FilmIcon,
  PuzzlePieceIcon,
  SparklesIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabaseClient";
import { AppSidebar } from "@/components/AppSidebar";
import { AppPageHeader, appPageMainClass, appPageRootClass } from "@/components/AppPage";
import { CoverImage } from "@/components/CoverImage";
import { TypeLabel } from "@/components/TypePill";
import { Button } from "@/components/ui/Button";
import { formatCount, useIdeaUsage, type UsageVideo } from "@/lib/ideaUsage";

type IdeaRow = { id: number; title: string; detail_type: string; game_id: number; created_at: string | null };
type GameRow = { id: number; title: string; cover_url: string | null };

const cardClass = "rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6";

/** PostgREST returns at most 1000 rows per request, so page through. */
async function fetchAllIdeas(): Promise<IdeaRow[]> {
  const rows: IdeaRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("details").select("id,title,detail_type,game_id,created_at").eq("status", "idea").order("id").range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as IdeaRow[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

function SectionTitle({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="flex items-center gap-2 text-base font-bold text-fg"><span className="text-fg-4">{icon}</span>{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-fg-3">{hint}</p>}
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <p className="truncate text-xs font-medium text-fg-3">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-fg sm:text-3xl">{value}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-fg-4">{sub}</p>}
    </div>
  );
}

/** Share of a total as a thin single-hue bar (magnitude, sequential). */
function ShareBar({ value, max, className = "bg-blue-600" }: { value: number; max: number; className?: string }) {
  const pct = max ? Math.max(value ? 3 : 0, (value / max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-blue-500/15">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ---------- Videos per month: one series, columns, hover tooltip ---------- */

function MonthlyChart({ videos }: { videos: UsageVideo[] }) {
  const months = useMemo(() => {
    const now = new Date();
    const list = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return { key: `${date.getFullYear()}-${date.getMonth()}`, label: date.toLocaleDateString("en-GB", { month: "short" }), full: date.toLocaleDateString("en-GB", { month: "long", year: "numeric" }), total: 0, published: 0 };
    });
    const index = new Map(list.map((m, i) => [m.key, i]));
    for (const video of videos) {
      if (!video.created_at) continue;
      const d = new Date(video.created_at);
      const i = index.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (i === undefined) continue;
      list[i].total += 1;
      if (video.published) list[i].published += 1;
    }
    return list;
  }, [videos]);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...months.map((m) => m.total));
  const ticks = max <= 4 ? Array.from({ length: max + 1 }, (_, i) => i) : [0, Math.round(max / 2), max];
  const shown = hover !== null ? months[hover] : null;

  return (
    <div>
      <div className="relative">
        <div className="grid h-44 grid-cols-[2rem_minmax(0,1fr)] gap-2">
          <div className="relative text-right text-[11px] tabular-nums text-fg-4" aria-hidden="true">
            {ticks.map((t) => <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (t / max) * 100}%` }}>{t}</span>)}
          </div>
          <div className="relative">
            {ticks.map((t) => <div key={t} className="absolute inset-x-0 border-t border-line-soft" style={{ top: `${100 - (t / max) * 100}%` }} aria-hidden="true" />)}
            <div className="absolute inset-0 grid grid-cols-12" onMouseLeave={() => setHover(null)}>
              {months.map((m, i) => (
                <button
                  key={m.key}
                  type="button"
                  className="group relative flex h-full cursor-default items-end justify-center focus:outline-none"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  onClick={() => setHover(hover === i ? null : i)}
                  aria-label={`${m.full}: ${m.total} videos, ${m.published} published`}
                >
                  {hover === i && <span className="absolute inset-y-0 inset-x-0.5 rounded-lg bg-surface-sunken/70" aria-hidden="true" />}
                  <span
                    className="relative w-[min(24px,60%)] rounded-t-[4px] bg-blue-600 transition-[height] dark:bg-blue-400"
                    style={{ height: `${(m.total / max) * 100}%`, minHeight: m.total ? 2 : 0 }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-1.5 grid grid-cols-[2rem_minmax(0,1fr)] gap-2">
          <span />
          <div className="grid grid-cols-12 text-center text-[11px] text-fg-4">{months.map((m) => <span key={m.key}>{m.label}</span>)}</div>
        </div>
        {shown && hover !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 w-44 -translate-x-1/2 rounded-xl border border-line bg-surface p-3 text-xs shadow-xl"
            style={{ left: `calc(2.5rem + (100% - 2.5rem) * ${(hover + 0.5) / 12})` }}
            role="status"
          >
            <p className="font-semibold text-fg">{shown.full}</p>
            <p className="mt-1 flex justify-between text-fg-2"><span>Videos</span><span className="font-semibold tabular-nums">{shown.total}</span></p>
            <p className="flex justify-between text-fg-3"><span>Published</span><span className="tabular-nums">{shown.published}</span></p>
          </div>
        )}
      </div>
      <details className="mt-3 text-xs text-fg-3">
        <summary className="cursor-pointer font-medium">Show as table</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead><tr className="text-fg-4"><th className="py-1 font-medium">Month</th><th className="font-medium">Videos</th><th className="font-medium">Published</th></tr></thead>
          <tbody>{months.map((m) => <tr key={m.key} className="border-t border-line-soft"><td className="py-1">{m.full}</td><td>{m.total}</td><td>{m.published}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  );
}

/* ================= PAGE ================= */

export default function StatsPage() {
  const { data: usage, byIdea, error: usageError } = useIdeaUsage();
  const [ideas, setIdeas] = useState<IdeaRow[] | null>(null);
  const [games, setGames] = useState<GameRow[]>([]);
  const [showAllGames, setShowAllGames] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([fetchAllIdeas(), supabase.from("games").select("id,title,cover_url")])
      .then(([ideaRows, gamesResult]) => {
        if (!active) return;
        setIdeas(ideaRows);
        setGames((gamesResult.data ?? []) as GameRow[]);
      })
      .catch(() => { if (active) setIdeas([]); });
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => {
    if (!ideas || !usage) return null;
    const gameById = new Map(games.map((g) => [g.id, g]));
    const videos = usage.videos;
    const used = ideas.filter((idea) => byIdea.get(idea.id)?.total);

    const topIdeas = ideas
      .map((idea) => ({ idea, usage: byIdea.get(idea.id) }))
      .filter((row) => row.usage && row.usage.total > 0)
      .sort((a, b) => b.usage!.total - a.usage!.total || b.usage!.published - a.usage!.published)
      .slice(0, 10);

    const gameRows = new Map<number, { game: GameRow | undefined; ideas: number; used: number; videoKeys: Set<string> }>();
    const typeRows = new Map<string, { ideas: number; used: number; videoKeys: Set<string> }>();
    for (const idea of ideas) {
      const u = byIdea.get(idea.id);
      const g = gameRows.get(idea.game_id) ?? { game: gameById.get(idea.game_id), ideas: 0, used: 0, videoKeys: new Set<string>() };
      const t = typeRows.get(idea.detail_type) ?? { ideas: 0, used: 0, videoKeys: new Set<string>() };
      g.ideas += 1; t.ideas += 1;
      if (u?.total) {
        g.used += 1; t.used += 1;
        for (const v of u.videos) {
          const key = `${v.kind}:${v.id}`;
          g.videoKeys.add(key);
          t.videoKeys.add(key);
        }
      }
      gameRows.set(idea.game_id, g);
      typeRows.set(idea.detail_type, t);
    }

    const topicRows = new Map<string, { videos: number; published: number }>();
    for (const v of videos) {
      const key = v.topic?.trim() || "No topic";
      const row = topicRows.get(key) ?? { videos: 0, published: 0 };
      row.videos += 1; if (v.published) row.published += 1;
      topicRows.set(key, row);
    }

    return {
      videos,
      published: videos.filter((v) => v.published).length,
      used: used.length,
      fresh: ideas.length - used.length,
      overused: topIdeas.filter((row) => row.usage!.total >= 3).length,
      topIdeas,
      games: Array.from(gameRows.values()).sort((a, b) => b.ideas - a.ideas || b.used - a.used || (a.game?.title ?? "").localeCompare(b.game?.title ?? "", undefined, { numeric: true })),
      types: Array.from(typeRows.entries()).sort((a, b) => b[1].ideas - a[1].ideas),
      topics: Array.from(topicRows.entries()).sort((a, b) => b[1].videos - a[1].videos),
    };
  }, [ideas, usage, games, byIdea]);

  const totalIdeas = ideas?.length ?? 0;

  return (
    <div className={`${appPageRootClass} xl:flex`}>
      <AppSidebar activePage="stats" />
      <main className={appPageMainClass}>
        <div className="app-container max-w-6xl">
          <AppPageHeader
            title="Stats"
            description="How your ideas turn into videos: what's been used, what's still fresh, and which games and topics you lean on."
            icon={<ChartPieIcon className="h-5 w-5" />}
            className="mb-4"
          />

          {usageError ? (
            <div className={`${cardClass} text-sm text-rose-600`}>{usageError}</div>
          ) : !stats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-sunken" />)}</div>
              <div className="h-64 animate-pulse rounded-3xl bg-surface-sunken" />
            </div>
          ) : (
            <div className="space-y-5">
              {!usage?.linksReady && (
                <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  Short Projects are matched to ideas from their clips and description for now. Run the database update to track this exactly.
                </p>
              )}

              {/* Overview */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Tile label="Ideas used in a Short" value={`${stats.used}`} sub={`${totalIdeas ? Math.round((stats.used / totalIdeas) * 100) : 0}% of ${totalIdeas} ideas`} />
                <Tile label="Fresh ideas" value={formatCount(stats.fresh)} sub="Never used yet" />
                <Tile label="Short Projects" value={`${stats.videos.length}`} sub={`${stats.videos.length - stats.published} in progress`} />
                <Tile label="Published Shorts" value={`${stats.published}`} sub={`${stats.videos.length ? Math.round((stats.published / stats.videos.length) * 100) : 0}% of Short Projects`} />
              </div>

              <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <section className={cardClass}>
                  <SectionTitle icon={<FilmIcon className="h-4 w-4" />} title="Shorts created per month" hint="Last 12 months. Hover a month for details." />
                  <MonthlyChart videos={stats.videos} />
                </section>

                <section className={cardClass}>
                  <SectionTitle icon={<SparklesIcon className="h-4 w-4" />} title="Most used ideas" hint={stats.overused ? `${stats.overused} idea${stats.overused === 1 ? " is" : "s are"} in 3+ videos — viewers may notice repeats.` : "Ideas that appear in the most videos."} />
                  {stats.topIdeas.length === 0 ? (
                    <p className="text-sm text-fg-4">No idea is in a video yet.</p>
                  ) : (
                    <ol className="-mx-2 space-y-0.5">
                      {stats.topIdeas.map(({ idea, usage: u }, index) => (
                        <li key={idea.id}>
                          <Link href={`/idea/${idea.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface-sunken">
                            <span className="w-5 shrink-0 text-right text-xs tabular-nums text-fg-4">{index + 1}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-fg">{idea.title}</span>
                              <span className="block truncate text-[11px] text-fg-4">{games.find((g) => g.id === idea.game_id)?.title}{u!.published ? ` · ${u!.published} published` : ""}</span>
                            </span>
                            <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${u!.total >= 3 ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" : "bg-surface-sunken text-fg-2"}`}>×{u!.total}</span>
                          </Link>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </div>

              {/* By game */}
              <section className={cardClass}>
                <SectionTitle icon={<PuzzlePieceIcon className="h-4 w-4" />} title="By game" hint="Share of each game's ideas already used. Games with many fresh ideas are untapped." />
                <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_4rem_4rem] gap-3 border-b border-line-soft pb-2 text-[11px] font-medium uppercase tracking-wider text-fg-4 sm:grid">
                  <span>Game</span><span>Used / ideas</span><span className="text-right">Fresh</span><span className="text-right">Videos</span>
                </div>
                <ul className="divide-y divide-line-soft">
                  {(showAllGames ? stats.games : stats.games.slice(0, 12)).map((row) => (
                    <li key={row.game?.id ?? row.game?.title} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 py-2.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_4rem_4rem]">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="relative h-9 w-7 shrink-0 overflow-hidden rounded-md bg-surface-sunken">{row.game?.cover_url && <CoverImage src={row.game.cover_url} sizes="28px" />}</span>
                        <span className="truncate text-sm font-medium text-fg">{row.game?.title ?? "Unknown game"}</span>
                      </span>
                      <span className="text-right text-xs tabular-nums text-fg-3 sm:hidden">{row.used}/{row.ideas} used · {row.videoKeys.size} videos</span>
                      <span className="col-span-2 flex items-center gap-2 sm:col-span-1">
                        <ShareBar value={row.used} max={row.ideas} />
                        <span className="w-14 shrink-0 text-right text-xs tabular-nums text-fg-3 max-sm:hidden">{row.used}/{row.ideas}</span>
                      </span>
                      <span className="hidden text-right text-sm tabular-nums text-fg-2 sm:block">{row.ideas - row.used}</span>
                      <span className="hidden text-right text-sm tabular-nums text-fg-2 sm:block">{row.videoKeys.size}</span>
                    </li>
                  ))}
                </ul>
                {stats.games.length > 12 && (
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowAllGames((v) => !v)}>
                    {showAllGames ? "Show fewer" : `Show all ${stats.games.length} games`}
                  </Button>
                )}
              </section>

              <div className="grid items-start gap-5 lg:grid-cols-2">
                {/* By type */}
                <section className={cardClass}>
                  <SectionTitle icon={<TagIcon className="h-4 w-4" />} title="By idea type" hint="Share of each type's ideas already used." />
                  <ul className="space-y-3">
                    {stats.types.map(([typeKey, row]) => (
                      <li key={typeKey}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                          <TypeLabel typeKey={typeKey} className="font-medium text-fg" />
                          <span className="text-xs tabular-nums text-fg-3">{row.ideas} ideas · {row.used} used · {row.videoKeys.size} videos</span>
                        </div>
                        <ShareBar value={row.used} max={row.ideas} />
                      </li>
                    ))}
                  </ul>
                </section>

                {/* By topic */}
                <section className={cardClass}>
                  <SectionTitle icon={<ChartPieIcon className="h-4 w-4" />} title="By topic" hint="Which topics you make the most Shorts about." />
                  {stats.topics.length === 0 ? (
                    <p className="text-sm text-fg-4">No Short Projects yet.</p>
                  ) : (
                    <ul className="divide-y divide-line-soft">
                      {stats.topics.map(([topic, row]) => (
                        <li key={topic} className="flex items-center justify-between gap-3 py-2 text-sm">
                          <span className={`min-w-0 truncate ${topic === "No topic" ? "text-fg-4" : "font-medium text-fg"}`}>{topic}</span>
                          <span className="shrink-0 text-xs tabular-nums text-fg-3">{row.videos} video{row.videos === 1 ? "" : "s"} · {row.published} published</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
