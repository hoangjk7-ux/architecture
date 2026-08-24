import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import { createAuthorizedConvexTest } from "../test.setup";

const systemInput = (name: string) => ({
  name,
  type: "core" as const,
  category: "ERP",
  status: "active" as const,
  criticality: "high" as const,
  departments: ["Finance"],
  campuses: ["HQ"],
  riskLevel: "low" as const,
  technicalDebtScore: 20,
  architectureScore: 90,
});

describe("internal resource allocations", () => {
  it("rejects empty/whitespace dates at the mutation boundary, not just the domain helper", async () => {
    const t = await createAuthorizedConvexTest();
    const systemId = await t.mutation(
      api.software_systems.create,
      systemInput("Payroll"),
    );
    const rateId = await t.mutation(api.internal_resources.createRate, {
      name: "BA",
      monthlyRate: 30_000_000,
    });

    await expect(
      t.mutation(api.internal_resources.createAllocation, {
        systemId,
        resourceRateId: rateId,
        headcount: 1,
        allocationPercent: 100,
        startDate: "",
        endDate: "2026-01-31",
      }),
    ).rejects.toMatchObject({ data: { code: "VALIDATION_ERROR" } });

    await expect(
      t.mutation(api.internal_resources.createAllocation, {
        systemId,
        resourceRateId: rateId,
        headcount: 1,
        allocationPercent: 100,
        startDate: "2026-01-01",
        endDate: "   ",
      }),
    ).rejects.toMatchObject({ data: { code: "VALIDATION_ERROR" } });

    const remaining = await t.run(async (ctx) =>
      ctx.db.query("system_internal_resources").collect(),
    );
    expect(remaining).toEqual([]);
  });

  it("blocks deleting a rate that is still allocated to a system", async () => {
    const t = await createAuthorizedConvexTest();
    const systemId = await t.mutation(
      api.software_systems.create,
      systemInput("Payroll"),
    );
    const rateId = await t.mutation(api.internal_resources.createRate, {
      name: "Dev",
      monthlyRate: 40_000_000,
    });
    await t.mutation(api.internal_resources.createAllocation, {
      systemId,
      resourceRateId: rateId,
      headcount: 2,
      allocationPercent: 50,
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    });

    await expect(
      t.mutation(api.internal_resources.removeRate, { id: rateId }),
    ).rejects.toMatchObject({ data: { code: "REFERENCE_IN_USE" } });
    await expect(
      t.run(async (ctx) => ctx.db.get(rateId)),
    ).resolves.not.toBeNull();
  });

  it("cascades allocation deletion when the owning system is removed", async () => {
    const t = await createAuthorizedConvexTest();
    const systemId = await t.mutation(
      api.software_systems.create,
      systemInput("Payroll"),
    );
    const rateId = await t.mutation(api.internal_resources.createRate, {
      name: "BA",
      monthlyRate: 30_000_000,
    });
    const allocationId = await t.mutation(
      api.internal_resources.createAllocation,
      {
        systemId,
        resourceRateId: rateId,
        headcount: 1,
        allocationPercent: 100,
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      },
    );

    await t.mutation(api.software_systems.remove, { id: systemId });

    await expect(
      t.run(async (ctx) => ctx.db.get(allocationId)),
    ).resolves.toBeNull();
    // The rate itself is independent of any one system and must survive.
    await expect(
      t.run(async (ctx) => ctx.db.get(rateId)),
    ).resolves.not.toBeNull();
  });
});
