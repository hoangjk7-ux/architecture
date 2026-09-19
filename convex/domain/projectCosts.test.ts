import { describe, expect, it } from "vitest";
import { calculateProjectCost, calculateTaskCost } from "./projectCosts";

describe("project cost roll-up", () => {
  it("calculates task costs from hours and role rate", () => {
    expect(
      calculateTaskCost({
        estimatedHours: 10,
        actualHours: 6,
        remainingHours: 5,
        unitRate: 100,
        phase: "pre_uat",
      }),
    ).toEqual({
      budgetCost: 1000,
      actualCost: 600,
      remainingCost: 500,
      forecastCost: 1100,
    });
  });

  it("rolls tasks and non-labor costs into year 1 and year 2", () => {
    const result = calculateProjectCost(
      [
        {
          estimatedHours: 10,
          actualHours: 5,
          remainingHours: 5,
          unitRate: 100,
          phase: "pre_uat",
        },
        {
          estimatedHours: 4,
          actualHours: 2,
          remainingHours: 3,
          unitRate: 200,
          phase: "post_uat",
        },
      ],
      [
        { costType: "initial", amount: 1000 },
        { costType: "monthly", amount: 100 },
        { costType: "annual", amount: 300 },
      ],
    );

    expect(result.internalPreUat).toBe(500);
    expect(result.internalPostUat).toBe(400);
    expect(result.budgetCost).toBe(1800);
    expect(result.actualCost).toBe(900);
    expect(result.remainingCost).toBe(900);
    expect(result.forecastCost).toBe(2000);
    expect(result.usedPercent).toBe(50);
    expect(result.year1Cost).toBe(4500);
    expect(result.year2AnnualRunRate).toBe(1500);
  });
});
