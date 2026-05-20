/** Coerce select value: int PKs as number, UUID/string PKs as string. */
export function coerceRelationPk(raw: string): number | string | null {
  if (raw === "") return null;
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw;
}

export function hasFileValues(body: Record<string, unknown>): boolean {
  return Object.values(body).some((v) => v instanceof File);
}

export function toFormData(body: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(body)) {
    if (value === null || value === undefined || value === "") continue;
    if (value instanceof File) {
      fd.append(key, value);
    } else {
      fd.append(key, String(value));
    }
  }
  return fd;
}
