/**
 * Open Food Facts normalization (pure).
 *
 * Maps an Open Food Facts v2 product response down to the macro shape Waier
 * uses for meal logging. Prefers per-serving nutriments when present, otherwise
 * falls back to per-100g (and says so). No I/O here; the API route does the
 * fetch and passes the parsed JSON in.
 */

export interface NormalizedFood {
  found: boolean;
  barcode?: string;
  name?: string;
  brand?: string | null;
  serving?: string;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  fiberG?: number | null;
}

interface OffNutriments {
  [key: string]: number | string | undefined;
}

interface OffResponse {
  status?: number;
  code?: string;
  product?: {
    product_name?: string;
    generic_name?: string;
    brands?: string;
    serving_size?: string;
    nutriments?: OffNutriments;
  };
}

function num(v: number | string | undefined): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
}

export function normalizeOffProduct(json: OffResponse, barcode?: string): NormalizedFood {
  if (!json || json.status !== 1 || !json.product) return { found: false, barcode };

  const p = json.product;
  const n: OffNutriments = p.nutriments ?? {};
  const perServing = n["energy-kcal_serving"] !== undefined || n["proteins_serving"] !== undefined;
  const pick = (key: string) => num(perServing ? n[`${key}_serving`] : n[`${key}_100g`]);

  return {
    found: true,
    barcode,
    name: p.product_name || p.generic_name || "Unknown product",
    brand: p.brands ?? null,
    serving: perServing ? p.serving_size || "1 serving" : "100 g",
    calories: pick("energy-kcal"),
    proteinG: pick("proteins"),
    carbsG: pick("carbohydrates"),
    fatG: pick("fat"),
    fiberG: pick("fiber"),
  };
}

/** A barcode is a 8-14 digit numeric string (EAN-8/13, UPC-A, etc.). */
export function isValidBarcode(code: string): boolean {
  return /^\d{8,14}$/.test(code.trim());
}
