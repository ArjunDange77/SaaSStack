import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiErrorMessage } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useToast } from "@/components/ui/ToastProvider";
import { scopeTenant } from "@/lib/queryKeys";
import type { PaginatedResponse, ResourceSchema } from "@/types/metadata";
import { hasFileValues, toFormData } from "@/utils/formValues";
import { actionSuccessMessage } from "@/utils/feedbackMessages";

function useTenantSlug(): string {
  return useAuth().tenantSlug;
}

function stripUnchangedFiles(
  body: Record<string, unknown>,
  initial?: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...body };
  for (const [key, value] of Object.entries(out)) {
    if (value === null && initial?.[key] && !(initial[key] instanceof File)) {
      delete out[key];
    }
  }
  return out;
}

async function writeResource(
  method: "post" | "patch",
  slug: string,
  body: Record<string, unknown>,
  id?: string,
  initial?: Record<string, unknown>
) {
  const payload = method === "patch" ? stripUnchangedFiles(body, initial) : body;
  const url = id ? `/meta/resources/${slug}/${id}/` : `/meta/resources/${slug}/`;
  if (hasFileValues(payload)) {
    const fd = toFormData(payload);
    const { data } = await api[method](url, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  }
  const { data } = await api[method](url, payload);
  return data;
}

export function useResourceSchema(slug: string | undefined) {
  const tenant = useTenantSlug();
  return useQuery({
    queryKey: scopeTenant(tenant, "schema", slug),
    queryFn: async () => {
      const { data } = await api.get<ResourceSchema>(`/meta/schema/${slug}/`);
      return data;
    },
    enabled: Boolean(slug),
  });
}

export function useResourceList(
  slug: string | undefined,
  search: string,
  page: number,
  ordering?: string,
  filters: Record<string, string> = {}
) {
  const tenant = useTenantSlug();
  return useQuery({
    queryKey: scopeTenant(tenant, "resource", slug, "list", search, page, ordering, filters),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Record<string, unknown>> | Record<string, unknown>[]>(
        `/meta/resources/${slug}/`,
        {
          params: {
            ...(search ? { search } : {}),
            page,
            ...(ordering ? { ordering } : {}),
            ...filters,
          },
        }
      );
      if (Array.isArray(data)) {
        return { results: data, count: data.length, next: null, previous: null };
      }
      return {
        results: data.results ?? [],
        count: data.count ?? data.results?.length ?? 0,
        next: data.next,
        previous: data.previous,
      };
    },
    enabled: Boolean(slug),
  });
}

export function useRelatedResourceOptions(relatedSlug: string | null | undefined) {
  const tenant = useTenantSlug();
  return useQuery({
    queryKey: scopeTenant(tenant, "resource", relatedSlug, "options"),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Record<string, unknown>> | Record<string, unknown>[]>(
        `/meta/resources/${relatedSlug}/`,
        { params: { page_size: 200 } }
      );
      const rows = Array.isArray(data) ? data : data.results ?? [];
      return rows;
    },
    enabled: Boolean(relatedSlug),
  });
}

export function useResourceDetail(slug: string | undefined, id: string | undefined) {
  const tenant = useTenantSlug();
  return useQuery({
    queryKey: scopeTenant(tenant, "resource", slug, "detail", id),
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown>>(`/meta/resources/${slug}/${id}/`);
      return data;
    },
    enabled: Boolean(slug && id),
  });
}

export function useResourceTimeline(slug: string | undefined, id: string | undefined) {
  const tenant = useTenantSlug();
  return useQuery({
    queryKey: scopeTenant(tenant, "timeline", slug, id),
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown>[]>(
        `/meta/resources/${slug}/${id}/timeline/`
      );
      return data;
    },
    enabled: Boolean(slug && id),
  });
}

