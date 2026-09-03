import { describe, expect, it } from "vitest";
import {
  architectureNodeDensity,
  architectureRingForSystem,
  buildArchitectureModel,
  classifyEcosystemGroup,
  normalizeArchitectureText,
  placeSystemsOnEllipseLayers,
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

describe("architecture orbit layout", () => {
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
});
