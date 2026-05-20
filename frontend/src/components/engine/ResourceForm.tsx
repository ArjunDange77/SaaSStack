import { useEffect, useState } from "react";
import type { FieldMeta, ResourceSchema } from "@/types/metadata";
import { DynamicFieldRenderer } from "./DynamicFieldRenderer";

interface Props {
  schema: ResourceSchema;
  initial?: Record<string, unknown>;
  onSubmit: (body: Record<string, unknown>) => void;
  onCancel: () => void;
  submitting?: boolean;
}

function editableFields(schema: ResourceSchema): FieldMeta[] {
  return schema.fields.filter((f) => !f.read_only && f.name !== "tenant");
}

function buildDefaults(schema: ResourceSchema, initial?: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of editableFields(schema)) {
    if (f.type === "boolean") out[f.name] = initial?.[f.name] ?? false;
    else if (f.type === "file") out[f.name] = null;
    else out[f.name] = initial?.[f.name] ?? "";
  }
  return out;
}

function fileUrlFromValue(value: unknown): string | undefined {
  if (!value || typeof value !== "string") return undefined;
  return value.startsWith("http") ? value : `/media/${value}`;
}

export function ResourceForm({ schema, initial, onSubmit, onCancel, submitting }: Props) {
  const [form, setForm] = useState(() => buildDefaults(schema, initial));

  useEffect(() => {
    setForm(buildDefaults(schema, initial));
  }, [schema, initial]);

  const setField = (name: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="modal">
      <h3>{initial?.id ? "Edit" : "Create"} {schema.title}</h3>
      {editableFields(schema).map((field) => (
        <div key={field.name} className="field">
          <label htmlFor={`field-${field.name}`}>{field.label}</label>
          <DynamicFieldRenderer
            field={field}
            value={form[field.name]}
            onChange={setField}
            schema={schema}
            existingFileUrl={
              field.type === "file" ? fileUrlFromValue(initial?.[field.name]) : undefined
            }
          />
        </div>
      ))}
      <div className="toolbar toolbar-actions-responsive">
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </button>
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
