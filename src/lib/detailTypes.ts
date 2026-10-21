import type { ComponentType, SVGProps } from "react";
import {
  CubeTransparentIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FaceSmileIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

export type DetailTypeConfig = {
  label: string;
  /** Short label used in filters and compact pills. */
  shortLabel: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Pill colours for use on top of dark game-cover artwork. */
  className: string;
};

export const TYPE_CONFIG: Record<string, DetailTypeConfig> = {
  small_detail: { label: "Small Detail", shortLabel: "Detail", Icon: MagnifyingGlassIcon, className: "bg-blue-500/20 border-blue-400/30 text-blue-100" },
  easter_egg: { label: "Easter Egg", shortLabel: "Easter Egg", Icon: SparklesIcon, className: "bg-purple-500/20 border-purple-400/30 text-purple-100" },
  npc_reaction: { label: "NPC Reaction", shortLabel: "NPC", Icon: UserGroupIcon, className: "bg-emerald-500/20 border-emerald-400/30 text-emerald-100" },
  physics: { label: "Physics", shortLabel: "Physics", Icon: CubeTransparentIcon, className: "bg-orange-500/20 border-orange-400/30 text-orange-100" },
  troll: { label: "Troll", shortLabel: "Troll", Icon: FaceSmileIcon, className: "bg-pink-500/20 border-pink-400/30 text-pink-100" },
  punish: { label: "Punish", shortLabel: "Punish", Icon: ExclamationTriangleIcon, className: "bg-red-500/20 border-red-400/30 text-red-100" },
  default: { label: "Note", shortLabel: "Note", Icon: DocumentTextIcon, className: "bg-slate-500/20 border-slate-400/30 text-slate-100" },
};

export function getTypeConfig(typeKey: string | null | undefined): DetailTypeConfig {
  return (typeKey && TYPE_CONFIG[typeKey]) || TYPE_CONFIG.default;
}

export const PRIORITY_OPTIONS = [
  { value: 1, label: "High", color: "text-red-600", bg: "bg-red-50" },
  { value: 2, label: "Normal", color: "text-accent", bg: "bg-accent-soft" },
  { value: 3, label: "Low", color: "text-fg-3", bg: "bg-surface-sunken" },
];
