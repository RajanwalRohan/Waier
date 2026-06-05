"use client";

import { useEffect, useState } from "react";

interface Person {
  userId?: string;
  requestId?: string;
  name: string | null;
  username: string | null;
  flow: number | null;
  tier: string | null;
}
interface BoardRow extends Person {
  rank: number;
  isMe: boolean;
}
interface FriendsData {
  friends: Person[];
  incoming: Person[];
  outgoing: Person[];
  leaderboard: BoardRow[];
}
interface Social {
  username: string | null;
  privacy: { showFlow: boolean; showStreaks: boolean; showStats: boolean; showPillars: boolean };
}

export default function FriendsPage() {
  const [data, setData] = useState<FriendsData | null>(null);
  const [social, setSocial] = useState<Social | null>(null);
  const [handle, setHandle] = useState("");
  const [addName, setAddName] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const [f, s] = await Promise.all([
      fetch("/api/friends", { headers: { "X-Requested-With": "XMLHttpRequest" } }).then((r) => r.json()),
      fetch("/api/social", { headers: { "X-Requested-With": "XMLHttpRequest" } }).then((r) => r.json()),
    ]);
    if (f?.success) setData(f.data);
    if (s?.success) setSocial({ username: s.data.username, privacy: s.data.privacy });
  }
  useEffect(() => {
    load();
  }, []);

  async function claimUsername() {
    const r = await fetch("/api/social", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ username: handle }),
    });
    const j = await r.json();
    if (!j.success) setMsg(j.error ?? "Could not set username");
    else { setMsg(""); setHandle(""); load(); }
  }

  async function addFriend() {
    const r = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ username: addName }),
    });
    const j = await r.json();
    setMsg(j.success ? "Request sent." : j.error ?? "Could not send request");
    if (j.success) setAddName("");
    load();
  }

  async function respond(requestId: string, action: "accept" | "decline") {
    await fetch("/api/friends", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ id: requestId, action }),
    });
    load();
  }

  async function togglePrivacy(key: string, value: boolean) {
    setSocial((s) => (s ? { ...s, privacy: { ...s.privacy, [key]: value } } : s));
    await fetch("/api/social", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ [key]: value }),
    });
  }

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Friends</h1>
        <p className="mt-1 text-sm text-slate-400">Compare your Flow and cheer each other on.</p>
      </div>

      {msg && <div className="card mb-4 py-3 text-sm text-slate-600 dark:text-slate-300">{msg}</div>}

      {/* Username */}
      {social && !social.username ? (
        <div className="card mb-6">
          <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Claim your username</p>
          <p className="mb-3 text-xs text-slate-400">Friends use this to find you. 3-20 letters, numbers, or underscores.</p>
          <div className="flex gap-2">
            <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="username" className="flex-1 rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-white" />
            <button onClick={claimUsername} className="rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white">Claim</button>
          </div>
        </div>
      ) : social ? (
        <div className="card mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Your username</p>
            <p className="font-semibold text-slate-900 dark:text-white">@{social.username}</p>
          </div>
          <a href={`/u/${social.username}`} className="text-sm font-medium text-accent-500">View profile</a>
        </div>
      ) : null}

      {/* Add friend */}
      {social?.username && (
        <div className="card mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Add a friend</p>
          <div className="flex gap-2">
            <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="their username" className="flex-1 rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-white" />
            <button onClick={addFriend} disabled={!addName.trim()} className="rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white disabled:opacity-40">Add</button>
          </div>
        </div>
      )}

      {/* Incoming requests */}
      {data && data.incoming.length > 0 && (
        <div className="card mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Requests</p>
          <div className="space-y-2">
            {data.incoming.map((p) => (
              <div key={p.requestId} className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-900 dark:text-white">@{p.username ?? "user"}</span>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => respond(p.requestId!, "accept")} className="rounded-lg bg-accent-500 px-3 py-1 text-xs font-semibold text-white">Accept</button>
                  <button onClick={() => respond(p.requestId!, "decline")} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {data && data.leaderboard.length > 1 && (
        <div className="card mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Leaderboard</p>
          <div className="space-y-1">
            {data.leaderboard.map((row) => (
              <div key={row.userId} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${row.isMe ? "bg-accent-50 dark:bg-accent-900/20" : ""}`}>
                <span className="w-6 text-sm font-bold tabular-nums text-slate-400">{row.rank}</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">{row.isMe ? "You" : `@${row.username ?? "user"}`}</span>
                {row.tier && <span className="text-xs text-slate-400">{row.tier}</span>}
                <span className="ml-auto text-sm font-bold tabular-nums text-accent-500">{row.flow ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      {data && data.friends.length > 0 && (
        <div className="card mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Your friends</p>
          <div className="space-y-1">
            {data.friends.map((p) => (
              <a key={p.userId} href={`/u/${p.username}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <span className="text-sm font-medium text-slate-900 dark:text-white">@{p.username ?? "user"}</span>
                {p.tier && <span className="text-xs text-slate-400">{p.tier}</span>}
                <span className="ml-auto text-sm font-bold tabular-nums text-slate-500 dark:text-slate-300">{p.flow ?? "—"}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Privacy */}
      {social && (
        <div className="card">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">What friends can see</p>
          <div className="space-y-2.5">
            {[
              { key: "showFlow", label: "Flow and rank" },
              { key: "showStreaks", label: "Streaks" },
              { key: "showStats", label: "Stats (workouts, etc.)" },
              { key: "showPillars", label: "Pillar breakdown" },
            ].map((opt) => (
              <label key={opt.key} className="flex items-center justify-between">
                <span className="text-sm text-slate-700 dark:text-slate-200">{opt.label}</span>
                <input
                  type="checkbox"
                  checked={(social.privacy as Record<string, boolean>)[opt.key]}
                  onChange={(e) => togglePrivacy(opt.key, e.target.checked)}
                  className="h-5 w-5 accent-violet-500"
                />
              </label>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">Cycle, mood, and medical data are always private and never shown here.</p>
        </div>
      )}
    </div>
  );
}
