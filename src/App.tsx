import { lazy } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import AppLayout from "./components/layout/AppLayout.tsx";
import { RouteBoundary } from "./shared/routing/RouteBoundary.tsx";
import { RequireRole } from "./components/auth/RequireRole.tsx";
import { routeRoles } from "./lib/permissions.ts";
import { routeComponents } from "./shared/routing/routeModules.ts";

const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const {
  dashboard: Index,
  systems: SystemsPage,
  vendors: VendorsPage,
  architecture: ArchitecturePage,
  integrations: IntegrationsPage,
  roadmap: RoadmapPage,
  users: UsersPage,
  settings: SettingsPage,
  demands: DemandsPage,
} = routeComponents;

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <RouteBoundary>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route element={<AppLayout />}>
              <Route
                path="/"
                element={
                  <RequireRole roles={routeRoles.dashboard}>
                    <Index />
                  </RequireRole>
                }
              />
              <Route
                path="/demands"
                element={
                  <RequireRole roles={routeRoles.demands}>
                    <DemandsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/systems"
                element={
                  <RequireRole roles={routeRoles.systems}>
                    <SystemsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/vendors"
                element={
                  <RequireRole roles={routeRoles.vendors}>
                    <VendorsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/architecture"
                element={
                  <RequireRole roles={routeRoles.architecture}>
                    <ArchitecturePage />
                  </RequireRole>
                }
              />
              <Route
                path="/integrations"
                element={
                  <RequireRole roles={routeRoles.integrations}>
                    <IntegrationsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/roadmap"
                element={
                  <RequireRole roles={routeRoles.roadmap}>
                    <RoadmapPage />
                  </RequireRole>
                }
              />
              <Route
                path="/users"
                element={
                  <RequireRole roles={routeRoles.users}>
                    <UsersPage />
                  </RequireRole>
                }
              />
              <Route
                path="/settings"
                element={
                  <RequireRole roles={routeRoles.settings}>
                    <SettingsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/flow-diagram"
                element={<Navigate to="/architecture" replace />}
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RouteBoundary>
      </BrowserRouter>
    </DefaultProviders>
  );
}
