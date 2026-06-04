"use client";

import { useEffect, useState } from "react";
import { Orb } from "./Orb";

interface FlowData {
  flow: number;
  rawFlow: number;
  tier: string;
  division: number | null;
  label: string;
  calibrating: boolean;
  pillars: { heart: number | null; motion: number | null; recovery: number | null; fuel: number | null; consistency: number | null };
  streaks: { bubble: number; meal: number; workout: number };
  orb: { movePct: number; fuelPct: number; recoverPct: number; focusPct: number; filled: boolean };
}

const PILLAR_LABELS: Array<{ key: keyof FlowData["pillars"]; label: string }> = [
  { key: "heart", label: "Heart" },
  { key: "motion", label: "Motion" },
  { key: "recovery", label: "Recovery" },
  { key: "fuel", label: "Fuel" },
  { key: "consistency", label: "Consistency" },
];

function pillarColor(score: number | null): string {
  if (score === null) return "bg-slate-200 dark:bg-slate-700";
  if (score >= 85) return "bg-emerald-500";
  if (score >= 65) return "bg-blue-500";
  if (score >= 45) return "bg-amber-500";
  return "bg-red-500";
}

export function FlowCard() {
  const [data, setData] = useState<FlowData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/flow", { headers: { "X-Requested-With": "XMLHttpRequest" } })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.success && j.data) setData(j.data as FlowData);
        else setError(true);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return null; // fail quiet — dashboard still works without the Flow card

  const orbFill = data
    ? Math.round((data.orb.movePct + data.orb.fuelPct + data.orb.recoverPct) / 3)
    : 0;

  return (
    <div className="card mb-6">
      {!data ? (
        <div className="flex h-[300px] items-center justify-center">
          <div className="h-44 w-44 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800/60" />
        </div>
      ) : (
        <>
          <Orb
            fillPct={orbFill}
            flow={data.flow}
            rankLabel={data.label}
            bubbleDays={data.streaks.bubble || data.streaks.workout}
            calibrating={data.calibrating}
          />

          {/* Pillar breakdown */}
          <div className="mt-5 space-y-2.5">
            {PILLAR_LABELS.map(({ key, label }) => {
              const score = data.pillars[key];
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full ${pillarColor(score)} transition-[width] duration-700`}
                      style={{ width: `${score ?? 0}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                    {score === null ? "—" : Math.round(score)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Streak chips */}
          <div className="mt-5 flex gap-2">
            <StreakChip label="Meals" days={data.streaks.meal} />
            <StreakChip label="Workouts" days={data.streaks.workout} />
            <div className="ml-auto flex items-center text-xs font-medium text-slate-400">
              {data.orb.filled ? "Orb filled today" : `Orb ${orbFill}% filled`}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StreakChip({ label, days }: { label: string; days: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
      <span className="text-xs font-bold tabular-nums text-accent-500">{days}</span>
      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
}
