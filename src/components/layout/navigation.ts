import {
  Building2,
  GitBranch,
  LayoutDashboard,
  Map,
  Server,
  Settings,
  ShieldCheck,
  Users,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { routeRoles, type UserRole } from "@/lib/permissions.ts";
import { preloadRoute } from "@/shared/routing/routeModules.ts";

export type NavigationItem = {
  to: string;
  icon: LucideIcon;
  labelKey: string;
  roles: readonly UserRole[];
};

export const navigationItems: NavigationItem[] = [
  {
    to: "/",
    icon: LayoutDashboard,
    labelKey: "nav.dashboard",
    roles: routeRoles.dashboard,
  },
  {
    to: "/systems",
    icon: Server,
    labelKey: "nav.systems",
    roles: routeRoles.systems,
  },
  {
    to: "/vendors",
    icon: Building2,
    labelKey: "nav.vendors",
    roles: routeRoles.vendors,
  },
  {
    to: "/architecture",
    icon: Map,
    labelKey: "nav.architecture",
    roles: routeRoles.architecture,
  },
  {
    to: "/demands",
    icon: ClipboardList,
    labelKey: "nav.demands",
    roles: routeRoles.demands,
  },
  {
    to: "/integrations",
    icon: GitBranch,
    labelKey: "nav.integrations",
    roles: routeRoles.integrations,
  },
  {
    to: "/roadmap",
    icon: ShieldCheck,
    labelKey: "nav.roadmap",
    roles: routeRoles.roadmap,
  },
  {
    to: "/users",
    icon: Users,
    labelKey: "nav.users",
    roles: routeRoles.users,
  },
  {
    to: "/settings",
    icon: Settings,
    labelKey: "nav.settings",
    roles: routeRoles.settings,
  },
];

export function visibleNavigationForRole(role: UserRole) {
  return navigationItems.filter((item) => item.roles.includes(role));
}

export function partitionMobileNavigation(items: NavigationItem[]) {
  return {
    primaryItems: items.slice(0, 4),
    overflowItems: items.slice(4),
  };
}

export function preloadNavigationItem(item: Pick<NavigationItem, "to">) {
  preloadRoute(item.to);
}
