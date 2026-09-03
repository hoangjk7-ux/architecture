import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAuthenticated, requireRole } from "./helpers";
import {
  assertDemandTransition,
  notifyRoles,
  writeAudit,
  type DemandStatus,
} from "./domain/governance";

const statusValidator = v.union(
  v.literal("draft"),
  v.literal("submitted"),
  v.literal("ba_review"),
  v.literal("changes_requested"),
  v.literal("approved"),
  v.literal("rejected"),
);

function score(values: {
  businessValue: number;
  strategicAlignment: number;
  urgency: number;
  complianceImpact: number;
  estimatedEffort: number;
}) {
  for (const value of Object.values(values)) {
    if (!Number.isFinite(value) || value < 0 || value > 5) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Scoring values must be between 0 and 5",
      });
    }
  }
  return (
    Math.round(
      (values.businessValue * 0.3 +
        values.strategicAlignment * 0.25 +
        values.urgency * 0.2 +
        values.complianceImpact * 0.15 -
        values.estimatedEffort * 0.1) *
        100,
    ) / 100
  );
}

export const list = query({
  args: { status: v.optional(statusValidator) },
  handler: async (ctx, args) => {
    const user = await requireAuthenticated(ctx);
    const all = args.status
      ? await ctx.db
          .query("demands")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order("desc")
          .collect()
      : await ctx.db.query("demands").order("desc").collect();
    const canSeeAll = [
      "cto",
      "it_manager",
      "business_analyst",
      "technical_assessor",
      "approver",
    ].includes(user.role ?? "");
    return canSeeAll ? all : all.filter((d) => d.requesterId === user._id);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    businessValue: v.number(),
    strategicAlignment: v.number(),
    urgency: v.number(),
    complianceImpact: v.number(),
    estimatedEffort: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [
      "cto",
      "it_manager",
      "business_owner",
      "requester",
    ]);
    const title = args.title.trim();
    if (!title)
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Title is required",
      });
    const now = Date.now();
    const id = await ctx.db.insert("demands", {
      ...args,
      title,
      description: args.description.trim(),
      category: args.category.trim() || "General",
      code: `DEM-${now}`,
      requesterId: user._id,
      status: "draft",
      priorityScore: score(args),
      scoringModelVersion: "v1",
      createdAt: now,
      updatedAt: now,
    });
    await writeAudit(ctx, user._id, "demand", id, "created", undefined, {
      title,
      status: "draft",
    });
    return id;
  },
});

export const transition = mutation({
  args: {
    demandId: v.id("demands"),
    to: statusValidator,
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticated(ctx);
    const demand = await ctx.db.get(args.demandId);
    if (!demand)
      throw new ConvexError({ code: "NOT_FOUND", message: "Demand not found" });
    if (
      ["draft", "changes_requested"].includes(demand.status) &&
      demand.requesterId !== user._id &&
      !["cto", "it_manager"].includes(user.role ?? "")
    ) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only the requester can submit this demand",
      });
    }
    assertDemandTransition(demand.status as DemandStatus, args.to, user.role);
    const now = Date.now();
    await ctx.db.patch(demand._id, {
      status: args.to,
      updatedAt: now,
      submittedAt: args.to === "submitted" ? now : demand.submittedAt,
    });
    await ctx.db.insert("workflow_events", {
      entityType: "demand",
      entityId: demand._id,
      fromState: demand.status,
      toState: args.to,
      actorId: user._id,
      comment: args.comment?.trim(),
      createdAt: now,
    });
    if (["approved", "rejected", "changes_requested"].includes(args.to)) {
      await ctx.db.insert("approvals", {
        entityType: "demand",
        entityId: demand._id,
        requestedBy: demand.requesterId,
        decidedBy: user._id,
        status: args.to as "approved" | "rejected" | "changes_requested",
        comment: args.comment?.trim(),
        createdAt: demand.submittedAt ?? now,
        decidedAt: now,
      });
      await ctx.db.insert("notifications", {
        recipientId: demand.requesterId,
        type: "workflow",
        title: `Demand ${args.to.replace("_", " ")}`,
        message: demand.title,
        entityType: "demand",
        entityId: demand._id,
        createdAt: now,
      });
    } else if (args.to === "submitted") {
      await notifyRoles(ctx, ["cto", "it_manager", "business_analyst"], {
        title: "Demand awaiting review",
        message: demand.title,
        entityType: "demand",
        entityId: demand._id,
      });
    } else if (args.to === "ba_review") {
      await notifyRoles(ctx, ["cto", "it_manager", "approver"], {
        title: "Demand awaiting approval",
        message: demand.title,
        entityType: "demand",
        entityId: demand._id,
      });
    }
    await writeAudit(
      ctx,
      user._id,
      "demand",
      demand._id,
      "status_changed",
      { status: demand.status },
      { status: args.to },
    );
  },
});
