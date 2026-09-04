export type EcosystemGroupKey =
  | "workspace"
  | "learning"
  | "automation"
  | "platform"
  | "pilot"
  | "legacy";

export type ArchitectureRing = "core" | "operational" | "outer";
export type SystemZoneKey = EcosystemGroupKey | "core";

export interface ArchitectureSystem {
  _id: string;
  name: string;
  category: string;
  description?: string;
  type: "core" | "supporting" | "legacy" | "pilot";
  status: "active" | "sunset" | "pilot" | "inactive";
  criticality: "high" | "medium" | "low";
  technicalDebtScore: number;
  architectureScore: number;
}

export interface ArchitectureIntegration {
  sourceSystemId: string;
  destinationSystemId: string;
  healthStatus: string;
}

export interface IntegrationMetrics {
  inCount: number;
  outCount: number;
  worstHealth: string;
}

function healthPriority(health: string) {
  return health === "down"
    ? 3
    : health === "degraded"
      ? 2
      : health === "unknown"
        ? 1
        : 0;
}

export function normalizeArchitectureText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
}

export function classifyEcosystemGroup(
  system: ArchitectureSystem,
): EcosystemGroupKey {
  const text = normalizeArchitectureText(
    `${system.category} ${system.name} ${system.description ?? ""}`,
  );

  if (
    system.type === "legacy" ||
    system.status === "sunset" ||
    system.status === "inactive" ||
    system.technicalDebtScore >= 75
  ) {
    return "legacy";
  }
  if (system.type === "pilot" || system.status === "pilot") return "pilot";
  if (
    /\b(api|integration|tich hop|workflow|automation|tu dong|dong bo|sync|etl|event|queue|middleware|ipaas)\b/.test(
      text,
    )
  ) {
    return "automation";
  }
  if (
    /\b(bi|data|du lieu|analytics|warehouse|lake|database|db|identity|iam|sso|security|bao mat|ha tang|infra|infrastructure|cloud|network)\b/.test(
      text,
    )
  ) {
    return "platform";
  }
  if (
    /\b(sis|lms|learning|hoc tap|hoc thuat|academic|student|hoc sinh|parent|phu huynh|tuyen sinh|admission|admissions|library|thu vien|school|campus|curriculum|assessment)\b/.test(
      text,
    )
  ) {
    return "learning";
  }
  return "workspace";
}

export function architectureRingForSystem(
  system: ArchitectureSystem,
): Exclude<ArchitectureRing, "core"> {
  const group = classifyEcosystemGroup(system);
  return group === "platform" ||
    group === "pilot" ||
    group === "legacy" ||
    system.type === "legacy" ||
    system.type === "pilot" ||
    system.status !== "active" ||
    system.technicalDebtScore >= 75
    ? "outer"
    : "operational";
}

export function systemZoneFor(
  system: ArchitectureSystem,
  centralIds: Set<string>,
): SystemZoneKey {
  return centralIds.has(system._id) ? "core" : classifyEcosystemGroup(system);
}

export function toggleHiddenZone(
  current: Set<SystemZoneKey>,
  zoneKey: SystemZoneKey,
) {
  const next = new Set(current);
  if (next.has(zoneKey)) next.delete(zoneKey);
  else next.add(zoneKey);
  return next;
}

export function architectureNodeDensity(zoom: number, isOverview: boolean) {
  if (isOverview && zoom < 0.72) return "mini" as const;
  if (zoom < 0.72) return "compact" as const;
  return "detailed" as const;
}

export function placeSystemsOnEllipseLayers<TSystem extends { _id: string }>(
  systems: TSystem[],
  options: {
    centerX: number;
    centerY: number;
    radiusX: number;
    radiusY: number;
    nodeWidth: number;
    nodeHeight: number;
    capacity: number;
    layerGapX: number;
    layerGapY: number;
  },
) {
  const positions: Record<string, { x: number; y: number }> = {};
  const layers = Math.max(1, Math.ceil(systems.length / options.capacity));
  for (let layer = 0; layer < layers; layer += 1) {
    const layerSystems = systems.slice(
      layer * options.capacity,
      (layer + 1) * options.capacity,
    );
    layerSystems.forEach((system, index) => {
      const angle =
        -Math.PI / 2 +
        (index / Math.max(layerSystems.length, 1)) * Math.PI * 2 +
        (layer % 2 ? Math.PI / Math.max(layerSystems.length, 2) : 0);
      positions[system._id] = {
        x:
          options.centerX +
          Math.cos(angle) * (options.radiusX + layer * options.layerGapX) -
          options.nodeWidth / 2,
        y:
          options.centerY +
          Math.sin(angle) * (options.radiusY + layer * options.layerGapY) -
          options.nodeHeight / 2,
      };
    });
  }
  return { positions, layers };
}