export function useResourceMutations(slug: string, schema?: ResourceSchema) {
  const qc = useQueryClient();
  const tenant = useTenantSlug();
  const { success, error: toastError } = useToast();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: scopeTenant(tenant, "resource", slug) });
    qc.invalidateQueries({ queryKey: scopeTenant(tenant, "timeline", slug) });
    qc.invalidateQueries({ queryKey: scopeTenant(tenant, "pg", "dashboard") });
    if (slug === "sb-trips") {
      qc.invalidateQueries({ queryKey: scopeTenant(tenant, ["sb-operator-trips-today"]) });
      qc.invalidateQueries({ queryKey: scopeTenant(tenant, ["sb-operator-trips-date"]) });
      qc.invalidateQueries({ queryKey: scopeTenant(tenant, ["sb-operator-dashboard"]) });
      qc.invalidateQueries({ queryKey: scopeTenant(tenant, ["sb-driver-today"]) });
    }
  };

  const create = useMutation({
    mutationFn: async (body: Record<string, unknown>) => writeResource("post", slug, body),
    onSuccess: () => {
      invalidate();
      if (schema) {
        const singular = schema.title.replace(/s$/, "");
        success(`${singular} created`);
      } else {
        success("Record created");
      }
    },
    onError: (err) => toastError(apiErrorMessage(err, "Could not create record.")),
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      body,
      initial,
    }: {
      id: string;
      body: Record<string, unknown>;
      initial?: Record<string, unknown>;
    }) => writeResource("patch", slug, body, id, initial),
    onSuccess: () => {
      invalidate();
      if (schema) {
        const singular = schema.title.replace(/s$/, "");
        success(`${singular} saved`);
      } else {
        success("Record saved");
      }
    },
    onError: (err) => toastError(apiErrorMessage(err, "Could not save record.")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/meta/resources/${slug}/${id}/`);
    },
    onSuccess: () => {
      invalidate();
      if (schema) {
        const singular = schema.title.replace(/s$/, "");
        success(`${singular} deleted`);
      } else {
        success("Record deleted");
      }
    },
    onError: (err) => toastError(apiErrorMessage(err, "Could not delete record.")),
  });

  const runAction = useMutation({
    mutationFn: async ({
      id,
      actionPath,
      method = "post",
      body = {},
      actionName,
    }: {
      id?: string;
      actionPath: string;
      method?: string;
      body?: Record<string, unknown>;
      actionName?: string;
    }) => {
      const base = `/meta/resources/${slug}/`;
      const url = id ? `${base}${id}/${actionPath}/` : `${base}${actionPath}/`;
      const m = method.toLowerCase();
      if (m === "get") {
        const { data } = await api.get(url);
        return { data, actionName };
      }
      const { data } = await api.post(url, body);
      return { data, actionName };
    },
    onSuccess: (_data, variables) => {
      invalidate();
      const action = schema?.actions.find(
        (a) => a.url_path === variables.actionPath || a.name === variables.actionName
      );
      if (action) {
        success(actionSuccessMessage(action));
      } else {
        success("Action completed");
      }
    },
    onError: (err) => toastError(apiErrorMessage(err, "Action failed.")),
  });

  return { create, update, remove, runAction };
}

export interface TrendMeta {
  direction: "up" | "down" | "flat";
  delta: number;
  period: string;
}

export interface PgDashboardStats {
  active_residents: number;
  total_rooms: number;
  occupied_rooms: number;
  rooms_available: number;
  rooms_maintenance: number;
  rooms_full: number;
  occupancy_rate: number;
  open_complaints: number;
  rent_due_unpaid: number;
  rent_overdue: number;
  pending_bookings: number;
  as_of?: string;
  trends?: Record<string, TrendMeta>;
}

export function usePgDashboard(enabled = true) {
  const tenant = useTenantSlug();
  return useQuery({
    queryKey: scopeTenant(tenant, "pg", "dashboard"),
    queryFn: async () => {
      const { data } = await api.get<PgDashboardStats>("/pg/dashboard/");
      return data;
    },
    enabled,
  });
}

export function useMyTenants(enabled: boolean) {
  return useQuery({
    queryKey: ["tenancy", "my-tenants"],
    queryFn: async () => {
      const { data } = await api.get<{ slug: string; name: string; role: string }[]>(
        "/tenancy/my-tenants/"
      );
      return data;
    },
    enabled,
  });
}
