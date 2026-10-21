import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

export const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 text-sm font-medium text-fg shadow-sm outline-none transition placeholder:text-fg-4 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = "", ...props },
  ref,
) {
  return <input ref={ref} className={`${inputClass} h-11 ${className}`} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className = "", ...props },
  ref,
) {
  return <textarea ref={ref} className={`${inputClass} py-3 leading-6 ${className}`} {...props} />;
});

export function FieldLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`mb-1.5 block text-xs font-medium text-fg-3 ${className}`}>{children}</span>;
}

/** Label + control, stacked. */
export function Field({ label, children, className = "" }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </label>
  );
}
