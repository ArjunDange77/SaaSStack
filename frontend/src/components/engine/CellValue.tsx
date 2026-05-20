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

const IST = "Asia/Kolkata";

function formatDateTimeValue(value: unknown, type: "datetime" | "date"): string {
  if (value === null || value === undefined || value === "") return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return type === "date"
    ? d.toLocaleDateString("en-IN", { timeZone: IST })
    : d.toLocaleString("en-IN", { timeZone: IST });
}

function parseOccupancyFraction(value: unknown): { current: number; limit: number } | null {
  const m = String(value ?? "").match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return null;
  return { current: Number(m[1]), limit: Number(m[2]) };
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
  } else if (field.type === "datetime") {
    display = formatDateTimeValue(value, "datetime");
  } else if (field.type === "date") {
    display = formatDateTimeValue(value, "date");
  } else {
    display = value === null || value === undefined ? "" : String(value);
  }

  const occupancy = field.ui?.variant === "progress" ? parseOccupancyFraction(value) : null;
  if (occupancy && occupancy.limit > 0) {
    const pct = Math.min(100, Math.round((occupancy.current / occupancy.limit) * 100));
    return (
      <div className="occupancy-progress" title={`${occupancy.current}/${occupancy.limit}`}>
        <div className="occupancy-progress-track">
          <div className="occupancy-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="occupancy-progress-label">
          {occupancy.current}/{occupancy.limit}
        </span>
      </div>
    );
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
