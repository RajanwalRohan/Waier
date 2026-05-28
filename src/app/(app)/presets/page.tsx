"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GlassSelect from "@/components/GlassSelect";
import { kgToLbs, lbsToKg } from "@/lib/units";
import { apiFetch } from "@/lib/fetch";
import { useToast } from "@/components/Toast";

type UnitSystem = "imperial" | "metric";

type PresetExercise = {
  id?: string;
  name: string;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
  notes?: string | null;
};

type WorkoutPreset = {
  id: string;
  name: string;
  recurringDays: number[];
  exercises: PresetExercise[];
};

type MealPreset = {
  id: string;
  name: string;
  description: string | null;
  mealType: string | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function PresetsPage() {
  const [tab, setTab] = useState<"workout" | "meal">("workout");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("imperial");
  const [workoutPresets, setWorkoutPresets] = useState<WorkoutPreset[]>([]);
  const [mealPresets, setMealPresets] = useState<MealPreset[]>([]);
  // Only true on the very first page load — post-save refreshes keep existing data visible
  // so the panel doesn't collapse to a "Loading…" text node and snap back.
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const [profileRes, wpRes, mpRes] = await Promise.all([
      fetch("/api/profile"),
      fetch("/api/presets/workouts"),
      fetch("/api/presets/meals"),
    ]);
    if (profileRes.ok) {
      const pj = await profileRes.json();
      const sys = pj?.data?.profile?.unitSystem as UnitSystem | undefined;
      if (sys) setUnitSystem(sys);
    }
    if (wpRes.ok) {
      const wj = await wpRes.json();
      setWorkoutPresets(wj.data.presets);
    }
    if (mpRes.ok) {
      const mj = await mpRes.json();
      setMealPresets(mj.data.presets);
    }
    setInitialLoading(false);
  }

  return (
    <div className="mx-auto max-w-lg px-5 pt-6 pb-24">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/60 dark:bg-white/[0.08] border border-black/5 dark:border-white/[0.08] backdrop-blur-md active:scale-95 transition-all"
          aria-label="Back to profile"
        >
          <svg className="h-4 w-4 text-slate-700 dark:text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Presets</h1>
      </div>

      <div className="mb-6 flex rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] p-1">
        {[
          { key: "workout" as const, label: "Workouts" },
          { key: "meal" as const, label: "Meals" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-white/80 dark:bg-white/[0.10] text-slate-900 dark:text-white shadow-glass-sm dark:shadow-glass-dark-sm backdrop-blur-sm"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {initialLoading ? (
        <div className="py-20 text-center text-sm text-slate-400">Loading…</div>
      ) : tab === "workout" ? (
        <WorkoutPresetsTab presets={workoutPresets} unitSystem={unitSystem} onChange={refresh} />
      ) : (
        <MealPresetsTab presets={mealPresets} onChange={refresh} />
      )}
    </div>
  );
}

// ─── Workout tab ─────────────────────────────────────────

function WorkoutPresetsTab({
  presets,
  unitSystem,
  onChange,
}: {
  presets: WorkoutPreset[];
  unitSystem: UnitSystem;
  onChange: () => void;
}) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-3">
      {!creating && (
        <button
          onClick={() => setCreating(true)}
          className="w-full rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 px-4 py-4 text-sm font-medium text-slate-600 dark:text-slate-400 active:bg-black/[0.03] dark:active:bg-white/[0.03] transition-all"
        >
          + New workout preset
        </button>
      )}
      {creating && (
        <WorkoutPresetEditor
          initial={{ id: "", name: "", recurringDays: [], exercises: [] }}
          unitSystem={unitSystem}
          isNew
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            onChange();
          }}
        />
      )}
      {presets.length === 0 && !creating && (
        <p className="py-10 text-center text-sm text-slate-400">
          No workout presets yet. Create one to save your split.
        </p>
      )}
      {presets.map((p) => (
        <WorkoutPresetCard key={p.id} preset={p} unitSystem={unitSystem} onChange={onChange} />
      ))}
    </div>
  );
}