export function placeCoreSystemsZigZag<TSystem extends { _id: string }>(
  systems: TSystem[],
  options: {
    centerX: number;
    centerY: number;
    nodeWidth: number;
    nodeHeight: number;
    horizontalOffset: number;
    verticalGap: number;
  },
) {
  const positions: Record<string, { x: number; y: number }> = {};
  systems.forEach((system, index) => {
    const offsetX =
      systems.length === 1
        ? 0
        : index % 2 === 0
          ? -options.horizontalOffset
          : options.horizontalOffset;
    positions[system._id] = {
      x: options.centerX - options.nodeWidth / 2 + offsetX,
      y:
        options.centerY -
        options.nodeHeight / 2 -
        ((systems.length - 1) * options.verticalGap) / 2 +
        index * options.verticalGap,
    };
  });
  return positions;
}

export function buildIntegrationMetrics(
  integrations: ArchitectureIntegration[],
) {
  const metrics = new Map<string, IntegrationMetrics>();
  const get = (id: string) => {
    const existing = metrics.get(id);
    if (existing) return existing;
    const initial: IntegrationMetrics = {
      inCount: 0,
      outCount: 0,
      worstHealth: "unknown",
    };
    metrics.set(id, initial);
    return initial;
  };

  integrations.forEach((integration) => {
    const source = get(integration.sourceSystemId);
    const destination = get(integration.destinationSystemId);
    source.outCount += 1;
    destination.inCount += 1;
    for (const item of [source, destination]) {
      if (
        item.worstHealth === "unknown" ||
        healthPriority(integration.healthStatus) >
          healthPriority(item.worstHealth)
      ) {
        item.worstHealth = integration.healthStatus;
      }
    }
  });
  return metrics;
}

export function buildArchitectureModel<
  TSystem extends ArchitectureSystem,
  TIntegration extends ArchitectureIntegration,
>(systems: TSystem[], integrations: TIntegration[]) {
  const metrics = buildIntegrationMetrics(integrations);
  const centralityScore = (system: TSystem) => {
    const systemMetrics = metrics.get(system._id);
    return (
      ((systemMetrics?.inCount ?? 0) + (systemMetrics?.outCount ?? 0)) * 4 +
      (system.type === "core" ? 18 : 0) +
      (system.criticality === "high" ? 8 : 0) +
      (system.status === "active" ? 3 : 0) +
      Math.round(system.architectureScore / 25)
    );
  };
  const sorted = [...systems].sort(
    (a, b) =>
      centralityScore(b) - centralityScore(a) || a.name.localeCompare(b.name),
  );
  const desiredCentralCount =
    systems.length >= 18 ? 3 : systems.length >= 8 ? 2 : systems.length ? 1 : 0;
  const centralIds = new Set(
    sorted.slice(0, desiredCentralCount).map((system) => system._id),
  );
  const groupOrder: EcosystemGroupKey[] = [
    "workspace",
    "learning",
    "automation",
    "platform",
    "pilot",
    "legacy",
  ];
  const satellites = sorted
    .filter((system) => !centralIds.has(system._id))
    .sort(
      (a, b) =>
        groupOrder.indexOf(classifyEcosystemGroup(a)) -
          groupOrder.indexOf(classifyEcosystemGroup(b)) ||
        a.name.localeCompare(b.name),
    );
  const operational = satellites.filter(
    (system) => architectureRingForSystem(system) === "operational",
  );
  const outer = satellites.filter(
    (system) => architectureRingForSystem(system) === "outer",
  );
  const ringBySystem: Record<string, ArchitectureRing> = {};
  centralIds.forEach((id) => (ringBySystem[id] = "core"));
  operational.forEach((system) => (ringBySystem[system._id] = "operational"));
  outer.forEach((system) => (ringBySystem[system._id] = "outer"));

  return {
    metrics,
    sorted,
    centralIds,
    satellites,
    operational,
    outer,
    ringBySystem,
  };
}
