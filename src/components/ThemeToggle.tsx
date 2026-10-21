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
        className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-2.5 text-sm font-medium text-fg-3 shadow-sm transition hover:bg-surface-hover hover:text-fg active:scale-[0.98] sm:pr-3"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        title={isDark ? "Light mode" : "Dark mode"}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-sunken text-fg-2">
          {isDark ? <MoonIcon className="h-4 w-4" aria-hidden="true" /> : <SunIcon className="h-4 w-4" aria-hidden="true" />}
        </span>
        <span className="hidden sm:inline">{isDark ? "Dark" : "Light"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-line bg-surface-muted px-4 py-2.5 text-sm font-semibold text-fg-2 transition hover:bg-surface-sunken"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <span>{isDark ? "Dark mode" : "Light mode"}</span>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-fg shadow-sm">
        {isDark ? <MoonIcon className="h-4 w-4" aria-hidden="true" /> : <SunIcon className="h-4 w-4" aria-hidden="true" />}
      </span>
    </button>
  );
}
