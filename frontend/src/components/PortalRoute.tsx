import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth, type AppRole } from "@/auth/AuthContext";

export type PortalRole = AppRole | "driver";

interface Props {
  requiredRole: PortalRole;
  redirectTo?: string;
  children: ReactNode;
}

export function PortalRoute({ requiredRole, redirectTo = "/login", children }: Props) {
  const { isAuthenticated, role, driverId } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }
  if (requiredRole === "driver" && role !== "driver" && !driverId) {
    return (
      <div className="portal-page">
        <p className="error">
          This account does not have driver access. Use a driver account (e.g. suresh) or contact your
          operator.
        </p>
        <p>
          <Link to="/login" state={{ from: location }}>
            Sign in with a different account
          </Link>
        </p>
      </div>
    );
  }
  if (requiredRole === "driver") {
    return <>{children}</>;
  }
  if (role !== requiredRole) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
