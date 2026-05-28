"use client";

import { useState, useMemo } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { lbsToKg, inToCm, kgToLbs, cmToIn } from "@/lib/units";
import type { UnitSystem } from "@/lib/units";
import GlassSelect from "@/components/GlassSelect";
import GlassDatePicker from "@/components/GlassDatePicker";
import GlassMultiSelect from "@/components/GlassMultiSelect";
import GlassHeightPicker from "@/components/GlassHeightPicker";

const PASSWORD_RULES = [
  { label: "At least 12 characters", test: (p: string) => p.length >= 12 },
  { label: "1 uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "1 lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "2 numbers", test: (p: string) => /(?:.*\d){2,}/.test(p) },
  { label: "1 special character (!@#$...)", test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p) },
];

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

function PasswordChecklist({ password }: { password: string }) {
  const results = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(password) })),
    [password],
  );

  return (
    <ul className="mt-3 space-y-1.5">
      {results.map((rule) => (
        <li key={rule.label} className="flex items-center gap-2 text-xs">
          <span className={`transition-colors ${rule.passed ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"}`}>
            {rule.passed ? (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <circle cx="12" cy="12" r="9" />
              </svg>
            )}
          </span>
          <span className={`transition-colors ${rule.passed ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
            {rule.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
      {show ? (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  function handleOAuth(provider: string) {
    setOauthLoading(provider);
    signIn(provider, { callbackUrl: "/dashboard" });
  }

  // Step 1
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 2
  const [sex, setSex] = useState("");
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [weight, setWeight] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [fitnessGoal, setFitnessGoal] = useState("");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("imperial");
  const [medicalConditions, setMedicalConditions] = useState<string[]>([]);
  const [foodAllergies, setFoodAllergies] = useState<string[]>([]);
  const [customAllergen, setCustomAllergen] = useState("");
  const [customCondition, setCustomCondition] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");

  // Step 3 — Goals
  const [fitnessGoals, setFitnessGoals] = useState<string[]>([]);
  const [dietType, setDietType] = useState("");
  const [exercisePrefs, setExercisePrefs] = useState<string[]>([]);
  const [exerciseDays, setExerciseDays] = useState("");
  const [dailyStepsGoal, setDailyStepsGoal] = useState("");
  const [sleepGoal, setSleepGoal] = useState("");
  const [goalWeight, setGoalWeight] = useState("");

  const allPassed = PASSWORD_RULES.every((rule) => rule.test(password));
  const hasFoodAllergies = medicalConditions.includes("Food Allergies");
  const customConditions = medicalConditions.filter((c) => !COMMON_CONDITIONS.includes(c));
  const customAllergens = foodAllergies.filter((a) => !COMMON_FOOD_ALLERGENS.includes(a));

  // Step 1 validation
  const step1Valid = name.trim() && dateOfBirth && email && allPassed && password === confirmPassword;

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Name is required."); return; }
    if (!dateOfBirth) { setError("Date of birth is required."); return; }
    // Age check
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const md = today.getMonth() - dob.getMonth();
    if (md < 0 || (md === 0 && today.getDate() < dob.getDate())) age--;
    if (age < 13) { setError("You must be at least 13 years old."); return; }
    if (!allPassed) { setError("Please meet all password requirements."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setStep(2);
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

  function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!sex) { setError("Please select your sex."); return; }
    if (!heightCm) { setError("Please select your height."); return; }
    if (!weight) { setError("Please enter your weight."); return; }
    if (!activityLevel) { setError("Please select your activity level."); return; }
    if (medicalConditions.length === 0) { setError("Please select at least one health condition, or add 'None' as a custom entry."); return; }

    setStep(3);
  }

  // Computed recommendations based on profile + goals
  const weightKg = useMemo(() => {
    if (!weight) return 0;
    return unitSystem === "imperial" ? lbsToKg(parseFloat(weight)) : parseFloat(weight);
  }, [weight, unitSystem]);

  const recommendedCalories = useMemo(() => {
    if (!heightCm || !weightKg) return null;
    const dob = new Date(dateOfBirth);
    const age = new Date().getFullYear() - dob.getFullYear();
    const bmr = sex === "female"
      ? 10 * weightKg + 6.25 * (heightCm ?? 170) - 5 * age - 161
      : 10 * weightKg + 6.25 * (heightCm ?? 170) - 5 * age + 5;
    const multiplier = activityLevel === "extremely_active" ? 1.9 : activityLevel === "very_active" ? 1.725 : activityLevel === "moderately_active" ? 1.55 : activityLevel === "lightly_active" ? 1.375 : 1.2;
    const tdee = Math.round(bmr * multiplier);

    if (fitnessGoals.some((g) => ["lose_weight", "clean_cut"].includes(g))) return Math.round(tdee * 0.8);
    if (fitnessGoals.some((g) => ["gain_muscle", "clean_bulk", "build_strength"].includes(g))) return Math.round(tdee * 1.15);
    return tdee;
  }, [heightCm, weightKg, dateOfBirth, sex, activityLevel, fitnessGoals]);

  const recommendedWorkouts = useMemo(() => {
    if (fitnessGoals.some((g) => ["gain_muscle", "build_strength", "clean_bulk"].includes(g))) return "4-5";
    if (fitnessGoals.some((g) => ["lose_weight", "clean_cut"].includes(g))) return "4-6";
    if (fitnessGoals.some((g) => ["improve_endurance"].includes(g))) return "5-6";
    if (fitnessGoals.some((g) => ["mobility"].includes(g))) return "3-5";
    return "3-4";
  }, [fitnessGoals]);

  async function handleStep3(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const goalWeightKg = goalWeight ? (unitSystem === "imperial" ? lbsToKg(parseFloat(goalWeight)) : parseFloat(goalWeight)) : undefined;

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          name: name.trim(),
          dateOfBirth,
          email,
          password,
          sex,
          heightCm,
          weightKg,
          activityLevel,
          fitnessGoal: fitnessGoal || undefined,
          unitSystem,
          medicalConditions,
          foodAllergies: foodAllergies.length > 0 ? foodAllergies : undefined,
          medicalNotes: medicalNotes || undefined,
          // Step 3
          fitnessGoals: fitnessGoals.length > 0 ? fitnessGoals : undefined,
          dietType: dietType || undefined,
          exercisePreferences: exercisePrefs.length > 0 ? exercisePrefs : undefined,
          exerciseDaysPerWeek: exerciseDays ? parseInt(exerciseDays) : undefined,
          dailyStepsGoal: dailyStepsGoal ? parseInt(dailyStepsGoal) : undefined,
          sleepGoalHours: sleepGoal ? parseFloat(sleepGoal) : undefined,
          goalWeightKg,
          calorieGoal: recommendedCalories || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong"); return; }
      router.push("/login?registered=true");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Max date for DOB (today - 13 years)
  const maxDob = new Date();
  maxDob.setFullYear(maxDob.getFullYear() - 13);
  const maxDobStr = maxDob.toISOString().split("T")[0];

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Create your account
        </h2>
        {/* Step indicator */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className={`h-1.5 w-10 rounded-full transition-colors ${step >= 1 ? "bg-accent-500" : "bg-slate-200 dark:bg-slate-700"}`} />
          <div className={`h-1.5 w-10 rounded-full transition-colors ${step >= 2 ? "bg-accent-500" : "bg-slate-200 dark:bg-slate-700"}`} />
          <div className={`h-1.5 w-10 rounded-full transition-colors ${step >= 3 ? "bg-accent-500" : "bg-slate-200 dark:bg-slate-700"}`} />
        </div>
        <p className="mt-2 text-center text-xs text-slate-400">Step {step} of 3</p>

        <div className="mt-6 card">
          {step === 1 ? (
            <form onSubmit={handleStep1} className="space-y-5">
              {/* OAuth buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleOAuth("google")}
                  disabled={!!oauthLoading}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-white dark:bg-white/[0.08] border border-black/[0.08] dark:border-white/[0.10] px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  {oauthLoading === "google" ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-accent-500" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  Sign up with Google
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuth("apple")}
                  disabled={!!oauthLoading}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-black dark:bg-white border-0 px-4 py-2.5 text-sm font-medium text-white dark:text-black shadow-sm hover:bg-black/90 dark:hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  {oauthLoading === "apple" ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                  )}
                  Sign up with Apple
                </button>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-black/[0.06] dark:border-white/[0.08]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white/70 dark:bg-white/[0.06] px-3 text-slate-400 dark:text-slate-500">
                    or sign up with email
                  </span>
                </div>
              </div>

              {error && <div className="alert-error">{error}</div>}

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Full Name
                </label>
                <input id="name" type="text" required maxLength={100} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="input-field mt-1.5" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Date of Birth
                </label>
                <GlassDatePicker required value={dateOfBirth} onChange={setDateOfBirth} max={maxDobStr} placeholder="Select your birthday" className="mt-1.5" />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <input id="email" type="email" required maxLength={255} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field mt-1.5" />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <div className="relative mt-1.5">
                  <input id="password" type={showPassword ? "text" : "password"} required maxLength={128} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field pr-10" />
                  <EyeToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                </div>
                <PasswordChecklist password={password} />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Confirm Password
                </label>
                <div className="relative mt-1.5">
                  <input id="confirm-password" type={showConfirm ? "text" : "password"} required maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field pr-10" />
                  <EyeToggle show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-500">Passwords do not match</p>
                )}
              </div>

              <button type="submit" disabled={!step1Valid} className="btn-primary w-full">
                Continue
              </button>
            </form>
          ) : step === 2 ? (
            <form onSubmit={handleStep2} className="space-y-5">
              {error && <div className="alert-error">{error}</div>}

              {/* Unit Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Units</label>
                <div className="flex rounded-xl bg-slate-100 dark:bg-white/[0.06] p-0.5">
                  <button type="button" onClick={() => {
                    if (unitSystem === "metric") {
                      setWeight((w) => w ? String(kgToLbs(parseFloat(w))) : "");
                      setUnitSystem("imperial");
                    }
                  }} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${unitSystem === "imperial" ? "bg-white dark:bg-white/[0.12] text-accent-600 dark:text-accent-400 shadow-sm" : "text-slate-500 dark:text-slate-400"}`}>
                    Imperial
                  </button>
                  <button type="button" onClick={() => {
                    if (unitSystem === "imperial") {
                      setWeight((w) => w ? (Math.round(lbsToKg(parseFloat(w)) * 10) / 10).toString() : "");
                      setUnitSystem("metric");
                    }
                  }} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${unitSystem === "metric" ? "bg-white dark:bg-white/[0.12] text-accent-600 dark:text-accent-400 shadow-sm" : "text-slate-500 dark:text-slate-400"}`}>
                    Metric
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Sex</label>
                <GlassSelect required value={sex} onChange={setSex} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }, { value: "prefer_not_to_say", label: "Prefer not to say" }]} placeholder="Select" className="mt-1.5" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Height</label>
                  <GlassHeightPicker required valueCm={heightCm} onChange={setHeightCm} unitSystem={unitSystem} className="mt-1.5" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Weight ({unitSystem === "imperial" ? "lbs" : "kg"})</label>
                  <input type="number" required min={unitSystem === "imperial" ? 44 : 20} max={unitSystem === "imperial" ? 1100 : 500} step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className="input-field mt-1.5" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Activity Level</label>
                <GlassSelect required value={activityLevel} onChange={setActivityLevel} options={[{ value: "sedentary", label: "Sedentary" }, { value: "lightly_active", label: "Lightly Active" }, { value: "moderately_active", label: "Moderately Active" }, { value: "very_active", label: "Very Active" }, { value: "extremely_active", label: "Extremely Active" }]} placeholder="Select" className="mt-1.5" />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Fitness Goal <span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
                </label>
                <GlassSelect value={fitnessGoal} onChange={setFitnessGoal} options={[{ value: "lose_weight", label: "Lose Weight" }, { value: "gain_muscle", label: "Gain Muscle" }, { value: "maintain", label: "Maintain" }, { value: "improve_endurance", label: "Improve Endurance" }, { value: "general_health", label: "General Health" }]} placeholder="Select" className="mt-1.5" />
              </div>

              {/* Health Background — required */}
              <div className="border-t border-black/5 dark:border-white/[0.08] pt-4">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Health Background</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 mb-3">
                  Required for safe, personalized coaching. Select all that apply.
                </p>

                <GlassMultiSelect values={medicalConditions.filter((c) => COMMON_CONDITIONS.includes(c))} onChange={(selected) => { const custom = medicalConditions.filter((c) => !COMMON_CONDITIONS.includes(c)); setMedicalConditions([...selected, ...custom]); }} options={COMMON_CONDITIONS} placeholder="Select conditions..." />

                <div className="mt-3">
                  <label className="block text-xs text-slate-400 dark:text-slate-500 mb-1">Other conditions</label>
                  <div className="flex gap-2">
                    <input type="text" value={customCondition} onChange={(e) => setCustomCondition(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomCondition(); } }} placeholder="Add a condition or 'None'..." maxLength={100} className="input-field flex-1" />
                    <button type="button" onClick={addCustomCondition} className="btn-secondary px-3 py-2">Add</button>
                  </div>
                  {customConditions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {customConditions.map((c) => (
                        <span key={c} className="inline-flex items-center gap-1 rounded-lg bg-accent-50 dark:bg-accent-900/30 px-2 py-0.5 text-xs text-accent-600 dark:text-accent-400">
                          {c}
                          <button type="button" onClick={() => setMedicalConditions((prev) => prev.filter((x) => x !== c))} className="hover:text-red-500 transition-colors">&times;</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Food Allergies Detail */}
                {hasFoodAllergies && (
                  <div className="mt-3 rounded-xl bg-amber-50/50 dark:bg-amber-500/[0.06] border border-amber-200/40 dark:border-amber-500/15 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Specify Your Food Allergies</p>
                    </div>
                    <p className="text-xs text-amber-600/70 dark:text-amber-400/60 mb-3">Select all that apply so Wynn can avoid suggesting these foods.</p>
                    <GlassMultiSelect values={foodAllergies.filter((a) => COMMON_FOOD_ALLERGENS.includes(a))} onChange={(selected) => { const custom = foodAllergies.filter((a) => !COMMON_FOOD_ALLERGENS.includes(a)); setFoodAllergies([...selected, ...custom]); }} options={[...COMMON_FOOD_ALLERGENS]} placeholder="Select allergens..." className="mb-3" />
                    <div>
                      <label className="block text-xs text-slate-400 dark:text-slate-500 mb-1">Other allergens</label>
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

                <div className="mt-3">
                  <label className="block text-xs text-slate-400 dark:text-slate-500 mb-1">Medical notes (optional)</label>
                  <textarea maxLength={2000} rows={2} value={medicalNotes} onChange={(e) => setMedicalNotes(e.target.value)} placeholder="Any additional health information..." className="input-field" />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => { setStep(1); setError(""); }} className="btn-secondary flex-1">
                  Back
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Continue
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleStep3} className="space-y-5">
              {error && <div className="alert-error">{error}</div>}

              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">What are your fitness goals?</p>
                <p className="text-xs text-slate-400 mb-3">Select all that apply</p>
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
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">How do you like to exercise?</p>
                <p className="text-xs text-slate-400 mb-3">Select all that apply</p>
                <div className="flex flex-wrap gap-2">
                  {EXERCISE_PREFS.map((e) => (
                    <button
                      key={e.value}
                      type="button"
                      onClick={() => setExercisePrefs((prev) => prev.includes(e.value) ? prev.filter((x) => x !== e.value) : [...prev, e.value])}
                      className={`rounded-xl px-3 py-1.5 text-xs font-medium border transition-all ${
                        exercisePrefs.includes(e.value)
                          ? "bg-accent-500 text-white border-accent-500"
                          : "bg-white/60 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border-black/5 dark:border-white/[0.08]"
                      }`}
                    >
                      {e.label}
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
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sleep goal (hours)</label>
                  <GlassSelect value={sleepGoal} onChange={setSleepGoal} options={SLEEP_GOALS} placeholder="Select" className="mt-1.5" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Goal weight ({unitSystem === "imperial" ? "lbs" : "kg"})</label>
                  <input type="number" min={unitSystem === "imperial" ? 44 : 20} max={unitSystem === "imperial" ? 1100 : 500} step="0.1" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} className="input-field mt-1.5" placeholder="Optional" />
                </div>
              </div>

              {/* Recommendations card */}
              {fitnessGoals.length > 0 && (
                <div className="rounded-xl bg-gradient-to-br from-accent-50/80 to-violet-50/60 dark:from-accent-900/20 dark:to-violet-900/20 border border-accent-100/40 dark:border-accent-500/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="h-4 w-4 text-accent-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
                    </svg>
                    <p className="text-sm font-semibold text-accent-700 dark:text-accent-400">Your recommendations</p>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {recommendedCalories && (
                      <p>Daily calories: <span className="font-semibold text-slate-900 dark:text-white">{recommendedCalories.toLocaleString()} kcal</span></p>
                    )}
                    <p>Workouts per week: <span className="font-semibold text-slate-900 dark:text-white">{recommendedWorkouts} sessions</span></p>
                    {fitnessGoals.some((g) => ["gain_muscle", "clean_bulk", "build_strength"].includes(g)) && (
                      <p>Expected muscle gain: <span className="font-semibold text-slate-900 dark:text-white">0.25 - 0.5 kg / week</span></p>
                    )}
                    {fitnessGoals.some((g) => ["lose_weight", "clean_cut"].includes(g)) && (
                      <p>Healthy fat loss: <span className="font-semibold text-slate-900 dark:text-white">0.5 - 1 kg / week</span></p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => { setStep(2); setError(""); }} className="btn-secondary flex-1">
                  Back
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? "Creating account..." : "Create Account"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent-500 hover:text-accent-600">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
