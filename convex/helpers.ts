import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

export type UserRole =
  | "cto"
  | "it_manager"
  | "business_owner"
  | "viewer"
  | "requester"
  | "business_analyst"
  | "technical_assessor"
  | "approver"
  | "project_manager"
  | "resource_manager"
  | "finance_manager";

type CurrentUser = {
  _id: Id<"users">;
  role?: UserRole;
  email?: string;
  name?: string;
  isManuallyAdded?: boolean;
};

export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<CurrentUser | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) {
    return null;
  }

  return user as CurrentUser;
}

export async function requireAuthenticated(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new ConvexError({
      message: "Authentication required",
      code: "UNAUTHENTICATED",
    });
  }
  return user;
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: UserRole[],
) {
  const user = await requireAuthenticated(ctx);
  if (!user.role || !allowedRoles.includes(user.role)) {
    throw new ConvexError({
      message: "Insufficient permissions",
      code: "FORBIDDEN",
    });
  }
  return user;
}

export async function requireWriteAccess(ctx: QueryCtx | MutationCtx) {
  return requireRole(ctx, ["cto", "it_manager"]);
}

export async function requireReadAccess(ctx: QueryCtx | MutationCtx) {
  return requireRole(ctx, [
    "cto",
    "it_manager",
    "business_owner",
    "viewer",
    "requester",
    "business_analyst",
    "technical_assessor",
    "approver",
    "project_manager",
    "resource_manager",
    "finance_manager",
  ]);
}

export async function requireCTO(ctx: QueryCtx | MutationCtx) {
  return requireRole(ctx, ["cto"]);
}
