import { describe, expect, it } from "vitest";
import {
  architectureNodeDensity,
  architectureEdgePresentation,
  architectureRingForSystem,
  buildArchitectureModel,
  classifyEcosystemGroup,
  createConcentricTopologyGeometry,
  integrationProtocolColor,
  normalizeArchitectureText,
  placeCoreSystemsZigZag,
  placeSystemsOnEllipseLayers,
  referenceOrbitSlotForSystem,
  systemZoneFor,
  toggleHiddenZone,
  type ArchitectureIntegration,
  type ArchitectureSystem,
  type SystemZoneKey,
} from "./architecture-layout.ts";

type TestSystem = ArchitectureSystem;
type TestIntegration = ArchitectureIntegration;

function system(id: string, overrides: Partial<TestSystem> = {}): TestSystem {
  return {
    _id: id,
    name: id,
    type: "supporting",
    category: "ERP",
    status: "active",
    criticality: "medium",
    departments: [],
    campuses: [],
    riskLevel: "low",
    technicalDebtScore: 20,
    architectureScore: 70,
    ...overrides,
  } as unknown as TestSystem;
}

describe("architecture ecosystem classification", () => {
  it("classifies the six business zones deterministically", () => {
    expect(classifyEcosystemGroup(system("erp"))).toBe("workspace");
    expect(
      classifyEcosystemGroup(system("sis", { category: "Student SIS" })),
    ).toBe("learning");
    expect(
      classifyEcosystemGroup(system("api", { category: "API Gateway" })),
    ).toBe("automation");
    expect(
      classifyEcosystemGroup(system("data", { category: "Data Warehouse" })),
    ).toBe("platform");
    expect(classifyEcosystemGroup(system("poc", { type: "pilot" }))).toBe(
      "pilot",
    );
    expect(classifyEcosystemGroup(system("old", { type: "legacy" }))).toBe(
      "legacy",
    );
  });

  it("normalizes Vietnamese labels before applying classification rules", () => {
    expect(normalizeArchitectureText("Dữ liệu & Hạ tầng")).toBe(
      "du lieu   ha tang",
    );
    expect(
      classifyEcosystemGroup(
        system("vi-data", { category: "Dữ liệu và hạ tầng" }),
      ),
    ).toBe("platform");
    expect(
      classifyEcosystemGroup(
        system("vi-learning", { category: "Học thuật và tuyển sinh" }),
      ),
    ).toBe("learning");
  });

  it("maps reference systems to stable semantic orbit slots", () => {
    expect(referenceOrbitSlotForSystem(system("x", { name: "Kế toán" }))).toBe(
      "accounting",
    );
    expect(referenceOrbitSlotForSystem(system("x", { name: "Biểu phí" }))).toBe(
      "fee",
    );
    expect(
      referenceOrbitSlotForSystem(system("x", { category: "Student SIS" })),
    ).toBe("sis");
    expect(
      referenceOrbitSlotForSystem(system("x", { name: "Khác" })),
    ).toBeNull();
  });

  it("uses business rules instead of array position to choose a ring", () => {
    expect(architectureRingForSystem(system("erp"))).toBe("operational");
    expect(
      architectureRingForSystem(system("lms", { category: "Learning LMS" })),
    ).toBe("operational");
    expect(
      architectureRingForSystem(system("data", { category: "Data Lake" })),
    ).toBe("outer");
    expect(
      architectureRingForSystem(system("sunset", { status: "sunset" })),
    ).toBe("outer");
    expect(
      architectureRingForSystem(system("debt", { technicalDebtScore: 80 })),
    ).toBe("outer");
  });

  it("keeps focus, visibility and semantic density state deterministic", () => {
    const erp = system("erp");
    expect(systemZoneFor(erp, new Set(["erp"]))).toBe("core");
    expect(systemZoneFor(erp, new Set())).toBe("workspace");

    const initial = new Set<SystemZoneKey>(["legacy"]);
    const shown = toggleHiddenZone(initial, "legacy");
    expect(shown.has("legacy")).toBe(false);
    expect(initial.has("legacy")).toBe(true);
    expect(toggleHiddenZone(shown, "legacy").has("legacy")).toBe(true);

    expect(architectureNodeDensity(0.4, true)).toBe("mini");
    expect(architectureNodeDensity(0.4, false)).toBe("compact");
    expect(architectureNodeDensity(1, true)).toBe("detailed");
  });
});

