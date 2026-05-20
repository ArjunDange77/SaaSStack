/** Tenants that use School Bus operator/driver/parent portals (not PG command center). */
export function isSchoolBusTenant(tenantSlug: string): boolean {
  return (
    tenantSlug === "sb-demo" ||
    tenantSlug === "sai-baba-school-bus" ||
    tenantSlug === "goa-bus" ||
    tenantSlug.startsWith("sb-")
  );
}
