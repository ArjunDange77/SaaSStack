import type { ReactNode } from "react";
import { IconBell } from "@tabler/icons-react";

interface Props {
  icon?: "bell";
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = "bell", title, description, action }: Props) {
  return (
    <div className="sb-empty-state">
      {icon === "bell" && <IconBell size={40} stroke={1.25} className="sb-empty-icon" aria-hidden />}
      <h2 className="sb-empty-title">{title}</h2>
      {description && <p className="muted sb-empty-desc">{description}</p>}
      {action}
    </div>
  );
}
