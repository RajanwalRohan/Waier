"use client";

import { useEffect, useState } from "react";

interface CheckIn {
  date: string;
  mood: number;
  energy: number;
  focus: number;
  note: string | null;
}
interface WellbeingData {
  today: { mood: number; energy: number; focus: number; note: string | null } | null;
  checkIns: CheckIn[];
  stress: Array<{ date: string; value: number }>;
}

const AXES = [
  { key: "mood", label: "Mood", low: "Low", high: "Great" },
  { key: "energy", label: "Energy", low: "Drained", high: "Energized" },
  { key: "focus", label: "Focus", low: "Foggy", high: "Sharp" },
] as const;

export default function WellbeingPage() {
  const [data, setData] = useState<WellbeingData | null>(null);
  const [mood, setMood] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [focus, setFocus] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/wellbeing", { headers: { "X-Requested-With": "XMLHttpRequest" } })
      .then((r) => r.json())
      .then((j) => {
        if (j?.success) {
          const d = j.data as WellbeingData;
          setData(d);
          if (d.today) {
            setMood(d.today.mood);
            setEnergy(d.today.energy);
            setFocus(d.today.focus);
            setNote(d.today.note ?? "");
          }
        }
      })
      .catch(() => {});
  }, []);

  const values: Record<string, number> = { mood, energy, focus };
  const setters: Record<string, (n: number) => void> = { mood: setMood, energy: setEnergy, focus: setFocus };
  const canSave = mood > 0 && energy > 0 && focus > 0 && !saving;

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/wellbeing", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ mood, energy, focus, note: note || undefined }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  const latestStress = data?.stress.length ? data.stress[data.stress.length - 1].value : null;

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Wellbeing</h1>
        <p className="mt-1 text-sm text-slate-400">How are you feeling today?</p>
      </div>

      {/* Daily check-in */}
      <div className="card mb-6">
        {AXES.map((axis) => (
          <div key={axis.key} className="mb-5 last:mb-0">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{axis.label}</span>
              <span className="text-[11px] text-slate-400">{axis.low} &rarr; {axis.high}</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = values[axis.key] === n;
                return (
                  <button
                    key={n}
                    onClick={() => setters[axis.key](n)}
                    className={`h-11 flex-1 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                      active
                        ? "bg-accent-500 text-white shadow-glass"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                    aria-pressed={active}
                    aria-label={`${axis.label} ${n}`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything on your mind? (optional)"
          rows={2}
          maxLength={500}
          className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white/60 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800/60 dark:text-white"
        />

        <button
          onClick={submit}
          disabled={!canSave}
          className="mt-3 w-full rounded-xl bg-accent-500 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40"
        >
          {saved ? "Saved ✓" : saving ? "Saving..." : data?.today ? "Update check-in" : "Save check-in"}
        </button>
      </div>

      {/* Wearable stress */}
      {latestStress !== null && (
        <div className="card mb-6">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Stress (from wearable)</p>
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{latestStress}</span>
          </div>
          {data && data.stress.length >= 2 && <StressBars stress={data.stress} />}
        </div>
      )}

      {/* History */}
      {data && data.checkIns.length > 0 && (
        <div className="card">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Recent check-ins</p>
          <div className="space-y-2.5">
            {data.checkIns.slice(-7).reverse().map((c) => (
              <div key={c.date} className="flex items-center gap-3 text-sm">
                <span className="w-16 shrink-0 text-xs text-slate-400">{c.date.slice(5)}</span>
                <Axis label="M" value={c.mood} />
                <Axis label="E" value={c.energy} />
                <Axis label="F" value={c.focus} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Axis({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-1 items-center gap-1.5">
      <span className="text-[11px] font-medium text-slate-400">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-accent-500" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
    </div>
  );
}

function StressBars({ stress }: { stress: Array<{ date: string; value: number }> }) {
  const recent = stress.slice(-14);
  return (
    <div className="mt-3 flex items-end gap-1" style={{ height: 40 }}>
      {recent.map((s, i) => {
        const h = 6 + (Math.min(100, s.value) / 100) * 34;
        const color = s.value <= 33 ? "bg-emerald-400" : s.value <= 66 ? "bg-amber-400" : "bg-red-400";
        return <div key={i} className={`flex-1 rounded-full ${color}`} style={{ height: `${h}px` }} />;
      })}
    </div>
  );
}
