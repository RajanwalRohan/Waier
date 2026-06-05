"use client";

import { useEffect, useState } from "react";

interface ProfileView {
  username: string | null;
  name: string | null;
  relationship: "self" | "friends" | "pending" | "none";
  profile: {
    flow: number | null;
    tier: string | null;
    streaks: { bubble: number; meal: number; workout: number } | null;
    stats: Record<string, number> | null;
    pillars: Record<string, number | null> | null;
  };
}

export default function PublicProfilePage({ params }: { params: { username: string } }) {
  const [data, setData] = useState<ProfileView | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sent, setSent] = useState(false);

  async function load() {
    const r = await fetch(`/api/social/profile/${params.username}`, { headers: { "X-Requested-With": "XMLHttpRequest" } });
    if (r.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const j = await r.json();
    if (j?.success) setData(j.data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [params.username]);

  async function addFriend() {
    await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ username: params.username }),
    });
    setSent(true);
  }

  if (loading) return <div className="mx-auto max-w-lg px-5 pt-8"><div className="card h-48 animate-pulse" /></div>;
  if (notFound || !data)
    return (
      <div className="mx-auto max-w-lg px-5 pt-8">
        <a href="/friends" className="text-sm text-slate-400">&larr; Friends</a>
        <div className="card mt-4 text-center"><p className="text-sm text-slate-400">Profile not found.</p></div>
      </div>
    );

  const p = data.profile;

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-24">
      <a href="/friends" className="mb-4 inline-block text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">&larr; Friends</a>

      <div className="card mb-6 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-accent-100 text-xl font-bold text-accent-600 dark:bg-accent-900/30 dark:text-accent-300">
          {(data.name ?? data.username ?? "?").charAt(0).toUpperCase()}
        </div>
        <p className="text-lg font-bold text-slate-900 dark:text-white">{data.name ?? `@${data.username}`}</p>
        {data.username && <p className="text-sm text-slate-400">@{data.username}</p>}

        {data.relationship === "none" && (
          <button onClick={addFriend} disabled={sent} className="mt-4 rounded-xl bg-accent-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {sent ? "Request sent" : "Add friend"}
          </button>
        )}
        {data.relationship === "friends" && <p className="mt-3 text-xs font-medium text-emerald-500">Friends</p>}
        {data.relationship === "pending" && <p className="mt-3 text-xs font-medium text-amber-500">Request pending</p>}
      </div>

      {p.flow !== null ? (
        <div className="card mb-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Flow</p>
          <p className="text-5xl font-bold tracking-tight text-slate-900 dark:text-white">{p.flow}</p>
          {p.tier && <p className="mt-1 text-sm font-semibold text-accent-500">{p.tier}</p>}
        </div>
      ) : (
        <div className="card mb-4 text-center"><p className="text-sm text-slate-400">Flow is private.</p></div>
      )}

      {p.streaks && (
        <div className="card mb-4 grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Bubble", value: p.streaks.bubble },
            { label: "Meals", value: p.streaks.meal },
            { label: "Workouts", value: p.streaks.workout },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {p.stats && (
        <div className="card">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Stats</p>
          {Object.entries(p.stats).map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm">
              <span className="capitalize text-slate-500 dark:text-slate-400">{k}</span>
              <span className="font-semibold text-slate-900 dark:text-white">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
