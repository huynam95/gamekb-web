import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";

type AppPageHeaderProps = {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export const appPageRootClass =
  "app-shell min-h-screen bg-slate-50 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100";

export const appPageMainClass = "app-main min-w-0 flex-1 pb-24";

export const appPageContainerClass =
  "app-container";

export const appPageSurfaceClass =
  "rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

export const appPagePrimaryActionClass = buttonClass({ variant: "primary", size: "md" });

export function AppPageHeader({ title, description, icon, action, className = "" }: AppPageHeaderProps) {
  return (
    <header
      className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-line bg-surface/90 p-3.5 shadow-sm backdrop-blur sm:mb-7 sm:gap-4 sm:p-5 ${className}`}
    >
      <div className="flex min-w-0 flex-[1_1_14rem] items-center gap-3 sm:items-start sm:gap-3.5">
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 sm:h-11 sm:w-11 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <h1 className="break-words text-[1.4rem] font-black leading-tight tracking-tight text-fg sm:text-3xl">{title}</h1>
          {/* Phones show just the title; the description is context for larger screens. */}
          {description ? (
            <div className="mt-1.5 hidden max-w-3xl text-sm font-medium leading-6 text-fg-3 sm:block">
              {description}
            </div>
          ) : null}
        </div>
      </div>
      {action ? <div className="flex min-w-0 max-w-full shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  );
}
