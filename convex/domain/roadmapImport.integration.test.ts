import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { createAuthorizedConvexTest, createConvexTest } from "../test.setup";

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

const sampleSprints = [
  {
    title: "Sprint 1",
    startDate: "2026-05-12",
    dueDate: "2026-05-19",
    status: "done" as const,
    workstreams: [
      {
        title: "Luồng 1: Quản Lý Tạo Đơn Hàng",
        startDate: "2026-05-12",
        dueDate: "2026-05-19",
        status: "done" as const,
        description: "• 1.1 Thu thập yêu cầu (Bình · Hoàn thành)",
      },
    ],
  },
  {
    title: "Sprint 2",
    status: "in_progress" as const,
    workstreams: [
      { title: "Luồng 2: Thanh toán", status: "not_started" as const },
      { title: "Luồng 3: Kho", status: "not_started" as const },
    ],
  },
];

async function createProjectChain(
  t: Awaited<ReturnType<typeof createAuthorizedConvexTest>>,
) {
  const initiativeId = await t.mutation(
    api.roadmap.create,
    roadmapInput("VA", "initiative"),
  );
  const programId = await t.mutation(api.roadmap.create, {
    ...roadmapInput("Triển khai", "program"),
    parentId: initiativeId,
  });
  return await t.mutation(api.roadmap.create, {
    ...roadmapInput("PM Bán Hàng & Kho", "project"),
    parentId: programId,
  });
}

describe("roadmap.importSprints", () => {
  it("creates a sprint -> workstream tree under a project", async () => {
    const t = await createAuthorizedConvexTest();
    const projectId = await createProjectChain(t);

    const result = await t.mutation(api.roadmap.importSprints, {
      projectId,
      sprints: sampleSprints,
    });
    expect(result).toEqual({ sprintsCreated: 2, workstreamsCreated: 3 });

    const items = await t.run(async (ctx) =>
      ctx.db.query("roadmap_items").collect(),
    );
    const sprints = items.filter((i) => i.level === "sprint");
    const workstreams = items.filter((i) => i.level === "workstream");
    expect(sprints).toHaveLength(2);
    expect(workstreams).toHaveLength(3);
    expect(sprints.every((s) => s.parentId === projectId)).toBe(true);

    const sprint1 = sprints.find((s) => s.title === "Sprint 1")!;
    expect(sprint1.startDate).toBe("2026-05-12");
    expect(sprint1.status).toBe("done");
    const childWorkstreams = workstreams.filter(
      (w) => w.parentId === sprint1._id,
    );
    expect(childWorkstreams).toHaveLength(1);
    expect(childWorkstreams[0].description).toContain("1.1 Thu thập");
  });

  it("rejects a projectId that isn't a project-level item", async () => {
    const t = await createAuthorizedConvexTest();
    const initiativeId = await t.mutation(
      api.roadmap.create,
      roadmapInput("VA", "initiative"),
    );

    await expect(
      t.mutation(api.roadmap.importSprints, {
        projectId: initiativeId,
        sprints: sampleSprints,
      }),
    ).rejects.toMatchObject({ data: { code: "VALIDATION_ERROR" } });
  });

  it("rejects an empty sprints array", async () => {
    const t = await createAuthorizedConvexTest();
    const projectId = await createProjectChain(t);

    await expect(
      t.mutation(api.roadmap.importSprints, { projectId, sprints: [] }),
    ).rejects.toMatchObject({ data: { code: "VALIDATION_ERROR" } });
  });

  it("blocks import for a viewer (read-only role)", async () => {
    // Same database, two identities — unlike createAuthorizedConvexTest()
    // (which starts a fresh in-memory DB per call), so the viewer is being
    // blocked from the actual project the cto created, not just failing
    // against an empty unrelated DB.
    const t = createConvexTest();
    const ctoId: Id<"users"> = await t.run((ctx) =>
      ctx.db.insert("users", { email: "cto@example.test", role: "cto" }),
    );
    const viewerId: Id<"users"> = await t.run((ctx) =>
      ctx.db.insert("users", { email: "viewer@example.test", role: "viewer" }),
    );
    const asCto = t.withIdentity({ subject: ctoId });
    const asViewer = t.withIdentity({ subject: viewerId });

    const projectId = await createProjectChain(asCto);

    await expect(
      asViewer.mutation(api.roadmap.importSprints, {
        projectId,
        sprints: sampleSprints,
      }),
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });
});
