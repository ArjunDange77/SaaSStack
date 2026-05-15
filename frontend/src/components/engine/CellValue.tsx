import type { FieldMeta } from "@/types/metadata";
import { resolveRelationLabel, type RelationLabelMap } from "@/hooks/useRelationLabels";

interface Props {
  field?: FieldMeta;
  value: unknown;
  labelMaps?: RelationLabelMap;
}

export function CellValue({ field, value, labelMaps = {} }: Props) {
  if (!field) return <>{String(value ?? "")}</>;

  let display: string;
  if (field.type === "relation") {
    display = resolveRelationLabel(field, value, labelMaps) || "—";
  } else if (field.type === "file" && value) {
    const path = String(value);
    display = path.split("/").pop() ?? path;
  } else {
    display = value === null || value === undefined ? "" : String(value);
  }

  if (field.ui?.variant === "badge" && display && display !== "—") {
    const tone = field.ui.badge_map?.[display] ?? "neutral";
    return <span className={`badge badge-${tone}`}>{display}</span>;
  }

  if (field.type === "file" && value) {
    const href = String(value).startsWith("http") ? String(value) : `/media/${String(value)}`;
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {display}
      </a>
    );
  }

  return <>{display || "—"}</>;
}