describe("architecture edge presentation", () => {
  const distantEdge = {
    isDistantZoom: true,
    isHidden: false,
    isSelected: false,
    isEndpointFocused: false,
    hasActiveFocus: false,
    matchesActiveFocus: true,
    isHighCritical: false,
    hasHealthIssue: false,
    isRiskEdge: false,
    isRealtime: true,
    baseOpacity: 0.9,
  };

  it("dims distant ordinary edges without hiding or animating them", () => {
    expect(architectureEdgePresentation(distantEdge)).toEqual({
      opacity: 0.06,
      animated: false,
      label: "none",
    });
  });

  it("keeps a selected integration fully readable at distant zoom", () => {
    expect(
      architectureEdgePresentation({ ...distantEdge, isSelected: true }),
    ).toEqual({ opacity: 1, animated: true, label: "detail" });
  });

  it("prioritizes endpoint and active criteria focus at distant zoom", () => {
    expect(
      architectureEdgePresentation({
        ...distantEdge,
        isEndpointFocused: true,
        baseOpacity: 0.1,
      }),
    ).toEqual({ opacity: 0.9, animated: false, label: "detail" });
    expect(
      architectureEdgePresentation({
        ...distantEdge,
        hasActiveFocus: true,
        baseOpacity: 0.1,
      }),
    ).toEqual({ opacity: 0.78, animated: true, label: "summary" });
  });

  it("surfaces attention edges but suppresses animation and overview labels", () => {
    for (const signal of [
      { isHighCritical: true },
      { hasHealthIssue: true },
      { isRiskEdge: true },
    ]) {
      expect(
        architectureEdgePresentation({
          ...distantEdge,
          ...signal,
          baseOpacity: 0.14,
        }),
      ).toEqual({ opacity: 0.48, animated: false, label: "none" });
    }
  });

  it("preserves normal zoom presentation and disables hidden edges", () => {
    expect(
      architectureEdgePresentation({
        ...distantEdge,
        isDistantZoom: false,
        hasActiveFocus: true,
        baseOpacity: 0.22,
      }),
    ).toEqual({ opacity: 0.22, animated: true, label: "summary" });
    expect(
      architectureEdgePresentation({ ...distantEdge, isHidden: true }),
    ).toEqual({ opacity: 0.9, animated: false, label: "none" });
  });
});

describe("integration protocol colors", () => {
  it("keeps transport protocols visually distinct", () => {
    expect(integrationProtocolColor("REST")).toBe("#38bdf8");
    expect(integrationProtocolColor("Webhook")).toBe("#f472b6");
    expect(integrationProtocolColor("Kafka")).toBe("#f59e0b");
    expect(integrationProtocolColor("Direct DB")).toBe("#22c55e");
    expect(integrationProtocolColor("unknown")).toBe("#94a3b8");
  });
});

