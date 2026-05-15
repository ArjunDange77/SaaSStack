import { fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DynamicFieldRenderer } from "../DynamicFieldRenderer";
import { renderWithQuery } from "@/test/test-utils";
import type { FieldMeta } from "@/types/metadata";

const fileField: FieldMeta = {
  name: "uploaded_file",
  label: "File",
  type: "file",
};

describe("DynamicFieldRenderer file", () => {
  it("calls onChange with File when selected", () => {
    const onChange = vi.fn();
    const { container } = renderWithQuery(
      <DynamicFieldRenderer field={fileField} value={null} onChange={onChange} />
    );
    const input = container.querySelector('input[type="file"]')!;
    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onChange).toHaveBeenCalledWith("uploaded_file", file);
  });
});
