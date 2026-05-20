import type { TrendMeta } from "@/hooks/useResource";

export interface KpiContext {
  total_rooms?: number;
  rooms_available?: number;
}

export function kpiSubtext(
  metric: string,
  data: KpiContext | undefined,
  trend?: TrendMeta
): { text: string; tone: "up" | "warn" | "neutral" } | null {
  if (trend && trend.direction !== "flat") return null;

  switch (metric) {
    case "available_rooms":
      if (data?.total_rooms != null) {
        return { text: `of ${data.total_rooms} total`, tone: "neutral" };
      }
      return null;
    case "pending_bookings":
      return { text: "needs review", tone: "warn" };
    case "rent_overdue":
      return { text: "all clear", tone: "up" };
    case "open_complaints":
      return { text: "all clear", tone: "up" };
    default:
      return null;
  }
}
