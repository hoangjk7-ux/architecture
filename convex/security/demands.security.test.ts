import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { createConvexTest } from "../test.setup";

function asUser(t: ReturnType<typeof createConvexTest>, userId: Id<"users">) {
  return t.withIdentity({ subject: `${userId}|test-session` });
}

describe("demand read authorization", () => {
  it("rejects anonymous reads", async () => {
    const t = createConvexTest();

    await expect(t.query(api.demands.list, {})).rejects.toMatchObject({
      data: { code: "UNAUTHENTICATED" },
    });
  });

  it("rejects authenticated users without an assigned role", async () => {
    const t = createConvexTest();
    const pendingUserId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "pending@example.test" }),
    );

    await expect(
      asUser(t, pendingUserId).query(api.demands.list, {}),
    ).rejects.toMatchObject({
      data: { code: "FORBIDDEN" },
    });
  });
});
