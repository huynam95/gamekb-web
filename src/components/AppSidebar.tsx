"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type ComponentType, type SVGProps } from "react";
import {
  Bars3Icon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  CheckIcon,
  DocumentTextIcon,
  FilmIcon,
  LightBulbIcon,
  PencilSquareIcon,
  PlusIcon,
  PuzzlePieceIcon,
  Squares2X2Icon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useDismiss } from "@/components/ui/useDismiss";
import type { Group } from "@/types/gamekb";

type ActivePage = "ideas" | "dashboard" | "scripts" | "audienceRequests" | "longVideos" | "addGame" | "addIdea" | "dailyGoal" | "migrate";

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
  onRenameGroup?: (id: number, name: string) => void | Promise<void>;
  onSelectGroup?: (id: number) => void;
  onSelectAllIdeas?: () => void;
  showThemeToggle?: boolean;
};

type NavIconType = ComponentType<SVGProps<SVGSVGElement>>;

const navItems: Array<{ key: ActivePage; href: string; Icon: NavIconType; label: string }> = [
  { key: "ideas", href: "/", Icon: Squares2X2Icon, label: "All Ideas" },
  { key: "dashboard", href: "/dashboard", Icon: ChartBarIcon, label: "Dashboard" },
  { key: "dailyGoal", href: "/daily-goal", Icon: CheckCircleIcon, label: "Daily To-Do" },
  { key: "addIdea", href: "/add", Icon: LightBulbIcon, label: "Add Idea" },
  { key: "addGame", href: "/games/new", Icon: PuzzlePieceIcon, label: "Add Game" },
  { key: "scripts", href: "/scripts", Icon: DocumentTextIcon, label: "Short Projects" },
  { key: "longVideos", href: "/long-videos", Icon: FilmIcon, label: "Long Video Studio" },
  { key: "audienceRequests", href: "/audience-requests", Icon: ChatBubbleLeftRightIcon, label: "Audience Requests" },
];

function navClass(active: boolean, compact: boolean) {
  const shape = compact
    ? "min-h-11 rounded-xl border px-3 py-2 text-sm"
    : "rounded-xl px-3.5 py-2.5 text-sm";
  const state = active
    ? `bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-950 ${compact ? "border-slate-900 dark:border-white" : ""}`
    : `text-fg-3 hover:bg-surface-sunken hover:text-fg ${compact ? "border-line bg-surface" : ""}`;
  return `flex w-full min-w-0 cursor-pointer items-center gap-3 font-semibold transition ${shape} ${state}`;
}

