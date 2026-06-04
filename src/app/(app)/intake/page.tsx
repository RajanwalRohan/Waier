"use client";

import { useEffect, useState } from "react";
import { HydrationCard } from "@/components/HydrationCard";

interface Modifier {
  id: string;
  kind: string;
  name: string | null;
  amount: number | null;
  unit: string | null;
  takenAt: string;
}

const QUICK: Array<{ label: string; kind: string; name: string; amount?: number; unit?: string }> = [
  { label: "Coffee", kind: "caffeine", name: "Coffee", amount: 95, unit: "mg" },
  { label: "Energy drink", kind: "caffeine", name: "Energy drink", amount: 160, unit: "mg" },
  { label: "Tea", kind: "caffeine", name: "Tea", amount: 47, unit: "mg" },
  { label: "Alcohol", kind: "alcohol", name: "Drink", amount: 1, unit: "drinks" },
  { label: "Supplement", kind: "supplement", name: "Supplement" },
  { label: "Sleep aid", kind: "sleep_aid", name: "Sleep aid" },
];

const KIND_STYLE: Record<string, string> = {
  caffeine: "text-amber-600 dark:text-amber-400",
  alcohol: "text-rose-600 dark:text-rose-400",
  supplement: "text-emerald-600 dark:text-emerald-400",
  sleep_aid: "text-indigo-600 dark:text-indigo-400",
};

export default function IntakePage() {
  const [mods, setMods] = useState<Modifier[]>([]);

  async function load() {
    const r = await fetch("/api/modifiers", { headers: { "X-Requested-With": "XMLHttpRequest" } });
    const j = await r.json();
    if (j?.success) setMods(j.data.modifiers as Modifier[]);
  }
  useEffect(() => {
    load();
  }, []);

  async function add(q: (typeof QUICK)[number]) {
    await fetch("/api/modifiers", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ kind: q.kind, name: q.name, amount: q.amount, unit: q.unit }),
    });
    load();
  }

  async function remove(id: string) {
    setMods((prev) => prev.filter((m) => m.id !== id));
    await fetch(`/api/modifiers?id=${id}`, { method: "DELETE", headers: { "X-Requested-With": "XMLHttpRequest" } });
  }

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Intake</h1>
        <p className="mt-1 text-sm text-slate-400">Water and the things that nudge your numbers.</p>
      </div>

      <HydrationCard />

      <div className="card">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Log an intake</p>
        <div className="grid grid-cols-3 gap-2">
          {QUICK.map((q) => (
            <button
              key={q.label}
              onClick={() => add(q)}
              className="rounded-xl bg-slate-100 py-3 text-xs font-semibold text-slate-600 transition-all active:scale-95 dark:bg-slate-800 dark:text-slate-300"
            >
              {q.label}
            </button>
          ))}
        </div>

        {mods.length > 0 && (
          <>
            <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">Today</p>
            <div className="space-y-2">
              {mods.map((m) => (
                <div key={m.id} className="flex items-center gap-3 text-sm">
                  <span className={`font-medium capitalize ${KIND_STYLE[m.kind] ?? "text-slate-500"}`}>{m.name ?? m.kind.replace("_", " ")}</span>
                  {m.amount != null && <span className="text-xs text-slate-400">{m.amount}{m.unit ? ` ${m.unit}` : ""}</span>}
                  <span className="ml-auto text-xs text-slate-400">
                    {new Date(m.takenAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                  <button onClick={() => remove(m.id)} className="text-xs text-slate-400 hover:text-red-500">✕</button>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="mt-5 text-[11px] leading-relaxed text-slate-400">
          Intake is tracked for context and Wynn&apos;s correlations. It does not affect your Flow.
        </p>
      </div>
    </div>
  );
}
