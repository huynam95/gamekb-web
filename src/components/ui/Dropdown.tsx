"use client";

import { useCallback, useRef, useState, type ComponentType, type SVGProps } from "react";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useDismiss } from "@/components/ui/useDismiss";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

export type DropdownOption<T extends string | number> = {
  value: T;
  label: string;
  Icon?: IconType;
};

/** Pill trigger shared by the library filters. Filled when a filter is active. */
export function pillTriggerClass(active: boolean) {
  return `flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-full border px-3.5 text-sm font-semibold shadow-sm transition active:scale-[0.99] ${
    active
      ? "border-slate-900 bg-slate-900 text-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      : "border-line bg-surface text-fg-2 hover:border-line-strong hover:bg-surface-hover"
  }`;
}

export const menuPanelClass =
  "absolute left-0 top-full z-[999] mt-2 w-full overflow-auto rounded-2xl border border-line bg-surface p-1.5 shadow-2xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-150 dark:ring-white/10";

export function menuItemClass(active: boolean) {
  return `flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 text-left text-sm font-medium transition ${
    active ? "bg-slate-900 text-white dark:bg-slate-700 dark:text-white" : "text-fg-2 hover:bg-surface-sunken hover:text-fg"
  }`;
}

export function Dropdown<T extends string | number>({
  value,
  options,
  onChange,
  heading,
  isActive,
  ariaLabel,
  maxHeightClass = "max-h-[min(26rem,65dvh)]",
}: {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  heading?: string;
  /** Whether the trigger shows as "filter applied". Defaults to value !== first option. */
  isActive?: boolean;
  ariaLabel?: string;
  maxHeightClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(boxRef, open, close);

  const selected = options.find((option) => option.value === value) ?? options[0];
  const active = isActive ?? value !== options[0]?.value;
  const SelectedIcon = selected?.Icon;

  return (
    <div ref={boxRef} className={`relative w-full ${open ? "z-[130]" : "z-auto"}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={pillTriggerClass(active)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="flex min-w-0 items-center gap-2">
          {SelectedIcon && (
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${active ? "bg-white/15" : "bg-surface-sunken text-fg-4"}`}>
              <SelectedIcon className="h-3.5 w-3.5" />
            </span>
          )}
          <span className="truncate">{selected?.label}</span>
        </span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className={`${menuPanelClass} ${maxHeightClass}`} role="listbox" aria-label={ariaLabel}>
          {heading && <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-fg-4">{heading}</div>}
          <div className="space-y-0.5">
            {options.map((option) => {
              const isSelected = option.value === value;
              const Icon = option.Icon;
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={menuItemClass(isSelected)}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {Icon && (
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isSelected ? "bg-white/15" : "bg-surface-sunken text-fg-4"}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <span className="truncate">{option.label}</span>
                  </span>
                  {isSelected && <CheckIcon className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
