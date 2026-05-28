"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "@/components/ThemeProvider";
import type { UnitSystem } from "@/lib/units";
import { kgToLbs, lbsToKg, cmToIn, inToCm } from "@/lib/units";
import GlassSelect from "@/components/GlassSelect";
import GlassDatePicker from "@/components/GlassDatePicker";
import GlassDurationPicker from "@/components/GlassDurationPicker";
import GlassMultiSelect from "@/components/GlassMultiSelect";
import GlassHeightPicker from "@/components/GlassHeightPicker";
import { useToast } from "@/components/Toast";

interface WearableConnection {
  id: string;
  provider: string;
  providerDevice: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  fitbit: "Fitbit",
  apple_health: "Apple Health",
  garmin: "Garmin",
  google_fit: "Google Fit",
  samsung_health: "Samsung Health",
  whoop: "WHOOP",
  oura: "Oura",
  polar: "Polar",
  suunto: "Suunto",
  open_wearables: "Open Wearables",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const COMMON_CONDITIONS = [
  "Type 1 Diabetes", "Type 2 Diabetes", "Hypertension", "High Cholesterol",
  "Heart Disease", "Asthma", "Arthritis", "Crohn's Disease",
  "Celiac Disease", "Thyroid Disorder", "PCOS", "Anemia",
  "Osteoporosis", "Chronic Kidney Disease", "Food Allergies",
];

const COMMON_FOOD_ALLERGENS = [
  "Milk / Dairy", "Eggs", "Peanuts", "Tree Nuts",
  "Fish", "Shellfish", "Wheat / Gluten", "Soybeans", "Sesame",
];

const FITNESS_GOALS = [
  { value: "lose_weight", label: "Lose Weight" },
  { value: "gain_muscle", label: "Gain Muscle" },
  { value: "clean_bulk", label: "Clean Bulk" },
  { value: "clean_cut", label: "Clean Cut" },
  { value: "build_strength", label: "Build Strength" },
  { value: "mobility", label: "Mobility" },
  { value: "improve_endurance", label: "Improve Endurance" },
  { value: "general_health", label: "General Health" },
];

const DIET_TYPES = [
  { value: "omnivore", label: "Omnivore" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "keto", label: "Keto" },
  { value: "paleo", label: "Paleo" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "whole30", label: "Whole30" },
];

const EXERCISE_PREFS = [
  { value: "running", label: "Running" },
  { value: "walking", label: "Walking" },
  { value: "jogging", label: "Jogging" },
  { value: "weight_lifting", label: "Weight Lifting" },
  { value: "calisthenics", label: "Calisthenics" },
  { value: "pilates", label: "Pilates" },
  { value: "yoga", label: "Yoga" },
  { value: "swimming", label: "Swimming" },
  { value: "cycling", label: "Cycling" },
  { value: "hiit", label: "HIIT" },
  { value: "boxing", label: "Boxing" },
  { value: "martial_arts", label: "Martial Arts" },
  { value: "dancing", label: "Dancing" },
  { value: "rock_climbing", label: "Rock Climbing" },
  { value: "rowing", label: "Rowing" },
];

const STEP_GOALS = [
  { value: "5000", label: "5,000" },
  { value: "7500", label: "7,500" },
  { value: "10000", label: "10,000" },
  { value: "12500", label: "12,500" },
  { value: "15000", label: "15,000" },
  { value: "20000", label: "20,000" },
];

const SLEEP_GOALS = [
  { value: "5", label: "5 hrs" },
  { value: "5.5", label: "5.5 hrs" },
  { value: "6", label: "6 hrs" },
  { value: "6.5", label: "6.5 hrs" },
  { value: "7", label: "7 hrs" },
  { value: "7.5", label: "7.5 hrs" },
  { value: "8", label: "8 hrs" },
  { value: "8.5", label: "8.5 hrs" },
  { value: "9", label: "9 hrs" },
  { value: "10", label: "10 hrs" },
];

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const [profile, setProfile] = useState({
    dateOfBirth: "", heightCm: null as number | null, weightKg: "", sex: "", fitnessGoal: "", activityLevel: "", name: "",
  });
  const [medicalConditions, setMedicalConditions] = useState<string[]>([]);
  const [foodAllergies, setFoodAllergies] = useState<string[]>([]);
  const [customAllergen, setCustomAllergen] = useState("");
  const [customCondition, setCustomCondition] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("imperial");
  const [defaultRestSec, setDefaultRestSec] = useState(180);
  // Goals & Preferences
  const [fitnessGoals, setFitnessGoals] = useState<string[]>([]);
  const [dietType, setDietType] = useState("");
  const [exercisePrefs, setExercisePrefs] = useState<string[]>([]);
  const [exerciseDays, setExerciseDays] = useState("");
  const [dailyStepsGoal, setDailyStepsGoal] = useState("");
  const [sleepGoal, setSleepGoal] = useState("");
  const [goalWeight, setGoalWeight] = useState("");
  const [calorieGoal, setCalorieGoal] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingGoals, setSavingGoals] = useState(false);
  const [savingMedical, setSavingMedical] = useState(false);
  const [connections, setConnections] = useState<WearableConnection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [deletingData, setDeletingData] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<"wearable_data" | "all_health_data" | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          const p = data.data.profile;
          const u = data.data.user;
          const units = (p?.unitSystem || "imperial") as UnitSystem;
          setUnitSystem(units);
          if (typeof p?.defaultRestSec === "number") setDefaultRestSec(p.defaultRestSec);
          const displayWeight = p?.weightKg ? (units === "imperial" ? String(kgToLbs(p.weightKg)) : String(Math.round(p.weightKg * 10) / 10)) : "";
          setProfile({
            dateOfBirth: p?.dateOfBirth ?? "", heightCm: p?.heightCm ?? null,
            weightKg: displayWeight, sex: p?.sex ?? "",
            fitnessGoal: p?.fitnessGoal ?? "", activityLevel: p?.activityLevel ?? "",
            name: u?.name ?? "",
          });
          if (p?.medicalConditions) {
            try { setMedicalConditions(JSON.parse(p.medicalConditions)); } catch {}
          }
          if (p?.foodAllergies) {
            try { setFoodAllergies(JSON.parse(p.foodAllergies)); } catch {}
          }
          setMedicalNotes(p?.medicalNotes ?? "");
          // Goals & Preferences
          if (p?.fitnessGoals) {
            try { setFitnessGoals(JSON.parse(p.fitnessGoals)); } catch {}
          }
          setDietType(p?.dietType ?? "");
          if (p?.exercisePreferences) {
            try { setExercisePrefs(JSON.parse(p.exercisePreferences)); } catch {}
          }
          setExerciseDays(p?.exerciseDaysPerWeek != null ? String(p.exerciseDaysPerWeek) : "");
          setDailyStepsGoal(p?.dailyStepsGoal != null ? String(p.dailyStepsGoal) : "");
          setSleepGoal(p?.sleepGoalHours != null ? String(p.sleepGoalHours) : "");
          setGoalWeight(p?.goalWeightKg ? (units === "imperial" ? String(kgToLbs(p.goalWeightKg)) : String(Math.round(p.goalWeightKg * 10) / 10)) : "");
          setCalorieGoal(p?.calorieGoal != null ? String(p.calorieGoal) : "");
        }
      } finally { setLoading(false); }
    }
    loadProfile();
  }, []);

  const loadConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/wearables");
      if (res.ok) {
        const data = await res.json();
        setConnections(data.data.connections ?? []);
      }
    } finally {
      setLoadingConnections(false);
    }
  }, []);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  async function handleDisconnect(connectionId: string) {
    setDisconnectingId(connectionId);
    try {
      const res = await fetch("/api/wearables", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ connectionId }),
      });
      if (res.ok) {
        await loadConnections();
      }
    } finally {
      setDisconnectingId(null);
    }
  }

  async function handleDeleteData(scope: "wearable_data" | "all_health_data") {
    setDeletingData(true);
    try {
      const res = await fetch("/api/wearables/delete-data", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ scope }),
      });
      if (res.ok) {
        setShowDeleteConfirm(null);
        await loadConnections();
      }
    } finally {
      setDeletingData(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          name: profile.name || undefined,
          ...(profile.dateOfBirth ? (() => {
            const dob = new Date(profile.dateOfBirth);
            const today = new Date();
            let age = today.getFullYear() - dob.getFullYear();
            const md = today.getMonth() - dob.getMonth();
            if (md < 0 || (md === 0 && today.getDate() < dob.getDate())) age--;
            return { age };
          })() : {}),
          heightCm: profile.heightCm ?? null,
          weightKg: profile.weightKg ? (unitSystem === "imperial" ? lbsToKg(parseFloat(profile.weightKg)) : parseFloat(profile.weightKg)) : null,
          sex: profile.sex || null, fitnessGoal: profile.fitnessGoal || null,
          activityLevel: profile.activityLevel || null,
          unitSystem,
          defaultRestSec,
        }),
      });
      if (res.ok) {
        showToast("Profile saved");
        await updateSession(); // Refresh JWT so dashboard picks up new name
      } else {
        showToast("Couldn't save profile", "error");
      }
    } finally { setSaving(false); }
  }

  async function handleSaveMedical() {
    setSavingMedical(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          medicalConditions,
          foodAllergies,
          medicalNotes: medicalNotes || null,
        }),
      });
      if (res.ok) showToast("Medical history saved");
      else showToast("Couldn't save medical history", "error");
    } finally { setSavingMedical(false); }
  }

  async function handleSaveGoals() {
    setSavingGoals(true);
    const goalWeightKg = goalWeight ? (unitSystem === "imperial" ? lbsToKg(parseFloat(goalWeight)) : parseFloat(goalWeight)) : null;
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          fitnessGoals: fitnessGoals.length > 0 ? fitnessGoals : [],
          dietType: dietType || null,
          exercisePreferences: exercisePrefs.length > 0 ? exercisePrefs : [],
          exerciseDaysPerWeek: exerciseDays ? parseInt(exerciseDays) : null,
          dailyStepsGoal: dailyStepsGoal ? parseInt(dailyStepsGoal) : null,
          sleepGoalHours: sleepGoal ? parseFloat(sleepGoal) : null,
          goalWeightKg,
          calorieGoal: calorieGoal ? parseInt(calorieGoal) : null,
        }),
      });
      if (res.ok) showToast("Goals saved");
      else showToast("Couldn't save goals", "error");
    } finally { setSavingGoals(false); }
  }

  function toggleCondition(condition: string) {
    setMedicalConditions((prev) =>
      prev.includes(condition) ? prev.filter((c) => c !== condition) : [...prev, condition],
    );
  }

  function addCustomCondition() {
    const trimmed = customCondition.trim();
    if (trimmed && !medicalConditions.includes(trimmed)) {
      setMedicalConditions((prev) => [...prev, trimmed]);
      setCustomCondition("");
    }
  }

  function toggleAllergen(allergen: string) {
    setFoodAllergies((prev) =>
      prev.includes(allergen) ? prev.filter((a) => a !== allergen) : [...prev, allergen],
    );
  }

  function addCustomAllergen() {
    const trimmed = customAllergen.trim();
    if (trimmed && !foodAllergies.includes(trimmed)) {
      setFoodAllergies((prev) => [...prev, trimmed]);
      setCustomAllergen("");
    }
  }

  const hasFoodAllergies = medicalConditions.includes("Food Allergies");
  const customAllergens = foodAllergies.filter((a) => !COMMON_FOOD_ALLERGENS.includes(a));

  if (loading) {
    return (<div className="flex items-center justify-center py-20"><p className="text-slate-400">Loading...</p></div>);
  }

  const customConds = medicalConditions.filter((c) => !COMMON_CONDITIONS.includes(c));

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-24">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Profile</h1>

      {/* Settings */}
      <div className="card mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900 dark:text-white">Dark Mode</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Switch between light and dark themes</p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${theme === "dark" ? "bg-accent-500" : "bg-slate-300 dark:bg-slate-600"}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${theme === "dark" ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
        <div className="border-t border-black/5 dark:border-white/[0.06] pt-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900 dark:text-white">Units</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{unitSystem === "imperial" ? "lbs, in, mi" : "kg, cm, km"}</p>
          </div>
          <div className="flex rounded-xl bg-slate-100 dark:bg-white/[0.06] p-0.5">
            <button
              onClick={() => {
                if (unitSystem === "metric") {
                  setProfile((p) => ({
                    ...p,
                    weightKg: p.weightKg ? String(kgToLbs(parseFloat(p.weightKg))) : "",
                  }));
                  setGoalWeight((w) => w ? String(kgToLbs(parseFloat(w))) : "");
                  setUnitSystem("imperial");
                }
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${unitSystem === "imperial" ? "bg-white dark:bg-white/[0.12] text-accent-600 dark:text-accent-400 shadow-sm" : "text-slate-500 dark:text-slate-400"}`}
            >
              Imperial
            </button>
            <button
              onClick={() => {
                if (unitSystem === "imperial") {
                  setProfile((p) => ({
                    ...p,
                    weightKg: p.weightKg ? (Math.round(lbsToKg(parseFloat(p.weightKg)) * 10) / 10).toString() : "",
                  }));
                  setGoalWeight((w) => w ? (Math.round(lbsToKg(parseFloat(w)) * 10) / 10).toString() : "");
                  setUnitSystem("metric");
                }
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${unitSystem === "metric" ? "bg-white dark:bg-white/[0.12] text-accent-600 dark:text-accent-400 shadow-sm" : "text-slate-500 dark:text-slate-400"}`}
            >
              Metric
            </button>
          </div>
        </div>
        <div className="border-t border-black/5 dark:border-white/[0.06] pt-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900 dark:text-white">Rest between sets</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Default timer during live workouts</p>
          </div>
          <GlassDurationPicker valueSec={defaultRestSec} onChange={setDefaultRestSec} />
        </div>
        <Link
          href="/presets"
          className="-mx-5 -mb-5 flex items-center justify-between border-t border-black/5 dark:border-white/[0.06] px-5 py-4 active:bg-black/[0.02] dark:active:bg-white/[0.02] transition-colors"
        >
          <div>
            <p className="font-medium text-slate-900 dark:text-white">Presets</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Workout splits and meal templates</p>
          </div>
          <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      </div>

      {/* Connected Devices */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Connected Devices</h2>
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-100 dark:bg-accent-900/30">
            <svg className="h-3.5 w-3.5 text-accent-600 dark:text-accent-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="1" width="12" height="22" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-4">Smartwatches and fitness trackers syncing to Waier</p>

        {loadingConnections ? (
          <p className="text-sm text-slate-400 py-3 text-center">Loading...</p>
        ) : connections.length === 0 ? (
          <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06] p-5 text-center">
            <svg className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
            </svg>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No devices connected</p>
            <p className="text-xs text-slate-400 mt-1">Connect a smartwatch or fitness tracker to automatically sync your health data</p>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((conn) => (
              <div key={conn.id} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06] px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${conn.isActive ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {PROVIDER_LABELS[conn.provider] ?? conn.provider}
                    </p>
                  </div>
                  <div className="ml-4 mt-0.5 flex items-center gap-2">
                    {conn.providerDevice && (
                      <span className="text-[11px] text-slate-400 truncate">{conn.providerDevice}</span>
                    )}
                    {conn.lastSyncAt && (
                      <span className="text-[11px] text-slate-400">
                        Synced {timeAgo(conn.lastSyncAt)}
                      </span>
                    )}
                  </div>
                </div>
                {conn.isActive && (
                  <button
                    onClick={() => handleDisconnect(conn.id)}
                    disabled={disconnectingId === conn.id}
                    className="ml-3 shrink-0 rounded-lg border border-red-200/60 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-600 dark:text-red-400 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {disconnectingId === conn.id ? "..." : "Disconnect"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Data management */}
        {connections.length > 0 && (
          <div className="mt-4 border-t border-black/5 dark:border-white/[0.06] pt-4">
            <p className="text-xs text-slate-400 mb-2">Data Management</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm("wearable_data")}
                className="flex-1 rounded-lg border border-amber-200/60 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400 transition-all active:scale-[0.98]"
              >
                Delete Synced Data
              </button>
              <button
                onClick={() => setShowDeleteConfirm("all_health_data")}
                className="flex-1 rounded-lg border border-red-200/60 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 transition-all active:scale-[0.98]"
              >
                Delete All Health Data
              </button>
            </div>
          </div>
        )}

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="mt-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20 p-4">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
              {showDeleteConfirm === "wearable_data" ? "Delete all synced data?" : "Delete ALL health data?"}
            </p>
            <p className="text-xs text-red-600/70 dark:text-red-400/60 mb-3">
              {showDeleteConfirm === "wearable_data"
                ? "This will permanently remove all data synced from your connected devices. Manual entries will be kept."
                : "This will permanently remove ALL health metrics, including manual entries and synced data. This cannot be undone."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 btn-secondary py-2 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteData(showDeleteConfirm)}
                disabled={deletingData}
                className="flex-1 rounded-lg bg-red-600 dark:bg-red-500 px-3 py-2 text-xs font-medium text-white transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {deletingData ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Info */}
      <div className="card mb-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
            <input type="text" maxLength={100} value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} className="input-field mt-1.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
            <input type="email" value={session?.user?.email ?? ""} disabled className="input-field mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date of Birth</label><GlassDatePicker value={profile.dateOfBirth} onChange={(v) => setProfile((p) => ({ ...p, dateOfBirth: v }))} className="mt-1.5" /></div>
            <div><label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sex</label><GlassSelect value={profile.sex} onChange={(v) => setProfile((p) => ({ ...p, sex: v }))} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }, { value: "prefer_not_to_say", label: "Prefer not to say" }]} placeholder="Select" className="mt-1.5" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-slate-700 dark:text-slate-300">Height</label><GlassHeightPicker valueCm={profile.heightCm} onChange={(cm) => setProfile((p) => ({ ...p, heightCm: cm }))} unitSystem={unitSystem} className="mt-1.5" /></div>
            <div><label className="text-sm font-medium text-slate-700 dark:text-slate-300">Weight ({unitSystem === "imperial" ? "lbs" : "kg"})</label><input type="number" min={unitSystem === "imperial" ? 44 : 20} max={unitSystem === "imperial" ? 1100 : 500} step="0.1" value={profile.weightKg} onChange={(e) => setProfile((p) => ({ ...p, weightKg: e.target.value }))} className="input-field mt-1.5" /></div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Fitness Goal</label>
            <GlassSelect value={profile.fitnessGoal} onChange={(v) => setProfile((p) => ({ ...p, fitnessGoal: v }))} options={[{ value: "lose_weight", label: "Lose Weight" }, { value: "gain_muscle", label: "Gain Muscle" }, { value: "maintain", label: "Maintain" }, { value: "improve_endurance", label: "Improve Endurance" }, { value: "general_health", label: "General Health" }]} placeholder="Select" className="mt-1.5" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Activity Level</label>
            <GlassSelect value={profile.activityLevel} onChange={(v) => setProfile((p) => ({ ...p, activityLevel: v }))} options={[{ value: "sedentary", label: "Sedentary" }, { value: "lightly_active", label: "Lightly Active" }, { value: "moderately_active", label: "Moderately Active" }, { value: "very_active", label: "Very Active" }, { value: "extremely_active", label: "Extremely Active" }]} placeholder="Select" className="mt-1.5" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? "Saving..." : "Save Profile"}</button>
        </form>
      </div>

      {/* Goals & Preferences */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Goals & Preferences</h2>
        <p className="text-xs text-slate-400 mb-4">Your fitness targets and lifestyle preferences. These shape your coaching and progress tracking.</p>

        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fitness goals</p>
            <p className="text-xs text-slate-400 mb-2">Select all that apply</p>
            <div className="flex flex-wrap gap-2">
              {FITNESS_GOALS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setFitnessGoals((prev) => prev.includes(g.value) ? prev.filter((x) => x !== g.value) : [...prev, g.value])}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium border transition-all ${
                    fitnessGoals.includes(g.value)
                      ? "bg-accent-500 text-white border-accent-500"
                      : "bg-white/60 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border-black/5 dark:border-white/[0.08]"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Diet type</label>
            <GlassSelect value={dietType} onChange={setDietType} options={DIET_TYPES} placeholder="Select" className="mt-1.5" />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Exercise preferences</p>
            <p className="text-xs text-slate-400 mb-2">Select all that apply</p>
            <div className="flex flex-wrap gap-2">
              {EXERCISE_PREFS.map((ep) => (
                <button
                  key={ep.value}
                  type="button"
                  onClick={() => setExercisePrefs((prev) => prev.includes(ep.value) ? prev.filter((x) => x !== ep.value) : [...prev, ep.value])}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium border transition-all ${
                    exercisePrefs.includes(ep.value)
                      ? "bg-accent-500 text-white border-accent-500"
                      : "bg-white/60 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border-black/5 dark:border-white/[0.08]"
                  }`}
                >
                  {ep.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Exercise days / week</label>
              <GlassSelect value={exerciseDays} onChange={setExerciseDays} options={[0,1,2,3,4,5,6,7].map((n) => ({ value: String(n), label: String(n) }))} placeholder="Select" className="mt-1.5" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Daily steps goal</label>
              <GlassSelect value={dailyStepsGoal} onChange={setDailyStepsGoal} options={STEP_GOALS} placeholder="Select" className="mt-1.5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sleep goal</label>
              <GlassSelect value={sleepGoal} onChange={setSleepGoal} options={SLEEP_GOALS} placeholder="Select" className="mt-1.5" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Goal weight ({unitSystem === "imperial" ? "lbs" : "kg"})</label>
              <input type="number" min={unitSystem === "imperial" ? 44 : 20} max={unitSystem === "imperial" ? 1100 : 500} step="0.1" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} className="input-field mt-1.5" placeholder="Optional" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Daily calorie target</label>
            <input type="number" min={500} max={10000} step={50} value={calorieGoal} onChange={(e) => setCalorieGoal(e.target.value)} className="input-field mt-1.5" placeholder="Optional" />
          </div>

          <button type="button" onClick={handleSaveGoals} disabled={savingGoals} className="btn-primary w-full">
            {savingGoals ? "Saving..." : "Save Goals"}
          </button>
        </div>
      </div>

      {/* Medical History */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Medical History</h2>
        <p className="text-xs text-slate-400 mb-4">Helps personalize your coaching. This stays private.</p>

        <GlassMultiSelect values={medicalConditions.filter((c) => COMMON_CONDITIONS.includes(c))} onChange={(selected) => { const custom = medicalConditions.filter((c) => !COMMON_CONDITIONS.includes(c)); setMedicalConditions([...selected, ...custom]); }} options={COMMON_CONDITIONS} placeholder="Select conditions..." className="mb-4" />

        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-1">Other conditions</label>
          <div className="flex gap-2">
            <input type="text" value={customCondition} onChange={(e) => setCustomCondition(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomCondition(); } }} placeholder="Add a condition..." maxLength={100} className="input-field flex-1" />
            <button type="button" onClick={addCustomCondition} className="btn-secondary px-3 py-2">Add</button>
          </div>
          {customConds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {customConds.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 rounded-lg bg-accent-50 dark:bg-accent-900/30 px-2 py-0.5 text-xs text-accent-600 dark:text-accent-400">
                  {c}
                  <button type="button" onClick={() => setMedicalConditions((prev) => prev.filter((x) => x !== c))} className="hover:text-red-500 transition-colors">&times;</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Food Allergies Detail Section */}
        {hasFoodAllergies && (
          <div className="mb-4 rounded-xl bg-amber-50/50 dark:bg-amber-500/[0.06] border border-amber-200/40 dark:border-amber-500/15 p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Specify Your Food Allergies</p>
            </div>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/60 mb-3">Select all that apply so the AI coach can avoid suggesting foods with these allergens.</p>

            <GlassMultiSelect values={foodAllergies.filter((a) => COMMON_FOOD_ALLERGENS.includes(a))} onChange={(selected) => { const custom = foodAllergies.filter((a) => !COMMON_FOOD_ALLERGENS.includes(a)); setFoodAllergies([...selected, ...custom]); }} options={[...COMMON_FOOD_ALLERGENS]} placeholder="Select allergens..." className="mb-3" />

            <div>
              <label className="block text-xs text-slate-400 mb-1">Other allergens</label>
              <div className="flex gap-2">
                <input type="text" value={customAllergen} onChange={(e) => setCustomAllergen(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomAllergen(); } }} placeholder="Add an allergen..." maxLength={100} className="input-field flex-1" />
                <button type="button" onClick={addCustomAllergen} className="btn-secondary px-3 py-2">Add</button>
              </div>
              {customAllergens.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {customAllergens.map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 rounded-lg bg-amber-100/60 dark:bg-amber-900/30 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
                      {a}
                      <button type="button" onClick={() => setFoodAllergies((prev) => prev.filter((x) => x !== a))} className="hover:text-red-500 transition-colors">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-1">Medical notes (optional)</label>
          <textarea maxLength={2000} rows={2} value={medicalNotes} onChange={(e) => setMedicalNotes(e.target.value)} placeholder="Any additional health information..." className="input-field" />
        </div>

        <button type="button" onClick={handleSaveMedical} disabled={savingMedical} className="btn-primary w-full">
          {savingMedical ? "Saving..." : "Save Medical History"}
        </button>
      </div>

      {/* Sign Out */}
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="w-full rounded-xl border border-red-200/60 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/10 backdrop-blur-sm px-5 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 transition-all hover:bg-red-100/50 dark:hover:bg-red-500/20 active:scale-[0.98]"
      >
        Sign Out
      </button>
    </div>
  );
}
