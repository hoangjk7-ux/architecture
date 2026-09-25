import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { roadmapView } from "./domain/roadmapView";
import {
  requireProjectCostAccess,
  requireReadAccess,
  requireWriteAccess,
} from "./helpers.ts";
import {
  domainError,
  numberInRange,
  optionalText,
  requiredText,
} from "./domain/common.ts";
import { calculateProjectCost } from "./domain/projectCosts.ts";
import {
  assertAllowedRoadmapContent,
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
  if (level === "sprint" || level === "epic") {
    if (
      parent.relatedSystemIds.length !== 1 ||
      !(await ctx.db.get(parent.relatedSystemIds[0]))
    )
      domainError(
        "VALIDATION_ERROR",
        "Parent project must reference Kho hệ thống",
        "parentId",
      );
  }

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

async function listPlans(ctx: QueryCtx) {
  const [items, systems] = await Promise.all([
    ctx.db.query("roadmap_items").collect(),
    ctx.db.query("software_systems").collect(),
  ]);
  return roadmapView(items, systems);
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireReadAccess(ctx);
    return await listPlans(ctx);
  },
});

async function normalizeProjectSystem<
  T extends {
    level: RoadmapLevel;
    title: string;
    relatedSystemIds: Id<"software_systems">[];
  },
>(ctx: Parameters<typeof requireWriteAccess>[0], data: T): Promise<T> {
  if (data.level !== "project") return data;
  if (data.relatedSystemIds.length !== 1)
    domainError(
      "VALIDATION_ERROR",
      "Project must reference exactly one system from Kho hệ thống",
      "relatedSystemIds",
    );
  const system = await ctx.db.get(data.relatedSystemIds[0]);
  if (!system)
    domainError("NOT_FOUND", "Software system not found", "relatedSystemIds");
  return { ...data, title: system.name };
}

export const create = mutation({
  args: roadmapArgs,
  handler: async (ctx, args) => {
    await requireWriteAccess(ctx);
    const data = normalizeRoadmapItem(await normalizeProjectSystem(ctx, args));
    assertAllowedRoadmapContent(data.title, data.description);
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
    const normalized = normalizeRoadmapItem(
      await normalizeProjectSystem(ctx, data),
    );
    assertAllowedRoadmapContent(normalized.title, normalized.description);
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

    await validateParent(ctx, "sprint", args.projectId);

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
      assertAllowedRoadmapContent(sprintData.title);
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
        assertAllowedRoadmapContent(
          workstreamData.title,
          workstreamData.description,
        );
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
    const items = await listPlans(ctx);
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

async function requireProject(
  ctx: MutationCtx,
  projectId: Id<"roadmap_items">,
) {
  const project = await ctx.db.get(projectId);
  if (!project || project.level !== "project")
    domainError("NOT_FOUND", "Project roadmap item not found", "projectId");
  return project;
}

export const listProjectCostSummaries = query({
  args: {},
  handler: async (ctx) => {
    await requireProjectCostAccess(ctx);
    const [items, tasks, resources, rates, nonLaborCosts] = await Promise.all([
      ctx.db.query("roadmap_items").collect(),
      ctx.db.query("project_tasks").collect(),
      ctx.db.query("project_resources").collect(),
      ctx.db.query("project_role_rates").collect(),
      ctx.db.query("project_non_labor_costs").collect(),
    ]);
    const resourcesById = new Map(resources.map((item) => [item._id, item]));
    const ratesById = new Map(rates.map((item) => [item._id, item]));
    return items
      .filter((item) => item.level === "project")
      .map((project) => ({
        projectId: project._id,
        tasks: tasks
          .filter((task) => task.projectId === project._id)
          .map((task) => {
            const resource = resourcesById.get(task.assigneeId);
            const unitRate = resource
              ? (ratesById.get(resource.roleRateId)?.hourlyRate ?? 0)
              : 0;
            return {
              ...task,
              assigneeName: resource?.name ?? "Unknown",
              unitRate,
              budgetCost: task.estimatedHours * unitRate,
              actualCost: task.actualHours * unitRate,
              remainingCost: task.remainingHours * unitRate,
              forecastCost: (task.actualHours + task.remainingHours) * unitRate,
            };
          }),
        nonLaborCosts: nonLaborCosts.filter(
          (cost) => cost.projectId === project._id,
        ),
        ...calculateProjectCost(
          tasks
            .filter((task) => task.projectId === project._id)
            .map((task) => {
              const resource = resourcesById.get(task.assigneeId);
              return {
                ...task,
                unitRate: resource
                  ? (ratesById.get(resource.roleRateId)?.hourlyRate ?? 0)
                  : 0,
              };
            }),
          nonLaborCosts.filter((cost) => cost.projectId === project._id),
        ),
      }));
  },
});

export const listProjectCostMasterData = query({
  args: {},
  handler: async (ctx) => {
    await requireProjectCostAccess(ctx);
    const [roleRates, resources] = await Promise.all([
      ctx.db.query("project_role_rates").collect(),
      ctx.db.query("project_resources").collect(),
    ]);
    return { roleRates, resources };
  },
});

export const createProjectRoleRate = mutation({
  args: { name: v.string(), hourlyRate: v.number() },
  handler: async (ctx, args) => {
    await requireProjectCostAccess(ctx);
    const name = requiredText(args.name, "name");
    numberInRange(args.hourlyRate, 0, Number.MAX_SAFE_INTEGER, "hourlyRate");
    return await ctx.db.insert("project_role_rates", {
      name,
      hourlyRate: args.hourlyRate,
    });
  },
});

export const createProjectResource = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    roleRateId: v.id("project_role_rates"),
  },
  handler: async (ctx, args) => {
    await requireProjectCostAccess(ctx);
    if (!(await ctx.db.get(args.roleRateId)))
      domainError("NOT_FOUND", "Role rate not found", "roleRateId");
    return await ctx.db.insert("project_resources", {
      name: requiredText(args.name, "name"),
      email: optionalText(args.email),
      roleRateId: args.roleRateId,
      active: true,
    });
  },
});

