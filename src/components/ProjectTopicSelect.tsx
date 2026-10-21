"use client";

import { useId } from "react";
import type { VideoTheme } from "@/lib/videoThemes";

type ProjectTopicSelectProps = {
  value: string;
  topics: VideoTheme[];
  onChange: (topic: string) => void;
  label?: string;
  ariaLabel?: string;
  loading?: boolean;
  saving?: boolean;
};

export function ProjectTopicSelect({ value, topics, onChange, label, ariaLabel = "Project topic", loading = false, saving = false }: ProjectTopicSelectProps) {
  const id = useId();
  const choices = Array.from(new Set(topics.map((topic) => topic.title.trim()).filter(Boolean)));
  if (value && !choices.includes(value)) choices.unshift(value);

  return (
    <div className="min-w-0 w-full" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      {label && <label htmlFor={id} className="mb-1.5 block text-xs font-black text-slate-500 dark:text-slate-400">{label}</label>}
      <select
        id={id}
        aria-label={ariaLabel}
        aria-busy={loading || saving}
        value={value}
        disabled={loading || saving}
        onChange={(event) => onChange(event.target.value)}
        title={saving ? "Saving topic..." : value || "Choose topic"}
        className={`min-h-11 w-full min-w-0 cursor-pointer truncate rounded-xl border py-2 pl-3 pr-8 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 disabled:cursor-wait disabled:opacity-60 ${value ? "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100" : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"}`}
      >
        <option value="">{loading ? "Loading topics..." : "No topic"}</option>
        {choices.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
      </select>
    </div>
  );
}
