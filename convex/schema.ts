import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  // Extend authTables.users with our custom role field.
  // All authTables.users fields must be included and optional.
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(
      v.union(
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
    ),
    isManuallyAdded: v.optional(v.boolean()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_role", ["role"]),

  software_systems: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("core"),
      v.literal("supporting"),
      v.literal("legacy"),
      v.literal("pilot"),
    ),
    category: v.string(), // CRM, ERP, SIS, LMS, HRM, BI, etc.
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
    riskLevel: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
    ),
    technicalDebtScore: v.number(), // 0-100
    architectureScore: v.number(), // 0-100
    description: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_vendor", ["vendorId"]),

  vendors: defineTable({
    name: v.string(),
    contactEmail: v.optional(v.string()),
    contactName: v.optional(v.string()),
    supportLevel: v.union(
      v.literal("24/7"),
      v.literal("business_hours"),
      v.literal("email_only"),
    ),
    sla: v.optional(v.string()),
    costPerYear: v.optional(v.number()),
    contractEndDate: v.optional(v.string()),
    riskScore: v.number(), // 0-100
    notes: v.optional(v.string()),
  }),

  integrations: defineTable({
    name: v.string(),
    sourceSystemId: v.id("software_systems"),
    destinationSystemId: v.id("software_systems"),
    protocol: v.union(
      v.literal("REST"),
      v.literal("GraphQL"),
      v.literal("SOAP"),
      v.literal("Webhook"),
      v.literal("DB"),
      v.literal("ETL"),
      v.literal("Queue"),
      v.literal("Other"),
    ),
    method: v.union(
      v.literal("realtime"),
      v.literal("batch"),
      v.literal("event_driven"),
      v.literal("manual"),
    ),
    healthStatus: v.union(
      v.literal("healthy"),
      v.literal("degraded"),
      v.literal("down"),
      v.literal("unknown"),
    ),
    criticalLevel: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
    ),
    owner: v.optional(v.string()),
    errorRate: v.optional(v.number()),
    lastSync: v.optional(v.string()),
    description: v.optional(v.string()),
    isArchitectureCompliant: v.boolean(),
  })
    .index("by_source", ["sourceSystemId"])
    .index("by_destination", ["destinationSystemId"])
    .index("by_health", ["healthStatus"]),

  system_modules: defineTable({
    systemId: v.id("software_systems"),
    name: v.string(),
    description: v.optional(v.string()),
    // lifecycle: what phase this feature/module is in
    lifecycle: v.union(
      v.literal("in_use"), // đang sử dụng
      v.literal("in_development"), // đang phát triển
      v.literal("planned"), // dự kiến / kế hoạch
      v.literal("deprecated"), // lỗi thời, sắp bỏ
      v.literal("retired"), // đã bỏ
    ),
    // operational health of modules currently in use
    health: v.union(
      v.literal("healthy"),
      v.literal("degraded"),
      v.literal("down"),
      v.literal("unknown"),
    ),
    usedBy: v.array(v.string()), // departments / roles using it
    version: v.optional(v.string()), // current version / release
    plannedDate: v.optional(v.string()), // target date for planned/in-dev
    notes: v.optional(v.string()),
    sortOrder: v.number(), // display order within a system
  })
    .index("by_system", ["systemId"])
    .index("by_system_lifecycle", ["systemId", "lifecycle"]),

  config_items: defineTable({
    type: v.union(
      v.literal("category"),
      v.literal("department"),
      v.literal("campus"),
    ),
    name: v.string(),
    color: v.optional(v.string()),
    order: v.number(),
  }).index("by_type", ["type"]),

  internal_resource_rates: defineTable({
    name: v.string(),
    monthlyRate: v.number(),
    description: v.optional(v.string()),
  }),

  system_internal_resources: defineTable({
    systemId: v.id("software_systems"),
    resourceRateId: v.id("internal_resource_rates"),
    headcount: v.number(),
    allocationPercent: v.number(),
    startDate: v.string(),
    endDate: v.string(),
  })
    .index("by_system", ["systemId"])
    .index("by_rate", ["resourceRateId"]),

  system_change_logs: defineTable({
    systemId: v.optional(v.id("software_systems")),
    systemName: v.string(),
    action: v.union(
      v.literal("created"),
      v.literal("updated"),
      v.literal("deleted"),
      v.literal("feature_created"),
      v.literal("feature_updated"),
      v.literal("feature_deleted"),
    ),
    changes: v.optional(
      v.array(
        v.object({
          field: v.string(),
          from: v.optional(v.string()),
          to: v.optional(v.string()),
        }),
      ),
    ),
    actorName: v.optional(v.string()),
    actorEmail: v.optional(v.string()),
  }).index("by_system", ["systemId"]),

  roadmap_items: defineTable({
    title: v.string(),
    level: v.union(
      v.literal("initiative"),
      v.literal("program"),
      v.literal("project"),
      v.literal("epic"),
      // Sibling of "epic" under "project" — execution-tracking granularity
      // (sprint boards imported from external tools) rather than strategic
      // portfolio granularity. See convex/domain/roadmap.ts.
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
    architectureAlignmentScore: v.number(), // 0-100
    relatedSystemIds: v.array(v.id("software_systems")),
    description: v.optional(v.string()),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
  })
    .index("by_status", ["status"])
    .index("by_level", ["level"])
    .index("by_parent", ["parentId"]),

  departments: defineTable({
    name: v.string(),
    code: v.string(),
    parentId: v.optional(v.id("departments")),
    active: v.boolean(),
  }).index("by_code", ["code"]),

  demands: defineTable({
    code: v.string(),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    departmentId: v.optional(v.id("departments")),
    requesterId: v.id("users"),
    ownerId: v.optional(v.id("users")),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("ba_review"),
      v.literal("changes_requested"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    businessValue: v.number(),
    strategicAlignment: v.number(),
    urgency: v.number(),
    complianceImpact: v.number(),
    estimatedEffort: v.number(),
    priorityScore: v.number(),
    scoringModelVersion: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    submittedAt: v.optional(v.number()),
  })
    .index("by_requester", ["requesterId"])
    .index("by_status", ["status"])
    .index("by_code", ["code"]),

  approvals: defineTable({
    entityType: v.string(),
    entityId: v.string(),
    requestedBy: v.id("users"),
    decidedBy: v.optional(v.id("users")),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("changes_requested"),
    ),
    comment: v.optional(v.string()),
    createdAt: v.number(),
    decidedAt: v.optional(v.number()),
  }).index("by_entity", ["entityType", "entityId"]),

  workflow_events: defineTable({
    entityType: v.string(),
    entityId: v.string(),
    fromState: v.string(),
    toState: v.string(),
    actorId: v.id("users"),
    comment: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_entity", ["entityType", "entityId"]),

  notifications: defineTable({
    recipientId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_recipient", ["recipientId", "createdAt"]),

  audit_events: defineTable({
    entityType: v.string(),
    entityId: v.string(),
    actorId: v.id("users"),
    action: v.string(),
    before: v.optional(v.string()),
    after: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_entity", ["entityType", "entityId"])
    .index("by_actor", ["actorId", "createdAt"]),
});
