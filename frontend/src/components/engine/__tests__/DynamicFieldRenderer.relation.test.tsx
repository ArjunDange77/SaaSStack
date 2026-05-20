import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DynamicFieldRenderer } from "../DynamicFieldRenderer";
import type { FieldMeta } from "@/types/metadata";

vi.mock("@/hooks/useResource", () => ({
  useRelatedResourceOptions: () => ({
    data: [{ id: 1, full_name: "Priya" }, { id: 2, full_name: "Rahul" }],
    isLoading: false,
  }),
}));

const relationField: FieldMeta = {
  name: "resident",
  label: "Resident",
  type: "relation",
  related_resource: "pg-residents",
  relation_display_field: "full_name",
};

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("DynamicFieldRenderer relation", () => {
  it("renders select with related labels", () => {
    const onChange = vi.fn();
    wrap(<DynamicFieldRenderer field={relationField} value={1} onChange={onChange} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Priya")).toBeInTheDocument();
  });

  it("keeps string pk without coercing to number", () => {
    const onChange = vi.fn();
    wrap(<DynamicFieldRenderer field={relationField} value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "2" } });
    expect(onChange).toHaveBeenCalledWith("resident", 2);
  });
});
