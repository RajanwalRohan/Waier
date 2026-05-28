"use client";

import { useState, useEffect, useCallback } from "react";
import type { UnitSystem } from "@/lib/units";

interface PercentileMetric {
  type: string;
  label: string;
  userValue: number;
  percentile: number;
  unit: string;
  groupWithData: number;
}

interface PercentileData {
  metrics: PercentileMetric[];
  groupSize: number;
  activeFilters: Record<string, string>;
  message?: string;
}

type FilterKey = "ageRange" | "sex" | "activityLevel" | "fitnessGoal" | "weightRange" | "heightRange" | "medicalConditions";

const PRESETS: { id: string; label: string; icon: React.ReactNode; filters: Record<FilterKey, boolean> }[] = [
  {
    id: "age",
    label: "Age Group",
    icon: <UsersIcon />,
    filters: { ageRange: true, sex: false, activityLevel: false, fitnessGoal: false, weightRange: false, heightRange: false, medicalConditions: false },
  },
  {
    id: "medical",
    label: "Health Profile",
    icon: <HeartPulseIcon />,
    filters: { ageRange: false, sex: false, activityLevel: false, fitnessGoal: false, weightRange: false, heightRange: false, medicalConditions: true },
  },
  {
    id: "fitness",
    label: "Fitness Match",
    icon: <ActivityIcon />,
    filters: { ageRange: true, sex: true, activityLevel: true, fitnessGoal: false, weightRange: true, heightRange: true, medicalConditions: false },
  },
];

function getFilterOptions(unitSystem: UnitSystem): { key: FilterKey; label: string }[] {
  return [
    { key: "ageRange", label: "Age Range" },
    { key: "sex", label: "Sex" },
    { key: "heightRange", label: unitSystem === "imperial" ? "Height (±2 in)" : "Height (±5 cm)" },
    { key: "weightRange", label: unitSystem === "imperial" ? "Weight (±10 lbs)" : "Weight (±4.5 kg)" },
    { key: "activityLevel", label: "Activity Level" },
    { key: "fitnessGoal", label: "Fitness Goal" },
    { key: "medicalConditions", label: "Medical Conditions" },
  ];
}

