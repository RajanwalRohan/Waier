/**
 * Flow scoring engine: public surface.
 *
 * The headline signature score (0-1000) and its five pillars, plus streaks,
 * EMA smoothing, and the rank ladder. Pure, deterministic, and tested against
 * the PRD's worked examples.
 */

export * from "./constants";
export * from "./scoring";
export * from "./ranks";
