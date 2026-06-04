"use client";

import { useEffect, useState } from "react";

interface Goal {
  id: string;
  type: string;
  title: string;
  targetValue: number;
  targetUnit: string | null;
  startValue: number;
  current: number | null;
  progress: number | null;
  complete: boolean;
  remaining: number | null;
  status: string;
  deadline: string | null;
  daysLeft: number | null;
}

const TYPE_OPTIONS = [
  { value: "weight", label: "Weight", unit: "kg", metric: "weight" },
  { value: "strength_pr", label: "Strength PR", unit: "kg", metric: null },
  { value: "distance", label: "Distance", unit: "km", metric: "distance" },
  { value: "habit_streak", label: "Streak", unit: "days", metric: null },
  { value: "custom", label: "Custom", unit: "", metric: null },
] as const;

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [showForm, setShowForm] = useState(false);

  // form state
  const [type, setType] = useState<string>("weight");
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("kg");
  const [streakType, setStreakType] = useState("workout");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await fetch("/api/goals", { headers: { "X-Requested-With": "XMLHttpRequest" } });
    const j = await r.json();
    if (j?.success) setGoals(j.data.goals as Goal[]);
  }
  useEffect(() => {
    load();
  }, []);

  function onTypeChange(v: string) {
    setType(v);
    const opt = TYPE_OPTIONS.find((o) => o.value === v);
    if (opt) setUnit(opt.unit);
  }

  async function create() {
    if (!title.trim() || !target) return;
    setSaving(true);
    const opt = TYPE_OPTIONS.find((o) => o.value === type);
    const payload: Record<string, unknown> = {
      type,
      title: title.trim(),
      targetValue: Number(target),
      targetUnit: unit || undefined,
    };
    if (opt?.metric) payload.metricType = opt.metric;
    if (type === "habit_streak") payload.streakType = streakType;
    if (deadline) payload.deadline = deadline;
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowForm(false);
        setTitle("");
        setTarget("");
        setDeadline("");
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function update(id: string, status: string) {
    await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/goals/${id}`, { method: "DELETE", headers: { "X-Requested-With": "XMLHttpRequest" } });
    await load();
  }

  const active = goals?.filter((g) => g.status === "active" || g.status === "paused") ?? [];
  const completed = goals?.filter((g) => g.status === "completed") ?? [];

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Goals</h1>
          <p className="mt-1 text-sm text-slate-400">Targets with a finish line.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white transition-all active:scale-95"
        >
          {showForm ? "Close" : "New goal"}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Type</label>
            <select value={type} onChange={(e) => onTypeChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-white">
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cut to 75 kg" className="w-full rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-white" />
          </div>
          {type === "habit_streak" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Streak</label>
              <select value={streakType} onChange={(e) => setStreakType(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-white">
                <option value="workout">Workout</option>
                <option value="meal">Meal</option>
                <option value="bubble">Daily Orb</option>
              </select>
            </div>
          )}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-400">Target</label>
              <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-white" />
            </div>
            <div className="w-24">
              <label className="mb-1 block text-xs font-medium text-slate-400">Unit</label>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Deadline (optional)</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-white" />
          </div>
          <button onClick={create} disabled={saving || !title.trim() || !target} className="w-full rounded-xl bg-accent-500 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40">
            {saving ? "Creating..." : "Create goal"}
          </button>
        </div>
      )}

      {goals === null ? (
        <div className="card h-24 animate-pulse" />
      ) : (
        <>
          {active.length === 0 && !showForm && (
            <div className="card mb-6 text-center">
              <p className="text-sm text-slate-400">No active goals yet. Set one to start tracking progress.</p>
            </div>
          )}

          <div className="space-y-3">
            {active.map((g) => (
              <GoalCard key={g.id} goal={g} onPause={() => update(g.id, g.status === "paused" ? "active" : "paused")} onDelete={() => remove(g.id)} />
            ))}
          </div>

          {completed.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Completed</h2>
              <div className="space-y-2">
                {completed.map((g) => (
                  <div key={g.id} className="card flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{g.title}</span>
                    </div>
                    <button onClick={() => remove(g.id)} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">Remove</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GoalCard({ goal, onPause, onDelete }: { goal: Goal; onPause: () => void; onDelete: () => void }) {
  const pct = goal.progress ?? 0;
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">{goal.title}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {goal.current !== null ? `${formatNum(goal.current)} → ${formatNum(goal.targetValue)} ${goal.targetUnit ?? ""}` : `Target ${formatNum(goal.targetValue)} ${goal.targetUnit ?? ""}`}
            {goal.daysLeft !== null && goal.daysLeft >= 0 && ` · ${goal.daysLeft} days left`}
            {goal.daysLeft !== null && goal.daysLeft < 0 && ` · past deadline`}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button onClick={onPause} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">{goal.status === "paused" ? "Resume" : "Pause"}</button>
          <button onClick={onDelete} className="text-slate-400 hover:text-red-500">Delete</button>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className={`h-full rounded-full transition-[width] duration-700 ${pct >= 100 ? "bg-emerald-500" : "bg-accent-500"}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="w-10 text-right text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">{goal.progress ?? "—"}%</span>
      </div>
    </div>
  );
}

function formatNum(v: number): string {
  return Number.isInteger(v) ? v.toString() : (Math.round(v * 10) / 10).toString();
}
