"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";

type NoticeKind = "success" | "error" | "warning" | "info";

type NoticeInput = {
  kind?: NoticeKind;
  title?: string;
  message: string;
  duration?: number;
};

type ConfirmInput = {
  kind?: NoticeKind;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
};

type NoticeState = Required<Pick<NoticeInput, "kind" | "message">> & {
  id: number;
  title?: string;
  duration: number;
};

type ConfirmState = Required<Pick<ConfirmInput, "kind" | "message" | "confirmText" | "cancelText">> & {
  id: number;
  title?: string;
  resolve: (value: boolean) => void;
};

type NotificationContextValue = {
  notify: (input: string | NoticeInput) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  confirm: (input: string | ConfirmInput) => Promise<boolean>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const KIND_STYLE: Record<NoticeKind, { icon: typeof CheckCircleIcon; accent: string; button: string; label: string }> = {
  success: {
    icon: CheckCircleIcon,
    accent: "from-emerald-400 to-teal-500 shadow-emerald-500/20",
    button: "bg-emerald-600 hover:bg-emerald-700",
    label: "Success",
  },
  error: {
    icon: XCircleIcon,
    accent: "from-rose-400 to-red-500 shadow-rose-500/20",
    button: "bg-rose-600 hover:bg-rose-700",
    label: "Error",
  },
  warning: {
    icon: ExclamationTriangleIcon,
    accent: "from-amber-400 to-orange-500 shadow-amber-500/20",
    button: "bg-amber-600 hover:bg-amber-700",
    label: "Heads up",
  },
  info: {
    icon: InformationCircleIcon,
    accent: "from-blue-400 to-indigo-500 shadow-blue-500/20",
    button: "bg-blue-600 hover:bg-blue-700",
    label: "Notice",
  },
};

function normalizeNotice(input: string | NoticeInput): NoticeState {
  const payload: NoticeInput = typeof input === "string" ? { message: input } : input;
  return {
    id: Date.now(),
    kind: payload.kind ?? "info",
    title: payload.title,
    message: payload.message,
    duration: payload.duration ?? 2400,
  };
}

function normalizeConfirm(input: string | ConfirmInput, resolve: (value: boolean) => void): ConfirmState {
  const payload: ConfirmInput = typeof input === "string" ? { message: input } : input;
  return {
    id: Date.now(),
    kind: payload.kind ?? "warning",
    title: payload.title,
    message: payload.message,
    confirmText: payload.confirmText ?? "Confirm",
    cancelText: payload.cancelText ?? "Cancel",
    resolve,
  };
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const notify = useCallback((input: string | NoticeInput) => {
    const nextNotice = normalizeNotice(input);
    clearTimer();
    setNotice(nextNotice);
    if (nextNotice.duration > 0) {
      timerRef.current = window.setTimeout(() => setNotice(null), nextNotice.duration);
    }
  }, [clearTimer]);

  const confirm = useCallback((input: string | ConfirmInput) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState(normalizeConfirm(input, resolve));
    });
  }, []);

  const settleConfirm = useCallback((value: boolean) => {
    setConfirmState((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const value = useMemo<NotificationContextValue>(() => ({
    notify,
    success: (message, title) => notify({ kind: "success", title, message }),
    error: (message, title) => notify({ kind: "error", title, message, duration: 3600 }),
    warning: (message, title) => notify({ kind: "warning", title, message, duration: 3200 }),
    info: (message, title) => notify({ kind: "info", title, message }),
    confirm,
  }), [confirm, notify]);

  const noticeStyle = notice ? KIND_STYLE[notice.kind] : null;
  const confirmStyle = confirmState ? KIND_STYLE[confirmState.kind] : null;
  const NoticeIcon = noticeStyle?.icon;
  const ConfirmIcon = confirmStyle?.icon;

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {notice && noticeStyle && NoticeIcon && (
        <div className="pointer-events-none fixed right-4 top-4 z-[100000] w-[calc(100%-2rem)] max-w-sm sm:right-6 sm:top-6 sm:w-full">
          <div className="pointer-events-auto overflow-hidden rounded-[1.35rem] border border-white/70 bg-white/95 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/5 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95 dark:shadow-black/40 dark:ring-white/10">
            <div className="flex items-start gap-3 p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${noticeStyle.accent}`}>
                <NoticeIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{notice.title || noticeStyle.label}</p>
                <p className="mt-1 text-sm font-black leading-5 text-slate-900 dark:text-slate-50">{notice.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label="Dismiss notification"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmState && confirmStyle && ConfirmIcon && (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" onClick={() => settleConfirm(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl shadow-slate-950/20 dark:border-slate-700 dark:bg-slate-950" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start gap-4 p-6">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${confirmStyle.accent}`}>
                <ConfirmIcon className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{confirmState.title || confirmStyle.label}</p>
                <p className="mt-2 whitespace-pre-wrap text-lg font-black leading-7 text-slate-900 dark:text-slate-50">{confirmState.message}</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/70">
              <button
                type="button"
                onClick={() => settleConfirm(false)}
                className="h-11 cursor-pointer rounded-full border border-slate-200 bg-white px-5 text-xs font-black uppercase tracking-[0.16em] text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                {confirmState.cancelText}
              </button>
              <button
                type="button"
                onClick={() => settleConfirm(true)}
                className={`h-11 cursor-pointer rounded-full px-6 text-xs font-black uppercase tracking-[0.16em] text-white shadow-sm transition active:scale-[0.98] ${confirmStyle.button}`}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used inside NotificationProvider");
  return context;
}
