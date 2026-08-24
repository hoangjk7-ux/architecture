import { describe, expect, it } from "vitest";
import {
  isoDate,
  normalizeEmail,
  numberInRange,
  orderedDates,
  requiredIsoDate,
  requiredOrderedDates,
  requiredText,
  uniqueTexts,
} from "./common";

describe("domain common validators", () => {
  it("normalizes required text and email", () => {
    expect(requiredText("  TechGov  ", "name")).toBe("TechGov");
    expect(normalizeEmail("  Admin@Example.COM ")).toBe("admin@example.com");
  });

  it("rejects blank text, invalid ranges and invalid calendar dates", () => {
    expect(() => requiredText("   ", "name")).toThrow();
    expect(() => numberInRange(101, 0, 100, "score")).toThrow();
    expect(() => isoDate("2026-02-30", "date")).toThrow();
  });

  it("rejects non-finite numbers before range-checking them", () => {
    expect(() => numberInRange(NaN, 0, 100, "score")).toThrow();
    expect(() => numberInRange(Infinity, 0, 100, "score")).toThrow();
  });

  it("rejects a date string that isn't YYYY-MM-DD shaped", () => {
    expect(() => isoDate("01/01/2026", "date")).toThrow();
    expect(() => isoDate("not-a-date", "date")).toThrow();
  });

  it("rejects an invalid email format", () => {
    expect(() => normalizeEmail("not-an-email")).toThrow();
  });

  it("validates date ordering", () => {
    expect(orderedDates("2026-01-01", "2026-01-31")).toEqual({
      start: "2026-01-01",
      end: "2026-01-31",
    });
    expect(() => orderedDates("2026-02-01", "2026-01-31")).toThrow();
  });

  it("treats a missing date as absent, not required", () => {
    expect(orderedDates(undefined, undefined)).toEqual({
      start: undefined,
      end: undefined,
    });
    expect(orderedDates("", "   ")).toEqual({
      start: undefined,
      end: undefined,
    });
  });

  it("requiredIsoDate rejects empty/whitespace instead of returning undefined", () => {
    expect(requiredIsoDate("2026-01-01", "startDate")).toBe("2026-01-01");
    expect(() => requiredIsoDate("", "startDate")).toThrow();
    expect(() => requiredIsoDate("   ", "startDate")).toThrow();
  });

  it("requiredOrderedDates rejects missing bounds and reversed ranges", () => {
    expect(requiredOrderedDates("2026-01-01", "2026-01-31")).toEqual({
      start: "2026-01-01",
      end: "2026-01-31",
    });
    expect(() => requiredOrderedDates("", "2026-01-31")).toThrow();
    expect(() => requiredOrderedDates("2026-01-01", "")).toThrow();
    expect(() => requiredOrderedDates("2026-02-01", "2026-01-31")).toThrow();
  });

  it("deduplicates normalized text while retaining first spelling", () => {
    expect(uniqueTexts([" IT ", "it", "Finance"], "departments")).toEqual([
      "IT",
      "Finance",
    ]);
  });
});