function WorkoutPresetCard({
  preset,
  unitSystem,
  onChange,
}: {
  preset: WorkoutPreset;
  unitSystem: UnitSystem;
  onChange: () => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <WorkoutPresetEditor
        initial={preset}
        unitSystem={unitSystem}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          onChange();
        }}
      />
    );
  }

  const dayTags =
    preset.recurringDays.length > 0
      ? preset.recurringDays.map((d) => DAY_NAMES[d]).join(" · ")
      : "No schedule";

  return (
    <button
      onClick={() => setEditing(true)}
      className="card w-full text-left active:scale-[0.99] transition-transform"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold text-slate-900 dark:text-white">
            {preset.name}
          </div>
          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{dayTags}</div>
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500">
          {preset.exercises.length} {preset.exercises.length === 1 ? "exercise" : "exercises"}
        </div>
      </div>
    </button>
  );
}

// Editable exercise row — uses local string state so the user can type freely
// (including decimals, intermediate empty states) without the parent re-normalizing their input.
type RowDraft = { name: string; sets: string; reps: string; weight: string };

function exerciseToDraft(ex: PresetExercise, unitSystem: UnitSystem): RowDraft {
  return {
    name: ex.name,
    sets: ex.sets == null ? "" : String(ex.sets),
    reps: ex.reps == null ? "" : String(ex.reps),
    weight:
      ex.weightKg == null
        ? ""
        : unitSystem === "imperial"
          ? String(kgToLbs(ex.weightKg))
          : String(Math.round(ex.weightKg * 10) / 10),
  };
}

function draftToExercise(d: RowDraft, unitSystem: UnitSystem): PresetExercise {
  const sets = d.sets.trim() === "" ? null : parseInt(d.sets, 10);
  const reps = d.reps.trim() === "" ? null : parseInt(d.reps, 10);
  const w = d.weight.trim() === "" ? null : Number(d.weight);
  const weightKg =
    w == null || !Number.isFinite(w)
      ? null
      : unitSystem === "imperial"
        ? lbsToKg(w)
        : w;
  return {
    name: d.name.trim(),
    sets: Number.isFinite(sets) ? sets : null,
    reps: Number.isFinite(reps) ? reps : null,
    weightKg,
  };
}

