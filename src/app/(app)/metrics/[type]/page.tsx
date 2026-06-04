"use client";

import { useEffect, useState } from "react";

interface MetricDetail {
  type: string;
  label: string;
  unit: string;
  latest: number | null;
  grade: "excellent" | "good" | "ok" | "poor" | null;
  baseline: { mean: number; stddev: number; sampleSize: number } | null;
  series: Array<{ date: string; value: number }>;
}

const GRADE_STYLE: Record<string, { text: string; label: string }> = {
  excellent: { text: "text-emerald-500", label: "Excellent" },
  good: { text: "text-blue-500", label: "Good" },
  ok: { text: "text-amber-500", label: "OK" },
  poor: { text: "text-red-500", label: "Needs attention" },
};

export default function MetricDetailPage({ params }: { params: { type: string } }) {
  const [data, setData] = useState<MetricDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/flow/metric/${params.type}`, { headers: { "X-Requested-With": "XMLHttpRequest" } })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.success) setData(j.data as MetricDetail);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.type]);

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-24">
      <a href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        Dashboard
      </a>

      {loading ? (
        <div className="card h-64 animate-pulse" />
      ) : !data ? (
        <div className="card">
          <p className="text-sm text-slate-400">Could not load this metric.</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{data.label}</h1>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                {data.latest !== null ? formatValue(data.latest) : "—"}
              </span>
              <span className="text-sm text-slate-400">{data.unit}</span>
              {data.grade && (
                <span className={`ml-2 text-sm font-semibold ${GRADE_STYLE[data.grade].text}`}>
                  {GRADE_STYLE[data.grade].label}
                </span>
              )}
            </div>
          </div>

          {/* Trend chart */}
          <div className="card mb-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Last 30 days</p>
            {data.series.length >= 2 ? (
              <TrendChart series={data.series} baseline={data.baseline?.mean ?? null} />
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">Not enough data yet to chart a trend.</p>
            )}
          </div>

          {/* Personal baseline */}
          {data.baseline && data.baseline.sampleSize > 0 && (
            <div className="card mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your baseline</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {formatValue(data.baseline.mean)}
                </span>
                <span className="text-sm text-slate-400">{data.unit} average</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Based on {data.baseline.sampleSize} reading{data.baseline.sampleSize === 1 ? "" : "s"} over the last 30 days
                {data.latest !== null && (
                  <> · today is {deltaText(data.latest, data.baseline.mean)}</>
                )}
              </p>
            </div>
          )}

          {/* What this means */}
          <div className="card mb-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">What this means</p>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{explain(data)}</p>
          </div>

          {/* Pro insight slot */}
          <div className="card border-dashed border-accent-200 bg-accent-50/40 dark:border-accent-500/30 dark:bg-accent-900/10">
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-accent-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" /></svg>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Wynn&apos;s deep-dive</p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  Personalized correlations and what to do about this metric are part of Waier Pro.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatValue(v: number): string {
  if (Number.isInteger(v)) return v.toLocaleString();
  return (Math.round(v * 10) / 10).toLocaleString();
}

function deltaText(latest: number, mean: number): string {
  const diff = latest - mean;
  if (Math.abs(diff) < mean * 0.02) return "right on your average";
  const pct = Math.round((Math.abs(diff) / mean) * 100);
  return `${pct}% ${diff > 0 ? "above" : "below"} average`;
}

function explain(data: MetricDetail): string {
  if (data.latest === null) return "Log or sync this metric to see how it trends and how it compares to your personal baseline.";
  if (!data.grade) return "This metric is tracked for your records and trends.";
  const g = GRADE_STYLE[data.grade].label.toLowerCase();
  return `Your latest ${data.label.toLowerCase()} reading grades as ${g} against healthy ranges and your goals. Detail pages update as new data syncs from your wearable or manual logs.`;
}

// ── Minimal SVG trend chart with an optional baseline line ──
function TrendChart({ series, baseline }: { series: Array<{ date: string; value: number }>; baseline: number | null }) {
  const W = 320;
  const H = 120;
  const PAD = 8;
  const values = series.map((s) => s.value);
  const min = Math.min(...values, baseline ?? Infinity);
  const max = Math.max(...values, baseline ?? -Infinity);
  const range = max - min || 1;
  const x = (i: number) => PAD + (i / (series.length - 1)) * (W - 2 * PAD);
  const y = (v: number) => H - PAD - ((v - min) / range) * (H - 2 * PAD);

  const points = series.map((s, i) => `${x(i)},${y(s.value)}`).join(" ");
  const baselineY = baseline !== null ? y(baseline) : null;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      {baselineY !== null && (
        <line x1={PAD} y1={baselineY} x2={W - PAD} y2={baselineY} stroke="currentColor" strokeOpacity="0.2" strokeDasharray="4 4" />
      )}
      <polyline points={points} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {series.map((s, i) => (
        <circle key={i} cx={x(i)} cy={y(s.value)} r="2.5" fill="#8b5cf6" />
      ))}
    </svg>
  );
}
