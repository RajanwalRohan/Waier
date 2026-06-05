/**
 * CSV health-data import (pure).
 *
 * Parses a CSV export from another app into normalized HealthMetric rows.
 * Flexible on column names (type/metric, value, unit, date/timestamp) and
 * tolerant of quoted fields. The API does the dedupe-and-insert; this module
 * is deterministic and testable.
 */

export interface ImportRow {
  type: string;
  value: number;
  unit: string | null;
  date: string; // ISO date (YYYY-MM-DD)
}

export interface NormalizeResult {
  rows: ImportRow[];
  errors: number;
}

/** Minimal RFC-4180-ish CSV parser: handles quotes, escaped quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully-empty rows.
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

const HEADER_ALIASES: Record<string, string> = {
  type: "type",
  metric: "type",
  "metric type": "type",
  name: "type",
  value: "value",
  amount: "value",
  reading: "value",
  unit: "unit",
  units: "unit",
  date: "date",
  timestamp: "date",
  datetime: "date",
  time: "date",
};

function mapHeaders(header: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  header.forEach((h, i) => {
    const key = HEADER_ALIASES[h.trim().toLowerCase()];
    if (key && !(key in map)) map[key] = i;
  });
  return map;
}

function normalizeType(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function toIsoDate(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Normalize parsed CSV rows into HealthMetric rows. The first row is treated as
 * the header. Rows missing a type, a numeric value, or a valid date are counted
 * as errors and skipped.
 */
export function normalizeImportRows(parsed: string[][]): NormalizeResult {
  if (parsed.length < 2) return { rows: [], errors: 0 };

  const idx = mapHeaders(parsed[0]);
  if (idx.type === undefined || idx.value === undefined || idx.date === undefined) {
    // Required columns missing: everything is an error.
    return { rows: [], errors: parsed.length - 1 };
  }

  const rows: ImportRow[] = [];
  let errors = 0;

  for (let r = 1; r < parsed.length; r++) {
    const cols = parsed[r];
    const type = normalizeType(cols[idx.type] ?? "");
    const value = parseFloat((cols[idx.value] ?? "").trim());
    const date = toIsoDate(cols[idx.date] ?? "");
    const unit = idx.unit !== undefined ? (cols[idx.unit] ?? "").trim() || null : null;

    if (!type || !Number.isFinite(value) || !date) {
      errors++;
      continue;
    }
    rows.push({ type, value, unit, date });
  }

  return { rows, errors };
}

/** Stable dedupe key: one reading per type per day per value. */
export function dedupeKey(row: { type: string; value: number; date: string }): string {
  return `${row.type}|${row.value}|${row.date}`;
}
