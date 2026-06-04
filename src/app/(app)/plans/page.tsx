"use client";

import { useEffect, useState } from "react";

interface PlanItem {
  id: string;
  kind: string;
  title: string;
  completed?: boolean;
  date?: string;
}
interface Plan {
  id: string;
  name: string;
  kind: string;
  status: string;
  startDate: string;
  endDate: string;
  progress: number;
  done: number;
  total: number;
  today: PlanItem[];
  upcoming: PlanItem[];
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [kind, setKind] = useState("training");
  const [weeks, setWeeks] = useState(8);
  const [creating, setCreating] = useState(false);

  async function load() {
    const r = await fetch("/api/plans", { headers: { "X-Requested-With": "XMLHttpRequest" } });
    const j = await r.json();
    if (j?.success) setPlans(j.data.plans as Plan[]);
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    setCreating(true);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ kind, weeks }),
      });
      if (res.ok) await load();
    } finally {
      setCreating(false);
    }
  }

  async function toggle(planId: string, item: PlanItem) {
    // optimistic
    setPlans((prev) =>
      prev
        ? prev.map((p) =>
            p.id === planId ? { ...p, today: p.today.map((t) => (t.id === item.id ? { ...t, completed: !t.completed } : t)) } : p,
          )
        : prev,
    );
    await fetch(`/api/plan-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ completed: !item.completed }),
    });
    load();
  }

  async function removePlan(id: string) {
    await fetch(`/api/plans/${id}`, { method: "DELETE", headers: { "X-Requested-With": "XMLHttpRequest" } });
    load();
  }

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Plans</h1>
        <p className="mt-1 text-sm text-slate-400">A day-by-day plan to follow.</p>
      </div>

      {plans === null ? (
        <div className="card h-32 animate-pulse" />
      ) : plans.length === 0 ? (
        <div className="card space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Create a plan calibrated to your profile.</p>
          <div className="flex gap-2">
            {[
              { v: "training", label: "Training" },
              { v: "nutrition", label: "Nutrition" },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setKind(o.v)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${kind === o.v ? "bg-accent-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {[4, 8, 12].map((w) => (
              <button
                key={w}
                onClick={() => setWeeks(w)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${weeks === w ? "bg-accent-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}
              >
                {w} weeks
              </button>
            ))}
          </div>
          <button onClick={create} disabled={creating} className="w-full rounded-xl bg-accent-500 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40">
            {creating ? "Building..." : "Generate plan"}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {plans.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{p.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{p.startDate} → {p.endDate} · {p.done}/{p.total} done</p>
                </div>
                <button onClick={() => removePlan(p.id)} className="text-xs text-slate-400 hover:text-red-500">Delete</button>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-accent-500 transition-[width] duration-700" style={{ width: `${p.progress}%` }} />
              </div>

              <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Today</p>
              {p.today.length === 0 ? (
                <p className="text-sm text-slate-400">Nothing scheduled today.</p>
              ) : (
                <div className="space-y-2">
                  {p.today.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => item.kind !== "rest" && toggle(p.id, item)}
                      disabled={item.kind === "rest"}
                      className="flex w-full items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-left transition-all active:scale-[0.99] disabled:opacity-70 dark:bg-slate-800/60"
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${item.completed ? "border-accent-500 bg-accent-500 text-white" : "border-slate-300 dark:border-slate-600"}`}>
                        {item.completed && (
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                        )}
                      </span>
                      <span className={`text-sm ${item.completed ? "text-slate-400 line-through" : "text-slate-900 dark:text-white"}`}>{item.title}</span>
                    </button>
                  ))}
                </div>
              )}

              {p.upcoming.length > 0 && (
                <>
                  <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Coming up</p>
                  <div className="space-y-1.5">
                    {p.upcoming.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 text-sm">
                        <span className="w-16 shrink-0 text-xs text-slate-400">{item.date?.slice(5)}</span>
                        <span className="text-slate-600 dark:text-slate-300">{item.title}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
