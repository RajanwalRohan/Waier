/**
 * Social helpers (pure): privacy resolution and friend ranking.
 *
 * Privacy is conservative by default: Flow and tier are visible to friends,
 * detailed stats are opt-in. Body photos, cycle, mood, and medical data are
 * never exposed here under any setting (they live in strict-tier surfaces and
 * are never passed into social payloads).
 */

export interface PrivacySettings {
  showFlow: boolean;
  showStreaks: boolean;
  showStats: boolean;
  showPillars: boolean;
}

export const DEFAULT_PRIVACY: PrivacySettings = {
  showFlow: true,
  showStreaks: true,
  showStats: false,
  showPillars: false,
};

/** Parse stored privacy JSON, filling any missing keys with conservative defaults. */
export function resolvePrivacy(json: string | null | undefined): PrivacySettings {
  if (!json) return { ...DEFAULT_PRIVACY };
  try {
    const parsed = JSON.parse(json) as Partial<PrivacySettings>;
    return {
      showFlow: parsed.showFlow ?? DEFAULT_PRIVACY.showFlow,
      showStreaks: parsed.showStreaks ?? DEFAULT_PRIVACY.showStreaks,
      showStats: parsed.showStats ?? DEFAULT_PRIVACY.showStats,
      showPillars: parsed.showPillars ?? DEFAULT_PRIVACY.showPillars,
    };
  } catch {
    return { ...DEFAULT_PRIVACY };
  }
}

export interface ProfilePayload {
  flow: number | null;
  tier: string | null;
  streaks: { bubble: number; meal: number; workout: number } | null;
  stats: Record<string, number> | null;
  pillars: Record<string, number | null> | null;
}

/**
 * Apply privacy to a profile payload. The owner viewing their own profile
 * (isSelf) always sees everything; others see only what privacy permits.
 */
export function applyPrivacy(payload: ProfilePayload, privacy: PrivacySettings, isSelf: boolean): ProfilePayload {
  if (isSelf) return payload;
  return {
    flow: privacy.showFlow ? payload.flow : null,
    tier: privacy.showFlow ? payload.tier : null,
    streaks: privacy.showStreaks ? payload.streaks : null,
    stats: privacy.showStats ? payload.stats : null,
    pillars: privacy.showPillars ? payload.pillars : null,
  };
}

export interface RankableFriend {
  userId: string;
  flow: number | null;
}

export interface RankedFriend<T extends RankableFriend> {
  rank: number;
  item: T;
}

/**
 * Rank friends by Flow, descending. Users without a Flow yet sort last.
 * Standard competition ranking: equal Flow shares a rank, the next rank skips.
 */
export function rankByFlow<T extends RankableFriend>(friends: T[]): RankedFriend<T>[] {
  const sorted = [...friends].sort((a, b) => (b.flow ?? -1) - (a.flow ?? -1));
  const out: RankedFriend<T>[] = [];
  let lastFlow: number | null | undefined = undefined;
  let lastRank = 0;
  sorted.forEach((item, i) => {
    const flow = item.flow ?? null;
    if (flow !== lastFlow) {
      lastRank = i + 1;
      lastFlow = flow;
    }
    out.push({ rank: lastRank, item });
  });
  return out;
}

/** Normalize a desired username to the stored handle (lowercase, a-z0-9_, 3-20). */
export function normalizeUsername(raw: string): string | null {
  const cleaned = raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (cleaned.length < 3 || cleaned.length > 20) return null;
  return cleaned;
}
