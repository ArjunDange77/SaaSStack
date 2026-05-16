import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ResourceList } from "../ResourceList";
import { renderWithProviders } from "@/test/test-utils";
import type { ResourceSchema } from "@/types/metadata";

const schema: ResourceSchema = {
  schema_version: "1.0",
  resource: "pg-rooms",
  title: "Rooms",
  description: "Rooms and occupancy",
  fields: [{ name: "room_number", label: "Room", type: "string" }],
  list_display: ["room_number", "room_status"],
  list_views: ["table", "grid"],
  list_filters: [
    {
      param: "room_status",
      label: "Available",
      value: "available",
      count: 2,
    },
  ],
  search: { fields: ["room_number"] },
  filters: { backends: [] },
  ordering: { default: ["room_number"] },
  actions: [],
  capabilities: { create: true, update: true, delete: true, actions: [] },
  list_path: "/api/meta/resources/pg-rooms/",
  detail_path_template: "/api/meta/resources/pg-rooms/{id}/",
};

const mockList = vi.fn();

vi.mock("@/hooks/useResource", () => ({
  useResourceList: (...args: unknown[]) => mockList(...args),
  useResourceMutations: () => ({
    create: { mutateAsync: vi.fn(), isPending: false },
  }),
}));

describe("ResourceList pg-rooms", () => {
  beforeEach(() => {
    mockList.mockReturnValue({
      data: {
        results: [
          {
            id: 1,
            room_number: "101",
            floor: "1",
            room_status: "available",
            occupancy_display: "0/2",
            availability_label: "Available",
          },
        ],
        count: 1,
      },
      isLoading: false,
      isFetching: false,
    });
    localStorage.clear();
  });

  it("renders filter pills and grid view toggle", async () => {
    renderWithProviders(
      <MemoryRouter>
        <ResourceList slug="pg-rooms" schema={schema} />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: /Rooms/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Available/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Grid view" }));
    await waitFor(() => {
      expect(screen.getByText(/Room 101/i)).toBeInTheDocument();
    });
  });
});
