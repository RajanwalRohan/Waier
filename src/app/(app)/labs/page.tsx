"use client";

import { useEffect, useState } from "react";
import { labStatusLabel, labStatusColor, type LabStatus } from "@/lib/labs";

interface LabTest {
  testName: string;
  unit: string | null;
  panel: string | null;
  latest: number;
  latestId: string;
  refRangeLow: number | null;
  refRangeHigh: number | null;
  status: LabStatus;
  trend: "up" | "down" | "flat" | "none";
  series: Array<{ date: string; value: number }>;
}

const inputCls = "w-full rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-white";
const TREND_ARROW: Record<string, string> = { up: "↑", down: "↓", flat: "→", none: "" };

export default function LabsPage() {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [low, setLow] = useState("");
  const [high, setHigh] = useState("");
  const [date, setDate] = useState("");

  async function load() {
    const r = await fetch("/api/labs", { headers: { "X-Requested-With": "XMLHttpRequest" } });
    const j = await r.json();
    if (j?.success) setTests(j.data.tests as LabTest[]);
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!name.trim() || value === "") return;
    await fetch("/api/labs", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({
        testName: name.trim(),
        value: Number(value),
        unit: unit || undefined,
        refRangeLow: low !== "" ? Number(low) : undefined,
        refRangeHigh: high !== "" ? Number(high) : undefined,
        collectedAt: date || undefined,
      }),
    });
    setName(""); setValue(""); setUnit(""); setLow(""); setHigh(""); setDate(""); setShowForm(false);
    load();
  }

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Labs</h1>
          <p className="mt-1 text-sm text-slate-400">Track results against reference ranges.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white transition-all active:scale-95">{showForm ? "Close" : "Add result"}</button>
      </div>

      {showForm && (
        <div className="card mb-6 space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Test (e.g. LDL, HbA1c)" className={inputCls} />
          <div className="flex gap-2">
            <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value" className={inputCls} />
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit" className="w-28 rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-white" />
          </div>
          <div className="flex gap-2">
            <input type="number" value={low} onChange={(e) => setLow(e.target.value)} placeholder="Ref low" className={inputCls} />
            <input type="number" value={high} onChange={(e) => setHigh(e.target.value)} placeholder="Ref high" className={inputCls} />
          </div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          <button onClick={add} disabled={!name.trim() || value === ""} className="w-full rounded-xl bg-accent-500 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40">Save result</button>
        </div>
      )}

      {tests.length === 0 ? (
        <div className="card text-center"><p className="text-sm text-slate-400">No lab results yet.</p></div>
      ) : (
        <div className="space-y-3">
          {tests.map((t) => (
            <div key={t.testName} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{t.testName}</p>
                  {t.panel && <p className="text-[11px] text-slate-400">{t.panel}</p>}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {t.latest}
                    {TREND_ARROW[t.trend] && <span className="ml-1 text-sm text-slate-400">{TREND_ARROW[t.trend]}</span>}
                  </p>
                  <p className={`text-xs font-semibold ${labStatusColor(t.status)}`}>{labStatusLabel(t.status)}{t.unit ? ` · ${t.unit}` : ""}</p>
                </div>
              </div>
              {(t.refRangeLow !== null || t.refRangeHigh !== null) && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Reference: {t.refRangeLow ?? "—"}{t.refRangeLow !== null || t.refRangeHigh !== null ? " to " : ""}{t.refRangeHigh ?? "—"} {t.unit ?? ""}
                </p>
              )}
              {t.series.length >= 2 && <MiniSeries series={t.series} />}
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 text-[11px] leading-relaxed text-slate-400">
        Out-of-range means outside the lab&apos;s stated reference, not a diagnosis. Discuss results with your healthcare provider.
      </p>
    </div>
  );
}

function MiniSeries({ series }: { series: Array<{ date: string; value: number }> }) {
  const vals = series.map((s) => s.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const W = 280;
  const H = 50;
  const pts = series.map((s, i) => `${(i / (series.length - 1)) * W},${H - ((s.value - min) / range) * H}`).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="mt-3 overflow-visible">
      <polyline points={pts} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
