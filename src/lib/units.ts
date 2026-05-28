export type UnitSystem = "imperial" | "metric";

// ── Conversion constants (full precision so display→storage→display round-trips are stable) ──
const KG_TO_LBS = 2.20462262185;
const CM_TO_IN = 0.3937007874;
const KM_TO_MI = 0.6213711922;

// ── Weight ──
// kgToLbs rounds to 1dp for display; lbsToKg keeps full precision so storage→display
// round-trips don't drift (e.g. 35 lbs → 15.9 kg → 35.1 lbs with rounding).
export function kgToLbs(kg: number): number {
  return Math.round(kg * KG_TO_LBS * 10) / 10;
}
export function lbsToKg(lbs: number): number {
  return lbs / KG_TO_LBS;
}

// ── Height ──
export function cmToIn(cm: number): number {
  return Math.round(cm * CM_TO_IN * 10) / 10;
}
export function inToCm(inches: number): number {
  return inches / CM_TO_IN;
}
export function cmToFtIn(cm: number): { ft: number; in: number } {
  const totalIn = cm * CM_TO_IN;
  const ft = Math.floor(totalIn / 12);
  const remainder = Math.round(totalIn % 12);
  return { ft, in: remainder };
}
export function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 12 + inches) / CM_TO_IN * 10) / 10;
}
export function formatHeight(cm: number, system: UnitSystem): string {
  if (system === "imperial") {
    const { ft, in: inches } = cmToFtIn(cm);
    return `${ft}'${inches}"`;
  }
  return `${Math.round(cm)} cm`;
}

// ── Distance ──
export function kmToMi(km: number): number {
  return Math.round(km * KM_TO_MI * 100) / 100;
}
export function miToKm(mi: number): number {
  return mi / KM_TO_MI;
}

// ── Display helpers ──
export function formatWeight(kg: number, system: UnitSystem): string {
  if (system === "imperial") return `${kgToLbs(kg)} lbs`;
  return `${Math.round(kg * 10) / 10} kg`;
}

export function formatDistance(km: number, system: UnitSystem): string {
  if (system === "imperial") return `${kmToMi(km)} mi`;
  return `${Math.round(km * 100) / 100} km`;
}

export function weightUnit(system: UnitSystem): string {
  return system === "imperial" ? "lbs" : "kg";
}

export function heightUnit(system: UnitSystem): string {
  return system === "imperial" ? "in" : "cm";
}

export function distanceUnit(system: UnitSystem): string {
  return system === "imperial" ? "mi" : "km";
}

/** Convert a display weight value to kg for storage */
export function toStorageWeight(value: number, system: UnitSystem): number {
  return system === "imperial" ? lbsToKg(value) : value;
}

/** Convert a stored kg value to display */
export function fromStorageWeight(kg: number, system: UnitSystem): number {
  return system === "imperial" ? kgToLbs(kg) : Math.round(kg * 10) / 10;
}

/** Convert a display height value to cm for storage */
export function toStorageHeight(value: number, system: UnitSystem): number {
  return system === "imperial" ? inToCm(value) : value;
}

/** Convert a stored cm value to display */
export function fromStorageHeight(cm: number, system: UnitSystem): number {
  return system === "imperial" ? cmToIn(cm) : Math.round(cm * 10) / 10;
}
