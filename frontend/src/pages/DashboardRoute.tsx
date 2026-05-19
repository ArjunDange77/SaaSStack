import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { isSchoolBusTenant } from "@/lib/schoolBusTenant";
import { PgDashboard } from "@/pages/PgDashboard";

/** PG command center, or redirect School Bus operators to their briefing dashboard. */
export function DashboardRoute() {
  const { tenantSlug, role } = useAuth();
  if (isSchoolBusTenant(tenantSlug) && (role === "owner" || role === "staff")) {
    return <Navigate to="/sb/dashboard" replace />;
  }
  return <PgDashboard />;
}