function WorkoutPresetEditor({
  initial,
  unitSystem,
  isNew,
  onClose,
  onSaved,
}: {
  initial: WorkoutPreset;
  unitSystem: UnitSystem;
  isNew?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState(initial.name);
  const [days, setDays] = useState<number[]>(initial.recurringDays);
  const [rows, setRows] = useState<RowDraft[]>(() =>
    initial.exercises.length
      ? initial.exercises.map((ex) => exerciseToDraft(ex, unitSystem))
      : [{ name: "", sets: "", reps: "", weight: "" }],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  // Run the collapse animation, then let the parent unmount us.
  function animateClose(done: () => void) {
    setClosing(true);
    window.setTimeout(done, 260);
  }

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  function updateRow(i: number, patch: Partial<RowDraft>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { name: "", sets: "", reps: "", weight: "" }]);
  }

  function removeRow(i: number) {
    setRows((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      return next.length ? next : [{ name: "", sets: "", reps: "", weight: "" }];
    });
  }

  async function save() {
    setError(null);
    if (!name.trim()) {
      setError("Preset needs a name");
      return;
    }
    const cleaned = rows
      .map((r) => draftToExercise(r, unitSystem))
      .filter((ex) => ex.name.length > 0);

    setSaving(true);
    const url = isNew ? "/api/presets/workouts" : `/api/presets/workouts/${initial.id}`;
    const res = await apiFetch(url, {
      method: isNew ? "POST" : "PUT",
      body: JSON.stringify({ name: name.trim(), recurringDays: days, exercises: cleaned }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error ?? "Couldn't save");
      return;
    }
    showToast(isNew ? "Preset created" : "Preset saved");
    animateClose(onSaved);
  }

  async function remove() {
    if (!confirm("Delete this preset?")) return;
    setSaving(true);
    const res = await apiFetch(`/api/presets/workouts/${initial.id}`, { method: "DELETE" });
    setSaving(false);
    if (!res.ok) {
      setError("Couldn't delete");
      return;
    }
    showToast("Preset deleted");
    animateClose(onSaved);
  }

  const weightLabel = unitSystem === "imperial" ? "lbs" : "kg";

  return (
    <div className={`card space-y-4 ${closing ? "animate-preset-collapse" : ""}`}>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
          Preset name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Chest Day"
          className="input-field"
          maxLength={100}
        />
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400">
          Repeats on
        </label>
        <div className="flex justify-between gap-1.5">
          {DAY_LABELS.map((label, idx) => {
            const active = days.includes(idx);
            return (
              <button
                key={idx}
                onClick={() => toggleDay(idx)}
                className={`flex h-10 flex-1 items-center justify-center rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                  active
                    ? "bg-accent-500 text-white shadow-lg shadow-accent-500/25"
                    : "bg-white/60 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border border-black/5 dark:border-white/[0.08]"
                }`}
                aria-label={DAY_NAMES[idx]}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
            Exercises
          </label>
          <button
            onClick={addRow}
            className="text-xs font-semibold text-accent-500 active:opacity-60"
          >
            + Add
          </button>
        </div>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <ExerciseDraftRow
              key={i}
              row={row}
              weightLabel={weightLabel}
              onChange={(patch) => updateRow(i, patch)}
              onRemove={() => removeRow(i)}
            />
          ))}
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="flex gap-2">
        <button onClick={() => animateClose(onClose)} className="btn-secondary flex-1" disabled={saving || closing}>
          Cancel
        </button>
        <button onClick={save} className="btn-primary flex-1" disabled={saving || closing}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {!isNew && (
        <button
          onClick={remove}
          disabled={saving || closing}
          className="w-full text-center text-sm font-medium text-red-500 dark:text-red-400 active:opacity-60"
        >
          Delete preset
        </button>
      )}
    </div>
  );
}

function ExerciseDraftRow({
  row,
  weightLabel,
  onChange,
  onRemove,
}: {
  row: RowDraft;
  weightLabel: string;
  onChange: (patch: Partial<RowDraft>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl bg-white/40 dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06] p-3 space-y-2">
      <div className="flex items-center gap-2">
        <input
          value={row.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Exercise name"
          className="input-field flex-1"
          maxLength={200}
        />
        <button
          onClick={onRemove}
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 active:scale-90 active:bg-red-100 dark:active:bg-red-500/20 transition-all"
          aria-label="Remove exercise"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <DraftField
          label="Sets"
          value={row.sets}
          onChange={(v) => onChange({ sets: v })}
          inputMode="numeric"
        />
        <DraftField
          label="Reps"
          value={row.reps}
          onChange={(v) => onChange({ reps: v })}
          inputMode="numeric"
        />
        <DraftField
          label={weightLabel}
          value={row.weight}
          onChange={(v) => onChange({ weight: v })}
          inputMode="decimal"
        />
      </div>
    </div>
  );
}

function DraftField({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "numeric" | "decimal";
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <input
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
      />
    </div>
  );
}

// ─── Meal tab ────────────────────────────────────────────

const MEAL_TYPE_OPTIONS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

function MealPresetsTab({ presets, onChange }: { presets: MealPreset[]; onChange: () => void }) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-3">
      {!creating && (
        <button
          onClick={() => setCreating(true)}
          className="w-full rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 px-4 py-4 text-sm font-medium text-slate-600 dark:text-slate-400 active:bg-black/[0.03] dark:active:bg-white/[0.03] transition-all"
        >
          + New meal preset
        </button>
      )}
      {creating && (
        <MealPresetEditor
          initial={{
            id: "",
            name: "",
            description: null,
            mealType: null,
            calories: null,
            proteinG: null,
            carbsG: null,
            fatG: null,
            fiberG: null,
          }}
          isNew
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            onChange();
          }}
        />
      )}
      {presets.length === 0 && !creating && (
        <p className="py-10 text-center text-sm text-slate-400">
          No meal presets yet. Save a go-to meal for one-click logging.
        </p>
      )}
      {presets.map((p) => (
        <MealPresetCard key={p.id} preset={p} onChange={onChange} />
      ))}
    </div>
  );
}

