import { screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DynamicFieldRenderer } from "../DynamicFieldRenderer";
import { renderWithQuery } from "@/test/test-utils";
import type { FieldMeta } from "@/types/metadata";

describe("DynamicFieldRenderer", () => {
  it("renders read-only field as text", () => {
    const field: FieldMeta = {
      name: "id",
      label: "Id",
      type: "integer",
      read_only: true,
    };
    renderWithQuery(<DynamicFieldRenderer field={field} value={42} onChange={() => {}} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders choice select with options", () => {
    const onChange = vi.fn();
    const field: FieldMeta = {
      name: "category",
      label: "Category",
      type: "choice",
      choices: ["parts", "kits"],
    };
    renderWithQuery(<DynamicFieldRenderer field={field} value="parts" onChange={onChange} />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "kits" } });
    expect(onChange).toHaveBeenCalledWith("category", "kits");
  });

  it("renders boolean checkbox", () => {
    const onChange = vi.fn();
    const field: FieldMeta = { name: "in_stock", label: "In stock", type: "boolean" };
    renderWithQuery(<DynamicFieldRenderer field={field} value={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith("in_stock", true);
  });

  it("renders text textarea for text type", () => {
    const field: FieldMeta = { name: "notes", label: "Notes", type: "text" };
    renderWithQuery(<DynamicFieldRenderer field={field} value="" onChange={() => {}} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
