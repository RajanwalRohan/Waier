"use client";

import { useEffect, useState } from "react";

interface Wrapped {
  year: number;
  hasData: boolean;
  flowPeak: number | null;
  peakRank: string | null;
  flowGain: number | null;
  totalWorkouts: number;
  totalMeals: number;
  totalDistanceKm: number;
  totalActiveCalories: number;
  longestStreak: number;
  strongestPillar: string | null;
  strongestPillarScore: number | null;
}

export default function WrappedPage() {
  const [data, setData] = useState<Wrapped | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/wrapped", { headers: { "X-Requested-With": "XMLHttpRequest" } })
      .then((r) => r.json())
      .then((j) => {
        if (j?.success) setData(j.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Wrapped</h1>
        <p className="mt-1 text-sm text-slate-400">{data?.year ?? new Date().getFullYear()} in review.</p>
      </div>

      {loading ? (
        <div className="card h-40 animate-pulse" />
      ) : !data || !data.hasData ? (
        <div className="card text-center"><p className="text-sm text-slate-400">Not enough data yet this year. Keep logging and your Wrapped will fill in.</p></div>
      ) : (
        <div className="space-y-4">
          {/* Hero: Flow peak */}
          <div className="card bg-gradient-to-br from-accent-500 to-violet-600 text-center text-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Your peak Flow</p>
            <p className="mt-1 text-6xl font-bold tracking-tight">{data.flowPeak ?? "—"}</p>
            {data.peakRank && <p className="mt-1 text-sm font-semibold text-white/90">{data.peakRank}</p>}
            {data.flowGain !== null && (
              <p className="mt-3 text-sm text-white/80">{data.flowGain >= 0 ? "+" : ""}{data.flowGain} Flow across the year</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Workouts" value={data.totalWorkouts.toLocaleString()} />
            <StatCard label="Meals logged" value={data.totalMeals.toLocaleString()} />
            <StatCard label="Distance" value={`${data.totalDistanceKm.toLocaleString()} km`} />
            <StatCard label="Active calories" value={data.totalActiveCalories.toLocaleString()} />
            <StatCard label="Longest streak" value={`${data.longestStreak} days`} />
            <StatCard label="Strongest pillar" value={data.strongestPillar ?? "—"} sub={data.strongestPillarScore !== null ? `${data.strongestPillarScore}/100` : undefined} />
          </div>

          <div className="card border-dashed border-accent-200 bg-accent-50/40 text-center dark:border-accent-500/30 dark:bg-accent-900/10">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Share your Wrapped</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">A shareable story card and the full Transformation reel are part of Waier Pro.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
