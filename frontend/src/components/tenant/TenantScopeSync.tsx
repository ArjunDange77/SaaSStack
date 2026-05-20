import { useEffect, useRef } from "react";
import { useAuth } from "@/auth/AuthContext";

/** Refresh user/role when operator switches tenant (X-Tenant header changes). */
export function TenantScopeSync() {
  const { tenantSlug, refreshMe, isAuthenticated } = useAuth();
  const prev = useRef(tenantSlug);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (prev.current !== tenantSlug) {
      prev.current = tenantSlug;
      void refreshMe();
    }
  }, [tenantSlug, isAuthenticated, refreshMe]);

  return null;
}
