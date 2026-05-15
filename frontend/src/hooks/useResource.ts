import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiErrorMessage } from "@/api/client";
import { useToast } from "@/components/ui/ToastProvider";
import type { PaginatedResponse, ResourceSchema } from "@/types/metadata";
import { hasFileValues, toFormData } from "@/utils/formValues";
import { actionSuccessMessage } from "@/utils/feedbackMessages";

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
  return useQuery({
    queryKey: ["schema", slug],
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
  return useQuery({
    queryKey: ["resource", slug, "list", search, page, ordering, filters],
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
  return useQuery({
    queryKey: ["resource", relatedSlug, "options"],
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
  return useQuery({
    queryKey: ["resource", slug, "detail", id],
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown>>(`/meta/resources/${slug}/${id}/`);
      return data;
    },
    enabled: Boolean(slug && id),
  });
}

export function useResourceTimeline(slug: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: ["timeline", slug, id],
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
  const { success, error: toastError } = useToast();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["resource", slug] });
    qc.invalidateQueries({ queryKey: ["timeline", slug] });
    qc.invalidateQueries({ queryKey: ["pg", "dashboard"] });
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

export function usePgDashboard() {
  return useQuery({
    queryKey: ["pg", "dashboard"],
    queryFn: async () => {
      const { data } = await api.get<Record<string, number>>("/pg/dashboard/");
      return data;
    },
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
