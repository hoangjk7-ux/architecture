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

    expect(result.internalPreUat).toBe(1000);
    expect(result.internalPostUat).toBe(1000);
    expect(result.year1Cost).toBe(4500);
    expect(result.year2AnnualRunRate).toBe(1200);
  });
});
