/**
 * Periodic Health Checks.
 *
 * Scans passively-collected metrics for findings worth surfacing. Heart-rate,
 * blood-oxygen, and respiration anomalies are computed by Waier from threshold
 * rules below. Irregular-rhythm and ECG findings are NOT computed here; per the
 * PRD Regulatory Posture they are pass-through from device-cleared sources only.
 *
 * Nothing here is a diagnosis. Findings are framed as "worth a look" and carry
 * the value + threshold as context, never a clinical conclusion.
 */

export type AlertKind = "hr_high" | "hr_low" | "spo2_dip" | "resp_anomaly";
export type AlertSeverity = "info" | "attention" | "urgent";

export interface MetricPoint {
  type: string;
  value: number;
  date: Date;
}

export interface AlertCandidate {
  kind: AlertKind;
  severity: AlertSeverity;
  detectedAt: Date; // day-bucketed (UTC midnight) for stable dedupe
  context: { value: number; threshold: number; metric: string };
}

function dayBucket(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Latest reading of a given metric type, or null. Assumes input is unsorted. */
function latest(points: MetricPoint[], type: string): MetricPoint | null {
  let best: MetricPoint | null = null;
  for (const p of points) {
    if (p.type !== type) continue;
    if (!best || p.date > best.date) best = p;
  }
  return best;
}

/** Minimum reading (e.g. for SpO2 dips) of a type, or null. */
function minimum(points: MetricPoint[], type: string): MetricPoint | null {
  let best: MetricPoint | null = null;
  for (const p of points) {
    if (p.type !== type) continue;
    if (!best || p.value < best.value) best = p;
  }
  return best;
}

/**
 * Detect alert candidates from a window of recent metric points. Pure: same
 * input always yields the same candidates.
 */
export function detectAlerts(points: MetricPoint[]): AlertCandidate[] {
  const out: AlertCandidate[] = [];

  // Resting heart rate: high or low.
  const rhr = latest(points, "resting_heart_rate") ?? latest(points, "heart_rate");
  if (rhr) {
    if (rhr.value > 100) {
      out.push({ kind: "hr_high", severity: "attention", detectedAt: dayBucket(rhr.date), context: { value: rhr.value, threshold: 100, metric: "resting_heart_rate" } });
    } else if (rhr.value < 40) {
      out.push({ kind: "hr_low", severity: "attention", detectedAt: dayBucket(rhr.date), context: { value: rhr.value, threshold: 40, metric: "resting_heart_rate" } });
    }
  }

  // Blood oxygen: a dip below 92% in the window.
  const spo2 = minimum(points, "blood_oxygen");
  if (spo2 && spo2.value < 92) {
    out.push({ kind: "spo2_dip", severity: spo2.value < 88 ? "urgent" : "attention", detectedAt: dayBucket(spo2.date), context: { value: spo2.value, threshold: 92, metric: "blood_oxygen" } });
  }

  // Respiratory rate: outside 8-20 brpm.
  const resp = latest(points, "respiratory_rate");
  if (resp && (resp.value > 20 || resp.value < 8)) {
    out.push({ kind: "resp_anomaly", severity: "info", detectedAt: dayBucket(resp.date), context: { value: resp.value, threshold: resp.value > 20 ? 20 : 8, metric: "respiratory_rate" } });
  }

  return out;
}

/** Human-readable, non-diagnostic summary for an alert. */
export function alertSummary(kind: AlertKind, context: { value: number; threshold: number }): string {
  switch (kind) {
    case "hr_high":
      return `Resting heart rate read ${Math.round(context.value)} bpm, above the typical ${context.threshold}. Worth a look if it persists.`;
    case "hr_low":
      return `Resting heart rate read ${Math.round(context.value)} bpm, below ${context.threshold}. Common in athletes, but worth noting.`;
    case "spo2_dip":
      return `Blood oxygen dipped to ${Math.round(context.value)}%, below ${context.threshold}%. Consider re-measuring at rest.`;
    case "resp_anomaly":
      return `Respiratory rate read ${Math.round(context.value)} brpm, outside the usual range. Often transient.`;
  }
}
