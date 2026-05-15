import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

type AppRole = "owner" | "staff" | "resident";

interface Props {
  allow: AppRole[];
  children: ReactNode;
  fallback?: string;
}

export function RequireRole({ allow, children, fallback = "/" }: Props) {
  const { role, isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!role || !allow.includes(role as AppRole)) {
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
}
