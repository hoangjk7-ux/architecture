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

export type ArchitectureEdgeLabelMode = "none" | "summary" | "detail";

export interface ArchitectureEdgePresentationInput {
  isDistantZoom: boolean;
  isHidden: boolean;
  isSelected: boolean;
  isEndpointFocused: boolean;
  hasActiveFocus: boolean;
  matchesActiveFocus: boolean;
  isHighCritical: boolean;
  hasHealthIssue: boolean;
  isRiskEdge: boolean;
  isRealtime: boolean;
  baseOpacity: number;
}

/**
 * Keeps every integration independently selectable while reducing edge noise at
 * overview zoom. Selection always wins; attention signals only affect visual
 * presentation and never hide or aggregate an integration.
 */
export function architectureEdgePresentation({
  isDistantZoom,
  isHidden,
  isSelected,
  isEndpointFocused,
  hasActiveFocus,
  matchesActiveFocus,
  isHighCritical,
  hasHealthIssue,
  isRiskEdge,
  isRealtime,
  baseOpacity,
}: ArchitectureEdgePresentationInput) {
  if (isHidden) {
    return { opacity: baseOpacity, animated: false, label: "none" } as const;
  }

  const isFocused = isSelected || isEndpointFocused;
  const isAttentionEdge = isHighCritical || hasHealthIssue || isRiskEdge;
  const isCriteriaFocused = hasActiveFocus && matchesActiveFocus;

  if (!isDistantZoom) {
    return {
      opacity: baseOpacity,
      animated: isRealtime,
      label: isFocused
        ? ("detail" as const)
        : isCriteriaFocused
          ? ("summary" as const)
          : ("none" as const),
    };
  }

  if (isSelected) {
    return {
      opacity: 1,
      animated: isRealtime,
      label: "detail",
    } as const;
  }

  if (isEndpointFocused) {
    return {
      opacity: Math.max(baseOpacity, 0.9),
      animated: false,
      label: "detail",
    } as const;
  }

  if (isCriteriaFocused) {
    return {
      opacity: Math.max(baseOpacity, 0.78),
      animated: isRealtime,
      label: "summary",
    } as const;
  }

  if (isAttentionEdge) {
    return {
      opacity: Math.max(baseOpacity, 0.48),
      animated: false,
      label: "none",
    } as const;
  }

  return {
    opacity: Math.min(baseOpacity, 0.06),
    animated: false,
    label: "none",
  } as const;
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
    horizontalStagger?: number;
    collisionGap?: number;
  },
) {
  const positions: Record<string, { x: number; y: number }> = {};
  const horizontalStagger = options.horizontalStagger ?? 0;
  const collisionGap = options.collisionGap ?? 0;
  const placed: Array<{ x: number; y: number }> = [];
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
      const base = {
        x:
          options.centerX +
          Math.cos(angle) * (options.radiusX + layer * options.layerGapX) -
          options.nodeWidth / 2 +
          (index % 2 === 0 ? -horizontalStagger : horizontalStagger),
        y:
          options.centerY +
          Math.sin(angle) * (options.radiusY + layer * options.layerGapY) -
          options.nodeHeight / 2,
      };
      const position = { ...base };
      let attempt = 0;
      const overlapsPlacedCard = () =>
        placed.some(
          (other) =>
            position.x < other.x + options.nodeWidth + collisionGap &&
            position.x + options.nodeWidth + collisionGap > other.x &&
            position.y < other.y + options.nodeHeight + collisionGap &&
            position.y + options.nodeHeight + collisionGap > other.y,
        );
      while (overlapsPlacedCard() && attempt < 20) {
        attempt += 1;
        const direction = (index + attempt) % 2 === 0 ? -1 : 1;
        position.x =
          base.x +
          direction *
            Math.ceil(attempt / 2) *
            (options.nodeWidth + collisionGap);
      }
      positions[system._id] = position;
      placed.push(position);
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

export type ArchitectureClusterAnchor =
  | "top-left"
  | "top-right"
  | "middle-left"
  | "middle-right"
  | "bottom-left"
  | "bottom-right";

export interface ConcentricTopologyGeometry {
  canvas: { width: number; height: number };
  center: { x: number; y: number };
  coreRadius: number;
  orbitRadii: readonly [number, number, number];
  systemRadii: { operational: number; outer: number };
  clusterAnchors: Record<
    EcosystemGroupKey,
    { anchor: ArchitectureClusterAnchor; x: number; y: number }
  >;
}

/**
 * Stable geometry contract for the Architecture Map. System cards sit in the
 * channels between orbit strokes, while the six domain summaries occupy
 * distinct perimeter anchors. Keeping this pure makes dense/compact topology
 * changes testable without mounting React Flow.
 */
export function createConcentricTopologyGeometry(
  isCompressed: boolean,
  extraLayerCount = 0,
): ConcentricTopologyGeometry {
  const canvas = isCompressed
    ? { width: 940, height: 760 }
    : { width: 1449, height: 1086 };
  const center = isCompressed ? { x: 470, y: 360 } : { x: 724.5, y: 490 };
  const normalizedExtraLayers = Math.max(0, extraLayerCount);
  const layerExpansion = normalizedExtraLayers * (isCompressed ? 115 : 130);
  const innerOrbitRadius = isCompressed ? 255 : 285;
  const middleOrbitRadius = isCompressed ? 315 : 350;
  const outerSystemRadius = isCompressed ? 400 : 430;
  const outerOrbitRadius = outerSystemRadius + layerExpansion;
  const orbitRadii = [
    innerOrbitRadius,
    middleOrbitRadius,
    outerOrbitRadius,
  ] as const;
  const systemRadii = {
    operational: middleOrbitRadius,
    outer: outerSystemRadius,
  };

  return {
    canvas,
    center,
    coreRadius: isCompressed ? 205 : 220,
    orbitRadii,
    systemRadii,
    clusterAnchors: {
      workspace: {
        anchor: "top-left",
        x: isCompressed ? 130 : 223,
        y: isCompressed ? 55 : 83,
      },
      learning: {
        anchor: "top-right",
        x: isCompressed ? 810 : 1225,
        y: isCompressed ? 55 : 83,
      },
      platform: {
        anchor: "middle-left",
        x: isCompressed ? 135 : 183,
        y: isCompressed ? 660 : 878,
      },
      automation: {
        anchor: "middle-right",
        x: isCompressed ? 690 : 1035,
        y: isCompressed ? 660 : 878,
      },
      pilot: {
        anchor: "bottom-left",
        x: isCompressed ? 390 : 724.5,
        y: isCompressed ? 720 : 991,
      },
      legacy: {
        anchor: "bottom-right",
        x: isCompressed ? 815 : 1285,
        y: isCompressed ? 660 : 878,
      },
    },
  };
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
