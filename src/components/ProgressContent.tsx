"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import GlassSelect from "./GlassSelect";
import { getMetricColor, type UserGoals } from "@/lib/metric-grading";

interface Metric {
  id: string;
  type: string;
  value: number;
  unit: string;
  source: string | null;
  date: string; // ISO string from server
}

interface ProgressContentProps {
  workouts: { id: string; date: string }[];
  meals: { id: string; date: string }[];
  metrics: Metric[];
  goals?: UserGoals;
}

const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7", label: "Last 7 Days" },
  { value: "30", label: "Last 30 Days" },
  { value: "60", label: "Last 60 Days" },
  { value: "90", label: "Last 90 Days" },
  { value: "all", label: "All Time" },
];

const METRIC_LABELS: Record<string, string> = {
  steps: "Steps",
  heart_rate: "Heart Rate",
  resting_heart_rate: "Resting Heart Rate",
  sleep_hours: "Sleep",
  calories_burned: "Calories Burned",
  calories_logged: "Calories Logged",
  active_calories: "Active Calories",
  blood_oxygen: "Blood Oxygen",
  respiratory_rate: "Respiratory Rate",
  hrv: "Heart Rate Variability",
  weight: "Weight",
  skin_temperature: "Skin Temperature",
  blood_pressure_systolic: "Blood Pressure (Systolic)",
  blood_pressure_diastolic: "Blood Pressure (Diastolic)",
  blood_glucose: "Blood Glucose",
  vo2_max: "VO2 Max",
  body_fat_percentage: "Body Fat",
  distance: "Distance",
  floors_climbed: "Floors Climbed",
  stress_level: "Stress Level",
  body_battery: "Body Battery",
};

function metricLabel(type: string): string {
  return METRIC_LABELS[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function filterByRange<T extends { date: string }>(items: T[], range: string): T[] {
  if (range === "all") return items;
  if (range === "today") {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return items.filter((item) => new Date(item.date) >= start);
  }
  const days = parseInt(range, 10);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return items.filter((item) => new Date(item.date) >= cutoff);
}

const ROWS_PER_PAGE = 3;

export default function ProgressContent({ workouts, meals, metrics, goals = {} }: ProgressContentProps) {
  const [range, setRange] = useState("30");
  const [activePage, setActivePage] = useState(0);
  const [fading, setFading] = useState(false);
  const touchRef = useRef<number | null>(null);

  const filteredWorkouts = useMemo(() => filterByRange(workouts, range), [workouts, range]);
  const filteredMeals = useMemo(() => filterByRange(meals, range), [meals, range]);
  const filteredMetrics = useMemo(() => filterByRange(metrics, range), [metrics, range]);

  const grouped = useMemo(() => {
    return filteredMetrics.reduce(
      (acc, m) => {
        if (!acc[m.type]) acc[m.type] = [];
        acc[m.type].push(m);
        return acc;
      },
      {} as Record<string, Metric[]>,
    );
  }, [filteredMetrics]);

  const metricEntries = useMemo(() => {
    return Object.entries(grouped).map(([type, items]) => {
      const sorted = [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latest = sorted[0];
      const avg = items.reduce((sum, i) => sum + i.value, 0) / items.length;
      return { type, items, latest, avg };
    });
  }, [grouped]);

  const pages = useMemo(() => {
    const result: typeof metricEntries[] = [];
    for (let i = 0; i < metricEntries.length; i += ROWS_PER_PAGE) {
      result.push(metricEntries.slice(i, i + ROWS_PER_PAGE));
    }
    return result;
  }, [metricEntries]);

  const totalPages = pages.length;

  // Reset to page 0 when range changes
  useEffect(() => { setActivePage(0); }, [range]);

  // Fade to a new page
  const goToPage = useCallback((page: number) => {
    if (page === activePage || page < 0 || page >= totalPages) return;
    setFading(true);
    setTimeout(() => {
      setActivePage(page);
      setFading(false);
    }, 150);
  }, [activePage, totalPages]);

  // Touch swipe detection
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchRef.current = e.touches[0].clientX;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchRef.current === null) return;
    const diff = touchRef.current - e.changedTouches[0].clientX;
    touchRef.current = null;
    if (Math.abs(diff) < 50) return; // too small
    if (diff > 0) goToPage(activePage + 1);  // swipe left → next
    else goToPage(activePage - 1);            // swipe right → prev
  }, [activePage, goToPage]);

  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === range)?.label ?? "Last 30 Days";
  const currentPage = pages[activePage] ?? [];

  return (
    <>
      {/* Filter */}
      <div className="mb-5">
        <GlassSelect
          value={range}
          onChange={setRange}
          options={RANGE_OPTIONS}
          placeholder="Select range"
        />
      </div>

      {/* Summary card */}
      <div className="card mb-6 bg-gradient-to-br from-accent-50/80 to-violet-50/60 dark:from-accent-900/20 dark:to-violet-900/20 border-accent-100/40 dark:border-accent-500/20">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {rangeLabel}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-3xl font-bold text-accent-600 dark:text-accent-400">{filteredWorkouts.length}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Workouts</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-accent-600 dark:text-accent-400">{filteredMeals.length}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Meals Logged</p>
          </div>
        </div>
      </div>

      {/* Metrics carousel */}
      {metricEntries.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <svg className="h-7 w-7 text-slate-300 dark:text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" /><path d="M7 16l4-4 4 4 6-7" />
            </svg>
          </div>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No health metrics in this range.</p>
          <p className="mt-1 text-xs text-slate-400">Start logging or connect a wearable to see data here.</p>
        </div>
      ) : (
        <div className="mb-6">
          {/* Single unified card with fade transition */}
          <div
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            className="card overflow-hidden !p-0"
          >
            <div
              className="transition-opacity duration-150"
              style={{ opacity: fading ? 0 : 1 }}
            >
              {currentPage.map(({ type, items, latest, avg }, idx) => (
                <div key={type}>
                  {idx > 0 && (
                    <div className="mx-5 border-t border-black/[0.04] dark:border-white/[0.06]" />
                  )}
                  <div className="flex items-center gap-3.5 px-5 py-4">
                    {/* Graded accent bar — color reflects how the latest reading compares to medical/personal goals */}
                    <div className={`w-1 self-stretch rounded-full ${getMetricColor(type, latest.value, goals)}`} />

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{metricLabel(type)}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {items.length} reading{items.length !== 1 ? "s" : ""} · avg {avg.toFixed(1)} {latest.unit}
                      </p>
                    </div>

                    {/* Value */}
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{latest.value.toFixed(1)}</p>
                      <p className="text-[11px] text-slate-400">{latest.unit}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dot indicators */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-1.5">
              {pages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToPage(idx)}
                  className={`h-2 rounded-full transition-all duration-200 ${
                    idx === activePage
                      ? "w-5 bg-accent-500"
                      : "w-2 bg-slate-300 dark:bg-slate-600"
                  }`}
                  aria-label={`Go to page ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