export const createProjectTask = mutation({
  args: {
    projectId: v.id("roadmap_items"),
    sprintId: v.id("roadmap_items"),
    title: v.string(),
    assigneeId: v.id("project_resources"),
    phase: v.union(v.literal("pre_uat"), v.literal("post_uat")),
    estimatedHours: v.number(),
    actualHours: v.number(),
    remainingHours: v.number(),
  },
  handler: async (ctx, args) => {
    await requireProjectCostAccess(ctx);
    await requireProject(ctx, args.projectId);
    const sprint = await ctx.db.get(args.sprintId);
    if (
      !sprint ||
      sprint.level !== "sprint" ||
      sprint.parentId !== args.projectId
    )
      domainError(
        "VALIDATION_ERROR",
        "Sprint must belong to Project ID",
        "sprintId",
      );
    if (!(await ctx.db.get(args.assigneeId)))
      domainError("NOT_FOUND", "Assignee not found", "assigneeId");
    for (const [field, value] of [
      ["estimatedHours", args.estimatedHours],
      ["actualHours", args.actualHours],
      ["remainingHours", args.remainingHours],
    ] as const)
      numberInRange(value, 0, Number.MAX_SAFE_INTEGER, field);
    return await ctx.db.insert("project_tasks", {
      ...args,
      title: requiredText(args.title, "title"),
    });
  },
});

export const createProjectNonLaborCost = mutation({
  args: {
    projectId: v.id("roadmap_items"),
    category: v.union(
      v.literal("server_domain"),
      v.literal("cloud_infrastructure"),
      v.literal("software_license"),
      v.literal("outsource_vendor"),
      v.literal("other"),
    ),
    costType: v.union(
      v.literal("initial"),
      v.literal("monthly"),
      v.literal("annual"),
    ),
    amount: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProjectCostAccess(ctx);
    await requireProject(ctx, args.projectId);
    numberInRange(args.amount, 0, Number.MAX_SAFE_INTEGER, "amount");
    return await ctx.db.insert("project_non_labor_costs", {
      ...args,
      description: optionalText(args.description),
    });
  },
});

export const removeProjectNonLaborCost = mutation({
  args: { id: v.id("project_non_labor_costs") },
  handler: async (ctx, args) => {
    await requireProjectCostAccess(ctx);
    if (!(await ctx.db.get(args.id)))
      domainError("NOT_FOUND", "Project cost not found", "id");
    await ctx.db.delete(args.id);
  },
});
