import { describe, it, expect } from "vitest";
import {
  classifyMessage,
  evaluateSafety,
  parseCalorieIntakeTarget,
  belowCalorieFloor,
  crisisMessage,
  eatingDisorderMessage,
} from "@/lib/wynn-safety";

describe("classifyMessage", () => {
  it("flags crisis language", () => {
    expect(classifyMessage("i want to kill myself").crisis).toBe(true);
    expect(classifyMessage("I've been thinking about suicide").crisis).toBe(true);
    expect(classifyMessage("honestly I don't want to live anymore").crisis).toBe(true);
  });

  it("does not flag ordinary training talk as crisis", () => {
    expect(classifyMessage("this leg workout is killing me lol").crisis).toBe(false);
    expect(classifyMessage("I want to crush my deadlift PR").crisis).toBe(false);
  });

  it("flags eating-disorder patterns", () => {
    expect(classifyMessage("how do I make myself throw up after eating").eatingDisorder).toBe(true);
    expect(classifyMessage("I want to starve myself to lose weight fast").eatingDisorder).toBe(true);
  });

  it("flags diagnosis and medication questions", () => {
    expect(classifyMessage("do I have diabetes?").medicalDiagnosis).toBe(true);
    expect(classifyMessage("should I stop taking my metformin?").medication).toBe(true);
  });
});

describe("parseCalorieIntakeTarget", () => {
  it("extracts an intended intake target", () => {
    expect(parseCalorieIntakeTarget("I want to eat only 800 calories a day")).toBe(800);
    expect(parseCalorieIntakeTarget("help me limit to 1000 kcal")).toBe(1000);
  });

  it("ignores calories burned", () => {
    expect(parseCalorieIntakeTarget("I burned 800 calories on my run")).toBeNull();
  });
});

describe("belowCalorieFloor", () => {
  it("uses sex-specific floors", () => {
    expect(belowCalorieFloor(1300, "female")).toBe(false); // floor 1200
    expect(belowCalorieFloor(1100, "female")).toBe(true);
    expect(belowCalorieFloor(1400, "male")).toBe(true); // floor 1500
    expect(belowCalorieFloor(1600, "male")).toBe(false);
  });
});

describe("evaluateSafety", () => {
  it("returns a crisis response for crisis messages", () => {
    const r = evaluateSafety("i want to end my life");
    expect(r.type).toBe("crisis");
    expect(r.message).toContain("988");
    expect(r.message).toBe(crisisMessage());
  });

  it("refuses eating-disorder requests", () => {
    const r = evaluateSafety("how do I purge after meals");
    expect(r.type).toBe("eating_disorder");
    expect(r.message).toBe(eatingDisorderMessage());
  });

  it("refuses sub-floor calorie targets", () => {
    const r = evaluateSafety("set my plan to eat 700 calories per day", "female");
    expect(r.type).toBe("eating_disorder");
  });

  it("prioritizes crisis over everything else", () => {
    const r = evaluateSafety("i want to die and stop eating 500 calories");
    expect(r.type).toBe("crisis");
  });

  it("proceeds normally for healthy questions", () => {
    const r = evaluateSafety("what should I eat after a hard leg day?");
    expect(r.type).toBeNull();
    expect(r.message).toBeNull();
  });

  it("allows a reasonable calorie target", () => {
    const r = evaluateSafety("help me hit 2200 calories a day", "male");
    expect(r.type).toBeNull();
  });
});
