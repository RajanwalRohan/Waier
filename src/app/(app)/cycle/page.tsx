"use client";

import { useEffect, useState } from "react";

interface Stats {
  cycleLength: number;
  estimated: boolean;
  lastStart: string | null;
  nextPredicted: string | null;
  daysUntilNext: number | null;
  day: number | null;
  phase: "menstrual" | "follicular" | "ovulatory" | "luteal" | null;
}
interface Entry {
  id: string;
  date: string;
  kind: string;
  flow: string | null;
  symptoms: string[];
  note: string | null;
}
interface CycleData {
  pregnant: boolean;
  stats: Stats | null;
  recent: Entry[];
}

const PHASE_STYLE: Record<string, { label: string; color: string }> = {
  menstrual: { label: "Menstrual", color: "text-rose-500" },
  follicular: { label: "Follicular", color: "text-emerald-500" },
  ovulatory: { label: "Ovulatory", color: "text-amber-500" },
  luteal: { label: "Luteal", color: "text-indigo-500" },
};

const SYMPTOMS = ["Cramps", "Fatigue", "Mood", "Headache", "Bloating", "Tender", "Cravings", "Acne"];

export default function CyclePage() {
  const [data, setData] = useState<CycleData | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  async function load() {
    const r = await fetch("/api/cycle", { headers: { "X-Requested-With": "XMLHttpRequest" } });
    const j = await r.json();
    if (j?.success) setData(j.data as CycleData);
  }
  useEffect(() => {
    load();
  }, []);

  async function log(payload: Record<string, unknown>) {
    await fetch("/api/cycle", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify(payload),
    });
    await load();
  }

  async function saveSymptoms() {
    if (picked.length === 0) return;
    await log({ kind: "symptom", symptoms: picked });
    setPicked([]);
  }

  async function remove(id: string) {
    setData((prev) => (prev ? { ...prev, recent: prev.recent.filter((e) => e.id !== id) } : prev));
    await fetch(`/api/cycle?id=${id}`, { method: "DELETE", headers: { "X-Requested-With": "XMLHttpRequest" } });
  }

  const stats = data?.stats;
  const phase = stats?.phase ? PHASE_STYLE[stats.phase] : null;

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Cycle</h1>
        <p className="mt-1 text-sm text-slate-400">Private to you. Never shared or used in rankings.</p>
      </div>

      {data?.pregnant && (
        <div className="card mb-6 border-accent-200 bg-accent-50/40 dark:border-accent-500/30 dark:bg-accent-900/10">
          <p className="text-sm text-slate-600 dark:text-slate-300">Cycle predictions are paused while pregnancy is set in your medical profile.</p>
        </div>
      )}

      {/* Phase + prediction */}
      {stats && stats.phase && (
        <div className="card mb-6">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current phase</p>
              <p className={`mt-1 text-2xl font-bold tracking-tight ${phase?.color}`}>{phase?.label}</p>
              {stats.day !== null && <p className="mt-0.5 text-xs text-slate-400">Day {stats.day} of your cycle</p>}
            </div>
            {stats.nextPredicted && (
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Next period</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{stats.nextPredicted}</p>
                {stats.daysUntilNext !== null && (
                  <p className="text-xs text-slate-400">{stats.daysUntilNext >= 0 ? `in ${stats.daysUntilNext} days` : "overdue"}</p>
                )}
              </div>
            )}
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            {stats.estimated ? "Estimated from a 28-day default; logs sharpen this." : `Based on your ~${stats.cycleLength}-day average.`}
          </p>
        </div>
      )}

      {/* Logging */}
      <div className="card mb-6 space-y-4">
        <div className="flex gap-2">
          <button onClick={() => log({ kind: "period_start" })} className="flex-1 rounded-xl bg-rose-500 py-3 text-sm font-semibold text-white transition-all active:scale-95">
            Period started
          </button>
          <button onClick={() => log({ kind: "period_end" })} className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-600 transition-all active:scale-95 dark:bg-slate-800 dark:text-slate-300">
            Period ended
          </button>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Symptoms today</p>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map((s) => {
              const on = picked.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => setPicked((p) => (on ? p.filter((x) => x !== s) : [...p, s]))}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${on ? "bg-accent-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          {picked.length > 0 && (
            <button onClick={saveSymptoms} className="mt-3 w-full rounded-xl bg-accent-500 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98]">
              Save {picked.length} symptom{picked.length === 1 ? "" : "s"}
            </button>
          )}
        </div>
      </div>

      {/* History */}
      {data && data.recent.length > 0 && (
        <div className="card">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Recent</p>
          <div className="space-y-2">
            {data.recent.map((e) => (
              <div key={e.id} className="flex items-center gap-3 text-sm">
                <span className="w-16 shrink-0 text-xs text-slate-400">{e.date.slice(5)}</span>
                <span className="text-slate-700 dark:text-slate-200">
                  {e.kind === "period_start" ? "Period started" : e.kind === "period_end" ? "Period ended" : e.symptoms.join(", ")}
                </span>
                <button onClick={() => remove(e.id)} className="ml-auto text-xs text-slate-400 hover:text-red-500">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
