"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckIcon,
  ClipboardDocumentCheckIcon,
  PencilSquareIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AppSidebar } from "@/components/AppSidebar";
import { AppPageHeader, appPageMainClass, appPageRootClass } from "@/components/AppPage";
import { useNotifications } from "@/components/NotificationCenter";

const STORAGE_KEY = "gamekb-daily-todos-v1";
const LEGACY_STORAGE_KEY = "gamekb-daily-goal-v1";
const DAILY_TEMPLATE_VERSION = 1;

const DEFAULT_DAILY_TASKS = [
  { id: "default-day-add-ideas", text: "Trong ngày: Add ít nhất 20 idea vào trang web" },
  { id: "default-day-plan-shorts", text: "Trong ngày: Lên ý tưởng ít nhất 2 video short để tối làm" },
  { id: "default-night-finish-short", text: "Tối: Hoàn thành ít nhất 1 video short" },
  { id: "default-night-long-video", text: "Tối: Hoàn thành ít nhất 1 phút long video" },
] as const;

type TodoItem = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
};

type DailyTodoState = {
  date: string;
  items: TodoItem[];
  seedVersion?: number;
};

function todayKey() {
  return new Date().toLocaleDateString("en-CA");
}

function makeTodo(text: string, id?: string): TodoItem {
  return {
    id: id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    completed: false,
    createdAt: Date.now(),
  };
}

function getDefaultItems(): TodoItem[] {
  return DEFAULT_DAILY_TASKS.map((task) => makeTodo(task.text, task.id));
}

function normalizeTaskText(text: string) {
  return text.trim().toLocaleLowerCase();
}

function seedDefaultTasks(items: TodoItem[], seedVersion = 0): { items: TodoItem[]; seedVersion: number } {
  if (seedVersion >= DAILY_TEMPLATE_VERSION) return { items, seedVersion };

  const existingIds = new Set(items.map((item) => item.id));
  const existingTexts = new Set(items.map((item) => normalizeTaskText(item.text)));
  const missingDefaults = DEFAULT_DAILY_TASKS.filter(
    (task) => !existingIds.has(task.id) && !existingTexts.has(normalizeTaskText(task.text)),
  ).map((task) => makeTodo(task.text, task.id));

  return {
    items: [...missingDefaults, ...items],
    seedVersion: DAILY_TEMPLATE_VERSION,
  };
}

function resetForNewDay(state: DailyTodoState): DailyTodoState {
  return {
    ...state,
    date: todayKey(),
    items: state.items.map((item) => ({ ...item, completed: false })),
  };
}

function getEmptyState(): DailyTodoState {
  return {
    date: todayKey(),
    items: getDefaultItems(),
    seedVersion: DAILY_TEMPLATE_VERSION,
  };
}

