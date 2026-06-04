import { describe, it, expect } from "vitest";
import { detectAlerts, alertSummary, type MetricPoint } from "@/lib/health-checks";

const d = (s: string) => new Date(s);

describe("detectAlerts", () => {
  it("flags high resting heart rate", () => {
    const points: MetricPoint[] = [{ type: "resting_heart_rate", value: 108, date: d("2026-06-01") }];
    const alerts = detectAlerts(points);
    expect(alerts.map((a) => a.kind)).toContain("hr_high");
  });

  it("flags low resting heart rate", () => {
    const alerts = detectAlerts([{ type: "resting_heart_rate", value: 36, date: d("2026-06-01") }]);
    expect(alerts.map((a) => a.kind)).toContain("hr_low");
  });

  it("does not flag a normal resting heart rate", () => {
    const alerts = detectAlerts([{ type: "resting_heart_rate", value: 62, date: d("2026-06-01") }]);
    expect(alerts).toHaveLength(0);
  });

  it("flags a SpO2 dip and escalates severity below 88", () => {
    const mild = detectAlerts([{ type: "blood_oxygen", value: 90, date: d("2026-06-01") }]);
    expect(mild[0]).toMatchObject({ kind: "spo2_dip", severity: "attention" });
    const severe = detectAlerts([{ type: "blood_oxygen", value: 85, date: d("2026-06-01") }]);
    expect(severe[0]).toMatchObject({ kind: "spo2_dip", severity: "urgent" });
  });

  it("flags respiratory anomalies outside 8-20 brpm", () => {
    expect(detectAlerts([{ type: "respiratory_rate", value: 24, date: d("2026-06-01") }]).map((a) => a.kind)).toContain("resp_anomaly");
    expect(detectAlerts([{ type: "respiratory_rate", value: 6, date: d("2026-06-01") }]).map((a) => a.kind)).toContain("resp_anomaly");
    expect(detectAlerts([{ type: "respiratory_rate", value: 14, date: d("2026-06-01") }])).toHaveLength(0);
  });

  it("uses the latest resting HR reading", () => {
    const points: MetricPoint[] = [
      { type: "resting_heart_rate", value: 110, date: d("2026-05-01") }, // old, high
      { type: "resting_heart_rate", value: 60, date: d("2026-06-01") }, // recent, normal
    ];
    expect(detectAlerts(points)).toHaveLength(0);
  });

  it("buckets detectedAt to UTC midnight for stable dedupe", () => {
    const alerts = detectAlerts([{ type: "resting_heart_rate", value: 105, date: d("2026-06-01T14:33:00Z") }]);
    expect(alerts[0].detectedAt.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("never emits a diagnosis, only value + threshold context", () => {
    const alerts = detectAlerts([{ type: "blood_oxygen", value: 90, date: d("2026-06-01") }]);
    expect(alerts[0].context).toHaveProperty("value");
    expect(alerts[0].context).toHaveProperty("threshold");
    expect(alertSummary(alerts[0].kind, alerts[0].context)).not.toMatch(/diagnos|disease|condition/i);
  });
});
