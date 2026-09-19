import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import { createAuthorizedConvexTest } from "../test.setup";

const item = (
  title: string,
  level: "initiative" | "program" | "project" | "sprint",
) => ({
  title,
  level,
  status: "in_progress" as const,
  architectureAlignmentScore: 80,
  relatedSystemIds: [],
  priority: "medium" as const,
});

describe("project cost access and roll-up", () => {
  it("rolls Task and Non-Labor costs up by Project ID", async () => {
    const t = await createAuthorizedConvexTest("cto");
    const systemId = await t.run(async (ctx) =>
      ctx.db.insert("software_systems", {
        name: "Project System",
        type: "core",
        category: "ERP",
        status: "active",
        criticality: "high",
        departments: [],
        campuses: [],
        riskLevel: "low",
        technicalDebtScore: 0,
        architectureScore: 80,
      }),
    );
    const initiativeId = await t.mutation(
      api.roadmap.create,
      item("I", "initiative"),
    );
    const programId = await t.mutation(api.roadmap.create, {
      ...item("P", "program"),
      parentId: initiativeId,
    });
    const projectId = await t.mutation(api.roadmap.create, {
      ...item("Project", "project"),
      parentId: programId,
      relatedSystemIds: [systemId],
    });
    const sprintId = await t.mutation(api.roadmap.create, {
      ...item("Sprint", "sprint"),
      parentId: projectId,
    });
    const roleRateId = await t.mutation(api.roadmap.createProjectRoleRate, {
      name: "Dev",
      hourlyRate: 100,
    });
    const assigneeId = await t.mutation(api.roadmap.createProjectResource, {
      name: "Developer",
      roleRateId,
    });
    await t.mutation(api.roadmap.createProjectTask, {
      projectId,
      sprintId,
      title: "Build",
      assigneeId,
      phase: "pre_uat",
      estimatedHours: 10,
      actualHours: 5,
      remainingHours: 5,
    });
    await t.mutation(api.roadmap.createProjectNonLaborCost, {
      projectId,
      category: "server_domain",
      costType: "monthly",
      amount: 50,
    });

    const summaries = await t.query(api.roadmap.listProjectCostSummaries, {});
    expect(summaries).toContainEqual(
      expect.objectContaining({
        projectId,
        internalResourceCost: 500,
        remainingCost: 500,
        forecastCost: 1000,
        year1Cost: 1600,
        year2AnnualRunRate: 600,
      }),
    );
  });

  it("allows Sprint access while denying cost access to viewers", async () => {
    const viewer = await createAuthorizedConvexTest("viewer");
    await expect(viewer.query(api.roadmap.list, {})).resolves.toEqual([]);
    await expect(
      viewer.query(api.roadmap.listProjectCostSummaries, {}),
    ).rejects.toThrow();
  });
});
