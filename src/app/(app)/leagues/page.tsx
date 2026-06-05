"use client";

import { useEffect, useState } from "react";

interface Row {
  rank: number;
  lp: number;
  zone: "promote" | "hold" | "demote";
  isMe: boolean;
  name: string;
}
interface LeagueData {
  joined: boolean;
  tier: string;
  weekKey: string;
  weekStart?: string;
  weekEnd?: string;
  size?: number;
  leaderboard?: Row[];
}

const ZONE_BAR: Record<string, string> = {
  promote: "border-l-emerald-500",
  hold: "border-l-transparent",
  demote: "border-l-red-400",
};

export default function LeaguesPage() {
  const [data, setData] = useState<LeagueData | null>(null);
  const [joining, setJoining] = useState(false);

  async function load() {
    const r = await fetch("/api/leagues", { headers: { "X-Requested-With": "XMLHttpRequest" } });
    const j = await r.json();
    if (j?.success) setData(j.data);
  }
  useEffect(() => {
    load();
  }, []);

  async function join() {
    setJoining(true);
    try {
      await fetch("/api/leagues", { method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" }, body: "{}" });
      await load();
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Open League</h1>
        <p className="mt-1 text-sm text-slate-400">A weekly cohort of athletes at your tier. Climb on League Points.</p>
      </div>

      {data === null ? (
        <div className="card h-32 animate-pulse" />
      ) : !data.joined ? (
        <div className="card text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">Join this week&apos;s <span className="font-semibold text-accent-500">{data.tier}</span> league and start earning League Points from your activity.</p>
          <button onClick={join} disabled={joining} className="mt-4 rounded-xl bg-accent-500 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {joining ? "Joining..." : "Join this week"}
          </button>
        </div>
      ) : (
        <>
          <div className="card mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Your league</p>
              <p className="text-lg font-bold text-accent-500">{data.tier}</p>
            </div>
            <p className="text-right text-xs text-slate-400">{data.weekStart} to {data.weekEnd}<br />{data.size} athletes</p>
          </div>

          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Leaderboard</p>
              <div className="flex gap-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Promote</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" />Demote</span>
              </div>
            </div>
            <div className="space-y-1">
              {data.leaderboard!.map((row) => (
                <div
                  key={row.rank}
                  className={`flex items-center gap-3 rounded-r-xl border-l-4 px-3 py-2.5 ${ZONE_BAR[row.zone]} ${row.isMe ? "bg-accent-50 dark:bg-accent-900/20" : ""}`}
                >
                  <span className="w-6 text-sm font-bold tabular-nums text-slate-400">{row.rank}</span>
                  <span className={`text-sm font-medium ${row.isMe ? "text-accent-600 dark:text-accent-300" : "text-slate-700 dark:text-slate-200"}`}>{row.name}</span>
                  <span className="ml-auto text-sm font-bold tabular-nums text-slate-900 dark:text-white">{row.lp}<span className="ml-0.5 text-[10px] text-slate-400">LP</span></span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
              LP rewards both your output and your week-over-week improvement, so showing up and getting better both count.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
