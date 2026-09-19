import {
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { projectCostRoles } from "@/lib/permissions.ts";

function useCurrentUserValue() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  const user = currentUser ?? null;

  return {
    user,
    isAuthenticated,
    isLoading: isAuthLoading || (isAuthenticated && currentUser === undefined),
    isCTO: user?.role === "cto",
    isITManager: user?.role === "it_manager",
    isBusinessOwner: user?.role === "business_owner",
    isViewer: user?.role === "viewer",
    canWrite: user?.role === "cto" || user?.role === "it_manager",
    canViewProjectCosts: user?.role
      ? projectCostRoles.includes(user.role)
      : false,
  };
}

type CurrentUserValue = ReturnType<typeof useCurrentUserValue>;

const CurrentUserContext = createContext<CurrentUserValue | null>(null);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const value = useCurrentUserValue();
  return createElement(CurrentUserContext.Provider, { value }, children);
}

export function useCurrentUser() {
  const value = useContext(CurrentUserContext);
  if (!value) {
    throw new Error("useCurrentUser must be used within CurrentUserProvider");
  }
  return value;
}
