import { lazy } from "react";

const routeLoaders = {
  "/": () => import("@/pages/Index.tsx"),
  "/systems": () => import("@/pages/systems/page.tsx"),
  "/vendors": () => import("@/pages/vendors/page.tsx"),
  "/architecture": () => import("@/pages/architecture/page.tsx"),
  "/integrations": () => import("@/pages/integrations/page.tsx"),
  "/roadmap": () => import("@/pages/roadmap/page.tsx"),
  "/users": () => import("@/pages/users/page.tsx"),
  "/settings": () => import("@/pages/settings/page.tsx"),
  "/demands": () => import("@/pages/demands/page.tsx"),
} as const;

export type PreloadableRoute = keyof typeof routeLoaders;

export const routeComponents = {
  dashboard: lazy(routeLoaders["/"]),
  systems: lazy(routeLoaders["/systems"]),
  vendors: lazy(routeLoaders["/vendors"]),
  architecture: lazy(routeLoaders["/architecture"]),
  integrations: lazy(routeLoaders["/integrations"]),
  roadmap: lazy(routeLoaders["/roadmap"]),
  users: lazy(routeLoaders["/users"]),
  settings: lazy(routeLoaders["/settings"]),
  demands: lazy(routeLoaders["/demands"]),
};

export function preloadRoute(path: string) {
  const loader = routeLoaders[path as PreloadableRoute];
  if (loader) void loader();
}
