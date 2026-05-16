import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { TrendMeta } from "@/hooks/useResource";

interface Props {
  to: string;
  value: string | number;
  label: string;
  highlight?: boolean;
  icon?: ReactNode;
  size?: "lg" | "sm";
  trend?: TrendMeta;
}

function trendLabel(trend: TrendMeta): string {
  const arrow = trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→";
  const abs = Math.abs(trend.delta);
  const suffix = trend.period ? ` (${trend.period})` : "";
  if (typeof trend.delta === "number" && trend.delta % 1 !== 0) {
    return `${arrow} ${abs}%${suffix}`;
  }
  return `${arrow} ${abs}${suffix}`;
}

export function CommandTile({ to, value, label, highlight, icon, size = "lg", trend }: Props) {
  return (
    <Link
      to={to}
      className={[
        "command-tile",
        size === "sm" ? "command-tile-sm" : "command-tile-lg",
        highlight ? "command-tile-highlight" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon && <span className="command-tile-icon">{icon}</span>}
      <span className="command-tile-value">{value}</span>
      {trend && trend.direction !== "flat" && (
        <span
          className={`command-tile-trend command-tile-trend-${trend.direction}`}
          aria-label={`Trend ${trend.direction} ${trend.delta}`}
        >
          {trendLabel(trend)}
        </span>
      )}
      <span className="command-tile-label">{label}</span>
    </Link>
  );
}
