/** Prefix React Query keys with tenant so caches never bleed across properties. */
export function scopeTenant(tenantSlug: string, ...parts: readonly unknown[]): readonly unknown[] {
  return ["tenant", tenantSlug, ...parts] as const;
}
