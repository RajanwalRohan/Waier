"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { kgToLbs, lbsToKg, type UnitSystem } from "@/lib/units";

/** Vibrate + play a short rising tone to signal rest is over. */
function restDoneNudge() {
  // Haptic
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([150, 80, 150]);
  }
  // Audio — two quick rising beeps via Web Audio API (no file needed)
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const playTone = (freq: number, startSec: number, durSec: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + startSec);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startSec + durSec);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + startSec);
      osc.stop(ctx.currentTime + startSec + durSec);
    };
    playTone(660, 0, 0.15);
    playTone(880, 0.18, 0.2);
    // Clean up context after tones finish
    setTimeout(() => ctx.close(), 600);
  } catch {
    // Audio not available — vibration alone is fine
  }
}

type PresetExercise = {
  id: string;
  name: string;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
  order: number;
};

type Preset = {
  id: string;
  name: string;
  exercises: PresetExercise[];
};

type SetEntry = {
  reps: number | null;
  weightKg: number | null;
};

type LoggedSet = {
  entries: SetEntry[];
  completedAt: number;
};

type Phase = "loading" | "working" | "resting" | "done" | "error";

const DEFAULT_REST_SEC = 180;

function primedEntry(ex: PresetExercise, sys: UnitSystem) {
  return {
    reps: ex.reps == null ? "" : String(ex.reps),
    weight:
      ex.weightKg == null
        ? ""
        : sys === "imperial"
          ? String(kgToLbs(ex.weightKg))
          : String(Math.round(ex.weightKg * 10) / 10),
  };
}

