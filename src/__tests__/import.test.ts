import { describe, it, expect } from "vitest";
import { parseCsv, normalizeImportRows, dedupeKey } from "@/lib/import";

describe("parseCsv", () => {
  it("parses a simple grid", () => {
    const out = parseCsv("a,b,c\n1,2,3\n4,5,6");
    expect(out).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
      ["4", "5", "6"],
    ]);
  });

  it("handles quoted fields with commas and escaped quotes", () => {
    const out = parseCsv('name,note\n"Smith, John","said ""hi"""');
    expect(out[1]).toEqual(["Smith, John", 'said "hi"']);
  });

  it("tolerates CRLF and trailing newline", () => {
    const out = parseCsv("a,b\r\n1,2\r\n");
    expect(out).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("drops empty rows", () => {
    const out = parseCsv("a,b\n\n1,2\n");
    expect(out).toEqual([["a", "b"], ["1", "2"]]);
  });
});

describe("normalizeImportRows", () => {
  it("maps flexible headers and normalizes rows", () => {
    const csv = "Metric,Value,Unit,Timestamp\nHeart Rate,62,bpm,2026-06-01\nsteps,9500,steps,2026-06-01";
    const { rows, errors } = normalizeImportRows(parseCsv(csv));
    expect(errors).toBe(0);
    expect(rows).toEqual([
      { type: "heart_rate", value: 62, unit: "bpm", date: "2026-06-01" },
      { type: "steps", value: 9500, unit: "steps", date: "2026-06-01" },
    ]);
  });

  it("counts rows with bad values or dates as errors", () => {
    const csv = "type,value,date\nsteps,notanumber,2026-06-01\nsteps,9500,not-a-date\nsteps,9500,2026-06-02";
    const { rows, errors } = normalizeImportRows(parseCsv(csv));
    expect(rows).toHaveLength(1);
    expect(errors).toBe(2);
  });

  it("fails all rows when required columns are missing", () => {
    const csv = "foo,bar\n1,2\n3,4";
    const { rows, errors } = normalizeImportRows(parseCsv(csv));
    expect(rows).toHaveLength(0);
    expect(errors).toBe(2);
  });

  it("works without a unit column", () => {
    const csv = "type,value,date\nweight,72.5,2026-06-01";
    const { rows } = normalizeImportRows(parseCsv(csv));
    expect(rows[0]).toEqual({ type: "weight", value: 72.5, unit: null, date: "2026-06-01" });
  });
});

describe("dedupeKey", () => {
  it("is stable per type/value/day", () => {
    expect(dedupeKey({ type: "steps", value: 9500, date: "2026-06-01" })).toBe("steps|9500|2026-06-01");
  });
});
