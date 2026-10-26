"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ================= TYPES (shared with /api/usage) ================= */

export type VideoKind = "short" | "long";

export type UsageVideo = {
  kind: VideoKind;
  id: number;
  title: string;
  status: string;
  published: boolean;
  topic: string | null;
  created_at: string | null;
  published_at: string | null;
};

export type UsageLink = { kind: VideoKind; video_id: number; detail_id: number };

export type UsagePayload = {
  videos: UsageVideo[];
  links: UsageLink[];
  /** False until the script_ideas table exists (links are then inferred). */
  linksReady: boolean;
};

export type IdeaUsage = {
  videos: UsageVideo[];
  total: number;
  published: number;
};

const EMPTY_USAGE: IdeaUsage = { videos: [], total: 0, published: 0 };

/* ================= LOADING (one request shared by every component) ================= */

const TTL_MS = 60_000;
let cache: { at: number; data: UsagePayload } | null = null;
let inflight: Promise<UsagePayload> | null = null;
const listeners = new Set<(data: UsagePayload) => void>();

async function fetchUsage(): Promise<UsagePayload> {
  const response = await fetch("/api/usage", { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Could not load usage");
  return payload as UsagePayload;
}

export function loadUsage(force = false): Promise<UsagePayload> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.data);
  if (!inflight) {
    inflight = fetchUsage()
      .then((data) => {
        cache = { at: Date.now(), data };
        for (const listener of listeners) listener(data);
        return data;
      })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/** Call after adding ideas to a project so badges and counts refresh. */
export function invalidateUsage() {
  cache = null;
  if (listeners.size) void loadUsage(true).catch(() => undefined);
}

export function buildUsageIndex(data: UsagePayload | null) {
  const byIdea = new Map<number, IdeaUsage>();
  if (!data) return byIdea;
  const videoByKey = new Map(data.videos.map((video) => [`${video.kind}:${video.id}`, video]));
  for (const link of data.links) {
    const video = videoByKey.get(`${link.kind}:${link.video_id}`);
    if (!video) continue;
    const entry = byIdea.get(link.detail_id) ?? { videos: [], total: 0, published: 0 };
    if (entry.videos.some((v) => v.kind === video.kind && v.id === video.id)) continue;
    entry.videos.push(video);
    entry.total += 1;
    if (video.published) entry.published += 1;
    byIdea.set(link.detail_id, entry);
  }
  return byIdea;
}

export function useIdeaUsage(enabled = true) {
  const [data, setData] = useState<UsagePayload | null>(cache?.data ?? null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const listener = (next: UsagePayload) => { if (active) setData(next); };
    listeners.add(listener);
    loadUsage()
      .then((next) => { if (active) setData(next); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Could not load usage"); });
    return () => { active = false; listeners.delete(listener); };
  }, [enabled]);

  const byIdea = useMemo(() => buildUsageIndex(data), [data]);
  return {
    data,
    error,
    byIdea,
    usageOf: (detailId: number): IdeaUsage => byIdea.get(detailId) ?? EMPTY_USAGE,
    refresh: () => loadUsage(true).then(setData),
  };
}

/* ================= WRITING LINKS ================= */

/** Record that these ideas are in a Short Project. Quietly does nothing before the table exists. */
export async function linkIdeasToScript(scriptId: number, ideaIds: number[]) {
  const unique = Array.from(new Set(ideaIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (!scriptId || unique.length === 0) return;
  const { error } = await supabase
    .from("script_ideas")
    .upsert(unique.map((detailId, index) => ({ script_id: scriptId, detail_id: detailId, position: index + 1 })), { onConflict: "script_id,detail_id", ignoreDuplicates: true });
  if (error && !/script_ideas|does not exist|schema cache/i.test(error.message)) console.warn("Could not link ideas to project", error.message);
  invalidateUsage();
}

/* ================= DISPLAY HELPERS ================= */

export function formatCount(value: number | null | undefined) {
  if (value == null) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return String(value);
}

export function videoHref(video: Pick<UsageVideo, "kind" | "id">) {
  return video.kind === "short" ? `/scripts?open=${video.id}` : `/long-videos/${video.id}`;
}

export function statusDot(video: Pick<UsageVideo, "status" | "published">) {
  if (video.published) return "bg-emerald-500";
  const s = video.status.toLowerCase();
  if (s === "filming" || s === "recording") return "bg-amber-500";
  if (s === "edited" || s === "editing" || s === "ready") return "bg-indigo-500";
  return "bg-slate-400";
}
