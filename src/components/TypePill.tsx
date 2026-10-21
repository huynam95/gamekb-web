import { getTypeConfig } from "@/lib/detailTypes";

/** Type badge for use on top of game-cover artwork (dark backgrounds). */
export function TypePill({ typeKey }: { typeKey: string }) {
  const config = getTypeConfig(typeKey);
  const Icon = config.Icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold backdrop-blur-md ${config.className}`}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {config.label}
    </span>
  );
}

/** Inline icon + label that follows the page colours (light or dark). */
export function TypeLabel({ typeKey, className = "" }: { typeKey: string; className?: string }) {
  const config = getTypeConfig(typeKey);
  const Icon = config.Icon;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {config.label}
    </span>
  );
}
