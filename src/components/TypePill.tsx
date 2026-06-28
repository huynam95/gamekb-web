import { TYPE_CONFIG } from "@/lib/detailTypes";

export function TypePill({ typeKey }: { typeKey: string }) {
  const config = TYPE_CONFIG[typeKey] || TYPE_CONFIG.default;

  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${config.className}`}>
      {config.label}
    </span>
  );
}
