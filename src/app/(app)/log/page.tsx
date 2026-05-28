"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import GlassSelect from "@/components/GlassSelect";
import LogCalendar from "@/components/LogCalendar";
import { kgToLbs, lbsToKg, type UnitSystem } from "@/lib/units";

export default function LogPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "meal" ? "meal" : "workout";
  const [tab, setTab] = useState<"workout" | "meal">(initialTab);
  const [view, setView] = useState<"form" | "calendar">("form");
  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("imperial");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const j = await res.json();
          const sys = j?.data?.profile?.unitSystem as UnitSystem | undefined;
          if (sys) setUnitSystem(sys);
        }
      } catch {}
    })();
  }, []);

  function handleLogFor(type: "workout" | "meal", date: Date) {
    setPendingDate(date);
    setTab(type);
    setView("form");
  }

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-24">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Log</h1>
        <button
          type="button"
          onClick={() => setView((v) => (v === "form" ? "calendar" : "form"))}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/60 dark:bg-white/[0.06] backdrop-blur-md border border-black/5 dark:border-white/[0.08] text-slate-700 dark:text-slate-200 shadow-glass-sm dark:shadow-glass-dark-sm active:scale-90 active:bg-white/80 dark:active:bg-white/[0.12] transition-all"
          aria-label={view === "form" ? "Open calendar" : "Back to form"}
        >
          {view === "form" ? (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9M4 4h4l2 2h10v12H4z" />
            </svg>
          )}
        </button>
      </div>

      <div
        key={view}
        style={{ animation: "pageFade 320ms cubic-bezier(0.32, 0.72, 0, 1) backwards" }}
      >
        {view === "calendar" ? (
          <LogCalendar unitSystem={unitSystem} onLogFor={handleLogFor} />
        ) : (
          <>
            <div className="mb-6 flex rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] p-1">
              {[
                { key: "workout" as const, label: "Workout", icon: <DumbbellTabIcon /> },
                { key: "meal" as const, label: "Meal", icon: <UtensilsTabIcon /> },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`no-press-feedback flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    tab === t.key
                      ? "bg-white/80 dark:bg-white/[0.10] text-slate-900 dark:text-white shadow-glass-sm dark:shadow-glass-dark-sm backdrop-blur-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            <div
              key={tab}
              style={{ animation: "pageFade 280ms cubic-bezier(0.32, 0.72, 0, 1) backwards" }}
            >
              {tab === "workout" ? (
                <WorkoutForm
                  unitSystem={unitSystem}
                  initialDate={pendingDate}
                  onClearInitialDate={() => setPendingDate(null)}
                />
              ) : (
                <MealForm
                  initialDate={pendingDate}
                  onClearInitialDate={() => setPendingDate(null)}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DumbbellTabIcon() {
  return (<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6.5 7.5v9M17.5 7.5v9M3 10v4M21 10v4M6.5 12h11" /></svg>);
}
function UtensilsTabIcon() {
  return (<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M17 2l-1.5 7h3L17 2zM17 9v13" /></svg>);
}

type TodayPreset = {
  id: string;
  name: string;
  exercises: { name: string; sets: number | null; reps: number | null; weightKg: number | null }[];
};

function DateBanner({ date, onClear }: { date: Date; onClear: () => void }) {
  const isToday = (() => {
    const t = new Date();
    return t.getFullYear() === date.getFullYear() && t.getMonth() === date.getMonth() && t.getDate() === date.getDate();
  })();
  if (isToday) return null;
  return (
    <div className="flex items-center justify-between rounded-2xl border border-accent-500/20 bg-accent-500/[0.08] dark:bg-accent-500/[0.12] px-4 py-3 backdrop-blur-xl">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Logging for</p>
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          {date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="ml-3 shrink-0 rounded-full bg-white/60 dark:bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 active:scale-95 active:bg-white/80 dark:active:bg-white/[0.12] transition-all"
      >
        Use today
      </button>
    </div>
  );
}

function WorkoutForm({
  unitSystem,
  initialDate,
  onClearInitialDate,
}: {
  unitSystem: UnitSystem;
  initialDate: Date | null;
  onClearInitialDate: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [exercises, setExercises] = useState([{ name: "", sets: "", reps: "", weight: "" }]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [todayPresets, setTodayPresets] = useState<TodayPreset[]>([]);
  const [presetLoaded, setPresetLoaded] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const presetRes = await fetch("/api/presets/workouts");
        if (presetRes.ok) {
          const j = await presetRes.json();
          const refDate = initialDate ?? new Date();
          const refDay = refDate.getDay();
          const matches = (j.data.presets as Array<{
            id: string;
            name: string;
            recurringDays: number[];
            exercises: TodayPreset["exercises"];
          }>).filter((p) => p.recurringDays.includes(refDay));
          setTodayPresets(matches.map((p) => ({ id: p.id, name: p.name, exercises: p.exercises })));
        }
      } catch {}
    })();
  }, [initialDate]);

  const weightLabel = unitSystem === "imperial" ? "Weight (lbs)" : "Weight (kg)";

  function loadPreset(p: TodayPreset) {
    setName(p.name);
    setExercises(
      p.exercises.length
        ? p.exercises.map((ex) => ({
            name: ex.name,
            sets: ex.sets == null ? "" : String(ex.sets),
            reps: ex.reps == null ? "" : String(ex.reps),
            weight:
              ex.weightKg == null
                ? ""
                : unitSystem === "imperial"
                  ? String(kgToLbs(ex.weightKg))
                  : String(Math.round(ex.weightKg * 10) / 10),
          }))
        : [{ name: "", sets: "", reps: "", weight: "" }],
    );
    setPresetLoaded(p.id);
    setSuccess(false);
  }

  function addExercise() {
    setExercises((prev) => [...prev, { name: "", sets: "", reps: "", weight: "" }]);
  }

  function removeExercise(index: number) {
    setExercises((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [{ name: "", sets: "", reps: "", weight: "" }];
    });
  }

  function updateExercise(index: number, field: string, value: string) {
    setExercises((prev) => prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      const postDate = initialDate ?? new Date();
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          name,
          durationMin: duration ? parseInt(duration) : null,
          date: postDate.toISOString(),
          exercises: exercises.filter((ex) => ex.name.trim()).map((ex, i) => {
            const rawWeight = ex.weight ? parseFloat(ex.weight) : null;
            const weightKg =
              rawWeight == null || !Number.isFinite(rawWeight)
                ? null
                : unitSystem === "imperial"
                  ? lbsToKg(rawWeight)
                  : rawWeight;
            return {
              name: ex.name,
              sets: ex.sets ? parseInt(ex.sets) : null,
              reps: ex.reps ? parseInt(ex.reps) : null,
              weightKg,
              order: i,
            };
          }),
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setName("");
        setDuration("");
        setExercises([{ name: "", sets: "", reps: "", weight: "" }]);
        setPresetLoaded(null);
        onClearInitialDate();
      }
    } catch {} finally { setLoading(false); }
  }

  const presetHeadline = initialDate ? `Scheduled for ${initialDate.toLocaleDateString(undefined, { weekday: "long" })}` : "Today is";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-8">
      {success && <div className="alert-success">Workout logged successfully.</div>}

      {initialDate && <DateBanner date={initialDate} onClear={onClearInitialDate} />}

      {todayPresets.length > 0 && (
        <div className="space-y-2">
          {todayPresets.map((p) => {
            const isLoaded = presetLoaded === p.id;
            return (
              <div
                key={p.id}
                className="rounded-2xl border border-accent-500/20 bg-gradient-to-br from-accent-500/[0.08] to-accent-500/[0.02] dark:from-accent-500/[0.12] dark:to-accent-500/[0.04] backdrop-blur-xl p-4"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-500/15 text-accent-500">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{presetHeadline}</p>
                    <p className="truncate text-base font-semibold text-slate-900 dark:text-white">
                      {p.name}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {p.exercises.length} {p.exercises.length === 1 ? "exercise" : "exercises"} queued · edit the numbers and save
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => loadPreset(p)}
                    disabled={isLoaded}
                    className="flex-1 rounded-xl bg-white/70 dark:bg-white/[0.08] border border-accent-500/25 px-4 py-2 text-sm font-semibold text-accent-600 dark:text-accent-400 active:scale-[0.98] transition-all disabled:opacity-60"
                  >
                    {isLoaded ? "Loaded" : "Load preset"}
                  </button>
                  {!initialDate && (
                    <button
                      type="button"
                      onClick={() => router.push(`/log/live/${p.id}`)}
                      className="flex-1 rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-accent-500/25 active:scale-[0.98] active:bg-accent-600 transition-all"
                    >
                      Start workout
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Workout Name</label>
        <input type="text" required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Upper Body Push" className="input-field mt-1.5" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Duration (min)</label>
        <input type="number" min={0} max={1440} value={duration} onChange={(e) => setDuration(e.target.value)} className="input-field mt-1.5" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Exercises</label>
          <button type="button" onClick={addExercise} className="text-sm font-medium text-accent-500 hover:text-accent-600 transition-colors">+ Add</button>
        </div>
        <div className="space-y-3">
          {exercises.map((ex, i) => (
            <div key={i} className="card p-3.5 space-y-2.5">
              <div className="flex items-center gap-2">
                <input type="text" maxLength={200} placeholder="Exercise name" value={ex.name} onChange={(e) => updateExercise(i, "name", e.target.value)} className="input-field flex-1" />
                <button
                  type="button"
                  onClick={() => removeExercise(i)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 active:scale-90 active:bg-red-100 dark:active:bg-red-500/20 transition-all"
                  aria-label="Remove exercise"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-xs text-slate-400">Sets</label><input type="number" min={0} max={200} value={ex.sets} onChange={(e) => updateExercise(i, "sets", e.target.value)} className="input-field mt-1" /></div>
                <div><label className="text-xs text-slate-400">Reps</label><input type="number" min={0} max={10000} value={ex.reps} onChange={(e) => updateExercise(i, "reps", e.target.value)} className="input-field mt-1" /></div>
                <div><label className="text-xs text-slate-400">{weightLabel}</label><input type="number" min={0} max={2000} step="0.5" value={ex.weight} onChange={(e) => updateExercise(i, "weight", e.target.value)} className="input-field mt-1" /></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Saving..." : "Log Workout"}</button>
    </form>
  );
}

type MealPreset = {
  id: string;
  name: string;
  description: string | null;
  mealType: string | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const MEAL_TYPE_ORDER = ["breakfast", "lunch", "dinner", "snack"];

function MealPresetCard({ preset, isLoaded, onLoad }: { preset: MealPreset; isLoaded: boolean; onLoad: () => void }) {
  return (
    <button
      type="button"
      onClick={onLoad}
      className={`shrink-0 rounded-2xl border px-3.5 py-2.5 text-left transition-all active:scale-[0.97] ${
        isLoaded
          ? "border-emerald-500/40 bg-emerald-500/[0.12] dark:bg-emerald-500/[0.15]"
          : "border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] to-emerald-500/[0.02] dark:from-emerald-500/[0.12] dark:to-emerald-500/[0.04]"
      } backdrop-blur-xl`}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M17 2l-1.5 7h3L17 2zM17 9v13" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{preset.name}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {preset.calories != null ? `${Math.round(preset.calories)} cal` : "—"}
            {preset.proteinG != null && ` · ${Math.round(preset.proteinG)}P`}
          </p>
        </div>
      </div>
    </button>
  );
}

function SavedMealsSection({
  presets,
  presetLoaded,
  onLoad,
}: {
  presets: MealPreset[];
  presetLoaded: string | null;
  onLoad: (p: MealPreset) => void;
}) {
  const [filterType, setFilterType] = useState<string | null>(null);

  if (presets.length <= 3) {
    return (
      <div className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Your saved meals</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {presets.map((p) => (
            <MealPresetCard key={p.id} preset={p} isLoaded={presetLoaded === p.id} onLoad={() => onLoad(p)} />
          ))}
        </div>
      </div>
    );
  }

  const availableTypes = MEAL_TYPE_ORDER.filter((t) => presets.some((p) => p.mealType === t));
  const uncategorized = presets.filter((p) => !p.mealType || !MEAL_TYPE_ORDER.includes(p.mealType));
  if (uncategorized.length > 0 && !availableTypes.includes("other")) {
    availableTypes.push("other");
  }

  const filtered = filterType
    ? filterType === "other"
      ? uncategorized
      : presets.filter((p) => p.mealType === filterType)
    : [];

  return (
    <div className="space-y-2.5">
      <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Your saved meals</p>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none -mx-1 px-1">
        {availableTypes.map((t) => {
          const count = t === "other" ? uncategorized.length : presets.filter((p) => p.mealType === t).length;
          const active = filterType === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(active ? null : t)}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-medium transition-all active:scale-[0.97] ${
                active
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                  : "bg-white/60 dark:bg-white/[0.06] border border-black/5 dark:border-white/[0.08] text-slate-600 dark:text-slate-400"
              }`}
            >
              {MEAL_TYPE_LABELS[t] ?? "Other"} ({count})
            </button>
          );
        })}
      </div>
      {filterType && (
        <div
          className="space-y-2"
          style={{ animation: "pageFade 200ms cubic-bezier(0.32, 0.72, 0, 1) backwards" }}
        >
          {filtered.map((p) => (
            <MealPresetCard key={p.id} preset={p} isLoaded={presetLoaded === p.id} onLoad={() => onLoad(p)} />
          ))}
          {filtered.length === 0 && (
            <p className="py-3 text-center text-xs text-slate-400">No saved meals in this category</p>
          )}
        </div>
      )}
      {!filterType && (
        <p className="text-xs text-slate-400 px-1">Pick a category to see your saved meals</p>
      )}
    </div>
  );
}

