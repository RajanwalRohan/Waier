/**
 * Lab result evaluation (pure).
 *
 * Classifies a value against an optional reference range. This is descriptive,
 * not diagnostic: "out of range" means outside the lab's stated reference, not
 * a medical conclusion. Either bound may be absent (one-sided ranges).
 */

export type LabStatus = "low" | "in_range" | "high" | "unknown";

export function evaluateLab(value: number, low: number | null, high: number | null): LabStatus {
  if (low === null && high === null) return "unknown";
  if (low !== null && value < low) return "low";
  if (high !== null && value > high) return "high";
  return "in_range";
}

const STATUS_LABEL: Record<LabStatus, string> = {
  low: "Below range",
  in_range: "In range",
  high: "Above range",
  unknown: "No reference",
};

export function labStatusLabel(status: LabStatus): string {
  return STATUS_LABEL[status];
}

const STATUS_COLOR: Record<LabStatus, string> = {
  low: "text-amber-500",
  in_range: "text-emerald-500",
  high: "text-red-500",
  unknown: "text-slate-400",
};

export function labStatusColor(status: LabStatus): string {
  return STATUS_COLOR[status];
}

/** Trend direction from the previous to the latest value. */
export type LabTrend = "up" | "down" | "flat" | "none";

export function labTrend(values: number[]): LabTrend {
  if (values.length < 2) return "none";
  const prev = values[values.length - 2];
  const last = values[values.length - 1];
  const delta = last - prev;
  const threshold = Math.abs(prev) * 0.02; // 2% deadband
  if (Math.abs(delta) <= threshold) return "flat";
  return delta > 0 ? "up" : "down";
}
