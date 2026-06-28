"use client";

import Link from "next/link";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { DetailRow, Game } from "@/types/gamekb";

type RandomIdeaModalProps = {
  items: DetailRow[];
  games: Game[];
  isOpen: boolean;
  loading?: boolean;
  selectedIds: number[];
  onClose: () => void;
  onReshuffle: () => void;
  onQuickView: (idea: DetailRow) => void;
  onToggleSelect: (idea: DetailRow) => void;
  onClearSelection: () => void;
  onSaveProject: () => void;
};

function findGame(games: Game[], idea: DetailRow) {
  return games.find((game) => game.id === idea.game_id);
}

export function RandomIdeaModal({
  items,
  games,
  isOpen,
  loading = false,
  selectedIds,
  onClose,
  onReshuffle,
  onQuickView,
  onToggleSelect,
  onClearSelection,
  onSaveProject,
}: RandomIdeaModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-slate-950/95 p-5 backdrop-blur-sm" onClick={onClose}>
      <div className="mb-6 flex w-full max-w-[1400px] items-center justify-between gap-3" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-white shadow-lg backdrop-blur-md">
          <span className="text-2xl leading-none" aria-hidden="true">✦</span>
          <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-xs font-black text-slate-950 dark:bg-white dark:text-slate-950">{items.length}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSaveProject}
            disabled={selectedIds.length === 0}
            className="flex h-12 min-w-12 cursor-pointer items-center justify-center gap-1 rounded-2xl bg-white px-4 text-xl text-slate-950 shadow-lg transition hover:bg-slate-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 dark:bg-white dark:text-slate-950"
            type="button"
            title={`Save ${selectedIds.length} picked idea${selectedIds.length === 1 ? "" : "s"} to project`}
            aria-label="Save picked ideas to project"
          >
            <span className="leading-none" aria-hidden="true">✓</span>
            <span className="text-sm font-black">{selectedIds.length}</span>
          </button>

          {selectedIds.length > 0 && (
            <button
              onClick={onClearSelection}
              className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl bg-white/10 text-xl text-white shadow-lg transition hover:bg-white/20 active:scale-95"
              type="button"
              title="Clear picked ideas"
              aria-label="Clear picked ideas"
            >
              ⌫
            </button>
          )}

          <button
            onClick={onReshuffle}
            disabled={loading}
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl bg-white/10 text-xl text-white shadow-lg transition hover:bg-white/20 active:scale-95 disabled:cursor-wait disabled:opacity-60"
            type="button"
            title="Random again"
            aria-label="Random again"
          >
            <span className={loading ? "animate-spin" : ""} aria-hidden="true">↻</span>
          </button>

          <button
            onClick={onClose}
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl bg-white/10 text-xl text-white transition hover:bg-white/20"
            type="button"
            title="Close"
            aria-label="Close random picks"
          >
            ×
          </button>
        </div>
      </div>

      <div className="grid w-full max-w-[1400px] grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3" onClick={(event) => event.stopPropagation()}>
        {items.map((idea) => {
          const game = findGame(games, idea);
          const isSelected = selectedIds.includes(idea.id);
          const hasCover = !!game?.cover_url;

          return (
            <div key={idea.id} className="relative">
                <Link
                  href={`/idea/${idea.id}`}
                  className={`group relative block h-72 overflow-hidden rounded-3xl border shadow-2xl transition-shadow duration-150 hover:shadow-2xl ${isSelected ? "border-white ring-2 ring-white ring-offset-2 ring-offset-slate-950" : "border-white/10"}`}
                  title="Open idea detail"
                  aria-label={`Open idea detail: ${idea.title}`}
                >
                  {hasCover ? (
                    <div className="absolute inset-0 bg-cover bg-center opacity-60 transition-opacity duration-150 group-hover:opacity-45" style={{ backgroundImage: `url(${game.cover_url})` }} />
                  ) : (
                    <div className="absolute inset-0 bg-slate-800" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="mb-2 line-clamp-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{game?.title || "Unknown Game"}</p>
                    <h3 className="line-clamp-3 text-xl font-black leading-tight text-white">{idea.title}</h3>
                  </div>
                </Link>

                <button
                  onClick={() => onQuickView(idea)}
                  className="absolute left-5 top-5 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/60 bg-black/25 text-lg text-white shadow-lg backdrop-blur-md transition hover:bg-white/15 active:scale-95"
                  type="button"
                  title="Preview"
                  aria-label="Preview idea"
                >
                  <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
                </button>

                <button
                  onClick={() => onToggleSelect(idea)}
                  className={`absolute right-5 top-5 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border text-lg shadow-lg backdrop-blur-md transition active:scale-95 ${isSelected ? "border-white bg-white text-slate-950 dark:bg-white dark:text-slate-950" : "border-white/60 bg-black/25 text-white hover:bg-white/15"}`}
                  type="button"
                  title={isSelected ? "Remove from project tray" : "Pick for project tray"}
                  aria-label={isSelected ? "Remove from project tray" : "Pick for project tray"}
                >
                  {isSelected ? "✓" : ""}
                </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
