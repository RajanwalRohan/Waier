/**
 * Flow rank ladder. Maps a 0-1000 Flow score to a tier and division.
 *
 * Each tier except Maelstrom splits into three divisions (III low, II mid,
 * I high) by dividing its band into thirds, for granular progression like
 * competitive games. Maelstrom is an elite pool with no divisions.
 */

import { TIERS, type Tier } from "./constants";

export interface Rank {
  tier: string;
  /** 3 (III), 2 (II), or 1 (I); null for Maelstrom. */
  division: number | null;
  /** Human-readable label, e.g. "Rapid III" or "Maelstrom". */
  label: string;
  /** Lower bound of the current tier (for progress bars). */
  tierMin: number;
  /** Upper bound of the current tier. */
  tierMax: number;
}

const ROMAN: Record<number, string> = { 3: "III", 2: "II", 1: "I" };

export function getRank(score: number): Rank {
  const s = Math.max(0, Math.min(1000, score));
  const tier: Tier = TIERS.find((t) => s >= t.min && s <= t.max) ?? TIERS[0];

  if (tier.name === "Maelstrom") {
    return { tier: tier.name, division: null, label: tier.name, tierMin: tier.min, tierMax: tier.max };
  }

  const span = (tier.max - tier.min + 1) / 3;
  const offset = s - tier.min;
  const thirdIndex = Math.min(2, Math.floor(offset / span)); // 0 (low) .. 2 (high)
  const division = 3 - thirdIndex; // bottom third = III, top third = I

  return {
    tier: tier.name,
    division,
    label: `${tier.name} ${ROMAN[division]}`,
    tierMin: tier.min,
    tierMax: tier.max,
  };
}

/** Progress (0-1) toward the next tier, for UI progress rings. */
export function tierProgress(score: number): number {
  const r = getRank(score);
  const s = Math.max(0, Math.min(1000, score));
  if (r.tierMax <= r.tierMin) return 1;
  return Math.max(0, Math.min(1, (s - r.tierMin) / (r.tierMax - r.tierMin)));
}
