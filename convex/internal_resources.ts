import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireReadAccess, requireWriteAccess } from "./helpers";
import {
  domainError,
  normalizedKey,
  numberInRange,
  requiredOrderedDates,
  optionalText,
  requiredText,
} from "./domain/common";
import { calculateInternalResourceBudget } from "./domain/internalResources";

const RESOURCE_NAMES = ["BA", "Dev"] as const;

function resourceName(value: string) {
  const name = requiredText(value, "name");
  const match = RESOURCE_NAMES.find(
    (candidate) => candidate.toLowerCase() === name.toLowerCase(),
  );
  if (!match)
    domainError("VALIDATION_ERROR", "Nguồn lực chỉ hỗ trợ BA hoặc Dev", "name");
  return match;
}

export const listRates = query({
  args: {},
  handler: async (ctx) => {
    await requireReadAccess(ctx);
    return await ctx.db.query("internal_resource_rates").collect();
  },
});

export const createRate = mutation({
  args: {
    name: v.string(),
    monthlyRate: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireWriteAccess(ctx);
    const name = resourceName(args.name);
    const rates = await ctx.db.query("internal_resource_rates").collect();
    if (rates.some((rate) => normalizedKey(rate.name) === normalizedKey(name)))
      domainError("CONFLICT", "Vai trò nguồn lực đã tồn tại", "name");
    numberInRange(args.monthlyRate, 0, Number.MAX_SAFE_INTEGER, "monthlyRate");
    return await ctx.db.insert("internal_resource_rates", {
      name,
      monthlyRate: args.monthlyRate,
      description: optionalText(args.description),
    });
  },
});

export const updateRate = mutation({
  args: {
    id: v.id("internal_resource_rates"),
    name: v.string(),
    monthlyRate: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireWriteAccess(ctx);
    if (!(await ctx.db.get(args.id)))
      domainError("NOT_FOUND", "Không tìm thấy đơn giá", "id");
    const name = resourceName(args.name);
    numberInRange(args.monthlyRate, 0, Number.MAX_SAFE_INTEGER, "monthlyRate");
    const rates = await ctx.db.query("internal_resource_rates").collect();
    if (
      rates.some(
        (rate) =>
          rate._id !== args.id &&
          normalizedKey(rate.name) === normalizedKey(name),
      )
    )
      domainError("CONFLICT", "Vai trò nguồn lực đã tồn tại", "name");
    await ctx.db.patch(args.id, {
      name,
      monthlyRate: args.monthlyRate,
      description: optionalText(args.description),
    });
  },
});

export const removeRate = mutation({
  args: { id: v.id("internal_resource_rates") },
  handler: async (ctx, args) => {
    await requireWriteAccess(ctx);
    const allocations = await ctx.db
      .query("system_internal_resources")
      .withIndex("by_rate", (q) => q.eq("resourceRateId", args.id))
      .collect();
    if (allocations.length)
      domainError(
        "REFERENCE_IN_USE",
        "Đơn giá đang được sử dụng cho phần mềm",
        "id",
      );
    if (!(await ctx.db.get(args.id)))
      domainError("NOT_FOUND", "Không tìm thấy đơn giá", "id");
    await ctx.db.delete(args.id);
  },
});

export const listBySystem = query({
  args: { systemId: v.id("software_systems") },
  handler: async (ctx, args) => {
    await requireReadAccess(ctx);
    const allocations = await ctx.db
      .query("system_internal_resources")
      .withIndex("by_system", (q) => q.eq("systemId", args.systemId))
      .collect();
    return await Promise.all(
      allocations.map(async (allocation) => {
        const rate = await ctx.db.get(allocation.resourceRateId);
        const budget = rate
          ? calculateInternalResourceBudget({
              ...allocation,
              monthlyRate: rate.monthlyRate,
            })
          : { months: 0, estimatedCost: 0 };
        return {
          ...allocation,
          rate,
          ...budget,
        };
      }),
    );
  },
});

const allocationArgs = {
  systemId: v.id("software_systems"),
  resourceRateId: v.id("internal_resource_rates"),
  headcount: v.number(),
  allocationPercent: v.number(),
  startDate: v.string(),
  endDate: v.string(),
};

export const createAllocation = mutation({
  args: allocationArgs,
  handler: async (ctx, args) => {
    await requireWriteAccess(ctx);
    if (!(await ctx.db.get(args.systemId)))
      domainError("NOT_FOUND", "Không tìm thấy phần mềm", "systemId");
    if (!(await ctx.db.get(args.resourceRateId)))
      domainError("NOT_FOUND", "Không tìm thấy đơn giá", "resourceRateId");
    numberInRange(args.headcount, 1, 10000, "headcount");
    numberInRange(args.allocationPercent, 1, 100, "allocationPercent");
    const dates = requiredOrderedDates(
      args.startDate,
      args.endDate,
      "startDate",
      "endDate",
    );
    return await ctx.db.insert("system_internal_resources", {
      ...args,
      startDate: dates.start,
      endDate: dates.end,
    });
  },
});

export const removeAllocation = mutation({
  args: { id: v.id("system_internal_resources") },
  handler: async (ctx, args) => {
    await requireWriteAccess(ctx);
    if (!(await ctx.db.get(args.id)))
      domainError("NOT_FOUND", "Không tìm thấy phân bổ", "id");
    await ctx.db.delete(args.id);
  },
});