describe("architecture orbit layout", () => {
  it.each([false, true])(
    "places systems directly on the middle and outer paths in compressed=%s geometry",
    (isCompressed) => {
      const geometry = createConcentricTopologyGeometry(isCompressed);
      const [inner, middle, outer] = geometry.orbitRadii;

      expect(inner).toBeGreaterThan(geometry.coreRadius);
      expect(geometry.systemRadii.operational).toBe(middle);
      expect(geometry.systemRadii.outer).toBe(outer);
      expect(
        geometry.systemRadii.outer - geometry.systemRadii.operational,
      ).toBe(geometry.systemRadii.operational - geometry.coreRadius);
    },
  );

  it("matches the 1449 × 1086 reference composition", () => {
    const geometry = createConcentricTopologyGeometry(false);
    expect(geometry.canvas).toEqual({ width: 1449, height: 1086 });
    expect(geometry.center).toEqual({ x: 724.5, y: 490 });
    expect(geometry.orbitRadii).toEqual([285, 350, 480]);
    expect(geometry.coreRadius).toBe(220);
    expect(
      Object.values(geometry.clusterAnchors).every(
        ({ x, y }) =>
          x >= 0 &&
          x <= geometry.canvas.width &&
          y >= 0 &&
          y <= geometry.canvas.height,
      ),
    ).toBe(true);
  });

  it.each([false, true])(
    "expands dense layers inside the orbit bounds in compressed=%s geometry",
    (isCompressed) => {
      const extraLayerCount = 2;
      const layerGap = isCompressed ? 115 : 130;
      const geometry = createConcentricTopologyGeometry(
        isCompressed,
        extraLayerCount,
      );
      const [, , outer] = geometry.orbitRadii;
      const operationalEdge =
        geometry.systemRadii.operational + extraLayerCount * layerGap;
      const outerEdge = geometry.systemRadii.outer + extraLayerCount * layerGap;

      expect(operationalEdge).toBeLessThanOrEqual(outer);
      expect(outerEdge).toBeLessThanOrEqual(outer);

      const anchors = Object.values(geometry.clusterAnchors);
      expect(anchors).toHaveLength(6);
      expect(new Set(anchors.map(({ anchor }) => anchor)).size).toBe(6);
      expect(new Set(anchors.map(({ x, y }) => `${x},${y}`)).size).toBe(6);
      expect(
        anchors.every(
          ({ x, y }) =>
            x >= 0 &&
            x <= geometry.canvas.width &&
            y >= 0 &&
            y <= geometry.canvas.height,
        ),
      ).toBe(true);
    },
  );
  it("staggers core cards left and right without overlapping", () => {
    const positions = placeCoreSystemsZigZag(
      [{ _id: "hub-1" }, { _id: "hub-2" }, { _id: "hub-3" }],
      {
        centerX: 650,
        centerY: 430,
        nodeWidth: 260,
        nodeHeight: 84,
        horizontalOffset: 42,
        verticalGap: 104,
      },
    );

    expect(positions["hub-1"].x).toBeLessThan(650 - 260 / 2);
    expect(positions["hub-2"].x).toBeGreaterThan(650 - 260 / 2);
    expect(positions["hub-3"].x).toBe(positions["hub-1"].x);
    const cards = Object.values(positions);
    for (let index = 0; index < cards.length; index += 1) {
      for (
        let otherIndex = index + 1;
        otherIndex < cards.length;
        otherIndex += 1
      ) {
        const a = cards[index];
        const b = cards[otherIndex];
        const overlapsX = a.x < b.x + 260 && a.x + 260 > b.x;
        const overlapsY = a.y < b.y + 84 && a.y + 84 > b.y;
        expect(overlapsX && overlapsY).toBe(false);
      }
    }
  });

  it("creates three hubs, business callouts and complete ring metadata", () => {
    const systems = Array.from({ length: 18 }, (_, index) =>
      system(`system-${index}`, {
        type: index < 3 ? "core" : index % 4 === 0 ? "legacy" : "supporting",
        category: index % 5 === 0 ? "Data Platform" : "ERP",
        criticality: index < 3 ? "high" : "medium",
        architectureScore: 90 - index,
      }),
    );
    const integrations: TestIntegration[] = [];
    const layout = buildArchitectureModel(systems, integrations);

    expect(layout.centralIds.size).toBe(3);
    expect(Object.keys(layout.ringBySystem)).toHaveLength(systems.length);
    expect(
      Object.values(layout.ringBySystem).filter((ring) => ring === "core"),
    ).toHaveLength(3);
    expect(Object.values(layout.ringBySystem)).toContain("operational");
    expect(Object.values(layout.ringBySystem)).toContain("outer");
  });

  it("returns an empty, stable model without systems", () => {
    expect(buildArchitectureModel([], [])).toMatchObject({
      sorted: [],
      satellites: [],
      operational: [],
      outer: [],
      ringBySystem: {},
    });
  });

  it("splits dense datasets into staggered ellipse layers", () => {
    const systems = Array.from({ length: 25 }, (_, index) => ({
      _id: `system-${index}`,
    }));
    const result = placeSystemsOnEllipseLayers(systems, {
      centerX: 500,
      centerY: 350,
      radiusX: 280,
      radiusY: 200,
      nodeWidth: 112,
      nodeHeight: 50,
      capacity: 10,
      layerGapX: 115,
      layerGapY: 85,
    });

    expect(result.layers).toBe(3);
    expect(Object.keys(result.positions)).toHaveLength(25);
    expect(
      new Set(Object.values(result.positions).map((p) => `${p.x},${p.y}`)).size,
    ).toBe(25);
    expect(
      Object.values(result.positions).every(
        (position) =>
          Number.isFinite(position.x) && Number.isFinite(position.y),
      ),
    ).toBe(true);
    const positions = Object.values(result.positions);
    const minimumDistance = Math.min(
      ...positions.flatMap((position, index) =>
        positions
          .slice(index + 1)
          .map((other) =>
            Math.hypot(position.x - other.x, position.y - other.y),
          ),
      ),
    );
    expect(minimumDistance).toBeGreaterThan(70);
  });

  it("redistributes satellites evenly when a new card is inserted", () => {
    const options = {
      centerX: 500,
      centerY: 400,
      radiusX: 300,
      radiusY: 300,
      nodeWidth: 100,
      nodeHeight: 60,
      capacity: 8,
      layerGapX: 100,
      layerGapY: 100,
    };
    const systems = Array.from({ length: 7 }, (_, index) => ({
      _id: `system-${index}`,
    }));
    const before = placeSystemsOnEllipseLayers(systems, options).positions;
    const after = placeSystemsOnEllipseLayers(
      [...systems, { _id: "system-7" }],
      options,
    ).positions;
    const angles = Object.values(after)
      .map((position) =>
        Math.atan2(
          position.y + options.nodeHeight / 2 - options.centerY,
          position.x + options.nodeWidth / 2 - options.centerX,
        ),
      )
      .sort((a, b) => a - b);
    const gaps = angles.map((angle, index) => {
      const next = angles[(index + 1) % angles.length];
      return (next - angle + Math.PI * 2) % (Math.PI * 2);
    });

    expect(before["system-1"]).not.toEqual(after["system-1"]);
    gaps.forEach((gap) => expect(gap).toBeCloseTo(Math.PI / 4, 10));
  });

  it("offsets adjacent rings without changing their even spacing", () => {
    const result = placeSystemsOnEllipseLayers(
      Array.from({ length: 4 }, (_, index) => ({ _id: `outer-${index}` })),
      {
        centerX: 500,
        centerY: 400,
        radiusX: 300,
        radiusY: 300,
        nodeWidth: 100,
        nodeHeight: 60,
        capacity: 4,
        layerGapX: 100,
        layerGapY: 100,
        angleOffset: Math.PI / 4,
      },
    );

    expect(result.positions["outer-0"].x).toBeGreaterThan(500 - 50);
    expect(result.positions["outer-0"].y).toBeLessThan(400 - 30);
  });

  it("pushes an outer card radially until its rectangle clears an inner card", () => {
    const blocker = { x: 450, y: 70 };
    const result = placeSystemsOnEllipseLayers([{ _id: "pilot" }], {
      centerX: 500,
      centerY: 400,
      radiusX: 300,
      radiusY: 300,
      nodeWidth: 100,
      nodeHeight: 60,
      capacity: 4,
      layerGapX: 100,
      layerGapY: 100,
      collisionGap: 10,
      avoidPositions: [blocker],
      radialCollisionStep: 30,
    });

    expect(result.positions.pilot.y + 60 + 10).toBeLessThanOrEqual(blocker.y);
  });

  it("stagger-resolves rectangular card collisions on a full orbit", () => {
    const systems = Array.from({ length: 8 }, (_, index) => ({
      _id: `card-${index}`,
    }));
    const result = placeSystemsOnEllipseLayers(systems, {
      centerX: 650,
      centerY: 430,
      radiusX: 370,
      radiusY: 280,
      nodeWidth: 170,
      nodeHeight: 84,
      capacity: 8,
      layerGapX: 130,
      layerGapY: 95,
      horizontalStagger: 36,
      collisionGap: 18,
    });
    const cards = Object.values(result.positions);

    for (let index = 0; index < cards.length; index += 1) {
      for (
        let otherIndex = index + 1;
        otherIndex < cards.length;
        otherIndex += 1
      ) {
        const a = cards[index];
        const b = cards[otherIndex];
        const overlapsX = a.x < b.x + 188 && a.x + 188 > b.x;
        const overlapsY = a.y < b.y + 102 && a.y + 102 > b.y;
        expect(overlapsX && overlapsY).toBe(false);
      }
    }
  });
});
