import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAuthenticated, requireCTO } from "./helpers";
import { domainError, normalizeEmail, optionalText } from "./domain/common";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { writeAudit } from "./domain/governance";

type UserRole = NonNullable<Doc<"users">["role"]>;

async function getTargetUser(ctx: MutationCtx, userId: Id<"users">) {
  const target = await ctx.db.get(userId);
  if (!target) domainError("NOT_FOUND", "User not found");
  return target;
}

async function assertCtoCanBeRemovedOrDemoted(
  ctx: MutationCtx,
  target: Doc<"users">,
  nextRole?: UserRole,
) {
  const removesActiveCto =
    target.role === "cto" && !target.isManuallyAdded && nextRole !== "cto";
  if (!removesActiveCto) return;

  const ctos = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "cto"))
    .collect();
  const activeCtoCount = ctos.filter((user) => !user.isManuallyAdded).length;
  if (activeCtoCount <= 1) {
    domainError("CONFLICT", "The last active CTO cannot be removed or demoted");
  }
}

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await requireAuthenticated(ctx);
  },
});

// Called from the frontend after login to ensure the user has a role assigned.
export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthenticated(ctx);

    const userId = user._id;

    // Preserve intentionally assigned non-viewer roles
    if (user.role && user.role !== "viewer") return userId;

    // Check if this email was pre-configured by a CTO invite (isManuallyAdded)
    if (user.email) {
      const email = normalizeEmail(user.email);
      const sameEmail = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .collect();

      const invitations = sameEmail.filter(
        (candidate) =>
          candidate._id !== userId &&
          candidate.isManuallyAdded &&
          candidate.role,
      );
      if (invitations.length > 1) {
        domainError(
          "CONFLICT",
          "Multiple pending invitations exist for this email",
        );
      }
      const invite = invitations[0];
      if (invite) {
        await ctx.db.patch(userId, { email, role: invite.role });
        await ctx.db.delete(invite._id);
        return userId;
      }
      if (user.email !== email) await ctx.db.patch(userId, { email });
    }

    if (user.role !== "viewer") {
      await ctx.db.patch(userId, { role: "viewer" });
    }
    return userId;
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireCTO(ctx);
    return await ctx.db.query("users").collect();
  },
});

export const inviteUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("cto"),
      v.literal("it_manager"),
      v.literal("business_owner"),
      v.literal("viewer"),
      v.literal("requester"),
      v.literal("business_analyst"),
      v.literal("technical_assessor"),
      v.literal("approver"),
      v.literal("project_manager"),
      v.literal("resource_manager"),
      v.literal("finance_manager"),
    ),
  },
  handler: async (ctx, args) => {
    await requireCTO(ctx);
    const email = normalizeEmail(args.email);
    const sameEmail = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .collect();
    if (sameEmail.length > 1) {
      domainError("CONFLICT", "Multiple users already exist for this email");
    }
    const existing = sameEmail[0];
    if (existing) {
      await assertCtoCanBeRemovedOrDemoted(ctx, existing, args.role);
      const beforeRole = existing.role;
      await ctx.db.patch(existing._id, { role: args.role });
      const actor = await requireCTO(ctx);
      await writeAudit(
        ctx,
        actor._id,
        "user",
        existing._id,
        "role_changed",
        { role: beforeRole },
        { role: args.role },
      );
      return existing._id;
    }
    const id = await ctx.db.insert("users", {
      name: optionalText(args.name),
      email,
      role: args.role,
      isManuallyAdded: true,
    });
    const actor = await requireCTO(ctx);
    await writeAudit(ctx, actor._id, "user", id, "invited", undefined, {
      email,
      role: args.role,
    });
    return id;
  },
});

export const removeUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await requireCTO(ctx);
    if (args.userId === me._id) {
      throw new ConvexError({
        message: "Cannot remove yourself",
        code: "FORBIDDEN",
      });
    }
    const target = await getTargetUser(ctx, args.userId);
    await assertCtoCanBeRemovedOrDemoted(ctx, target);
    await writeAudit(ctx, me._id, "user", target._id, "removed", {
      email: target.email,
      role: target.role,
    });
    await ctx.db.delete(args.userId);
  },
});

export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("cto"),
      v.literal("it_manager"),
      v.literal("business_owner"),
      v.literal("viewer"),
      v.literal("requester"),
      v.literal("business_analyst"),
      v.literal("technical_assessor"),
      v.literal("approver"),
      v.literal("project_manager"),
      v.literal("resource_manager"),
      v.literal("finance_manager"),
    ),
  },
  handler: async (ctx, args) => {
    const actor = await requireCTO(ctx);
    const target = await getTargetUser(ctx, args.userId);
    await assertCtoCanBeRemovedOrDemoted(ctx, target, args.role);
    await ctx.db.patch(args.userId, { role: args.role });
    await writeAudit(
      ctx,
      actor._id,
      "user",
      target._id,
      "role_changed",
      { role: target.role },
      { role: args.role },
    );
  },
});
