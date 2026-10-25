"use client";

import { useEffect, useRef, type FormEventHandler, type MouseEvent, type ReactNode } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "editor";

const sizes: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  editor: "editor-dialog max-w-[min(80rem,calc(100vw-1rem))]",
};

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: ModalSize;
  /** Extra classes for the panel. */
  className?: string;
  /** Tailwind z-index class for the overlay. */
  zClass?: string;
  /** Render the panel as a <form> so Enter submits. */
  onSubmit?: FormEventHandler<HTMLFormElement>;
  closeOnOverlay?: boolean;
  labelledBy?: string;
};

/**
 * Overlay + panel used by every dialog. Handles Escape, overlay click,
 * background scroll lock, focus and the open animation in one place.
 */
export function Modal({
  open,
  onClose,
  children,
  size = "md",
  className = "",
  zClass = "z-[150]",
  onSubmit,
  closeOnOverlay = true,
  labelledBy,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement & HTMLFormElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previouslyFocused = document.activeElement as HTMLElement | null;
    if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus({ preventScroll: true });

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  // On phones every dialog is a bottom sheet (editors fill the screen); from
  // 640px up it is a centred card. See .modal-sheet in globals.css.
  const panelClass = `modal-panel ${size === "editor" ? "is-editor" : "scroll-dialog"} relative my-auto flex w-full flex-col overflow-hidden rounded-3xl border border-line bg-surface text-fg shadow-2xl outline-none animate-in fade-in zoom-in-95 duration-150 max-sm:zoom-in-100 max-sm:slide-in-from-bottom-10 max-sm:duration-200 ${sizes[size]} ${className}`;
  const stop = (event: MouseEvent) => event.stopPropagation();

  return (
    <div
      className={`modal-overlay modal-sheet fixed inset-0 ${zClass} flex items-center justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-sm animate-in fade-in duration-150`}
      onMouseDown={closeOnOverlay ? () => onCloseRef.current() : undefined}
    >
      {onSubmit ? (
        <form ref={panelRef} onSubmit={onSubmit} onMouseDown={stop} className={panelClass} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1}>
          {size !== "editor" && <span className="sheet-handle" aria-hidden="true" />}
          {children}
        </form>
      ) : (
        <div ref={panelRef} onMouseDown={stop} className={panelClass} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1}>
          {size !== "editor" && <span className="sheet-handle" aria-hidden="true" />}
          {children}
        </div>
      )}
    </div>
  );
}

export function ModalHeader({
  title,
  eyebrow,
  eyebrowClassName = "text-accent",
  onClose,
  id,
  children,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  eyebrowClassName?: string;
  onClose?: () => void;
  id?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line-soft px-5 py-4 sm:px-6 sm:py-5">
      <div className="min-w-0">
        {eyebrow && <p className={`text-[11px] font-semibold uppercase tracking-wider ${eyebrowClassName}`}>{eyebrow}</p>}
        <h2 id={id} className={`${eyebrow ? "mt-1" : ""} truncate text-lg font-bold text-fg sm:text-xl`}>{title}</h2>
        {children}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="touch-target flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-4 transition hover:bg-surface-sunken hover:text-fg"
          aria-label="Close"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

export function ModalBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`min-h-0 flex-1 overflow-y-auto p-5 sm:p-6 ${className}`}>{children}</div>;
}

export function ModalFooter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`modal-footer flex shrink-0 flex-wrap justify-end gap-2 border-t border-line-soft bg-surface-muted px-5 py-3 sm:px-6 sm:py-4 ${className}`}>{children}</div>;
}
