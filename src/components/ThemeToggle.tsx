"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { applyResolvedTheme, getResolvedTheme, saveTheme, type ThemeMode } from "@/components/ThemeController";

type ThemeToggleProps = {
  variant?: "full" | "compact";
};

export function ThemeToggle({ variant = "full" }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    applyResolvedTheme();
    setTheme(getResolvedTheme());

    const syncTheme = () => setTheme(getResolvedTheme());
    window.addEventListener("pageshow", syncTheme);
    window.addEventListener("focus", syncTheme);
    window.addEventListener("gamekb-theme-change", syncTheme);

    return () => {
      window.removeEventListener("pageshow", syncTheme);
      window.removeEventListener("focus", syncTheme);
      window.removeEventListener("gamekb-theme-change", syncTheme);
    };
  }, []);

  function toggleTheme() {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    saveTheme(nextTheme);
    setTheme(nextTheme);
  }

  const isDark = theme === "dark";

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        title={isDark ? "Light mode" : "Dark mode"}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
          {isDark ? <MoonIcon className="h-4 w-4" aria-hidden="true" /> : <SunIcon className="h-4 w-4" aria-hidden="true" />}
        </span>
        <span>{isDark ? "Dark" : "Light"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <span>{isDark ? "Dark" : "Light"}</span>
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100">
        {isDark ? <MoonIcon className="h-4 w-4" aria-hidden="true" /> : <SunIcon className="h-4 w-4" aria-hidden="true" />}
      </span>
    </button>
  );
}
