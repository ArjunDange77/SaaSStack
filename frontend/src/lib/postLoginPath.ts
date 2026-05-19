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
  if (driverId && role !== "owner") return "/sb/driver";
  if (isSchoolBusTenant(tenantSlug) && (role === "owner" || role === "staff")) {
    return "/sb/dashboard";
  }
  return "/dashboard";
}
