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

const roadmapInput = (
  title: string,
  level: "initiative" | "program" | "project" | "epic",
) => ({
  title,
  level,
  status: "not_started" as const,
  architectureAlignmentScore: 80,
  relatedSystemIds: [],
  priority: "high" as const,
});

describe("DATA-03 roadmap invariants", () => {
  it("enforces hierarchy, detects cycles and cascades descendant deletion", async () => {
    const t = await createAuthorizedConvexTest();
    const systemId = await t.mutation(
      api.software_systems.create,
      systemInput("Project System"),
    );
    const initiativeId = await t.mutation(
      api.roadmap.create,
      roadmapInput("Initiative", "initiative"),
    );
    const programId = await t.mutation(api.roadmap.create, {
      ...roadmapInput("Program", "program"),
      parentId: initiativeId,
    });
    const projectId = await t.mutation(api.roadmap.create, {
      ...roadmapInput("Project", "project"),
      parentId: programId,
      relatedSystemIds: [systemId],
    });

    await expect(
      t.mutation(api.roadmap.create, {
        ...roadmapInput("Invalid epic", "epic"),
        parentId: initiativeId,
      }),
    ).rejects.toMatchObject({ data: { code: "VALIDATION_ERROR" } });

    await expect(
      t.mutation(api.roadmap.update, {
        ...roadmapInput("Initiative", "epic"),
        id: initiativeId,
        parentId: projectId,
      }),
    ).rejects.toMatchObject({ data: { code: "VALIDATION_ERROR" } });

    await t.mutation(api.roadmap.remove, { id: initiativeId });
    const remaining = await t.run(async (ctx) =>
      ctx.db.query("roadmap_items").collect(),
    );
    expect(remaining).toEqual([]);
  });
});

describe("DATA-04 deletion policies", () => {
  it("restricts referenced vendor and config deletion", async () => {
    const t = await createAuthorizedConvexTest();
    const vendorId = await t.mutation(api.vendors.create, {
      name: "Vendor",
      supportLevel: "business_hours",
      riskScore: 10,
    });
    const systemId = await t.mutation(api.software_systems.create, {
      ...systemInput("Finance"),
      vendorId,
    });
    const categoryId = await t.mutation(api.config.add, {
      type: "category",
      name: "ERP",
    });

    await expect(
      t.mutation(api.vendors.remove, { id: vendorId }),
    ).rejects.toMatchObject({
      data: { code: "REFERENCE_IN_USE" },
    });
    await expect(
      t.mutation(api.config.remove, { id: categoryId }),
    ).rejects.toMatchObject({
      data: { code: "REFERENCE_IN_USE" },
    });
    await expect(
      t.run(async (ctx) => ctx.db.get(systemId)),
    ).resolves.not.toBeNull();
    await expect(
      t.run(async (ctx) => ctx.db.get(vendorId)),
    ).resolves.not.toBeNull();
    await expect(
      t.run(async (ctx) => ctx.db.get(categoryId)),
    ).resolves.not.toBeNull();
  });

  it("cascades system integrations/modules and unlinks roadmap references", async () => {
    const t = await createAuthorizedConvexTest();
    const sourceId = await t.mutation(
      api.software_systems.create,
      systemInput("Source"),
    );
    const destinationId = await t.mutation(
      api.software_systems.create,
      systemInput("Destination"),
    );
    const integrationId = await t.mutation(api.integrations.create, {
      name: "Sync",
      sourceSystemId: sourceId,
      destinationSystemId: destinationId,
      protocol: "REST",
      method: "realtime",
      healthStatus: "healthy",
      criticalLevel: "high",
      isArchitectureCompliant: true,
    });
    const moduleId = await t.mutation(api.system_modules.create, {
      systemId: sourceId,
      name: "Ledger",
      lifecycle: "in_use",
      health: "healthy",
      usedBy: ["Finance"],
      sortOrder: 0,
    });
    const roadmapId = await t.mutation(api.roadmap.create, {
      ...roadmapInput("Migration", "initiative"),
      relatedSystemIds: [sourceId, destinationId],
    });

    await t.mutation(api.software_systems.remove, { id: sourceId });

    const state = await t.run(async (ctx) => ({
      source: await ctx.db.get(sourceId),
      destination: await ctx.db.get(destinationId),
      integration: await ctx.db.get(integrationId),
      module: await ctx.db.get(moduleId),
      roadmap: await ctx.db.get(roadmapId),
    }));
    expect(state.source).toBeNull();
    expect(state.destination).not.toBeNull();
    expect(state.integration).toBeNull();
    expect(state.module).toBeNull();
    expect(state.roadmap?.relatedSystemIds).toEqual([destinationId]);
  });
});
