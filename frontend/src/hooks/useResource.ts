import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { ResourceSchema } from "@/types/metadata";

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

export function useResourceList(slug: string | undefined, search: string) {
  return useQuery({
    queryKey: ["resource", slug, "list", search],
    queryFn: async () => {
      const { data } = await api.get(`/meta/resources/${slug}/`, {
        params: search ? { search } : {},
      });
      return (data.results ?? data) as Record<string, unknown>[];
    },
    enabled: Boolean(slug),
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

export function useResourceMutations(slug: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["resource", slug] });
  };

  const create = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data } = await api.post(`/meta/resources/${slug}/`, body);
      return data;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      const { data } = await api.patch(`/meta/resources/${slug}/${id}/`, body);
      return data;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/meta/resources/${slug}/${id}/`);
    },
    onSuccess: invalidate,
  });

  const runAction = useMutation({
    mutationFn: async ({
      id,
      actionPath,
      method = "post",
    }: {
      id?: string;
      actionPath: string;
      method?: string;
    }) => {
      const base = `/meta/resources/${slug}/`;
      const url = id ? `${base}${id}/${actionPath}/` : `${base}${actionPath}/`;
      const m = method.toLowerCase();
      if (m === "get") {
        const { data } = await api.get(url);
        return data;
      }
      const { data } = await api.post(url, {});
      return data;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove, runAction };
}
