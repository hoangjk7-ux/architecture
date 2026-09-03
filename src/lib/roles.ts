export const ROLE_LABELS: Record<string, string> = {
  cto: "CTO",
  it_manager: "IT MANAGER",
  business_owner: "BUSINESS OWNER",
  viewer: "VIEWER",
  requester: "REQUESTER",
  business_analyst: "BUSINESS ANALYST",
  technical_assessor: "TECHNICAL ASSESSOR",
  approver: "APPROVER",
  project_manager: "PROJECT MANAGER",
  resource_manager: "RESOURCE MANAGER",
  finance_manager: "FINANCE MANAGER",
};

export function formatRole(role?: string | null) {
  if (!role) return "";
  return ROLE_LABELS[role] ?? role.replace(/_/g, " ").toUpperCase();
}
