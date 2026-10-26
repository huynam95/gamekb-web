import type { ComponentType, SVGProps } from "react";
import { CubeTransparentIcon, ExclamationTriangleIcon, FaceSmileIcon, MagnifyingGlassIcon, SparklesIcon, UserGroupIcon } from "@heroicons/react/24/outline";

type SelectOption<T extends string | number> = {
  value: T;
  label: string;
  description?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
};

export const DETAIL_TYPE_OPTIONS: SelectOption<string>[] = [
  {
    value: "small_detail",
    label: "Small detail",
    description: "Tiny detail",
    icon: MagnifyingGlassIcon,
  },
  {
    value: "easter_egg",
    label: "Easter egg",
    description: "Hidden secret",
    icon: SparklesIcon,
  },
  {
    value: "npc_reaction",
    label: "NPC reaction",
    description: "Character response",
    icon: UserGroupIcon,
  },
  {
    value: "physics",
    label: "Physics",
    description: "System detail",
    icon: CubeTransparentIcon,
  },
  {
    value: "troll",
    label: "Troll",
    description: "Player bait",
    icon: FaceSmileIcon,
  },
  {
    value: "punish",
    label: "Punish",
    description: "Disobedience result",
    icon: ExclamationTriangleIcon,
  },
];

/** Grid of idea-type choices (Small detail, Easter egg, ...). */
export function TypeChips({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Detail type">
      {DETAIL_TYPE_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`flex min-h-14 cursor-pointer items-center gap-2.5 rounded-2xl border px-3 py-2 text-left transition active:scale-[0.98] ${
              active
                ? "border-slate-900 bg-slate-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-slate-950"
                : "border-line bg-surface text-fg-2 hover:border-line-strong hover:bg-surface-hover"
            }`}
          >
            {Icon && (
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${active ? "bg-white/15 dark:bg-slate-950/10" : "bg-surface-sunken text-fg-3"}`}>
                <Icon className="h-4 w-4" />
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{option.label}</span>
              {option.description && <span className={`block truncate text-xs ${active ? "opacity-70" : "text-fg-4"}`}>{option.description}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
