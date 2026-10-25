import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger" | "destructive" | "violet";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const base =
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-slate-900 text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200",
  accent: "bg-blue-600 text-white shadow-sm hover:bg-blue-700",
  violet: "bg-violet-600 text-white shadow-sm hover:bg-violet-700",
  secondary: "border border-line bg-surface text-fg-2 shadow-sm hover:border-line-strong hover:bg-surface-hover hover:text-fg",
  ghost: "text-fg-3 hover:bg-surface-sunken hover:text-fg",
  danger: "text-rose-600 hover:bg-danger-soft dark:text-rose-300",
  destructive: "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 rounded-xl px-3 text-xs",
  md: "h-11 rounded-xl px-4 text-sm",
  lg: "h-12 rounded-2xl px-6 text-sm",
  icon: "h-11 w-11 rounded-xl",
  "icon-sm": "h-8 w-8 rounded-lg",
};

/** Class string for anything that should look like a button (links included). */
export function buttonClass({
  variant = "secondary",
  size = "md",
  className = "",
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`.trim();
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className = "", type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClass({ variant, size, className })} {...props} />;
});