function formatToday() {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export default function DailyGoalPage() {
  const { success, info } = useNotifications();
  const [todoState, setTodoState] = useState<DailyTodoState>(getEmptyState);
  const [newTask, setNewTask] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as DailyTodoState;
        const validItems = Array.isArray(parsed.items) ? parsed.items : [];
        const seeded = seedDefaultTasks(validItems, parsed.seedVersion ?? 0);
        const restored: DailyTodoState = {
          date: parsed.date || todayKey(),
          items: seeded.items,
          seedVersion: seeded.seedVersion,
        };

        setTodoState(restored.date === todayKey() ? restored : resetForNewDay(restored));
      } else {
        // Migrate the previous single-goal format while seeding the recurring daily checklist.
        const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
        const initial = getEmptyState();
        if (legacy) {
          const parsedLegacy = JSON.parse(legacy) as { title?: string };
          const title = parsedLegacy.title?.trim();
          if (title && !initial.items.some((item) => normalizeTaskText(item.text) === normalizeTaskText(title))) {
            initial.items.push(makeTodo(title));
          }
        }
        setTodoState(initial);
      }
    } catch {
      setTodoState(getEmptyState());
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todoState));
  }, [todoState, loaded]);

  useEffect(() => {
    if (!loaded) return;

    const checkForNewDay = () => {
      setTodoState((current) => (current.date === todayKey() ? current : resetForNewDay(current)));
    };

    checkForNewDay();
    const intervalId = window.setInterval(checkForNewDay, 60_000);
    window.addEventListener("focus", checkForNewDay);
    document.addEventListener("visibilitychange", checkForNewDay);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", checkForNewDay);
      document.removeEventListener("visibilitychange", checkForNewDay);
    };
  }, [loaded]);

  const completedCount = useMemo(
    () => todoState.items.filter((item) => item.completed).length,
    [todoState.items],
  );
  const totalCount = todoState.items.length;
  const openCount = totalCount - completedCount;
  const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const addTask = () => {
    const text = newTask.trim();
    if (!text) {
      addInputRef.current?.focus();
      return;
    }

    setTodoState((current) => ({
      ...current,
      items: [...current.items, makeTodo(text)],
    }));
    setNewTask("");
    addInputRef.current?.focus();
  };

  const toggleTask = (id: string) => {
    const currentItem = todoState.items.find((item) => item.id === id);
    if (!currentItem) return;

    setTodoState((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item,
      ),
    }));

    if (!currentItem.completed) success("One task checked off.", "Nice work");
  };

  const beginEdit = (item: TodoItem) => {
    setEditingId(item.id);
    setEditingText(item.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const saveEdit = () => {
    if (!editingId) return;
    const text = editingText.trim();
    if (!text) return;

    setTodoState((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === editingId ? { ...item, text } : item)),
    }));
    cancelEdit();
  };

  const deleteTask = (id: string) => {
    setTodoState((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== id),
    }));
    if (editingId === id) cancelEdit();
    info("Task removed.", "Daily To-Do");
  };



  return (
    <div className={`${appPageRootClass} xl:flex`}>
      <AppSidebar activePage="dailyGoal" />
      <main className={appPageMainClass}>
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
          <AppPageHeader
            title="Daily To-Do"
            description={<>{formatToday()} · Every checkbox resets automatically when a new day begins.</>}
            icon={<ClipboardDocumentCheckIcon className="h-5 w-5" />}
          />

          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
            <div className="bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 px-5 py-6 text-white sm:px-8 sm:py-8">
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">Today&apos;s progress</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-4xl font-black tabular-nums sm:text-5xl">{completedCount}</span>
                    <span className="text-lg font-black text-white/70">of {totalCount} done</span>
                  </div>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  {totalCount > 0 && completedCount === totalCount ? (
                    <SparklesIcon className="h-7 w-7" />
                  ) : (
                    <ClipboardDocumentCheckIcon className="h-7 w-7" />
                  )}
                </div>
              </div>

              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-white transition-[width] duration-300" style={{ width: `${percentage}%` }} />
              </div>
            </div>

            <div className="p-4 sm:p-7">
              <div className="flex gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100 dark:border-slate-700 dark:bg-slate-950 dark:focus-within:border-violet-500 dark:focus-within:ring-violet-950/50">
                <input
                  ref={addInputRef}
                  value={newTask}
                  onChange={(event) => setNewTask(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addTask();
                  }}
                  className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-600"
                  placeholder="Add a task and press Enter..."
                />
                <button
                  type="button"
                  onClick={addTask}
                  className="flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-violet-600 dark:bg-white dark:text-slate-950 dark:hover:bg-violet-400"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span className="hidden sm:inline">Add task</span>
                </button>
              </div>

              {todoState.items.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-50 text-violet-500 dark:bg-violet-950/40 dark:text-violet-300">
                    <CheckIcon className="h-8 w-8" />
                  </div>
                  <h2 className="mt-5 text-xl font-black">Your list is clear.</h2>
                  <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">Add the few things that would make today feel like a win.</p>
                </div>
              ) : (
                <div className="mt-5 space-y-2">
                  {todoState.items.map((item) => {
                    const isEditing = editingId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 transition sm:px-4 ${
                          item.completed
                            ? "border-emerald-100 bg-emerald-50/70 dark:border-emerald-950 dark:bg-emerald-950/20"
                            : "border-slate-200 bg-white hover:border-violet-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:hover:border-violet-900"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleTask(item.id)}
                          className={`flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 transition ${
                            item.completed
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-slate-300 bg-white text-transparent hover:border-violet-500 dark:border-slate-600 dark:bg-slate-900"
                          }`}
                          aria-label={item.completed ? "Mark task incomplete" : "Mark task complete"}
                        >
                          <CheckIcon className="h-4 w-4 stroke-[3]" />
                        </button>

                        {isEditing ? (
                          <input
                            value={editingText}
                            onChange={(event) => setEditingText(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") saveEdit();
                              if (event.key === "Escape") cancelEdit();
                            }}
                            autoFocus
                            className="h-10 min-w-0 flex-1 rounded-xl border border-violet-300 bg-white px-3 text-sm font-bold outline-none ring-4 ring-violet-100 dark:border-violet-700 dark:bg-slate-900 dark:ring-violet-950/40"
                          />
                        ) : (
                          <button
                            type="button"
                            onDoubleClick={() => beginEdit(item)}
                            className={`min-w-0 flex-1 cursor-text text-left text-sm font-bold leading-6 ${
                              item.completed
                                ? "text-slate-400 line-through decoration-2 dark:text-slate-500"
                                : "text-slate-800 dark:text-slate-100"
                            }`}
                          >
                            {item.text}
                          </button>
                        )}

                        <div className="flex shrink-0 items-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={saveEdit}
                                disabled={!editingText.trim()}
                                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                aria-label="Save task"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                aria-label="Cancel editing"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => beginEdit(item)}
                              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-slate-400 opacity-100 transition hover:bg-violet-50 hover:text-violet-600 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-violet-950/30 dark:hover:text-violet-300"
                              aria-label="Edit task"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => deleteTask(item.id)}
                            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-slate-400 opacity-100 transition hover:bg-rose-50 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
                            aria-label="Delete task"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {totalCount > 0 && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs font-black uppercase tracking-[0.14em] text-slate-400 dark:border-slate-800 dark:text-slate-500">
                  <span>{openCount === 0 ? "Everything is done ✦" : `${openCount} ${openCount === 1 ? "task" : "tasks"} left`}</span>
                  <span>{percentage}% complete</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
