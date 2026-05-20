import { screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ResourceList } from "../ResourceList";
import { renderWithQuery } from "@/test/test-utils";
import type { ResourceSchema } from "@/types/metadata";

vi.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ tenantSlug: "sai-baba-school-bus" }),
}));

vi.mock("@/hooks/useResource", () => ({
  useResourceList: () => ({
    data: { results: [], count: 0 },
    isLoading: false,
    isFetching: false,
  }),
  useResourceMutations: () => ({
    create: { mutateAsync: vi.fn(), isPending: false },
  }),
}));

const schema = {
  title: "Trips",
  schema_version: "1.0",
  fields: [],
  list_display: ["id", "trip_date", "status"],
  list_path: "/api/r/sb-trips/",
  detail_path_template: "/api/r/sb-trips/{id}/",
  capabilities: { create: true, update: true, delete: true, actions: [] },
} as unknown as ResourceSchema;

describe("ResourceList sb-trips embedded", () => {
  it("shows New trip and no standalone banner when embedded", () => {
    renderWithQuery(
      <MemoryRouter>
        <ResourceList slug="sb-trips" schema={schema} embedded hideHeader />
      </MemoryRouter>
    );
    expect(screen.getByRole("button", { name: /New trip/i })).toBeInTheDocument();
    expect(screen.queryByText(/Open Today's trips/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Command center/i)).not.toBeInTheDocument();
  });
});
