import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import type { TrendMeta } from "@/hooks/useResource";

interface Props {
  to: string;
  value: string | number;
  label: string;
  highlight?: boolean;
  icon?: ReactNode;
  size?: "lg" | "sm";
  trend?: TrendMeta;
  subtext?: { text: string; tone: "up" | "warn" | "neutral" };
  valueTone?: "default" | "warn" | "success";
}

function trendLabel(trend: TrendMeta): string {
  const abs = Math.abs(trend.delta);
  const suffix = trend.period ? ` ${trend.period}` : "";
  if (typeof trend.delta === "number" && trend.delta % 1 !== 0) {
    return `${abs}%${suffix}`;
  }
  return `${abs}${suffix}`;
}

export function CommandTile({
  to,
  value,
  label,
  highlight,
  icon,
  size = "lg",
  trend,
  subtext,
  valueTone = "default",
}: Props) {
  const valueClass =
    valueTone === "warn"
      ? "kpi-value-warn"
      : valueTone === "success"
        ? "kpi-value-success"
        : "";

  return (
    <Link
      to={to}
      className={[
        "command-tile",
        size === "sm" ? "command-tile-sm detail-card" : "command-tile-lg kpi-card",
        highlight ? "command-tile-highlight kpi-card-alert" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon && <span className="command-tile-icon">{icon}</span>}
      {size === "sm" ? (
        <>
          <span className="detail-label">{label}</span>
          <span className={`command-tile-value detail-value ${valueClass}`}>{value}</span>
        </>
      ) : (
        <>
          <span className="command-tile-label kpi-label">{label}</span>
          <span className={`command-tile-value kpi-value ${valueClass}`}>{value}</span>
          {trend && trend.direction !== "flat" && (
            <span
              className={`command-tile-trend kpi-trend kpi-trend-${trend.direction === "up" ? "up" : trend.direction === "down" ? "warn" : "neutral"}`}
              aria-label={`Trend ${trend.direction} ${trend.delta}`}
            >
              {trend.direction === "up" ? (
                <IconTrendingUp size={14} stroke={2} aria-hidden />
              ) : trend.direction === "down" ? (
                <IconTrendingDown size={14} stroke={2} aria-hidden />
              ) : null}
              {trendLabel(trend)}
            </span>
          )}
          {subtext && (
            <span className={`command-tile-subtext kpi-trend kpi-trend-${subtext.tone}`}>
              {subtext.text}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
