import type { ReactNode } from "react";
import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";

interface Props {
  children: ReactNode;
  color?: "warning" | "info" | "danger";
  icon?: "warning" | "info";
}

export function AlertBanner({ children, color = "warning", icon = "warning" }: Props) {
  const Icon = icon === "info" ? IconInfoCircle : IconAlertTriangle;
  return (
    <div className={`sb-alert-banner sb-alert-${color}`} role="status">
      <Icon size={16} stroke={1.75} aria-hidden />
      <div className="sb-alert-banner-body">{children}</div>
    </div>
  );
}
