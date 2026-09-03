import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticated } from "./helpers";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthenticated(ctx);
    return await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipientId", user._id))
      .order("desc")
      .take(30);
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticated(ctx);
    const item = await ctx.db.get(args.notificationId);
    if (!item || item.recipientId !== user._id) return;
    await ctx.db.patch(item._id, { readAt: Date.now() });
  },
});
