import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { DynamicActionRenderer } from "../DynamicActionRenderer";
import { ResourceList } from "../ResourceList";
import type { ResourceSchema } from "@/types/metadata";

vi.mock("@/hooks/useResource", () => ({
  useResourceList: () => ({
    data: { results: [], count: 0 },
    isLoading: false,
    isFetching: false,
  }),
  useResourceMutations: () => ({
    create: { mutateAsync: vi.fn(), isPending: false },
    runAction: { mutateAsync: vi.fn(), isPending: false },
  }),
}));

vi.mock("@/hooks/useDebouncedValue", () => ({
  useDebouncedValue: (v: string) => v,
}));

const baseSchema: ResourceSchema = {
  schema_version: "1.0",
  resource: "pg-rooms",
  title: "Rooms",
  fields: [],
  list_display: ["id"],
  search: { fields: [] },
  filters: { backends: [] },
  ordering: { default: [] },
  actions: [
    { name: "mark_paid", label: "Mark paid", url_path: "mark-paid", detail: true, methods: ["post"] },
    { name: "list_action", label: "List act", url_path: "list-act", detail: false, methods: ["post"] },
  ],
  list_path: "/api/meta/resources/pg-rooms/",
  detail_path_template: "/api/meta/resources/pg-rooms/{id}/",
};

describe("capabilities gating", () => {
  it("DynamicActionRenderer respects capabilities.actions", () => {
    const schema: ResourceSchema = {
      ...baseSchema,
      capabilities: { create: true, update: true, delete: true, actions: ["mark_paid"] },
    };
    render(
      <DynamicActionRenderer schema={schema} recordId="1" />
    );
    expect(screen.getByRole("button", { name: "Mark paid" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "List act" })).not.toBeInTheDocument();
  });

  it("ResourceList hides New when capabilities.create is false", () => {
    const schema: ResourceSchema = {
      ...baseSchema,
      capabilities: { create: false, update: false, delete: false, actions: [] },
    };
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ResourceList slug="pg-rooms" schema={schema} />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.queryByRole("button", { name: "New" })).not.toBeInTheDocument();
  });
});
