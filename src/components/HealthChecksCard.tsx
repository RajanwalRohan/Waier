"use client";

import { useEffect, useState } from "react";

interface Alert {
  id: string;
  kind: string;
  severity: "info" | "attention" | "urgent";
  status: string;
  detectedAt: string;
  summary: string;
}

const SEVERITY_DOT: Record<string, string> = {
  info: "bg-blue-400",
  attention: "bg-amber-400",
  urgent: "bg-red-500",
};

/**
 * Surfaces Periodic Health Check findings. With `hideWhenEmpty`, renders
 * nothing when there are no findings (for the dashboard); otherwise shows a
 * reassuring all-clear state.
 */
export function HealthChecksCard({ hideWhenEmpty = false }: { hideWhenEmpty?: boolean }) {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);

  useEffect(() => {
    fetch("/api/health-checks", { headers: { "X-Requested-With": "XMLHttpRequest" } })
      .then((r) => r.json())
      .then((j) => j?.success && setAlerts(j.data.alerts as Alert[]))
      .catch(() => {});
  }, []);

  async function dismiss(id: string) {
    setAlerts((prev) => (prev ? prev.filter((a) => a.id !== id) : prev));
    await fetch("/api/health-checks", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ id, status: "dismissed" }),
    }).catch(() => {});
  }

  if (alerts === null) return null;
  if (alerts.length === 0 && hideWhenEmpty) return null;

  return (
    <div className="card mb-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Health checks</p>
      {alerts.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          All clear. No findings from your recent readings.
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-start gap-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[a.severity]}`} />
              <div className="flex-1">
                <p className="text-sm leading-snug text-slate-700 dark:text-slate-200">{a.summary}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{a.detectedAt}</p>
              </div>
              <button
                onClick={() => dismiss(a.id)}
                className="shrink-0 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
              >
                Dismiss
              </button>
            </div>
          ))}
          <p className="pt-1 text-[11px] leading-relaxed text-slate-400">
            These are informational signals from your wearable, not medical advice. Talk to a healthcare provider about anything that concerns you.
          </p>
        </div>
      )}
    </div>
  );
}
