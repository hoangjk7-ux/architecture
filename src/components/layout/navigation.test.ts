import { describe, expect, it, vi } from "vitest";
import {
  partitionMobileNavigation,
  preloadNavigationItem,
  visibleNavigationForRole,
} from "./navigation.ts";

vi.mock("@/shared/routing/routeModules.ts", () => ({
  preloadRoute: vi.fn(),
}));

describe("layout navigation", () => {
  it("keeps every authorized CTO route reachable on mobile", () => {
    const visible = visibleNavigationForRole("cto");
    const { primaryItems, overflowItems } = partitionMobileNavigation(visible);

    expect([...primaryItems, ...overflowItems]).toEqual(visible);
    expect(primaryItems).toHaveLength(4);
    expect(overflowItems.map((item) => item.to)).toEqual([
      "/demands",
      "/integrations",
      "/roadmap",
      "/users",
      "/settings",
    ]);
  });

  it("does not expose restricted routes to a business owner", () => {
    const visible = visibleNavigationForRole("business_owner");
    const { primaryItems, overflowItems } = partitionMobileNavigation(visible);

    expect([...primaryItems, ...overflowItems].map((item) => item.to)).toEqual([
      "/",
      "/systems",
      "/vendors",
      "/architecture",
      "/demands",
      "/roadmap",
    ]);
    expect(overflowItems.map((item) => item.to)).toEqual([
      "/demands",
      "/roadmap",
    ]);
  });

  it("does not mutate the authorized navigation list", () => {
    const visible = visibleNavigationForRole("viewer");
    const before = visible.map((item) => item.to);

    partitionMobileNavigation(visible);

    expect(visible.map((item) => item.to)).toEqual(before);
  });

  it("preloads the route represented by a navigation item", async () => {
    const { preloadRoute } = await import("@/shared/routing/routeModules.ts");

    preloadNavigationItem({ to: "/architecture" });

    expect(preloadRoute).toHaveBeenCalledWith("/architecture");
  });
});
