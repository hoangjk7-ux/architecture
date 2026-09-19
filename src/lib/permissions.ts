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

const allRoles: readonly UserRole[] = [
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
];

export const projectCostRoles: readonly UserRole[] = [
  "cto",
  "it_manager",
  "resource_manager",
  "finance_manager",
];

export const routeRoles = {
  dashboard: allRoles,
  systems: ["cto", "it_manager", "business_owner", "viewer"],
  vendors: ["cto", "it_manager", "business_owner", "viewer"],
  architecture: ["cto", "it_manager", "business_owner", "viewer"],
  integrations: ["cto", "it_manager", "viewer"],
  roadmap: allRoles,
  costs: projectCostRoles,
  demands: allRoles,
  users: ["cto"],
  settings: ["cto", "it_manager"],
} as const satisfies Record<string, readonly UserRole[]>;
