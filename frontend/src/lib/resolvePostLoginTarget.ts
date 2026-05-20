import type { AppRole } from "@/auth/AuthContext";
import { postLoginPath } from "@/lib/postLoginPath";

export interface MeProfile {
  role: AppRole;
  driver_id?: number | null;
  parent_id?: number | null;
}

export function meProfileFromRecord(me: Record<string, unknown>): MeProfile {
  return {
    role: (me.role as AppRole) ?? null,
    driver_id: typeof me.driver_id === "number" ? me.driver_id : null,
    parent_id: typeof me.parent_id === "number" ? me.parent_id : null,
  };
}

/** Whether the signed-in user may open this path after login. */
export function canAccessPath(pathname: string, me: MeProfile): boolean {
  if (pathname === "/login") return false;
  if (pathname.startsWith("/sb/driver")) {
    return me.role === "driver" || typeof me.driver_id === "number";
  }
  if (me.role === "driver") {
    return false;
  }
  if (pathname.startsWith("/sb/parent")) {
    return me.role === "parent" || typeof me.parent_id === "number";
  }
  if (pathname.startsWith("/resident")) {
    return me.role === "resident";
  }
  if (
    pathname.startsWith("/sb/") ||
    pathname.startsWith("/r/") ||
    pathname === "/" ||
    pathname === "/dashboard"
  ) {
    return me.role === "owner" || me.role === "staff";
  }
  return true;
}

export function resolvePostLoginTarget(
  me: MeProfile,
  tenantSlug: string,
  from?: { pathname: string; search?: string; hash?: string }
): string {
  const driverId = typeof me.driver_id === "number" ? me.driver_id : null;
  const parentId = typeof me.parent_id === "number" ? me.parent_id : null;
  const defaultPath = postLoginPath(me.role, tenantSlug, driverId, parentId);

  if (!from?.pathname) return defaultPath;

  const full = `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`;
  return canAccessPath(from.pathname, me) ? full : defaultPath;
}
