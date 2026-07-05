"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Group } from "@/types/gamekb";

type ActivePage = "ideas" | "dashboard" | "scripts" | "addGame" | "addIdea" | "migrate";

type AppSidebarProps = {
  activePage: ActivePage;
  groups?: Group[];
  groupCounts?: Map<number, number>;
  selectedGroupId?: number | "";
  showCollections?: boolean;
  showCreateGroup?: boolean;
  newGroupName?: string;
  onToggleCreateGroup?: () => void;
  onNewGroupNameChange?: (name: string) => void;
  onCreateGroup?: () => void;
  onDeleteGroup?: (id: number) => void;
  onSelectGroup?: (id: number) => void;
  onSelectAllIdeas?: () => void;
  showThemeToggle?: boolean;
};

const navItems: Array<{ key: ActivePage; href: string; icon: string; label: string }> = [
  { key: "ideas", href: "/", icon: "🏠", label: "All Ideas" },
  { key: "dashboard", href: "/dashboard", icon: "📊", label: "Dashboard" },
  { key: "addIdea", href: "/add", icon: "✦", label: "Add Idea" },
  { key: "addGame", href: "/games/new", icon: "🕹️", label: "Add Game" },
  { key: "scripts", href: "/scripts", icon: "📜", label: "Video Project" },
];

function navClass(active: boolean) {
  return `flex w-full cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
    active
      ? "bg-slate-900 text-white shadow-lg shadow-slate-200 dark:bg-white dark:text-slate-950 dark:shadow-none"
      : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
  }`;
}

function NavIcon({ children }: { children: ReactNode }) {
  return <span className="flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none">{children}</span>;
}

export function AppSidebar({
  activePage,
  groups = [],
  groupCounts = new Map(),
  selectedGroupId = "",
  showCollections = false,
  showCreateGroup = false,
  newGroupName = "",
  onToggleCreateGroup,
  onNewGroupNameChange,
  onCreateGroup,
  onDeleteGroup,
  onSelectGroup,
  onSelectAllIdeas,
  showThemeToggle = true,
}: AppSidebarProps) {
  const renderNavItem = (item: (typeof navItems)[number], compact = false) => {
    const active = activePage === item.key;
    const className = compact
      ? `flex shrink-0 cursor-pointer items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black transition ${
          active
            ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-950"
            : "bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        }`
      : navClass(active);

    const content = (
      <>
        <NavIcon>{item.icon}</NavIcon>
        <span className="whitespace-nowrap leading-none">{item.label}</span>
      </>
    );

    if (item.key === "ideas" && onSelectAllIdeas) {
      return (
        <button
          key={item.key}
          onClick={onSelectAllIdeas}
          className={compact ? className : navClass(active && !selectedGroupId)}
          type="button"
        >
          {content}
        </button>
      );
    }

    return (
      <Link key={item.key} href={item.href} className={className}>
        {content}
      </Link>
    );
  };

  const collectionsBlock = (compact = false) => (
    showCollections && (
      <div className={compact ? "space-y-2 border-t border-slate-100 px-3 py-3 dark:border-slate-800" : "border-t border-slate-100 pt-4 dark:border-slate-800"}>
        <div className="mb-2 flex items-center justify-between px-2 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          <span className="leading-none">Collections</span>
          <button
            onClick={onToggleCreateGroup}
            className="flex h-7 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-base leading-none transition hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-900 dark:hover:text-blue-400"
            type="button"
            aria-label="Create collection"
          >
            +
          </button>
        </div>

        {showCreateGroup && (
          <div className={compact ? "mb-2 px-1" : "mb-2"}>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400"
              value={newGroupName}
              onChange={(event) => onNewGroupNameChange?.(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && onCreateGroup?.()}
              placeholder="Name..."
              autoFocus
            />
          </div>
        )}

        <div className={compact ? "flex gap-2 overflow-x-auto pb-1" : "space-y-1"}>
          {groups.map((group) => (
            <div
              key={group.id}
              className={compact
                ? `group/item flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3 py-2 transition ${
                    selectedGroupId === group.id
                      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`
                : "group/item relative flex w-full cursor-pointer items-center justify-between rounded-xl px-2 py-1 transition hover:bg-slate-50 dark:hover:bg-slate-900"}
            >
              <button
                onClick={() => onSelectGroup?.(group.id)}
                className={compact
                  ? "flex max-w-[180px] cursor-pointer items-center gap-2 overflow-hidden text-left text-xs font-black"
                  : `flex flex-1 cursor-pointer items-center gap-2 overflow-hidden py-2 text-left ${
                      selectedGroupId === group.id ? "font-bold text-blue-700 dark:text-blue-400" : "font-medium text-slate-500 dark:text-slate-400"
                    }`}
                type="button"
              >
                <span className="truncate">{group.name}</span>
              </button>

              <div className="flex w-8 shrink-0 items-center justify-center">
                <span className={`tabular-nums text-[10px] font-bold leading-none opacity-60 group-hover/item:hidden ${selectedGroupId === group.id ? "text-blue-700 dark:text-blue-400" : ""}`}>
                  {groupCounts.get(group.id) || 0}
                </span>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteGroup?.(group.id);
                  }}
                  className="hidden h-7 w-8 cursor-pointer items-center justify-center rounded-lg text-rose-500 transition hover:bg-rose-50 hover:text-rose-700 group-hover/item:flex dark:hover:bg-rose-950/30"
                  type="button"
                  aria-label={`Delete ${group.name}`}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  );

  return (
    <>
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur xl:hidden dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex items-center justify-between gap-3 px-3 py-3">
          <Link href="/" className="shrink-0 text-xl font-black tracking-tighter text-slate-900 dark:text-slate-100">
            GameKB<span className="text-blue-500">.</span>
          </Link>
          {showThemeToggle && <ThemeToggle variant="compact" />}
        </div>
        <nav className="flex gap-2 overflow-x-auto px-3 pb-3">
          {navItems.map((item) => renderNavItem(item, true))}
        </nav>
        {collectionsBlock(true)}
      </div>

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r border-slate-200 bg-white xl:flex dark:border-slate-800 dark:bg-slate-950">
        <div className="flex h-20 items-center px-8 text-2xl font-black tracking-tighter text-slate-900 dark:text-slate-100">
          GameKB<span className="text-blue-500">.</span>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
          <nav className="space-y-2">
            {navItems.map((item) => renderNavItem(item))}
          </nav>

          {collectionsBlock(false)}
        </div>

        {showThemeToggle && (
          <div className="border-t border-slate-100 p-4 dark:border-slate-800">
            <ThemeToggle />
          </div>
        )}
      </aside>
    </>
  );
}
