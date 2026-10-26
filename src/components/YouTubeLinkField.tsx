"use client";

import { useState } from "react";
import { ArrowTopRightOnSquareIcon, CheckIcon, PlayIcon } from "@heroicons/react/24/outline";
import { useNotifications } from "@/components/NotificationCenter";
import { formatCount, invalidateUsage } from "@/lib/ideaUsage";

/** YouTube link of a published Short or Long video; saving it also pulls its view count. */
export function YouTubeLinkField({
  kind,
  id,
  initialUrl,
  initialViews = null,
  onSaved,
  className = "",
}: {
  kind: "short" | "long";
  id: number;
  initialUrl: string;
  initialViews?: number | null;
  onSaved?: () => void;
  className?: string;
}) {
  const { success, error: notifyError, warning } = useNotifications();
  const [url, setUrl] = useState(initialUrl);
  const [savedUrl, setSavedUrl] = useState(initialUrl);
  const [views, setViews] = useState<number | null>(initialViews);
  const [saving, setSaving] = useState(false);
  const dirty = url.trim() !== savedUrl.trim();

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/videos/youtube", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id, youtube_url: url.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save the link");
      setSavedUrl(payload.data.youtube_url ?? "");
      setUrl(payload.data.youtube_url ?? "");
      setViews(payload.data.youtube_views ?? null);
      invalidateUsage();
      onSaved?.();
      if (payload.statsError) warning(payload.statsError, "Link saved, views not loaded");
      else success(payload.data.youtube_url ? (payload.data.youtube_views != null ? `${formatCount(payload.data.youtube_views)} views so far.` : "YouTube link saved.") : "YouTube link removed.", "Saved");
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Could not save the link", "Not saved");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`min-w-0 ${className}`}>
      <label className="mb-1.5 flex items-center justify-between gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1"><PlayIcon className="h-3.5 w-3.5 text-rose-500" /> YouTube link</span>
        {views != null && savedUrl && <span className="font-semibold tabular-nums text-fg-2">{formatCount(views)} views</span>}
      </label>
      <div className="flex gap-1.5">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => void save()}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void save(); } }}
          placeholder="Paste after publishing"
          inputMode="url"
          aria-label="YouTube video link"
          className="min-h-11 w-full min-w-0 rounded-xl border border-line bg-surface px-3 text-sm text-fg outline-none transition placeholder:text-fg-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
        />
        {savedUrl && !dirty ? (
          <a href={savedUrl} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-fg-3 transition hover:text-fg" aria-label="Open on YouTube">
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        ) : dirty ? (
          <button type="button" onClick={() => void save()} disabled={saving} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-60" aria-label="Save YouTube link">
            <CheckIcon className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