export default function LiveWorkoutPage() {
  const router = useRouter();
  const params = useParams<{ presetId: string }>();
  const presetId = params?.presetId;

  const [preset, setPreset] = useState<Preset | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [exIdx, setExIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [logged, setLogged] = useState<LoggedSet[][]>([]);
  const [entries, setEntries] = useState<{ reps: string; weight: string }[]>([{ reps: "", weight: "" }]);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("imperial");
  const [restSec, setRestSec] = useState(DEFAULT_REST_SEC);
  const [restRemaining, setRestRemaining] = useState(DEFAULT_REST_SEC);
  const [startedAt] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch preset + unit system + default rest on mount.
  useEffect(() => {
    void (async () => {
      try {
        const [profRes, presetsRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/presets/workouts"),
        ]);
        let sys: UnitSystem = "imperial";
        if (profRes.ok) {
          const j = await profRes.json();
          const s = j?.data?.profile?.unitSystem as UnitSystem | undefined;
          if (s) { sys = s; setUnitSystem(s); }
          const rest = j?.data?.profile?.defaultRestSec;
          if (typeof rest === "number") {
            setRestSec(rest);
            setRestRemaining(rest);
          }
        }
        if (!presetsRes.ok) { setPhase("error"); return; }
        const j = await presetsRes.json();
        const match = (j.data.presets as Preset[]).find((p) => p.id === presetId);
        if (!match || match.exercises.length === 0) { setPhase("error"); return; }
        setPreset(match);
        setLogged(match.exercises.map(() => []));
        setEntries([primedEntry(match.exercises[0], sys)]);
        setPhase("working");
      } catch {
        setPhase("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId]);

  // Rest countdown timer.
  useEffect(() => {
    if (phase !== "resting") {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      return;
    }
    tickRef.current = setInterval(() => {
      setRestRemaining((r) => {
        if (r <= 1) {
          if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
          // Nudge the user and advance to next set.
          restDoneNudge();
          queueMicrotask(() => advanceAfterRest());
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const totalSets = useMemo(() => {
    if (!preset) return 0;
    return preset.exercises.reduce((s, ex) => s + (ex.sets ?? 1), 0);
  }, [preset]);

  const setsCompleted = useMemo(() => logged.reduce((s, arr) => s + arr.length, 0), [logged]);

  const currentExercise = preset?.exercises[exIdx];
  const currentTargetSets = currentExercise?.sets ?? 1;
  const isLastSetOfExercise = setIdx + 1 >= currentTargetSets;
  const isLastExercise = preset ? exIdx + 1 >= preset.exercises.length : false;

  function completeSet() {
    if (!preset || !currentExercise) return;

    const setEntries: SetEntry[] = entries
      .filter((e) => e.reps.trim() !== "" || e.weight.trim() !== "")
      .map((e) => {
        const parsedReps = e.reps ? parseInt(e.reps) : null;
        const rawWeight = e.weight ? parseFloat(e.weight) : null;
        const weightKg =
          rawWeight == null || !Number.isFinite(rawWeight)
            ? null
            : unitSystem === "imperial"
              ? lbsToKg(rawWeight)
              : rawWeight;
        return { reps: parsedReps, weightKg };
      });

    if (setEntries.length === 0) return;

    setLogged((prev) => {
      const next = prev.map((arr) => arr.slice());
      next[exIdx] = [...next[exIdx], { entries: setEntries, completedAt: Date.now() }];
      return next;
    });

    if (isLastSetOfExercise && isLastExercise) {
      setPhase("done");
      return;
    }

    setRestRemaining(restSec);
    setPhase("resting");
  }

  function advanceAfterRest() {
    if (!preset || !currentExercise) return;
    if (isLastSetOfExercise) {
      const nextIdx = exIdx + 1;
      setExIdx(nextIdx);
      setSetIdx(0);
      setEntries([primedEntry(preset.exercises[nextIdx], unitSystem)]);
    } else {
      setSetIdx((s) => s + 1);
      // Keep the primary entry from the previous set (same weight/reps intent),
      // but drop any drop-set tiers — each new set starts fresh.
      setEntries((prev) => prev.length > 0 ? [prev[0]] : [{ reps: "", weight: "" }]);
    }
    setPhase("working");
  }

  function addEntry() {
    setEntries((prev) => [...prev, { reps: "", weight: "" }]);
  }

  function removeEntry(idx: number) {
    setEntries((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  }

  function updateEntry(idx: number, field: "reps" | "weight", value: string) {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  }

  function skipRest() {
    setRestRemaining(0);
    advanceAfterRest();
  }

  function adjustRest(delta: number) {
    setRestRemaining((r) => Math.max(5, r + delta));
  }

  async function saveWorkout() {
    if (!preset) return;
    setSaving(true);
    try {
      const durationMin = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
      const exercises = preset.exercises
        .map((ex, i) => {
          const setsLogged = logged[i] ?? [];
          if (setsLogged.length === 0) return null;
          // Aggregate: total sets counts every entry (drop-set tiers count as additional sets);
          // reps/weight come from the first entry of the first logged set (the primary effort).
          const totalSets = setsLogged.reduce((s, set) => s + set.entries.length, 0);
          const primary = setsLogged[0].entries[0] ?? { reps: null, weightKg: null };
          return {
            name: ex.name,
            sets: totalSets,
            reps: primary.reps,
            weightKg: primary.weightKg,
            order: i,
          };
        })
        .filter(Boolean);

      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          name: preset.name,
          durationMin,
          date: new Date().toISOString(),
          exercises,
        }),
      });
      if (res.ok) {
        router.push("/log");
      }
    } catch {
    } finally {
      setSaving(false);
    }
  }

  function endEarlyWithSummary() {
    setPhase("done");
    setShowEndConfirm(false);
  }

  function endWithoutLogging() {
    router.push("/log");
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-400">Loading workout…</p>
      </div>
    );
  }

  if (phase === "error" || !preset || !currentExercise) {
    return (
      <div className="mx-auto max-w-lg px-5 pt-8 pb-24 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Couldn&apos;t load that workout.</p>
        <button onClick={() => router.push("/log")} className="btn-secondary mt-4">Back to log</button>
      </div>
    );
  }

  const weightUnit = unitSystem === "imperial" ? "lbs" : "kg";
  const progressPct = totalSets === 0 ? 0 : Math.round((setsCompleted / totalSets) * 100);

  return (
    <>
      <div
        className="mx-auto max-w-lg px-5 pt-8 pb-24 transition-[filter] duration-200"
        style={showEndConfirm ? { filter: "blur(12px)" } : undefined}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-accent-500">Live workout</p>
            <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {preset.name}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setShowEndConfirm(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/60 dark:bg-white/[0.06] backdrop-blur-md border border-black/5 dark:border-white/[0.08] text-slate-700 dark:text-slate-200"
            aria-label="End workout"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="mb-1.5 flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Set {setsCompleted} of {totalSets}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-accent-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {phase === "working" && (
          <WorkingView
            exercise={currentExercise}
            exIdxLabel={`Exercise ${exIdx + 1} of ${preset.exercises.length}`}
            setLabel={`Set ${setIdx + 1} of ${currentTargetSets}`}
            weightUnit={weightUnit}
            entries={entries}
            onAddEntry={addEntry}
            onRemoveEntry={removeEntry}
            onUpdateEntry={updateEntry}
            onComplete={completeSet}
            isFinalSet={isLastSetOfExercise && isLastExercise}
          />
        )}

        {phase === "resting" && (
          <RestingView
            remaining={restRemaining}
            onAdjust={adjustRest}
            onSkip={skipRest}
            nextLabel={
              isLastSetOfExercise
                ? `Up next: ${preset.exercises[exIdx + 1]?.name ?? ""}`
                : `Next set · ${currentExercise.name}`
            }
          />
        )}

        {phase === "done" && (
          <DoneView
            preset={preset}
            logged={logged}
            weightUnit={weightUnit}
            unitSystem={unitSystem}
            saving={saving}
            onSave={saveWorkout}
            onDiscard={() => router.push("/log")}
          />
        )}
      </div>

      {showEndConfirm && (
        <EndConfirm
          hasLogged={setsCompleted > 0}
          onCancel={() => setShowEndConfirm(false)}
          onSaveAndEnd={endEarlyWithSummary}
          onDiscard={endWithoutLogging}
        />
      )}
    </>
  );
}

function WorkingView({
  exercise,
  exIdxLabel,
  setLabel,
  weightUnit,
  entries,
  onAddEntry,
  onRemoveEntry,
  onUpdateEntry,
  onComplete,
  isFinalSet,
}: {
  exercise: PresetExercise;
  exIdxLabel: string;
  setLabel: string;
  weightUnit: string;
  entries: { reps: string; weight: string }[];
  onAddEntry: () => void;
  onRemoveEntry: (idx: number) => void;
  onUpdateEntry: (idx: number, field: "reps" | "weight", value: string) => void;
  onComplete: () => void;
  isFinalSet: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="card space-y-1 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{exIdxLabel}</p>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{exercise.name}</h2>
        <p className="text-sm font-medium text-accent-500">{setLabel}</p>
      </div>

      <div className="space-y-2.5">
        {entries.map((entry, i) => (
          <div key={i} className="relative">
            {i > 0 && (
              <div className="mb-1.5 flex items-center justify-between px-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Drop set {i}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveEntry(i)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 active:scale-90 transition-transform"
                  aria-label="Remove drop set"
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="card">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Reps</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={10000}
                  value={entry.reps}
                  onChange={(e) => onUpdateEntry(i, "reps", e.target.value)}
                  placeholder={i === 0 && exercise.reps != null ? String(exercise.reps) : "—"}
                  className="mt-1 w-full bg-transparent text-3xl font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <div className="card">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Weight ({weightUnit})</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={2000}
                  step="0.5"
                  value={entry.weight}
                  onChange={(e) => onUpdateEntry(i, "weight", e.target.value)}
                  placeholder="—"
                  className="mt-1 w-full bg-transparent text-3xl font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={onAddEntry}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-black/10 dark:border-white/[0.12] bg-white/40 dark:bg-white/[0.03] py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 active:scale-[0.99] active:bg-white/60 dark:active:bg-white/[0.06] transition-all"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add drop set
        </button>
      </div>

      <button
        type="button"
        onClick={onComplete}
        className="w-full rounded-2xl bg-accent-500 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-accent-500/30 active:scale-[0.98] active:bg-accent-600 transition-all"
      >
        {isFinalSet ? "Finish workout" : "Complete set"}
      </button>
    </div>
  );
}

function RestingView({
  remaining,
  onAdjust,
  onSkip,
  nextLabel,
}: {
  remaining: number;
  onAdjust: (delta: number) => void;
  onSkip: () => void;
  nextLabel: string;
}) {
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  return (
    <div className="space-y-5">
      <div className="card flex flex-col items-center gap-3 py-8">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Rest</p>
        <div className="text-6xl font-bold tabular-nums text-slate-900 dark:text-white">
          {mm}:{ss.toString().padStart(2, "0")}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{nextLabel}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onAdjust(-15)}
          className="rounded-xl bg-white/60 dark:bg-white/[0.08] border border-black/5 dark:border-white/[0.08] py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 active:scale-[0.97] transition-transform"
        >
          −15s
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-xl bg-accent-500 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-500/25 active:scale-[0.97] active:bg-accent-600 transition-all"
        >
          Skip rest
        </button>
        <button
          type="button"
          onClick={() => onAdjust(15)}
          className="rounded-xl bg-white/60 dark:bg-white/[0.08] border border-black/5 dark:border-white/[0.08] py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 active:scale-[0.97] transition-transform"
        >
          +15s
        </button>
      </div>
    </div>
  );
}

function DoneView({
  preset,
  logged,
  weightUnit,
  unitSystem,
  saving,
  onSave,
  onDiscard,
}: {
  preset: Preset;
  logged: LoggedSet[][];
  weightUnit: string;
  unitSystem: UnitSystem;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="card text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Nice work.</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review and save your session.</p>
      </div>

      <div className="space-y-2">
        {preset.exercises.map((ex, i) => {
          const sets = logged[i] ?? [];
          if (sets.length === 0) return null;
          return (
            <div key={ex.id} className="rounded-2xl border border-black/5 dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.04] px-4 py-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{ex.name}</p>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                {sets.map((s, si) => (
                  <li key={si}>
                    Set {si + 1}:{" "}
                    {s.entries.map((e, ei) => (
                      <span key={ei}>
                        {ei > 0 && " → "}
                        {e.reps ?? "—"} reps
                        {e.weightKg != null && ` @ ${unitSystem === "imperial" ? kgToLbs(e.weightKg) : Math.round(e.weightKg * 10) / 10} ${weightUnit}`}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDiscard}
          className="flex-1 rounded-2xl bg-white/60 dark:bg-white/[0.08] border border-black/5 dark:border-white/[0.08] px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 active:scale-[0.98] transition-transform"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex-[2] rounded-2xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-500/25 active:scale-[0.98] active:bg-accent-600 transition-all disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save workout"}
        </button>
      </div>
    </div>
  );
}

function EndConfirm({
  hasLogged,
  onCancel,
  onSaveAndEnd,
  onDiscard,
}: {
  hasLogged: boolean;
  onCancel: () => void;
  onSaveAndEnd: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-900 p-5 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          End workout?
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {hasLogged
            ? "You can save what you've logged, or discard the session entirely."
            : "You haven't logged any sets yet."}
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl bg-black/[0.05] dark:bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 active:scale-[0.98] transition-transform"
          >
            Resume
          </button>
          {hasLogged && (
            <button
              type="button"
              onClick={onSaveAndEnd}
              className="flex-1 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white active:scale-[0.98] active:bg-accent-600 transition-all"
            >
              End
            </button>
          )}
          <button
            type="button"
            onClick={onDiscard}
            className="flex-1 rounded-xl bg-red-500/10 dark:bg-red-500/15 border border-red-500/20 px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 active:scale-[0.98] active:bg-red-500/20 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