function MealForm({
  initialDate,
  onClearInitialDate,
}: {
  initialDate: Date | null;
  onClearInitialDate: () => void;
}) {
  const [name, setName] = useState("");
  const [mealType, setMealType] = useState("lunch");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [presets, setPresets] = useState<MealPreset[]>([]);
  const [presetLoaded, setPresetLoaded] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/presets/meals");
        if (res.ok) {
          const j = await res.json();
          setPresets(j.data.presets);
        }
      } catch {}
    })();
  }, []);

  function loadPreset(p: MealPreset) {
    setName(p.name);
    if (p.mealType) setMealType(p.mealType);
    setCalories(p.calories == null ? "" : String(p.calories));
    setProtein(p.proteinG == null ? "" : String(p.proteinG));
    setCarbs(p.carbsG == null ? "" : String(p.carbsG));
    setFat(p.fatG == null ? "" : String(p.fatG));
    setDescription(p.description ?? "");
    setPresetLoaded(p.id);
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      const postDate = initialDate ?? new Date();
      const res = await fetch("/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          name, mealType, description: description || undefined,
          calories: calories ? parseFloat(calories) : null, proteinG: protein ? parseFloat(protein) : null,
          carbsG: carbs ? parseFloat(carbs) : null, fatG: fat ? parseFloat(fat) : null,
          date: postDate.toISOString(),
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setName(""); setCalories(""); setProtein(""); setCarbs(""); setFat(""); setDescription("");
        setPresetLoaded(null);
        onClearInitialDate();
      }
    } catch {} finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-8">
      {success && <div className="alert-success">Meal logged successfully.</div>}
      {initialDate && <DateBanner date={initialDate} onClear={onClearInitialDate} />}

      {presets.length > 0 && (
        <SavedMealsSection presets={presets} presetLoaded={presetLoaded} onLoad={loadPreset} />
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Meal Name</label>
        <input type="text" required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grilled Chicken Salad" className="input-field mt-1.5" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Meal Type</label>
        <GlassSelect value={mealType} onChange={setMealType} options={[{ value: "breakfast", label: "Breakfast" }, { value: "lunch", label: "Lunch" }, { value: "dinner", label: "Dinner" }, { value: "snack", label: "Snack" }]} className="mt-1.5" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-slate-400">Calories</label><input type="number" min={0} max={50000} value={calories} onChange={(e) => setCalories(e.target.value)} className="input-field mt-1" /></div>
        <div><label className="text-xs text-slate-400">Protein (g)</label><input type="number" min={0} max={5000} value={protein} onChange={(e) => setProtein(e.target.value)} className="input-field mt-1" /></div>
        <div><label className="text-xs text-slate-400">Carbs (g)</label><input type="number" min={0} max={5000} value={carbs} onChange={(e) => setCarbs(e.target.value)} className="input-field mt-1" /></div>
        <div><label className="text-xs text-slate-400">Fat (g)</label><input type="number" min={0} max={5000} value={fat} onChange={(e) => setFat(e.target.value)} className="input-field mt-1" /></div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description (optional)</label>
        <textarea maxLength={2000} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="input-field mt-1.5" />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Saving..." : "Log Meal"}</button>
    </form>
  );
}
