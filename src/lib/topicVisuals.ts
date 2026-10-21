import type { ComponentType, SVGProps } from "react";
import {
  ArrowPathRoundedSquareIcon,
  BoltIcon,
  ClockIcon,
  CpuChipIcon,
  FaceSmileIcon,
  FilmIcon,
  MagnifyingGlassIcon,
  PuzzlePieceIcon,
  SparklesIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

export type TopicVisual = {
  Icon: IconType;
  /** Soft tile: tinted background + coloured icon (used in light UI). */
  softClass: string;
  /** Solid gradient tile with white icon. */
  gradientClass: string;
};

const VISUALS = {
  trollOther: {
    Icon: PuzzlePieceIcon,
    softClass: "bg-blue-100 text-blue-600 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/20",
    gradientClass: "from-fuchsia-500 to-violet-600 text-white",
  },
  troll: {
    Icon: FaceSmileIcon,
    softClass: "bg-fuchsia-100 text-fuchsia-600 ring-fuchsia-200 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 dark:ring-fuchsia-500/20",
    gradientClass: "from-pink-500 to-rose-500 text-white",
  },
  remember: {
    Icon: CpuChipIcon,
    softClass: "bg-violet-100 text-violet-600 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/20",
    gradientClass: "from-indigo-500 to-blue-600 text-white",
  },
  punish: {
    Icon: BoltIcon,
    softClass: "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/20",
    gradientClass: "from-amber-400 to-orange-500 text-white",
  },
  fourthWall: {
    Icon: ArrowPathRoundedSquareIcon,
    softClass: "bg-cyan-100 text-cyan-700 ring-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:ring-cyan-500/20",
    gradientClass: "from-cyan-400 to-sky-500 text-white",
  },
  afk: {
    Icon: ClockIcon,
    softClass: "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/20",
    gradientClass: "from-emerald-400 to-teal-500 text-white",
  },
  detail: {
    Icon: MagnifyingGlassIcon,
    softClass: "bg-rose-100 text-rose-600 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/20",
    gradientClass: "from-blue-400 to-cyan-500 text-white",
  },
  unexpected: {
    Icon: SparklesIcon,
    softClass: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
    gradientClass: "from-violet-500 to-indigo-600 text-white",
  },
  fallback: {
    Icon: VideoCameraIcon,
    softClass: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
    gradientClass: "from-blue-500 to-violet-600 text-white",
  },
  none: {
    Icon: FilmIcon,
    softClass: "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    gradientClass: "from-slate-200 to-slate-100 text-slate-500 dark:from-slate-800 dark:to-slate-900 dark:text-slate-300",
  },
} satisfies Record<string, TopicVisual>;

const ROTATION: TopicVisual[] = [VISUALS.trollOther, VISUALS.troll, VISUALS.remember, VISUALS.punish, VISUALS.fourthWall, VISUALS.afk, VISUALS.detail, VISUALS.unexpected];

/** Pick a consistent icon/colour for a video topic from its id or title. */
export function getTopicVisual(key: string | null | undefined, index = 0): TopicVisual {
  if (!key || key === "No topic") return VISUALS.none;
  const k = key.toLowerCase();
  if (k.includes("troll-other") || k.includes("troll other")) return VISUALS.trollOther;
  if (k.includes("troll")) return VISUALS.troll;
  if (k.includes("remember")) return VISUALS.remember;
  if (k.includes("punish")) return VISUALS.punish;
  if (k.includes("fourth") || k.includes("wall")) return VISUALS.fourthWall;
  if (k.includes("afk")) return VISUALS.afk;
  if (k.includes("detail") || k.includes("unnoticed") || k.includes("noticed")) return VISUALS.detail;
  if (k.includes("expect")) return VISUALS.unexpected;
  return index >= 0 ? ROTATION[index % ROTATION.length] : VISUALS.fallback;
}
