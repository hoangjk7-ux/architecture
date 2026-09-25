import { expect, it } from "vitest";
import { api } from "../_generated/api";
import { createAuthorizedConvexTest } from "../test.setup";
import { createRoadmapForm } from "../../src/pages/roadmap/form";

it("saves an edited Convex document without sending metadata to update", async () => {
  const t = await createAuthorizedConvexTest();
  const id = await t.mutation(api.roadmap.create, {
    ...createRoadmapForm(),
    title: "Khối Văn Phòng",
    architectureAlignmentScore: 0,
  });
  const document = await t.run((ctx) => ctx.db.get(id));
  expect(document).not.toBeNull();
  const form = createRoadmapForm(document!);
  expect(form).not.toHaveProperty("_id");
  expect(form).not.toHaveProperty("_creationTime");
  await t.mutation(api.roadmap.update, {
    id,
    ...form,
    status: "in_progress",
  });
  expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({
    title: "Khối Văn Phòng",
    status: "in_progress",
    architectureAlignmentScore: 0,
  });
});
