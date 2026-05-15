import type { FieldMeta } from "@/types/metadata";
import { resolveRelationLabel, type RelationLabelMap } from "@/hooks/useRelationLabels";

interface Props {
  field?: FieldMeta;
  value: unknown;
  labelMaps?: RelationLabelMap;
  row?: Record<string, unknown>;
}

function isPastDate(value: unknown): boolean {
  if (!value) return false;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

function choiceLabel(field: FieldMeta, raw: string): string {
  return field.ui?.label_map?.[raw] ?? raw.replace(/_/g, " ");
}

export function CellValue({ field, value, labelMaps = {}, row }: Props) {
  if (!field) return <>{String(value ?? "")}</>;

  let display: string;
  if (field.type === "relation") {
    display = resolveRelationLabel(field, value, labelMaps) || "—";
  } else if (field.type === "file" && value) {
    const path = String(value);
    display = path.split("/").pop() ?? path;
  } else if (field.type === "choice" && value !== null && value !== undefined) {
    display = choiceLabel(field, String(value));
  } else {
    display = value === null || value === undefined ? "" : String(value);
  }

  const dateHighlight =
    field.ui?.date_highlight === "past" &&
    field.type === "date" &&
    isPastDate(value) &&
    row?.paid_status === "unpaid";

  if (field.ui?.variant === "badge" && display && display !== "—") {
    const raw = value === null || value === undefined ? "" : String(value);
    const tone = field.ui.badge_map?.[raw] ?? "neutral";
    const label = field.type === "choice" ? choiceLabel(field, raw) : display;
    return <span className={`badge badge-${tone}`}>{label}</span>;
  }

  if (dateHighlight) {
    return <span className="date-overdue">{display}</span>;
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
