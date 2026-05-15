import type { FieldMeta } from "@/types/metadata";

interface Props {
  field: FieldMeta;
  value: unknown;
  onChange: (name: string, value: unknown) => void;
}

export function DynamicFieldRenderer({ field, value, onChange }: Props) {
  if (field.read_only) {
    return <div>{String(value ?? "—")}</div>;
  }

  const id = `field-${field.name}`;

  switch (field.type) {
    case "boolean":
      return (
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(field.name, e.target.checked)}
        />
      );
    case "choice":
      return (
        <select
          id={id}
          value={String(value ?? "")}
          onChange={(e) => onChange(field.name, e.target.value)}
        >
          <option value="">—</option>
          {(field.choices ?? []).map((c) => (
            <option key={String(c)} value={String(c)}>
              {String(c)}
            </option>
          ))}
        </select>
      );
    case "text":
      return (
        <textarea
          id={id}
          rows={4}
          value={String(value ?? "")}
          onChange={(e) => onChange(field.name, e.target.value)}
        />
      );
    case "integer":
    case "decimal":
      return (
        <input
          id={id}
          type="number"
          step={field.type === "decimal" ? "0.01" : "1"}
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) =>
            onChange(
              field.name,
              e.target.value === "" ? null : Number(e.target.value)
            )
          }
        />
      );
    default:
      return (
        <input
          id={id}
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(field.name, e.target.value)}
        />
      );
  }
}
