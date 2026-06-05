/**
 * Waier Championship League engine (pure).
 *
 * Two responsibilities, both deterministic and testable:
 *  - scoreMatchup: category-by-category head-to-head scoring (higher value
 *    wins the category; ties split). The matchup winner has more category
 *    points, e.g. "7 to 3".
 *  - pairRound: rotating round-robin pairing (circle method) so each period
 *    produces a fresh set of matchups and, over a full rotation, everyone
 *    faces everyone.
 */

export interface CategoryInput {
  key: string;
  label: string;
  valueA: number;
  valueB: number;
  /** If true, a lower value wins (e.g. resting HR). Default false. */
  lowerWins?: boolean;
}

export interface CategoryResult extends CategoryInput {
  winner: "a" | "b" | "tie";
}

export interface MatchupScore {
  aPoints: number;
  bPoints: number;
  categories: CategoryResult[];
  winner: "a" | "b" | "tie";
}

export function scoreMatchup(categories: CategoryInput[]): MatchupScore {
  let aPoints = 0;
  let bPoints = 0;
  const results: CategoryResult[] = [];

  for (const c of categories) {
    const aBetter = c.lowerWins ? c.valueA < c.valueB : c.valueA > c.valueB;
    const bBetter = c.lowerWins ? c.valueB < c.valueA : c.valueB > c.valueA;
    let winner: "a" | "b" | "tie";
    if (aBetter) {
      winner = "a";
      aPoints += 1;
    } else if (bBetter) {
      winner = "b";
      bPoints += 1;
    } else {
      winner = "tie";
      aPoints += 0.5;
      bPoints += 0.5;
    }
    results.push({ ...c, winner });
  }

  const winner = aPoints > bPoints ? "a" : bPoints > aPoints ? "b" : "tie";
  return { aPoints, bPoints, categories: results, winner };
}

const BYE = "__BYE__";

/**
 * Round-robin pairing via the circle method. Returns the pairings for a given
 * 0-based round. A pairing of [id, null] is a bye. Different rounds produce
 * different pairings; rounds cycle with period (n-1) for n (even) players.
 */
export function pairRound(memberIds: string[], round: number): Array<[string, string | null]> {
  const ids = [...memberIds];
  if (ids.length < 2) return [];
  if (ids.length % 2 === 1) ids.push(BYE);

  const n = ids.length;
  const first = ids[0];
  const rest = ids.slice(1);
  const k = (((round % (n - 1)) + (n - 1)) % (n - 1));
  // rotate the non-fixed players
  const rotated = [...rest.slice(rest.length - k), ...rest.slice(0, rest.length - k)];
  const arrangement = [first, ...rotated];

  const pairs: Array<[string, string | null]> = [];
  for (let i = 0; i < n / 2; i++) {
    const x = arrangement[i];
    const y = arrangement[n - 1 - i];
    const a = x === BYE ? null : x;
    const b = y === BYE ? null : y;
    if (a === null && b === null) continue;
    if (a === null) pairs.push([b as string, null]);
    else pairs.push([a, b]);
  }
  return pairs;
}

/** Which 0-based matchup period we are in, given a start date and period length. */
export function currentPeriod(startDate: Date, today: Date, periodDays: number): number {
  const ms = today.getTime() - startDate.getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / (periodDays * 86400000));
}

/** Generate a short, unambiguous join code (no easily-confused characters). */
export function generateJoinCode(rand: () => number = Math.random): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(rand() * alphabet.length)];
  return code;
}
