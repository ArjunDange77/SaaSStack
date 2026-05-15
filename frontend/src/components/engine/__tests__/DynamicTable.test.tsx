import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DynamicTable } from "../DynamicTable";
import type { ResourceSchema } from "@/types/metadata";

const schema: ResourceSchema = {
  schema_version: "1.0",
  resource: "pg-residents",
  title: "Residents",
  fields: [
    {
      name: "active_status",
      label: "Active status",
      type: "choice",
      ui: { variant: "badge", badge_map: { active: "success", inactive: "neutral" } },
    },
  ],
  list_display: ["full_name", "active_status"],
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

describe("DynamicTable", () => {
  it("renders badge for status fields with ui metadata", () => {
    wrap(
      <DynamicTable
        schema={schema}
        rows={[{ id: 1, full_name: "Alex", active_status: "active" }]}
      />
    );
    const badge = screen.getByText("active");
    expect(badge.className).toContain("badge-success");
  });
});
