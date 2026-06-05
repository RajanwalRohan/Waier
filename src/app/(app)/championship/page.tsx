"use client";

import { useEffect, useState } from "react";

interface LeagueSummary {
  id: string;
  name: string;
  joinCode: string;
  memberCount: number;
  isOwner: boolean;
}

export default function ChampionshipPage() {
  const [leagues, setLeagues] = useState<LeagueSummary[] | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch("/api/championship", { headers: { "X-Requested-With": "XMLHttpRequest" } });
    const j = await r.json();
    if (j?.success) setLeagues(j.data.leagues);
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!name.trim()) return;
    const r = await fetch("/api/championship", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (r.ok) { setName(""); load(); }
  }

  async function join() {
    const r = await fetch("/api/championship/join", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ joinCode: code.trim() }),
    });
    const j = await r.json();
    setMsg(j.success ? "Joined!" : j.error ?? "Could not join");
    if (j.success) { setCode(""); load(); }
  }

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Championship League</h1>
        <p className="mt-1 text-sm text-slate-400">Head-to-head matchups with your friends.</p>
      </div>

      {msg && <div className="card mb-4 py-3 text-sm text-slate-600 dark:text-slate-300">{msg}</div>}

      {leagues && leagues.length > 0 && (
        <div className="mb-6 space-y-2">
          {leagues.map((l) => (
            <a key={l.id} href={`/championship/${l.id}`} className="card flex items-center justify-between transition-all hover:shadow-glass-lg active:scale-[0.99]">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{l.name}</p>
                <p className="text-xs text-slate-400">{l.memberCount} member{l.memberCount === 1 ? "" : "s"}{l.isOwner ? " · you own this" : ""}</p>
              </div>
              <svg className="h-5 w-5 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </a>
          ))}
        </div>
      )}

      <div className="card mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Create a league</p>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="League name" className="flex-1 rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-white" />
          <button onClick={create} disabled={!name.trim()} className="rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white disabled:opacity-40">Create</button>
        </div>
      </div>

      <div className="card">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Join with a code</p>
        <div className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} className="flex-1 rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 text-sm uppercase tracking-widest dark:border-slate-700 dark:bg-slate-800/60 dark:text-white" />
          <button onClick={join} disabled={code.length < 4} className="rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white disabled:opacity-40">Join</button>
        </div>
      </div>
    </div>
  );
}
