"use client";

import { useEffect, useMemo, useState } from "react";
import { kgToLbs, type UnitSystem } from "@/lib/units";

type WorkoutSummary = {
  id: string;
  name: string;
  date: string;
  durationMin: number | null;
  exercises: { id: string; name: string; sets: number | null; reps: number | null; weightKg: number | null }[];
};

type MealSummary = {
  id: string;
  name: string;
  date: string;
  mealType: string | null;
  calories: number | null;
};

type WorkoutPreset = {
  id: string;
  name: string;
  recurringDays: number[];
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function LogCalendar({
  unitSystem,
  onLogFor,
}: {
  unitSystem: UnitSystem;
  onLogFor: (type: "workout" | "meal", date: Date) => void;
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  });
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [meals, setMeals] = useState<MealSummary[]>([]);
  const [presets, setPresets] = useState<WorkoutPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingWorkouts, setEditingWorkouts] = useState(false);
  const [editingMeals, setEditingMeals] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/presets/workouts");
        if (res.ok) {
          const j = await res.json();
          setPresets(j.data.presets);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const from = startOfMonth(month).toISOString();
    const to = endOfMonth(month).toISOString();
    setLoading(true);
    void (async () => {
      try {
        const [wr, mr] = await Promise.all([
          fetch(`/api/workouts?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=100`),
          fetch(`/api/nutrition?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=100`),
        ]);
        if (wr.ok) {
          const j = await wr.json();
          setWorkouts(j.data.workouts);
        }
        if (mr.ok) {
          const j = await mr.json();
          setMeals(j.data.meals);
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, [month]);

  // Build a 42-cell grid covering the month (padded with prev/next month days).
  const cells = useMemo(() => {
    const first = startOfMonth(month);
    const startOffset = first.getDay(); // 0=Sun
    const cellStart = new Date(first);
    cellStart.setDate(first.getDate() - startOffset);
    const arr: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(cellStart);
      d.setDate(cellStart.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [month]);

  const workoutsByDay = useMemo(() => {
    const map = new Map<string, WorkoutSummary[]>();
    for (const w of workouts) {
      const d = new Date(w.date);
      const key = dayKey(d);
      const list = map.get(key) ?? [];
      list.push(w);
      map.set(key, list);
    }
    return map;
  }, [workouts]);

  const mealsByDay = useMemo(() => {
    const map = new Map<string, MealSummary[]>();
    for (const m of meals) {
      const d = new Date(m.date);
      const key = dayKey(d);
      const list = map.get(key) ?? [];
      list.push(m);
      map.set(key, list);
    }
    return map;
  }, [meals]);

  const today = new Date();
  const todayKey = dayKey(today);

  const selectedKey = dayKey(selected);
  const selectedWorkouts = workoutsByDay.get(selectedKey) ?? [];
  const selectedMeals = mealsByDay.get(selectedKey) ?? [];
  const selectedPresets = presets.filter((p) => p.recurringDays.includes(selected.getDay()));

  // Exit edit mode when the selected day changes.
  useEffect(() => {
    setEditingWorkouts(false);
    setEditingMeals(false);
  }, [selectedKey]);

  async function deleteWorkout(id: string) {
    const prev = workouts;
    setWorkouts((ws) => ws.filter((w) => w.id !== id));
    try {
      const res = await fetch(`/api/workouts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    } catch {
      setWorkouts(prev);
    }
  }

  async function deleteMeal(id: string) {
    const prev = meals;
    setMeals((ms) => ms.filter((m) => m.id !== id));
    try {
      const res = await fetch(`/api/nutrition/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    } catch {
      setMeals(prev);
    }
  }

  return (
    <div className="space-y-5">
      {/* Month header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/60 dark:bg-white/[0.06] border border-black/5 dark:border-white/[0.08] active:scale-90 active:bg-white/80 dark:active:bg-white/[0.12] transition-all"
          aria-label="Previous month"
        >
          <svg className="h-4 w-4 text-slate-700 dark:text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-base font-semibold text-slate-900 dark:text-white">
          {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
        </div>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/60 dark:bg-white/[0.06] border border-black/5 dark:border-white/[0.08] active:scale-90 active:bg-white/80 dark:active:bg-white/[0.12] transition-all"
          aria-label="Next month"
        >
          <svg className="h-4 w-4 text-slate-700 dark:text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {DAY_LABELS.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === month.getMonth();
          const isToday = dayKey(d) === todayKey;
          const isSelected = sameDay(d, selected);
          const k = dayKey(d);
          const wCount = workoutsByDay.get(k)?.length ?? 0;
          const mCount = mealsByDay.get(k)?.length ?? 0;
          const hasPreset = presets.some((p) => p.recurringDays.includes(d.getDay()));

          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(new Date(d))}
              className={`group flex aspect-square flex-col items-center justify-start rounded-xl border p-1 transition-all active:scale-95 ${
                isSelected
                  ? "border-transparent bg-accent-500 text-white shadow-lg shadow-accent-500/25"
                  : isToday
                    ? "border-accent-500/30 bg-accent-500/10 dark:bg-accent-500/15 text-accent-600 dark:text-accent-400"
                    : inMonth
                      ? "border-black/[0.06] dark:border-white/[0.06] text-slate-700 dark:text-slate-200 active:bg-black/[0.04] dark:active:bg-white/[0.05]"
                      : "border-black/[0.03] dark:border-white/[0.03] text-slate-300 dark:text-slate-600"
              }`}
            >
              <span className="text-xs font-semibold leading-tight">{d.getDate()}</span>
              <div className="mb-1.5 mt-auto flex items-center gap-0.5">
                {wCount > 0 && (
                  <span
                    className={`h-1 w-1 rounded-full ${
                      isSelected ? "bg-white" : "bg-accent-500"
                    }`}
                  />
                )}
                {mCount > 0 && (
                  <span
                    className={`h-1 w-1 rounded-full ${
                      isSelected ? "bg-white" : "bg-emerald-500"
                    }`}
                  />
                )}
                {hasPreset && wCount === 0 && (
                  <span
                    className={`h-1 w-1 rounded-full ${
                      isSelected ? "bg-white/60" : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Day detail */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {selected.toLocaleDateString(undefined, { weekday: "long" })}
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {selected.toLocaleDateString(undefined, { month: "long", day: "numeric" })}
            </div>
          </div>
          {selectedPresets.length > 0 && (
            <div className="flex flex-wrap justify-end gap-1">
              {selectedPresets.map((p) => (
                <span
                  key={p.id}
                  className="rounded-full bg-accent-500/15 px-2 py-0.5 text-[10px] font-semibold text-accent-600 dark:text-accent-400"
                >
                  {p.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {loading && (
          <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
        )}

        {!loading && (
          <>
            <DaySection
              title="Workouts logged"
              count={selectedWorkouts.length}
              emptyText="No workouts logged"
              accent="accent"
              onAdd={() => onLogFor("workout", selected)}
              editing={editingWorkouts}
              onToggleEdit={() => setEditingWorkouts((v) => !v)}
            >
              {selectedWorkouts.map((w) => (
                <div key={w.id} className="rounded-xl bg-white/50 dark:bg-white/[0.04] border border-black/5 dark:border-white/[0.06] px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {w.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(w.date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        {w.durationMin != null && ` · ${w.durationMin} min`}
                        {w.exercises.length > 0 && ` · ${w.exercises.length} ${w.exercises.length === 1 ? "exercise" : "exercises"}`}
                      </div>
                    </div>
                    {editingWorkouts && (
                      <RemoveButton onClick={() => deleteWorkout(w.id)} label={`Remove ${w.name}`} />
                    )}
                  </div>
                  {w.exercises.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                      {w.exercises.slice(0, 3).map((ex) => (
                        <li key={ex.id} className="truncate">
                          {ex.name}
                          {ex.sets != null && ex.reps != null && ` · ${ex.sets}×${ex.reps}`}
                          {ex.weightKg != null && ` @ ${unitSystem === "imperial" ? `${kgToLbs(ex.weightKg)} lbs` : `${Math.round(ex.weightKg * 10) / 10} kg`}`}
                        </li>
                      ))}
                      {w.exercises.length > 3 && (
                        <li className="text-[11px] text-slate-400">+{w.exercises.length - 3} more</li>
                      )}
                    </ul>
                  )}
                </div>
              ))}
            </DaySection>

            <DaySection
              title="Meals logged"
              count={selectedMeals.length}
              emptyText="No meals logged"
              accent="emerald"
              onAdd={() => onLogFor("meal", selected)}
              editing={editingMeals}
              onToggleEdit={() => setEditingMeals((v) => !v)}
            >
              {selectedMeals.map((m) => (
                <div key={m.id} className="rounded-xl bg-white/50 dark:bg-white/[0.04] border border-black/5 dark:border-white/[0.06] px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {m.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(m.date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        {m.mealType && ` · ${m.mealType}`}
                        {m.calories != null && ` · ${Math.round(m.calories)} cal`}
                      </div>
                    </div>
                    {editingMeals && (
                      <RemoveButton onClick={() => deleteMeal(m.id)} label={`Remove ${m.name}`} />
                    )}
                  </div>
                </div>
              ))}
            </DaySection>
          </>
        )}
      </div>
    </div>
  );
}

function DaySection({
  title,
  count,
  emptyText,
  accent,
  onAdd,
  editing,
  onToggleEdit,
  children,
}: {
  title: string;
  count: number;
  emptyText: string;
  accent: "accent" | "emerald";
  onAdd: () => void;
  editing: boolean;
  onToggleEdit: () => void;
  children?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(count > 0);

  // Auto-expand when the count transitions from 0 to >0 (day-change).
  useEffect(() => {
    setExpanded(count > 0);
  }, [count]);

  const dot = accent === "accent" ? "bg-accent-500" : "bg-emerald-500";
  const addStyle =
    accent === "accent"
      ? "bg-accent-500 text-white shadow-lg shadow-accent-500/25 active:bg-accent-600"
      : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 active:bg-emerald-600";
  const editStyle =
    accent === "accent"
      ? "text-accent-600 dark:text-accent-400"
      : "text-emerald-600 dark:text-emerald-400";

  return (
    <div>
      <div className="flex items-center justify-between py-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-2 active:opacity-60 transition-opacity"
        >
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {title} ({count})
          </span>
          <svg
            className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {count > 0 && expanded && (
          <button
            type="button"
            onClick={onToggleEdit}
            className={`text-xs font-semibold ${editStyle} active:opacity-60 transition-opacity`}
          >
            {editing ? "Done" : "Edit"}
          </button>
        )}
      </div>
      {expanded && (
        <div className="mt-1 space-y-2">
          {count === 0 && (
            <p className="py-3 text-center text-xs text-slate-400">{emptyText}</p>
          )}
          {children}
          <button
            type="button"
            onClick={onAdd}
            className={`mt-1 w-full rounded-xl px-4 py-2 text-sm font-semibold transition-all active:scale-[0.98] ${addStyle}`}
          >
            + Log {accent === "accent" ? "workout" : "meal"} for this day
          </button>
        </div>
      )}
    </div>
  );
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-500 active:scale-90 active:bg-rose-500/25 transition-all"
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  );
}
