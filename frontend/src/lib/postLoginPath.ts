import type { AppRole } from "@/auth/AuthContext";
import { isSchoolBusTenant } from "@/lib/schoolBusTenant";

/** Where to send the user after sign-in for the current tenant + role. */
export function postLoginPath(
  role: AppRole,
  tenantSlug: string,
  driverId: number | null,
  parentId: number | null
): string {
  if (role === "resident") return "/resident";
  if (role === "parent" || parentId) return "/sb/parent";
  if (role === "driver" || (driverId != null && role !== "owner")) {
    return "/sb/driver";
  }
  if (role === "owner") {
    return isSchoolBusTenant(tenantSlug) ? "/sb/dashboard" : "/dashboard";
  }
  if (isSchoolBusTenant(tenantSlug) && role === "staff") {
    return "/sb/dashboard";
  }
  return "/dashboard";
}
