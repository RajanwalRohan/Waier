import { describe, it, expect } from "vitest";
import { normalizeOffProduct, isValidBarcode } from "@/lib/food";

describe("normalizeOffProduct", () => {
  it("normalizes a per-serving product", () => {
    const json = {
      status: 1,
      product: {
        product_name: "Protein Bar",
        brands: "BrandX",
        serving_size: "60 g",
        nutriments: {
          "energy-kcal_serving": 220,
          proteins_serving: 20,
          carbohydrates_serving: 22,
          fat_serving: 7,
          fiber_serving: 3,
          "energy-kcal_100g": 367,
        },
      },
    };
    const f = normalizeOffProduct(json, "12345678");
    expect(f.found).toBe(true);
    expect(f.name).toBe("Protein Bar");
    expect(f.serving).toBe("60 g");
    expect(f.calories).toBe(220); // serving preferred over 100g
    expect(f.proteinG).toBe(20);
    expect(f.barcode).toBe("12345678");
  });

  it("falls back to per-100g when no serving data", () => {
    const json = {
      status: 1,
      product: {
        product_name: "Greek Yogurt",
        nutriments: { "energy-kcal_100g": 59, proteins_100g: 10, carbohydrates_100g: 3.6, fat_100g: 0.4 },
      },
    };
    const f = normalizeOffProduct(json);
    expect(f.serving).toBe("100 g");
    expect(f.calories).toBe(59);
    expect(f.proteinG).toBe(10);
    expect(f.fiberG).toBeNull(); // missing
  });

  it("reports not found for status 0", () => {
    expect(normalizeOffProduct({ status: 0 }, "999").found).toBe(false);
  });

  it("rounds values and tolerates string numbers", () => {
    const json = { status: 1, product: { product_name: "X", nutriments: { "energy-kcal_100g": "123.456", proteins_100g: "9.87" } } };
    const f = normalizeOffProduct(json);
    expect(f.calories).toBe(123.5);
    expect(f.proteinG).toBe(9.9);
  });
});

describe("isValidBarcode", () => {
  it("accepts 8-14 digit codes", () => {
    expect(isValidBarcode("01234567")).toBe(true);
    expect(isValidBarcode("0123456789012")).toBe(true);
  });
  it("rejects non-numeric or wrong length", () => {
    expect(isValidBarcode("123")).toBe(false);
    expect(isValidBarcode("abcd1234")).toBe(false);
    expect(isValidBarcode("012345678901234")).toBe(false);
  });
});
