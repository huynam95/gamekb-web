/**
 * Recording List: ideas Nam records himself.
 * Stored on `details` (capture_status, capture_notes, capture_priority,
 * capture_added_at, recorded_at). Own recordings are footage rows with label "own".
 */

export type CaptureStatus = "to_record" | "recorded" | "used";

export const CAPTURE_STATUSES: CaptureStatus[] = ["to_record", "recorded", "used"];

export const OWN_FOOTAGE_LABEL = "own";

export const CAPTURE_META: Record<CaptureStatus, { label: string; short: string; dot: string; pill: string; onDark: string }> = {
  to_record: {
    label: "To record",
    short: "To record",
    dot: "bg-rose-500",
    pill: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    onDark: "border-rose-400/30 bg-rose-500/25 text-rose-100",
  },
  recorded: {
    label: "Recorded",
    short: "Recorded",
    dot: "bg-emerald-500",
    pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    onDark: "border-emerald-400/30 bg-emerald-500/25 text-emerald-100",
  },
  used: {
    label: "Used in a video",
    short: "Used",
    dot: "bg-slate-400",
    pill: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    onDark: "border-white/15 bg-white/10 text-white/80",
  },
};

export const PRIORITY_META: Record<number, { label: string; className: string }> = {
  1: { label: "Record first", className: "text-rose-600 dark:text-rose-300" },
  2: { label: "Normal", className: "text-fg-3" },
  3: { label: "Later", className: "text-fg-4" },
};

export function isCaptureStatus(value: unknown): value is CaptureStatus {
  return typeof value === "string" && (CAPTURE_STATUSES as string[]).includes(value);
}

/** Database patch for moving an idea to a recording status (null = take it off the list). */
export function captureStatusPatch(status: CaptureStatus | null, previous?: { capture_added_at?: string | null; recorded_at?: string | null }) {
  const now = new Date().toISOString();
  if (status === null) return { capture_status: null, capture_added_at: null, recorded_at: null };
  return {
    capture_status: status,
    capture_added_at: previous?.capture_added_at ?? now,
    recorded_at: status === "to_record" ? null : previous?.recorded_at ?? now,
  };
}

/** True when the database has not been given the recording columns yet. */
export function isMissingRecordingColumns(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return false;
  return error.code === "42703" || error.code === "PGRST204" || /capture_(status|notes|priority|added_at)|recorded_at/.test(error.message || "");
}

export const RECORDING_SETUP_MESSAGE =
  "The Recording List needs a small database update (database/migrations/20261026_add_recording_list.sql). Run it in Supabase, then reload.";
