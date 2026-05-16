import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { scopeTenant } from "@/lib/queryKeys";
import type { FieldMeta, PaginatedResponse, ResourceSchema } from "@/types/metadata";

export type RelationLabelMap = Record<string, Record<string, string>>;

async function fetchRelatedRows(slug: string): Promise<Record<string, unknown>[]> {
  const { data } = await api.get<PaginatedResponse<Record<string, unknown>> | Record<string, unknown>[]>(
    `/meta/resources/${slug}/`,
    { params: { page_size: 200 } }
  );
  return Array.isArray(data) ? data : data.results ?? [];
}

/** Build fieldName -> { id -> displayLabel } for all relation fields on a schema. */
export function useRelationLabelMaps(schema: ResourceSchema | undefined): RelationLabelMap {
  const { tenantSlug } = useAuth();
  const relationFields = useMemo(
    () => (schema?.fields ?? []).filter((f) => f.type === "relation" && f.related_resource),
    [schema]
  );

  const queries = useQueries({
    queries: relationFields.map((field) => ({
      queryKey: scopeTenant(tenantSlug, "resource", field.related_resource, "label-map"),
      queryFn: () => fetchRelatedRows(field.related_resource!),
      enabled: Boolean(field.related_resource),
      staleTime: 60_000,
    })),
  });

  return useMemo(() => {
    const maps: RelationLabelMap = {};
    relationFields.forEach((field, i) => {
      const rows = queries[i]?.data ?? [];
      const displayField = field.relation_display_field ?? "id";
      const byId: Record<string, string> = {};
      for (const row of rows) {
        const id = String(row.id);
        byId[id] = String(row[displayField] ?? id);
      }
      maps[field.name] = byId;
    });
    return maps;
  }, [relationFields, queries, tenantSlug]);
}

export function resolveRelationLabel(
  field: FieldMeta | undefined,
  value: unknown,
  labelMaps: RelationLabelMap
): string {
  if (value === null || value === undefined || value === "") return "";
  if (!field || field.type !== "relation") return String(value);
  const id = String(value);
  return labelMaps[field.name]?.[id] ?? id;
}
