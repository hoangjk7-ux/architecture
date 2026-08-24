import { describe, expect, it } from "vitest";
import { calculateInternalResourceBudget } from "./internalResources";

describe("calculateInternalResourceBudget", () => {
  it("tính theo đơn giá, số người, tỷ lệ và timeline", () => {
    const result = calculateInternalResourceBudget({
      monthlyRate: 30_000_000,
      headcount: 2,
      allocationPercent: 50,
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    });
    expect(result.months).toBeCloseTo(2.96, 1);
    expect(result.estimatedCost).toBe(88_706_366);
  });

  it("phân bổ chi phí theo ngày cho timeline ngắn", () => {
    expect(
      calculateInternalResourceBudget({
        monthlyRate: 10_000_000,
        headcount: 1,
        allocationPercent: 100,
        startDate: "2026-01-01",
        endDate: "2026-01-01",
      }).estimatedCost,
    ).toBe(328_542);
  });

  it("từ chối timeline đảo ngược", () => {
    expect(() =>
      calculateInternalResourceBudget({
        monthlyRate: 1,
        headcount: 1,
        allocationPercent: 100,
        startDate: "2026-02-01",
        endDate: "2026-01-01",
      }),
    ).toThrow();
  });

  it("từ chối ngày rỗng/whitespace thay vì trả NaN", () => {
    expect(() =>
      calculateInternalResourceBudget({
        monthlyRate: 1,
        headcount: 1,
        allocationPercent: 100,
        startDate: "",
        endDate: "2026-01-01",
      }),
    ).toThrow();
    expect(() =>
      calculateInternalResourceBudget({
        monthlyRate: 1,
        headcount: 1,
        allocationPercent: 100,
        startDate: "2026-01-01",
        endDate: "   ",
      }),
    ).toThrow();
  });
});
