"use client";

import { useEffect, useState } from "react";

interface MatchupCategory {
  label: string;
  myValue: number;
  oppValue: number;
  winning: boolean | "tie";
}
interface YourMatchup {
  bye?: boolean;
  opponent?: string;
  myPoints?: number;
  oppPoints?: number;
  result?: "winning" | "losing" | "tie";
  categories?: MatchupCategory[];
}
interface Standing {
  rank: number;
  name: string;
  isMe: boolean;
  points: number;
}
interface LeagueDetail {
  id: string;
  name: string;
  joinCode: string | null;
  memberCount: number;
  period: number;
  periodStart: string;
  periodEnd: string;
  categories: string[];
  yourMatchup: YourMatchup | null;
  standings: Standing[];
}

export default function ChampionshipDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<LeagueDetail | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const r = await fetch(`/api/championship/${params.id}`, { headers: { "X-Requested-With": "XMLHttpRequest" } });
    const j = await r.json();
    if (j?.success) setData(j.data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [params.id]);

  async function leave() {
    await fetch(`/api/championship/${params.id}`, { method: "DELETE", headers: { "X-Requested-With": "XMLHttpRequest" } });
    window.location.href = "/championship";
  }

  if (loading) return <div className="mx-auto max-w-lg px-5 pt-8"><div className="card h-48 animate-pulse" /></div>;
  if (!data)
    return (
      <div className="mx-auto max-w-lg px-5 pt-8">
        <a href="/championship" className="text-sm text-slate-400">&larr; Leagues</a>
        <div className="card mt-4 text-center"><p className="text-sm text-slate-400">League not found.</p></div>
      </div>
    );

  const m = data.yourMatchup;

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-24">
      <a href="/championship" className="mb-4 inline-block text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">&larr; Leagues</a>

      <div className="mb-2 flex items-start justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{data.name}</h1>
        <button onClick={leave} className="text-xs text-slate-400 hover:text-red-500">Leave</button>
      </div>
      <p className="mb-6 text-xs text-slate-400">
        Matchup {data.period} · {data.periodStart} to {data.periodEnd}
        {data.joinCode && <> · code <span className="font-bold tracking-widest text-accent-500">{data.joinCode}</span></>}
      </p>

      {/* Your matchup scoreboard */}
      {m && !m.bye && m.categories ? (
        <div className="card mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-center">
              <p className="text-xs text-slate-400">You</p>
              <p className={`text-3xl font-bold ${m.result === "winning" ? "text-emerald-500" : m.result === "losing" ? "text-slate-400" : "text-slate-900 dark:text-white"}`}>{m.myPoints}</p>
            </div>
            <span className="text-sm font-medium text-slate-400">vs</span>
            <div className="text-center">
              <p className="text-xs text-slate-400">{m.opponent}</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{m.oppPoints}</p>
            </div>
          </div>
          <div className="space-y-2">
            {m.categories.map((c) => (
              <div key={c.label} className="flex items-center gap-2 text-sm">
                <span className={`w-12 text-right tabular-nums ${c.winning === true ? "font-bold text-emerald-500" : "text-slate-500 dark:text-slate-400"}`}>{fmt(c.myValue)}</span>
                <span className="flex-1 text-center text-xs text-slate-400">{c.label}</span>
                <span className={`w-12 tabular-nums ${c.winning === false ? "font-bold text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>{fmt(c.oppValue)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : m?.bye ? (
        <div className="card mb-6 text-center"><p className="text-sm text-slate-400">You have a bye this matchup. Keep stacking stats for the standings.</p></div>
      ) : (
        <div className="card mb-6 text-center"><p className="text-sm text-slate-400">Waiting for more members to start a matchup.</p></div>
      )}

      {/* Standings */}
      <div className="card">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Standings</p>
        <div className="space-y-1">
          {data.standings.map((s) => (
            <div key={s.rank} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${s.isMe ? "bg-accent-50 dark:bg-accent-900/20" : ""}`}>
              <span className="w-6 text-sm font-bold tabular-nums text-slate-400">{s.rank}</span>
              <span className="text-sm font-medium text-slate-900 dark:text-white">{s.isMe ? "You" : s.name}</span>
              <span className="ml-auto text-sm font-bold tabular-nums text-accent-500">{s.points}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">Points = category wins in this matchup period. Categories: {data.categories.join(", ")}.</p>
      </div>
    </div>
  );
}

function fmt(v: number): string {
  return v >= 1000 ? Math.round(v).toLocaleString() : Number.isInteger(v) ? v.toString() : v.toFixed(1);
}
