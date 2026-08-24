import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireReadAccess, requireWriteAccess } from "./helpers.ts";
import { domainError } from "./domain/common.ts";
import {
  assertNoRoadmapCycle,
  assertRoadmapParent,
  normalizeRoadmapItem,
  type RoadmapLevel,
} from "./domain/roadmap.ts";

async function validateRelatedSystems(
  ctx: Parameters<typeof requireWriteAccess>[0],
  systemIds: Array<(typeof roadmapArgs.relatedSystemIds.type)[number]>,
) {
  if (new Set(systemIds).size !== systemIds.length) {
    domainError(
      "VALIDATION_ERROR",
      "relatedSystemIds must be unique",
      "relatedSystemIds",
    );
  }
  for (const systemId of systemIds) {
    if (!(await ctx.db.get(systemId))) {
      domainError(
        "NOT_FOUND",
        "Related software system not found",
        "relatedSystemIds",
      );
    }
  }
}

async function validateParent(
  ctx: Parameters<typeof requireWriteAccess>[0],
  level: RoadmapLevel,
  parentId: typeof roadmapArgs.parentId.type | undefined,
  itemId?: string,
) {
  if (!parentId) {
    assertRoadmapParent(level, null);
    return;
  }

  const parent = await ctx.db.get(parentId);
  if (!parent) domainError("NOT_FOUND", "Roadmap parent not found", "parentId");
  assertRoadmapParent(level, parent.level);

  const ancestorIds: string[] = [parentId];
  let ancestor = parent;
  while (ancestor.parentId) {
    if (itemId) assertNoRoadmapCycle(itemId, [ancestor.parentId]);
    if (ancestorIds.includes(ancestor.parentId)) {
      domainError(
        "VALIDATION_ERROR",
        "Existing roadmap ancestry contains a cycle",
        "parentId",
      );
    }
    ancestorIds.push(ancestor.parentId);
    const next = await ctx.db.get(ancestor.parentId);
    if (!next)
      domainError("NOT_FOUND", "Roadmap ancestor not found", "parentId");
    ancestor = next;
  }
}

async function removeDescendants(
  ctx: MutationCtx,
  parentId: typeof roadmapArgs.parentId.type,
) {
  const children = await ctx.db
    .query("roadmap_items")
    .withIndex("by_parent", (q) => q.eq("parentId", parentId))
    .collect();
  for (const child of children) {
    await removeDescendants(ctx, child._id);
    await ctx.db.delete(child._id);
  }
}

const roadmapArgs = {
  title: v.string(),
  level: v.union(
    v.literal("initiative"),
    v.literal("program"),
    v.literal("project"),
    v.literal("epic"),
    v.literal("sprint"),
    v.literal("workstream"),
  ),
  parentId: v.optional(v.id("roadmap_items")),
  status: v.union(
    v.literal("not_started"),
    v.literal("in_progress"),
    v.literal("blocked"),
    v.literal("done"),
    v.literal("cancelled"),
  ),
  owner: v.optional(v.string()),
  startDate: v.optional(v.string()),
  dueDate: v.optional(v.string()),
  architectureAlignmentScore: v.number(),
  relatedSystemIds: v.array(v.id("software_systems")),
  description: v.optional(v.string()),
  priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
};

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireReadAccess(ctx);
    return await ctx.db.query("roadmap_items").collect();
  },
});

export const create = mutation({
  args: roadmapArgs,
  handler: async (ctx, args) => {
    await requireWriteAccess(ctx);
    const data = normalizeRoadmapItem(args);
    await validateRelatedSystems(ctx, data.relatedSystemIds);
    await validateParent(ctx, data.level, data.parentId);
    return await ctx.db.insert("roadmap_items", data);
  },
});

export const update = mutation({
  args: { id: v.id("roadmap_items"), ...roadmapArgs },
  handler: async (ctx, args) => {
    await requireWriteAccess(ctx);
    const { id, ...data } = args;
    if (!(await ctx.db.get(id)))
      domainError("NOT_FOUND", "Roadmap item not found", "id");
    const normalized = normalizeRoadmapItem(data);
    await validateRelatedSystems(ctx, normalized.relatedSystemIds);
    await validateParent(ctx, normalized.level, normalized.parentId, id);
    const children = await ctx.db
      .query("roadmap_items")
      .withIndex("by_parent", (q) => q.eq("parentId", id))
      .collect();
    for (const child of children)
      assertRoadmapParent(child.level, normalized.level);
    await ctx.db.patch(id, normalized);
  },
});

