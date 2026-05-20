import type { HTMLAttributes, ReactNode } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  alert?: boolean;
  muted?: boolean;
}

export function Card({ children, alert, muted, className = "", ...rest }: Props) {
  const cls = [
    muted ? "detail-card" : "kpi-card",
    alert ? "kpi-card-alert" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

export function CardMuted({ children, className = "", ...rest }: Omit<Props, "muted" | "alert">) {
  return (
    <Card muted className={className} {...rest}>
      {children}
    </Card>
  );
}
