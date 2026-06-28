"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "gamekb-theme";

export function getStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === "dark" || storedTheme === "light" ? storedTheme : null;
  } catch {
    return null;
  }
}

export function getSystemTheme(): ThemeMode {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getResolvedTheme(): ThemeMode {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;

  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function applyResolvedTheme() {
  applyTheme(getResolvedTheme());
}

export function saveTheme(theme: ThemeMode) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}

  applyTheme(theme);
  window.dispatchEvent(new CustomEvent("gamekb-theme-change", { detail: theme }));
}

export function ThemeController() {
  const pathname = usePathname();

  useEffect(() => {
    applyResolvedTheme();
  }, [pathname]);

  useEffect(() => {
    applyResolvedTheme();

    const syncTheme = () => applyResolvedTheme();
    const syncFromStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) applyResolvedTheme();
    };

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => {
      if (!getStoredTheme()) applyResolvedTheme();
    };

    window.addEventListener("pageshow", syncTheme);
    window.addEventListener("focus", syncTheme);
    window.addEventListener("storage", syncFromStorage);
    window.addEventListener("gamekb-theme-change", syncTheme);
    mediaQuery.addEventListener("change", syncSystemTheme);

    return () => {
      window.removeEventListener("pageshow", syncTheme);
      window.removeEventListener("focus", syncTheme);
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener("gamekb-theme-change", syncTheme);
      mediaQuery.removeEventListener("change", syncSystemTheme);
    };
  }, []);

  return null;
}
