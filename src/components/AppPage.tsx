import type { ReactNode } from "react";

type AppPageHeaderProps = {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export const appPageRootClass =
  "min-h-screen bg-slate-50 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100";

export const appPageMainClass = "min-w-0 flex-1 pb-24 xl:pl-72";

export const appPageContainerClass =
  "mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8";

export const appPageSurfaceClass =
  "rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

export const appPagePrimaryActionClass =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200";

export function AppPageHeader({ title, description, icon, action, className = "" }: AppPageHeaderProps) {
  return (
    <header
      className={`mb-7 flex flex-col gap-4 rounded-[1.75rem] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-slate-800 dark:bg-slate-900/90 ${className}`}
    >
      <div className="flex min-w-0 items-start gap-3.5">
        {icon ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl dark:text-white">{title}</h1>
          {description ? (
            <div className="mt-1.5 max-w-3xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
              {description}
            </div>
          ) : null}
        </div>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </header>
  );
}