export const remove = mutation({
  args: { id: v.id("roadmap_items") },
  handler: async (ctx, args) => {
    await requireWriteAccess(ctx);
    if (!(await ctx.db.get(args.id)))
      domainError("NOT_FOUND", "Roadmap item not found", "id");
    await removeDescendants(ctx, args.id);
    await ctx.db.delete(args.id);
  },
});

const importStatus = v.union(
  v.literal("not_started"),
  v.literal("in_progress"),
  v.literal("blocked"),
  v.literal("done"),
  v.literal("cancelled"),
);

const importWorkstreamArgs = v.object({
  title: v.string(),
  owner: v.optional(v.string()),
  startDate: v.optional(v.string()),
  dueDate: v.optional(v.string()),
  status: importStatus,
  description: v.optional(v.string()),
});

const importSprintArgs = v.object({
  title: v.string(),
  startDate: v.optional(v.string()),
  dueDate: v.optional(v.string()),
  status: importStatus,
  workstreams: v.array(importWorkstreamArgs),
});

// Bulk-creates a "Sprint -> Luồng (workstream)" tree under an existing
// "project" roadmap item, from data already parsed client-side (see
// convex/domain/roadmapImport.ts — this mutation trusts its shape, it does
// not re-parse a spreadsheet). Individual tasks are not imported as their
// own roadmap_items; the parser folds them into each workstream's
// `description` so bulk imports don't dilute company-wide roadmap stats
// (getStats counts every item; only "project"-level items feed
// completionRate/overdue).
export const importSprints = mutation({
  args: {
    projectId: v.id("roadmap_items"),
    sprints: v.array(importSprintArgs),
  },
  handler: async (ctx, args) => {
    await requireWriteAccess(ctx);
    if (!args.sprints.length)
      domainError("VALIDATION_ERROR", "No sprints to import", "sprints");

    const project = await ctx.db.get(args.projectId);
    if (!project)
      domainError("NOT_FOUND", "Target project not found", "projectId");
    if (project.level !== "project") {
      domainError(
        "VALIDATION_ERROR",
        "Sprints can only be imported under a project-level roadmap item",
        "projectId",
      );
    }

    let sprintsCreated = 0;
    let workstreamsCreated = 0;
    for (const sprint of args.sprints) {
      const sprintData = normalizeRoadmapItem({
        title: sprint.title,
        level: "sprint" as const,
        parentId: args.projectId,
        status: sprint.status,
        startDate: sprint.startDate,
        dueDate: sprint.dueDate,
        architectureAlignmentScore: 0,
        relatedSystemIds: [],
        priority: "medium" as const,
      });
      assertRoadmapParent(sprintData.level, project.level);
      const sprintId = await ctx.db.insert("roadmap_items", sprintData);
      sprintsCreated += 1;

      for (const workstream of sprint.workstreams) {
        const workstreamData = normalizeRoadmapItem({
          title: workstream.title,
          level: "workstream" as const,
          parentId: sprintId,
          status: workstream.status,
          owner: workstream.owner,
          startDate: workstream.startDate,
          dueDate: workstream.dueDate,
          architectureAlignmentScore: 0,
          relatedSystemIds: [],
          description: workstream.description,
          priority: "medium" as const,
        });
        assertRoadmapParent(workstreamData.level, sprintData.level);
        await ctx.db.insert("roadmap_items", workstreamData);
        workstreamsCreated += 1;
      }
    }
    return { sprintsCreated, workstreamsCreated };
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    await requireReadAccess(ctx);
    const items = await ctx.db.query("roadmap_items").collect();
    const projects = items.filter((i) => i.level === "project");
    const now = new Date().toISOString().split("T")[0];
    return {
      total: items.length,
      inProgress: items.filter((i) => i.status === "in_progress").length,
      blocked: items.filter((i) => i.status === "blocked").length,
      done: items.filter((i) => i.status === "done").length,
      overdue: projects.filter(
        (i) => i.dueDate && i.dueDate < now && i.status !== "done",
      ).length,
      completionRate: projects.length
        ? Math.round(
            (projects.filter((i) => i.status === "done").length /
              projects.length) *
              100,
          )
        : 0,
      avgAlignmentScore: items.length
        ? Math.round(
            items.reduce((sum, i) => sum + i.architectureAlignmentScore, 0) /
              items.length,
          )
        : 0,
    };
  },
});
