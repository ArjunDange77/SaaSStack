import { useRelatedResourceOptions } from "@/hooks/useResource";
import { useRelationLabelMaps } from "@/hooks/useRelationLabels";
import type { FieldMeta, ResourceSchema } from "@/types/metadata";
import { coerceRelationPk } from "@/utils/formValues";
import { CellValue } from "./CellValue";

interface Props {
  field: FieldMeta;
  value: unknown;
  onChange: (name: string, value: unknown) => void;
  schema?: ResourceSchema;
  existingFileUrl?: string;
}

function FieldHelp({ field }: { field: FieldMeta }) {
  const text = field.ui?.help_text || field.help_text;
  if (!text) return null;
  return <p className="field-help">{text}</p>;
}

function RelationSelect({
  field,
  value,
  onChange,
}: {
  field: FieldMeta;
  value: unknown;
  onChange: (name: string, value: unknown) => void;
}) {
  const { data: options = [], isLoading, isError, error } = useRelatedResourceOptions(
    field.related_resource
  );
  const displayField = field.relation_display_field ?? "id";

  return (
    <>
      {isLoading && <p className="muted">Loading options…</p>}
      {isError && (
        <p className="error">
          Could not load options.{" "}
          {error instanceof Error ? error.message : "Try again later."}
        </p>
      )}
      <select
        id={`field-${field.name}`}
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(e) => onChange(field.name, coerceRelationPk(e.target.value))}
        disabled={isLoading || isError}
      >
        <option value="">—</option>
        {options.map((row) => (
          <option key={String(row.id)} value={String(row.id)}>
            {String(row[displayField] ?? row.id)}
          </option>
        ))}
      </select>
      <FieldHelp field={field} />
    </>
  );
}

export function DynamicFieldRenderer({
  field,
  value,
  onChange,
  schema,
  existingFileUrl,
}: Props) {
  const labelMaps = useRelationLabelMaps(schema);

  if (field.read_only) {
    return (
      <div>
        <CellValue field={field} value={value} labelMaps={labelMaps} />
        <FieldHelp field={field} />
      </div>
    );
  }

  const id = `field-${field.name}`;

  switch (field.type) {
    case "boolean":
      return (
        <>
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(field.name, e.target.checked)}
          />
          <FieldHelp field={field} />
        </>
      );
    case "choice":
      return (
        <>
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
          <FieldHelp field={field} />
        </>
      );
    case "relation":
      return <RelationSelect field={field} value={value} onChange={onChange} />;
    case "file":
      return (
        <>
          {existingFileUrl && (
            <p className="muted">
              Current:{" "}
              <a href={existingFileUrl} target="_blank" rel="noreferrer">
                {existingFileUrl.split("/").pop()}
              </a>
            </p>
          )}
          <input
            id={id}
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              onChange(field.name, file ?? null);
            }}
          />
          <FieldHelp field={field} />
        </>
      );
    case "text":
      return (
        <>
          <textarea
            id={id}
            rows={4}
            value={String(value ?? "")}
            onChange={(e) => onChange(field.name, e.target.value)}
          />
          <FieldHelp field={field} />
        </>
      );
    case "date":
      return (
        <>
          <input
            id={id}
            type="date"
            value={String(value ?? "")}
            onChange={(e) => onChange(field.name, e.target.value)}
          />
          <FieldHelp field={field} />
        </>
      );
    case "datetime":
      return (
        <>
          <input
            id={id}
            type="datetime-local"
            value={String(value ?? "")}
            onChange={(e) => onChange(field.name, e.target.value)}
          />
          <FieldHelp field={field} />
        </>
      );
    case "integer":
    case "decimal":
      return (
        <>
          <input
            id={id}
            type="number"
            step={field.type === "decimal" ? "0.01" : "1"}
            value={value === null || value === undefined ? "" : String(value)}
            onChange={(e) =>
              onChange(field.name, e.target.value === "" ? null : Number(e.target.value))
            }
          />
          <FieldHelp field={field} />
        </>
      );
    default:
      return (
        <>
          <input
            id={id}
            type="text"
            value={String(value ?? "")}
            onChange={(e) => onChange(field.name, e.target.value)}
          />
          <FieldHelp field={field} />
        </>
      );
  }
}
