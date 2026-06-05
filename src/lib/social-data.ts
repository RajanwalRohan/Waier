/**
 * Server-side social data assembly (uses the DB). Builds the public profile
 * payload from a user's latest Flow, streaks, and headline stats. Strict-tier
 * data (cycle, mood, medical, photos) is never read here.
 */

import { db } from "./db";
import type { ProfilePayload } from "./social";

export async function getUserIdByUsername(username: string): Promise<string | null> {
  const profile = await db.profile.findUnique({ where: { username }, select: { userId: true } });
  return profile?.userId ?? null;
}

export async function getProfilePayload(userId: string): Promise<ProfilePayload> {
  const [score, streaks, workoutCount] = await Promise.all([
    db.dailyScore.findFirst({ where: { userId }, orderBy: { date: "desc" } }),
    db.streak.findMany({ where: { userId }, select: { type: true, count: true } }),
    db.workout.count({ where: { userId } }),
  ]);

  const streakBy: Record<string, number> = {};
  for (const s of streaks) streakBy[s.type] = s.count;

  return {
    flow: score ? Math.round(score.flow) : null,
    tier: score?.tier ?? null,
    streaks: { bubble: streakBy.bubble ?? 0, meal: streakBy.meal ?? 0, workout: streakBy.workout ?? 0 },
    stats: { workouts: workoutCount },
    pillars: score
      ? { heart: score.heart, motion: score.motion, recovery: score.recovery, fuel: score.fuel, consistency: score.consistency }
      : null,
  };
}
