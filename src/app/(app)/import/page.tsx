"use client";

import { useEffect, useRef, useState } from "react";

interface Job {
  id: string;
  source: string;
  imported: number;
  skipped: number;
  errors: number;
  date: string;
}
interface Summary {
  imported: number;
  skipped: number;
  errors: number;
  total: number;
}

const TEMPLATE = "type,value,unit,date\nsteps,9500,steps,2026-06-01\nheart_rate,62,bpm,2026-06-01\nsleep_hours,7.2,hours,2026-06-01\nweight,72.5,kg,2026-06-01";

export default function ImportPage() {
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadJobs() {
    const r = await fetch("/api/import", { headers: { "X-Requested-With": "XMLHttpRequest" } });
    const j = await r.json();
    if (j?.success) setJobs(j.data.jobs);
  }
  useEffect(() => {
    loadJobs();
  }, []);

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  async function run() {
    setBusy(true);
    setError("");
    setSummary(null);
    try {
      const r = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ csv }),
      });
      const j = await r.json();
      if (j?.success) {
        setSummary(j.data);
        setCsv("");
        loadJobs();
      } else {
        setError(j.error ?? "Import failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Import data</h1>
        <p className="mt-1 text-sm text-slate-400">Bring your history over from another app via CSV.</p>
      </div>

      {summary && (
        <div className="card mb-6 border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-900/10">
          <p className="font-semibold text-slate-900 dark:text-white">Import complete</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {summary.imported} imported · {summary.skipped} skipped (already present) · {summary.errors} invalid
          </p>
        </div>
      )}
      {error && <div className="card mb-6 border-red-200 bg-red-50/40 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-900/10 dark:text-red-300">{error}</div>}

      <div className="card mb-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">CSV data</p>
          <button onClick={() => fileRef.current?.click()} className="text-sm font-medium text-accent-500">Upload file</button>
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </div>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={TEMPLATE}
          rows={8}
          className="w-full resize-none rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800/60 dark:text-white"
        />
        <button onClick={run} disabled={busy || !csv.trim()} className="mt-3 w-full rounded-xl bg-accent-500 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40">
          {busy ? "Importing..." : "Import"}
        </button>
      </div>

      <div className="card mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Format</p>
        <p className="mb-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Columns <span className="font-mono">type</span>, <span className="font-mono">value</span>, and <span className="font-mono">date</span> are required; <span className="font-mono">unit</span> is optional. Duplicate readings are skipped automatically.
        </p>
        <pre className="overflow-x-auto rounded-xl bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">{TEMPLATE}</pre>
        <button onClick={() => setCsv(TEMPLATE)} className="mt-2 text-xs font-medium text-accent-500">Use this as a starting point</button>
      </div>

      {jobs.length > 0 && (
        <div className="card">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Recent imports</p>
          <div className="space-y-2">
            {jobs.map((j) => (
              <div key={j.id} className="flex items-center gap-3 text-sm">
                <span className="w-16 shrink-0 text-xs text-slate-400">{j.date.slice(5)}</span>
                <span className="capitalize text-slate-700 dark:text-slate-200">{j.source}</span>
                <span className="ml-auto text-xs text-slate-400">{j.imported} imported</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
