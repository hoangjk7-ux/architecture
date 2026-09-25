import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import { createAuthorizedConvexTest } from "../test.setup";
import legacySeed from "./legacyRoadmapSeed.json";

const plan = {
  title: "Kế hoạch thật",
  level: "initiative" as const,
  status: "not_started" as const,
  architectureAlignmentScore: 0,
  relatedSystemIds: [],
  priority: "medium" as const,
};

describe("roadmap uses system identity and real plans", () => {
  it("creates with an empty client title, follows system rename and excludes detached descendants from stats", async () => {
    const t = await createAuthorizedConvexTest();
    const systemId = await t.mutation(api.software_systems.create, {
      name: "Kho",
      type: "core",
      category: "ERP",
      status: "active",
      criticality: "high",
      departments: [],
      campuses: [],
      riskLevel: "low",
      technicalDebtScore: 0,
      architectureScore: 80,
    });
    const initiativeId = await t.mutation(api.roadmap.create, plan);
    const programId = await t.mutation(api.roadmap.create, {
      ...plan,
      level: "program",
      parentId: initiativeId,
    });
    const projectId = await t.mutation(api.roadmap.create, {
      ...plan,
      title: "",
      level: "project",
      parentId: programId,
      relatedSystemIds: [systemId],
    });
    await t.mutation(api.roadmap.importSprints, {
      projectId,
      sprints: [
        { title: "Sprint thật", status: "not_started", workstreams: [] },
      ],
    });
    await t.run((ctx) => ctx.db.patch(systemId, { name: "Kho mới" }));
    const items = await t.query(api.roadmap.list);
    expect(items.find((item) => item._id === projectId)?.title).toBe("Kho mới");
    expect((await t.query(api.roadmap.getStats)).total).toBe(items.length);
    await t.mutation(api.software_systems.remove, { id: systemId });
    expect((await t.query(api.roadmap.list)).map((item) => item.level)).toEqual(
      ["initiative", "program"],
    );
    expect((await t.query(api.roadmap.getStats)).total).toBe(2);
    await expect(
      t.mutation(api.roadmap.importSprints, {
        projectId,
        sprints: [{ title: "New", status: "not_started", workstreams: [] }],
      }),
    ).rejects.toThrow();
  });

  it("omits exact legacy seed plans without deleting them or hiding edited plans", async () => {
    const t = await createAuthorizedConvexTest();
    const seed = legacySeed[0];
    const legacyId = await t.run((ctx) =>
      ctx.db.insert("roadmap_items", {
        ...plan,
        ...seed,
        level: "initiative",
        status: "in_progress",
        priority: "high",
      }),
    );
    expect(await t.query(api.roadmap.list)).toEqual([]);
    expect((await t.query(api.roadmap.getStats)).total).toBe(0);
    expect(await t.run((ctx) => ctx.db.get(legacyId))).not.toBeNull();
    await t.run((ctx) =>
      ctx.db.patch(legacyId, { description: "Kế hoạch đã xác nhận" }),
    );
    expect(await t.query(api.roadmap.list)).toHaveLength(1);
  });
});
