import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DynamicTable } from "../DynamicTable";
import type { ResourceSchema } from "@/types/metadata";

const schema: ResourceSchema = {
  schema_version: "1.0",
  resource: "pg-residents",
  title: "Residents",
  fields: [
    { name: "full_name", label: "Name", type: "string" },
    { name: "phone", label: "Phone", type: "string" },
  ],
  list_display: ["full_name", "phone"],
  search: { fields: [] },
  filters: { backends: [] },
  ordering: { default: [] },
  actions: [],
  list_path: "/api/meta/resources/pg-residents/",
  detail_path_template: "/api/meta/resources/pg-residents/{id}/",
};

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
}

describe("DynamicTable responsive layout", () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders mobile card list and desktop table markup", () => {
    const { container } = wrap(
      <DynamicTable
        schema={schema}
        rows={[{ id: 1, full_name: "Priya", phone: "9000000001" }]}
        onRowClick={() => {}}
      />
    );
    expect(container.querySelector(".record-cards")).toBeTruthy();
    expect(container.querySelector(".table-wrap")).toBeTruthy();
    expect(screen.getAllByText("Priya").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Open" }).length).toBeGreaterThan(0);
  });
});
