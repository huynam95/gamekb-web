"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import {
  Bars3Icon,
  EllipsisHorizontalIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  DocumentTextIcon,
  FilmIcon,
  LightBulbIcon,
  PencilSquareIcon,
  PlusIcon,
  Squares2X2Icon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Modal, ModalBody, ModalHeader } from "@/components/ui/Modal";
import type { Group } from "@/types/gamekb";
import logoImage from "@/assets/ninjaplay-logo.webp";

type ActivePage = "ideas" | "dashboard" | "scripts" | "audienceRequests" | "longVideos" | "addGame" | "addIdea" | "migrate";

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
  /** Built-in "Pinned" entry at the top of Collections (ideas page only). */
  onSelectPinned?: () => void;
  pinnedSelected?: boolean;
  pinnedCount?: number | null;
  showThemeToggle?: boolean;
  /** Hide the phone/tablet bottom tab bar, e.g. while a selection bar takes its place. */
  hideTabBar?: boolean;
};

type NavIconType = ComponentType<SVGProps<SVGSVGElement>>;

const navItems: Array<{ key: ActivePage; href: string; Icon: NavIconType; label: string }> = [
  { key: "ideas", href: "/", Icon: Squares2X2Icon, label: "All Ideas" },
  { key: "dashboard", href: "/dashboard", Icon: ChartBarIcon, label: "Dashboard" },
  { key: "addIdea", href: "/add", Icon: LightBulbIcon, label: "Add Idea" },
  { key: "scripts", href: "/scripts", Icon: DocumentTextIcon, label: "Short Projects" },
  { key: "longVideos", href: "/long-videos", Icon: FilmIcon, label: "Long Video Studio" },
  { key: "audienceRequests", href: "/audience-requests", Icon: ChatBubbleLeftRightIcon, label: "Audience Requests" },
];

/** Bottom tab bar on phones and tablets; everything else is under "More". */
const tabItems: Array<{ key: ActivePage | "more"; href: string; Icon: NavIconType; label: string }> = [
  { key: "ideas", href: "/", Icon: Squares2X2Icon, label: "Ideas" },
  { key: "scripts", href: "/scripts", Icon: DocumentTextIcon, label: "Shorts" },
  { key: "addIdea", href: "/add", Icon: PlusIcon, label: "Add" },
  { key: "longVideos", href: "/long-videos", Icon: FilmIcon, label: "Long video" },
  { key: "more", href: "#", Icon: Bars3Icon, label: "More" },
];

function navClass(active: boolean, compact: boolean) {
  const shape = compact
    ? "min-h-11 rounded-xl border px-3 py-2 text-sm"
    : "rounded-xl px-3.5 py-2.5 text-sm";
  const state = active
    ? `bg-blue-600 text-white shadow-sm shadow-blue-600/25 ${compact ? "border-blue-600" : ""}`
    : `text-fg-3 hover:bg-surface-sunken hover:text-fg ${compact ? "border-line bg-surface" : ""}`;
  return `flex w-full min-w-0 cursor-pointer items-center gap-3 text-left font-semibold transition ${shape} ${state}`;
}

