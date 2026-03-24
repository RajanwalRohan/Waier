"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState({
    age: "",
    heightCm: "",
    weightKg: "",
    sex: "",
    fitnessGoal: "",
    activityLevel: "",
    name: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          const p = data.data.profile;
          const u = data.data.user;
          setProfile({
            age: p?.age?.toString() ?? "",
            heightCm: p?.heightCm?.toString() ?? "",
            weightKg: p?.weightKg?.toString() ?? "",
            sex: p?.sex ?? "",
            fitnessGoal: p?.fitnessGoal ?? "",
            activityLevel: p?.activityLevel ?? "",
            name: u?.name ?? "",
          });
        }
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          name: profile.name || undefined,
          age: profile.age ? parseInt(profile.age) : null,
          heightCm: profile.heightCm ? parseFloat(profile.heightCm) : null,
          weightKg: profile.weightKg ? parseFloat(profile.weightKg) : null,
          sex: profile.sex || null,
          fitnessGoal: profile.fitnessGoal || null,
          activityLevel: profile.activityLevel || null,
        }),
      });

      if (res.ok) setSuccess(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {success && (
          <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            Profile updated!
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            maxLength={100}
            value={profile.name}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            className="input-field mt-1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={session?.user?.email ?? ""}
            disabled
            className="input-field mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Age</label>
            <input
              type="number"
              min={13}
              max={120}
              value={profile.age}
              onChange={(e) => setProfile((p) => ({ ...p, age: e.target.value }))}
              className="input-field mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Sex</label>
            <select
              value={profile.sex}
              onChange={(e) => setProfile((p) => ({ ...p, sex: e.target.value }))}
              className="input-field mt-1"
            >
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Height (cm)</label>
            <input
              type="number"
              min={50}
              max={300}
              step="0.1"
              value={profile.heightCm}
              onChange={(e) => setProfile((p) => ({ ...p, heightCm: e.target.value }))}
              className="input-field mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Weight (kg)</label>
            <input
              type="number"
              min={20}
              max={500}
              step="0.1"
              value={profile.weightKg}
              onChange={(e) => setProfile((p) => ({ ...p, weightKg: e.target.value }))}
              className="input-field mt-1"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Fitness Goal</label>
          <select
            value={profile.fitnessGoal}
            onChange={(e) => setProfile((p) => ({ ...p, fitnessGoal: e.target.value }))}
            className="input-field mt-1"
          >
            <option value="">Select</option>
            <option value="lose_weight">Lose Weight</option>
            <option value="gain_muscle">Gain Muscle</option>
            <option value="maintain">Maintain</option>
            <option value="improve_endurance">Improve Endurance</option>
            <option value="general_health">General Health</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Activity Level</label>
          <select
            value={profile.activityLevel}
            onChange={(e) => setProfile((p) => ({ ...p, activityLevel: e.target.value }))}
            className="input-field mt-1"
          >
            <option value="">Select</option>
            <option value="sedentary">Sedentary</option>
            <option value="lightly_active">Lightly Active</option>
            <option value="moderately_active">Moderately Active</option>
            <option value="very_active">Very Active</option>
            <option value="extremely_active">Extremely Active</option>
          </select>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>

      <div className="mt-8 border-t border-gray-200 pt-6">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="btn-secondary w-full text-red-600 border-red-200 hover:bg-red-50"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