export default function PercentileRankings({ unitSystem = "imperial" }: { unitSystem?: UnitSystem }) {
  const [activePreset, setActivePreset] = useState("age");
  const [showFilters, setShowFilters] = useState(false);
  const [customFilters, setCustomFilters] = useState<Record<FilterKey, boolean>>(PRESETS[0].filters);
  const [data, setData] = useState<PercentileData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPercentiles = useCallback(async (filters: Record<FilterKey, boolean>) => {
    setLoading(true);
    try {
      const res = await fetch("/api/percentiles", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ filters }),
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPercentiles(customFilters);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function selectPreset(presetId: string) {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePreset(presetId);
    setCustomFilters(preset.filters);
    setShowFilters(false);
    fetchPercentiles(preset.filters);
  }

  function toggleFilter(key: FilterKey) {
    const next = { ...customFilters, [key]: !customFilters[key] };
    setCustomFilters(next);
    setActivePreset("custom");
    fetchPercentiles(next);
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your Rankings</h2>
          <p className="text-xs text-slate-400 mt-0.5">See where you stand compared to others</p>
        </div>
        {data && data.groupSize > 0 && (
          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-white/[0.06] px-2 py-1 rounded-lg">
            {data.groupSize} users
          </span>
        )}
      </div>

      {/* Preset Tabs */}
      <div className="flex gap-2 mb-4">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => selectPreset(preset.id)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
              activePreset === preset.id
                ? "bg-accent-500 text-white shadow-lg shadow-accent-500/25"
                : "bg-white/60 dark:bg-white/[0.06] border border-black/5 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-white/[0.10]"
            }`}
          >
            {preset.icon}
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom Filters Toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mb-3"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="8" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
          <circle cx="6" cy="12" r="2" />
          <circle cx="16" cy="6" r="2" />
          <circle cx="10" cy="18" r="2" />
        </svg>
        {showFilters ? "Hide Filters" : "Custom Filters"}
        <svg
          className={`h-3 w-3 transition-transform ${showFilters ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {showFilters && (
        <div className="rounded-xl bg-white/40 dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06] p-3 mb-4">
          <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-wide font-semibold">
            Match users who share your...
          </p>
          <div className="grid grid-cols-2 gap-2">
            {getFilterOptions(unitSystem).map((opt) => (
              <button
                key={opt.key}
                onClick={() => toggleFilter(opt.key)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  customFilters[opt.key]
                    ? "bg-accent-100/60 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400 border border-accent-200/50 dark:border-accent-500/20"
                    : "bg-white/50 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border border-black/5 dark:border-white/[0.06]"
                }`}
              >
                <span className={`h-3 w-3 rounded-sm border-2 flex items-center justify-center ${
                  customFilters[opt.key]
                    ? "border-accent-500 bg-accent-500"
                    : "border-slate-300 dark:border-slate-600"
                }`}>
                  {customFilters[opt.key] && (
                    <svg className="h-2 w-2 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  )}
                </span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Filter Tags */}
      {data?.activeFilters && Object.keys(data.activeFilters).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {Object.entries(data.activeFilters).map(([key, value]) => (
            <span
              key={key}
              className="inline-flex items-center rounded-lg bg-accent-50 dark:bg-accent-900/20 px-2 py-0.5 text-[10px] font-medium text-accent-600 dark:text-accent-400"
            >
              {value}
            </span>
          ))}
        </div>
      )}

      {/* Results — keep previous data visible during refetch; only show the big spinner on the very first load */}
      {loading && !data ? (
        <div className="flex items-center justify-center py-10">
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-accent-400 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-2 w-2 rounded-full bg-accent-400 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-2 w-2 rounded-full bg-accent-400 animate-bounce" />
          </div>
        </div>
      ) : data?.message && data.metrics.length === 0 ? (
        <div className={`text-center py-8 transition-opacity duration-300 ${loading ? "opacity-50" : "opacity-100"}`}>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <svg className="h-6 w-6 text-slate-300 dark:text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
              <circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{data.message}</p>
          <p className="mt-1 text-xs text-slate-400">Rankings appear when more users join with matching profiles.</p>
        </div>
      ) : (
        <div className={`space-y-4 transition-opacity duration-300 ${loading ? "opacity-50" : "opacity-100"}`}>
          {data?.metrics.map((metric) => (
            <PercentileBar key={metric.type} metric={metric} />
          ))}
          {data?.metrics.length === 0 && !data?.message && (
            <p className="text-center text-sm text-slate-400 py-6">
              Log more health data to see your rankings.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PercentileBar({ metric }: { metric: PercentileMetric }) {
  const { label, userValue, percentile, unit, groupWithData } = metric;

  const color =
    percentile >= 75 ? "from-emerald-400 to-emerald-500" :
    percentile >= 50 ? "from-blue-400 to-blue-500" :
    percentile >= 25 ? "from-amber-400 to-amber-500" :
    "from-rose-400 to-rose-500";

  const textColor =
    percentile >= 75 ? "text-emerald-500" :
    percentile >= 50 ? "text-blue-500" :
    percentile >= 25 ? "text-amber-500" :
    "text-rose-500";

  const bgColor =
    percentile >= 75 ? "bg-emerald-500/10" :
    percentile >= 50 ? "bg-blue-500/10" :
    percentile >= 25 ? "bg-amber-500/10" :
    "bg-rose-500/10";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
          <span className="text-xs text-slate-400">
            {typeof userValue === "number" && !isNaN(userValue)
              ? userValue.toLocaleString()
              : "—"}{" "}
            {unit}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${textColor}`}>{topBottomLabel(percentile)}</span>
          <span className="text-[10px] text-slate-400">of {groupWithData}</span>
        </div>
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700 ease-out`}
          style={{ width: `${Math.max(percentile, 2)}%` }}
        />
      </div>
      <div className="flex items-center justify-end mt-1">
        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${bgColor} ${textColor}`}>
          {percentile >= 75 ? "Top tier" : percentile >= 50 ? "Above average" : percentile >= 25 ? "Building up" : "Getting started"}
        </span>
      </div>
    </div>
  );
}

function topBottomLabel(percentile: number): string {
  if (percentile >= 50) {
    return `Top ${100 - percentile}%`;
  }
  return `Bottom ${percentile}%`;
}

// ── Icons ──

function UsersIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function HeartPulseIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.42 4.58a5.4 5.4 0 00-7.65 0l-.77.78-.77-.78a5.4 5.4 0 00-7.65 7.65l.78.77L12 20.65l7.65-7.65.77-.78a5.4 5.4 0 000-7.64z" />
      <path d="M3.5 12h6l1-3 2 6 1.5-3h6" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
