"use client";

import { useEffect, useState } from "react";
import { hydrationProgress, formatMl, HYDRATION_QUICK_ADD_ML } from "@/lib/intake";

/**
 * Hydration tracker. Deliberately rendered in literal blue water styling,
 * visually distinct from the light-based Orb, so it is never confused with
 * overall daily progress. Tracked, not scored.
 */
export function HydrationCard() {
  const [goalMl, setGoalMl] = useState(2500);
  const [todayMl, setTodayMl] = useState(0);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const r = await fetch("/api/hydration", { headers: { "X-Requested-With": "XMLHttpRequest" } });
    const j = await r.json();
    if (j?.success) {
      setGoalMl(j.data.goalMl);
      setTodayMl(j.data.todayMl);
    }
    setLoaded(true);
  }
  useEffect(() => {
    load();
  }, []);

  async function add(amountMl: number) {
    setTodayMl((v) => v + amountMl); // optimistic
    await fetch("/api/hydration", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ amountMl }),
    }).catch(() => {});
  }

  const pct = hydrationProgress(todayMl, goalMl);

  return (
    <div className="card mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" /></svg>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Hydration</p>
        </div>
        <p className="text-sm text-slate-400">
          <span className="font-bold text-slate-900 dark:text-white">{loaded ? formatMl(todayMl) : "—"}</span>
          {" / "}
          {formatMl(goalMl)}
        </p>
      </div>

      <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-sky-100 dark:bg-sky-950/40">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>

      <div className="flex gap-2">
        {HYDRATION_QUICK_ADD_ML.map((ml) => (
          <button
            key={ml}
            onClick={() => add(ml)}
            className="flex-1 rounded-xl bg-sky-50 py-2 text-xs font-semibold text-sky-600 transition-all active:scale-95 dark:bg-sky-500/15 dark:text-sky-300"
          >
            +{ml} mL
          </button>
        ))}
      </div>
    </div>
  );
}
