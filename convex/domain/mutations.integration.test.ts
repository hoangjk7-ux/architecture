import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import { createAuthorizedConvexTest } from "../test.setup";

const systemInput = {
  name: "  Finance Core  ",
  type: "core" as const,
  category: " ERP ",
  status: "active" as const,
  criticality: "high" as const,
  departments: [" Finance ", "finance"],
  campuses: ["HQ"],
  costPerYear: 100,
  contractEndDate: "2027-12-31",
  riskLevel: "low" as const,
  technicalDebtScore: 20,
  architectureScore: 90,
};

const integrationInput = {
  name: "Ledger sync",
  protocol: "REST" as const,
  method: "realtime" as const,
  healthStatus: "healthy" as const,
  criticalLevel: "high" as const,
  errorRate: 0.5,
  isArchitectureCompliant: true,
};

describe("DATA-02 mutation validation", () => {
  it("normalizes systems and rejects invalid scores, costs, dates and vendor references", async () => {
    const t = await createAuthorizedConvexTest();

    const id = await t.mutation(api.software_systems.create, systemInput);
    const stored = await t.run(async (ctx) => ctx.db.get(id));
    expect(stored).toMatchObject({
      name: "Finance Core",
      category: "ERP",
      departments: ["Finance"],
    });

    await expect(
      t.mutation(api.software_systems.create, {
        ...systemInput,
        architectureScore: 101,
      }),
    ).rejects.toMatchObject({ data: { code: "VALIDATION_ERROR" } });
    await expect(
      t.mutation(api.software_systems.create, {
        ...systemInput,
        costPerYear: -1,
      }),
    ).rejects.toMatchObject({ data: { code: "VALIDATION_ERROR" } });
    await expect(
      t.mutation(api.software_systems.create, {
        ...systemInput,
        contractEndDate: "2027-02-30",
      }),
    ).rejects.toMatchObject({ data: { code: "VALIDATION_ERROR" } });

    const removedVendorId = await t.run(async (ctx) => {
      const vendorId = await ctx.db.insert("vendors", {
        name: "Removed",
        supportLevel: "email_only",
        riskScore: 1,
      });
      await ctx.db.delete(vendorId);
      return vendorId;
    });
    await expect(
      t.mutation(api.software_systems.create, {
        ...systemInput,
        vendorId: removedVendorId,
      }),
    ).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
  });

  it("validates and normalizes vendors", async () => {
    const t = await createAuthorizedConvexTest();
    const id = await t.mutation(api.vendors.create, {
      name: " Vendor ",
      contactEmail: " ADMIN@EXAMPLE.COM ",
      supportLevel: "business_hours",
      contractEndDate: "2027-01-01",
      riskScore: 15,
    });
    await expect(t.run(async (ctx) => ctx.db.get(id))).resolves.toMatchObject({
      name: "Vendor",
      contactEmail: "admin@example.com",
    });
    await expect(
      t.mutation(api.vendors.create, {
        name: "Vendor",
        supportLevel: "email_only",
        riskScore: -1,
      }),
    ).rejects.toMatchObject({ data: { code: "VALIDATION_ERROR" } });
  });

  it("requires distinct, existing integration endpoints", async () => {
    const t = await createAuthorizedConvexTest();
    const sourceSystemId = await t.mutation(
      api.software_systems.create,
      systemInput,
    );
    const destinationSystemId = await t.mutation(api.software_systems.create, {
      ...systemInput,
      name: "Destination",
    });

    await expect(
      t.mutation(api.integrations.create, {
        ...integrationInput,
        sourceSystemId,
        destinationSystemId: sourceSystemId,
      }),
    ).rejects.toMatchObject({ data: { code: "VALIDATION_ERROR" } });

    await t.run(async (ctx) => ctx.db.delete(destinationSystemId));
    await expect(
      t.mutation(api.integrations.create, {
        ...integrationInput,
        sourceSystemId,
        destinationSystemId,
      }),
    ).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
  });

  it("validates roadmap dates, scores, duplicate and missing system references", async () => {
    const t = await createAuthorizedConvexTest();
    const systemId = await t.mutation(api.software_systems.create, systemInput);
    const roadmapInput = {
      title: "Migration",
      level: "initiative" as const,
      status: "not_started" as const,
      startDate: "2027-02-01",
      dueDate: "2027-01-01",
      architectureAlignmentScore: 80,
      relatedSystemIds: [systemId],
      priority: "high" as const,
    };

    await expect(
      t.mutation(api.roadmap.create, roadmapInput),
    ).rejects.toMatchObject({
      data: { code: "VALIDATION_ERROR" },
    });
    await expect(
      t.mutation(api.roadmap.create, {
        ...roadmapInput,
        startDate: undefined,
        dueDate: undefined,
        relatedSystemIds: [systemId, systemId],
      }),
    ).rejects.toMatchObject({ data: { code: "VALIDATION_ERROR" } });

    await expect(
      t.mutation(api.roadmap.create, {
        ...roadmapInput,
        level: "project",
        startDate: undefined,
        dueDate: undefined,
        relatedSystemIds: [],
      }),
    ).rejects.toMatchObject({ data: { code: "VALIDATION_ERROR" } });

    await t.run(async (ctx) => ctx.db.delete(systemId));
    await expect(
      t.mutation(api.roadmap.create, {
        ...roadmapInput,
        startDate: undefined,
        dueDate: undefined,
      }),
    ).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
  });

  it("validates module references and config uniqueness", async () => {
    const t = await createAuthorizedConvexTest();
    const removedSystemId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("software_systems", {
        ...systemInput,
        name: "Removed",
        category: "ERP",
        departments: [],
      });
      await ctx.db.delete(id);
      return id;
    });
    await expect(
      t.mutation(api.system_modules.create, {
        systemId: removedSystemId,
        name: "Module",
        lifecycle: "planned",
        health: "unknown",
        usedBy: [],
        sortOrder: 0,
      }),
    ).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });

    await t.mutation(api.config.add, { type: "category", name: " ERP " });
    await expect(
      t.mutation(api.config.add, { type: "category", name: "erp" }),
    ).rejects.toMatchObject({ data: { code: "CONFLICT" } });
  });

  it("records feature adjustment logs for module create, update and delete", async () => {
    const t = await createAuthorizedConvexTest();
    const systemId = await t.mutation(api.software_systems.create, systemInput);
    const moduleId = await t.mutation(api.system_modules.create, {
      systemId,
      name: "Enrollment Portal",
      lifecycle: "planned",
      health: "unknown",
      usedBy: ["Admissions"],
      sortOrder: 0,
    });

    await t.mutation(api.system_modules.update, {
      id: moduleId,
      health: "healthy",
      version: "1.0.0",
    });
    await t.mutation(api.system_modules.remove, { id: moduleId });

    const logs = await t.run(async (ctx) =>
      ctx.db
        .query("system_change_logs")
        .withIndex("by_system", (q) => q.eq("systemId", systemId))
        .collect(),
    );
    const featureLogs = logs.filter((log) => log.action.startsWith("feature_"));

    expect(featureLogs.map((log) => log.action)).toEqual([
      "feature_created",
      "feature_updated",
      "feature_deleted",
    ]);
    expect(featureLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          systemName: "Finance Core · Enrollment Portal",
          action: "feature_updated",
          changes: expect.arrayContaining([
            expect.objectContaining({
              field: "health",
              from: "unknown",
              to: "healthy",
            }),
            expect.objectContaining({ field: "version", to: "1.0.0" }),
          ]),
        }),
      ]),
    );
  });
});
