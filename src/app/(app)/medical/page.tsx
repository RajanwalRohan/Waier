"use client";

import { useEffect, useState } from "react";

interface Medication {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  prescriber: string | null;
}
interface Record {
  id: string;
  type: string;
  name: string;
  date: string | null;
  providerName: string | null;
  detail: string | null;
}

const RECORD_TYPES = [
  { value: "procedure", label: "Procedure" },
  { value: "vaccine", label: "Vaccine" },
  { value: "doctor_visit", label: "Doctor visit" },
];

const inputCls = "w-full rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-white";

export default function MedicalPage() {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [records, setRecords] = useState<Record[]>([]);

  // medication form
  const [medName, setMedName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");

  // record form
  const [recType, setRecType] = useState("procedure");
  const [recName, setRecName] = useState("");
  const [recDate, setRecDate] = useState("");
  const [recDetail, setRecDetail] = useState("");

  async function load() {
    const [m, r] = await Promise.all([
      fetch("/api/medical/medications", { headers: { "X-Requested-With": "XMLHttpRequest" } }).then((x) => x.json()),
      fetch("/api/medical/records", { headers: { "X-Requested-With": "XMLHttpRequest" } }).then((x) => x.json()),
    ]);
    if (m?.success) setMeds(m.data.medications);
    if (r?.success) setRecords(r.data.records);
  }
  useEffect(() => {
    load();
  }, []);

  async function addMed() {
    if (!medName.trim()) return;
    await fetch("/api/medical/medications", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ name: medName.trim(), dosage: dosage || undefined, frequency: frequency || undefined }),
    });
    setMedName("");
    setDosage("");
    setFrequency("");
    load();
  }

  async function addRecord() {
    if (!recName.trim()) return;
    await fetch("/api/medical/records", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ type: recType, name: recName.trim(), date: recDate || undefined, detail: recDetail || undefined }),
    });
    setRecName("");
    setRecDate("");
    setRecDetail("");
    load();
  }

  async function delMed(id: string) {
    setMeds((p) => p.filter((m) => m.id !== id));
    await fetch(`/api/medical/medications?id=${id}`, { method: "DELETE", headers: { "X-Requested-With": "XMLHttpRequest" } });
  }
  async function delRecord(id: string) {
    setRecords((p) => p.filter((r) => r.id !== id));
    await fetch(`/api/medical/records?id=${id}`, { method: "DELETE", headers: { "X-Requested-With": "XMLHttpRequest" } });
  }

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Medical</h1>
          <p className="mt-1 text-sm text-slate-400">Private to you. Helps Wynn give safer advice.</p>
        </div>
        <a href="/labs" className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Labs</a>
      </div>

      {/* Medications */}
      <div className="card mb-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Medications</p>
        <div className="space-y-2">
          <input value={medName} onChange={(e) => setMedName(e.target.value)} placeholder="Name (e.g. Vitamin D)" className={inputCls} />
          <div className="flex gap-2">
            <input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="Dosage" className={inputCls} />
            <input value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="Frequency" className={inputCls} />
          </div>
          <button onClick={addMed} disabled={!medName.trim()} className="w-full rounded-xl bg-accent-500 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40">Add medication</button>
        </div>
        {meds.length > 0 && (
          <div className="mt-4 space-y-2">
            {meds.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-slate-900 dark:text-white">{m.name}</span>
                {(m.dosage || m.frequency) && <span className="text-xs text-slate-400">{[m.dosage, m.frequency].filter(Boolean).join(" · ")}</span>}
                <button onClick={() => delMed(m.id)} className="ml-auto text-xs text-slate-400 hover:text-red-500">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Records */}
      <div className="card">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Procedures, vaccines &amp; visits</p>
        <div className="space-y-2">
          <select value={recType} onChange={(e) => setRecType(e.target.value)} className={inputCls}>
            {RECORD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input value={recName} onChange={(e) => setRecName(e.target.value)} placeholder="Name" className={inputCls} />
          <div className="flex gap-2">
            <input type="date" value={recDate} onChange={(e) => setRecDate(e.target.value)} className={inputCls} />
            <input value={recDetail} onChange={(e) => setRecDetail(e.target.value)} placeholder="Detail (optional)" className={inputCls} />
          </div>
          <button onClick={addRecord} disabled={!recName.trim()} className="w-full rounded-xl bg-accent-500 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40">Add record</button>
        </div>
        {records.length > 0 && (
          <div className="mt-4 space-y-2">
            {records.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-sm">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">{r.type.replace("_", " ")}</span>
                <span className="font-medium text-slate-900 dark:text-white">{r.name}</span>
                {r.date && <span className="text-xs text-slate-400">{r.date}</span>}
                <button onClick={() => delRecord(r.id)} className="ml-auto text-xs text-slate-400 hover:text-red-500">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