function MealPresetCard({ preset, onChange }: { preset: MealPreset; onChange: () => void }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <MealPresetEditor
        initial={preset}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          onChange();
        }}
      />
    );
  }

  const typeLabel = preset.mealType
    ? MEAL_TYPE_OPTIONS.find((o) => o.value === preset.mealType)?.label
    : null;

  return (
    <button
      onClick={() => setEditing(true)}
      className="card w-full text-left active:scale-[0.99] transition-transform"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold text-slate-900 dark:text-white">
            {preset.name}
          </div>
          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {typeLabel ?? "Any meal"}
            {preset.calories != null && ` · ${Math.round(preset.calories)} cal`}
          </div>
        </div>
      </div>
    </button>
  );
}

function MealPresetEditor({
  initial,
  isNew,
  onClose,
  onSaved,
}: {
  initial: MealPreset;
  isNew?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [mealType, setMealType] = useState(initial.mealType ?? "");
  const [calories, setCalories] = useState(initial.calories == null ? "" : String(initial.calories));
  const [protein, setProtein] = useState(initial.proteinG == null ? "" : String(initial.proteinG));
  const [carbs, setCarbs] = useState(initial.carbsG == null ? "" : String(initial.carbsG));
  const [fat, setFat] = useState(initial.fatG == null ? "" : String(initial.fatG));
  const [fiber, setFiber] = useState(initial.fiberG == null ? "" : String(initial.fiberG));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  function animateClose(done: () => void) {
    setClosing(true);
    window.setTimeout(done, 260);
  }

  function toNum(s: string): number | null {
    if (s.trim() === "") return null;
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  async function save() {
    setError(null);
    if (!name.trim()) {
      setError("Preset needs a name");
      return;
    }
    setSaving(true);
    const url = isNew ? "/api/presets/meals" : `/api/presets/meals/${initial.id}`;
    const res = await apiFetch(url, {
      method: isNew ? "POST" : "PUT",
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || undefined,
        mealType: mealType || null,
        calories: toNum(calories),
        proteinG: toNum(protein),
        carbsG: toNum(carbs),
        fatG: toNum(fat),
        fiberG: toNum(fiber),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error ?? "Couldn't save");
      return;
    }
    showToast(isNew ? "Preset created" : "Preset saved");
    animateClose(onSaved);
  }

  async function remove() {
    if (!confirm("Delete this preset?")) return;
    setSaving(true);
    const res = await apiFetch(`/api/presets/meals/${initial.id}`, { method: "DELETE" });
    setSaving(false);
    if (!res.ok) {
      setError("Couldn't delete");
      return;
    }
    showToast("Preset deleted");
    animateClose(onSaved);
  }

  return (
    <div className={`card space-y-4 ${closing ? "animate-preset-collapse" : ""}`}>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Oatmeal Bowl"
          className="input-field"
          maxLength={100}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
          Meal type
        </label>
        <GlassSelect
          value={mealType}
          onChange={setMealType}
          placeholder="Any"
          options={MEAL_TYPE_OPTIONS}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
          Description (optional)
        </label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Oats, banana, peanut butter"
          className="input-field"
          maxLength={500}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <DraftField label="Calories" value={calories} onChange={setCalories} inputMode="decimal" />
        <DraftField label="Protein (g)" value={protein} onChange={setProtein} inputMode="decimal" />
        <DraftField label="Carbs (g)" value={carbs} onChange={setCarbs} inputMode="decimal" />
        <DraftField label="Fat (g)" value={fat} onChange={setFat} inputMode="decimal" />
        <DraftField label="Fiber (g)" value={fiber} onChange={setFiber} inputMode="decimal" />
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="flex gap-2">
        <button onClick={() => animateClose(onClose)} className="btn-secondary flex-1" disabled={saving || closing}>
          Cancel
        </button>
        <button onClick={save} className="btn-primary flex-1" disabled={saving || closing}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {!isNew && (
        <button
          onClick={remove}
          disabled={saving || closing}
          className="w-full text-center text-sm font-medium text-red-500 dark:text-red-400 active:opacity-60"
        >
          Delete preset
        </button>
      )}
    </div>
  );
}
