import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireReadAccess, requireWriteAccess } from "./helpers.ts";
import { diffFields, recordSystemChange } from "./system_change_logs.ts";
import { domainError } from "./domain/common.ts";
import { normalizeSoftwareSystem } from "./domain/softwareSystems.ts";

async function validateSystemReferences(
  ctx: Parameters<typeof requireWriteAccess>[0],
  vendorId: typeof systemArgs.vendorId.type | undefined,
) {
  if (vendorId && !(await ctx.db.get(vendorId))) {
    domainError("NOT_FOUND", "Vendor not found", "vendorId");
  }
}

const systemArgs = {
  name: v.string(),
  type: v.union(
    v.literal("core"),
    v.literal("supporting"),
    v.literal("legacy"),
    v.literal("pilot"),
  ),
  category: v.string(),
  status: v.union(
    v.literal("active"),
    v.literal("sunset"),
    v.literal("pilot"),
    v.literal("inactive"),
  ),
  criticality: v.union(
    v.literal("high"),
    v.literal("medium"),
    v.literal("low"),
  ),
  owner: v.optional(v.string()),
  vendorId: v.optional(v.id("vendors")),
  departments: v.array(v.string()),
  campuses: v.array(v.string()),
  technology: v.optional(v.string()),
  database: v.optional(v.string()),
  hosting: v.optional(v.string()),
  sla: v.optional(v.string()),
  licenseType: v.optional(v.string()),
  costPerYear: v.optional(v.number()),
  contractEndDate: v.optional(v.string()),
  riskLevel: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
  technicalDebtScore: v.number(),
  architectureScore: v.number(),
  description: v.optional(v.string()),
};

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireReadAccess(ctx);
    const systems = await ctx.db.query("software_systems").collect();
    const vendors = await ctx.db.query("vendors").collect();
    const vendorMap = new Map(vendors.map((v) => [v._id, v]));
    return systems.map((s) => ({
      ...s,
      vendor: s.vendorId ? vendorMap.get(s.vendorId) : undefined,
    }));
  },
});

export const get = query({
  args: { id: v.id("software_systems") },
  handler: async (ctx, args) => {
    await requireReadAccess(ctx);
    const system = await ctx.db.get(args.id);
    if (!system) return null;
    const vendor = system.vendorId
      ? await ctx.db.get(system.vendorId)
      : undefined;
    return { ...system, vendor };
  },
});

export const create = mutation({
  args: systemArgs,
  handler: async (ctx, args) => {
    await requireWriteAccess(ctx);
    await validateSystemReferences(ctx, args.vendorId);
    const data = normalizeSoftwareSystem(args);
    const id = await ctx.db.insert("software_systems", data);
    await recordSystemChange(ctx, {
      systemId: id,
      systemName: data.name,
      action: "created",
    });
    return id;
  },
});

export const update = mutation({
  args: { id: v.id("software_systems"), ...systemArgs },
  handler: async (ctx, args) => {
    await requireWriteAccess(ctx);
    const { id, ...data } = args;
    const existing = await ctx.db.get(id);
    if (!existing) domainError("NOT_FOUND", "Software system not found", "id");
    await validateSystemReferences(ctx, data.vendorId);
    const normalized = normalizeSoftwareSystem(data);
    await ctx.db.patch(id, normalized);
    if (existing) {
      const changes = diffFields(
        existing as Record<string, unknown>,
        normalized as Record<string, unknown>,
      );
      if (changes.length > 0) {
        await recordSystemChange(ctx, {
          systemId: id,
          systemName: normalized.name,
          action: "updated",
          changes,
        });
      }
    }
  },
});

export const remove = mutation({
  args: { id: v.id("software_systems") },
  handler: async (ctx, args) => {
    await requireWriteAccess(ctx);
    const system = await ctx.db.get(args.id);
    if (!system) domainError("NOT_FOUND", "Software system not found", "id");

    // Clean up everything that references this system so it doesn't keep
    // showing up as a dangling reference (e.g. on the Integrations page).
    const [
      asSource,
      asDestination,
      modules,
      resourceAllocations,
      roadmapItems,
    ] = await Promise.all([
      ctx.db
        .query("integrations")
        .withIndex("by_source", (q) => q.eq("sourceSystemId", args.id))
        .collect(),
      ctx.db
        .query("integrations")
        .withIndex("by_destination", (q) =>
          q.eq("destinationSystemId", args.id),
        )
        .collect(),
      ctx.db
        .query("system_modules")
        .withIndex("by_system", (q) => q.eq("systemId", args.id))
        .collect(),
      ctx.db
        .query("system_internal_resources")
        .withIndex("by_system", (q) => q.eq("systemId", args.id))
        .collect(),
      ctx.db.query("roadmap_items").collect(),
    ]);
    const integrationIds = new Set(
      [...asSource, ...asDestination].map((i) => i._id),
    );

    await Promise.all([
      ...Array.from(integrationIds).map((id) => ctx.db.delete(id)),
      ...modules.map((m) => ctx.db.delete(m._id)),
      ...resourceAllocations.map((allocation) => ctx.db.delete(allocation._id)),
      ...roadmapItems
        .filter((r) => r.relatedSystemIds.includes(args.id))
        .map((r) =>
          ctx.db.patch(r._id, {
            relatedSystemIds: r.relatedSystemIds.filter(
              (sid) => sid !== args.id,
            ),
          }),
        ),
    ]);

    await recordSystemChange(ctx, {
      systemId: args.id,
      systemName: system.name,
      action: "deleted",
    });
    await ctx.db.delete(args.id);
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    await requireReadAccess(ctx);
    const systems = await ctx.db.query("software_systems").collect();
    const now = new Date().toISOString().split("T")[0];
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    return {
      total: systems.length,
      active: systems.filter((s) => s.status === "active").length,
      legacy: systems.filter((s) => s.type === "legacy").length,
      critical: systems.filter((s) => s.criticality === "high").length,
      noOwner: systems.filter((s) => !s.owner).length,
      highRisk: systems.filter((s) => s.riskLevel === "high").length,
      expiringContracts: systems.filter(
        (s) =>
          s.contractEndDate &&
          s.contractEndDate >= now &&
          s.contractEndDate <= thirtyDaysFromNow,
      ).length,
      avgArchitectureScore: systems.length
        ? Math.round(
            systems.reduce((sum, s) => sum + s.architectureScore, 0) /
              systems.length,
          )
        : 0,
      avgTechnicalDebt: systems.length
        ? Math.round(
            systems.reduce((sum, s) => sum + s.technicalDebtScore, 0) /
              systems.length,
          )
        : 0,
    };
  },
});
