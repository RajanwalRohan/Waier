"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function LogPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "meal" ? "meal" : "workout";
  const [tab, setTab] = useState<"workout" | "meal">(initialTab);

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Log</h1>

      {/* Tab Switcher */}
      <div className="mb-6 flex rounded-lg bg-gray-100 p-1">
        {(["workout", "meal"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "workout" ? "💪 Workout" : "🍽️ Meal"}
          </button>
        ))}
      </div>

      {tab === "workout" ? <WorkoutForm /> : <MealForm />}
    </div>
  );
}

function WorkoutForm() {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [exercises, setExercises] = useState([
    { name: "", sets: "", reps: "", weight: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function addExercise() {
    setExercises((prev) => [...prev, { name: "", sets: "", reps: "", weight: "" }]);
  }

  function updateExercise(index: number, field: string, value: string) {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          name,
          durationMin: duration ? parseInt(duration) : null,
          date: new Date().toISOString(),
          exercises: exercises
            .filter((ex) => ex.name.trim())
            .map((ex, i) => ({
              name: ex.name,
              sets: ex.sets ? parseInt(ex.sets) : null,
              reps: ex.reps ? parseInt(ex.reps) : null,
              weightKg: ex.weight ? parseFloat(ex.weight) : null,
              order: i,
            })),
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setName("");
        setDuration("");
        setExercises([{ name: "", sets: "", reps: "", weight: "" }]);
      }
    } catch {
      // Error handled silently — user sees no success message
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          Workout logged!
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Workout Name</label>
        <input
          type="text"
          required
          maxLength={200}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Upper Body Push"
          className="input-field mt-1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Duration (min)</label>
        <input
          type="number"
          min={0}
          max={1440}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="input-field mt-1"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Exercises</label>
          <button type="button" onClick={addExercise} className="text-sm text-brand-600 hover:text-brand-700">
            + Add
          </button>
        </div>

        <div className="space-y-3">
          {exercises.map((ex, i) => (
            <div key={i} className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
              <input
                type="text"
                maxLength={200}
                placeholder="Exercise name"
                value={ex.name}
                onChange={(e) => updateExercise(i, "name", e.target.value)}
                className="input-field"
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Sets</label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={ex.sets}
                    onChange={(e) => updateExercise(i, "sets", e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Reps</label>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={ex.reps}
                    onChange={(e) => updateExercise(i, "reps", e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Weight (kg)</label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    step="0.5"
                    value={ex.weight}
                    onChange={(e) => updateExercise(i, "weight", e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Saving..." : "Log Workout"}
      </button>
    </form>
  );
}

function MealForm() {
  const [name, setName] = useState("");
  const [mealType, setMealType] = useState("lunch");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          name,
          mealType,
          description: description || undefined,
          calories: calories ? parseFloat(calories) : null,
          proteinG: protein ? parseFloat(protein) : null,
          carbsG: carbs ? parseFloat(carbs) : null,
          fatG: fat ? parseFloat(fat) : null,
          date: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setName("");
        setCalories("");
        setProtein("");
        setCarbs("");
        setFat("");
        setDescription("");
      }
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          Meal logged!
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Meal Name</label>
        <input
          type="text"
          required
          maxLength={200}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Grilled Chicken Salad"
          className="input-field mt-1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Meal Type</label>
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value)}
          className="input-field mt-1"
        >
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snack</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">Calories</label>
          <input
            type="number"
            min={0}
            max={50000}
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Protein (g)</label>
          <input
            type="number"
            min={0}
            max={5000}
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Carbs (g)</label>
          <input
            type="number"
            min={0}
            max={5000}
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Fat (g)</label>
          <input
            type="number"
            min={0}
            max={5000}
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description (optional)</label>
        <textarea
          maxLength={2000}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-field mt-1"
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Saving..." : "Log Meal"}
      </button>
    </form>
  );
}
