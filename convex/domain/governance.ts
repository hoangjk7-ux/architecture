import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import type { UserRole } from "../helpers";

export type DemandStatus =
  | "draft"
  | "submitted"
  | "ba_review"
  | "changes_requested"
  | "approved"
  | "rejected";

const transitions: Record<
  DemandStatus,
  Partial<Record<DemandStatus, UserRole[]>>
> = {
  draft: { submitted: ["cto", "it_manager", "business_owner", "requester"] },
  submitted: { ba_review: ["cto", "it_manager", "business_analyst"] },
  ba_review: {
    approved: ["cto", "it_manager", "approver"],
    rejected: ["cto", "it_manager", "approver"],
    changes_requested: ["cto", "it_manager", "business_analyst", "approver"],
  },
  changes_requested: {
    submitted: ["cto", "it_manager", "business_owner", "requester"],
  },
  approved: {},
  rejected: {},
};

export function assertDemandTransition(
  from: DemandStatus,
  to: DemandStatus,
  role: UserRole | undefined,
) {
  const roles = transitions[from][to];
  if (!role || !roles?.includes(role)) {
    throw new ConvexError({
      code: "INVALID_TRANSITION",
      message: `Cannot transition demand from ${from} to ${to}`,
    });
  }
}

export async function writeAudit(
  ctx: MutationCtx,
  actorId: Id<"users">,
  entityType: string,
  entityId: string,
  action: string,
  before?: unknown,
  after?: unknown,
) {
  await ctx.db.insert("audit_events", {
    actorId,
    entityType,
    entityId,
    action,
    before: before === undefined ? undefined : JSON.stringify(before),
    after: after === undefined ? undefined : JSON.stringify(after),
    createdAt: Date.now(),
  });
}

export async function notifyRoles(
  ctx: MutationCtx,
  roles: UserRole[],
  notification: {
    title: string;
    message: string;
    entityType: string;
    entityId: string;
  },
) {
  const recipients = await Promise.all(
    roles.map((role) =>
      ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", role))
        .collect(),
    ),
  );
  const seen = new Set<string>();
  for (const user of recipients.flat()) {
    if (seen.has(user._id)) continue;
    seen.add(user._id);
    await ctx.db.insert("notifications", {
      recipientId: user._id,
      type: "workflow",
      ...notification,
      createdAt: Date.now(),
    });
  }
}
