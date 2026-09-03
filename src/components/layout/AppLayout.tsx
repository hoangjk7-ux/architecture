import { Outlet, NavLink } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";
import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
} from "lucide-react";
import { LanguageToggle } from "@/components/ui/language-toggle.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";

import { useState } from "react";
import { useLanguage } from "@/components/providers/language.tsx";
import { formatRole } from "@/lib/roles.ts";
import { MobileNavigation } from "./MobileNavigation.tsx";
import { visibleNavigationForRole } from "./navigation.ts";
import { preloadNavigationItem } from "./navigation.ts";
import { RouteBoundary } from "@/shared/routing/RouteBoundary.tsx";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";

function NotificationCenter() {
  const notifications = useQuery(api.notifications.listMine);
  const markRead = useMutation(api.notifications.markRead);
  const unread = notifications?.filter((item) => !item.readAt).length ?? 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Thông báo${unread ? ` (${unread} chưa đọc)` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3 text-sm font-semibold">
          Thông báo
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications === undefined ? (
            <div className="p-4 text-sm text-muted-foreground">Đang tải…</div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Chưa có thông báo
            </div>
          ) : (
            notifications.map((item) => (
              <button
                key={item._id}
                type="button"
                className={cn(
                  "w-full border-b px-4 py-3 text-left hover:bg-muted/50",
                  !item.readAt && "bg-primary/5",
                )}
                onClick={() => void markRead({ notificationId: item._id })}
              >
                <div className="text-sm font-medium">{item.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {item.message}
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AppLayoutInner() {
  const { user } = useCurrentUser();
  const { signOut } = useAuthActions();
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);

  const visibleNav = user?.role ? visibleNavigationForRole(user.role) : [];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-sidebar transition-all duration-300",
          collapsed ? "md:w-16" : "md:w-60",
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center gap-3 p-4 border-b border-sidebar-border",
            collapsed && "justify-center",
          )}
        >
          {!collapsed && (
            <div>
              <div className="text-sm font-bold text-sidebar-foreground leading-tight">
                TechGov
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight">
                CTO Platform
              </div>
            </div>
          )}
          {collapsed && <LayoutDashboard className="h-5 w-5 text-primary" />}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {visibleNav.map((item) => {
            const label = t(item.labelKey);
            const link = (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                aria-label={label}
                onMouseEnter={() => preloadNavigationItem(item)}
                onFocus={() => preloadNavigationItem(item)}
                className={({ isActive }) =>
                  cn(
                    "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    collapsed && "justify-center px-2",
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            );

            return collapsed ? (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {label}
                </TooltipContent>
              </Tooltip>
            ) : (
              link
            );
          })}
        </nav>

        {/* User + Collapse */}
        <div className="p-2 border-t border-sidebar-border space-y-1">
          <div
            className={cn(
              "flex items-center",
              collapsed ? "justify-center" : "justify-start px-1",
            )}
          >
            <NotificationCenter />
            {collapsed ? <LanguageToggle iconOnly /> : <LanguageToggle />}
          </div>
          {user && (
            <div
              className={cn(
                "rounded-lg border border-border/60 bg-muted/20 p-2.5",
                collapsed ? "flex justify-center" : "flex items-center gap-2.5",
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold uppercase text-primary">
                {(user.name ?? user.email ?? "U").charAt(0)}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-sidebar-foreground">
                    {user.name ?? user.email}
                  </div>
                  <div className="mt-0.5 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {formatRole(user.role)}
                  </div>
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            aria-label={t("auth.signOut")}
            onClick={() => void signOut()}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="text-xs">{t("auth.signOut")}</span>}
          </button>
          <button
            type="button"
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto flex flex-col">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar">
          <span className="font-bold text-sm">TechGov</span>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <LanguageToggle />
          </div>
        </div>

        <div className="flex-1 overflow-auto pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          <RouteBoundary>
            <Outlet />
          </RouteBoundary>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNavigation items={visibleNav} translate={t} />
    </div>
  );
}

export default function AppLayout() {
  const { isAuthenticated, isLoading, user } = useCurrentUser();
  const { signOut } = useAuthActions();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background flex items-center justify-center p-4">
        <div className="pointer-events-none absolute -top-32 -left-32 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <LayoutDashboard className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-foreground">
                {t("app.title")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("app.subtitle")}
              </p>
            </div>
          </div>
          <SignInButton />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-center">
        <div>
          <h1 className="text-xl font-semibold">Access is not provisioned</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Contact a CTO to assign your account a role.
          </p>
          <button
            className="mt-4 text-sm text-primary underline"
            onClick={() => void signOut()}
          >
            {t("auth.signOut")}
          </button>
        </div>
      </div>
    );
  }

  return <AppLayoutInner />;
}