function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const small = size === "sm";
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-full" aria-label="NinjaPlay home">
      <Image
        src={logoImage}
        alt=""
        width={small ? 32 : 40}
        height={small ? 32 : 40}
        priority
        unoptimized
        className={`${small ? "h-8 w-8" : "h-10 w-10"} rounded-full ring-2 ring-blue-600/25 dark:ring-brand-cyan/40`}
      />
      <span className={`${small ? "text-lg" : "text-xl"} font-black tracking-tight text-fg`}>
        Ninja<span className="text-blue-600 dark:text-brand-cyan">Play</span>
      </span>
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
  onSelectPinned,
  pinnedSelected = false,
  pinnedCount = null,
  showThemeToggle = true,
  hideTabBar = false,
}: AppSidebarProps) {
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  // Tell the page whether the bottom tab bar is showing, so fixed bottom bars
  // (selection bar, save bar) sit above it instead of underneath.
  useEffect(() => {
    const root = document.documentElement;
    if (hideTabBar) delete root.dataset.tabbar;
    else root.dataset.tabbar = "on";
    return () => {
      delete root.dataset.tabbar;
    };
  }, [hideTabBar]);

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
    const active = activePage === item.key && (!isIdeasWithGroup || (!selectedGroupId && !pinnedSelected));
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
            className="touch-target flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-fg-4 transition hover:bg-surface-sunken hover:text-accent"
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
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg outline-none placeholder:text-fg-4 focus:border-blue-500 lg:h-9"
              value={newGroupName}
              onChange={(event) => onNewGroupNameChange?.(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && onCreateGroup?.()}
              placeholder="Collection name, then Enter"
              aria-label="New collection name"
              autoFocus
            />
          </div>
        )}

        <div className={compact ? "space-y-1" : "space-y-0.5"}>
          {onSelectPinned && (
            <div className={`relative flex w-full min-w-0 items-center justify-between rounded-lg px-2 transition ${pinnedSelected ? "bg-amber-50 dark:bg-amber-500/10" : "hover:bg-surface-hover"}`}>
              <button
                type="button"
                onClick={() => { onSelectPinned(); setMenuOpen(false); }}
                aria-current={pinnedSelected ? "true" : undefined}
                className={`flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 py-2 text-left text-sm lg:min-h-9 ${pinnedSelected ? "font-semibold text-amber-700 dark:text-amber-300" : "font-medium text-fg-3 hover:text-fg"}`}
              >
                <StarSolidIcon className={`h-4 w-4 shrink-0 ${pinnedSelected ? "text-amber-500" : "text-amber-400"}`} aria-hidden="true" />
                <span className="truncate">Pinned</span>
              </button>
              {typeof pinnedCount === "number" && (
                <span className={`mr-1 tabular-nums text-[11px] font-semibold leading-none ${pinnedSelected ? "text-amber-700 dark:text-amber-300" : "text-fg-4"}`}>{pinnedCount}</span>
              )}
            </div>
          )}
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
                    className={`flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 py-2 text-left text-sm lg:min-h-9 ${
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

  const currentLabel = pinnedSelected ? "Pinned" : activeGroup?.name || activeItem?.label;

  return (
    <>
      {/* Phone and tablet: slim top bar for orientation; navigation lives in the bottom tab bar. */}
      <header className="app-mobile-nav sticky top-0 z-50 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Logo size="sm" />
            {currentLabel && <span className="min-w-0 truncate text-sm font-medium text-fg-3">/ {currentLabel}</span>}
          </div>
          {showThemeToggle && <ThemeToggle variant="compact" />}
        </div>
      </header>

      {!hideTabBar && (
        <nav className="app-tabbar" aria-label="Main navigation">
          {tabItems.map((tab) => {
            if (tab.key === "more") {
              return (
                <button
                  key="more"
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className={`app-tab ${menuOpen || !tabItems.some((t) => t.key === activePage) ? "is-active" : ""}`}
                  aria-haspopup="dialog"
                  aria-expanded={menuOpen}
                >
                  <EllipsisHorizontalIcon className="h-6 w-6" aria-hidden="true" />
                  <span>More</span>
                </button>
              );
            }
            const active = tab.key === activePage && (tab.key !== "ideas" || (!selectedGroupId && !pinnedSelected) || !onSelectAllIdeas);
            const isAdd = tab.key === "addIdea";
            const body = (
              <>
                {isAdd ? (
                  <span className="app-tab-add" aria-hidden="true"><PlusIcon className="h-6 w-6" strokeWidth={2.2} /></span>
                ) : (
                  <tab.Icon className="h-6 w-6" aria-hidden="true" />
                )}
                <span>{tab.label}</span>
              </>
            );
            if (tab.key === "ideas" && onSelectAllIdeas && activePage === "ideas") {
              return (
                <button key={tab.key} type="button" onClick={() => onSelectAllIdeas()} className={`app-tab ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>
                  {body}
                </button>
              );
            }
            return (
              <Link key={tab.key} href={tab.href} className={`app-tab ${active ? "is-active" : ""} ${isAdd ? "is-add" : ""}`} aria-current={active ? "page" : undefined}>
                {body}
              </Link>
            );
          })}
        </nav>
      )}

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} size="md" zClass="z-[160]" labelledBy="mobile-menu-title">
        <ModalHeader id="mobile-menu-title" title="Menu" onClose={() => setMenuOpen(false)} />
        <ModalBody className="space-y-4 px-4 py-4 sm:px-6">
          <nav aria-label="All pages" className="grid grid-cols-2 gap-2">
            {navItems.map((item) => renderNavItem(item, true))}
          </nav>
          {collectionsBlock(true)}
          {showThemeToggle && <ThemeToggle />}
        </ModalBody>
      </Modal>

      <aside className="app-sidebar fixed inset-y-0 left-0 z-20 flex-col border-r border-line bg-surface">
        <div className="flex h-20 shrink-0 items-center px-6">
          <Logo />
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