function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`shrink-0 font-black tracking-tighter text-fg ${className}`}>
      GameKB<span className="text-blue-500">.</span>
    </Link>
  );
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
  onRenameGroup,
  onSelectGroup,
  onSelectAllIdeas,
  showThemeToggle = true,
}: AppSidebarProps) {
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useDismiss(mobileNavRef, menuOpen, closeMenu);

  const startRenameGroup = (group: Group) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
  };

  const cancelRenameGroup = () => {
    setEditingGroupId(null);
    setEditingGroupName("");
  };

  const saveGroupName = async () => {
    if (editingGroupId === null) return;
    const name = editingGroupName.trim();
    if (!name) return;
    await onRenameGroup?.(editingGroupId, name);
    cancelRenameGroup();
  };

  const activeItem = navItems.find((item) => item.key === activePage);
  const activeGroup = groups.find((group) => group.id === selectedGroupId);

  const renderNavItem = (item: (typeof navItems)[number], compact = false) => {
    const isIdeasWithGroup = item.key === "ideas" && Boolean(onSelectAllIdeas);
    const active = activePage === item.key && (!isIdeasWithGroup || !selectedGroupId);
    const content = (
      <>
        <item.Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate leading-tight">{item.label}</span>
      </>
    );

    if (isIdeasWithGroup) {
      return (
        <button
          key={item.key}
          onClick={() => { onSelectAllIdeas?.(); setMenuOpen(false); }}
          aria-current={active ? "page" : undefined}
          className={navClass(active, compact)}
          type="button"
        >
          {content}
        </button>
      );
    }

    return (
      <Link key={item.key} href={item.href} className={navClass(active, compact)} aria-current={active ? "page" : undefined} onClick={() => setMenuOpen(false)}>
        {content}
      </Link>
    );
  };

  const collectionsBlock = (compact = false) => (
    activePage === "ideas" && showCollections && (
      <div className={compact ? "border-t border-line-soft pt-3" : "border-t border-line-soft pt-4"}>
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-4">Collections</span>
          <button
            onClick={onToggleCreateGroup}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-fg-4 transition hover:bg-surface-sunken hover:text-accent"
            type="button"
            aria-label="Create collection"
            aria-expanded={showCreateGroup}
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>

        {showCreateGroup && (
          <div className="mb-2">
            <input
              className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg outline-none placeholder:text-fg-4 focus:border-blue-500"
              value={newGroupName}
              onChange={(event) => onNewGroupNameChange?.(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && onCreateGroup?.()}
              placeholder="Collection name, then Enter"
              aria-label="New collection name"
              autoFocus
            />
          </div>
        )}

        <div className={compact ? "grid grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-3" : "space-y-0.5"}>
          {groups.map((group) => {
            const selected = selectedGroupId === group.id;
            return (
              <div
                key={group.id}
                className={`group/item relative flex w-full min-w-0 items-center justify-between rounded-lg px-2 transition ${
                  selected ? "bg-accent-soft" : "hover:bg-surface-hover"
                }`}
              >
                {editingGroupId === group.id ? (
                  <div className="flex min-w-0 flex-1 items-center gap-1 py-1" onClick={(event) => event.stopPropagation()}>
                    <input
                      value={editingGroupName}
                      onChange={(event) => setEditingGroupName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void saveGroupName();
                        if (event.key === "Escape") cancelRenameGroup();
                      }}
                      className="h-8 min-w-0 flex-1 rounded-lg border border-blue-300 bg-surface px-2 text-sm font-medium text-fg outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-blue-700"
                      aria-label="Collection name"
                      autoFocus
                    />
                    <button type="button" onClick={() => void saveGroupName()} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" aria-label="Save collection name">
                      <CheckIcon className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={cancelRenameGroup} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-fg-4 hover:bg-surface-sunken" aria-label="Cancel rename">
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { onSelectGroup?.(group.id); setMenuOpen(false); }}
                    className={`flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 py-2 text-left text-sm ${
                      selected ? "font-semibold text-accent" : "font-medium text-fg-3 hover:text-fg"
                    }`}
                    aria-current={selected ? "true" : undefined}
                    type="button"
                  >
                    <span className="truncate">{group.name}</span>
                  </button>
                )}

                {editingGroupId !== group.id && (
                  <div className="flex min-w-[64px] shrink-0 items-center justify-end">
                    <span className={`mr-1 tabular-nums text-[11px] font-semibold leading-none group-hover/item:hidden group-focus-within/item:hidden ${selected ? "text-accent" : "text-fg-4"}`}>
                      {groupCounts.get(group.id) || 0}
                    </span>
                    {onRenameGroup && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          startRenameGroup(group);
                        }}
                        className="collection-action hidden h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-fg-4 transition hover:bg-accent-soft hover:text-accent group-hover/item:flex group-focus-within/item:flex"
                        type="button"
                        aria-label={`Rename ${group.name}`}
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteGroup?.(group.id);
                      }}
                      className="collection-action hidden h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-rose-500 transition hover:bg-danger-soft hover:text-rose-700 group-hover/item:flex group-focus-within/item:flex"
                      type="button"
                      aria-label={`Delete ${group.name}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    )
  );

  const currentLabel = activeGroup?.name || activeItem?.label;

  return (
    <>
      {/* Phone and tablet: one compact bar; navigation and collections open from the Menu button. */}
      <div
        ref={mobileNavRef}
        className="app-mobile-nav sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur"
        onKeyDown={(event) => { if (event.key === "Escape") { setMenuOpen(false); document.getElementById("navigation-toggle")?.focus(); } }}
      >
        <div className="flex h-[68px] items-center justify-between gap-3 px-3 sm:px-4">
          <div className="flex min-w-0 items-baseline gap-2">
            <Logo className="text-xl" />
            {currentLabel && <span className="hidden min-w-0 truncate text-sm font-medium text-fg-3 sm:inline">/ {currentLabel}</span>}
          </div>
          <div className="flex min-w-0 items-center gap-2">
            {showThemeToggle && <ThemeToggle variant="compact" />}
            <button
              id="navigation-toggle"
              type="button"
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-fg-2 transition hover:bg-surface-hover"
              aria-expanded={menuOpen}
              aria-controls="compact-navigation"
              onClick={() => setMenuOpen((current) => !current)}
            >
              {menuOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
              Menu
            </button>
          </div>
        </div>
        <div id="compact-navigation" className={`${menuOpen ? "block" : "hidden"} max-h-[75dvh] overflow-y-auto border-t border-line-soft px-3 pb-3 pt-3 animate-in fade-in slide-in-from-top-1 duration-150 sm:px-4`}>
          <nav aria-label="Main navigation" className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {navItems.map((item) => renderNavItem(item, true))}
          </nav>
          {collectionsBlock(true) && <div className="mt-3">{collectionsBlock(true)}</div>}
        </div>
      </div>

      <aside className="app-sidebar fixed inset-y-0 left-0 z-20 flex-col border-r border-line bg-surface">
        <div className="flex h-20 shrink-0 items-center px-6">
          <Logo className="text-2xl" />
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
          <nav className="space-y-1" aria-label="Main navigation">
            {navItems.map((item) => renderNavItem(item))}
          </nav>

          {collectionsBlock(false)}
        </div>

        {showThemeToggle && (
          <div className="border-t border-line-soft p-4">
            <ThemeToggle />
          </div>
        )}
      </aside>
    </>
  );
}
