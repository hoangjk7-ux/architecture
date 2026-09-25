import type { Doc } from "@/convex/_generated/dataModel";

type RoadmapItem = Doc<"roadmap_items">;
export type RoadmapFormData = Omit<
  RoadmapItem,
  "_id" | "_creationTime" | "owner" | "startDate" | "dueDate" | "description"
> & {
  owner: string;
  startDate: string;
  dueDate: string;
  description: string;
};

// Pick editable fields explicitly: TypeScript does not strip document metadata
// when a Convex document is passed as Partial<RoadmapFormData> at runtime.
export function createRoadmapForm(
  initial: Partial<RoadmapFormData> = {},
): RoadmapFormData {
  return {
    title: initial.title ?? "",
    level: initial.level ?? "initiative",
    parentId: initial.parentId,
    status: initial.status ?? "not_started",
    owner: initial.owner ?? "",
    startDate: initial.startDate ?? "",
    dueDate: initial.dueDate ?? "",
    architectureAlignmentScore: initial.architectureAlignmentScore ?? 80,
    relatedSystemIds: initial.relatedSystemIds ?? [],
    description: initial.description ?? "",
    priority: initial.priority ?? "medium",
  };
}
