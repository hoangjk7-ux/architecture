import type { Doc } from "../_generated/dataModel";
import legacySeed from "./legacyRoadmapSeed.json";

// Match all planning fields, not names or keywords. Renamed systems still
// identify old seed rows; edited plans are retained. No database rows are deleted.
export function isLegacyRoadmapSeed(item: Doc<"roadmap_items">): boolean {
  return legacySeed.some((seed) =>
    Object.entries(seed).every(
      ([key, value]) => item[key as keyof typeof item] === value,
    ),
  );
}

export function roadmapView(
  items: Doc<"roadmap_items">[],
  systems: Doc<"software_systems">[],
): Doc<"roadmap_items">[] {
  const systemById = new Map(systems.map((system) => [system._id, system]));
  const itemById = new Map(items.map((item) => [item._id, item]));
  const hasMissingProject = (item: Doc<"roadmap_items">): boolean => {
    const visited = new Set<string>();
    let current: Doc<"roadmap_items"> | undefined = item;
    while (current) {
      if (visited.has(current._id)) return true;
      visited.add(current._id);
      if (
        current.level === "project" &&
        (current.relatedSystemIds.length !== 1 ||
          !systemById.has(current.relatedSystemIds[0]))
      )
        return true;
      current = current.parentId ? itemById.get(current.parentId) : undefined;
    }
    return false;
  };
  return items
    .filter((item) => !isLegacyRoadmapSeed(item) && !hasMissingProject(item))
    .map((item) =>
      item.level === "project"
        ? { ...item, title: systemById.get(item.relatedSystemIds[0])!.name }
        : item,
    );
}
