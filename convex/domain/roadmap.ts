import {
  domainError,
  numberInRange,
  optionalText,
  orderedDates,
  requiredText,
} from "./common";

export type RoadmapLevel =
  | "initiative"
  | "program"
  | "project"
  | "epic"
  | "sprint"
  | "workstream";

const requiredParentLevel: Record<RoadmapLevel, RoadmapLevel | null> = {
  initiative: null,
  program: "initiative",
  project: "program",
  epic: "project",
  // Sprint is a sibling of epic — both attach directly under a project, but
  // represent different tracking styles (strategic epic vs. an imported
  // execution sprint board). See convex/domain/roadmapImport.ts.
  sprint: "project",
  workstream: "sprint",
};

export type RoadmapInput = {
  title: string;
  level: RoadmapLevel;
  owner?: string;
  startDate?: string;
  dueDate?: string;
  architectureAlignmentScore: number;
  description?: string;
};

const forbiddenRoadmapPatterns = [
  /sap\s*s\/4hana[\s\p{P}]*sd[\s\p{P}]*(module\s*)?(optimization|tuning)/iu,
  /sd[\s\p{P}]*(module\s*)?(optimization|query\s*performance\s*tuning)/iu,
  /api\s*gateway[\s\p{P}]*(production\s*)?hardening/iu,
  /production\s*hardening/iu,
  /api\s*gateway[\s\p{P}]*ha[\s\p{P}]*configuration/iu,
];

export function isForbiddenRoadmapContent(value: string | undefined): boolean {
  return (
    !!value && forbiddenRoadmapPatterns.some((pattern) => pattern.test(value))
  );
}

export function assertAllowedRoadmapContent(
  title: string,
  description?: string,
): void {
  if (
    isForbiddenRoadmapContent(title) ||
    isForbiddenRoadmapContent(description)
  ) {
    domainError(
      "VALIDATION_ERROR",
      "Roadmap contains a retired demo item and cannot be imported",
      "title",
    );
  }
}

export function normalizeRoadmapItem<T extends RoadmapInput>(input: T): T {
  const dates = orderedDates(input.startDate, input.dueDate);
  return {
    ...input,
    title: requiredText(input.title, "title"),
    owner: optionalText(input.owner),
    startDate: dates.start,
    dueDate: dates.end,
    architectureAlignmentScore: numberInRange(
      input.architectureAlignmentScore,
      0,
      100,
      "architectureAlignmentScore",
    ),
    description: optionalText(input.description),
  };
}

export function assertRoadmapParent(
  level: RoadmapLevel,
  parentLevel: RoadmapLevel | null,
): void {
  const expected = requiredParentLevel[level];
  if (parentLevel !== expected) {
    domainError(
      "VALIDATION_ERROR",
      expected === null
        ? `${level} cannot have a parent`
        : `${level} must have a ${expected} parent`,
      "parentId",
    );
  }
}

export function assertNoRoadmapCycle(
  itemId: string,
  ancestorIds: readonly string[],
): void {
  if (ancestorIds.includes(itemId)) {
    domainError(
      "VALIDATION_ERROR",
      "Roadmap parent would create a cycle",
      "parentId",
    );
  }
}
