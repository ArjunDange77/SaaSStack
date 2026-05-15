import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ResourceForm } from "../ResourceForm";
import schemaFixture from "@/test/fixtures/metadata_demo_items_v1.json";
import type { ResourceSchema } from "@/types/metadata";

const schema = schemaFixture as ResourceSchema;

describe("ResourceForm", () => {
  it("submits editable non-tenant fields only", () => {
    const onSubmit = vi.fn();
    render(
      <ResourceForm
        schema={schema}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />
    );
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "Test item" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onSubmit).toHaveBeenCalled();
    const body = onSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(body.name).toBe("Test item");
    expect(body).not.toHaveProperty("tenant");
    expect(body).not.toHaveProperty("id");
  });

  it("requires schema_version on fixture", () => {
    expect(schema.schema_version).toBe("1.0");
  });
});
